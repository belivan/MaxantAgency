import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logInfo, logError, logDebug } from '../shared/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Find social media profiles for a company
 *
 * Uses multiple sources to discover social profiles:
 * 1. Social links found on website (from scraper)
 * 2. Google Search for specific platforms
 * 3. Pattern matching and validation
 *
 * @param {object} company - Company object with name, website, etc.
 * @param {object} websiteData - Data from website scraper (optional)
 * @returns {Promise<object>} Social profiles object
 */
export async function findSocialProfiles(company, websiteData = null) {
  logInfo('Finding social profiles', { company: company.name });

  const profiles = {
    instagram: null,
    facebook: null,
    linkedin: null,
    twitter: null,
    youtube: null,
    tiktok: null
  };

  try {
    // Source 1: Social links from website scraper
    if (websiteData?.socialLinks) {
      Object.keys(profiles).forEach(platform => {
        if (websiteData.socialLinks[platform]) {
          profiles[platform] = cleanSocialUrl(websiteData.socialLinks[platform], platform);
        }
      });

      logDebug('Social links from website', {
        found: Object.keys(profiles).filter(k => profiles[k]).length
      });
    }

    // Source 2: Social links from Grok extraction
    if (websiteData?.social_links) {
      Object.keys(profiles).forEach(platform => {
        if (!profiles[platform] && websiteData.social_links[platform]) {
          profiles[platform] = cleanSocialUrl(websiteData.social_links[platform], platform);
        }
      });
    }

    // Source 3: Google Search for missing platforms (if Google Custom Search API is available)
    const missingPlatforms = Object.keys(profiles).filter(k => !profiles[k]);

    if (missingPlatforms.length > 0 && process.env.GOOGLE_SEARCH_API_KEY) {
      logDebug('Searching for missing social profiles via Google', {
        platforms: missingPlatforms
      });

      for (const platform of missingPlatforms.slice(0, 3)) { // Limit to top 3 to save API calls
        const foundUrl = await searchForSocialProfile(company.name, platform);
        if (foundUrl) {
          profiles[platform] = foundUrl;
        }
      }
    }

    // Log results
    const foundCount = Object.keys(profiles).filter(k => profiles[k]).length;
    logInfo('Social profile discovery complete', {
      company: company.name,
      found: foundCount,
      platforms: Object.keys(profiles).filter(k => profiles[k])
    });

    return profiles;

  } catch (error) {
    logError('Social profile discovery failed', error, { company: company.name });
    return profiles;
  }
}

/**
 * Search for a specific social media profile using Google Custom Search
 *
 * @param {string} companyName - Company name
 * @param {string} platform - Platform name (instagram, facebook, etc.)
 * @returns {Promise<string|null>} Profile URL or null
 */
async function searchForSocialProfile(companyName, platform) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !engineId) {
    return null;
  }

  try {
    const platformDomains = {
      instagram: 'instagram.com',
      facebook: 'facebook.com',
      linkedin: 'linkedin.com/company',
      twitter: 'twitter.com OR x.com',
      youtube: 'youtube.com',
      tiktok: 'tiktok.com'
    };

    const domain = platformDomains[platform];
    if (!domain) return null;

    // Build search query
    const query = `site:${domain} "${companyName}"`;

    logDebug('Searching Google for social profile', { query, platform });

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.append('key', apiKey);
    url.searchParams.append('cx', engineId);
    url.searchParams.append('q', query);
    url.searchParams.append('num', 1); // Just get first result

    const response = await fetch(url.toString(), {
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const profileUrl = data.items[0].link;
      const cleanedUrl = cleanSocialUrl(profileUrl, platform);

      logDebug('Found social profile via Google', {
        platform,
        url: cleanedUrl
      });

      return cleanedUrl;
    }

    return null;

  } catch (error) {
    logError('Google search for social profile failed', error, {
      company: companyName,
      platform
    });
    return null;
  }
}

/**
 * Clean and validate social media URL
 *
 * @param {string} url - Raw URL
 * @param {string} platform - Platform name
 * @returns {string|null} Cleaned URL or null
 */
function cleanSocialUrl(url, platform) {
  if (!url) return null;

  try {
    // Remove query parameters and fragments
    let cleanUrl = url.split('?')[0].split('#')[0];

    // Ensure https
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // Validate domain
    const validDomains = {
      instagram: ['instagram.com', 'www.instagram.com'],
      facebook: ['facebook.com', 'www.facebook.com', 'fb.com', 'www.fb.com'],
      linkedin: ['linkedin.com', 'www.linkedin.com'],
      twitter: ['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'],
      youtube: ['youtube.com', 'www.youtube.com'],
      tiktok: ['tiktok.com', 'www.tiktok.com']
    };

    const urlObj = new URL(cleanUrl);
    const hostname = urlObj.hostname.toLowerCase();

    if (!validDomains[platform]?.includes(hostname)) {
      return null;
    }

    // Remove trailing slashes
    cleanUrl = cleanUrl.replace(/\/$/, '');

    return cleanUrl;

  } catch (error) {
    logDebug('Invalid social URL', { url, platform, error: error.message });
    return null;
  }
}

/**
 * Consolidate social profiles from multiple sources
 *
 * @param {Array<object>} sources - Array of profile objects
 * @returns {object} Consolidated profiles
 */
export function consolidateSocialProfiles(sources) {
  const consolidated = {
    instagram: null,
    facebook: null,
    linkedin: null,
    twitter: null,
    youtube: null,
    tiktok: null
  };

  // Merge all sources, first non-null value wins
  sources.forEach(source => {
    if (source) {
      Object.keys(consolidated).forEach(platform => {
        if (!consolidated[platform] && source[platform]) {
          consolidated[platform] = source[platform];
        }
      });
    }
  });

  return consolidated;
}

export default { findSocialProfiles, consolidateSocialProfiles };
