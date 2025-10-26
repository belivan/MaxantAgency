/**
 * Test AI Grading Fix
 */

process.env.USE_AI_GRADING = 'true';

import { gradeWithAI } from '../grading/ai-grader.js';

console.log('🧪 TESTING AI GRADING FIX\n');

const mockAnalysis = {
  scores: {
    design_score: 75,
    seo_score: 68,
    performance_score: 72,
    content_score: 80,
    accessibility_score: 70,
    social_score: 65
  },
  desktopVisual: {
    issues: [
      { title: 'CTA too small', severity: 'high' }
    ]
  },
  mobileVisual: {
    issues: [
      { title: 'Nav broken on mobile', severity: 'high' }
    ]
  },
  seo: {
    issues: [
      { title: 'Missing meta description', severity: 'medium' }
    ]
  }
};

const mockMetadata = {
  company_name: 'Test Restaurant',
  industry: 'restaurant',
  url: 'https://example.com'
};

try {
  const result = await gradeWithAI(mockAnalysis, mockMetadata);

  if (result.success) {
    console.log('✅ AI GRADING WORKS!');
    console.log(`   Grade: ${result.grade} (${result.overall_score}/100)`);
    console.log(`   Lead Score: ${result.lead_score}/100`);
    console.log(`   Method: ${result.grading_method}`);
    if (result.comparison) {
      console.log(`   Benchmark: ${result.comparison.benchmark_name}`);
      console.log(`   Gap: ${result.comparison.gap} points`);
    }
  } else {
    console.log('❌ AI grading returned unsuccessful');
  }

} catch (error) {
  console.error('❌ TEST FAILED:', error.message);
  console.error(error.stack);
}
