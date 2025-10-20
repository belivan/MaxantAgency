import fetch from 'node-fetch';
import { logInfo, logWarn, logDebug } from '../shared/logger.js';

/**
 * Verify that a website URL is accessible
 *
 * Checks if the URL loads without errors. This helps filter out:
 * - Dead links
 * - Expired domains
 * - SSL errors
 * - Parking pages
 * - Timeouts
 *
 * @param {string} url - Website URL to verify
 * @param {object} options - Verification options
 * @returns {Promise<object>} Verification result
 */
export async function verifyWebsite(url, options = {}) {
  const {
    timeout = parseInt(process.env.DEFAULT_TIMEOUT) || 10000,
    followRedirects = true,
    checkParkingPages = true
  } = options;

  if (!url) {
    return {
      status: 'no_website',
      accessible: false,
      message: 'No URL provided'
    };
  }

  // Normalize URL
  let normalizedUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    normalizedUrl = `https://${url}`;
  }

  logDebug('Verifying website', { url: normalizedUrl });

  try {
    // Create URL object to validate format
    const urlObj = new URL(normalizedUrl);

    // Perform HTTP request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(normalizedUrl, {
      method: 'GET',
      signal: controller.signal,
      redirect: followRedirects ? 'follow' : 'manual',
      headers: {
        'User-Agent': 'ProspectingEngine/2.0 (Business Discovery Bot)'
      }
    });

    clearTimeout(timeoutId);

    // Check if response is OK
    if (!response.ok && response.status !== 405) {
      // 405 = Method Not Allowed (some sites block GET but are still valid)
      return {
        status: 'not_found',
        accessible: false,
        httpStatus: response.status,
        message: `HTTP ${response.status}`
      };
    }

    // Check for parking pages
    if (checkParkingPages) {
      const parkingCheck = await checkForParkingPage(response, normalizedUrl);
      if (parkingCheck.isParking) {
        logWarn('Parking page detected', { url: normalizedUrl, reason: parkingCheck.reason });
        return {
          status: 'parking_page',
          accessible: false,
          message: parkingCheck.reason
        };
      }
    }

    // Success!
    logInfo('Website verified', { url: normalizedUrl, status: response.status });

    return {
      status: 'active',
      accessible: true,
      httpStatus: response.status,
      finalUrl: response.url,
      message: 'Website is accessible'
    };

  } catch (error) {
    // Determine error type
    let status = 'error';
    let message = error.message;

    if (error.name === 'AbortError') {
      status = 'timeout';
      message = 'Request timed out';
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      status = 'not_found';
      message = 'Domain not found';
    } else if (error.message.includes('certificate') || error.message.includes('SSL')) {
      status = 'ssl_error';
      message = 'SSL certificate error';
    }

    logWarn('Website verification failed', { url: normalizedUrl, status, error: message });

    return {
      status,
      accessible: false,
      message
    };
  }
}

/**
 * Check if a URL redirects to a parking page
 *
 * Parking pages are placeholder sites shown when a domain is:
 * - For sale
 * - Expired
 * - Not configured
 * - Parked by registrar
 *
 * @param {Response} response - Fetch response object
 * @param {string} originalUrl - Original URL
 * @returns {Promise<object>} Parking page check result
 */
async function checkForParkingPage(response, originalUrl) {
  try {
    const finalUrl = response.url.toLowerCase();

    // Check if redirected to known parking domains
    const parkingDomains = [
      'godaddy.com',
      'secureserver.net',
      'parklogic.com',
      'parkingcrew.net',
      'sedoparking.com',
      'bodis.com',
      'parkweb.co',
      'afternic.com',
      'dan.com',
      'namecheap.com/parking',
      'hugedomains.com',
      'buy.com',
      'domainmarket.com',
      'sedo.com'
    ];

    // Check if final URL contains any parking domain
    if (parkingDomains.some(domain => finalUrl.includes(domain))) {
      return {
        isParking: true,
        reason: `Redirected to parking domain: ${finalUrl}`
      };
    }

    // Get page content to check for parking indicators
    const html = await response.text();
    const htmlLower = html.toLowerCase();

    // Common parking page text indicators
    const parkingIndicators = [
      'this domain may be for sale',
      'this domain is for sale',
      'buy this domain',
      'domain is parked',
      'parked free',
      'this page is parked',
      'coming soon',
      'under construction',
      'domain forwarding',
      'domain parking',
      'this domain has been registered',
      'renew this domain',
      'expired domain',
      'hugedomains.com',
      'sedo domain parking',
      'godaddy.com/domainsearch',
      'this web page is parked'
    ];

    // Count matching indicators
    const matchingIndicators = parkingIndicators.filter(indicator =>
      htmlLower.includes(indicator)
    );

    // If 2 or more indicators found, likely a parking page
    if (matchingIndicators.length >= 2) {
      return {
        isParking: true,
        reason: `Parking page indicators found: ${matchingIndicators.slice(0, 3).join(', ')}`
      };
    }

    // Not a parking page
    return {
      isParking: false,
      reason: null
    };

  } catch (error) {
    // If we can't read the page, assume it's not a parking page
    logDebug('Could not check for parking page', { error: error.message });
    return {
      isParking: false,
      reason: null
    };
  }
}

/**
 * Verify multiple websites in batch
 *
 * @param {Array<string>} urls - Array of URLs to verify
 * @param {object} options - Verification options
 * @returns {Promise<Array>} Array of verification results
 */
export async function verifyBatch(urls, options = {}) {
  const { maxConcurrent = 5 } = options;

  logInfo('Starting batch verification', { count: urls.length });

  const results = [];
  const batches = [];

  // Split into batches
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    batches.push(urls.slice(i, i + maxConcurrent));
  }

  // Process each batch
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(url => verifyWebsite(url, options))
    );
    results.push(...batchResults);
  }

  const accessible = results.filter(r => r.accessible).length;
  logInfo('Batch verification complete', {
    total: urls.length,
    accessible,
    failed: urls.length - accessible
  });

  return results;
}

export default { verifyWebsite, verifyBatch };
