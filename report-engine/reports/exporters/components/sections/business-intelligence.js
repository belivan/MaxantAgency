/**
 * Business Intelligence Section - Full Report Only
 * Displays company size, years in business, pricing visibility, content freshness,
 * decision maker accessibility, and premium features.
 */

import { escapeHtml } from '../utils/helpers.js';

/**
 * Generate Business Intelligence Section
 * @param {Object} analysisResult - Complete analysis result object
 * @returns {string} HTML string for business intelligence section
 */
export function generateBusinessIntelligenceSection(analysisResult) {
  const { business_intelligence } = analysisResult;

  let html = '';
  html += '    <!-- Business Intelligence -->\n';
  html += '    <section class="section" id="business-intelligence">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">\n';
  html += '          <span class="section-title-icon">🏢</span>\n';
  html += '          Business Intelligence\n';
  html += '        </h2>\n';
  html += '        <p class="section-description">Insights about company size, operations, and digital presence.</p>\n';
  html += '      </div>\n\n';

  // Check if business_intelligence exists and has data
  const hasData = business_intelligence && Object.keys(business_intelligence).length > 0;

  if (!hasData) {
    // Show fallback UI when no data available
    html += '      <div style="background: var(--bg-secondary); padding: 32px; border-radius: 12px; text-align: center; border: 1px solid var(--border-light);">\n';
    html += '        <div style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;">📊</div>\n';
    html += '        <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">Business Intelligence Data Not Available</h3>\n';
    html += '        <p style="opacity: 0.7; font-size: 0.95rem; max-width: 500px; margin: 0 auto;">Business intelligence extraction requires multi-page crawling to analyze company details across about, team, and location pages.</p>\n';
    html += '        <p style="opacity: 0.6; font-size: 0.85rem; margin-top: 16px;">Enable multi-page crawling in analysis settings to extract company size, pricing, and decision maker insights.</p>\n';
    html += '      </div>\n';
    html += '    </section>\n\n';
    return html;
  }

  html += '      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">\n';

  // Company Size - Always show with fallback
  html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid var(--primary);">\n';
  html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: var(--primary);">📊 Company Size</h3>\n';

  const employeeCount = business_intelligence?.companySize?.employeeCount;
  const locationCount = business_intelligence?.companySize?.locationCount;

  html += `          <p style="margin-bottom: 8px;"><strong>Estimated Employees:</strong> ${employeeCount ? escapeHtml(employeeCount) : '<span style="opacity: 0.5;">Not available</span>'}</p>\n`;
  html += `          <p style="margin-bottom: 8px;"><strong>Locations:</strong> ${locationCount ? escapeHtml(locationCount) : '<span style="opacity: 0.5;">Not available</span>'}</p>\n`;
  html += '        </div>\n';

  // Years in Business - Always show with fallback
  html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid var(--success);">\n';
  html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: var(--success);">📅 Company History</h3>\n';

  const foundedYear = business_intelligence?.yearsInBusiness?.foundedYear;
  const estimatedYears = business_intelligence?.yearsInBusiness?.estimatedYears;

  html += `          <p style="margin-bottom: 8px;"><strong>Founded:</strong> ${foundedYear ? escapeHtml(foundedYear) : '<span style="opacity: 0.5;">Not available</span>'}</p>\n`;
  html += `          <p style="margin-bottom: 8px;"><strong>Years in Business:</strong> ${estimatedYears ? '~' + escapeHtml(estimatedYears) + ' years' : '<span style="opacity: 0.5;">Not available</span>'}</p>\n`;
  html += '        </div>\n';

  // Pricing Visibility - Always show with fallback
  html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid #f59e0b;">\n';
  html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: #f59e0b;">💰 Pricing Information</h3>\n';

  const pricingVisible = business_intelligence?.pricingVisibility?.visible;
  const priceRange = business_intelligence?.pricingVisibility?.priceRange;

  // Format price range object properly
  let priceRangeText = '<span style="opacity: 0.5;">Not available</span>';
  if (priceRange && typeof priceRange === 'object') {
    if (priceRange.min || priceRange.max) {
      priceRangeText = `$${priceRange.min || '?'} - $${priceRange.max || '?'}`;
    }
  } else if (priceRange && typeof priceRange === 'string') {
    priceRangeText = escapeHtml(priceRange);
  }

  html += `          <p style="margin-bottom: 8px;"><strong>Pricing Visible:</strong> ${pricingVisible !== undefined ? (pricingVisible ? 'Yes' : 'No') : '<span style="opacity: 0.5;">Not available</span>'}</p>\n`;
  html += `          <p style="margin-bottom: 8px;"><strong>Price Range:</strong> ${priceRangeText}</p>\n`;
  html += '        </div>\n';

  // Content Freshness - Always show with fallback
  html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid #8b5cf6;">\n';
  html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: #8b5cf6;">✍️ Content Activity</h3>\n';

  const blogActive = business_intelligence?.contentFreshness?.blogActive;
  const lastUpdate = business_intelligence?.contentFreshness?.lastUpdate;

  html += `          <p style="margin-bottom: 8px;"><strong>Blog Active:</strong> ${blogActive !== undefined ? (blogActive ? 'Yes' : 'No') : '<span style="opacity: 0.5;">Not available</span>'}</p>\n`;
  html += `          <p style="margin-bottom: 8px;"><strong>Last Update:</strong> ${lastUpdate ? escapeHtml(lastUpdate) : '<span style="opacity: 0.5;">Not available</span>'}</p>\n`;
  html += '        </div>\n';

  // Decision Maker Accessibility - Always show with fallback
  html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid #ef4444;">\n';
  html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: #ef4444;">👤 Decision Maker Access</h3>\n';

  const hasDirectEmail = business_intelligence?.decisionMakerAccessibility?.hasDirectEmail;
  const hasDirectPhone = business_intelligence?.decisionMakerAccessibility?.hasDirectPhone;
  const ownerName = business_intelligence?.decisionMakerAccessibility?.ownerName;

  html += `          <p style="margin-bottom: 8px;"><strong>Direct Email:</strong> ${hasDirectEmail !== undefined ? (hasDirectEmail ? 'Found' : 'Not Found') : '<span style="opacity: 0.5;">Not available</span>'}</p>\n`;
  html += `          <p style="margin-bottom: 8px;"><strong>Direct Phone:</strong> ${hasDirectPhone !== undefined ? (hasDirectPhone ? 'Found' : 'Not Found') : '<span style="opacity: 0.5;">Not available</span>'}</p>\n`;
  html += `          <p style="margin-bottom: 8px;"><strong>Owner Name:</strong> ${ownerName ? escapeHtml(ownerName) : '<span style="opacity: 0.5;">Not available</span>'}</p>\n`;
  html += '        </div>\n';

  // Premium Features
  if (business_intelligence.premiumFeatures && business_intelligence.premiumFeatures.detected && business_intelligence.premiumFeatures.detected.length > 0) {
    html += '        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-left: 4px solid #10b981;">\n';
    html += '          <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px; color: #10b981;">⭐ Premium Features Detected</h3>\n';
    html += '          <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">\n';
    business_intelligence.premiumFeatures.detected.forEach(feature => {
      html += `            <li>${escapeHtml(feature)}</li>\n`;
    });
    html += '          </ul>\n';
    // Budget Indicator removed - not shown in client-facing reports
    html += '        </div>\n';
  }

  html += '      </div>\n';
  html += '    </section>\n\n';
  return html;
}
