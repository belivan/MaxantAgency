/**
 * Cost Calculator Utilities
 * Estimate costs for prospecting, analysis, and outreach operations
 */

// ============================================================================
// PROSPECTING COSTS
// ============================================================================

/**
 * Model costs per 1M tokens (approximate)
 */
const PROSPECTING_MODEL_COSTS = {
  'grok-4-fast': {
    input: 0.50,   // per 1M input tokens
    output: 1.50   // per 1M output tokens
  },
  'gpt-4o-mini': {
    input: 0.15,
    output: 0.60
  },
  'gpt-5-mini': {
    input: 0.10,
    output: 0.40
  },
  'claude-sonnet-4-5': {
    input: 3.00,
    output: 15.00
  }
} as const;

/**
 * Estimate prospecting cost per company
 */
function estimateProspectingCostPerCompany(model: keyof typeof PROSPECTING_MODEL_COSTS): number {
  // Rough estimates based on typical token usage
  const avgInputTokens = 500;   // Brief + instructions
  const avgOutputTokens = 200;  // Company data

  const costs = PROSPECTING_MODEL_COSTS[model];
  const inputCost = (avgInputTokens / 1_000_000) * costs.input;
  const outputCost = (avgOutputTokens / 1_000_000) * costs.output;

  return inputCost + outputCost;
}

/**
 * Calculate total prospecting cost
 */
export function calculateProspectingCost(
  count: number,
  model: keyof typeof PROSPECTING_MODEL_COSTS,
  options?: { verify?: boolean }
): number {
  const baselineRate = estimateProspectingCostPerCompany(model);
  let costPerCompany = baselineRate;

  // Add verification cost (additional API call)
  if (options?.verify) {
    costPerCompany += 0.001; // ~$0.001 per URL verification
  }

  return count * costPerCompany;
}

// ============================================================================
// ANALYSIS COSTS
// ============================================================================

/**
 * Analysis tier costs (per lead)
 */
const ANALYSIS_TIER_COSTS = {
  tier1: 0.04,  // Basic analysis
  tier2: 0.08,  // Standard analysis
  tier3: 0.15   // Deep analysis
} as const;

/**
 * Per-module additional costs
 */
const ANALYSIS_MODULE_COSTS = {
  design: 0.01,
  seo: 0.01,
  content: 0.015,
  performance: 0.01,
  accessibility: 0.01,
  social: 0.02
} as const;

/**
 * Calculate analysis cost for a single lead
 */
export function calculateAnalysisCostPerLead(
  tier: keyof typeof ANALYSIS_TIER_COSTS,
  modules: (keyof typeof ANALYSIS_MODULE_COSTS)[]
): number {
  const baseCost = ANALYSIS_TIER_COSTS[tier];

  // Add module costs (only for additional modules beyond tier baseline)
  const tierBaselineModules = {
    tier1: ['design'],
    tier2: ['design', 'seo'],
    tier3: ['design', 'seo', 'content', 'performance']
  };

  const baseModules = tierBaselineModules[tier] || [];
  const additionalModules = modules.filter(m => !baseModules.includes(m));

  const moduleCost = additionalModules.reduce((sum, module) => {
    return sum + (ANALYSIS_MODULE_COSTS[module] || 0);
  }, 0);

  return baseCost + moduleCost;
}

/**
 * Calculate total analysis cost
 */
export function calculateAnalysisCost(
  count: number,
  tier: keyof typeof ANALYSIS_TIER_COSTS,
  modules: (keyof typeof ANALYSIS_MODULE_COSTS)[],
  options?: { captureScreenshots?: boolean }
): number {
  let costPerLead = calculateAnalysisCostPerLead(tier, modules);

  // Screenshot capture cost
  if (options?.captureScreenshots) {
    costPerLead += 0.005; // ~$0.005 per screenshot
  }

  return count * costPerLead;
}

// ============================================================================
// OUTREACH COSTS
// ============================================================================

/**
 * Email composition model costs
 */
const EMAIL_COMPOSITION_MODEL_COSTS = {
  'haiku': 0.002,     // Claude Haiku - cheapest
  'sonnet': 0.015,    // Claude Sonnet - better quality
  'gpt-4o-mini': 0.003
} as const;

/**
 * Calculate email composition cost per email
 */
export function calculateEmailCostPerEmail(
  model: keyof typeof EMAIL_COMPOSITION_MODEL_COSTS,
  options?: { generateVariants?: boolean; numVariants?: number }
): number {
  const baseCost = EMAIL_COMPOSITION_MODEL_COSTS[model];

  // Variants cost (generate multiple versions)
  if (options?.generateVariants) {
    const variantCount = options.numVariants || 3;
    return baseCost * variantCount;
  }

  return baseCost;
}

