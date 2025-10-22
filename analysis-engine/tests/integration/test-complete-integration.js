/**
 * Test Complete Integration
 *
 * This script tests the complete integration of all data fields
 * in the Analysis Engine to ensure everything is working properly.
 */

import { analyzeWebsiteIntelligent } from './orchestrator.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

// Test configuration
const TEST_URL = 'https://www.example.com'; // Use a simple website for testing
const TEST_COMPANY = 'Example Company';
const TEST_INDUSTRY = 'technology';

console.log('═══════════════════════════════════════════════════════════════');
console.log('ANALYSIS ENGINE COMPLETE INTEGRATION TEST');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log(`Testing URL: ${TEST_URL}`);
console.log(`Company: ${TEST_COMPANY}`);
console.log(`Industry: ${TEST_INDUSTRY}`);
console.log('');
console.log('Starting analysis...');
console.log('');

async function testCompleteIntegration() {
  try {
    const startTime = Date.now();

    // Run the analysis
    const result = await analyzeWebsiteIntelligent(TEST_URL, {
      company_name: TEST_COMPANY,
      industry: TEST_INDUSTRY,
      city: 'San Francisco',
      state: 'CA'
    }, {
      onProgress: (progress) => {
        console.log(`[${progress.step}] ${progress.message}`);
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!result.success) {
      console.error('❌ Analysis failed:', result.error);
      process.exit(1);
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('ANALYSIS COMPLETE - FIELD VALIDATION REPORT');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    // Validate critical fields
    const validationResults = {
      // Core Fields
      'Core Information': {
        'URL': result.url ? '✅' : '❌',
        'Company Name': result.company_name ? '✅' : '❌',
        'Industry': result.industry ? '✅' : '❌',
      },

      // Grading
      'Grading & Scores': {
        'Overall Score': typeof result.overall_score === 'number' ? '✅' : '❌',
        'Website Grade': result.grade ? '✅' : '❌',
        'Design Score': typeof result.design_score === 'number' ? '✅' : '❌',
        'SEO Score': typeof result.seo_score === 'number' ? '✅' : '❌',
        'Content Score': typeof result.content_score === 'number' ? '✅' : '❌',
        'Social Score': typeof result.social_score === 'number' ? '✅' : '❌',
        'Accessibility Score': typeof result.accessibility_score === 'number' ? '✅' : '❌',
      },

      // Lead Scoring (NEW)
      'Lead Scoring': {
        'Lead Priority': typeof result.lead_priority === 'number' ? '✅' : '❌',
        'Priority Tier': result.priority_tier ? '✅' : '❌',
        'Budget Likelihood': result.budget_likelihood ? '✅' : '❌',
        'Fit Score': typeof result.fit_score === 'number' ? '✅' : '❌',
        'Quality Gap Score': typeof result.quality_gap_score === 'number' ? '✅' : '❌',
        'Lead Reasoning': result.lead_priority_reasoning ? '✅' : '❌',
      },

      // Business Intelligence (NEW)
      'Business Intelligence': {
        'Has Data': result.business_intelligence ? '✅' : '❌',
        'Company Size': result.business_intelligence?.companySize ? '✅' : '❌',
        'Years in Business': result.business_intelligence?.yearsInBusiness !== undefined ? '✅' : '❌',
        'Pricing Visibility': result.business_intelligence?.pricingVisibility ? '✅' : '❌',
        'Premium Features': result.business_intelligence?.premiumFeatures ? '✅' : '❌',
      },

      // Contact Information (NEW)
      'Contact Information': {
        'Email': result.contact_email ? '✅' : '⚠️  (may not exist)',
        'Phone': result.contact_phone ? '✅' : '⚠️  (may not exist)',
        'Name': result.contact_name ? '✅' : '⚠️  (may not exist)',
      },

      // Content Insights (NEW)
      'Content Insights': {
        'Has Data': result.content_insights ? '✅' : '❌',
        'Word Count': result.content_insights?.wordCount !== undefined ? '✅' : '❌',
        'Engagement Hooks': Array.isArray(result.content_insights?.engagementHooks) ? '✅' : '❌',
        'Testimonial Count': result.content_insights?.testimonialCount !== undefined ? '✅' : '❌',
      },

      // Social Metadata (NEW)
      'Social Metadata': {
        'Has Data': result.social_metadata ? '✅' : '❌',
        'Platform Count': result.social_metadata?.platformCount !== undefined ? '✅' : '❌',
        'Most Active Platform': result.social_metadata?.mostActivePlatform ? '✅' : '❌',
        'Strengths': Array.isArray(result.social_metadata?.strengths) ? '✅' : '❌',
      },

      // Technical Metadata
      'Technical Metadata': {
        'Tech Stack': result.tech_stack ? '✅' : '❌',
        'Has HTTPS': typeof result.has_https === 'boolean' ? '✅' : '❌',
        'Is Mobile Friendly': typeof result.is_mobile_friendly === 'boolean' ? '✅' : '❌',
        'Page Load Time': result.page_load_time !== undefined ? '✅' : '⚠️',
      },

      // Issue Counts (NEW)
      'Issue Counts': {
        'Desktop Critical Issues': typeof result.desktop_critical_issues === 'number' ? '✅' : '❌',
        'Mobile Critical Issues': typeof result.mobile_critical_issues === 'number' ? '✅' : '❌',
        'Design Issues (Legacy)': Array.isArray(result.design_issues) ? '✅' : '❌',
      },

      // Accessibility (ENHANCED)
      'Accessibility': {
        'WCAG Level': result.accessibility_wcag_level ? '✅' : '❌',
        'Compliance Status': result.accessibility_compliance ? '✅' : '❌',
        'Issues Array': Array.isArray(result.accessibility_issues) ? '✅' : '❌',
      },

      // Discovery Log (NEW - COMPREHENSIVE LOGGING)
      'Discovery Log': {
        'Has Log Data': result.discovery_log ? '✅' : '❌',
        'Discovery Summary': result.discovery_log?.summary ? '✅' : '❌',
        'All Pages Array': Array.isArray(result.discovery_log?.all_pages) ? '✅' : '❌',
        'AI Selection': result.discovery_log?.ai_selection ? '✅' : '❌',
        'Critical Findings': result.discovery_log?.critical_findings ? '✅' : '❌',
        'Discovery Issues': result.discovery_log?.discovery_issues ? '✅' : '❌',
        'Technical Details': result.discovery_log?.technical_details ? '✅' : '❌',
        'Analysis Metrics': result.discovery_log?.analysis_metrics ? '✅' : '❌',
      }
    };

    // Print validation results
    for (const [category, fields] of Object.entries(validationResults)) {
      console.log(`\n${category}:`);
      for (const [field, status] of Object.entries(fields)) {
        console.log(`  ${status} ${field}`);
      }
    }

    // Summary statistics
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`Analysis Duration: ${duration} seconds`);
    console.log(`Pages Discovered: ${result.intelligent_analysis?.pages_discovered || 0}`);
    console.log(`Pages Crawled: ${result.intelligent_analysis?.pages_crawled || 0}`);
    console.log(`Analysis Cost: $${result.analysis_cost?.toFixed(4) || '0.0000'}`);
    console.log('');
    console.log('Key Results:');
    console.log(`  Grade: ${result.grade} (${result.overall_score}/100)`);
    console.log(`  Lead Priority: ${result.lead_priority || 'N/A'} - ${result.priority_tier || 'N/A'}`);
    console.log(`  Budget Likelihood: ${result.budget_likelihood || 'N/A'}`);
    console.log(`  Quick Wins: ${result.quick_wins?.length || 0}`);
    console.log(`  Critical Issues: ${(result.desktop_critical_issues || 0) + (result.mobile_critical_issues || 0)} total`);
    console.log('');

    // Check field coverage
    const totalFields = Object.values(validationResults).reduce((sum, cat) => sum + Object.keys(cat).length, 0);
    const passedFields = Object.values(validationResults).reduce((sum, cat) => {
      return sum + Object.values(cat).filter(v => v === '✅').length;
    }, 0);
    const warningFields = Object.values(validationResults).reduce((sum, cat) => {
      return sum + Object.values(cat).filter(v => v.includes('⚠️')).length;
    }, 0);
    const failedFields = totalFields - passedFields - warningFields;

    console.log('Field Coverage:');
    console.log(`  ✅ Passed: ${passedFields}/${totalFields} (${Math.round(passedFields/totalFields * 100)}%)`);
    console.log(`  ⚠️  Warning: ${warningFields}/${totalFields} (${Math.round(warningFields/totalFields * 100)}%)`);
    console.log(`  ❌ Failed: ${failedFields}/${totalFields} (${Math.round(failedFields/totalFields * 100)}%)`);
    console.log('');

    if (failedFields === 0) {
      console.log('✅ ALL CRITICAL FIELDS ARE POPULATED!');
    } else {
      console.log(`⚠️  ${failedFields} fields are missing data. Review the validation report above.`);
    }

    // Print Discovery Log Summary
    if (result.discovery_log) {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('DISCOVERY LOG SUMMARY');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');
      console.log('Discovery Details:');
      console.log(`  Pages Found: ${result.discovery_log.summary?.total_discovered || 0}`);
      console.log(`  Discovery Method: ${result.discovery_log.summary?.discovery_method || 'unknown'}`);
      console.log(`  Sitemap Pages: ${result.discovery_log.summary?.sitemap_pages || 0}`);
      console.log(`  Robots.txt Pages: ${result.discovery_log.summary?.robots_pages || 0}`);
      console.log(`  Navigation Pages: ${result.discovery_log.summary?.navigation_pages || 0}`);

      console.log('\nDiscovery Issues:');
      console.log(`  Sitemap Missing: ${result.discovery_log.discovery_issues?.sitemap_missing ? '❌ YES' : '✅ NO'}`);
      console.log(`  Robots.txt Missing: ${result.discovery_log.discovery_issues?.robots_missing ? '❌ YES' : '✅ NO'}`);
      console.log(`  Crawl Failures: ${result.discovery_log.discovery_issues?.crawl_failures?.length || 0}`);

      console.log('\nAI Page Selection:');
      console.log(`  SEO Pages: ${result.discovery_log.ai_selection?.selected_pages?.seo?.length || 0}`);
      console.log(`  Content Pages: ${result.discovery_log.ai_selection?.selected_pages?.content?.length || 0}`);
      console.log(`  Visual Pages: ${result.discovery_log.ai_selection?.selected_pages?.visual?.length || 0}`);
      console.log(`  Social Pages: ${result.discovery_log.ai_selection?.selected_pages?.social?.length || 0}`);

      console.log('\nCritical Findings:');
      console.log(`  Grade: ${result.discovery_log.critical_findings?.grade || 'N/A'}`);
      console.log(`  Lead Priority: ${result.discovery_log.critical_findings?.lead_priority || 'N/A'}`);
      console.log(`  Priority Tier: ${result.discovery_log.critical_findings?.priority_tier || 'N/A'}`);
      console.log(`  Top Issue: ${result.discovery_log.critical_findings?.top_issue || 'None identified'}`);
      console.log(`  Quick Wins: ${result.discovery_log.critical_findings?.quick_wins_count || 0}`);

      console.log('\nTechnical Details:');
      console.log(`  Tech Stack: ${result.discovery_log.technical_details?.tech_stack || 'Unknown'}`);
      console.log(`  Mobile Friendly: ${result.discovery_log.technical_details?.is_mobile_friendly ? '✅' : '❌'}`);
      console.log(`  Has HTTPS: ${result.discovery_log.technical_details?.has_https ? '✅' : '❌'}`);
      console.log(`  Years in Business: ${result.discovery_log.technical_details?.years_in_business || 'Unknown'}`);

      console.log('\nAnalysis Performance:');
      console.log(`  Total Time: ${(result.discovery_log.analysis_metrics?.total_time_ms / 1000)?.toFixed(2) || 0}s`);
      console.log(`  Analysis Cost: $${result.discovery_log.analysis_metrics?.analysis_cost?.toFixed(4) || 0}`);
      console.log(`  AI Models Used: ${Object.keys(result.discovery_log.analysis_metrics?.ai_models_used || {}).length}`);
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');

    // Save raw result for debugging
    const fs = await import('fs');
    const outputPath = resolve(__dirname, 'test-integration-result.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\nFull result saved to: ${outputPath}`);

  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED:', error.message);
    console.error('');
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testCompleteIntegration();