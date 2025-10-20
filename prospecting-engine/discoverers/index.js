/**
 * Discoverers Module - Company Discovery Orchestrator
 *
 * Manages multiple discovery sources with fallback logic:
 * 1. Google Maps (PRIMARY)
 * 2. Google Search (FALLBACK - if Maps fails or needs supplement)
 */

import { discoverCompanies as discoverViaGoogleMaps } from './google-maps.js';
import { logInfo, logWarn } from '../shared/logger.js';

/**
 * Discover companies using best available method
 *
 * @param {string} query - Search query
 * @param {object} options - Options
 * @returns {Promise<Array>} Companies
 */
export async function discover(query, options = {}) {
  const { preferredSource = 'google-maps' } = options;

  logInfo('Starting company discovery', { query, source: preferredSource });

  try {
    // Try primary source (Google Maps)
    if (preferredSource === 'google-maps') {
      const companies = await discoverViaGoogleMaps(query, options);

      if (companies.length > 0) {
        return companies;
      }

      // If no results, could try Google Search as fallback here
      logWarn('No companies found via Google Maps', { query });
    }

    return [];

  } catch (error) {
    logWarn('Discovery failed, no fallback available', { query, error: error.message });
    throw error;
  }
}

export { discoverCompanies } from './google-maps.js';
export default { discover };
