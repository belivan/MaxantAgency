/**
 * Unit Tests: Page Selection Service
 * 
 * Tests the PageSelectionService class independently.
 */

import { PageSelectionService } from '../../services/page-selection-service.js';
import { strict as assert } from 'assert';

// Simple test runner
async function runTests() {
  console.log('\n🧪 Testing PageSelectionService\n');

  const tests = [
    {
      name: 'Constructor with defaults',
      fn: () => {
        const service = new PageSelectionService();
        assert.equal(service.maxPagesPerModule, 5);
        console.log('  ✅ Default maxPagesPerModule is 5');
      }
    },
    {
      name: 'Constructor with custom options',
      fn: () => {
        const service = new PageSelectionService({ maxPagesPerModule: 10 });
        assert.equal(service.maxPagesPerModule, 10);
        console.log('  ✅ Custom maxPagesPerModule accepted');
      }
    },
    {
      name: 'filterPagesForAnalyzer filters correctly',
      fn: () => {
        const service = new PageSelectionService();
        const crawledPages = {
          '/': { url: 'https://example.com/', content: 'Home' },
          '/about': { url: 'https://example.com/about', content: 'About' },
          '/contact': { url: 'https://example.com/contact', content: 'Contact' }
        };
        const selectedUrls = ['https://example.com/', 'https://example.com/about'];
        
        const filtered = service.filterPagesForAnalyzer(crawledPages, selectedUrls);
        
        assert.equal(Object.keys(filtered).length, 2);
        assert.ok(filtered['/']);
        assert.ok(filtered['/about']);
        console.log('  ✅ Pages filtered correctly');
      }
    },
    {
      name: 'filterPagesForAnalyzer normalizes URLs',
      fn: () => {
        const service = new PageSelectionService();
        const crawledPages = {
          '/about/': { url: 'https://example.com/about/', content: 'About' }
        };
        const selectedUrls = ['https://example.com/about']; // No trailing slash
        
        const filtered = service.filterPagesForAnalyzer(crawledPages, selectedUrls);
        
        assert.equal(Object.keys(filtered).length, 1);
        console.log('  ✅ URLs normalized correctly');
      }
    },
    {
      name: 'getStatistics calculates correctly',
      fn: () => {
        const service = new PageSelectionService();
        const mockPageSelection = {
          seo: ['https://example.com/', 'https://example.com/about'],
          content: ['https://example.com/'],
          visual: ['https://example.com/'],
          social: ['https://example.com/'],
          uniquePages: ['https://example.com/', 'https://example.com/about']
        };
        
        const stats = service.getStatistics(mockPageSelection);
        
        assert.equal(stats.totalSelected, 2);
        assert.equal(stats.seoPages, 2);
        assert.equal(stats.contentPages, 1);
        console.log('  ✅ Statistics calculated correctly');
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
