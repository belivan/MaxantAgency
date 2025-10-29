/**
 * Design System Section - Displays extracted design tokens (fonts & colors)
 *
 * Shows typography analysis, color palette, and consistency between desktop/mobile
 */

/**
 * Generate Design System section for HTML reports
 *
 * @param {object} leadData - Lead data with design tokens
 * @returns {string} HTML for design system section
 */
export function generateDesignSystemSection(leadData) {
  const desktopTokens = leadData.design_tokens_desktop || { fonts: [], colors: [] };
  const mobileTokens = leadData.design_tokens_mobile || { fonts: [], colors: [] };

  // If no design tokens, return empty
  if ((!desktopTokens.fonts || desktopTokens.fonts.length === 0) &&
      (!desktopTokens.colors || desktopTokens.colors.length === 0)) {
    return '';
  }

  // Calculate consistency score
  const consistencyScore = calculateConsistencyScore(desktopTokens, mobileTokens);
  const consistencyLevel = consistencyScore >= 80 ? 'Excellent' :
                           consistencyScore >= 60 ? 'Good' :
                           consistencyScore >= 40 ? 'Fair' : 'Poor';

  // Get design system issues
  const issues = analyzeDesignSystem(desktopTokens, mobileTokens);

  return `
    <section class="design-system-section">
      <h2 class="section-title">
        <span class="icon">🎨</span>
        Design System Analysis
      </h2>

      <div class="consistency-score">
        <h3>Design Consistency Score: ${consistencyScore}/100</h3>
        <div class="score-bar">
          <div class="score-fill" style="width: ${consistencyScore}%"></div>
        </div>
        <p class="score-level ${consistencyLevel.toLowerCase()}">${consistencyLevel} - ${getConsistencyDescription(consistencyScore)}</p>
      </div>

      ${issues.length > 0 ? `
        <div class="design-issues">
          <h3>⚠️ Design System Issues</h3>
          <ul class="issue-list">
            ${issues.map(issue => `<li class="${issue.severity}">${issue.message}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="design-tokens-grid">
        <!-- Typography Section -->
        <div class="token-section typography-section">
          <h3>📝 Typography</h3>

          <div class="viewport-comparison">
            <div class="viewport desktop">
              <h4>Desktop</h4>
              ${generateFontList(desktopTokens.fonts, 'desktop')}
            </div>

            <div class="viewport mobile">
              <h4>Mobile</h4>
              ${generateFontList(mobileTokens.fonts, 'mobile')}
            </div>
          </div>

          ${generateFontSummary(desktopTokens.fonts, mobileTokens.fonts)}
        </div>

        <!-- Color Palette Section -->
        <div class="token-section color-section">
          <h3>🎨 Color Palette</h3>

          <div class="viewport-comparison">
            <div class="viewport desktop">
              <h4>Desktop (Top 10)</h4>
              ${generateColorPalette(desktopTokens.colors, 'desktop')}
            </div>

            <div class="viewport mobile">
              <h4>Mobile (Top 10)</h4>
              ${generateColorPalette(mobileTokens.colors, 'mobile')}
            </div>
          </div>

          ${generateColorSummary(desktopTokens.colors, mobileTokens.colors)}
        </div>
      </div>

      <style>
        .design-system-section {
          margin: 2rem 0;
          padding: 2rem;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .section-title {
          font-size: 1.8rem;
          margin-bottom: 1.5rem;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .consistency-score {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #f8fafc;
          border-radius: 6px;
        }

        .consistency-score h3 {
          margin-bottom: 1rem;
          color: #334155;
        }

        .score-bar {
          height: 24px;
          background: #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .score-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%);
          transition: width 0.3s ease;
        }

        .score-level {
          font-size: 0.95rem;
          font-weight: 500;
          margin-top: 0.5rem;
        }

        .score-level.excellent { color: #10b981; }
        .score-level.good { color: #3b82f6; }
        .score-level.fair { color: #f59e0b; }
        .score-level.poor { color: #ef4444; }

        .design-issues {
          margin: 1.5rem 0;
          padding: 1rem;
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          border-radius: 4px;
        }

        .design-issues h3 {
          color: #991b1b;
          margin-bottom: 0.75rem;
        }

        .issue-list {
          list-style: none;
          padding: 0;
        }

        .issue-list li {
          padding: 0.5rem 0;
          color: #7f1d1d;
          font-size: 0.9rem;
        }

        .issue-list li.high::before {
          content: '🔴 ';
        }

        .issue-list li.medium::before {
          content: '🟡 ';
        }

        .design-tokens-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          margin-top: 2rem;
        }

        .token-section {
          padding: 1.5rem;
          background: #f8fafc;
          border-radius: 6px;
        }

        .token-section h3 {
          margin-bottom: 1rem;
          color: #1e293b;
        }

        .viewport-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .viewport h4 {
          font-size: 0.9rem;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 0.75rem;
          letter-spacing: 0.05em;
        }

        .font-list {
          list-style: none;
          padding: 0;
        }

        .font-item {
          padding: 0.75rem;
          background: #ffffff;
          border-radius: 4px;
          margin-bottom: 0.5rem;
          border: 1px solid #e2e8f0;
        }

        .font-family {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }

        .font-details {
          font-size: 0.85rem;
          color: #64748b;
        }

        .color-palette {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 0.75rem;
        }

        .color-swatch {
          aspect-ratio: 1;
          border-radius: 6px;
          border: 2px solid #e2e8f0;
          position: relative;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .color-label {
          position: absolute;
          bottom: -24px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 0.7rem;
          color: #64748b;
          font-family: monospace;
        }

        .color-usage {
          position: absolute;
          top: 4px;
          right: 4px;
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .summary-box {
          margin-top: 1rem;
          padding: 1rem;
          background: #ffffff;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
        }

        .summary-box h4 {
          font-size: 0.95rem;
          margin-bottom: 0.5rem;
          color: #334155;
        }

        .summary-box p {
          font-size: 0.9rem;
          color: #64748b;
          line-height: 1.6;
        }

        .summary-stat {
          display: inline-block;
          margin-right: 1rem;
          font-weight: 600;
          color: #1e293b;
        }

        @media (max-width: 768px) {
          .viewport-comparison {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </section>
  `;
}

/**
 * Generate font list HTML
 */
function generateFontList(fonts, viewport) {
  if (!fonts || fonts.length === 0) {
    return '<p style="color: #94a3b8; font-style: italic;">No fonts detected</p>';
  }

  const topFonts = fonts.slice(0, 10);

  return `
    <ul class="font-list">
      ${topFonts.map((font, index) => {
        const percentage = fonts.length > 0 ? ((font.usage / fonts[0].usage) * 100).toFixed(0) : 0;
        return `
          <li class="font-item">
            <div class="font-family">${index + 1}. ${font.family}</div>
            <div class="font-details">
              Sizes: ${font.sizes.slice(0, 5).join(', ')}${font.sizes.length > 5 ? '...' : ''}<br>
              Weights: ${font.weights.join(', ')} | Usage: ${font.usage} instances (${percentage}%)
            </div>
          </li>
        `;
      }).join('')}
    </ul>
  `;
}

/**
 * Generate color palette HTML
 */
function generateColorPalette(colors, viewport) {
  if (!colors || colors.length === 0) {
    return '<p style="color: #94a3b8; font-style: italic;">No colors detected</p>';
  }

  const topColors = colors.slice(0, 10);

  return `
    <div class="color-palette">
      ${topColors.map(color => `
        <div class="color-swatch" style="background-color: ${color.hex}">
          <span class="color-usage">${color.usage}</span>
          <div class="color-label">${color.hex}</div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Generate font summary
 */
function generateFontSummary(desktopFonts, mobileFonts) {
  const desktopCount = desktopFonts?.length || 0;
  const mobileCount = mobileFonts?.length || 0;

  const desktopFamilies = new Set(desktopFonts?.map(f => f.family) || []);
  const mobileFamilies = new Set(mobileFonts?.map(f => f.family) || []);
  const sharedFonts = [...desktopFamilies].filter(f => mobileFamilies.has(f));

  return `
    <div class="summary-box">
      <h4>Typography Summary</h4>
      <p>
        <span class="summary-stat">Desktop: ${desktopCount} fonts</span>
        <span class="summary-stat">Mobile: ${mobileCount} fonts</span>
        <span class="summary-stat">Shared: ${sharedFonts.length} fonts</span>
      </p>
      <p>
        ${desktopCount > 3 ? '⚠️ Too many font families detected. Professional sites use 2-3 fonts maximum.' : '✅ Font count is reasonable.'}
        ${sharedFonts.length === desktopFamilies.size && sharedFonts.length === mobileFamilies.size ? '✅ Consistent fonts across viewports.' : '⚠️ Different fonts between desktop and mobile may indicate inconsistent branding.'}
      </p>
    </div>
  `;
}

/**
 * Generate color summary
 */
function generateColorSummary(desktopColors, mobileColors) {
  const desktopCount = desktopColors?.length || 0;
  const mobileCount = mobileColors?.length || 0;

  const desktopHexes = new Set(desktopColors?.map(c => c.hex) || []);
  const mobileHexes = new Set(mobileColors?.map(c => c.hex) || []);
  const sharedColors = [...desktopHexes].filter(h => mobileHexes.has(h));

  return `
    <div class="summary-box">
      <h4>Color Palette Summary</h4>
      <p>
        <span class="summary-stat">Desktop: ${desktopCount} colors</span>
        <span class="summary-stat">Mobile: ${mobileCount} colors</span>
        <span class="summary-stat">Shared: ${sharedColors.length} colors</span>
      </p>
      <p>
        ${desktopCount > 8 ? '⚠️ Too many colors detected. Professional brands use 3-5 core colors + variations.' : '✅ Color count is reasonable.'}
        ${sharedColors.length / Math.max(desktopHexes.size, 1) < 0.7 ? '⚠️ Significant color differences between desktop and mobile.' : '✅ Consistent color palette across viewports.'}
      </p>
    </div>
  `;
}

/**
 * Calculate consistency score between desktop and mobile
 */
function calculateConsistencyScore(desktopTokens, mobileTokens) {
  let score = 100;

  // Font consistency
  const desktopFonts = new Set(desktopTokens.fonts?.map(f => f.family) || []);
  const mobileFonts = new Set(mobileTokens.fonts?.map(f => f.family) || []);
  const sharedFonts = [...desktopFonts].filter(f => mobileFonts.has(f));

  const fontConsistency = desktopFonts.size > 0 ? (sharedFonts.length / desktopFonts.size) : 1;
  score -= (1 - fontConsistency) * 30; // Max 30 point penalty

  // Color consistency
  const desktopColors = new Set(desktopTokens.colors?.map(c => c.hex) || []);
  const mobileColors = new Set(mobileTokens.colors?.map(c => c.hex) || []);
  const sharedColors = [...desktopColors].filter(h => mobileColors.has(h));

  const colorConsistency = desktopColors.size > 0 ? (sharedColors.length / desktopColors.size) : 1;
  score -= (1 - colorConsistency) * 30; // Max 30 point penalty

  // Penalty for too many fonts
  if (desktopFonts.size > 3) {
    score -= (desktopFonts.size - 3) * 5; // 5 points per extra font
  }

  // Penalty for too many colors
  if (desktopColors.size > 8) {
    score -= Math.min((desktopColors.size - 8) * 2, 20); // Max 20 point penalty
  }

  return Math.max(0, Math.round(score));
}

/**
 * Get consistency description
 */
function getConsistencyDescription(score) {
  if (score >= 80) return 'Strong design system with consistent fonts and colors';
  if (score >= 60) return 'Good design consistency with minor inconsistencies';
  if (score >= 40) return 'Moderate inconsistencies in design system';
  return 'Significant design system issues detected';
}

/**
 * Analyze design system for issues
 */
function analyzeDesignSystem(desktopTokens, mobileTokens) {
  const issues = [];

  // Font issues
  const desktopFonts = new Set(desktopTokens.fonts?.map(f => f.family) || []);
  const mobileFonts = new Set(mobileTokens.fonts?.map(f => f.family) || []);

  if (desktopFonts.size > 3) {
    issues.push({
      severity: 'high',
      message: `${desktopFonts.size} font families detected on desktop. Professional sites use 2-3 fonts maximum. This creates visual chaos and slows page load.`
    });
  }

  if (desktopFonts.size > 5) {
    issues.push({
      severity: 'high',
      message: `Loading ${desktopFonts.size} fonts adds significant page load time (estimated ${Math.round(desktopFonts.size * 150)}ms - ${Math.round(desktopFonts.size * 300)}ms delay).`
    });
  }

  const sharedFonts = [...desktopFonts].filter(f => mobileFonts.has(f));
  if (sharedFonts.length / Math.max(desktopFonts.size, 1) < 0.5) {
    issues.push({
      severity: 'medium',
      message: `Different font families used on desktop vs mobile. This suggests inconsistent branding across devices.`
    });
  }

  // Color issues
  const desktopColors = desktopTokens.colors?.length || 0;
  const mobileColors = mobileTokens.colors?.length || 0;

  if (desktopColors > 8) {
    issues.push({
      severity: 'medium',
      message: `${desktopColors} unique colors detected on desktop. Professional brands use 3-5 core colors. Too many colors suggests no design system.`
    });
  }

  // Check for similar colors (potential sloppy design)
  const similarColors = findSimilarColors(desktopTokens.colors || []);
  if (similarColors.length > 3) {
    issues.push({
      severity: 'medium',
      message: `${similarColors.length} groups of similar colors detected (e.g., multiple shades of the same color). This indicates sloppy color management.`
    });
  }

  return issues;
}

/**
 * Find similar colors (within 10 units in hex)
 */
function findSimilarColors(colors) {
  const similarGroups = [];
  const processed = new Set();

  for (let i = 0; i < colors.length; i++) {
    if (processed.has(i)) continue;

    const group = [colors[i]];
    processed.add(i);

    for (let j = i + 1; j < colors.length; j++) {
      if (processed.has(j)) continue;

      if (areColorsSimilar(colors[i].hex, colors[j].hex)) {
        group.push(colors[j]);
        processed.add(j);
      }
    }

    if (group.length > 1) {
      similarGroups.push(group);
    }
  }

  return similarGroups;
}

/**
 * Check if two colors are similar
 */
function areColorsSimilar(hex1, hex2, threshold = 20) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  if (!rgb1 || !rgb2) return false;

  const diff = Math.abs(rgb1.r - rgb2.r) + Math.abs(rgb1.g - rgb2.g) + Math.abs(rgb1.b - rgb2.b);
  return diff < threshold;
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
