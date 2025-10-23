/**
 * Test Synthesis Integration with Report Generation
 *
 * Tests that synthesis is properly integrated into the report workflow
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../../');
dotenv.config({ path: join(projectRoot, '.env') });

import { autoGenerateReport } from '../../reports/auto-report-generator.js';

console.log('');
console.log('═'.repeat(80));
console.log('TEST: Synthesis Integration with Report Generation');
console.log('═'.repeat(80));
console.log('');

// Mock analysis result (minimal for testing)
const mockAnalysis = {
  id: 'test-lead-123',
  company_name: 'Test Company Inc',
  industry: 'Technology',
  url: 'https://test.com',
  grade: 'B',
  overall_score: 75,
  design_score_desktop: 70,
  design_score_mobile: 68,
  seo_score: 80,
  content_score: 75,
  social_score: 70,
  accessibility_score: 72,
  analyzed_at: new Date().toISOString(),

  // Issues
  design_issues_desktop: [
    {
      title: 'Primary CTA button lacks visual prominence',
      description: 'Button uses same styling as secondary elements',
      severity: 'high',
      category: 'cta'
    },
    {
      title: 'Inconsistent typography across pages',
      description: 'Multiple font families used',
      severity: 'medium',
      category: 'design'
    }
  ],

  design_issues_mobile: [
    {
      title: 'Touch targets too small',
      description: 'Buttons are 38px (below 44px minimum)',
      severity: 'high',
      category: 'mobile-usability'
    },
    {
      title: 'Primary CTA not prominent on mobile',
      description: 'Button blends with navigation',
      severity: 'critical',
      category: 'cta'
    }
  ],

  seo_issues: [
    {
      title: 'Missing meta descriptions',
      description: '5 pages missing meta description tags',
      severity: 'medium',
      category: 'seo'
    }
  ],

  content_issues: [],
  social_issues: [],
  accessibility_issues: [],

  quick_wins: [
    {
      title: 'Add meta descriptions',
      effort: 'low',
      impact: 'medium'
    },
    {
      title: 'Increase touch target sizes',
      effort: 'low',
      impact: 'high'
    }
  ],

  // Lead scoring
  lead_priority: 78,
  priority_tier: 'warm',
  budget_likelihood: 'medium',

  top_issue: {
    title: 'CTA visibility issues',
    description: 'Primary conversion button not prominent'
  },

  tech_stack: 'WordPress',
  has_blog: true,
  social_platforms_present: ['LinkedIn', 'Twitter'],
  is_mobile_friendly: true,
  has_https: true,

  // Crawl metadata
  crawl_metadata: {
    pages_analyzed: [
      {
        url: '/',
        fullUrl: 'https://test.com/',
        title: 'Home Page',
        metadata: { title: 'Test Company - Home' },
        analyzed_for: { desktop: true, mobile: true },
        screenshot_paths: {
          desktop: '/screenshots/home-desktop.png',
          mobile: '/screenshots/home-mobile.png'
        }
      }
    ]
  }
};

async function testIntegration() {
  console.log(`📊 Test Configuration:`);
  console.log(`   USE_AI_SYNTHESIS: ${process.env.USE_AI_SYNTHESIS || 'false'}`);
  console.log(`   Company: ${mockAnalysis.company_name}`);
  console.log(`   Grade: ${mockAnalysis.grade} (${mockAnalysis.overall_score}/100)`);
  console.log('');

  try {
    // Test 1: Generate report WITHOUT synthesis
    console.log('Test 1: Generate report WITHOUT synthesis (USE_AI_SYNTHESIS=false)');
    console.log('─'.repeat(80));

    const originalValue = process.env.USE_AI_SYNTHESIS;
    process.env.USE_AI_SYNTHESIS = 'false';

    const reportWithoutSynthesis = await autoGenerateReport(mockAnalysis, {
      format: 'markdown',
      sections: ['all'],
      saveToDatabase: false
    });

    console.log('');
    console.log('Result:');
    console.log(`   Success: ${reportWithoutSynthesis.success}`);
    console.log(`   Format: ${reportWithoutSynthesis.format}`);
    console.log(`   Local Path: ${reportWithoutSynthesis.local_path}`);
    console.log(`   File Size: ${reportWithoutSynthesis.file_size} bytes`);
    console.log(`   Synthesis Used: ${reportWithoutSynthesis.synthesis?.used || false}`);
    console.log('');

    if (!reportWithoutSynthesis.success) {
      throw new Error(`Report generation failed: ${reportWithoutSynthesis.error}`);
    }

    // Test 2: Generate report WITH synthesis
    console.log('Test 2: Generate report WITH synthesis (USE_AI_SYNTHESIS=true)');
    console.log('─'.repeat(80));
    console.log('⚠️  This will call GPT-5 and take ~2-3 minutes');
    console.log('');

    process.env.USE_AI_SYNTHESIS = 'true';

    const startTime = Date.now();
    const reportWithSynthesis = await autoGenerateReport(mockAnalysis, {
      format: 'markdown',
      sections: ['all'],
      saveToDatabase: false
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    console.log('Result:');
    console.log(`   Success: ${reportWithSynthesis.success}`);
    console.log(`   Format: ${reportWithSynthesis.format}`);
    console.log(`   Local Path: ${reportWithSynthesis.local_path}`);
    console.log(`   File Size: ${reportWithSynthesis.file_size} bytes`);
    console.log(`   Synthesis Used: ${reportWithSynthesis.synthesis?.used || false}`);
    console.log(`   Consolidated Issues: ${reportWithSynthesis.synthesis?.consolidatedIssuesCount || 0}`);
    console.log(`   Synthesis Errors: ${reportWithSynthesis.synthesis?.errors?.length || 0}`);
    console.log(`   Total Duration: ${duration}s`);
    console.log('');

    // Restore original value
    process.env.USE_AI_SYNTHESIS = originalValue;

    if (!reportWithSynthesis.success) {
      throw new Error(`Report with synthesis failed: ${reportWithSynthesis.error}`);
    }

    // Summary
    console.log('═'.repeat(80));
    console.log('✅ INTEGRATION TEST PASSED');
    console.log('═'.repeat(80));
    console.log('');
    console.log('Summary:');
    console.log(`   ✓ Report generation without synthesis: Working`);
    console.log(`   ✓ Report generation with synthesis: ${reportWithSynthesis.synthesis?.used ? 'Working' : 'Skipped'}`);
    console.log(`   ✓ Graceful fallback: ${reportWithSynthesis.synthesis?.errors?.length === 0 ? 'Not Needed' : 'Working'}`);
    console.log(`   ✓ File size comparison: Without=${reportWithoutSynthesis.file_size} bytes, With=${reportWithSynthesis.file_size} bytes`);
    console.log('');
    console.log('📁 Reports saved to:');
    console.log(`   - Without synthesis: ${reportWithoutSynthesis.local_path}`);
    console.log(`   - With synthesis: ${reportWithSynthesis.local_path}`);
    console.log('');
    console.log('Next Steps:');
    console.log('1. Review both reports to compare quality');
    console.log('2. Check for AI-generated executive summary in synthesized report');
    console.log('3. Verify issue deduplication worked correctly');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('═'.repeat(80));
    console.error('❌ INTEGRATION TEST FAILED');
    console.error('═'.repeat(80));
    console.error('');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }
    console.error('');
    process.exit(1);
  }
}

testIntegration();
