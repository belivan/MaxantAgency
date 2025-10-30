/**
 * Design Tokens Report Section
 * Displays extracted color palettes and typography from desktop and mobile viewports
 */

export function generateDesignTokensSection(analysisResult, synthesisData, options) {
  const {
    design_tokens_desktop,
    design_tokens_mobile
  } = analysisResult;

  // If no design tokens data available, return empty string
  if (!design_tokens_desktop && !design_tokens_mobile) {
    return '';
  }

  const desktopTokens = design_tokens_desktop || { fonts: [], colors: [] };
  const mobileTokens = design_tokens_mobile || { fonts: [], colors: [] };

  const hasDesktopData = desktopTokens.fonts?.length > 0 || desktopTokens.colors?.length > 0;
  const hasMobileData = mobileTokens.fonts?.length > 0 || mobileTokens.colors?.length > 0;

  if (!hasDesktopData && !hasMobileData) {
    return '';
  }

  return `
    <section class="section" id="design-tokens">
      <div class="section-header">
        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">
          <span class="section-title-icon">🎨</span>
          Design System Analysis
        </h2>
        <p class="section-description">Extracted color palettes and typography from your website. Understanding your design system helps identify inconsistencies and opportunities for brand strengthening.</p>
      </div>

      ${hasDesktopData && hasMobileData ? `
        <div style="background: linear-gradient(135deg, #667eea22 0%, #764ba211 100%); padding: 20px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #667eea;">
          <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <span>💡</span>
            <span>Responsive Design Analysis</span>
          </h3>
          <p style="font-size: 0.9rem; opacity: 0.9; line-height: 1.5;">
            We've analyzed both desktop and mobile viewports to identify design consistency across devices. Look for significant differences in color usage or typography that might affect brand perception.
          </p>
        </div>
      ` : ''}

      <!-- Desktop Tokens -->
      ${hasDesktopData ? generateViewportTokens('Desktop', desktopTokens, '🖥️') : ''}

      <!-- Mobile Tokens -->
      ${hasMobileData ? generateViewportTokens('Mobile', mobileTokens, '📱') : ''}

      <!-- Design System Insights -->
      ${hasDesktopData && hasMobileData ? generateComparisonInsights(desktopTokens, mobileTokens) : ''}
    </section>
  `;
}

