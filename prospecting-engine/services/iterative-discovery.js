/**
 * Iterative Discovery Service
 *
 * Intelligent multi-query discovery system that:
 * - Remembers previous queries from database
 * - Gets progressively more creative with each iteration
 * - Expands geographically when specialty variations exhausted
 * - Knows when to stop based on target count
 */

import { expandQuery } from './query-expander.js';
import { discoverCompanies } from '../discoverers/google-maps.js';
import {
  saveQueryHistory,
  getPreviousQueries,
  getQueryStats
} from '../database/supabase-client.js';

/**
 * Run iterative discovery with intelligent query expansion
 *
 * @param {string} icp - Ideal Customer Profile description
 * @param {Object} options - Configuration options
 * @param {string} options.projectId - Project ID for database tracking (required)
 * @param {number} options.targetCount - Target number of prospects to find (default: 50)
 * @param {number} options.maxIterations - Maximum iterations before stopping (default: 5)
 * @param {number} options.maxVariationsPerIteration - Max queries per iteration (default: 7)
 * @param {number} options.minRating - Minimum Google rating filter (default: 3.5)
 * @param {Function} options.onProgress - Progress callback function
 * @returns {Promise<Object>} - { prospects: [], iterations: number, queriesExecuted: number, success: boolean }
 */
export async function runIterativeDiscovery(icp, options = {}) {
  const {
    projectId,
    targetCount = 50,
    maxIterations = 5,
    maxVariationsPerIteration = 7,
    minRating = 3.5,
    onProgress = null
  } = options;

  if (!projectId) {
    throw new Error('projectId is required for iterative discovery');
  }

  const sendProgress = (data) => {
    if (onProgress) onProgress(data);
  };

  sendProgress({
    step: 'starting',
    message: `Starting iterative discovery for "${icp}"`,
    target: targetCount
  });

  const allProspects = [];
  const uniqueMap = new Map();
  let iteration = 0;

  while (allProspects.length < targetCount && iteration < maxIterations) {
    iteration++;

    sendProgress({
      step: 'iteration_start',
      iteration,
      message: `Iteration ${iteration}: Getting previous queries...`,
      currentCount: allProspects.length,
      target: targetCount
    });

    // Get previous queries from database
    const previousQueries = await getPreviousQueries(projectId);

    sendProgress({
      step: 'generating_queries',
      iteration,
      message: `Generating ${maxVariationsPerIteration} new query variations...`,
      previousQueriesCount: previousQueries.length
    });

    // AI generates new queries (avoiding previous ones)
    const expansion = await expandQuery(icp, {
      maxVariations: maxVariationsPerIteration,
      previousQueries,
      targetProspectCount: targetCount,
      currentProspectCount: allProspects.length,
      iteration,
      allowGeographicExpansion: iteration > 2
    });

    sendProgress({
      step: 'queries_generated',
      iteration,
      message: `Generated ${expansion.variations.length} variations (${expansion.strategy})`,
      variations: expansion.variations,
      strategy: expansion.strategy,
      reasoning: expansion.reasoning
    });

    // Run all queries
    const iterationProspects = [];
    for (let i = 0; i < expansion.variations.length; i++) {
      const query = expansion.variations[i];

      sendProgress({
        step: 'running_query',
        iteration,
        queryIndex: i + 1,
        totalQueries: expansion.variations.length,
        query,
        message: `Running query ${i + 1}/${expansion.variations.length}: "${query}"`
      });

      try {
        const prospects = await discoverCompanies(query, {
          minRating,
          maxResults: 60,
          projectId
        });

        sendProgress({
          step: 'query_complete',
          iteration,
          queryIndex: i + 1,
          query,
          results: prospects.length,
          message: `Found ${prospects.length} results for "${query}"`
        });

        iterationProspects.push(...prospects);

        // Save query to history
        await saveQueryHistory(projectId, query, {
          totalResults: prospects.length,
          iteration,
          strategy: expansion.strategy,
          location: expansion.location
        });

        // Small delay between queries to respect rate limits
        if (i < expansion.variations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error running query "${query}":`, error);
        sendProgress({
          step: 'query_error',
          iteration,
          queryIndex: i + 1,
          query,
          error: error.message,
          message: `Error with query "${query}": ${error.message}`
        });
      }
    }

    // Deduplicate this iteration's prospects
    sendProgress({
      step: 'deduplicating',
      iteration,
      message: `Deduplicating ${iterationProspects.length} results...`
    });

    const beforeDedup = iterationProspects.length;

    // Add to unique map
    iterationProspects.forEach(p => {
      if (p.place_id && !uniqueMap.has(p.place_id)) {
        uniqueMap.set(p.place_id, p);
      }
    });

    const newUnique = uniqueMap.size - allProspects.length;
    allProspects.length = 0;
    allProspects.push(...Array.from(uniqueMap.values()));

    sendProgress({
      step: 'iteration_complete',
      iteration,
      message: `Iteration ${iteration} complete: ${newUnique} new unique prospects found`,
      totalResults: beforeDedup,
      newUnique,
      totalUnique: allProspects.length,
      target: targetCount,
      remaining: Math.max(0, targetCount - allProspects.length)
    });

    // Check if target met
    if (allProspects.length >= targetCount) {
      sendProgress({
        step: 'target_reached',
        message: `Target reached! Found ${allProspects.length} prospects.`,
        totalProspects: allProspects.length,
        target: targetCount,
        iterations: iteration
      });
      break;
    }

    // Check if making progress
    if (newUnique === 0 && iteration > 1) {
      sendProgress({
        step: 'no_progress',
        message: 'No new prospects found. Stopping early.',
        totalProspects: allProspects.length,
        target: targetCount,
        iterations: iteration
      });
      break;
    }
  }

  const stats = await getQueryStats(projectId);

  sendProgress({
    step: 'complete',
    message: `Discovery complete: ${allProspects.length} prospects found`,
    totalProspects: allProspects.length,
    target: targetCount,
    iterations: iteration,
    success: allProspects.length >= targetCount,
    stats
  });

  return {
    prospects: allProspects,
    iterations: iteration,
    queriesExecuted: stats.totalQueries,
    success: allProspects.length >= targetCount,
    stats
  };
}
