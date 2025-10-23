/**
 * Unit Tests: Results Aggregator
 * 
 * Tests the ResultsAggregator class independently.
 */

import { ResultsAggregator } from '../../services/results-aggregator.js';
import { strict as assert } from 'assert';

// Simple test runner
async function runTests() {
  console.log('\n🧪 Testing ResultsAggregator\n');

  const tests = [
    {
      name: 'Constructor with defaults',
      fn: () => {
        const aggregator = new ResultsAggregator();
        assert.equal(typeof aggregator.onProgress, 'function');
        console.log('  ✅ Default onProgress is a function');
      }
    },
    {
      name: 'calculateScores works correctly',
      fn: () => {
        const aggregator = new ResultsAggregator();
        const mockResults = {
          seo: { score: 85 },
          content: { score: 90 },
          desktopVisual: { score: 88 },
          mobileVisual: { score: 82 }
        };

        const scores = aggregator.calculateScores(mockResults);

        assert.equal(scores.seo_score, 85);
        assert.equal(scores.content_score, 90);
        assert.equal(scores.design_score, 85); // (88+82)/2
        console.log('  ✅ Scores calculated correctly');
      }
    },
    {
      name: 'extractQuickWins combines from all modules',
      fn: () => {
        const aggregator = new ResultsAggregator();
        const mockResults = {
          seo: { quickWins: ['Fix 1', 'Fix 2'] },
          content: { quickWins: ['Fix 3'] }
        };

        const quickWins = aggregator.extractQuickWins(mockResults);

        assert.equal(quickWins.length, 3);
        console.log('  ✅ Quick wins extracted correctly');
      }
    },
    {
      name: 'calculateGrade assigns correct grades',
      fn: () => {
        const aggregator = new ResultsAggregator();
        
        assert.equal(aggregator.calculateGrade(95), 'A');
        assert.equal(aggregator.calculateGrade(85), 'B');
        assert.equal(aggregator.calculateGrade(75), 'C');
        assert.equal(aggregator.calculateGrade(65), 'D');
        assert.equal(aggregator.calculateGrade(50), 'F');
        console.log('  ✅ Grades calculated correctly');
      }
    },
    {
      name: 'calculateLeadScore returns valid tier',
      fn: () => {
        const aggregator = new ResultsAggregator();
        const mockResults = {
          seo: { score: 85, quickWins: [] },
          content: { score: 90, quickWins: [] }
        };

        const leadScore = aggregator.calculateLeadScore(mockResults, {});

        assert.ok(['Hot', 'Warm', 'Cold'].includes(leadScore.priority_tier));
        assert.ok(leadScore.lead_priority >= 0);
        assert.ok(leadScore.priority_reasoning);
        console.log('  ✅ Lead score calculated correctly');
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error) {
      console.log(`  ❌ ${test.name} failed:`, error.message);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60) + '\n');

  return { total: tests.length, passed, failed };
}

// Run tests
runTests().then(result => {
  process.exit(result.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
