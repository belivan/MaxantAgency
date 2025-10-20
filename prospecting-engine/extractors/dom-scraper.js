/**
 * Multi-Page DOM Scraper
 *
 * Extracts business data from websites using intelligent DOM parsing
 * and multi-page crawling. Much faster and more reliable than AI vision.
 *
 * Features:
 * - Email extraction (mailto links, patterns, contact pages)
 * - Phone extraction (tel links, patterns, structured data)
 * - Schema.org/JSON-LD parsing
 * - Multi-page crawling (contact, about, services)
 * - Service/menu extraction
 * - Meta tag parsing
 */

import { logInfo, logWarn, logDebug } from '../shared/logger.js';

/**
 * Extract all data from website using DOM parsing
 *
 * @param {object} page - Playwright page object
 * @param {string} url - Website URL
 * @param {string} companyName - Company name for context
 * @returns {Promise<object>} Extracted data with confidence score
 */
export async function extractFromDOM(page, url, companyName) {
  const startTime = Date.now();

  logInfo('Starting DOM extraction', { url, company: companyName });

  const data = {
    contact_email: null,
    contact_phone: null,
    contact_name: null,
    description: null,
    services: [],
    confidence: 0,
    pages_visited: ['homepage']
  };

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Extract from Homepage
    // ═══════════════════════════════════════════════════════════

    logDebug('Extracting from homepage', { url });

    // Parse Schema.org structured data (BEST source!)
    const schemaData = await extractSchemaOrg(page);
    if (schemaData) {
      data.contact_email = schemaData.email;
      data.contact_phone = schemaData.telephone;
      data.description = schemaData.description;
      data.contact_name = schemaData.contact_name;
      if (schemaData.services?.length > 0) {
        data.services = schemaData.services;
      }
      logInfo('Schema.org data found', {
        hasEmail: !!schemaData.email,
        hasPhone: !!schemaData.telephone,
        servicesCount: schemaData.services?.length || 0
      });
    }

    // Extract emails from homepage
    if (!data.contact_email) {
      data.contact_email = await extractEmails(page);
    }

    // Extract phones from homepage
    if (!data.contact_phone) {
      data.contact_phone = await extractPhones(page);
    }

    // Extract description from meta tags
    if (!data.description) {
      data.description = await extractDescription(page);
    }

    // Extract services from homepage
    if (data.services.length === 0) {
      data.services = await extractServices(page, companyName);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Visit Contact Page (if email/phone still missing)
    // ═══════════════════════════════════════════════════════════

    if (!data.contact_email || !data.contact_phone) {
      const contactData = await visitContactPage(page, url);
      if (contactData) {
        data.contact_email = data.contact_email || contactData.email;
        data.contact_phone = data.contact_phone || contactData.phone;
        data.contact_name = data.contact_name || contactData.name;
        data.pages_visited.push('contact');
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Visit About Page (if description still missing)
    // ═══════════════════════════════════════════════════════════

    if (!data.description) {
      const aboutData = await visitAboutPage(page, url);
      if (aboutData) {
        data.description = aboutData.description;
        data.contact_name = data.contact_name || aboutData.owner_name;
        data.pages_visited.push('about');
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Visit Services/Menu Page (if services still missing)
    // ═══════════════════════════════════════════════════════════

    if (data.services.length === 0) {
      const servicesData = await visitServicesPage(page, url);
      if (servicesData && servicesData.length > 0) {
        data.services = servicesData;
        data.pages_visited.push('services');
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Calculate Confidence Score
    // ═══════════════════════════════════════════════════════════

    data.confidence = calculateConfidence(data);

    const duration = Date.now() - startTime;
    logInfo('DOM extraction complete', {
      url,
      duration_ms: duration,
      confidence: data.confidence,
      hasEmail: !!data.contact_email,
      hasPhone: !!data.contact_phone,
      hasDescription: !!data.description,
      servicesCount: data.services.length,
      pagesVisited: data.pages_visited.length
    });

    return data;

  } catch (error) {
    logWarn('DOM extraction failed', { url, error: error.message });
    return {
      ...data,
      confidence: 0,
      error: error.message
    };
  }
}

/**
 * Extract Schema.org/JSON-LD structured data
 */
async function extractSchemaOrg(page) {
  try {
    const schemaData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));

      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent);

          // Handle single object or array
          const schemas = Array.isArray(data) ? data : [data];

          for (const schema of schemas) {
            // Look for LocalBusiness, Restaurant, Organization, etc.
            if (schema['@type'] && (
              schema['@type'].includes('LocalBusiness') ||
              schema['@type'].includes('Restaurant') ||
              schema['@type'].includes('Organization') ||
              schema['@type'].includes('ProfessionalService')
            )) {
              return {
                email: schema.email || null,
                telephone: schema.telephone || null,
                description: schema.description || null,
                contact_name: schema.founder?.name || schema.member?.name || null,
                services: schema.hasOfferCatalog?.itemListElement?.map(item => item.name) ||
                         schema.menu?.hasMenuSection?.map(section => section.name) || []
              };
            }
          }
        } catch (e) {
          continue;
        }
      }
      return null;
    });

    return schemaData;
  } catch (error) {
    return null;
  }
}