/**
 * Calculate total email composition cost
 */
export function calculateEmailCompositionCost(
  count: number,
  model: keyof typeof EMAIL_COMPOSITION_MODEL_COSTS,
  options?: { generateVariants?: boolean; numVariants?: number }
): number {
  const costPerEmail = calculateEmailCostPerEmail(model, options);
  return count * costPerEmail;
}

/**
 * Calculate social DM composition cost
 */
export function calculateSocialCompositionCost(
  count: number,
  model: keyof typeof EMAIL_COMPOSITION_MODEL_COSTS,
  options?: { generateVariants?: boolean; numVariants?: number }
): number {
  // Social DMs are typically shorter, ~70% of email cost
  return calculateEmailCompositionCost(count, model, options) * 0.7;
}

// ============================================================================
// FULL PIPELINE COST
// ============================================================================

/**
 * Calculate cost for the entire pipeline
 */
export function calculateFullPipelineCost(params: {
  prospectCount: number;
  prospectModel: keyof typeof PROSPECTING_MODEL_COSTS;
  verifyUrls: boolean;
  analysisTier: keyof typeof ANALYSIS_TIER_COSTS;
  analysisModules: (keyof typeof ANALYSIS_MODULE_COSTS)[];
  captureScreenshots: boolean;
  emailModel: keyof typeof EMAIL_COMPOSITION_MODEL_COSTS;
  generateVariants: boolean;
  emailCount: number; // May be less than prospect count (only A/B grades)
}): {
  prospecting: number;
  analysis: number;
  outreach: number;
  total: number;
  perLead: number;
} {
  const prospecting = calculateProspectingCost(
    params.prospectCount,
    params.prospectModel,
    { verify: params.verifyUrls }
  );

  const analysis = calculateAnalysisCost(
    params.prospectCount,
    params.analysisTier,
    params.analysisModules,
    { captureScreenshots: params.captureScreenshots }
  );

  const outreach = calculateEmailCompositionCost(
    params.emailCount,
    params.emailModel,
    { generateVariants: params.generateVariants }
  );

  const total = prospecting + analysis + outreach;
  const perLead = params.prospectCount > 0 ? total / params.prospectCount : 0;

  return {
    prospecting,
    analysis,
    outreach,
    total,
    perLead
  };
}

// ============================================================================
// COST BREAKDOWN HELPERS
// ============================================================================

/**
 * Get cost breakdown as percentages
 */
export function getCostBreakdownPercentages(costs: {
  prospecting: number;
  analysis: number;
  outreach: number;
  total: number;
}): {
  prospecting: number;
  analysis: number;
  outreach: number;
} {
  if (costs.total === 0) {
    return { prospecting: 0, analysis: 0, outreach: 0 };
  }

  return {
    prospecting: (costs.prospecting / costs.total) * 100,
    analysis: (costs.analysis / costs.total) * 100,
    outreach: (costs.outreach / costs.total) * 100
  };
}

/**
 * Check if cost is within budget
 */
export function isWithinBudget(
  estimatedCost: number,
  budget: number,
  threshold: number = 0.9
): {
  withinBudget: boolean;
  percentageUsed: number;
  exceededBy?: number;
  approachingLimit: boolean;
} {
  const percentageUsed = (estimatedCost / budget) * 100;
  const withinBudget = estimatedCost <= budget;
  const approachingLimit = percentageUsed >= (threshold * 100);

  return {
    withinBudget,
    percentageUsed,
    exceededBy: withinBudget ? undefined : estimatedCost - budget,
    approachingLimit
  };
}

// ============================================================================
// ROI CALCULATIONS
// ============================================================================

/**
 * Calculate ROI for a campaign
 */
export function calculateROI(params: {
  totalCost: number;
  leadsGenerated: number;
  conversions: number;
  avgDealValue: number;
}): {
  costPerLead: number;
  costPerConversion: number;
  conversionRate: number;
  revenue: number;
  roi: number;
  roiPercentage: number;
} {
  const { totalCost, leadsGenerated, conversions, avgDealValue } = params;

  const costPerLead = leadsGenerated > 0 ? totalCost / leadsGenerated : 0;
  const costPerConversion = conversions > 0 ? totalCost / conversions : 0;
  const conversionRate = leadsGenerated > 0 ? (conversions / leadsGenerated) * 100 : 0;
  const revenue = conversions * avgDealValue;
  const roi = revenue - totalCost;
  const roiPercentage = totalCost > 0 ? (roi / totalCost) * 100 : 0;

  return {
    costPerLead,
    costPerConversion,
    conversionRate,
    revenue,
    roi,
    roiPercentage
  };
}
