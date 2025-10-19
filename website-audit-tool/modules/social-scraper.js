/**
 * Social Media Profile Scraper
 * Uses Playwright for free DOM scraping, then cheap AI analysis
 * Extracts public data from Instagram, Facebook, LinkedIn
 */

import { callAI } from '../ai-providers.js';

/**
 * Scrape Instagram profile (public data only)
 * @param {Page} page - Playwright page instance
 * @param {string} url - Instagram profile URL
 * @returns {Promise<Object>} Profile data
 */
export async function scrapeInstagram(page, url) {
  const timeout = 10000; // 10 second timeout

  try {
    console.log(`📸 Scraping Instagram: ${url}`);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout
    });

    // Wait a bit for content to load
    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
      try {
        // Instagram stores data in script tags as JSON
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        let profileData = null;

        for (const script of scripts) {
          try {
            const json = JSON.parse(script.textContent);
            if (json['@type'] === 'Person' || json['@type'] === 'Organization') {
              profileData = json;
              break;
            }
          } catch (e) {
            continue;
          }
        }

        // Fallback: Try to extract from meta tags
        const getName = () => {
          const ogTitle = document.querySelector('meta[property="og:title"]');
          if (ogTitle) {
            const content = ogTitle.getAttribute('content');
            // Format: "@username • Instagram photos and videos"
            return content ? content.split('•')[0].trim() : null;
          }
          return null;
        };

        const getBio = () => {
          const ogDescription = document.querySelector('meta[property="og:description"]');
          return ogDescription ? ogDescription.getAttribute('content') : null;
        };

        return {
          name: profileData?.name || getName(),
          bio: profileData?.description || getBio(),
          // Note: Follower counts are loaded dynamically via JS, harder to scrape
          // Instagram aggressively blocks scrapers, so we get what we can
          scraped: true,
          scrapedAt: new Date().toISOString()
        };
      } catch (error) {
        return { error: error.message, scraped: false };
      }
    });

    console.log(`✅ Instagram scraped: ${data.name || 'Unknown'}`);
    return {
      platform: 'instagram',
      url,
      ...data,
      success: data.scraped
    };

  } catch (error) {
    console.log(`⚠️  Instagram scrape failed: ${error.message}`);
    return {
      platform: 'instagram',
      url,
      error: error.message,
      success: false
    };
  }
}

/**
 * Scrape Facebook page (public data only)
 * @param {Page} page - Playwright page instance
 * @param {string} url - Facebook page URL
 * @returns {Promise<Object>} Page data
 */
export async function scrapeFacebook(page, url) {
  const timeout = 10000;

  try {
    console.log(`📘 Scraping Facebook: ${url}`);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout
    });

    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
      try {
        // Extract from meta tags
        const getName = () => {
          const ogTitle = document.querySelector('meta[property="og:title"]');
          return ogTitle ? ogTitle.getAttribute('content') : null;
        };

        const getDescription = () => {
          const ogDesc = document.querySelector('meta[property="og:description"]');
          return ogDesc ? ogDesc.getAttribute('content') : null;
        };

        const getType = () => {
          const ogType = document.querySelector('meta[property="og:type"]');
          return ogType ? ogType.getAttribute('content') : null;
        };

        return {
          name: getName(),
          description: getDescription(),
          type: getType(), // "business.business" or "profile"
          scraped: true,
          scrapedAt: new Date().toISOString()
        };
      } catch (error) {
        return { error: error.message, scraped: false };
      }
    });

    console.log(`✅ Facebook scraped: ${data.name || 'Unknown'}`);
    return {
      platform: 'facebook',
      url,
      ...data,
      success: data.scraped
    };

  } catch (error) {
    console.log(`⚠️  Facebook scrape failed: ${error.message}`);
    return {
      platform: 'facebook',
      url,
      error: error.message,
      success: false
    };
  }
}

