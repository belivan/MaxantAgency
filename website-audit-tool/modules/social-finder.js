/**
 * Social Media Profile Finder
 * Extracts LinkedIn, Instagram, Twitter/X, Facebook, YouTube links from website
 */

/**
 * Social media URL patterns for validation and extraction
 */
const SOCIAL_PATTERNS = {
  linkedIn: {
    company: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/company\/([a-zA-Z0-9-]+)/i,
    personal: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9-]+)/i
  },
  instagram: {
    pattern: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i,
    handlePattern: /@([a-zA-Z0-9_.]+)/  // For finding @username references
  },
  twitter: {
    // Supports both twitter.com and x.com
    pattern: /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/i,
    handlePattern: /@([a-zA-Z0-9_]+)/
  },
  facebook: {
    pattern: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/([a-zA-Z0-9.]+)/i
  },
  youtube: {
    channel: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:channel|c|user)\/([a-zA-Z0-9_-]+)/i,
    handle: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/@([a-zA-Z0-9_-]+)/i
  }
};

/**
 * Common selectors where social media links are found
 */
const SOCIAL_LINK_SELECTORS = [
  'footer a[href]',
  'header a[href]',
  '.social a[href]',
  '.social-media a[href]',
  '.social-links a[href]',
  '[class*="social"] a[href]',
  '[class*="follow"] a[href]',
  'a[aria-label*="social" i]',
  'a[aria-label*="linkedin" i]',
  'a[aria-label*="instagram" i]',
  'a[aria-label*="twitter" i]',
  'a[aria-label*="facebook" i]',
  'a[aria-label*="youtube" i]'
];

/**
 * Extract all social media profiles from a Playwright page
 * @param {Page} page - Playwright page instance
 * @param {string} url - Current page URL
 * @returns {Object} Social media profiles found
 */
