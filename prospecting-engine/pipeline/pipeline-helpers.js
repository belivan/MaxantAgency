/**
 * Pipeline Helper Functions
 *
 * Extracted from orchestrator.js for reusability between
 * runProspectingPipeline and lookupSingleBusiness.
 */

import { logInfo, logError } from '../shared/logger.js';

/**
 * Build the base prospect data object from company and extracted data
 *
 * @param {object} company - Company data from Google Maps discovery
 * @param {string} websiteStatus - Website verification status
 * @param {object} extractedData - Data extracted from website (may be null)
 * @param {object} socialProfiles - Social profile URLs (may be empty)
 * @param {object} socialMetadata - Social metadata (may be empty)
 * @param {object} crawlErrorDetails - Crawl error details (may be null)
 * @returns {object} Base prospect data object
 */
export function buildProspectData(
  company,
  websiteStatus,
  extractedData,
  socialProfiles,
  socialMetadata,
  crawlErrorDetails
) {
  return {
    company_name: company.name,
    industry: company.industry,
    website: company.website,
    website_status: websiteStatus,
    crawl_error_details: crawlErrorDetails,
    city: company.city,
    state: company.state,
    address: company.address,
    contact_phone: company.phone,
    contact_email: extractedData?.contact_email || null,
    contact_name: extractedData?.contact_name || null,
    description: extractedData?.description || null,
    services: extractedData?.services || null,
    google_place_id: company.googlePlaceId,
    google_rating: company.rating,
    google_review_count: company.reviewCount,
    most_recent_review_date: company.mostRecentReviewDate,
    social_profiles: socialProfiles,
    social_metadata: socialMetadata,
    business_intelligence: extractedData?.business_intelligence || null
  };
}

/**
 * Calculate days since the last review
 *
 * @param {string} mostRecentReviewDate - ISO date string of last review
 * @param {string} companyName - Company name for logging
 * @returns {number|null} Days since last review, or null if unavailable
 */
export function calculateDaysSinceReview(mostRecentReviewDate, companyName = '') {
  if (!mostRecentReviewDate) return null;

  try {
    const lastReviewDate = new Date(mostRecentReviewDate);
    const now = Date.now();
    return Math.floor((now - lastReviewDate) / (1000 * 60 * 60 * 24));
  } catch (error) {
    logError('Failed to parse review date', error, {
      company: companyName,
      date: mostRecentReviewDate
    });
    return null;
  }
}

/**
 * Check if a prospect should be filtered out as inactive/closed
 *
 * Returns filter result with reason if should be filtered, null if should keep.
 *
 * @param {string} websiteStatus - Website verification status
 * @param {number|null} daysSinceLastReview - Days since last review
 * @param {number|null} rating - Google rating
 * @returns {object|null} Filter result {reason, filter} or null if should keep
 */
export function shouldFilterAsInactive(websiteStatus, daysSinceLastReview, rating) {
  // FILTER 1: Broken website + No recent activity = Likely closed
  // A broken website with no reviews in 180+ days suggests the business is no longer operating
  if (
    ['ssl_error', 'timeout', 'not_found'].includes(websiteStatus) &&
    (daysSinceLastReview === null || daysSinceLastReview > 180)
  ) {
    return {
      filter: 'broken_site_inactive',
      reason: 'Likely out of business - broken website with no activity'
    };
  }

  // FILTER 2: No website + No recent activity + Low rating
  // No website, no recent customer engagement, and poor rating = not a viable prospect
  if (
    websiteStatus === 'no_website' &&
    (daysSinceLastReview === null || daysSinceLastReview > 180) &&
    (rating === null || rating < 3.5)
  ) {
    return {
      filter: 'no_website_inactive_low_rating',
      reason: 'Not viable - no website, no activity, poor reputation'
    };
  }

  // FILTER 3: Parking page = Domain for sale
  // Parking pages indicate the domain is for sale, not an active business
  if (websiteStatus === 'parking_page') {
    return {
      filter: 'parking_page',
      reason: 'Domain for sale, not an active business'
    };
  }

  // No filter applies - keep the prospect
  return null;
}

/**
 * Build the models used tracking object
 *
 * @param {object} options - Pipeline options
 * @param {object} customPrompts - Custom prompts (may be null)
 * @returns {object} Models used object
 */
export function buildModelsUsed(options, customPrompts) {
  return {
    queryUnderstanding: options.modelSelections?.queryUnderstanding ||
                       customPrompts?.queryUnderstanding?.model ||
                       options.model ||
                       'grok-4-fast',
    websiteExtraction: options.modelSelections?.websiteExtraction ||
                     customPrompts?.websiteExtraction?.model ||
                     options.visionModel ||
                     'gpt-4o',
    relevanceCheck: options.modelSelections?.relevanceCheck ||
                   customPrompts?.relevanceCheck?.model ||
                   options.model ||
                   'grok-4-fast'
  };
}

/**
 * Build the final prospect object with all metadata
 *
 * @param {object} prospectData - Base prospect data from buildProspectData
 * @param {object} relevanceData - Relevance check results {icpScore, isRelevant}
 * @param {object} metadata - Additional metadata {projectIcpBrief, modelsUsed, customPrompts, runId, startTime}
 * @returns {object} Final prospect object ready for saving
 */
export function buildFinalProspect(prospectData, relevanceData, metadata) {
  return {
    ...prospectData,
    icp_match_score: relevanceData.icpScore,
    is_relevant: relevanceData.isRelevant,
    icp_brief_snapshot: metadata.projectIcpBrief,
    models_used: metadata.modelsUsed,
    prompts_snapshot: metadata.customPrompts || null,
    status: 'ready_for_analysis',
    run_id: metadata.runId,
    source: metadata.source || 'prospecting-engine',
    user_id: metadata.userId || null,  // Required for user data isolation
    discovery_cost: 0,
    discovery_time_ms: Date.now() - metadata.startTime
  };
}

export default {
  buildProspectData,
  calculateDaysSinceReview,
  shouldFilterAsInactive,
  buildModelsUsed,
  buildFinalProspect
};
