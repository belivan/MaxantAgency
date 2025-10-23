/**
 * Unit Tests: Analysis Coordinator
 * 
 * Tests the AnalysisCoordinator class independently.
 */

import { AnalysisCoordinator } from '../../services/analysis-coordinator.js';
import { strict as assert } from 'assert';

// Simple test runner
async function runTests() {
  console.log('\n🧪 Testing AnalysisCoordinator\n');

  const tests = [
    {
      name: 'Constructor with defaults',
      fn: () => {
        const coordinator = new AnalysisCoordinator();
        assert.equal(typeof coordinator.onProgress, 'function');
        console.log('  ✅ Default onProgress is a function');
      }
    },
    {
      name: 'enrichContext adds discovery status',
      fn: () => {
        const coordinator = new AnalysisCoordinator();
        const context = { company_name: 'Test Company' };
        const discoveryData = { totalPages: 25, sources: ['sitemap.xml'] };

        const enriched = coordinator.enrichContext(context, discoveryData);

        assert.equal(enriched.company_name, 'Test Company');
        assert.equal(enriched.discoveryStatus.totalPages, 25);
        assert.equal(enriched.discoveryStatus.sources[0], 'sitemap.xml');
        console.log('  ✅ Context enriched correctly');
      }
    },
    {
      name: 'enrichContext preserves original properties',
      fn: () => {
        const coordinator = new AnalysisCoordinator();
        const context = {
          company_name: 'Test',
          customField: 'custom value'
        };
        const discoveryData = { totalPages: 10, sources: [] };

        const enriched = coordinator.enrichContext(context, discoveryData);

        assert.equal(enriched.customField, 'custom value');
        console.log('  ✅ Original properties preserved');
      }
    },
    {
      name: 'getStatistics calculates correctly',
      fn: () => {
        const coordinator = new AnalysisCoordinator();
        const mockResults = {
          seo: { score: 100 },
          content: { score: 80 },
          desktopVisual: { score: 60 }
        };

        const stats = coordinator.getStatistics(mockResults);

        assert.equal(stats.modulesRun, 3);
        assert.equal(stats.modulesFailed, 0);
        assert.equal(stats.averageScore, 80);
        console.log('  ✅ Statistics calculated correctly');
      }
    },
    {
      name: 'getStatistics handles failed modules',
      fn: () => {
        const coordinator = new AnalysisCoordinator();
        const mockResults = {
          seo: { score: 85 },
          content: { error: 'Failed' },
          desktopVisual: { score: 88 }
        };

        const stats = coordinator.getStatistics(mockResults);

        assert.equal(stats.modulesRun, 3);
        assert.equal(stats.modulesFailed, 1);
        console.log('  ✅ Failed modules detected correctly');
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
