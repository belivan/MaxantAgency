/**
 * Analysis Scope & Metadata Section
 * Displays intelligent page analysis metadata
 */

export function generateAnalysisScope(analysisResult, synthesisData, options) {
  const {
    pages_discovered,
    pages_crawled,
    pages_analyzed,
    ai_page_selection_reasoning,
    screenshots_manifest,
    analysis_timestamp
  } = analysisResult;

  // If no scope data available, return empty string
  if (!pages_discovered && !pages_crawled && !screenshots_manifest) {
    return '';
  }

  const totalScreenshots = screenshots_manifest?.total_screenshots || 0;
  const pagesWithScreenshots = screenshots_manifest?.pages?.length || 0;

  const analysisDate = analysis_timestamp
    ? new Date(analysis_timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Unknown';

  return `
    <section class="section" id="analysis-scope">
      <div class="section-header">
        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">
          <span class="section-title-icon">🔬</span>
          Analysis Scope & Methodology
        </h2>
        <p class="section-description">Our AI intelligently selects which pages to analyze based on business impact and user journey importance.</p>
      </div>

      <!-- Stats Overview -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
        ${pages_discovered ? `
          <div style="background: linear-gradient(135deg, #667eea22 0%, #764ba211 100%); padding: 20px; border-radius: 12px; text-align: center; border-top: 4px solid #667eea;">
            <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 8px;">${pages_discovered}</div>
            <div style="font-size: 0.9rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px;">Pages Discovered</div>
          </div>
        ` : ''}
        ${pages_crawled ? `
          <div style="background: linear-gradient(135deg, #f093fb22 0%, #f5576c11 100%); padding: 20px; border-radius: 12px; text-align: center; border-top: 4px solid #f093fb;">
            <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 8px;">${pages_crawled}</div>
            <div style="font-size: 0.9rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px;">Pages Crawled</div>
          </div>
        ` : ''}
        ${pages_analyzed ? `
          <div style="background: linear-gradient(135deg, #4facfe22 0%, #00f2fe11 100%); padding: 20px; border-radius: 12px; text-align: center; border-top: 4px solid #4facfe;">
            <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 8px;">${pages_analyzed}</div>
            <div style="font-size: 0.9rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px;">Pages Analyzed</div>
          </div>
        ` : ''}
        ${totalScreenshots ? `
          <div style="background: linear-gradient(135deg, #43e97b22 0%, #38f9d711 100%); padding: 20px; border-radius: 12px; text-align: center; border-top: 4px solid #43e97b;">
            <div style="font-size: 2.5rem; font-weight: bold; margin-bottom: 8px;">${totalScreenshots}</div>
            <div style="font-size: 0.9rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px;">Screenshots Captured</div>
          </div>
        ` : ''}
      </div>

      ${ai_page_selection_reasoning ? `
        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-bottom: 24px;">
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span>🤖</span>
            <span>AI Page Selection Strategy</span>
          </h3>
          <p style="line-height: 1.6; opacity: 0.9;">${ai_page_selection_reasoning}</p>
        </div>
      ` : ''}

      <!-- Analysis Coverage -->
      ${pages_discovered && pages_analyzed ? `
        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-bottom: 24px;">
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 16px;">Analysis Coverage</h3>
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 0.9rem; opacity: 0.8;">Pages Analyzed vs Discovered</span>
              <span style="font-weight: 600;">${pages_analyzed} / ${pages_discovered} (${Math.round((pages_analyzed / pages_discovered) * 100)}%)</span>
            </div>
            <div style="background: #E0E0E0; height: 12px; border-radius: 6px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%); height: 100%; width: ${(pages_analyzed / pages_discovered) * 100}%; transition: width 0.3s ease;"></div>
            </div>
          </div>
          <p style="font-size: 0.85rem; opacity: 0.7; line-height: 1.5; margin-top: 12px;">
            We don't analyze every page on your site. Instead, our AI selects the most business-critical pages—those that drive conversions, establish trust, or represent key user journeys.
            This focused approach delivers actionable insights without the noise.
          </p>
        </div>
      ` : ''}

      <!-- Pages Analyzed List -->
      ${screenshots_manifest?.pages?.length > 0 ? `
        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px;">
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 16px;">Pages Included In This Analysis</h3>
          <div style="display: grid; gap: 12px;">
            ${screenshots_manifest.pages.map((page, index) => `
              <div style="display: flex; align-items: center; gap: 12px; background: var(--bg-primary); padding: 12px 16px; border-radius: 8px;">
                <div style="background: var(--primary); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                  ${index + 1}
                </div>
                <div style="flex: 1;">
                  <div style="font-weight: 600; margin-bottom: 4px;">${page.page_name || 'Page ' + (index + 1)}</div>
                  <div style="font-size: 0.85rem; opacity: 0.7; font-family: 'Courier New', monospace;">${page.page_path}</div>
                </div>
                <div style="display: flex; gap: 8px;">
                  ${page.desktop_screenshot ? '<span style="background: #4facfe22; color: #4facfe; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">🖥️ Desktop</span>' : ''}
                  ${page.mobile_screenshot ? '<span style="background: #43e97b22; color: #43e97b; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">📱 Mobile</span>' : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Analysis Metadata -->
      <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-top: 24px; border-left: 4px solid var(--border-default);">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; opacity: 0.7;">
          <span>📅</span>
          <span>Analysis completed on ${analysisDate}</span>
        </div>
      </div>
    </section>
  `;
}
