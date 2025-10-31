/**
 * Score Breakdown Section Component
 *
 * Displays how the overall score was calculated with:
 * - Weight reasoning explanation
 * - Visual pie chart showing weight distribution
 * - Horizontal bar charts for each dimension
 */

import { escapeHtml } from '../utils/helpers.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load standard grading weights
let standardWeights = null;
let weightDescriptions = null;

function loadStandardWeights() {
  if (!standardWeights) {
    try {
      const weightsPath = join(__dirname, '../../../../config/weights.json');
      const weightsData = JSON.parse(readFileSync(weightsPath, 'utf-8'));
      standardWeights = weightsData.weights;
      weightDescriptions = weightsData.weightsDescription;
    } catch (error) {
      console.warn('⚠️  Could not load standard weights, using hardcoded defaults:', error.message);
      // Fallback to hardcoded weights
      standardWeights = {
        design: 0.25,
        seo: 0.25,
        performance: 0.20,
        content: 0.15,
        accessibility: 0.10,
        social: 0.05
      };
      weightDescriptions = {
        design: "Design and UX quality - most visible to visitors",
        seo: "Technical SEO - determines search visibility",
        performance: "Page speed and Core Web Vitals",
        content: "Content quality and completeness",
        accessibility: "ADA compliance and usability",
        social: "Social media presence"
      };
    }
  }
  return { standardWeights, weightDescriptions };
}

/**
 * Generate Score Breakdown / Grading Methodology Section
 * @param {Object} analysisResult - Complete analysis data
 * @param {Object} synthesisData - AI synthesis data (if available)
 * @param {Object} options - Configuration options
 * @returns {string} HTML section
 */
export function generateScoreBreakdownSection(analysisResult, synthesisData = null, options = {}) {
  const { reportType = 'full' } = options;
  let { weight_reasoning, weights } = analysisResult;

  // If no AI grading weights, use standard weights
  const usingAIGrading = !!(weight_reasoning && weights);

  if (!weights) {
    const { standardWeights: stdWeights, weightDescriptions: stdDescriptions } = loadStandardWeights();
    weights = stdWeights;

    // Generate standard reasoning if not using AI grading
    if (!weight_reasoning) {
      weight_reasoning = "This score was calculated using our standard grading methodology, which weighs Design and SEO most heavily (25% each), followed by Performance (20%), Content (15%), Accessibility (10%), and Social Media presence (5%). These weights reflect what typically matters most for business websites.";
    }
  }

  let html = '';
  html += '<!-- Score Breakdown / How We Calculated -->\n';
  html += '<div style="background: var(--bg-secondary); padding: 32px; border-radius: 16px; margin-bottom: 48px; border: 1px solid var(--border-light);">\n';
  html += '  <h2 style="font-size: 1.8rem; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 12px;"><span>⚖️</span> How We Calculated Your Score</h2>\n';
  html += `  <p style="font-size: 15px; opacity: 0.8; line-height: 1.8; margin-bottom: 24px;">${escapeHtml(weight_reasoning)}</p>\n`;

  // Prepare weight data
  const weightEntries = Object.entries(weights).filter(([_, value]) => value > 0);
  const weightLabels = {
    design: { label: 'Design', icon: '🎨', color: '#4F46E5' },
    seo: { label: 'SEO', icon: '🔍', color: '#0891B2' },
    content: { label: 'Content', icon: '✍️', color: '#059669' },
    performance: { label: 'Performance', icon: '⚡', color: '#D97706' },
    social: { label: 'Social', icon: '📱', color: '#DC2626' },
    accessibility: { label: 'Accessibility', icon: '♿', color: '#8B5CF6' }
  };

  // Add pie chart and horizontal bars side-by-side
  html += '  <div style="display: grid; grid-template-columns: minmax(300px, 400px) 1fr; gap: 32px; align-items: center; margin-bottom: 12px;">\n';

  // Pie chart (SVG)
  html += '    <div style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 12px;">\n';
  html += '      <svg viewBox="0 0 200 200" style="width: 100%; max-width: 400px; margin: 0 auto; display: block; transform: rotate(-90deg);">\n';

  // Calculate pie slices
  let cumulativePercent = 0;

  weightEntries.forEach(([dimension, weight], index) => {
    const percent = weight * 100;
    const dimInfo = weightLabels[dimension] || { label: dimension, color: '#666666' };

    // Calculate start and end angles
    const startAngle = (cumulativePercent / 100) * 360;
    const endAngle = ((cumulativePercent + percent) / 100) * 360;

    // Convert to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Calculate coordinates (center at 100, 100, radius 80)
    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);

    const largeArc = percent > 50 ? 1 : 0;

    html += `        <path d="M 100,100 L ${x1},${y1} A 80,80 0 ${largeArc},1 ${x2},${y2} Z" fill="${dimInfo.color}" opacity="0.9" stroke="white" stroke-width="1.5"/>\n`;

    cumulativePercent += percent;
  });

  html += '        <circle cx="100" cy="100" r="35" fill="var(--bg-secondary)" />\n';
  html += '      </svg>\n';
  html += '      <div style="text-align: center; font-size: 15px; font-weight: 600; color: var(--text-primary); margin-top: 4px;">Weight Distribution</div>\n';
  html += '    </div>\n';

  // Display weights as horizontal bars
  html += '    <div style="display: grid; gap: 14px;">\n';

  weightEntries.forEach(([dimension, weight]) => {
    const weightPercent = Math.round(weight * 100);
    const dimInfo = weightLabels[dimension] || { label: dimension, icon: '📊' };

    html += '    <div style="display: grid; grid-template-columns: 140px 1fr 70px; gap: 16px; align-items: center;">\n';
    html += `      <div style="font-size: 15px; font-weight: 500; display: flex; align-items: center; gap: 8px;"><span style="font-size: 18px;">${dimInfo.icon}</span><span>${dimInfo.label}</span></div>\n`;
    html += `      <div style="background: var(--bg-tertiary); border-radius: 8px; height: 20px; position: relative; overflow: hidden; border: 1px solid var(--border-light);">\n`;
    html += `        <div style="background: ${dimInfo.color}; height: 100%; width: ${weightPercent}%; border-radius: 6px; opacity: 0.9;"></div>\n`;
    html += '      </div>\n';
    html += `      <div style="text-align: right; font-size: 16px; font-weight: 600;">${weightPercent}%</div>\n`;
    html += '    </div>\n';
  });

  html += '    </div>\n'; // Close horizontal bars div
  html += '  </div>\n';   // Close grid container
  html += '</div>\n\n';    // Close section

  return html;
}