export async function extractSocialProfiles(page, url) {
  try {
    const result = await page.evaluate(({ patterns, selectors }) => {
      const profiles = {
        linkedIn: { company: null, personal: [] },
        instagram: { handle: null, url: null },
        twitter: { handle: null, url: null },
        facebook: { url: null },
        youtube: { url: null }
      };

      // Parse patterns from strings to RegExp
      const regex = {
        linkedIn: {
          company: new RegExp(patterns.linkedIn.company),
          personal: new RegExp(patterns.linkedIn.personal)
        },
        instagram: new RegExp(patterns.instagram),
        twitter: new RegExp(patterns.twitter),
        facebook: new RegExp(patterns.facebook),
        youtube: {
          channel: new RegExp(patterns.youtube.channel),
          handle: new RegExp(patterns.youtube.handle)
        }
      };

      // Collect all links from social link areas
      const socialLinks = new Set();

      // Try all selectors
      selectors.forEach(selector => {
        try {
          const links = document.querySelectorAll(selector);
          links.forEach(link => {
            const href = link.getAttribute('href');
            if (href) socialLinks.add(href);
          });
        } catch (e) {
          // Selector might not work on this page
        }
      });

      // Also scan all links on the page (fallback)
      const allLinks = document.querySelectorAll('a[href]');
      allLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (
          href.includes('linkedin') ||
          href.includes('instagram') ||
          href.includes('twitter') ||
          href.includes('x.com') ||
          href.includes('facebook') ||
          href.includes('youtube')
        )) {
          socialLinks.add(href);
        }
      });

      // Process each link
      socialLinks.forEach(href => {
        // Normalize URL
        let fullUrl = href;
        try {
          if (!href.startsWith('http')) {
            fullUrl = new URL(href, window.location.href).href;
          }
        } catch (e) {
          // Invalid URL, skip
          return;
        }

        // LinkedIn
        if (fullUrl.includes('linkedin.com')) {
          const companyMatch = fullUrl.match(regex.linkedIn.company);
          const personalMatch = fullUrl.match(regex.linkedIn.personal);

          if (companyMatch && !profiles.linkedIn.company) {
            profiles.linkedIn.company = fullUrl;
          } else if (personalMatch) {
            // Collect up to 5 personal profiles (founder, team members)
            if (profiles.linkedIn.personal.length < 5) {
              profiles.linkedIn.personal.push(fullUrl);
            }
          }
        }

        // Instagram
        if (fullUrl.includes('instagram.com') && !profiles.instagram.url) {
          const match = fullUrl.match(regex.instagram);
          if (match) {
            profiles.instagram.url = fullUrl;
            profiles.instagram.handle = '@' + match[1];
          }
        }

        // Twitter/X
        if ((fullUrl.includes('twitter.com') || fullUrl.includes('x.com')) && !profiles.twitter.url) {
          const match = fullUrl.match(regex.twitter);
          if (match) {
            profiles.twitter.url = fullUrl;
            profiles.twitter.handle = '@' + match[1];
          }
        }

        // Facebook
        if (fullUrl.includes('facebook.com') && !profiles.facebook.url) {
          const match = fullUrl.match(regex.facebook);
          if (match && !fullUrl.includes('sharer') && !fullUrl.includes('plugins')) {
            profiles.facebook.url = fullUrl;
          }
        }

        // YouTube
        if (fullUrl.includes('youtube.com') && !profiles.youtube.url) {
          const channelMatch = fullUrl.match(regex.youtube.channel);
          const handleMatch = fullUrl.match(regex.youtube.handle);
          if (channelMatch || handleMatch) {
            profiles.youtube.url = fullUrl;
          }
        }
      });

      // Also check body text for @mentions (Instagram/Twitter handles)
      const bodyText = document.body.innerText || '';

      // Instagram @mentions
      if (!profiles.instagram.handle) {
        const instagramHandles = bodyText.match(/@([a-zA-Z0-9_.]{3,30})/g);
        if (instagramHandles && instagramHandles.length > 0) {
          // Take the first one that looks like a business handle
          const handle = instagramHandles[0];
          if (!handle.includes('@gmail') && !handle.includes('@hotmail') && !handle.includes('@yahoo')) {
            profiles.instagram.handle = handle;
            profiles.instagram.url = `https://instagram.com/${handle.replace('@', '')}`;
          }
        }
      }

      // Twitter @mentions
      if (!profiles.twitter.handle) {
        const twitterHandles = bodyText.match(/@([a-zA-Z0-9_]{3,15})/g);
        if (twitterHandles && twitterHandles.length > 0) {
          const handle = twitterHandles[0];
          profiles.twitter.handle = handle;
          profiles.twitter.url = `https://twitter.com/${handle.replace('@', '')}`;
        }
      }

      return profiles;
    }, {
      patterns: {
        linkedIn: {
          company: SOCIAL_PATTERNS.linkedIn.company.source,
          personal: SOCIAL_PATTERNS.linkedIn.personal.source
        },
        instagram: SOCIAL_PATTERNS.instagram.pattern.source,
        twitter: SOCIAL_PATTERNS.twitter.pattern.source,
        facebook: SOCIAL_PATTERNS.facebook.pattern.source,
        youtube: {
          channel: SOCIAL_PATTERNS.youtube.channel.source,
          handle: SOCIAL_PATTERNS.youtube.handle.source
        }
      },
      selectors: SOCIAL_LINK_SELECTORS
    });

    // Clean up and validate results
    const cleanedProfiles = {
      linkedIn: {
        company: result.linkedIn.company || null,
        personal: result.linkedIn.personal.filter(Boolean),
        hasCompany: !!result.linkedIn.company,
        hasPersonal: result.linkedIn.personal.length > 0
      },
      instagram: {
        handle: result.instagram.handle || null,
        url: result.instagram.url || null,
        found: !!(result.instagram.handle || result.instagram.url)
      },
      twitter: {
        handle: result.twitter.handle || null,
        url: result.twitter.url || null,
        found: !!(result.twitter.handle || result.twitter.url)
      },
      facebook: {
        url: result.facebook.url || null,
        found: !!result.facebook.url
      },
      youtube: {
        url: result.youtube.url || null,
        found: !!result.youtube.url
      }
    };

    // Add summary stats
    cleanedProfiles.summary = {
      totalFound: [
        cleanedProfiles.linkedIn.hasCompany || cleanedProfiles.linkedIn.hasPersonal,
        cleanedProfiles.instagram.found,
        cleanedProfiles.twitter.found,
        cleanedProfiles.facebook.found,
        cleanedProfiles.youtube.found
      ].filter(Boolean).length,
      platforms: []
    };

    if (cleanedProfiles.linkedIn.hasCompany) cleanedProfiles.summary.platforms.push('LinkedIn');
    if (cleanedProfiles.instagram.found) cleanedProfiles.summary.platforms.push('Instagram');
    if (cleanedProfiles.twitter.found) cleanedProfiles.summary.platforms.push('Twitter');
    if (cleanedProfiles.facebook.found) cleanedProfiles.summary.platforms.push('Facebook');
    if (cleanedProfiles.youtube.found) cleanedProfiles.summary.platforms.push('YouTube');

    return {
      url,
      profiles: cleanedProfiles,
      extractedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Social profile extraction error:', error);
    return {
      url,
      profiles: {
        linkedIn: { company: null, personal: [], hasCompany: false, hasPersonal: false },
        instagram: { handle: null, url: null, found: false },
        twitter: { handle: null, url: null, found: false },
        facebook: { url: null, found: false },
        youtube: { url: null, found: false },
        summary: { totalFound: 0, platforms: [] }
      },
      extractedAt: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Get the best LinkedIn profile for outreach (prefer company, fallback to first personal)
 * @param {Object} socialProfiles - Result from extractSocialProfiles
 * @returns {string|null} Best LinkedIn URL for outreach
 */
export function getBestLinkedInProfile(socialProfiles) {
  if (!socialProfiles || !socialProfiles.profiles) return null;

  const linkedIn = socialProfiles.profiles.linkedIn;

  // Prefer company page
  if (linkedIn.company) {
    return linkedIn.company;
  }

  // Fallback to first personal profile (likely founder or CEO)
  if (linkedIn.personal && linkedIn.personal.length > 0) {
    return linkedIn.personal[0];
  }

  return null;
}

/**
 * Format social profiles for display/email
 * @param {Object} socialProfiles - Result from extractSocialProfiles
 * @returns {string} Formatted string of social profiles
 */
export function formatSocialProfiles(socialProfiles) {
  if (!socialProfiles || !socialProfiles.profiles) return 'No social profiles found';

  const { profiles } = socialProfiles;
  const lines = [];

  if (profiles.linkedIn.hasCompany) {
    lines.push(`LinkedIn: ${profiles.linkedIn.company}`);
  } else if (profiles.linkedIn.hasPersonal) {
    lines.push(`LinkedIn: ${profiles.linkedIn.personal[0]}`);
  }

  if (profiles.instagram.found) {
    lines.push(`Instagram: ${profiles.instagram.handle || profiles.instagram.url}`);
  }

  if (profiles.twitter.found) {
    lines.push(`Twitter: ${profiles.twitter.handle || profiles.twitter.url}`);
  }

  if (profiles.facebook.found) {
    lines.push(`Facebook: ${profiles.facebook.url}`);
  }

  if (profiles.youtube.found) {
    lines.push(`YouTube: ${profiles.youtube.url}`);
  }

  return lines.length > 0 ? lines.join('\n') : 'No social profiles found';
}

/**
 * Check if a company has strong social media presence
 * @param {Object} socialProfiles - Result from extractSocialProfiles
 * @returns {boolean} True if 3+ platforms found
 */
export function hasStrongSocialPresence(socialProfiles) {
  if (!socialProfiles || !socialProfiles.profiles) return false;
  return socialProfiles.profiles.summary.totalFound >= 3;
}
