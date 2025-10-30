/**
 * Test Issue Deduplication Agent
 * Tests the report synthesis deduplication stage in isolation
 */

import { loadPrompt } from '../../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../../../database-tools/shared/ai-client.js';

// Sample test data - realistic issues from multiple analyzers
const sampleData = {
  company_name: 'Summit Legal Group',
  industry: 'Legal Services',
  grade: 'C',
  overall_score: 58,

  desktop_issues: [
    {
      title: 'Hero section CTA button too small',
      description: 'Primary CTA "Free Consultation" is 14px font, same size as body text. Button lacks visual prominence.',
      severity: 'high',
      category: 'cta',
      module: 'desktop',
      impact: 'Visitors may not notice primary conversion action'
    },
    {
      title: 'No attorney credentials visible above-fold',
      description: 'Hero section shows generic stock photo with no attorney names, photos, bar credentials, or years of experience.',
      severity: 'high',
      category: 'trust',
      module: 'desktop',
      impact: 'Fails to establish credibility for legal services'
    },
    {
      title: 'Missing clear navigation hierarchy',
      description: 'Practice areas listed alphabetically without visual grouping by service type.',
      severity: 'medium',
      category: 'navigation',
      module: 'desktop',
      impact: 'Visitors may struggle to find relevant services'
    }
  ],

  mobile_issues: [
    {
      title: 'Call-to-action buttons lack visual prominence',
      description: 'Primary "Free Consultation" button blends with secondary links. No color differentiation or size increase. Touch target is 38px (below 44px recommended).',
      severity: 'critical',
      category: 'cta',
      module: 'mobile',
      impact: 'Mobile users (60% of traffic) cannot easily initiate contact'
    },
    {
      title: 'Touch targets too small for clickable elements',
      description: 'Phone numbers and email links are 38px touch targets (44px minimum recommended).',
      severity: 'high',
      category: 'mobile-usability',
      module: 'mobile',
      impact: 'Frustrates mobile users trying to make contact'
    },
    {
      title: 'No mobile viewport meta tag',
      description: 'Missing viewport meta tag causes text to appear tiny on mobile devices.',
      severity: 'critical',
      category: 'mobile',
      module: 'mobile',
      impact: 'Site fails Google mobile-friendly test'
    }
  ],

  seo_issues: [
    {
      title: 'Primary conversion path unclear in HTML structure',
      description: 'No semantic emphasis on primary CTA in above-fold HTML. Missing schema markup for legal services.',
      severity: 'medium',
      category: 'conversion',
      module: 'seo',
      impact: 'Search engines cannot identify main conversion goal'
    },
    {
      title: 'Missing meta descriptions on practice area pages',
      description: '8 out of 12 practice area pages have no meta description tags.',
      severity: 'medium',
      category: 'seo',
      module: 'seo',
      impact: 'Lower click-through rates from search results'
    },
    {
      title: 'No structured data for attorney/legal service',
      description: 'Missing Schema.org markup for Attorney, LegalService, and LocalBusiness.',
      severity: 'medium',
      category: 'seo',
      module: 'seo',
      impact: 'Missing rich snippet opportunities in search results'
    }
  ],

  content_issues: [
    {
      title: 'Vague value proposition in hero section',
      description: 'Hero tagline "We Fight For You" lacks specificity about practice areas or unique differentiators.',
      severity: 'medium',
      category: 'messaging',
      module: 'content',
      impact: 'Fails to communicate specific legal expertise'
    },
    {
      title: 'Missing attorney credentials and bios',
      description: 'No attorney profiles, education credentials, or years of experience visible on homepage.',
      severity: 'high',
      category: 'trust',
      module: 'content',
      impact: 'Cannot establish trust for legal services'
    }
  ],

  social_issues: [
    {
      title: 'No social proof or testimonials',
      description: 'Zero client testimonials, case results, or trust signals on homepage.',
      severity: 'high',
      category: 'trust',
      module: 'social',
      impact: 'Missing critical credibility indicators for legal services'
    }
  ],

  accessibility_issues: [
    {
      title: 'Insufficient color contrast for primary CTA',
      description: 'CTA button uses #666 gray on #999 background (contrast ratio 2.1:1, fails WCAG AA 4.5:1 requirement).',
      severity: 'medium',
      category: 'accessibility',
      module: 'accessibility',
      impact: 'Users with vision impairments cannot see CTA button'
    },
    {
      title: 'Missing alt text on 15 images',
      description: 'Attorney photos, practice area icons, and decorative images lack alt attributes.',
      severity: 'medium',
      category: 'accessibility',
      module: 'accessibility',
      impact: 'Screen reader users cannot understand visual content'
    }
  ]
};

