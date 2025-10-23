/**
 * Executive Summary Section (AI-Synthesized Version)
 * 
 * This version prioritizes AI-generated executive insights over raw data.
 * Falls back to traditional summary if synthesis failed.
 */

import { formatGradeBadge, formatScore, createScoreRow } from '../../formatters/score-formatter.js';
import { formatQuickWins } from '../../formatters/issue-formatter.js';

export function generateExecutiveSummary(analysisResult) {
  const {
    company_name,
    industry,
    city,
    website_url = analysisResult.url,
    grade,
    overall_score,
    analyzed_at,
    one_liner,
    quick_wins = [],
    design_score,
    design_score_desktop,
    design_score_mobile,
    seo_score,
    content_score,
    social_score,
    accessibility_score,
    status,
    contact_name,
    contact_email,
    contact_phone,
    
    // AI Synthesis outputs
    executive_summary,
    consolidated_issues = [],
    quick_win_strategy,
    synthesis_errors = []
  } = analysisResult;

  const analysisDate = new Date(analyzed_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const location = city ? ` | **Location:** ${city}` : '';

  let output = `# Website Audit Report: ${company_name}\n\n`;

  // Header badges
  output += `**${formatGradeBadge(grade)}** | **Overall Score: ${formatScore(overall_score)}** | **Analyzed:** ${analysisDate}\n`;

  // Add status badge if available
  if (status) {
    const statusEmoji = {
      'ready_for_outreach': '📬',
      'email_composed': '✉️',
      'contacted': '📤',
      'replied': '💬',
      'not_interested': '❌'
    };
    const statusLabel = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    output += `**Status:** ${statusEmoji[status] || '📊'} ${statusLabel}\n`;
  }

  output += `\n**Industry:** ${industry}${location}  \n`;
  output += `**Website:** [${website_url}](${website_url})\n`;

  // Add contact information if available
  if (contact_name || contact_email || contact_phone) {
    output += `**Contact:** `;
    if (contact_name) output += `${contact_name}`;
    if (contact_email) output += ` | ${contact_email}`;
    if (contact_phone) output += ` | ${contact_phone}`;
    output += '\n';
  }

  output += '\n';
  output += `---\n\n`;

  // === NEW: AI-GENERATED EXECUTIVE SUMMARY (if available) ===
  if (executive_summary && executive_summary.headline && synthesis_errors.length === 0) {
    output += `## 📋 Executive Summary\n\n`;
    
    // Headline
    output += `### ${executive_summary.headline}\n\n`;
    
    // Overview
    if (executive_summary.overview) {
      output += `${executive_summary.overview}\n\n`;
    }
    
    // Critical Findings
    if (executive_summary.criticalFindings && executive_summary.criticalFindings.length > 0) {
      output += `### 🔴 Critical Findings\n\n`;
      
      executive_summary.criticalFindings.forEach((finding, index) => {
        output += `**${finding.rank}. ${finding.issue}**\n\n`;
        
        if (finding.impact) {
          output += `**Impact:** ${finding.impact}\n\n`;
        }
        
        if (finding.evidence && finding.evidence.length > 0) {
          output += `**Evidence:** ${finding.evidence.map(ref => `[${ref}](#appendix-screenshots)`).join(', ')}\n\n`;
        }
        
        if (finding.recommendation) {
          output += `**Recommendation:** ${finding.recommendation}\n\n`;
        }
        
        if (finding.estimatedValue) {
          output += `**Expected Value:** ${finding.estimatedValue}\n\n`;
        }
        
        if (index < executive_summary.criticalFindings.length - 1) {
          output += `---\n\n`;
        }
      });
    }
    
    // Strategic Roadmap
    if (executive_summary.strategicRoadmap) {
      output += `### 🗓️ Strategic Roadmap\n\n`;
      
      const roadmap = executive_summary.strategicRoadmap;
      
      if (roadmap.month1) {
        output += `**Month 1: ${roadmap.month1.focus || 'Quick Wins'}**\n`;
        if (roadmap.month1.items && roadmap.month1.items.length > 0) {
          roadmap.month1.items.forEach(item => {
            output += `- ${item}\n`;
          });
        }
        if (roadmap.month1.expectedImpact) {
          output += `\n*Expected Impact:* ${roadmap.month1.expectedImpact}\n`;
        }
        output += '\n';
      }
      
      if (roadmap.month2) {
        output += `**Month 2: ${roadmap.month2.focus || 'High-Impact Fixes'}**\n`;
        if (roadmap.month2.items && roadmap.month2.items.length > 0) {
          roadmap.month2.items.forEach(item => {
            output += `- ${item}\n`;
          });
        }
        if (roadmap.month2.expectedImpact) {
          output += `\n*Expected Impact:* ${roadmap.month2.expectedImpact}\n`;
        }
        output += '\n';
      }
      
      if (roadmap.month3) {
        output += `**Month 3: ${roadmap.month3.focus || 'Strategic Enhancements'}**\n`;
        if (roadmap.month3.items && roadmap.month3.items.length > 0) {
          roadmap.month3.items.forEach(item => {
            output += `- ${item}\n`;
          });
        }
        if (roadmap.month3.expectedImpact) {
          output += `\n*Expected Impact:* ${roadmap.month3.expectedImpact}\n`;
        }
        output += '\n';
      }
    }
    
    // ROI Statement
    if (executive_summary.roiStatement) {
      output += `### 💰 Projected ROI\n\n`;
      output += `${executive_summary.roiStatement}\n\n`;
    }
    
    // Call to Action
    if (executive_summary.callToAction) {
      output += `---\n\n`;
      output += `**Next Steps:** ${executive_summary.callToAction}\n\n`;
    }
    
    output += `---\n\n`;
  }

  // At a Glance section (always included)
  output += `## 📊 At a Glance\n\n`;

  // Score breakdown table
  output += `| Category | Score | Status |\n`;
  output += `|----------|-------|--------|\n`;

  if (design_score_desktop !== undefined) {
    output += createScoreRow('🖥️ Desktop Design', design_score_desktop) + '\n';
  }
  if (design_score_mobile !== undefined) {
    output += createScoreRow('📱 Mobile Design', design_score_mobile) + '\n';
  } else if (design_score !== undefined) {
    output += createScoreRow('🎨 Design', design_score) + '\n';
  }

  output += createScoreRow('🔍 SEO', seo_score || 50) + '\n';
  output += createScoreRow('📝 Content', content_score || 50) + '\n';
  output += createScoreRow('📱 Social Media', social_score || 50) + '\n';

  if (accessibility_score !== undefined) {
    output += createScoreRow('♿ Accessibility', accessibility_score) + '\n';
  }

  output += '\n';

  // Top Priority (fallback if no AI summary)
  if (!executive_summary && one_liner) {
    output += `## 🎯 Top Priority\n\n`;
    output += `${one_liner}\n\n`;
  }

  // Quick Wins Section - Use standard quick wins from grader
  if (quick_wins && quick_wins.length > 0) {
    const totalQuickWins = quick_wins.length;
    const displayQuickWins = quick_wins.slice(0, 5);

    output += `## ⚡ Quick Wins (${totalQuickWins} item${totalQuickWins > 1 ? 's' : ''})\n\n`;
    output += formatQuickWins(displayQuickWins, false);
    output += '\n';
  }

  // Show consolidation stats if available
  if (consolidated_issues && consolidated_issues.length > 0) {
    const originalCount = (analysisResult.design_issues_desktop?.length || 0) +
                         (analysisResult.design_issues_mobile?.length || 0) +
                         (analysisResult.seo_issues?.length || 0) +
                         (analysisResult.content_issues?.length || 0) +
                         (analysisResult.social_issues?.length || 0) +
                         (analysisResult.accessibility_issues?.length || 0);
    
    const consolidatedCount = consolidated_issues.length;
    
    if (originalCount > consolidatedCount) {
      const reductionPct = Math.round(((originalCount - consolidatedCount) / originalCount) * 100);
      output += `> **Note:** ${originalCount} issues consolidated into ${consolidatedCount} unique findings (${reductionPct}% reduction in redundancy)\n\n`;
    }
  }

  output += `---\n\n`;

  return output;
}
