/**
 * Hero Section / Executive Dashboard
 * Displays company info, grade, scores, and contact/social links
 */

import { escapeHtml, getGradeColor } from '../utils/helpers.js';

export function generateHeroSection(analysisResult, synthesisData = null, options = {}) {
  const { reportType = 'full' } = options;

  const {
    company_name,
    industry,
    city,
    state,
    grade,
    overall_score,
    design_score,
    seo_score,
    performance_score,
    content_score,
    accessibility_score,
    social_score,
    contact_email,
    contact_phone,
    url,
    social_profiles,
    matched_benchmark
  } = analysisResult;

  let html = '<!-- Executive Dashboard -->\n';
  html += '<div class="hero-section">\n';
  html += '  <div class="container">\n';
  html += '    <div class="hero-content">\n';

  // Header with company name and metadata
  html += '      <div class="hero-header">\n';
  html += `        <h1 class="company-name">${escapeHtml(company_name)}</h1>\n`;

  // Location and industry metadata
  const metaParts = [];
  if (city && state) {
    metaParts.push(`${escapeHtml(city)}, ${escapeHtml(state.toUpperCase())}`);
  } else if (city) {
    metaParts.push(escapeHtml(city));
  }
  if (industry) {
    const capitalizedIndustry = industry.charAt(0).toUpperCase() + industry.slice(1);
    metaParts.push(escapeHtml(capitalizedIndustry));
  }

  if (metaParts.length > 0) {
    html += `        <p class="company-meta">${metaParts.join(' • ')}</p>\n`;
  } else {
    html += `        <p class="company-meta">Website Performance Analysis</p>\n`;
  }

  // Contact information box
  if (contact_email || contact_phone || url) {
    html += '        <div class="contact-info-box" style="margin-top: 24px; padding: 12px 20px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: var(--radius-lg); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); display: inline-block;">\n';
    html += '          <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: center;">\n';

    if (contact_email) {
      html += `            <a href="mailto:${escapeHtml(contact_email)}" style="color: var(--text-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-weight: 500; padding: 6px 12px; background: transparent; border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'">`;
      html += `<span style="font-size: 1.1em; opacity: 0.7;">📧</span><span>${escapeHtml(contact_email)}</span></a>\n`;
    }

    if (contact_phone) {
      const cleanPhone = contact_phone.replace(/\D/g, '');
      html += `            <a href="tel:${cleanPhone}" style="color: var(--text-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-weight: 500; padding: 6px 12px; background: transparent; border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'">`;
      html += `<span style="font-size: 1.1em; opacity: 0.7;">📞</span><span>${escapeHtml(contact_phone)}</span></a>\n`;
    }

    if (url) {
      const displayUrl = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      html += `            <a href="${escapeHtml(url)}" target="_blank" style="color: var(--text-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 8px; font-weight: 500; padding: 6px 12px; background: transparent; border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='transparent'">`;
      html += `<span style="font-size: 1.1em; opacity: 0.7;">🌐</span><span>${escapeHtml(displayUrl)}</span></a>\n`;
    }

    html += '          </div>\n';
    html += '        </div>\n';
  }

  // Social media links with modern SVG icons
  // Check if there are any non-null social media profiles
  const hasAnySocialProfiles = social_profiles && Object.keys(social_profiles).some(key => social_profiles[key]);

  if (hasAnySocialProfiles) {
    // SVG icon definitions
    const socialIcons = {
      facebook: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
      instagram: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
      twitter: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
      linkedin: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
      youtube: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
      tiktok: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
      pinterest: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>'
    };

    html += '        <div class="social-links-box" style="margin-top: 16px; display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">\n';

    if (social_profiles.facebook) {
      html += `          <a href="${escapeHtml(social_profiles.facebook)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 50%; color: var(--text-primary); text-decoration: none; transition: all 0.2s;" onmouseover="this.style.background='var(--primary-lightest)'; this.style.borderColor='var(--primary)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='var(--bg-secondary)'; this.style.borderColor='var(--border-light)'; this.style.transform='translateY(0)'" title="Facebook">${socialIcons.facebook}</a>\n`;
    }

    if (social_profiles.instagram) {
      html += `          <a href="${escapeHtml(social_profiles.instagram)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 50%; color: var(--text-primary); text-decoration: none; transition: all 0.2s;" onmouseover="this.style.background='var(--primary-lightest)'; this.style.borderColor='var(--primary)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='var(--bg-secondary)'; this.style.borderColor='var(--border-light)'; this.style.transform='translateY(0)'" title="Instagram">${socialIcons.instagram}</a>\n`;
    }

    if (social_profiles.twitter || social_profiles.x) {
      const urlTwitter = social_profiles.twitter || social_profiles.x;
      html += `          <a href="${escapeHtml(urlTwitter)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 50%; color: var(--text-primary); text-decoration: none; transition: all 0.2s;" onmouseover="this.style.background='var(--primary-lightest)'; this.style.borderColor='var(--primary)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='var(--bg-secondary)'; this.style.borderColor='var(--border-light)'; this.style.transform='translateY(0)'" title="Twitter/X">${socialIcons.twitter}</a>\n`;
    }

    if (social_profiles.linkedin) {
      html += `          <a href="${escapeHtml(social_profiles.linkedin)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 50%; color: var(--text-primary); text-decoration: none; transition: all 0.2s;" onmouseover="this.style.background='var(--primary-lightest)'; this.style.borderColor='var(--primary)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='var(--bg-secondary)'; this.style.borderColor='var(--border-light)'; this.style.transform='translateY(0)'" title="LinkedIn">${socialIcons.linkedin}</a>\n`;
    }

    if (social_profiles.youtube) {
      html += `          <a href="${escapeHtml(social_profiles.youtube)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 50%; color: var(--text-primary); text-decoration: none; transition: all 0.2s;" onmouseover="this.style.background='var(--primary-lightest)'; this.style.borderColor='var(--primary)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='var(--bg-secondary)'; this.style.borderColor='var(--border-light)'; this.style.transform='translateY(0)'" title="YouTube">${socialIcons.youtube}</a>\n`;
    }

    if (social_profiles.tiktok) {
      html += `          <a href="${escapeHtml(social_profiles.tiktok)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 50%; color: var(--text-primary); text-decoration: none; transition: all 0.2s;" onmouseover="this.style.background='var(--primary-lightest)'; this.style.borderColor='var(--primary)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='var(--bg-secondary)'; this.style.borderColor='var(--border-light)'; this.style.transform='translateY(0)'" title="TikTok">${socialIcons.tiktok}</a>\n`;
    }

    if (social_profiles.pinterest) {
      html += `          <a href="${escapeHtml(social_profiles.pinterest)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: 50%; color: var(--text-primary); text-decoration: none; transition: all 0.2s;" onmouseover="this.style.background='var(--primary-lightest)'; this.style.borderColor='var(--primary)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='var(--bg-secondary)'; this.style.borderColor='var(--border-light)'; this.style.transform='translateY(0)'" title="Pinterest">${socialIcons.pinterest}</a>\n`;
    }

    html += '        </div>\n';
  } else {
    // Show disclaimer when no social media profiles were found
    html += '        <div style="margin-top: 16px; padding: 12px 20px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: var(--radius-lg); text-align: center;">\n';
    html += '          <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary); opacity: 0.85;">\n';
    html += '            <span style="opacity: 0.6;">ℹ️</span> <strong style="color: var(--text-primary);">No Social Media Profiles Found</strong><br>\n';
    html += '            <span style="font-size: 0.85rem;">Our analysis used Google Maps data and AI-powered web scraping but could not identify any social media profiles for this business.</span>\n';
    html += '          </p>\n';
    html += '        </div>\n';
  }

  html += '      </div>\n';

  // Score Display Card
  html += '      <div class="score-card">\n';
  html += '        <div class="score-display-wrapper">\n';

  // Score Circle
  html += '          <div class="score-circle">\n';
  html += `            <div class="grade-letter">${grade}</div>\n`;
  html += `            <div class="score-value">${Math.round(overall_score)}/100</div>\n`;
  html += '          </div>\n';

  // Score Breakdown Bars
  html += '          <div class="score-details">\n';
  html += '            <div class="score-breakdown" style="display: grid; gap: 12px;">\n';

  // Build scores array and filter out undefined/null values
  const scores = [
    { label: 'Design', value: design_score, icon: '🎨' },
    { label: 'SEO', value: seo_score, icon: '🔍' },
    { label: 'Performance', value: performance_score, icon: '⚡' },
    { label: 'Content', value: content_score, icon: '✍️' },
    { label: 'Accessibility', value: accessibility_score, icon: '♿' },
    { label: 'Social', value: social_score, icon: '📱' }
  ].filter(score => score.value !== undefined && score.value !== null);

  scores.forEach(score => {
    if (score.value !== undefined && score.value !== null) {
      const scoreValue = Math.round(score.value || 0);
      const barColor = scoreValue >= 80 ? 'var(--success)' : scoreValue >= 60 ? 'var(--warning)' : 'var(--danger)';

      html += '              <div style="display: grid; grid-template-columns: 120px 1fr 50px; gap: 12px; align-items: center;">\n';
      html += '                <div style="display: flex; align-items: center; gap: 6px; font-size: 14px;">\n';
      html += `                  <span style="font-size: 16px;">${score.icon}</span>\n`;
      html += `                  <span style="font-weight: 500;">${score.label}</span>\n`;
      html += '                </div>\n';
      html += '                <div style="background: var(--bg-tertiary); border-radius: 8px; height: 20px; position: relative; overflow: hidden; border: 1px solid var(--border-light);">\n';
      html += `                  <div style="background: ${barColor}; height: 100%; width: ${scoreValue}%; border-radius: 6px; transition: width 0.3s; opacity: 0.8;"></div>\n`;
      html += '                </div>\n';
      html += `                <div style="text-align: right; font-weight: 600; font-size: 16px;">${scoreValue}<span style="opacity: 0.5; font-weight: 400; font-size: 14px;">/100</span></div>\n`;
      html += '              </div>\n';
    }
  });

  html += '            </div>\n';
  html += '          </div>\n';
  html += '        </div>\n';

  // Benchmark Comparison (if available)
  if (matched_benchmark) {
    html += '        <div class="benchmark-comparison-card" style="margin-top: 24px; padding: 20px; background: var(--bg-tertiary); border-radius: var(--radius-lg); border: 1px solid var(--border-light);">\n';
    html += '          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; margin-bottom: 16px;">vs. Industry Leader</h3>\n';
    html += '          <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center;">\n';

    html += '            <div style="text-align: center;">\n';
    html += `              <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">Your Website</div>\n`;
    html += `              <div style="font-size: 24px; font-weight: bold;">${grade} (${Math.round(overall_score)})</div>\n`;
    html += '            </div>\n';

    html += '            <div style="font-size: 16px; opacity: 0.5; font-weight: 300;">vs</div>\n';

    html += '            <div style="text-align: center;">\n';
    html += `              <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">${escapeHtml(matched_benchmark.company_name)}</div>\n`;
    html += `              <div style="font-size: 24px; font-weight: bold;">${matched_benchmark.scores.grade} (${Math.round(matched_benchmark.scores.overall)})</div>\n`;
    html += '            </div>\n';

    html += '          </div>\n';

    const gap = matched_benchmark.scores.overall - overall_score;
    const gapText = gap > 0 ? `${Math.round(gap)} points to close` : gap < 0 ? `${Math.round(Math.abs(gap))} points ahead!` : 'Matched!';
    const gapColor = gap > 0 ? 'var(--warning)' : gap < 0 ? 'var(--success)' : 'var(--success)';

    html += `          <div style="text-align: center; margin-top: 12px; font-size: 13px; color: ${gapColor};">\n`;
    html += `            ${gap > 0 ? '↑' : gap < 0 ? '✓' : '✓'} ${gapText}\n`;
    html += '          </div>\n';

    html += `          <div style="text-align: center; margin-top: 8px; font-size: 11px; opacity: 0.6;">\n`;
    html += `            ${Math.round(matched_benchmark.match_score)}% match • ${matched_benchmark.comparison_tier}\n`;
    html += '          </div>\n';

    html += '        </div>\n';
  }

  html += '      </div>\n';
  html += '    </div>\n';
  html += '  </div>\n';
  html += '</div>\n\n';

  return html;
}
