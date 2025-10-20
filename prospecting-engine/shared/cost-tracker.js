import { logCost } from './logger.js';

/**
 * Cost Tracker - Track API costs across the pipeline
 *
 * Pricing (as of 2025):
 * - Google Maps Places API: $0.005 per request
 * - Grok AI (xAI): ~$0.01 per 1K tokens
 * - OpenAI GPT-4: ~$0.03 per 1K tokens
 * - Playwright (self-hosted): $0 (compute only)
 */

class CostTracker {
  constructor() {
    this.reset();
  }

  /**
   * Reset all cost counters
   */
  reset() {
    this.costs = {
      googleMaps: 0,
      googleSearch: 0,
      grokAi: 0,
      openAi: 0,
      total: 0
    };

    this.calls = {
      googleMaps: 0,
      googleSearch: 0,
      grokAi: 0,
      openAi: 0,
      total: 0
    };

    this.tokens = {
      grokAi: { input: 0, output: 0 },
      openAi: { input: 0, output: 0 }
    };
  }

  /**
   * Track Google Maps API request
   * @param {number} count - Number of requests (default 1)
   */
  trackGoogleMaps(count = 1) {
    const costPerRequest = parseFloat(process.env.GOOGLE_MAPS_COST_PER_REQUEST) || 0.005;
    const cost = count * costPerRequest;

    this.costs.googleMaps += cost;
    this.costs.total += cost;
    this.calls.googleMaps += count;
    this.calls.total += count;

    if (process.env.ENABLE_COST_TRACKING === 'true') {
      logCost('Google Maps API', cost, { requests: count, total: this.costs.googleMaps });
    }

    return cost;
  }

  /**
   * Track Google Search API request
   * @param {number} count - Number of requests (default 1)
   */
  trackGoogleSearch(count = 1) {
    // Google Custom Search: $5 per 1000 queries = $0.005 per query
    const costPerRequest = 0.005;
    const cost = count * costPerRequest;

    this.costs.googleSearch += cost;
    this.costs.total += cost;
    this.calls.googleSearch += count;
    this.calls.total += count;

    if (process.env.ENABLE_COST_TRACKING === 'true') {
      logCost('Google Search API', cost, { requests: count, total: this.costs.googleSearch });
    }

    return cost;
  }

  /**
   * Track Grok AI (xAI) usage
   * @param {object} usage - Token usage from API response
   */
  trackGrokAi(usage) {
    if (!usage) return 0;

    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;

    // Grok pricing: $5 per 1M input tokens, $15 per 1M output tokens
    const inputCost = (inputTokens / 1_000_000) * 5;
    const outputCost = (outputTokens / 1_000_000) * 15;
    const cost = inputCost + outputCost;

    this.costs.grokAi += cost;
    this.costs.total += cost;
    this.calls.grokAi += 1;
    this.calls.total += 1;
    this.tokens.grokAi.input += inputTokens;
    this.tokens.grokAi.output += outputTokens;

    if (process.env.ENABLE_COST_TRACKING === 'true') {
      logCost('Grok AI', cost, {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_cost: this.costs.grokAi
      });
    }

    return cost;
  }

  /**
   * Track OpenAI usage
   * @param {object} usage - Token usage from API response
   * @param {string} model - Model name (gpt-4, gpt-3.5-turbo, etc.)
   */
  trackOpenAi(usage, model = 'gpt-4') {
    if (!usage) return 0;

    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;

    // OpenAI pricing varies by model
    let inputCostPer1M = 30; // GPT-4 default
    let outputCostPer1M = 60;

    if (model.includes('gpt-3.5')) {
      inputCostPer1M = 0.5;
      outputCostPer1M = 1.5;
    } else if (model.includes('gpt-4o')) {
      inputCostPer1M = 5;
      outputCostPer1M = 15;
    }

    const inputCost = (inputTokens / 1_000_000) * inputCostPer1M;
    const outputCost = (outputTokens / 1_000_000) * outputCostPer1M;
    const cost = inputCost + outputCost;

    this.costs.openAi += cost;
    this.costs.total += cost;
    this.calls.openAi += 1;
    this.calls.total += 1;
    this.tokens.openAi.input += inputTokens;
    this.tokens.openAi.output += outputTokens;

    if (process.env.ENABLE_COST_TRACKING === 'true') {
      logCost('OpenAI', cost, {
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_cost: this.costs.openAi
      });
    }

    return cost;
  }

  /**
   * Get current cost summary
   * @returns {object} Cost breakdown
   */
  getSummary() {
    return {
      costs: {
        googleMaps: this.costs.googleMaps.toFixed(4),
        googleSearch: this.costs.googleSearch.toFixed(4),
        grokAi: this.costs.grokAi.toFixed(4),
        openAi: this.costs.openAi.toFixed(4),
        total: this.costs.total.toFixed(4)
      },
      calls: this.calls,
      tokens: this.tokens,
      averageCostPerCall: this.calls.total > 0
        ? (this.costs.total / this.calls.total).toFixed(4)
        : '0.0000'
    };
  }

  /**
   * Print cost summary to console
   */
  printSummary() {
    const summary = this.getSummary();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                   COST SUMMARY                         ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Google Maps API:    $${summary.costs.googleMaps} (${summary.calls.googleMaps} calls)`);
    console.log(`Google Search API:  $${summary.costs.googleSearch} (${summary.calls.googleSearch} calls)`);
    console.log(`Grok AI:            $${summary.costs.grokAi} (${summary.calls.grokAi} calls, ${summary.tokens.grokAi.input + summary.tokens.grokAi.output} tokens)`);
    console.log(`OpenAI:             $${summary.costs.openAi} (${summary.calls.openAi} calls, ${summary.tokens.openAi.input + summary.tokens.openAi.output} tokens)`);
    console.log('───────────────────────────────────────────────────────');
    console.log(`TOTAL COST:         $${summary.costs.total}`);
    console.log(`Avg Cost/Call:      $${summary.averageCostPerCall}`);
    console.log('═══════════════════════════════════════════════════════\n');
  }
}

// Export singleton instance
export const costTracker = new CostTracker();

// Export class for testing
export default CostTracker;
