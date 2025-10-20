import { Client } from '@googlemaps/google-maps-services-js';
import dotenv from 'dotenv';
import { logInfo, logError, logApiRequest, logApiResponse } from '../shared/logger.js';
import { costTracker } from '../shared/cost-tracker.js';

dotenv.config();

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
    language = 'en'
  } = options;

  logInfo('Starting Google Maps discovery', { query, minRating, maxResults });
  logApiRequest('Google Maps Places API', 'textSearch', { query });

  try {
    // Step 1: Text search to find places
    const response = await client.textSearch({
      params: {
        query,
        key: apiKey,
        language
      },
      timeout: 10000
    });

    const duration = Date.now() - startTime;
    logApiResponse('Google Maps Places API', response.status, duration, {
      results: response.data.results.length
    });

    // Track cost
    costTracker.trackGoogleMaps(1);

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    if (response.data.results.length === 0) {
      logInfo('No results found for query', { query });
      return [];
    }

    // Step 2: Process and filter results
    const companies = [];
    let processed = 0;

    for (const place of response.data.results) {
      if (companies.length >= maxResults) {
        break;
      }

      // Filter by rating
      if (place.rating && place.rating < minRating) {
        continue;
      }

      // Extract company data
      const company = await extractCompanyData(place);

      if (company) {
        companies.push(company);
        processed++;

        logInfo('Company discovered', {
          name: company.name,
          rating: company.rating,
          city: company.city
        });
      }
    }

    logInfo('Google Maps discovery complete', {
      query,
      found: companies.length,
      processed,
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
 *
 * @param {object} place - Google Places result object
 * @returns {Promise<object>} Company object
 */
async function extractCompanyData(place) {
  try {
    // Get place details for more info (website, phone, etc.)
    const details = await getPlaceDetails(place.place_id);

    // Parse address components
    const addressComponents = parseAddressComponents(
      place.address_components || details.address_components || []
    );

    // Determine industry from types
    const industry = determineIndustry(place.types || []);

    return {
      name: place.name,
      website: details.website || null,
      phone: details.formatted_phone_number || place.formatted_phone_number || null,
      address: place.formatted_address || details.formatted_address || null,
      city: addressComponents.city,
      state: addressComponents.state,
      rating: place.rating || null,
      reviewCount: place.user_ratings_total || null,
      googlePlaceId: place.place_id,
      types: place.types || [],
      industry: industry,
      location: place.geometry?.location || null,
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
        fields: ['website', 'formatted_phone_number', 'address_components', 'opening_hours'],
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
