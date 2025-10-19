// Cost tracking utility for accurate billing per analysis

// Model pricing (cost per 1M tokens, averaged input/output)
const MODEL_COSTS = {
  // Grok AI (xAI)
  'grok-beta': 5.00,  // $5 per 1M tokens

  // OpenAI
  'gpt-5-mini': 0.15,         // $0.15 per 1M tokens
  'gpt-5': 5.50,              // $5.50 per 1M tokens
  'gpt-4o': 7.50,             // $7.50 per 1M tokens (vision)
  'gpt-4o-mini': 0.15,        // $0.15 per 1M tokens

  // Anthropic
  'claude-sonnet-4-5': 6.50,  // $6.50 per 1M tokens
  'claude-haiku-4-5': 0.10,   // $0.10 per 1M tokens
};

// Estimated tokens per operation (based on actual usage patterns)
const OPERATION_TOKENS = {
  grokExtraction: 8000,          // Grok AI: Large HTML + extraction
  basicAnalysis: 2000,           // Basic analysis agent
  industryAnalysis: 1500,        // Industry-specific analysis
  seoAnalysis: 1000,             // SEO deep dive
  visualAnalysis: 2000,          // Vision analysis per image
  competitorAnalysis: 10000,     // Grok with web search + 3 competitors
  // [REMOVED] Email operations moved to separate app:
  // - emailWriting: 800
  // - critiqueReasoning: 600
  // - qaReview: 500
};

/**
 * Calculate cost for a specific operation
 * @param {string} operation - Operation name (e.g., 'grokExtraction')
 * @param {string} model - Model name (e.g., 'grok-beta')
 * @param {number} multiplier - Number of times operation ran (default 1)
 * @returns {number} - Cost in dollars
 */
export function calculateOperationCost(operation, model, multiplier = 1) {
  const tokens = OPERATION_TOKENS[operation] || 1000;
  const costPerToken = MODEL_COSTS[model] || 0.001;
  const tokensInMillion = tokens / 1000000;
  return tokensInMillion * costPerToken * multiplier;
}

/**
 * Calculate total cost for an analysis
 * @param {Object} costBreakdown - Breakdown of operations performed
 * @returns {Object} - { totalCost, breakdown }
 */
export function calculateTotalCost(costBreakdown) {
  const {
    grokModel = 'grok-beta',
    textModel = 'gpt-5-mini',
    visionModel = 'gpt-4o',

    // Operations performed (boolean or count)
    grokExtraction = true,
    basicAnalysis = true,
    industryAnalysis = false,
    seoAnalysis = false,
    visualAnalysis = 0,        // Number of images analyzed
    competitorAnalysis = false,
    // [REMOVED] Email operations moved to separate app

    // Pages analyzed (affects basic analysis cost)
    pagesAnalyzed = 1,
  } = costBreakdown;

  const costs = {};
  let totalCost = 0;

  // 1. Grok AI Extraction (always runs)
  if (grokExtraction) {
    costs.grokExtraction = calculateOperationCost('grokExtraction', grokModel);
    totalCost += costs.grokExtraction;
  }

  // 2. Basic Analysis (always runs, cost scales with pages)
  if (basicAnalysis) {
    costs.basicAnalysis = calculateOperationCost('basicAnalysis', textModel, pagesAnalyzed);
    totalCost += costs.basicAnalysis;
  }

  // 3. Industry Analysis (optional)
  if (industryAnalysis) {
    costs.industryAnalysis = calculateOperationCost('industryAnalysis', textModel);
    totalCost += costs.industryAnalysis;
  }

  // 4. SEO Analysis (optional)
  if (seoAnalysis) {
    costs.seoAnalysis = calculateOperationCost('seoAnalysis', textModel);
    totalCost += costs.seoAnalysis;
  }

  // 5. Visual Analysis (optional, per image)
  if (visualAnalysis > 0) {
    costs.visualAnalysis = calculateOperationCost('visualAnalysis', visionModel, visualAnalysis);
    totalCost += costs.visualAnalysis;
  }

  // 6. Competitor Analysis (optional)
  if (competitorAnalysis) {
    costs.competitorAnalysis = calculateOperationCost('competitorAnalysis', grokModel);
    totalCost += costs.competitorAnalysis;
  }

  // [REMOVED] Email operations (7-9) moved to separate email app

  return {
    totalCost: parseFloat(totalCost.toFixed(4)),  // Round to 4 decimals ($0.0001)
    breakdown: costs,
    summary: {
      grokCalls: grokExtraction ? 1 + (competitorAnalysis ? 1 : 0) : 0,
      textModelCalls: (basicAnalysis ? pagesAnalyzed : 0) + (industryAnalysis ? 1 : 0) + (seoAnalysis ? 1 : 0),
      visionModelCalls: visualAnalysis,
      // cheapModelCalls removed - no longer needed for data collection
    }
  };
}

/**
 * Format cost for display
 * @param {number} cost - Cost in dollars
 * @returns {string} - Formatted cost string
 */
export function formatCost(cost) {
  if (cost < 0.001) return '<$0.001';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Format time for display
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
export function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