/**
 * Extract emails using multiple strategies
 */
async function extractEmails(page) {
  try {
    const emails = await page.evaluate(() => {
      const foundEmails = new Set();

      // Strategy 1: mailto: links
      document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
        const email = link.href.replace('mailto:', '').split('?')[0].trim();
        if (email) foundEmails.add(email);
      });

      // Strategy 2: Email patterns in text
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const bodyText = document.body.innerText;
      const matches = bodyText.match(emailRegex);
      if (matches) {
        matches.forEach(email => {
          // Filter out common false positives
          if (!email.includes('example.com') &&
              !email.includes('domain.com') &&
              !email.includes('youremail.com')) {
            foundEmails.add(email.toLowerCase());
          }
        });
      }

      // Strategy 3: Look in footer
      const footer = document.querySelector('footer');
      if (footer) {
        const footerMatches = footer.innerText.match(emailRegex);
        if (footerMatches) {
          footerMatches.forEach(email => foundEmails.add(email.toLowerCase()));
        }
      }

      return Array.from(foundEmails);
    });

    // Return the first valid email (prefer info@, contact@, hello@)
    const preferred = emails.find(e =>
      e.startsWith('info@') ||
      e.startsWith('contact@') ||
      e.startsWith('hello@') ||
      e.startsWith('sales@')
    );

    return preferred || emails[0] || null;

  } catch (error) {
    return null;
  }
}

/**
 * Extract phone numbers using multiple strategies
 */
async function extractPhones(page) {
  try {
    const phones = await page.evaluate(() => {
      const foundPhones = new Set();

      // Strategy 1: tel: links
      document.querySelectorAll('a[href^="tel:"]').forEach(link => {
        const phone = link.href.replace('tel:', '').trim();
        if (phone) foundPhones.add(phone);
      });

      // Strategy 2: Phone patterns
      const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      const bodyText = document.body.innerText;
      const matches = bodyText.match(phoneRegex);
      if (matches) {
        matches.forEach(phone => foundPhones.add(phone.trim()));
      }

      // Strategy 3: Look in header/footer
      const header = document.querySelector('header');
      const footer = document.querySelector('footer');

      [header, footer].forEach(section => {
        if (section) {
          const sectionMatches = section.innerText.match(phoneRegex);
          if (sectionMatches) {
            sectionMatches.forEach(phone => foundPhones.add(phone.trim()));
          }
        }
      });

      return Array.from(foundPhones);
    });

    // Return the first phone number found
    return phones[0] || null;

  } catch (error) {
    return null;
  }
}

/**
 * Extract description from meta tags
 */
async function extractDescription(page) {
  try {
    const description = await page.evaluate(() => {
      // Try meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) return metaDesc.content;

      // Try Open Graph description
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) return ogDesc.content;

      // Try first paragraph in main content
      const main = document.querySelector('main') || document.body;
      const firstP = main.querySelector('p');
      if (firstP && firstP.innerText.length > 50) {
        return firstP.innerText.trim();
      }

      return null;
    });

    return description;
  } catch (error) {
    return null;
  }
}

/**
 * Extract services/offerings from page content
 */