function generateViewportTokens(viewportName, tokens, icon) {
  const { fonts = [], colors = [] } = tokens;

  return `
    <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-bottom: 24px;">
      <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
        <span>${icon}</span>
        <span>${viewportName} Viewport</span>
      </h3>

      <!-- Color Palette -->
      ${colors.length > 0 ? `
        <div style="margin-bottom: 32px;">
          <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 16px; opacity: 0.8;">Color Palette (${colors.length} colors detected)</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px;">
            ${colors.slice(0, 30).map(color => `
              <div style="background: var(--bg-primary); border-radius: 8px; padding: 12px; text-align: center;">
                <div style="background: ${color.hex}; height: 60px; border-radius: 6px; margin-bottom: 8px; border: 1px solid var(--border-default);"></div>
                <div style="font-family: 'Courier New', monospace; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">${color.hex}</div>
                <div style="font-size: 0.7rem; opacity: 0.6;">Used ${color.count}×</div>
              </div>
            `).join('')}
          </div>
          ${colors.length > 30 ? `
            <p style="font-size: 0.85rem; opacity: 0.6; margin-top: 12px; text-align: center;">Showing top 30 of ${colors.length} colors</p>
          ` : ''}
        </div>
      ` : ''}

      <!-- Typography -->
      ${fonts.length > 0 ? `
        <div>
          <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 16px; opacity: 0.8;">Typography (${fonts.length} font ${fonts.length === 1 ? 'family' : 'families'} detected)</h4>
          <div style="display: grid; gap: 12px;">
            ${fonts.slice(0, 20).map((font, index) => `
              <div style="background: var(--bg-primary); border-radius: 8px; padding: 16px; border-left: 4px solid var(--primary);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                  <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 6px; font-family: ${font.family};">${font.family}</div>
                    <div style="font-size: 0.85rem; opacity: 0.7;">Used ${font.count}× across site</div>
                  </div>
                  ${index === 0 ? '<div style="background: #4CAF50; color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">PRIMARY</div>' : ''}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.85rem;">
                  <div>
                    <div style="opacity: 0.6; font-size: 0.75rem; margin-bottom: 4px;">Sizes used:</div>
                    <div style="font-family: 'Courier New', monospace; background: var(--bg-secondary); padding: 8px; border-radius: 4px; font-size: 0.75rem;">
                      ${font.sizes.slice(0, 10).join(', ')}${font.sizes.length > 10 ? `, +${font.sizes.length - 10} more` : ''}
                    </div>
                  </div>
                  <div>
                    <div style="opacity: 0.6; font-size: 0.75rem; margin-bottom: 4px;">Weights used:</div>
                    <div style="font-family: 'Courier New', monospace; background: var(--bg-secondary); padding: 8px; border-radius: 4px; font-size: 0.75rem;">
                      ${font.weights.join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          ${fonts.length > 20 ? `
            <p style="font-size: 0.85rem; opacity: 0.6; margin-top: 12px; text-align: center;">Showing top 20 of ${fonts.length} font families</p>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function generateComparisonInsights(desktopTokens, mobileTokens) {
  const desktopColorCount = desktopTokens.colors?.length || 0;
  const mobileColorCount = mobileTokens.colors?.length || 0;
  const desktopFontCount = desktopTokens.fonts?.length || 0;
  const mobileFontCount = mobileTokens.fonts?.length || 0;

  const colorDiff = desktopColorCount - mobileColorCount;
  const fontDiff = desktopFontCount - mobileFontCount;

  const insights = [];

  // Color consistency
  if (Math.abs(colorDiff) > 5) {
    if (colorDiff > 0) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'More colors on desktop',
        description: `Desktop uses ${desktopColorCount} colors while mobile uses ${mobileColorCount}. Consider harmonizing your color palette across viewports for brand consistency.`
      });
    } else {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'More colors on mobile',
        description: `Mobile uses ${mobileColorCount} colors while desktop uses ${desktopColorCount}. This could indicate responsive design inconsistencies.`
      });
    }
  } else {
    insights.push({
      type: 'success',
      icon: '✅',
      title: 'Consistent color usage',
      description: `Desktop (${desktopColorCount} colors) and mobile (${mobileColorCount} colors) have similar color palette sizes, indicating good design consistency.`
    });
  }

  // Font consistency
  if (Math.abs(fontDiff) > 2) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Typography inconsistency detected',
      description: `Desktop uses ${desktopFontCount} font ${desktopFontCount === 1 ? 'family' : 'families'} while mobile uses ${mobileFontCount}. Different fonts across viewports can weaken brand identity.`
    });
  } else if (desktopFontCount === mobileFontCount) {
    insights.push({
      type: 'success',
      icon: '✅',
      title: 'Consistent typography',
      description: `Both viewports use ${desktopFontCount} font ${desktopFontCount === 1 ? 'family' : 'families'}, showing strong typographic consistency.`
    });
  }

  // Complexity assessment
  const avgColors = (desktopColorCount + mobileColorCount) / 2;
  const avgFonts = (desktopFontCount + mobileFontCount) / 2;

  if (avgColors > 25) {
    insights.push({
      type: 'info',
      icon: '💡',
      title: 'High color complexity',
      description: `Your site uses ~${Math.round(avgColors)} colors on average. Professional brands typically use 5-10 core colors. Consider creating a focused color system.`
    });
  }

  if (avgFonts > 5) {
    insights.push({
      type: 'info',
      icon: '💡',
      title: 'Multiple font families',
      description: `Your site uses ~${Math.round(avgFonts)} font families on average. Best practice is 2-3 fonts (one for headings, one for body, optional accent). Too many fonts can dilute brand identity.`
    });
  }

  if (insights.length === 0) {
    return '';
  }

  return `
    <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px;">
      <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px;">Design System Insights</h3>
      <div style="display: grid; gap: 12px;">
        ${insights.map(insight => `
          <div style="background: var(--bg-primary); padding: 16px; border-radius: 8px; border-left: 4px solid ${
            insight.type === 'success' ? '#4CAF50' :
            insight.type === 'warning' ? '#FFA500' :
            '#667eea'
          };">
            <div style="display: flex; align-items: start; gap: 12px;">
              <span style="font-size: 1.5rem;">${insight.icon}</span>
              <div>
                <div style="font-weight: 600; margin-bottom: 6px;">${insight.title}</div>
                <div style="font-size: 0.9rem; opacity: 0.8; line-height: 1.5;">${insight.description}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
