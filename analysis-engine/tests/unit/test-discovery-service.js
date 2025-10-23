/**
 * Unit Tests: Discovery Service
 * 
 * Tests the DiscoveryService class independently.
 */

import { DiscoveryService } from '../../services/discovery-service.js';
import { strict as assert } from 'assert';

// Simple test runner
async function runTests() {
  console.log('\n🧪 Testing DiscoveryService\n');
  
  const tests = [
    {
      name: 'Constructor with defaults',
      fn: () => {
        const service = new DiscoveryService();
        assert.equal(service.timeout, 30000);
        console.log('  ✅ Default timeout is 30000');
      }
    },
    {
      name: 'Constructor with custom options',
      fn: () => {
        const service = new DiscoveryService({ timeout: 60000 });
        assert.equal(service.timeout, 60000);
        console.log('  ✅ Custom timeout accepted');
      }
    },
    {
      name: 'getStatistics with valid data',
      fn: () => {
        const service = new DiscoveryService();
        const mockSitemap = {
          totalPages: 25,
          pages: ['/about', '/contact'],
          sources: ['sitemap.xml'],
          errors: {},
          discoveryTime: 1500
        };
        const stats = service.getStatistics(mockSitemap);
        assert.equal(stats.totalPages, 25);
        assert.deepEqual(stats.sources, ['sitemap.xml']);
        assert.equal(stats.hasSitemap, true);
        assert.equal(stats.discoveryTime, 1500);
        console.log('  ✅ Statistics calculated correctly');
      }
    },
    {
      name: 'getStatistics detects errors',
      fn: () => {
        const service = new DiscoveryService();
        const mockSitemap = {
          totalPages: 10,
          pages: [],
          sources: [],
          errors: { sitemap: 'Not found' },
          discoveryTime: 500
        };
        const stats = service.getStatistics(mockSitemap);
        assert.equal(stats.hasSitemap, false);
        console.log('  ✅ Errors detected correctly');
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