async function extractServices(page, companyName) {
  try {
    const services = await page.evaluate(() => {
      const foundServices = [];

      // Strategy 1: Look for "Services" section
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'));
      const servicesHeading = headings.find(h =>
        /services|what we (do|offer)|our offerings|menu/i.test(h.innerText)
      );

      if (servicesHeading) {
        // Get next sibling elements (ul, ol, div)
        let next = servicesHeading.nextElementSibling;
        let attempts = 0;

        while (next && attempts < 3) {
          if (next.tagName === 'UL' || next.tagName === 'OL') {
            const items = Array.from(next.querySelectorAll('li'));
            items.forEach(item => {
              const text = item.innerText.trim();
              if (text.length < 100) { // Not a long paragraph
                foundServices.push(text);
              }
            });
            break;
          }
          next = next.nextElementSibling;
          attempts++;
        }
      }

      // Strategy 2: Look for menu items (restaurants)
      const menuItems = Array.from(document.querySelectorAll('[class*="menu"] li, [class*="item"] h3'));
      menuItems.forEach(item => {
        const text = item.innerText.trim();
        if (text.length > 3 && text.length < 50 && !text.includes('$')) {
          foundServices.push(text);
        }
      });

      // Limit to 10 services
      return foundServices.slice(0, 10);
    });

    return services;
  } catch (error) {
    return [];
  }
}

/**
 * Visit contact page and extract data
 */
async function visitContactPage(page, baseUrl) {
  try {
    // Find contact page link
    const contactUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const contactLink = links.find(link =>
        /contact|get in touch|reach us/i.test(link.innerText) ||
        /\/contact|\/contact-us/i.test(link.href)
      );
      return contactLink?.href || null;
    });

    if (!contactUrl) {
      logDebug('No contact page found');
      return null;
    }

    logDebug('Visiting contact page', { url: contactUrl });

    // Navigate to contact page
    await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Extract data from contact page
    const email = await extractEmails(page);
    const phone = await extractPhones(page);

    const name = await page.evaluate(() => {
      // Look for contact name patterns
      const text = document.body.innerText;
      const patterns = [
        /contact:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        /owner:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        /manager:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1];
      }
      return null;
    });

    return { email, phone, name };

  } catch (error) {
    logDebug('Failed to visit contact page', { error: error.message });
    return null;
  }
}

/**
 * Visit about page and extract description
 */
async function visitAboutPage(page, baseUrl) {
  try {
    const aboutUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const aboutLink = links.find(link =>
        /about|our story|who we are/i.test(link.innerText) ||
        /\/about/i.test(link.href)
      );
      return aboutLink?.href || null;
    });

    if (!aboutUrl) {
      logDebug('No about page found');
      return null;
    }

    logDebug('Visiting about page', { url: aboutUrl });

    await page.goto(aboutUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

    const description = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      const paragraphs = Array.from(main.querySelectorAll('p'));

      // Find the longest paragraph (likely the description)
      let longest = '';
      paragraphs.forEach(p => {
        const text = p.innerText.trim();
        if (text.length > longest.length && text.length < 1000) {
          longest = text;
        }
      });

      return longest || null;
    });

    const owner_name = await page.evaluate(() => {
      const text = document.body.innerText;
      const patterns = [
        /founded by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        /owner:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        /by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1];
      }
      return null;
    });

    return { description, owner_name };

  } catch (error) {
    logDebug('Failed to visit about page', { error: error.message });
    return null;
  }
}

/**
 * Visit services/menu page and extract offerings
 */
async function visitServicesPage(page, baseUrl) {
  try {
    const servicesUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const servicesLink = links.find(link =>
        /services|menu|what we do|offerings/i.test(link.innerText) ||
        /\/services|\/menu/i.test(link.href)
      );
      return servicesLink?.href || null;
    });

    if (!servicesUrl) {
      logDebug('No services/menu page found');
      return null;
    }

    logDebug('Visiting services page', { url: servicesUrl });

    await page.goto(servicesUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

    const services = await extractServices(page, null);
    return services;

  } catch (error) {
    logDebug('Failed to visit services page', { error: error.message });
    return null;
  }
}

/**
 * Calculate confidence score (0-100)
 */
function calculateConfidence(data) {
  let score = 0;

  // Email: 30 points
  if (data.contact_email) score += 30;

  // Phone: 25 points
  if (data.contact_phone) score += 25;

  // Description: 20 points
  if (data.description && data.description.length > 50) score += 20;

  // Services: 15 points
  if (data.services.length >= 3) score += 15;
  else if (data.services.length > 0) score += 5;

  // Contact name: 10 points
  if (data.contact_name) score += 10;

  return Math.min(score, 100);
}
