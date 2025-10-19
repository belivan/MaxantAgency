/**
 * Contact discovery utilities
 * - extract emails, phones, names from a loaded Playwright page
 * - score and aggregate findings across pages
 */

import { URL } from 'url';

const GENERIC_EMAILS = [/^info@/i, /^contact@/i, /^support@/i, /^admin@/i, /^hello@/i, /^no-?reply@/i, /^noreply@/i];

function normalizeEmail(email) {
  return (email || '').trim().replace(/[\s\u00A0]+/g, '');
}

function isGenericEmail(email) {
  if (!email) return false;
  return GENERIC_EMAILS.some(rx => rx.test(email));
}

function emailConfidenceBySource(source, isGeneric) {
  let base = 0.6;
  if (source === 'structured') base = 0.95;
  if (source === 'mailto') base = isGeneric ? 0.6 : 0.9;
  if (source === 'text') base = isGeneric ? 0.4 : 0.75;
  return base;
}

/**
 * Extract contact info from a Playwright page instance.
 * Returns { emails: [], phones: [], names: [], contactPages: [] }
 */
export async function extractFromPage(page, pageUrl) {
  try {
    const result = await page.evaluate(() => {
      const out = { emails: [], phones: [], names: [], contactPages: [] };

      // Mailto anchors
      const mailto = Array.from(document.querySelectorAll('a[href^="mailto:"]'))
        .map(a => ({ href: a.getAttribute('href'), text: a.innerText }))
        .slice(0, 20);

      mailto.forEach(m => {
        const email = m.href.replace(/^mailto:/i, '').split('?')[0];
        out.emails.push({ value: email, source: 'mailto', snippet: m.text || '' });
      });

      // JSON-LD structured data
      const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map(s => s.textContent)
        .slice(0, 10);

      jsonLd.forEach(js => {
        try {
          const parsed = JSON.parse(js);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          items.forEach(it => {
            if (it.contactPoint) {
              const cp = it.contactPoint;
              if (cp.email) out.emails.push({ value: cp.email, source: 'structured', snippet: 'contactPoint' });
              if (cp.telephone) out.phones.push({ value: cp.telephone, source: 'structured' });
            }
            if (it.email) out.emails.push({ value: it.email, source: 'structured', snippet: 'jsonld' });
            if (it.telephone) out.phones.push({ value: it.telephone, source: 'structured' });
            if (it.name && !it['@type']) out.names.push({ value: it.name, source: 'structured' });
            if (it['@type'] && it['@type'].toLowerCase().includes('person') && it.name) out.names.push({ value: it.name, source: 'structured' });
          });
        } catch (e) {
          // ignore parse errors
        }
      });

      // Visible emails in text
      const bodyText = document.body.innerText || '';
      const emailRegex = /[a-zA-Z0-9._%+-]+\s*(?:\[at\]|\(at\)|@| at )\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = bodyText.match(emailRegex) || [];
      matches.slice(0, 20).forEach(m => {
        out.emails.push({ value: m.trim(), source: 'text', snippet: bodyText.substr(Math.max(0, bodyText.indexOf(m) - 30), 60) });
      });

      // Phone numbers (simple regex)
      const phoneRegex = /\+?\d[\d\s().-]{6,}\d/g;
      const phones = bodyText.match(phoneRegex) || [];
      phones.slice(0, 10).forEach(p => out.phones.push({ value: p.trim(), source: 'text' }));

      // Links that look like contact pages
      const links = Array.from(document.querySelectorAll('a'))
        .map(a => ({ href: a.href, text: a.innerText }))
        .filter(Boolean)
        .slice(0, 200);

      links.forEach(l => {
        const txt = (l.text || '').toLowerCase();
        const href = l.href || '';
        if (txt.includes('contact') || href.toLowerCase().includes('contact') || txt.includes('about') || href.toLowerCase().includes('about')) {
          out.contactPages.push(href);
        }
      });

      return out;
    });

    // normalize and clean emails
    result.emails = result.emails.map(e => ({ value: normalizeEmail(e.value).replace(/\s*\(at\)\s*/i, '@').replace(/\s+at\s+/i, '@'), source: e.source, snippet: e.snippet || '' }));

    // dedupe
    const seen = new Set();
    result.emails = result.emails.filter(e => {
      if (!e.value) return false;
      const key = e.value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { pageUrl, ...result };
  } catch (error) {
    return { pageUrl, emails: [], phones: [], names: [], contactPages: [] };
  }
}

/**
 * Aggregate multiple page-extraction results and pick best contact
 */
export function findBestContact(siteUrl, pageResults) {
  const domain = new URL(siteUrl).hostname.replace(/^www\./i, '').toLowerCase();
  const candidates = [];

  pageResults.forEach(pr => {
    pr.emails.forEach(e => {
      // simple normalization; remove surrounding characters
      const email = e.value.replace(/^["'<>]+|["'<>]+$/g, '');
      const isGeneric = isGenericEmail(email);
      const source = e.source || 'text';
      const baseScore = emailConfidenceBySource(source, isGeneric);
      // increase if email domain matches site domain
      const emailDomain = (email.split('@')[1] || '').toLowerCase();
      let score = baseScore;
      if (emailDomain && emailDomain.includes(domain)) score += 0.1;
      // increase if found on a contact page
      if (pr.contactPages && pr.contactPages.length > 0) score += 0.05;

      candidates.push({ email, source, pageUrl: pr.pageUrl, score, isGeneric });
    });
  });

  // If no candidates, return null
  if (candidates.length === 0) return null;

  // Sort by score, prefer non-generic when scores equal
  candidates.sort((a, b) => (b.score === a.score ? (a.isGeneric ? 1 : -1) : b.score - a.score));

  const top = candidates[0];
  return {
    email: top.email,
    emailSource: top.source,
    contactPage: top.pageUrl,
    confidence: Math.min(0.99, top.score)
  };
}
