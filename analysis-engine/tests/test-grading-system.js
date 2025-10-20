/**
 * Grading System Tests
 *
 * Tests the grading and critique generation modules
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`);
    testsPassed++;
  } else {
    console.log(`❌ ${message}`);
    testsFailed++;
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('GRADING SYSTEM TESTS');
console.log('═══════════════════════════════════════════════════════════════\n');

// Test 1: Import grading modules
console.log('Test 1: Import grading modules');
console.log('─────────────────────────────────────────────────────────────');

try {
  const grader = await import('../grading/grader.js');
  assert(typeof grader.calculateGrade === 'function', 'grader exports calculateGrade');
  assert(typeof grader.extractQuickWins === 'function', 'grader exports extractQuickWins');
  assert(typeof grader.getTopIssue === 'function', 'grader exports getTopIssue');

  const critiqueGen = await import('../grading/critique-generator.js');
  assert(typeof critiqueGen.generateCritique === 'function', 'critique-generator exports generateCritique');
  assert(typeof critiqueGen.generateOneLiner === 'function', 'critique-generator exports generateOneLiner');

  console.log('');
} catch (error) {
  console.error('❌ Failed to import grading modules:', error.message);
  testsFailed++;
}

// Test 2: Calculate grades
console.log('Test 2: Calculate letter grades');
console.log('─────────────────────────────────────────────────────────────');

try {
  const { calculateGrade } = await import('../grading/grader.js');

  // Test A grade
  const gradeA = calculateGrade({ design: 90, seo: 88, content: 85, social: 86 });
  assert(gradeA.grade === 'A', `A grade for high scores (got ${gradeA.grade})`);
  assert(gradeA.overallScore >= 85, `A grade score >= 85 (got ${gradeA.overallScore})`);

  // Test B grade
  const gradeB = calculateGrade({ design: 75, seo: 72, content: 70, social: 68 });
  assert(gradeB.grade === 'B', `B grade for good scores (got ${gradeB.grade})`);
  assert(gradeB.overallScore >= 70 && gradeB.overallScore < 85, `B grade score 70-84 (got ${gradeB.overallScore})`);

  // Test C grade
  const gradeC = calculateGrade({ design: 60, seo: 58, content: 55, social: 62 });
  assert(gradeC.grade === 'C', `C grade for average scores (got ${gradeC.grade})`);

  // Test D grade
  const gradeD = calculateGrade({ design: 45, seo: 48, content: 42, social: 50 });
  assert(gradeD.grade === 'D', `D grade for poor scores (got ${gradeD.grade})`);

  // Test F grade
  const gradeF = calculateGrade({ design: 30, seo: 25, content: 35, social: 28 });
  assert(gradeF.grade === 'F', `F grade for failing scores (got ${gradeF.grade})`);

  console.log('');
} catch (error) {
  console.error('❌ Grade calculation failed:', error.message);
  testsFailed++;
}

// Test 3: Quick-win bonus
console.log('Test 3: Quick-win bonus calculation');
console.log('─────────────────────────────────────────────────────────────');

try {
  const { calculateGrade } = await import('../grading/grader.js');

  // Without bonus
  const withoutBonus = calculateGrade(
    { design: 68, seo: 66, content: 64, social: 62 },
    { quickWinCount: 2 }
  );

  // With bonus (3+ quick wins)
  const withBonus = calculateGrade(
    { design: 68, seo: 66, content: 64, social: 62 },
    { quickWinCount: 5 }
  );

  assert(
    withBonus.overallScore > withoutBonus.overallScore,
    `Quick-win bonus increases score (${withoutBonus.overallScore} → ${withBonus.overallScore})`
  );

  assert(
    withBonus.breakdown.bonuses.length > 0,
    'Quick-win bonus appears in breakdown'
  );

  console.log('');
} catch (error) {
  console.error('❌ Quick-win bonus test failed:', error.message);
  testsFailed++;
}

// Test 4: Penalties
console.log('Test 4: Penalty calculation');
console.log('─────────────────────────────────────────────────────────────');

try {
  const { calculateGrade } = await import('../grading/grader.js');

  // Without penalties
  const noPenalties = calculateGrade(
    { design: 70, seo: 70, content: 70, social: 70 },
    { isMobileFriendly: true, hasHTTPS: true, siteAccessible: true }
  );

  // With mobile penalty
  const mobilePenalty = calculateGrade(
    { design: 70, seo: 70, content: 70, social: 70 },
    { isMobileFriendly: false, hasHTTPS: true, siteAccessible: true }
  );

  assert(
    mobilePenalty.overallScore < noPenalties.overallScore,
    `Mobile penalty reduces score (${noPenalties.overallScore} → ${mobilePenalty.overallScore})`
  );

  // With HTTPS penalty
  const httpsPenalty = calculateGrade(
    { design: 70, seo: 70, content: 70, social: 70 },
    { isMobileFriendly: true, hasHTTPS: false, siteAccessible: true }
  );

  assert(
    httpsPenalty.overallScore < noPenalties.overallScore,
    `HTTPS penalty reduces score`
  );

  console.log('');
} catch (error) {
  console.error('❌ Penalty test failed:', error.message);
  testsFailed++;
}

// Test 5: Extract quick wins
console.log('Test 5: Extract quick wins from analysis results');
console.log('─────────────────────────────────────────────────────────────');

try {
  const { extractQuickWins } = await import('../grading/grader.js');

  const mockAnalysis = {
    design: {
      issues: [
        { title: 'Fix mobile menu', effort: 'quick-win', description: 'Fix it' },
        { title: 'Major redesign', effort: 'large', description: 'Big job' }
      ]
    },
    seo: {
      quickWins: [
        { title: 'Add meta description', description: 'Add it' },
        { title: 'Fix title tag', description: 'Fix it' }
      ]
    },
    content: {
      issues: [
        { title: 'Add blog', difficulty: 'medium' }
      ]
    },
    social: {
      quickWins: [
        { title: 'Add Instagram link' }
      ]
    }
  };

  const quickWins = extractQuickWins(mockAnalysis);
  assert(quickWins.length === 4, `Extracted 4 quick wins (got ${quickWins.length})`);
  assert(quickWins[0].source === 'design', 'Quick win includes source');
  assert(quickWins[0].title === 'Fix mobile menu', 'Quick win includes title');

  console.log('');
} catch (error) {
  console.error('❌ Extract quick wins failed:', error.message);
  testsFailed++;
}

// Test 6: Get top issue
console.log('Test 6: Get top issue from analysis');
console.log('─────────────────────────────────────────────────────────────');

try {
  const { getTopIssue } = await import('../grading/grader.js');

  const mockAnalysis = {
    design: {
      issues: [
        { title: 'Minor color issue', priority: 'low', severity: 'low' }
      ]
    },
    seo: {
      issues: [
        { title: 'Missing meta description', priority: 'high', severity: 'critical', description: 'No meta tags' }
      ]
    }
  };

  const topIssue = getTopIssue(mockAnalysis);
  assert(topIssue.title === 'Missing meta description', `Top issue is the critical SEO issue (got: ${topIssue.title})`);
  assert(topIssue.source === 'seo', 'Top issue includes source');

  console.log('');
} catch (error) {
  console.error('❌ Get top issue failed:', error.message);
  testsFailed++;
}

// Test 7: Generate critique
console.log('Test 7: Generate critique');
console.log('─────────────────────────────────────────────────────────────');

try {
  const { generateCritique } = await import('../grading/critique-generator.js');

  const mockAnalysis = {
    design: {
      overallDesignScore: 65,
      issues: [{ title: 'Outdated design', priority: 'high', description: 'Looks old' }],
      positives: ['Good color scheme']
    },
    seo: {
      seoScore: 70,
      issues: [{ title: 'Slow load time', severity: 'critical' }]
    },
    content: {
      contentScore: 60,
      hasBlog: false,
      issues: []
    },
    social: {
      socialScore: 50,
      platformsPresent: ['facebook'],
      mostActivePlatform: 'facebook'
    }
  };

  const gradeResults = {
    grade: 'C',
    overallScore: 62,
    gradeLabel: 'Needs Work',
    outreachAngle: 'Has potential'
  };

  const context = {
    company_name: 'Test Restaurant',
    industry: 'Restaurant'
  };

  const critique = generateCritique(mockAnalysis, gradeResults, context);

  assert(typeof critique.summary === 'string', 'Critique includes summary');
  assert(critique.summary.includes('Test Restaurant'), 'Summary includes company name');
  assert(critique.summary.includes('C'), 'Summary includes grade');
  assert(critique.topIssue !== undefined, 'Critique includes top issue');
  assert(Array.isArray(critique.quickWins), 'Critique includes quick wins array');
  assert(critique.sections !== undefined, 'Critique includes sections');
  assert(typeof critique.callToAction === 'string', 'Critique includes call to action');

  console.log('');
} catch (error) {
  console.error('❌ Generate critique failed:', error.message);
  console.error(error.stack);
  testsFailed++;
}

// Test 8: Generate one-liner
console.log('Test 8: Generate one-liner');
console.log('─────────────────────────────────────────────────────────────');

try {
  const { generateOneLiner } = await import('../grading/critique-generator.js');

  const topIssue = {
    title: 'Mobile menu is broken',
    description: 'Menu doesn\'t work on mobile'
  };

  const oneLinerC = generateOneLiner('Pizza Place', topIssue, 'C', 5);
  assert(typeof oneLinerC === 'string', 'One-liner is a string');
  assert(oneLinerC.includes('Pizza Place'), 'One-liner includes company name');

  const oneLinerA = generateOneLiner('Great Site', topIssue, 'A', 3);
  assert(oneLinerA.includes('already-strong'), 'A-grade one-liner mentions strength');

  console.log('');
} catch (error) {
  console.error('❌ Generate one-liner failed:', error.message);
  testsFailed++;
}

// Test Summary
console.log('═══════════════════════════════════════════════════════════════');
console.log('TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`   Total:  ${testsPassed + testsFailed}\n`);

if (testsFailed === 0) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('ALL TESTS PASSED ✅');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('Grading and critique system is working correctly!');
  console.log('Ready for production use!\n');
} else {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`${testsFailed} TESTS FAILED ❌`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(1);
}
