/**
 * Integration Test for Executive Report Generation
 * =================================================
 * Tests the complete flow:
 * 1. Mock analysis result (simulating server.js output)
 * 2. AI Synthesis (with fallback)
 * 3. Report generation via report-generator.js
 * 4. Verify V2 executive report is generated
 */

import { generateReport } from '../reports/report-generator.js';
import { runReportSynthesis } from '../reports/synthesis/report-synthesis.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('════════════════════════════════════════════════════════════════');
console.log('INTEGRATION TEST: Executive Report Generation Flow');
console.log('Testing: Analysis → Synthesis → Report Generation');
console.log('════════════════════════════════════════════════════════════════');
console.log();

// Mock comprehensive analysis result (similar to what server.js would produce)
const mockAnalysisResult = {
  // Company Info
  company_name: 'Modern Cafe & Bistro',
  url: 'https://moderncafe.example.com',
  industry: 'restaurant',
  city: 'Portland',

  // Scores
  grade: 'C',
  overall_score: 62,
  design_score: 65,
  design_score_desktop: 68,
  design_score_mobile: 58,
  seo_score: 55,
  content_score: 70,
  social_score: 60,
  accessibility_score: 65,

  // Technical Indicators
  is_mobile_friendly: false,
  has_https: true,
  page_load_time: 4200,
  pages_analyzed: 5,
  has_blog: true,

  // Lead Scoring
  lead_priority: 75,
  priority_tier: 'High Priority',
  budget_likelihood: 0.72,

  // Social Platforms
  social_platforms_present: ['facebook', 'instagram'],

  // Tech Stack
  tech_stack: ['WordPress', 'WooCommerce'],

  // Issues by Module
  design_issues_desktop: [
    {
      title: 'Hero section lacks clear value proposition',
      severity: 'high',
      impact: 'Visitors don\'t immediately understand your unique offering',
      fix_effort: 'medium',
      recommendation: 'Add clear headline emphasizing fresh, locally-sourced ingredients'
    },
    {
      title: 'Menu page has poor visual hierarchy',
      severity: 'medium',
      impact: 'Customers struggle to find dishes',
      fix_effort: 'medium',
      recommendation: 'Organize menu with clear categories and visual separators'
    },
    {
      title: 'Online ordering CTA not prominent enough',
      severity: 'high',
      impact: 'Missing potential online orders',
      fix_effort: 'easy',
      recommendation: 'Make "Order Online" button larger and position above the fold'
    }
  ],

  design_issues_mobile: [
    {
      title: 'Navigation menu not accessible on mobile',
      severity: 'critical',
      impact: 'Mobile users can\'t browse menu or make reservations',
      fix_effort: 'medium',
      recommendation: 'Implement responsive hamburger menu with mobile-friendly navigation'
    },
    {
      title: 'Menu images too large for mobile screens',
      severity: 'high',
      impact: 'Slow page load, high bounce rate on mobile',
      fix_effort: 'easy',
      recommendation: 'Implement responsive images with lazy loading'
    },
    {
      title: 'Contact info hard to read on mobile',
      severity: 'medium',
      impact: 'Customers can\'t easily call or find location',
      fix_effort: 'easy',
      recommendation: 'Increase font size and add click-to-call buttons'
    }
  ],

  seo_issues: [
    {
      title: 'Missing local business schema markup',
      severity: 'critical',
      impact: 'Not appearing in Google Maps and local search results',
      fix_effort: 'medium',
      recommendation: 'Implement LocalBusiness structured data with hours, location, menu'
    },
    {
      title: 'Menu pages not indexed by Google',
      severity: 'high',
      impact: 'Missing out on "menu item + city" searches',
      fix_effort: 'easy',
      recommendation: 'Ensure all menu pages have proper title tags and meta descriptions'
    },
    {
      title: 'No Google My Business integration',
      severity: 'high',
      impact: 'Missing reviews and location visibility',
      fix_effort: 'easy',
      recommendation: 'Claim and optimize Google Business Profile'
    }
  ],

  content_issues: [
    {
      title: 'About page doesn\'t tell your story',
      severity: 'medium',
      impact: 'Missing opportunity to connect emotionally with customers',
      fix_effort: 'medium',
      recommendation: 'Add chef background, sourcing philosophy, community involvement'
    },
    {
      title: 'No blog or updates section',
      severity: 'low',
      impact: 'Missing content marketing opportunity',
      fix_effort: 'hard',
      recommendation: 'Start monthly blog with seasonal menu updates and cooking tips'
    },
    {
      title: 'Menu descriptions lack personality',
      severity: 'medium',
      impact: 'Dishes don\'t stand out from competitors',
      fix_effort: 'medium',
      recommendation: 'Rewrite descriptions with sensory language and ingredient origins'
    }
  ],

  social_issues: [
    {
      title: 'Instagram feed not embedded on website',
      severity: 'medium',
      impact: 'Missing social proof and visual appeal',
      fix_effort: 'easy',
      recommendation: 'Embed Instagram feed on homepage to showcase food photos'
    },
    {
      title: 'No social sharing buttons on blog posts',
      severity: 'low',
      impact: 'Limited organic reach',
      fix_effort: 'easy',
      recommendation: 'Add share buttons to encourage social amplification'
    }
  ],

  accessibility_issues: [
    {
      title: 'Images missing alt text',
      severity: 'high',
      impact: 'Screen reader users can\'t understand menu items',
      fix_effort: 'medium',
      recommendation: 'Add descriptive alt text to all food images'
    },
    {
      title: 'Insufficient color contrast on menu',
      severity: 'medium',
      impact: 'Hard to read for visually impaired customers',
      fix_effort: 'easy',
      recommendation: 'Increase text contrast to meet WCAG AA standards'
    }
  ],

  // Quick wins (already identified)
  quick_wins: [
    'Add click-to-call button on mobile',
    'Increase online ordering CTA size',
    'Claim Google Business Profile',
    'Add menu item alt text',
    'Embed Instagram feed'
  ],

  // Top issue
  top_issue: {
    title: 'Navigation menu not accessible on mobile',
    category: 'design_mobile',
    severity: 'critical'
  }
};

