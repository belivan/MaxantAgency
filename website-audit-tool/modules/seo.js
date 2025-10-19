/**
 * Technical SEO Module
 * Comprehensive SEO audit: sitemap, robots.txt, structured data, alt tags, meta tags, canonicals
 */

/**
 * Run comprehensive SEO audit on a website
 */
export async function runSEOAudit(page, url, sendProgress) {
  sendProgress({
    type: 'step',
    step: 'seo_audit_start',
    message: `⏳ Running technical SEO audit...`,
    url
  });

  const seoResults = {
    sitemap: await checkSitemap(url, sendProgress),
    robotsTxt: await checkRobotsTxt(url, sendProgress),
    structuredData: await checkStructuredData(page, sendProgress),
    imageAltTags: await checkImageAltTags(page, sendProgress),
    metaTags: await checkMetaTags(page, sendProgress),
    canonicalTag: await checkCanonicalTag(page, sendProgress),
    headingHierarchy: await checkHeadingHierarchy(page, sendProgress)
  };

  sendProgress({
    type: 'step',
    step: 'seo_audit_complete',
    message: `✓ SEO audit complete (7 checks performed)`,
    url
  });

  return seoResults;
}

/**
 * Check for sitemap.xml
 */
async function checkSitemap(url, sendProgress) {
  const baseUrl = new URL(url).origin;
  const sitemapUrl = `${baseUrl}/sitemap.xml`;

  try {
    const response = await fetch(sitemapUrl);

    if (response.ok) {
      const text = await response.text();

      // Count URLs in sitemap
      const urlMatches = text.match(/<loc>/g);
      const urlCount = urlMatches ? urlMatches.length : 0;

      return {
        exists: true,
        accessible: true,
        urlCount: urlCount,
        message: `Found at /sitemap.xml (${urlCount} URLs)`
      };
    } else {
      return {
        exists: false,
        accessible: false,
        message: 'Sitemap.xml not found - search engines may struggle to discover all pages'
      };
    }
  } catch (error) {
    return {
      exists: false,
      accessible: false,
      message: 'Sitemap.xml not found or inaccessible'
    };
  }
}

/**
 * Check for robots.txt
 */
async function checkRobotsTxt(url, sendProgress) {
  const baseUrl = new URL(url).origin;
  const robotsUrl = `${baseUrl}/robots.txt`;

  try {
    const response = await fetch(robotsUrl);

    if (response.ok) {
      const text = await response.text();

      // Check if it's blocking important pages
      const hasDisallows = text.includes('Disallow:');
      const blockingAll = text.includes('Disallow: /');

      return {
        exists: true,
        accessible: true,
        hasDisallows: hasDisallows,
        blockingAll: blockingAll,
        message: blockingAll
          ? 'Found but blocking ALL pages - this prevents search engine indexing!'
          : hasDisallows
          ? 'Found with crawling directives'
          : 'Found with no restrictions'
      };
    } else {
      return {
        exists: false,
        accessible: false,
        message: 'Robots.txt not found - search engines have no crawling guidance'
      };
    }
  } catch (error) {
    return {
      exists: false,
      accessible: false,
      message: 'Robots.txt not found or inaccessible'
    };
  }
}

/**
 * Check for structured data (Schema.org)
 */
async function checkStructuredData(page, sendProgress) {
  try {
    // Check for JSON-LD structured data
    const jsonLdScripts = await page.$$eval('script[type="application/ld+json"]', scripts => {
      return scripts.map(script => {
        try {
          return JSON.parse(script.textContent);
        } catch {
          return null;
        }
      }).filter(Boolean);
    });

    // Check for microdata
    const hasMicrodata = await page.$('[itemscope]') !== null;

    const hasStructuredData = jsonLdScripts.length > 0 || hasMicrodata;

    if (hasStructuredData) {
      const types = jsonLdScripts.map(data => data['@type']).filter(Boolean);
      return {
        exists: true,
        format: jsonLdScripts.length > 0 ? 'JSON-LD' : 'Microdata',
        types: types,
        count: jsonLdScripts.length,
        message: `Found Schema.org ${types.join(', ')} markup`
      };
    } else {
      return {
        exists: false,
        message: 'No structured data found - missing rich snippets in search results'
      };
    }
  } catch (error) {
    return {
      exists: false,
      message: 'Unable to check structured data'
    };
  }
}

/**
 * Check image alt tags
 */
