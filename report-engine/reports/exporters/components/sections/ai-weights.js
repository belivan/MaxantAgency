/**
 * AI Weights & Reasoning Section
 * Displays AI-calculated category weights and reasoning
 */

export function generateAIWeights(analysisResult, synthesisData, options) {
  const {
    ai_category_weights,
    ai_weights_reasoning,
    design_score,
    seo_score,
    content_score,
    social_score
  } = analysisResult;

  // If no AI weights data available, return empty string
  if (!ai_category_weights && !ai_weights_reasoning) {
    return '';
  }

  const weights = ai_category_weights || {
    design: 30,
    seo: 30,
    content: 20,
    social: 20
  };

  const scores = {
    design: design_score,
    seo: seo_score,
    content: content_score,
    social: social_score
  };

  const categories = [
    { key: 'design', label: 'Design & UX', icon: '🎨', description: 'Visual design, usability, and mobile optimization' },
    { key: 'seo', label: 'SEO & Technical', icon: '🔍', description: 'Search optimization and technical foundation' },
    { key: 'content', label: 'Content & Messaging', icon: '✍️', description: 'Copy quality and messaging effectiveness' },
    { key: 'social', label: 'Social Proof', icon: '⭐', description: 'Reviews, testimonials, and trust signals' }
  ];

  return `
    <section class="section" id="ai-weights">
      <div class="section-header">
        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">
          <span class="section-title-icon">🤖</span>
          AI-Calculated Category Weights
        </h2>
        <p class="section-description">Our AI dynamically adjusts category importance based on industry context, competitive landscape, and business goals.</p>
      </div>

      ${ai_weights_reasoning ? `
        <div style="background: linear-gradient(135deg, #667eea22 0%, #764ba211 100%); padding: 24px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #667eea;">
          <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span>💡</span>
            <span>AI Reasoning</span>
          </h3>
          <p style="line-height: 1.6; opacity: 0.9;">${ai_weights_reasoning}</p>
        </div>
      ` : ''}

      <!-- Category Weights Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 24px;">
        ${categories.map(({ key, label, icon, description }) => {
          const weight = weights[key] || 0;
          const score = scores[key] || 0;
          const weightedContribution = Math.round((score * weight) / 100);

          return `
            <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; border-top: 4px solid var(--primary);">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <span style="font-size: 2rem;">${icon}</span>
                <div>
                  <div style="font-weight: 600; font-size: 1.1rem;">${label}</div>
                  <div style="font-size: 0.85rem; opacity: 0.7;">${description}</div>
                </div>
              </div>

              <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
                <div style="font-size: 2.5rem; font-weight: bold; line-height: 1;">${weight}%</div>
                <div style="font-size: 0.9rem; opacity: 0.7;">weight</div>
              </div>

              <div style="background: var(--bg-primary); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-size: 0.85rem; opacity: 0.7;">Category Score:</span>
                  <span style="font-weight: 600;">${score}/100</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 0.85rem; opacity: 0.7;">Weighted Contribution:</span>
                  <span style="font-weight: 600; color: var(--primary);">${weightedContribution} pts</span>
                </div>
              </div>

              <div style="background: #E0E0E0; height: 10px; border-radius: 5px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%); height: 100%; width: ${weight}%; transition: width 0.3s ease;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Weighted Score Calculation -->
      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px;">
        <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px;">How The Overall Score Is Calculated</h3>
        <div style="font-family: 'Courier New', monospace; background: var(--bg-primary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          ${categories.map(({ key, label }) => {
            const weight = weights[key] || 0;
            const score = scores[key] || 0;
            const contribution = Math.round((score * weight) / 100);
            return `<div style="margin-bottom: 8px;">${label.padEnd(20)} = ${score} × ${weight}% = <strong>${contribution} pts</strong></div>`;
          }).join('')}
          <div style="border-top: 2px solid var(--border-default); margin: 12px 0; padding-top: 12px;">
            <strong>Overall Score = ${Math.round(
              categories.reduce((sum, { key }) => {
                return sum + ((scores[key] || 0) * (weights[key] || 0)) / 100;
              }, 0)
            )} / 100</strong>
          </div>
        </div>
        <p style="font-size: 0.9rem; opacity: 0.7; line-height: 1.6;">
          Unlike generic audits that treat all categories equally, our AI adjusts the weight of each category based on your industry and competitive context.
          For example, e-commerce sites might weight design higher, while B2B services might prioritize content and social proof.
        </p>
      </div>
    </section>
  `;
}