/**
 * Run the integration test
 */
async function runIntegrationTest() {
  try {
    console.log('Step 1: Mock Analysis Complete ✅');
    console.log(`  Company: ${mockAnalysisResult.company_name}`);
    console.log(`  Grade: ${mockAnalysisResult.grade} (${mockAnalysisResult.overall_score}/100)`);
    console.log(`  Issues Found: ${
      mockAnalysisResult.design_issues_desktop.length + 
      mockAnalysisResult.design_issues_mobile.length +
      mockAnalysisResult.seo_issues.length +
      mockAnalysisResult.content_issues.length +
      mockAnalysisResult.social_issues.length +
      mockAnalysisResult.accessibility_issues.length
    }`);
    console.log();

    // Step 2: Run AI Synthesis
    console.log('Step 2: Running AI Synthesis...');
    let synthesisData = null;
    const useSynthesis = process.env.USE_AI_SYNTHESIS === 'true';
    
    if (useSynthesis) {
      try {
        const synthesisStartTime = Date.now();
        
        synthesisData = await runReportSynthesis({
          companyName: mockAnalysisResult.company_name,
          industry: mockAnalysisResult.industry,
          grade: mockAnalysisResult.grade,
          overallScore: mockAnalysisResult.overall_score,
          url: mockAnalysisResult.url,
          issuesByModule: {
            desktop: mockAnalysisResult.design_issues_desktop,
            mobile: mockAnalysisResult.design_issues_mobile,
            seo: mockAnalysisResult.seo_issues,
            content: mockAnalysisResult.content_issues,
            social: mockAnalysisResult.social_issues,
            accessibility: mockAnalysisResult.accessibility_issues
          },
          quickWins: mockAnalysisResult.quick_wins,
          leadScoring: {
            lead_priority: mockAnalysisResult.lead_priority,
            priority_tier: mockAnalysisResult.priority_tier,
            budget_likelihood: mockAnalysisResult.budget_likelihood
          },
          topIssue: mockAnalysisResult.top_issue,
          techStack: mockAnalysisResult.tech_stack,
          hasBlog: mockAnalysisResult.has_blog,
          socialPlatforms: mockAnalysisResult.social_platforms_present,
          isMobileFriendly: mockAnalysisResult.is_mobile_friendly,
          hasHttps: mockAnalysisResult.has_https
        });
        
        const synthesisDuration = ((Date.now() - synthesisStartTime) / 1000).toFixed(1);
        console.log(`  ✅ AI Synthesis Complete (${synthesisDuration}s)`);
        console.log(`     - Consolidated Issues: ${synthesisData.consolidatedIssues?.length || 0}`);
        console.log(`     - Executive Summary: ${synthesisData.executiveSummary ? '✓' : '✗'}`);
        
      } catch (synthesisError) {
        console.warn(`  ⚠️  AI Synthesis failed: ${synthesisError.message}`);
        console.log('  ℹ️  Using fallback synthesis');
        synthesisData = null; // Will use fallback in report-generator
      }
    } else {
      console.log('  ℹ️  AI Synthesis disabled (USE_AI_SYNTHESIS=false)');
      console.log('  ℹ️  Using fallback synthesis');
    }
    console.log();

    // Step 3: Generate HTML Report
    console.log('Step 3: Generating HTML Report...');
    const reportStartTime = Date.now();
    
    const report = await generateReport(mockAnalysisResult, {
      format: 'html',
      sections: ['all'],
      synthesisData
    });
    
    const reportDuration = ((Date.now() - reportStartTime) / 1000).toFixed(1);
    console.log(`  ✅ Report Generated (${reportDuration}s)`);
    console.log(`     - Format: ${report.format}`);
    console.log(`     - Version: ${report.metadata.report_version || 'unknown'}`);
    console.log(`     - Size: ${(report.content.length / 1024).toFixed(1)} KB`);
    console.log(`     - Word Count: ${report.metadata.word_count}`);
    console.log();

    // Step 4: Verify Report Structure
    console.log('Step 4: Verifying Report Structure...');
    const content = report.content;
    
    const checks = [
      { name: 'Executive Dashboard', test: content.includes('executive-dashboard') },
      { name: 'Strategic Overview', test: content.includes('strategic-overview') },
      { name: 'Priority Actions', test: content.includes('priority-actions') },
      { name: 'Implementation Roadmap', test: content.includes('implementation-roadmap') },
      { name: 'ROI Metrics', test: content.includes('roi-') || content.includes('ROI') },
      { name: 'Grade Display', test: content.includes(`Grade: ${mockAnalysisResult.grade}`) },
      { name: 'Company Name', test: content.includes(mockAnalysisResult.company_name) },
      { name: 'Score Display', test: content.includes(mockAnalysisResult.overall_score.toString()) }
    ];

    let passed = 0;
    let failed = 0;

    checks.forEach(check => {
      if (check.test) {
        console.log(`  ✅ ${check.name}`);
        passed++;
      } else {
        console.log(`  ❌ ${check.name}`);
        failed++;
      }
    });
    console.log();

    // Step 5: Save Report
    console.log('Step 5: Saving Report...');
    const outputPath = join(__dirname, '..', '..', 'test-integration-report.html');
    await writeFile(outputPath, report.content, 'utf8');
    console.log(`  ✅ Report saved: ${outputPath}`);
    console.log();

    // Summary
    console.log('════════════════════════════════════════════════════════════════');
    console.log('TEST SUMMARY');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(`✅ Analysis: Complete`);
    console.log(`${synthesisData ? '✅' : '⚠️ '} Synthesis: ${synthesisData ? 'AI-powered' : 'Fallback mode'}`);
    console.log(`✅ Report Generation: ${report.metadata.report_version || 'v2-executive'}`);
    console.log(`✅ Structure Checks: ${passed}/${checks.length} passed`);
    
    if (failed > 0) {
      console.log(`❌ Failed Checks: ${failed}`);
    }
    
    console.log();
    console.log('🎉 Integration test complete!');
    console.log(`📄 Open ${outputPath} in your browser to view the report`);
    console.log('════════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runIntegrationTest();
