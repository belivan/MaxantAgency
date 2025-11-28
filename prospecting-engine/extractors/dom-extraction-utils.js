/**
 * DOM Extraction Utilities
 *
 * Helper functions for extracting data from web pages using Playwright.
 * Extracted from dom-scraper.js for modularity.
 */

import { logDebug } from '../shared/logger.js';

/**
 * Extract Schema.org/JSON-LD structured data
 *
 * @param {object} page - Playwright page object
 * @returns {Promise<object|null>} Schema.org data or null
 */
export async function extractSchemaOrg(page) {
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
 *
 * @param {object} page - Playwright page object
 * @returns {Promise<string|null>} Best email found or null
 */
export async function extractEmails(page) {
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
 *
 * @param {object} page - Playwright page object
 * @returns {Promise<string|null>} First phone found or null
 */
export async function extractPhones(page) {
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
 *
 * @param {object} page - Playwright page object
 * @returns {Promise<string|null>} Description or null
 */
export async function extractDescription(page) {
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
 *
 * @param {object} page - Playwright page object
 * @param {string} companyName - Company name for context
 * @returns {Promise<string[]>} Array of services
 */
export async function extractServices(page, companyName) {
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
 * Extract contact name from page
 *
 * @param {object} page - Playwright page object
 * @returns {Promise<string|null>} Contact name or null
 */
export async function extractContactName(page) {
  try {
    const name = await page.evaluate(() => {
      const text = document.body.innerText;
      const patterns = [
        /contact:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        /owner:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        /manager:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        /founded by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        /by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1];
      }
      return null;
    });

    return name;
  } catch (error) {
    return null;
  }
}

/**
 * Calculate confidence score (0-100)
 *
 * @param {object} data - Extracted data object
 * @returns {number} Confidence score
 */
export function calculateConfidence(data) {
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

export default {
  extractSchemaOrg,
  extractEmails,
  extractPhones,
  extractDescription,
  extractServices,
  extractContactName,
  calculateConfidence
};