/**
 * Scrape LinkedIn company page (public data only)
 * @param {Page} page - Playwright page instance
 * @param {string} url - LinkedIn company URL
 * @returns {Promise<Object>} Company data
 */
export async function scrapeLinkedIn(page, url) {
  const timeout = 10000;

  try {
    console.log(`💼 Scraping LinkedIn: ${url}`);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout
    });

    await page.waitForTimeout(2000);

    const data = await page.evaluate(() => {
      try {
        // LinkedIn uses specific meta tags
        const getName = () => {
          const ogTitle = document.querySelector('meta[property="og:title"]');
          return ogTitle ? ogTitle.getAttribute('content') : null;
        };

        const getDescription = () => {
          const ogDesc = document.querySelector('meta[property="og:description"]');
          return ogDesc ? ogDesc.getAttribute('content') : null;
        };

        // Try to extract company size from description
        const parseCompanySize = (desc) => {
          if (!desc) return null;

          const sizeMatch = desc.match(/(\d+[\d,]*[-–]\d+[\d,]*|\d+[\d,]*\+?)\s*employees?/i);
          return sizeMatch ? sizeMatch[1] : null;
        };

        const description = getDescription();

        return {
          name: getName(),
          description,
          employeeCount: parseCompanySize(description),
          scraped: true,
          scrapedAt: new Date().toISOString()
        };
      } catch (error) {
        return { error: error.message, scraped: false };
      }
    });

    console.log(`✅ LinkedIn scraped: ${data.name || 'Unknown'}`);
    return {
      platform: 'linkedin',
      url,
      ...data,
      success: data.scraped
    };

  } catch (error) {
    console.log(`⚠️  LinkedIn scrape failed: ${error.message}`);
    return {
      platform: 'linkedin',
      url,
      error: error.message,
      success: false
    };
  }
}

/**
 * Enrich social profiles from prospects table
 * Takes social profile URLs and scrapes them for additional data
 *
 * @param {Page} page - Playwright page instance
 * @param {Object} prospectSocialProfiles - Social profiles from prospects.social_profiles
 * @returns {Promise<Object>} Enriched social profile data
 */
export async function enrichSocialProfiles(page, prospectSocialProfiles) {
  if (!prospectSocialProfiles) {
    console.log('ℹ️  No social profiles to enrich');
    return null;
  }

  const enriched = {
    instagram: null,
    facebook: null,
    linkedin_company: null,
    linkedin_person: null,
    enrichedAt: new Date().toISOString()
  };

  // Scrape Instagram
  if (prospectSocialProfiles.instagram) {
    try {
      enriched.instagram = await scrapeInstagram(page, prospectSocialProfiles.instagram);
    } catch (error) {
      console.log(`⚠️  Instagram enrichment failed: ${error.message}`);
      enriched.instagram = { url: prospectSocialProfiles.instagram, error: error.message };
    }
  }

  // Scrape Facebook
  if (prospectSocialProfiles.facebook) {
    try {
      enriched.facebook = await scrapeFacebook(page, prospectSocialProfiles.facebook);
    } catch (error) {
      console.log(`⚠️  Facebook enrichment failed: ${error.message}`);
      enriched.facebook = { url: prospectSocialProfiles.facebook, error: error.message };
    }
  }

  // Scrape LinkedIn Company
  if (prospectSocialProfiles.linkedin_company) {
    try {
      enriched.linkedin_company = await scrapeLinkedIn(page, prospectSocialProfiles.linkedin_company);
    } catch (error) {
      console.log(`⚠️  LinkedIn company enrichment failed: ${error.message}`);
      enriched.linkedin_company = { url: prospectSocialProfiles.linkedin_company, error: error.message };
    }
  }

  // LinkedIn Person URL (save for later, don't scrape)
  if (prospectSocialProfiles.linkedin_person) {
    enriched.linkedin_person = {
      url: prospectSocialProfiles.linkedin_person,
      note: 'Personal profile not scraped (privacy)'
    };
  }

  return enriched;
}

