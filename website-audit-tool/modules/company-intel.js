/**
 * Company Intelligence Module
 * Extracts company name, founding year, location, and basic business info
 */

/**
 * Extract company name from page
 * @param {Page} page - Playwright page instance
 * @param {string} url - Current page URL
 * @returns {Object} Company information
 */
export async function extractCompanyInfo(page, url) {
  try {
    const result = await page.evaluate(() => {
      const company = {
        name: null,
        foundingYear: null,
        location: null,
        description: null,
        confidence: 0
      };

      // Method 1: Structured Data (JSON-LD) - HIGHEST CONFIDENCE
      const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of jsonLdScripts) {
        try {
          const data = JSON.parse(script.textContent);
          const items = Array.isArray(data) ? data : [data];

          for (const item of items) {
            if (item['@type'] && (item['@type'] === 'Organization' || item['@type'] === 'LocalBusiness')) {
              if (item.name && !company.name) {
                company.name = item.name;
                company.confidence = 95;
              }
              if (item.foundingDate && !company.foundingYear) {
                company.foundingYear = item.foundingDate.substring(0, 4);
              }
              if (item.address && !company.location) {
                const addr = item.address;
                if (typeof addr === 'string') {
                  company.location = addr;
                } else if (addr.addressLocality) {
                  company.location = `${addr.addressLocality}, ${addr.addressRegion || addr.addressCountry || ''}`.trim();
                }
              }
              if (item.description && !company.description) {
                company.description = item.description.substring(0, 300);
              }
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }

      // Method 2: Meta tags (og:site_name, twitter:site) - HIGH CONFIDENCE
      if (!company.name) {
        const ogSiteName = document.querySelector('meta[property="og:site_name"]');
        const twitterSite = document.querySelector('meta[name="twitter:site"]');

        if (ogSiteName && ogSiteName.content) {
          company.name = ogSiteName.content.trim();
          company.confidence = 85;
        } else if (twitterSite && twitterSite.content) {
          // Remove @ symbol if present
          company.name = twitterSite.content.replace('@', '').trim();
          company.confidence = 80;
        }
      }

      // Method 3: Page Title - MEDIUM CONFIDENCE (but filter SEO spam)
      if (!company.name) {
        const title = document.title || '';

        // SEO spam keywords to avoid
        const seoKeywords = /\b(top|best|leading|premier|professional|affordable|cheap|expert|#1|number one|award.?winning)\b/i;

        // Common patterns: "Company Name | Tagline" or "Company Name - Product"
        const titleParts = title.split(/[|\-–—]/);
        if (titleParts.length > 0) {
          const firstPart = titleParts[0].trim();

          // Skip if it's clearly SEO spam
          const isSeoSpam = seoKeywords.test(firstPart) ||
                           firstPart.length > 50 || // Too long
                           firstPart.split(' ').length > 8; // Too many words

          // Remove common words like "Home", "Welcome", etc.
          if (firstPart &&
              !firstPart.toLowerCase().match(/^(home|welcome|about|contact)$/) &&
              !isSeoSpam) {
            company.name = firstPart;
            company.confidence = 70;
          }
        }
      }

      // Method 4: Logo alt text - MEDIUM CONFIDENCE
      if (!company.name) {
        const logo = document.querySelector('img[alt*="logo" i], .logo img, header img, .site-logo img, .navbar-brand img');
        if (logo && logo.alt) {
          const altText = logo.alt.replace(/logo/i, '').replace(/\|.*/,'').trim();
          if (altText.length > 2 && altText.length < 50) {
            company.name = altText;
            company.confidence = 65;
          }
        }
      }

      // Method 5: Site header text / brand name
      if (!company.name) {
        const brandSelectors = [
          '.site-title',
          '.site-name',
          '.brand-name',
          '.navbar-brand',
          'header .logo',
          '[class*="site-title"]',
          '[class*="brand"]'
        ];

        for (const selector of brandSelectors) {
          const brandEl = document.querySelector(selector);
          if (brandEl) {
            const brandText = brandEl.innerText.trim();
            if (brandText && brandText.length > 2 && brandText.length < 50 && !brandText.includes('\n')) {
              company.name = brandText;
              company.confidence = 60;
              break;
            }
          }
        }
      }

      // Method 6: Footer copyright - LOWER CONFIDENCE
      if (!company.name) {
        const footer = document.querySelector('footer');
        if (footer) {
          const footerText = footer.innerText || '';
          // Look for "© 2024 Company Name" or "Copyright Company Name"
          const copyrightMatch = footerText.match(/©\s*\d{4}\s+([A-Z][a-zA-Z\s&]{2,40})/);
          if (copyrightMatch) {
            company.name = copyrightMatch[1].trim();
            company.confidence = 50;
          } else {
            const copyrightMatch2 = footerText.match(/Copyright\s+(?:\d{4}\s+)?([A-Z][a-zA-Z\s&]{2,40})/i);
            if (copyrightMatch2) {
              company.name = copyrightMatch2[1].trim();
              company.confidence = 50;
            }
          }
        }
      }

      // Method 7: H1 on homepage - LOWER CONFIDENCE
      if (!company.name) {
        const h1 = document.querySelector('h1');
        if (h1) {
          const h1Text = h1.innerText.trim();
          // If it's short and looks like a company name (not a sentence)
          if (h1Text.length > 2 && h1Text.length < 40 && !h1Text.includes('.') && h1Text.split(' ').length <= 5) {
            company.name = h1Text;
            company.confidence = 40;
          }
        }
      }

      // Method 8: Extract from domain - FALLBACK (but prefer over SEO spam title)
      // If confidence is low (title was SEO spam), use domain name instead
      if (!company.name) {
        const hostname = window.location.hostname;
        const domainParts = hostname.replace('www.', '').split('.');
        if (domainParts.length > 0) {
          // Capitalize first letter of each word
          const domainName = domainParts[0]
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          company.name = domainName;
          company.confidence = 30;
        }
      }

      // Extract founding year if not found yet
      if (!company.foundingYear) {
        const bodyText = document.body.innerText || '';
        const foundedMatch = bodyText.match(/(?:Founded|Established|Since)\s+(?:in\s+)?(\d{4})/i);
        if (foundedMatch) {
          company.foundingYear = foundedMatch[1];
        }
      }

      // Extract location if not found yet
      if (!company.location) {
        const bodyText = document.body.innerText || '';
        // Look for "Based in City, State" or "Located in City"
        const locationMatch = bodyText.match(/(?:Based|Located)\s+in\s+([A-Z][a-zA-Z\s,]{3,50})/);
        if (locationMatch) {
          company.location = locationMatch[1].trim();
        }
      }

      return company;
    });

    // Clean up the company name
    if (result.name) {
      result.name = result.name
        .replace(/\s+/g, ' ')
        .replace(/[|\-–—].*$/, '') // Remove everything after pipes or dashes
        .trim();
    }

    result.url = url;
    result.extractedAt = new Date().toISOString();

    return result;

  } catch (error) {
    console.error('Company info extraction error:', error);

    // Fallback to domain name
    try {
      const hostname = new URL(url).hostname;
      const domainParts = hostname.replace('www.', '').split('.');
      const domainName = domainParts[0]
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return {
        url,
        name: domainName,
        foundingYear: null,
        location: null,
        description: null,
        confidence: 30,
        extractedAt: new Date().toISOString(),
        error: error.message
      };
    } catch (e) {
      return {
        url,
        name: 'Unknown Company',
        foundingYear: null,
        location: null,
        description: null,
        confidence: 0,
        extractedAt: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

/**
 * Format company info for display
 * @param {Object} companyInfo - Result from extractCompanyInfo
 * @returns {string} Formatted string
 */
export function formatCompanyInfo(companyInfo) {
  if (!companyInfo) return 'No company information found';

  const lines = [];

  lines.push(`Company: ${companyInfo.name} (confidence: ${companyInfo.confidence}%)`);

  if (companyInfo.foundingYear) {
    lines.push(`Founded: ${companyInfo.foundingYear}`);
  }

  if (companyInfo.location) {
    lines.push(`Location: ${companyInfo.location}`);
  }

  if (companyInfo.description) {
    lines.push(`Description: ${companyInfo.description}`);
  }

  return lines.join('\n');
}