/**
 * Helper to safely stringify for prompts
 */
function safeStringify(value, fallback = []) {
  try {
    return JSON.stringify(value || fallback, null, 2);
  } catch {
    return JSON.stringify(fallback, null, 2);
  }
}

/**
 * Run deduplication test
 */
async function testIssueDeduplication() {
  console.log('');
  console.log('='.repeat(80));
  console.log('TEST: Issue Deduplication Agent');
  console.log('='.repeat(80));
  console.log('');

  const testResults = {
    testName: 'Issue Deduplication',
    timestamp: new Date().toISOString(),
    success: false,
    errors: [],
    metrics: {}
  };

  try {
    console.log(`📊 Test Input Summary:`);
    console.log(`   Company: ${sampleData.company_name}`);
    console.log(`   Industry: ${sampleData.industry}`);
    console.log(`   Grade: ${sampleData.grade} (${sampleData.overall_score}/100)`);
    console.log('');
    console.log('   Input Issue Counts:');
    console.log(`   - Desktop:       ${sampleData.desktop_issues.length} issues`);
    console.log(`   - Mobile:        ${sampleData.mobile_issues.length} issues`);
    console.log(`   - SEO:           ${sampleData.seo_issues.length} issues`);
    console.log(`   - Content:       ${sampleData.content_issues.length} issues`);
    console.log(`   - Social:        ${sampleData.social_issues.length} issues`);
    console.log(`   - Accessibility: ${sampleData.accessibility_issues.length} issues`);

    const totalIssues = sampleData.desktop_issues.length +
                       sampleData.mobile_issues.length +
                       sampleData.seo_issues.length +
                       sampleData.content_issues.length +
                       sampleData.social_issues.length +
                       sampleData.accessibility_issues.length;

    console.log(`   TOTAL:           ${totalIssues} issues`);
    console.log('');

    // Load the issue deduplication prompt
    console.log('🔄 Loading issue-deduplication prompt...');
    const prompt = await loadPrompt('report-synthesis/issue-deduplication', {
      company_name: sampleData.company_name,
      industry: sampleData.industry,
      grade: sampleData.grade,
      overall_score: String(sampleData.overall_score),
      desktop_issues_json: safeStringify(sampleData.desktop_issues),
      mobile_issues_json: safeStringify(sampleData.mobile_issues),
      seo_issues_json: safeStringify(sampleData.seo_issues),
      content_issues_json: safeStringify(sampleData.content_issues),
      social_issues_json: safeStringify(sampleData.social_issues),
      accessibility_issues_json: safeStringify(sampleData.accessibility_issues)
    });

    console.log(`✓ Prompt loaded (model: ${prompt.model})`);
    console.log('');

    // Call AI for deduplication
    console.log('🤖 Calling AI for issue deduplication...');
    const startTime = Date.now();

    const response = await callAI({
      model: prompt.model,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: prompt.temperature,
      jsonMode: true,
      autoFallback: false
    });

    const duration = Date.now() - startTime;
    console.log(`✓ AI response received (${(duration / 1000).toFixed(1)}s)`);
    console.log('');

    // Parse response
    console.log('📝 Parsing JSON response...');
    const parsed = parseJSONResponse(response.content);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Failed to parse JSON response');
    }

    console.log('✓ JSON parsed successfully');
    console.log('');

    // Validate schema
    console.log('✅ Validating response schema...');
    const requiredFields = ['consolidatedIssues', 'mergeLog', 'statistics'];
    const missingFields = requiredFields.filter(field => !(field in parsed));

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    console.log('✓ All required fields present');
    console.log('');

    // Display results
    console.log('📊 Deduplication Results:');
    console.log('   ─────────────────────────────────────────────────────');
    console.log(`   Original Issues:      ${parsed.statistics?.originalIssueCount || totalIssues}`);
    console.log(`   Consolidated Issues:  ${parsed.consolidatedIssues?.length || 0}`);
    console.log(`   Reduction:            ${parsed.statistics?.reductionPercentage || 0}%`);
    console.log(`   Merges Performed:     ${parsed.mergeLog?.length || 0}`);
    console.log('   ─────────────────────────────────────────────────────');
    console.log('');

    // Show consolidated issues
    if (parsed.consolidatedIssues && parsed.consolidatedIssues.length > 0) {
      console.log('🔍 Consolidated Issues (Top 5):');
      console.log('');

      parsed.consolidatedIssues.slice(0, 5).forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.title}`);
        console.log(`      ID:       ${issue.id}`);
        console.log(`      Severity: ${issue.severity}`);
        console.log(`      Sources:  ${issue.sources?.join(', ') || 'unknown'}`);
        console.log(`      Evidence: ${issue.evidence?.length || 0} observations`);
        console.log('');
      });
    }

    // Show merge examples
    if (parsed.mergeLog && parsed.mergeLog.length > 0) {
      console.log('🔗 Merge Examples (First 2):');
      console.log('');

      parsed.mergeLog.slice(0, 2).forEach((merge, index) => {
        console.log(`   Merge ${index + 1}: ${merge.consolidatedTitle}`);
        console.log(`   Merged from ${merge.mergedFrom?.length || 0} sources:`);
        merge.mergedFrom?.forEach(source => {
          console.log(`      - ${source.source}: "${source.originalTitle}" (${source.originalSeverity})`);
        });
        console.log(`   Reason: ${merge.mergeReason}`);
        console.log(`   Final Severity: ${merge.finalSeverity}`);
        console.log('');
      });
    }

    // Cost and performance metrics
    console.log('💰 Performance Metrics:');
    console.log('   ─────────────────────────────────────────────────────');
    console.log(`   Duration:       ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Model:          ${response.model || prompt.model}`);
    console.log(`   Input Tokens:   ${response.usage?.prompt_tokens || 'unknown'}`);
    console.log(`   Output Tokens:  ${response.usage?.completion_tokens || 'unknown'}`);
    console.log(`   Total Tokens:   ${response.usage?.total_tokens || 'unknown'}`);
    console.log(`   Cost:           $${(response.cost || 0).toFixed(4)}`);
    console.log('   ─────────────────────────────────────────────────────');
    console.log('');

    // Quality checks
    console.log('🎯 Quality Checks:');
    const qualityChecks = {
      schemaValid: requiredFields.every(f => f in parsed),
      hasConsolidatedIssues: parsed.consolidatedIssues?.length > 0,
      hasMergeLog: parsed.mergeLog?.length > 0,
      hasStatistics: !!parsed.statistics,
      reductionAchieved: (parsed.statistics?.reductionPercentage || 0) > 0,
      allIssuesHaveIds: parsed.consolidatedIssues?.every(i => i.id) || false,
      allIssuesHaveSeverity: parsed.consolidatedIssues?.every(i => i.severity) || false,
      allIssuesHaveSources: parsed.consolidatedIssues?.every(i => Array.isArray(i.sources) && i.sources.length > 0) || false
    };

    Object.entries(qualityChecks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✓' : '✗'} ${check}`);
    });
    console.log('');

    const allChecksPassed = Object.values(qualityChecks).every(v => v);

    // Store test results
    testResults.success = allChecksPassed;
    testResults.metrics = {
      duration_ms: duration,
      duration_seconds: (duration / 1000).toFixed(2),
      model: response.model || prompt.model,
      tokens: response.usage?.total_tokens || 0,
      cost: response.cost || 0,
      input_issues: totalIssues,
      consolidated_issues: parsed.consolidatedIssues?.length || 0,
      reduction_percentage: parsed.statistics?.reductionPercentage || 0,
      merge_count: parsed.mergeLog?.length || 0
    };
    testResults.qualityChecks = qualityChecks;
    testResults.output = {
      consolidatedIssues: parsed.consolidatedIssues?.slice(0, 3), // Sample only
      mergeLog: parsed.mergeLog?.slice(0, 2), // Sample only
      statistics: parsed.statistics
    };

    // Summary
    console.log('═'.repeat(80));
    if (allChecksPassed) {
      console.log('✅ TEST PASSED: Issue Deduplication Agent Working Correctly');
      console.log('');
      console.log(`   Summary: ${totalIssues} issues → ${parsed.consolidatedIssues?.length || 0} consolidated`);
      console.log(`   Reduction: ${parsed.statistics?.reductionPercentage || 0}%`);
      console.log(`   Cost: $${(response.cost || 0).toFixed(4)}`);
      console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    } else {
      console.log('❌ TEST FAILED: Quality checks did not pass');
      console.log('');
      console.log('   Failed checks:');
      Object.entries(qualityChecks)
        .filter(([, passed]) => !passed)
        .forEach(([check]) => console.log(`   - ${check}`));
    }
    console.log('═'.repeat(80));
    console.log('');

  } catch (error) {
    console.error('');
    console.error('═'.repeat(80));
    console.error('❌ TEST FAILED WITH ERROR');
    console.error('═'.repeat(80));
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    console.error('');

    testResults.success = false;
    testResults.errors.push({
      message: error.message,
      stack: error.stack
    });
  }

  return testResults;
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  testIssueDeduplication()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testIssueDeduplication };
