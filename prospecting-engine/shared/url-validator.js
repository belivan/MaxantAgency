/**
 * URL Validation Utilities
 *
 * Validates URLs and distinguishes between:
 * - Real websites
 * - Social media URLs (should go to social_profiles)
 */

/**
 * Check if a URL is a social media platform
 *
 * @param {string} url - URL to check
 * @returns {object|null} { platform: 'facebook', url: '...' } or null
 */
export function detectSocialMediaUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const normalizedUrl = url.toLowerCase();

  const socialPlatforms = [
    { platform: 'facebook', patterns: ['facebook.com', 'fb.com', 'fb.me'] },
    { platform: 'instagram', patterns: ['instagram.com', 'instagr.am'] },
    { platform: 'twitter', patterns: ['twitter.com', 'x.com'] },
    { platform: 'linkedin', patterns: ['linkedin.com'] },
    { platform: 'youtube', patterns: ['youtube.com', 'youtu.be'] },
    { platform: 'tiktok', patterns: ['tiktok.com'] },
    { platform: 'pinterest', patterns: ['pinterest.com', 'pin.it'] },
    { platform: 'yelp', patterns: ['yelp.com'] }
  ];

  for (const social of socialPlatforms) {
    for (const pattern of social.patterns) {
      if (normalizedUrl.includes(pattern)) {
        return {
          platform: social.platform,
          url: url
        };
      }
    }
  }

  return null;
}

/**
 * Validate and clean a website URL
 * Returns null if the URL is actually a social media URL
 *
 * @param {string} url - URL to validate
 * @returns {object} { website: string|null, socialProfile: object|null }
 */
export function validateWebsiteUrl(url) {
  if (!url || url === 'N/A') {
    return { website: null, socialProfile: null };
  }

  // Check if it's a social media URL
  const social = detectSocialMediaUrl(url);

  if (social) {
    // This is a social URL, not a website
    return {
      website: null,
      socialProfile: social
    };
  }

  // It's a real website
  return {
    website: url,
    socialProfile: null
  };
}

/**
 * Clean and validate company data from Google Maps
 * Moves social URLs from website field to social_profiles
 *
 * @param {object} data - Company data with website field
 * @returns {object} Cleaned data
 */
export function cleanCompanyData(data) {
  const cleaned = { ...data };

  if (data.website) {
    const validation = validateWebsiteUrl(data.website);

    if (validation.socialProfile) {
      // Website is actually a social media URL
      console.log(`   ℹ️  Detected social URL in website field: ${validation.socialProfile.platform}`);

      // Move to social_profiles
      cleaned.website = null;
      cleaned.social_profiles = cleaned.social_profiles || {};
      cleaned.social_profiles[validation.socialProfile.platform] = validation.socialProfile.url;
    } else {
      // Keep as website
      cleaned.website = validation.website;
    }
  }

  return cleaned;
}

/**
 * Cross-validate social profiles object
 * Ensures Instagram URLs are in instagram field, Facebook in facebook, etc.
 *
 * @param {object} socialProfiles - Social profiles object
 * @returns {object} { valid: boolean, mismatches: Array }
 */
export function validateSocialProfiles(socialProfiles) {
  if (!socialProfiles || typeof socialProfiles !== 'object') {
    return { valid: true, mismatches: [] };
  }

  const mismatches = [];

  for (const [declaredPlatform, url] of Object.entries(socialProfiles)) {
    if (!url) continue;

    const detected = detectSocialMediaUrl(url);

    if (!detected) {
      // URL doesn't match any known platform
      mismatches.push({
        declaredPlatform,
        url,
        detectedPlatform: null,
        issue: 'unrecognized_url'
      });
      continue;
    }

    if (detected.platform !== declaredPlatform) {
      // Platform mismatch - Instagram URL in Facebook field, etc.
      mismatches.push({
        declaredPlatform,
        url,
        detectedPlatform: detected.platform,
        issue: 'platform_mismatch'
      });
    }
  }

  return {
    valid: mismatches.length === 0,
    mismatches
  };
}

export default {
  detectSocialMediaUrl,
  validateWebsiteUrl,
  cleanCompanyData,
  validateSocialProfiles
};
