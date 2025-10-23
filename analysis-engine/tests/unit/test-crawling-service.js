/**
 * Unit Tests: Crawling Service
 * 
 * Tests the CrawlingService class independently.
 */

import { CrawlingService } from '../../services/crawling-service.js';
import { strict as assert } from 'assert';

// Simple test runner
async function runTests() {
  console.log('\n🧪 Testing CrawlingService\n');

  const tests = [
    {
      name: 'Constructor with defaults',
      fn: () => {
        const service = new CrawlingService();
        assert.equal(typeof service.onProgress, 'function');
        console.log('  ✅ Default onProgress is a function');
      }
    },
    {
      name: 'Constructor with custom progress callback',
      fn: () => {
        let called = false;
        const service = new CrawlingService({
          onProgress: () => { called = true; }
        });
        service.onProgress({ step: 'test', message: 'test' });
        assert.equal(called, true);
        console.log('  ✅ Custom progress callback works');
      }
    },
    {
      name: 'getStatistics calculates correctly',
      fn: () => {
        const service = new CrawlingService();
        const mockCrawlData = {
          '/': {
            url: 'https://example.com/',
            html: '<html></html>',
            screenshots: { desktop: 'desktop.png', mobile: 'mobile.png' },
            businessIntelligence: { companyName: 'Example' }
          },
          '/about': {
            url: 'https://example.com/about',
            html: '<html></html>',
            screenshots: { desktop: 'about-desktop.png' },
            businessIntelligence: {}
          }
        };

        const stats = service.getStatistics(mockCrawlData);

        assert.equal(stats.pagesCrawled, 2);
        assert.equal(stats.screenshotsCaptured, 3);
        assert.equal(stats.businessIntelExtracted, 1);
        console.log('  ✅ Statistics calculated correctly');
      }
    },
    {
      name: 'getStatistics handles empty data',
      fn: () => {
        const service = new CrawlingService();
        const stats = service.getStatistics({});

        assert.equal(stats.pagesCrawled, 0);
        assert.equal(stats.screenshotsCaptured, 0);
        assert.equal(stats.businessIntelExtracted, 0);
        console.log('  ✅ Empty data handled correctly');
      }
    },
    {
      name: 'getStatistics handles partial screenshots',
      fn: () => {
        const service = new CrawlingService();
        const mockCrawlData = {
          '/': {
            screenshots: { desktop: 'desktop.png' } // Only desktop
          }
        };

        const stats = service.getStatistics(mockCrawlData);

        assert.equal(stats.screenshotsCaptured, 1);
        console.log('  ✅ Partial screenshots counted correctly');
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
