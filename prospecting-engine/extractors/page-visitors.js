/**
 * Page Visitor Functions
 *
 * Functions for navigating to and extracting data from specific pages.
 * Extracted from dom-scraper.js for modularity.
 */

import { logDebug, logWarn } from '../shared/logger.js';
import { extractEmails, extractPhones, extractServices } from './dom-extraction-utils.js';

/**
 * Visit contact page and extract data
 *
 * @param {object} page - Playwright page object
 * @param {string} baseUrl - Base URL of the website
 * @returns {Promise<object|null>} Contact data {email, phone, name} or null
 */
export async function visitContactPage(page, baseUrl) {
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
 *
 * @param {object} page - Playwright page object
 * @param {string} baseUrl - Base URL of the website
 * @returns {Promise<object|null>} About data {description, owner_name} or null
 */
export async function visitAboutPage(page, baseUrl) {
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
 *
 * @param {object} page - Playwright page object
 * @param {string} baseUrl - Base URL of the website
 * @returns {Promise<string[]|null>} Array of services or null
 */
export async function visitServicesPage(page, baseUrl) {
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
 * Fallback to hardcoded page visits if AI selection fails
 *
 * @param {object} page - Playwright page object
 * @param {string} url - Website URL
 * @param {object} data - Data object to populate
 * @param {Array} crawledPages - Array to push crawled page HTML to
 */
export async function fallbackPageVisits(page, url, data, crawledPages) {
  // Visit contact page if email/phone missing
  if (!data.contact_email || !data.contact_phone) {
    const contactData = await visitContactPage(page, url);
    if (contactData) {
      data.contact_email = data.contact_email || contactData.email;
      data.contact_phone = data.contact_phone || contactData.phone;
      data.contact_name = data.contact_name || contactData.name;
      data.pages_visited.push('contact');

      try {
        const contactHtml = await page.content();
        crawledPages.push({
          url: page.url(),
          html: contactHtml,
          isHomepage: false
        });
      } catch (error) {
        logWarn('Failed to capture contact page HTML for BI', { error: error.message });
      }
    }
  }

  // Visit about page if description missing
  if (!data.description) {
    const aboutData = await visitAboutPage(page, url);
    if (aboutData) {
      data.description = aboutData.description;
      data.contact_name = data.contact_name || aboutData.owner_name;
      data.pages_visited.push('about');

      try {
        const aboutHtml = await page.content();
        crawledPages.push({
          url: page.url(),
          html: aboutHtml,
          isHomepage: false
        });
      } catch (error) {
        logWarn('Failed to capture about page HTML for BI', { error: error.message });
      }
    }
  }

  // Visit services page if services missing
  if (data.services.length === 0) {
    const servicesData = await visitServicesPage(page, url);
    if (servicesData && servicesData.length > 0) {
      data.services = servicesData;
      data.pages_visited.push('services');

      try {
        const servicesHtml = await page.content();
        crawledPages.push({
          url: page.url(),
          html: servicesHtml,
          isHomepage: false
        });
      } catch (error) {
        logWarn('Failed to capture services page HTML for BI', { error: error.message });
      }
    }
  }
}

export default {
  visitContactPage,
  visitAboutPage,
  visitServicesPage,
  fallbackPageVisits
};
