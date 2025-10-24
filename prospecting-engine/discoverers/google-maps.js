import { Client } from '@googlemaps/google-maps-services-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logInfo, logError, logApiRequest, logApiResponse } from '../shared/logger.js';
import { costTracker } from '../shared/cost-tracker.js';
import { prospectExists, prospectExistsInProject } from '../database/supabase-client.js';
import { validateWebsiteUrl } from '../shared/url-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const client = new Client({});
const apiKey = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Discover companies using Google Maps Places API
 *
 * This is the PRIMARY discovery method. It searches Google Maps for businesses
 * matching the query and returns real, verified companies with rich data.
 *
 * @param {string} query - Search query (e.g., "restaurants in Philadelphia, PA")
 * @param {object} options - Configuration options
 * @returns {Promise<Array>} Array of company objects
 *
 * @example
 * const companies = await discoverCompanies('plumbers in Philadelphia', {
 *   minRating: 4.0,
 *   maxResults: 20
 * });
 */
export async function discoverCompanies(query, options = {}) {
  const startTime = Date.now();

  // Validate API key
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY not set in environment variables');
  }

  // Default options
  const {
    minRating = parseFloat(process.env.DEFAULT_MIN_RATING) || 3.5,
    maxResults = 20,
    radius = 50000, // 50km
    language = 'en',
    projectId = null // For smart duplicate filtering
  } = options;

  logInfo('Starting Google Maps discovery', {
    query,
    minRating,
    maxResults,
    projectId: projectId || 'none'
  });
  logApiRequest('Google Maps Places API', 'textSearch', { query });

  try {
    const companies = [];
    let pageToken = null;
    let totalProcessed = 0;
    let pageCount = 0;
    const maxPages = 3; // Google limits to 60 results (3 pages × 20)

    // Keep fetching pages until we have enough companies
    while (companies.length < maxResults && pageCount < maxPages) {
      pageCount++;

      // Step 1: Text search to find places (with pagination)
      const searchParams = {
        query,
        key: apiKey,
        language
      };

      if (pageToken) {
        searchParams.pagetoken = pageToken;
      }

      const response = await client.textSearch({
        params: searchParams,
        timeout: 10000
      });

      const duration = Date.now() - startTime;
      logApiResponse('Google Maps Places API', response.status, duration, {
        results: response.data.results.length,
        page: pageCount
      });

      // Track cost
      costTracker.trackGoogleMaps(1);

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      if (response.data.results.length === 0) {
        logInfo('No more results found', { query, page: pageCount });
        break;
      }

      // Step 2: Process results from this page
      for (const place of response.data.results) {
        // Stop if we have enough NEW companies
        if (companies.length >= maxResults) {
          break;
        }

        // Filter by rating
        if (place.rating && place.rating < minRating) {
          continue;
        }

        // Skip if already in this project (smart duplicate filtering)
        if (projectId && place.place_id) {
          const existsInProject = await prospectExistsInProject(place.place_id, projectId);
          if (existsInProject) {
            logInfo('Skipping duplicate (already in project)', {
              name: place.name,
              projectId,
              page: pageCount
            });
            continue; // Skip this one, keep searching for NEW prospects
          }
        }

        // Extract company data
        const company = await extractCompanyData(place);

        if (company) {
          companies.push(company);
          totalProcessed++;

          logInfo('Company discovered (NEW)', {
            name: company.name,
            rating: company.rating,
            city: company.city,
            page: pageCount
          });
        }
      }

      // Check for next page token
      pageToken = response.data.next_page_token;

      // If we have enough companies or no more pages, stop
      if (companies.length >= maxResults || !pageToken) {
        break;
      }

      // Google requires a short delay before using next_page_token
      if (pageToken) {
        logInfo('Fetching next page of results...', {
          currentCount: companies.length,
          target: maxResults,
          page: pageCount + 1
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    logInfo('Google Maps discovery complete', {
      query,
      found: companies.length,
      totalProcessed,
      pagesSearched: pageCount,
      duration_ms: Date.now() - startTime
    });

    return companies;

  } catch (error) {
    logError('Google Maps discovery failed', error, { query });
    throw error;
  }
}

/**
 * Extract company data from Google Places result
 * Uses cached data from database if available to avoid duplicate API calls
 *
 * @param {object} place - Google Places result object
 * @returns {Promise<object>} Company object
 */
async function extractCompanyData(place) {
  try {
    // Check if we already have this prospect in our database (smart caching)
    const cachedProspect = await prospectExists(place.place_id);

    let details = {};

    if (cachedProspect) {
      // Reuse cached data - no API call needed! 💰
      logInfo('Using cached prospect data (0 API calls)', {
        company: cachedProspect.company_name,
        placeId: place.place_id
      });

      // Convert cached prospect back to company format
      return {
        name: cachedProspect.company_name,
        website: cachedProspect.website,
        phone: cachedProspect.contact_phone,
        address: cachedProspect.address,
        city: cachedProspect.city,
        state: cachedProspect.state,
        rating: place.rating || cachedProspect.google_rating,
        reviewCount: place.user_ratings_total || cachedProspect.google_review_count,
        mostRecentReviewDate: cachedProspect.most_recent_review_date,  // From cache
        googlePlaceId: place.place_id,
        types: place.types || [],
        industry: cachedProspect.industry,
        location: place.geometry?.location || null,
        source: 'database-cache' // Mark as cached
      };
    } else {
      // Not in cache - fetch from Google API
      details = await getPlaceDetails(place.place_id);
    }

    // Parse address components
    const addressComponents = parseAddressComponents(
      place.address_components || details.address_components || []
    );

    // Determine industry from types
    const industry = determineIndustry(place.types || []);

    // Validate website URL (Google Maps sometimes returns social URLs as website)
    const websiteValidation = validateWebsiteUrl(details.website);
    const initialSocialProfiles = {};

    // If Google returned a social URL as website, track it for social_profiles later
    if (websiteValidation.socialProfile) {
      logInfo('Google Maps returned social URL as website, will move to social_profiles', {
        company: place.name,
        platform: websiteValidation.socialProfile.platform
      });
      initialSocialProfiles[websiteValidation.socialProfile.platform] = websiteValidation.socialProfile.url;
    }

    // Extract most recent review date
    const mostRecentReviewDate = getMostRecentReviewDate(details.reviews);

    return {
      name: place.name,
      website: websiteValidation.website,  // null if it was a social URL
      phone: details.formatted_phone_number || place.formatted_phone_number || null,
      address: place.formatted_address || details.formatted_address || null,
      city: addressComponents.city,
      state: addressComponents.state,
      rating: place.rating || null,
      reviewCount: place.user_ratings_total || null,
      mostRecentReviewDate: mostRecentReviewDate,  // NEW: Most recent review timestamp
      googlePlaceId: place.place_id,
      types: place.types || [],
      industry: industry,
      location: place.geometry?.location || null,
      social_profiles_from_google: initialSocialProfiles,  // Social URLs from Google
      source: 'google-maps'
    };
  } catch (error) {
    logError('Failed to extract company data', error, { place_id: place.place_id });
    return null;
  }
}

/**
 * Get detailed place information
 *
 * @param {string} placeId - Google Place ID
 * @returns {Promise<object>} Place details
 */
async function getPlaceDetails(placeId) {
  try {
    logApiRequest('Google Maps Places API', 'placeDetails', { placeId });

    const response = await client.placeDetails({
      params: {
        place_id: placeId,
        fields: ['website', 'formatted_phone_number', 'address_components', 'opening_hours', 'reviews'],
        key: apiKey
      },
      timeout: 10000
    });

    // Track cost (place details is a separate billable request)
    costTracker.trackGoogleMaps(1);

    if (response.data.status === 'OK') {
      return response.data.result;
    }

    return {};
  } catch (error) {
    logError('Failed to get place details', error, { placeId });
    return {};
  }
}

/**
 * Parse address components to extract city, state, etc.
 *
 * @param {Array} components - Address components from Google
 * @returns {object} Parsed address data
 */
function parseAddressComponents(components) {
  const address = {
    city: null,
    state: null,
    country: null,
    zipCode: null
  };

  components.forEach(component => {
    if (component.types.includes('locality')) {
      address.city = component.long_name;
    } else if (component.types.includes('administrative_area_level_1')) {
      address.state = component.short_name; // Use short name for state code
    } else if (component.types.includes('country')) {
      address.country = component.short_name;
    } else if (component.types.includes('postal_code')) {
      address.zipCode = component.long_name;
    }
  });

  return address;
}

/**
 * Extract the most recent review date from reviews array
 *
 * @param {Array} reviews - Reviews from Google Place Details
 * @returns {string|null} ISO timestamp of most recent review, or null
 */
function getMostRecentReviewDate(reviews) {
  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
    return null;
  }

  // Google reviews have a 'time' field (Unix timestamp)
  const mostRecentTime = Math.max(...reviews.map(r => r.time || 0));

  if (mostRecentTime === 0) {
    return null;
  }

  // Convert Unix timestamp to ISO string
  return new Date(mostRecentTime * 1000).toISOString();
}

/**
 * Determine industry from Google place types
 *
 * @param {Array} types - Place types from Google
 * @returns {string} Industry name
 */
function determineIndustry(types) {
  // Map Google types to industry categories
  const industryMap = {
    'restaurant': 'Restaurant',
    'food': 'Restaurant',
    'cafe': 'Cafe',
    'bar': 'Bar',
    'plumber': 'Plumbing',
    'electrician': 'Electrical',
    'lawyer': 'Legal Services',
    'doctor': 'Medical Practice',
    'dentist': 'Dental Practice',
    'car_repair': 'Auto Repair',
    'hair_care': 'Hair Salon',
    'beauty_salon': 'Beauty Salon',
    'gym': 'Fitness',
    'spa': 'Spa & Wellness',
    'home_goods_store': 'Home Services',
    'roofing_contractor': 'Roofing',
    'general_contractor': 'Construction',
    'real_estate_agency': 'Real Estate',
    'insurance_agency': 'Insurance',
    'accounting': 'Accounting',
    'moving_company': 'Moving Services',
    'locksmith': 'Locksmith',
    'pet_store': 'Pet Services',
    'veterinary_care': 'Veterinary',
    'car_wash': 'Car Wash',
    'storage': 'Storage',
    'taxi_service': 'Transportation',
    'travel_agency': 'Travel Agency',
    'hotel': 'Hospitality',
    'laundry': 'Laundry Services',
    'florist': 'Florist',
    'bakery': 'Bakery',
    'hardware_store': 'Hardware Store',
    'furniture_store': 'Furniture Store',
    'clothing_store': 'Retail',
    'store': 'Retail'
  };

  // Find first matching type
  for (const type of types) {
    if (industryMap[type]) {
      return industryMap[type];
    }
  }

  // Default to first type, capitalized
  if (types.length > 0) {
    return types[0].split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  return 'Business';
}

/**
 * Search for companies near a location
 *
 * @param {object} location - { lat, lng }
 * @param {string} type - Business type
 * @param {object} options - Options
 * @returns {Promise<Array>} Companies
 */
export async function discoverNearby(location, type, options = {}) {
  const startTime = Date.now();

  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY not set in environment variables');
  }

  const {
    minRating = 3.5,
    maxResults = 20,
    radius = 50000
  } = options;

  logInfo('Starting Google Maps nearby search', { location, type, radius });

  try {
    const response = await client.placesNearby({
      params: {
        location,
        radius,
        type,
        key: apiKey
      },
      timeout: 10000
    });

    costTracker.trackGoogleMaps(1);

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const companies = [];
    for (const place of response.data.results) {
      if (companies.length >= maxResults) break;
      if (place.rating && place.rating < minRating) continue;

      const company = await extractCompanyData(place);
      if (company) companies.push(company);
    }

    logInfo('Nearby search complete', {
      found: companies.length,
      duration_ms: Date.now() - startTime
    });

    return companies;

  } catch (error) {
    logError('Nearby search failed', error, { location, type });
    throw error;
  }
}

export default { discoverCompanies, discoverNearby };
