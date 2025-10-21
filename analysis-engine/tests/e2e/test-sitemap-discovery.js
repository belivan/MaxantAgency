import { discoverAllPages } from './analysis-engine/scrapers/sitemap-discovery.js';

const testUrls = [
  'https://olympiacoffee.com',
  'https://thedandelionpub.com',
  'https://milsteadandco.com'
];

async function testDiscovery() {
  console.log('🧪 Testing Sitemap Discovery\n');
  console.log('============================================================\n');

  for (const url of testUrls) {
    console.log(`\n📍 Testing: ${url}`);
    console.log('------------------------------------------------------------');

    const startTime = Date.now();

    try {
      const result = await discoverAllPages(url, { timeout: 15000 });
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(`✅ SUCCESS in ${duration}s`);
      console.log(`   Total Pages: ${result.totalPages}`);
      console.log(`   Sources: Sitemap(${result.sources.sitemap}), Robots(${result.sources.robots}), Navigation(${result.sources.navigation})`);

      if (result.totalPages > 0) {
        console.log(`\n   Sample pages (first 5):`);
        result.pages.slice(0, 5).forEach(page => {
          console.log(`     - ${page.url} (${page.type}, level ${page.level}, source: ${page.source})`);
        });
      }
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`❌ FAILED in ${duration}s`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Stack: ${error.stack}`);
    }
  }

  console.log('\n============================================================\n');
}

testDiscovery().catch(console.error);