/**
 * Analyze social media presence with cheap AI
 * Takes scraped social data and provides insights
 *
 * @param {Object} scrapedProfiles - Data from enrichSocialProfiles()
 * @param {string} companyName - Company name for context
 * @param {string} industry - Industry for context
 * @param {string} model - AI model to use (default: 'grok-4-fast' - cheapest)
 * @returns {Promise<Object>} AI insights about social presence
 */
export async function analyzeSocialPresence(scrapedProfiles, companyName, industry, model = 'grok-4-fast') {
  if (!scrapedProfiles) {
    return {
      analyzed: false,
      reason: 'No social profiles to analyze'
    };
  }

  try {
    console.log(`🤖 Analyzing social presence with ${model}...`);

    // Build context from scraped data
    const context = {
      company: companyName,
      industry,
      instagram: scrapedProfiles.instagram,
      facebook: scrapedProfiles.facebook,
      linkedin: scrapedProfiles.linkedin_company
    };

    const prompt = `Analyze this company's social media presence and provide brief insights.

Company: ${companyName}
Industry: ${industry}

Social Media Data:
${JSON.stringify(context, null, 2)}

Provide a brief analysis (2-3 sentences) covering:
1. Overall social media presence strength (active/inactive/mixed)
2. Which platforms they're strongest on
3. Any notable gaps or opportunities

Keep it concise and actionable.`;

    const response = await callAI({
      model,
      prompt,
      systemPrompt: 'You are a social media analyst. Provide brief, actionable insights based on the data provided.',
      enableSearch: false
    });

    console.log('✅ Social presence analyzed');

    return {
      analyzed: true,
      insights: response.text,
      model,
      analyzedAt: new Date().toISOString()
    };

  } catch (error) {
    console.log(`⚠️  Social presence analysis failed: ${error.message}`);
    return {
      analyzed: false,
      error: error.message
    };
  }
}

/**
 * Merge social profile data from multiple sources
 * Combines data from:
 * 1. Prospects table (initial URLs)
 * 2. Website scraping (from social-finder.js)
 * 3. Social media scraping (from this module)
 *
 * @param {Object} prospectProfiles - From prospects.social_profiles
 * @param {Object} websiteProfiles - From social-finder.js
 * @param {Object} scrapedProfiles - From enrichSocialProfiles()
 * @returns {Object} Merged social profile data
 */
export function mergeSocialProfiles(prospectProfiles, websiteProfiles, scrapedProfiles) {
  const merged = {
    // LinkedIn
    linkedIn: {
      company: prospectProfiles?.linkedin_company || websiteProfiles?.linkedIn?.company || null,
      personal: prospectProfiles?.linkedin_person || (websiteProfiles?.linkedIn?.personal?.[0]) || null,
      enrichedData: scrapedProfiles?.linkedin_company || null
    },

    // Instagram
    instagram: {
      url: prospectProfiles?.instagram || websiteProfiles?.instagram?.url || null,
      handle: websiteProfiles?.instagram?.handle || null,
      enrichedData: scrapedProfiles?.instagram || null
    },

    // Facebook
    facebook: {
      url: prospectProfiles?.facebook || websiteProfiles?.facebook?.url || null,
      enrichedData: scrapedProfiles?.facebook || null
    },

    // Twitter (only from website scraping, not in prospects)
    twitter: {
      url: websiteProfiles?.twitter?.url || null,
      handle: websiteProfiles?.twitter?.handle || null
    },

    // YouTube (only from website scraping)
    youtube: {
      url: websiteProfiles?.youtube?.url || null
    },

    // Metadata
    sources: {
      fromProspects: !!prospectProfiles,
      fromWebsite: !!websiteProfiles,
      fromScraping: !!scrapedProfiles
    },
    mergedAt: new Date().toISOString()
  };

  return merged;
}
