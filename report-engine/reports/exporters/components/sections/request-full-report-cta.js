/**
 * Request Full Report CTA Section Component
 * Displays a motivational call-to-action in preview reports to encourage requesting the full report
 */

/**
 * Generate Request Full Report CTA section
 * @param {Object} analysisResult - Complete analysis data
 * @param {Object} synthesisData - Synthesis data (if available)
 * @param {Object} options - Configuration options
 * @returns {string} HTML section
 */
export function generateRequestFullReportCTA(analysisResult, synthesisData = null, options = {}) {
  let html = '';

  html += '    <!-- Request Full Report CTA -->\n';
  html += '    <section class="section" id="request-full-report-cta">\n';
  html += '      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 48px 32px; border-radius: 16px; text-align: center; color: white; box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3);">\n';

  // Headline
  html += '        <div style="font-size: 2rem; font-weight: 700; margin-bottom: 16px;">\n';
  html += '          🚀 Ready to Transform Your Website?\n';
  html += '        </div>\n';

  // Subheadline
  html += '        <div style="font-size: 1.1rem; margin-bottom: 32px; opacity: 0.95; line-height: 1.6;">\n';
  html += '          This preview shows your website\'s current state. The full report includes everything you need to make data-driven improvements.\n';
  html += '        </div>\n';

  // What's in the full report
  html += '        <div style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); padding: 32px; border-radius: 12px; margin-bottom: 32px; text-align: left; max-width: 700px; margin-left: auto; margin-right: auto;">\n';
  html += '          <h3 style="font-size: 1.4rem; font-weight: 600; margin-bottom: 20px; text-align: center;">The Full Report Includes:</h3>\n';
  html += '          <div style="display: grid; gap: 16px;">\n';

  const features = [
    { icon: '📊', title: 'Complete Issue Breakdown', desc: 'Every design, SEO, and technical issue identified and categorized by priority with clear fix recommendations' },
    { icon: '📈', title: 'Industry Benchmark Comparison', desc: 'Side-by-side visual comparison with top-performing websites in your industry showing what excellence looks like' },
    { icon: '⚡', title: 'Performance Deep Dive', desc: 'PageSpeed Insights, Core Web Vitals analysis, and specific strategies to make your site lightning-fast' },
    { icon: '♿', title: 'Accessibility Compliance Audit', desc: 'WCAG compliance report with violations identified and clear remediation steps to reach more customers' },
    { icon: '🔧', title: 'Technical Stack Analysis', desc: 'Complete technology breakdown revealing modernization opportunities and security improvements' },
    { icon: '💼', title: 'Competitive Intelligence', desc: 'Market positioning analysis showing how your site compares to industry leaders and what they\'re doing differently' },
    { icon: '📸', title: 'Multi-Page Visual Evidence', desc: 'Screenshots from every analyzed page showing exactly what visitors see on desktop and mobile' },
    { icon: '🎨', title: 'Design System Extraction', desc: 'Your brand\'s color palette, typography, and design tokens analyzed for consistency and professional impact' },
    { icon: '⚖️', title: 'Transparent Scoring Methodology', desc: 'Understand exactly how your grade was calculated with AI-powered weighting tailored to your industry' }
  ];

  features.forEach(feature => {
    html += '            <div style="display: flex; gap: 12px; align-items: start; padding: 12px; background: rgba(255, 255, 255, 0.1); border-radius: 8px;">\n';
    html += `              <div style="font-size: 1.5rem; flex-shrink: 0;">${feature.icon}</div>\n`;
    html += '              <div>\n';
    html += `                <div style="font-weight: 600; margin-bottom: 4px;">${feature.title}</div>\n`;
    html += `                <div style="font-size: 0.9rem; opacity: 0.9;">${feature.desc}</div>\n`;
    html += '              </div>\n';
    html += '            </div>\n';
  });

  html += '          </div>\n';
  html += '        </div>\n';

  // CTA Text
  html += '        <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 12px;">\n';
  html += '          Request your comprehensive analysis today\n';
  html += '        </div>\n';
  html += '        <div style="font-size: 0.95rem; opacity: 0.9;">\n';
  html += '          Contact us to receive the full 20+ page detailed report with actionable insights\n';
  html += '        </div>\n';

  html += '      </div>\n';
  html += '    </section>\n\n';

  return html;
}