async function checkImageAltTags(page, sendProgress) {
  try {
    const imageStats = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const total = images.length;
      const withAlt = images.filter(img => img.alt && img.alt.trim().length > 0).length;
      const missingAlt = total - withAlt;

      return { total, withAlt, missingAlt };
    });

    const { total, withAlt, missingAlt } = imageStats;

    if (total === 0) {
      return {
        total: 0,
        withAlt: 0,
        missingAlt: 0,
        percentage: 100,
        message: 'No images found on page'
      };
    }

    const percentageMissing = Math.round((missingAlt / total) * 100);

    return {
      total,
      withAlt,
      missingAlt,
      percentage: percentageMissing,
      message: percentageMissing > 0
        ? `${missingAlt} of ${total} images (${percentageMissing}%) missing alt tags - hurts accessibility and SEO`
        : `All ${total} images have alt tags`
    };
  } catch (error) {
    return {
      total: 0,
      withAlt: 0,
      missingAlt: 0,
      percentage: 0,
      message: 'Unable to check image alt tags'
    };
  }
}

/**
 * Check meta tags (Open Graph, Twitter Cards)
 */
async function checkMetaTags(page, sendProgress) {
  try {
    const metaTagsFound = await page.evaluate(() => {
      const hasOG = !!document.querySelector('meta[property^="og:"]');
      const hasTwitter = !!document.querySelector('meta[name^="twitter:"]');

      return { hasOG, hasTwitter };
    });

    const { hasOG, hasTwitter } = metaTagsFound;

    const issues = [];
    if (!hasOG) issues.push('Open Graph tags');
    if (!hasTwitter) issues.push('Twitter Cards');

    return {
      hasOpenGraph: hasOG,
      hasTwitterCards: hasTwitter,
      message: issues.length === 0
        ? 'Open Graph and Twitter Cards present for social sharing'
        : `Missing ${issues.join(' and ')} - poor social media sharing appearance`
    };
  } catch (error) {
    return {
      hasOpenGraph: false,
      hasTwitterCards: false,
      message: 'Unable to check meta tags'
    };
  }
}

/**
 * Check canonical tag
 */
async function checkCanonicalTag(page, sendProgress) {
  try {
    const canonicalUrl = await page.evaluate(() => {
      const link = document.querySelector('link[rel="canonical"]');
      return link ? link.href : null;
    });

    return {
      exists: !!canonicalUrl,
      url: canonicalUrl,
      message: canonicalUrl
        ? `Canonical tag present: ${canonicalUrl}`
        : 'Missing canonical tag - risk of duplicate content penalties'
    };
  } catch (error) {
    return {
      exists: false,
      message: 'Unable to check canonical tag'
    };
  }
}

/**
 * Check heading hierarchy (H1 → H2 → H3)
 */
async function checkHeadingHierarchy(page, sendProgress) {
  try {
    const headingAnalysis = await page.evaluate(() => {
      const h1s = document.querySelectorAll('h1');
      const h2s = document.querySelectorAll('h2');
      const h3s = document.querySelectorAll('h3');

      return {
        h1Count: h1s.length,
        h2Count: h2s.length,
        h3Count: h3s.length
      };
    });

    const { h1Count, h2Count, h3Count } = headingAnalysis;

    const issues = [];
    if (h1Count === 0) issues.push('No H1 tag found');
    if (h1Count > 1) issues.push(`Multiple H1 tags (${h1Count}) - should only have one`);

    return {
      h1Count,
      h2Count,
      h3Count,
      hasIssues: issues.length > 0,
      message: issues.length === 0
        ? `Proper heading structure (${h1Count} H1, ${h2Count} H2, ${h3Count} H3)`
        : issues.join('; ')
    };
  } catch (error) {
    return {
      h1Count: 0,
      h2Count: 0,
      h3Count: 0,
      hasIssues: true,
      message: 'Unable to check heading hierarchy'
    };
  }
}

/**
 * Format SEO results for AI prompt
 */
export function formatSEOResultsForAI(seoResults) {
  return `
TECHNICAL SEO AUDIT RESULTS:
${seoResults.sitemap.exists ? '✓' : '✗'} Sitemap: ${seoResults.sitemap.message}
${seoResults.robotsTxt.exists ? '✓' : '✗'} Robots.txt: ${seoResults.robotsTxt.message}
${seoResults.structuredData.exists ? '✓' : '✗'} Structured Data: ${seoResults.structuredData.message}
${seoResults.imageAltTags.percentage === 0 ? '✓' : '✗'} Image Alt Tags: ${seoResults.imageAltTags.message}
${seoResults.metaTags.hasOpenGraph && seoResults.metaTags.hasTwitterCards ? '✓' : '✗'} Social Meta Tags: ${seoResults.metaTags.message}
${seoResults.canonicalTag.exists ? '✓' : '✗'} Canonical Tag: ${seoResults.canonicalTag.message}
${!seoResults.headingHierarchy.hasIssues ? '✓' : '✗'} Heading Hierarchy: ${seoResults.headingHierarchy.message}
`.trim();
}
