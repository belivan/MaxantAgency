// Email sanitizer utilities
// - Replaces placeholder tokens to a canonical format
// - Trims and enforces safe length limits
// - Removes repetitive or overly-salesy phrases

const SUBJECT_MAX = 120; // characters
const BODY_MAX = 3000; // characters
const OPENING_MAX = 400; // characters for opening hook

const PLACEHOLDERS = [
  '\\[First Name\\]',
  '\\[Your Name\\]',
  '\\[Your Phone\\]',
  '\\[Program\\]'
];

function normalizePlaceholders(text) {
  if (!text) return text;
  let out = text;
  // Normalize common bracket styles to {{firstName}} style
  // Convert triple-brace {{{firstName}}} to {{firstName}} as well
  out = out.replace(/\{\{\{\s*firstName\s*\}\}\}|\[First Name\]|\{firstName\}|\{{\s*first name\s*\}}/gi, '{{firstName}}');
  out = out.replace(/\[Your Name\]|\{yourName\}|\{{\s*your name\s*\}}/gi, '{{senderName}}');
  out = out.replace(/\[Your Phone\]|\{yourPhone\}/gi, '{{senderPhone}}');
  out = out.replace(/\[Program\]|\{program\}/gi, '{{program}}');
  return out;
}

function removeSalesyPhrases(text) {
  if (!text) return text;
  // A small list of phrases we consider too salesy; remove or soften them
  const phrases = [
    'increase conversions dramatically',
    'guaranteed results',
    'best in class',
    'world-class',
    'award-winning'
  ];
  let out = text;
  phrases.forEach(p => {
    const re = new RegExp(p, 'gi');
    out = out.replace(re, '');
  });
  return out;
}

function trimRepeatedLines(text) {
  if (!text) return text;
  // Remove immediate repeated lines
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0 && lines[i].trim() && lines[i].trim() === lines[i - 1].trim()) continue;
    out.push(lines[i]);
  }
  return out.join('\n');
}

export function sanitizeHumanizedEmail(humanized) {
  const subject = normalizePlaceholders(humanized.subject || '');
  let body = normalizePlaceholders(humanized.body || '');

  body = removeSalesyPhrases(body);
  body = trimRepeatedLines(body);

  // Enforce length limits
  const safeSubject = subject.length > SUBJECT_MAX ? subject.slice(0, SUBJECT_MAX - 3) + '...' : subject;
  if (body.length > BODY_MAX) {
    body = body.slice(0, BODY_MAX - 300) + '\n\n[Message truncated for length]';
  }

  // Ensure opening hook isn't excessively long
  const opening = body.split('\n\n')[0] || '';
  if (opening.length > OPENING_MAX) {
    const shortened = opening.slice(0, OPENING_MAX - 3) + '...';
    body = body.replace(opening, shortened);
  }

  return {
    subject: safeSubject.trim(),
    body: body.trim()
  };
}

export function sanitizeHumanSummaryAndBullets(humanSummary, humanBullets) {
  let summary = normalizePlaceholders(humanSummary || '');
  summary = removeSalesyPhrases(summary);
  summary = trimRepeatedLines(summary).trim();

  let bullets = (humanBullets || []).map(b => normalizePlaceholders(b || '').trim()).filter(Boolean);
  bullets = bullets.map(b => removeSalesyPhrases(b));

  // Limit to 3 bullets and short length
  bullets = bullets.slice(0, 3).map(b => b.length > 180 ? b.slice(0, 177) + '...' : b);

  if (summary.length > 600) summary = summary.slice(0, 597) + '...';

  return { humanSummary: summary, humanBullets: bullets };
}

/**
 * Lightweight placeholder replacement: replace sender-related placeholders
 * vars: { senderName, senderPhone, senderWebsite, domain, firstName }
 */
export function replacePlaceholders(humanized, vars = {}) {
  if (!humanized) return humanized;
  const subject = normalizePlaceholders(humanized.subject || '');
  let body = normalizePlaceholders(humanized.body || '');

  // Replace sender placeholders with provided values
  if (vars.senderName) {
    body = body.replace(/\{\{\s*senderName\s*\}\}/gi, vars.senderName);
  }
  if (vars.senderPhone) {
    body = body.replace(/\{\{\s*senderPhone\s*\}\}/gi, vars.senderPhone);
  }
  if (vars.senderWebsite) {
    body = body.replace(/\{\{\s*senderWebsite\s*\}\}/gi, vars.senderWebsite);
  }
  if (vars.domain) {
    body = body.replace(/\{\{\s*domain\s*\}\}/gi, vars.domain);
  }
  if (vars.firstName) {
    body = body.replace(/\{\{\s*firstName\s*\}\}/gi, vars.firstName);
  }

  // Replace placeholders in subject as well
  let safeSubject = subject;
  if (vars.senderName) safeSubject = safeSubject.replace(/\{\{\s*senderName\s*\}\}/gi, vars.senderName);
  if (vars.senderWebsite) safeSubject = safeSubject.replace(/\{\{\s*senderWebsite\s*\}\}/gi, vars.senderWebsite);
  if (vars.domain) safeSubject = safeSubject.replace(/\{\{\s*domain\s*\}\}/gi, vars.domain);
  if (vars.firstName) safeSubject = safeSubject.replace(/\{\{\s*firstName\s*\}\}/gi, vars.firstName);

  return { subject: safeSubject.trim(), body: body.trim() };
}
