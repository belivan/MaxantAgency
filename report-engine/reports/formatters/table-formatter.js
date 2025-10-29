/**
 * Table Formatter - Create markdown tables
 */

/**
 * Create a simple markdown table
 */
export function createTable(headers, rows, alignment = null) {
  if (!headers || !rows || rows.length === 0) {
    return '';
  }

  // Default alignment to left for all columns
  const align = alignment || headers.map(() => 'left');

  // Create header row
  let output = '| ' + headers.join(' | ') + ' |\n';

  // Create separator row with alignment
  output += '|' + align.map(a => {
    if (a === 'right') return '---:|';
    if (a === 'center') return ':---:|';
    return '---|';
  }).join('') + '\n';

  // Create data rows
  rows.forEach(row => {
    output += '| ' + row.join(' | ') + ' |\n';
  });

  return output + '\n';
}

/**
 * Create score breakdown table
 */
export function createScoreTable(scores) {
  const headers = ['Category', 'Score', 'Status'];
  const rows = Object.entries(scores).map(([category, score]) => {
    const emoji = score >= 70 ? '✅' : score >= 55 ? '⚠️' : '❌';
    const status = score >= 70 ? 'Good' : score >= 55 ? 'Needs Work' : 'Poor';
    return [
      `${emoji} **${category.charAt(0).toUpperCase() + category.slice(1)}**`,
      `${Math.round(score)}/100`,
      status
    ];
  });

  return createTable(headers, rows);
}

/**
 * Create action plan table
 */
export function createActionPlanTable(phases) {
  const headers = ['Phase', 'Timeline', 'Effort', 'Impact', 'Cost'];
  const rows = phases.map(phase => [
    phase.name,
    phase.timeline,
    phase.effort,
    phase.impact,
    phase.cost
  ]);

  return createTable(headers, rows);
}

/**
 * Create business intelligence table
 */
export function createBusinessIntelTable(businessIntel) {
  const rows = [];

  if (businessIntel.yearsInBusiness) {
    rows.push(['Years in Business', businessIntel.yearsInBusiness]);
  }
  if (businessIntel.foundedYear) {
    rows.push(['Founded', businessIntel.foundedYear]);
  }
  if (businessIntel.employeeCount) {
    rows.push(['Team Size', businessIntel.employeeCount]);
  }
  if (businessIntel.locationCount) {
    rows.push(['Locations', businessIntel.locationCount]);
  }
  if (businessIntel.pricingVisible !== undefined) {
    rows.push(['Pricing Visible', businessIntel.pricingVisible ? '✅ Yes' : '❌ No']);
  }
  if (businessIntel.priceRange) {
    rows.push(['Price Range', businessIntel.priceRange]);
  }
  if (businessIntel.blogActive !== undefined) {
    rows.push(['Blog Active', businessIntel.blogActive ? '✅ Yes' : '❌ No']);
  }
  if (businessIntel.contentLastUpdate) {
    rows.push(['Last Content Update', businessIntel.contentLastUpdate]);
  }
  if (businessIntel.ownerName) {
    rows.push(['Owner/Decision Maker', businessIntel.ownerName]);
  }
  if (businessIntel.premiumFeatures && businessIntel.premiumFeatures.length > 0) {
    rows.push(['Premium Features', businessIntel.premiumFeatures.join(', ')]);
  }
  if (businessIntel.budgetIndicator) {
    rows.push(['Budget Indicator', businessIntel.budgetIndicator]);
  }

  if (rows.length === 0) {
    return '_No business intelligence data available._\n';
  }

  return createTable(['Metric', 'Value'], rows);
}

/**
 * Create metadata table
 */
export function createMetadataTable(metadata) {
  const rows = [
    ['Analysis Date', new Date(metadata.analyzed_at).toLocaleDateString()],
    ['Analysis Cost', `$${metadata.analysis_cost?.toFixed(4) || '0.00'}`],
    ['Analysis Time', `${(metadata.analysis_time / 1000).toFixed(1)}s`],
    ['Pages Crawled', metadata.pages_crawled || 'N/A']
  ];

  if (metadata.ai_models) {
    rows.push(['AI Models Used', metadata.ai_models.join(', ')]);
  }

  return createTable(['Metric', 'Value'], rows);
}