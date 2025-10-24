/**
 * Test New 6-Dimension Grading Formula
 *
 * Verifies that the new performance-focused grading formula works correctly.
 */

import { calculateGrade } from '../grading/grader.js';

console.log('🧪 Testing New 6-Dimension Grading Formula\n');
console.log('Weights: Design 25%, SEO 25%, Performance 20%, Content 15%, Accessibility 10%, Social 5%\n');

const testCases = [
  {
    name: 'Test 1: Perfect Site (all 100s)',
    scores: {
      design: 100,
      seo: 100,
      performance: 100,
      content: 100,
      accessibility: 100,
      social: 100
    },
    expectedGrade: 'A',
    expectedScore: 100
  },
  {
    name: 'Test 2: Good Site (all 80s)',
    scores: {
      design: 80,
      seo: 80,
      performance: 80,
      content: 80,
      accessibility: 80,
      social: 80
    },
    expectedGrade: 'B',
    expectedScore: 80
  },
  {
    name: 'Test 3: Fast vs Slow (same everything, different performance)',
    fast: {
      design: 75,
      seo: 75,
      performance: 95,  // Fast site
      content: 75,
      accessibility: 75,
      social: 75
    },
    slow: {
      design: 75,
      seo: 75,
      performance: 30,  // Slow site
      content: 75,
      accessibility: 75,
      social: 75
    },
    note: 'Fast site should score ~13 points higher (65 * 0.20 = 13 point difference)'
  },
  {
    name: 'Test 4: No Social Media (should be minimal penalty)',
    scores: {
      design: 85,
      seo: 85,
      performance: 85,
      content: 85,
      accessibility: 85,
      social: 0  // No social presence
    },
    note: 'Social is only 5% weight, so losing all social points = -4.25 points (85 * 0.05)'
  },
  {
    name: 'Test 5: Poor Accessibility (should affect grade)',
    scores: {
      design: 85,
      seo: 85,
      performance: 85,
      content: 85,
      accessibility: 30,  // Poor accessibility
      social: 85
    },
    note: 'Accessibility is 10% weight, so losing 55 points = -5.5 points (55 * 0.10)'
  },
  {
    name: 'Test 6: Real-world Restaurant Site',
    scores: {
      design: 70,
      seo: 60,
      performance: 40,  // Slow mobile site
      content: 65,
      accessibility: 55,
      social: 80  // Good social presence
    },
    expectedGrade: 'C',
    note: 'Typical small business with slow site, decent social'
  }
];

console.log('═'.repeat(70));

// Run test cases
testCases.forEach((testCase, index) => {
  console.log(`\n${testCase.name}`);
  console.log('─'.repeat(70));

  if (testCase.fast && testCase.slow) {
    // Comparison test
    const fastResult = calculateGrade(testCase.fast);
    const slowResult = calculateGrade(testCase.slow);

    console.log(`Fast Site Score: ${fastResult.overallScore} (Grade: ${fastResult.grade})`);
    console.log(`Slow Site Score: ${slowResult.overallScore} (Grade: ${slowResult.grade})`);
    console.log(`Difference: ${(fastResult.overallScore - slowResult.overallScore).toFixed(1)} points`);

    if (testCase.note) {
      console.log(`\nNote: ${testCase.note}`);
    }
  } else {
    // Single test
    const result = calculateGrade(testCase.scores);

    console.log(`Scores: Design=${testCase.scores.design}, SEO=${testCase.scores.seo}, Performance=${testCase.scores.performance}, Content=${testCase.scores.content}, Accessibility=${testCase.scores.accessibility}, Social=${testCase.scores.social}`);
    console.log(`Overall Score: ${result.overallScore}`);
    console.log(`Grade: ${result.grade} (${result.gradeLabel})`);

    if (testCase.expectedGrade) {
      const pass = result.grade === testCase.expectedGrade;
      console.log(`Expected Grade: ${testCase.expectedGrade} ${pass ? '✅' : '❌'}`);
    }

    if (testCase.expectedScore) {
      const scoreDiff = Math.abs(result.overallScore - testCase.expectedScore);
      const pass = scoreDiff < 1;
      console.log(`Expected Score: ${testCase.expectedScore} (diff: ${scoreDiff.toFixed(1)}) ${pass ? '✅' : '❌'}`);
    }

    if (testCase.note) {
      console.log(`\nNote: ${testCase.note}`);
    }

    console.log(`\nBreakdown:`);
    console.log(`  Base Score: ${result.breakdown.baseScore}`);
    console.log(`  Bonuses: ${result.breakdown.totalBonus}`);
    console.log(`  Penalties: ${result.breakdown.totalPenalty}`);
  }
});

console.log('\n' + '═'.repeat(70));
console.log('✅ Grading formula test complete!\n');

console.log('Key Takeaways:');
console.log('- Performance now accounts for 20% of grade (was 0%)');
console.log('- Accessibility now accounts for 10% of grade (was 0%)');
console.log('- Social reduced to 5% (was 20%)');
console.log('- Fast vs slow sites now show ~13 point difference');
console.log('- Missing social media only costs ~4 points (not 20)');
