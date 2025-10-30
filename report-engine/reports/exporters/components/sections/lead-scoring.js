/**
 * Lead Scoring Dashboard Section
 * Displays AI-calculated lead scoring across 6 dimensions
 */

export function generateLeadScoringDashboard(analysisResult, synthesisData, options) {
  const {
    overall_lead_score,
    pain_score,
    budget_score,
    authority_score,
    need_score,
    timing_score,
    fit_score,
    priority_tier
  } = analysisResult;

  // If no scoring data available, return empty string
  if (!overall_lead_score && !pain_score) {
    return '';
  }

  const scores = [
    { label: 'Pain', value: pain_score, icon: '🔥', description: 'Level of business pain/problems' },
    { label: 'Budget', value: budget_score, icon: '💰', description: 'Budget indicators and financial capacity' },
    { label: 'Authority', value: authority_score, icon: '👔', description: 'Decision-maker accessibility' },
    { label: 'Need', value: need_score, icon: '🎯', description: 'Strategic need for improvement' },
    { label: 'Timing', value: timing_score, icon: '⏰', description: 'Urgency and timing signals' },
    { label: 'Fit', value: fit_score, icon: '✅', description: 'Fit with our service offering' }
  ];

  const tierColors = {
    hot: '#FF6B6B',
    warm: '#FFA500',
    cold: '#4ECDC4'
  };

  const tierLabels = {
    hot: '🔥 Hot Lead',
    warm: '🌡️ Warm Lead',
    cold: '❄️ Cold Lead'
  };

  const tierColor = tierColors[priority_tier] || '#888';
  const tierLabel = tierLabels[priority_tier] || priority_tier;

  return `
    <section class="section" id="lead-scoring">
      <div class="section-header">
        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">
          <span class="section-title-icon">📊</span>
          Lead Scoring & Qualification
        </h2>
        <p class="section-description">AI-powered lead qualification using BANT+ framework (Budget, Authority, Need, Timing, Pain, Fit).</p>
      </div>

      <!-- Overall Score Card -->
      <div style="background: linear-gradient(135deg, ${tierColor}22 0%, ${tierColor}11 100%); padding: 32px; border-radius: 16px; margin-bottom: 32px; border: 2px solid ${tierColor};">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 24px;">
          <div>
            <div style="font-size: 0.9rem; opacity: 0.7; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Overall Lead Score</div>
            <div style="font-size: 4rem; font-weight: bold; line-height: 1; margin-bottom: 8px;">${overall_lead_score || 0}<span style="font-size: 2rem; opacity: 0.6;">/100</span></div>
            <div style="font-size: 1.2rem; font-weight: 600; color: ${tierColor};">${tierLabel}</div>
          </div>
          <div style="width: 160px; height: 160px; position: relative;">
            <svg viewBox="0 0 100 100" style="transform: rotate(-90deg);">
              <!-- Background circle -->
              <circle cx="50" cy="50" r="40" fill="none" stroke="#E0E0E0" stroke-width="8"/>
              <!-- Progress circle -->
              <circle cx="50" cy="50" r="40" fill="none" stroke="${tierColor}" stroke-width="8"
                      stroke-dasharray="${(overall_lead_score || 0) * 2.51} 251.2"
                      stroke-linecap="round"/>
            </svg>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2rem;">
              ${priority_tier === 'hot' ? '🔥' : priority_tier === 'warm' ? '🌡️' : '❄️'}
            </div>
          </div>
        </div>
      </div>

      <!-- BANT+ Scoring Breakdown -->
      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px;">
        <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 24px;">BANT+ Dimension Scores</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
          ${scores.map(({ label, value, icon, description }) => {
            if (value === null || value === undefined) return '';

            const percentage = value;
            const barColor = value >= 70 ? '#4CAF50' : value >= 40 ? '#FFA500' : '#FF6B6B';

            return `
              <div style="background: var(--bg-primary); padding: 20px; border-radius: 10px; border-left: 4px solid ${barColor};">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 1.5rem;">${icon}</span>
                    <span style="font-weight: 600; font-size: 1.1rem;">${label}</span>
                  </div>
                  <span style="font-size: 1.4rem; font-weight: bold;">${value}</span>
                </div>
                <div style="font-size: 0.85rem; opacity: 0.7; margin-bottom: 10px;">${description}</div>
                <div style="background: #E0E0E0; height: 8px; border-radius: 4px; overflow: hidden;">
                  <div style="background: ${barColor}; height: 100%; width: ${percentage}%; transition: width 0.3s ease;"></div>
                </div>
              </div>
            `;
          }).filter(Boolean).join('')}
        </div>
      </div>

      <!-- Qualification Summary -->
      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-top: 24px;">
        <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px;">What This Means</h3>
        <div style="display: grid; gap: 12px;">
          ${priority_tier === 'hot' ? `
            <div style="padding: 16px; background: #FF6B6B22; border-radius: 8px; border-left: 4px solid #FF6B6B;">
              <strong>🔥 High Priority Lead:</strong> This prospect shows strong buying signals across multiple dimensions. They have clear pain points, likely budget authority, and demonstrate urgency. Prioritize outreach within 24-48 hours.
            </div>
          ` : priority_tier === 'warm' ? `
            <div style="padding: 16px; background: #FFA50022; border-radius: 8px; border-left: 4px solid #FFA500;">
              <strong>🌡️ Moderate Priority Lead:</strong> This prospect shows some positive indicators but may need nurturing. They have identifiable needs but timing or authority may need clarification. Engage with targeted content and follow up within 1 week.
            </div>
          ` : `
            <div style="padding: 16px; background: #4ECDC422; border-radius: 8px; border-left: 4px solid #4ECDC4;">
              <strong>❄️ Lower Priority Lead:</strong> This prospect may need significant education or may not be ready to buy. Consider adding to a nurture campaign and check back quarterly.
            </div>
          `}
          <div style="padding: 16px; background: var(--bg-primary); border-radius: 8px;">
            <strong>Next Steps:</strong> Review the dimensional scores above to understand where this lead is strong (use in messaging) and where they're weak (address in discovery calls or nurture content).
          </div>
        </div>
      </div>
    </section>
  `;
}
