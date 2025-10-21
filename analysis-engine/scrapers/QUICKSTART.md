# Multi-Page Crawler - Quick Start Guide

Get started with the Multi-Page Crawler in 5 minutes.

## Installation

No additional installation required! The crawler uses existing dependencies:

```bash
cd analysis-engine
npm install  # If not already installed
```

## Basic Usage

### 1. Simple Crawl

```javascript
import { crawlWebsite } from './scrapers/multi-page-crawler.js';

const result = await crawlWebsite('https://example.com');

console.log('Pages crawled:', result.metadata.totalPagesCrawled);
```

### 2. Estimate First

```javascript
import { estimateCrawl } from './scrapers/multi-page-crawler.js';

// Preview what will be crawled
const estimate = await estimateCrawl('https://example.com');
console.log('Will crawl:', estimate.estimatedCrawl.total, 'pages');

// Now crawl
const result = await crawlWebsite('https://example.com');
```

### 3. Custom Settings

```javascript
const result = await crawlWebsite('https://example.com', {
  maxTotalPages: 20,           // Limit to 20 pages
  level1SampleRate: 1.0,       // Crawl all main nav pages
  level2PlusSampleRate: 0.5,   // Sample 50% of sub-pages
  maxConcurrentPages: 3        // Crawl 3 pages at a time
});
```

## Common Scenarios

### Scenario 1: Quick Analysis (Homepage + Main Nav)

Perfect for lead qualification:

```javascript
const result = await crawlWebsite('https://example.com', {
  maxTotalPages: 15,
  level1SampleRate: 1.0,     // Get all main pages
  level2PlusSampleRate: 0.0, // Skip sub-pages
  waitForNetworkIdle: false  // Faster
});

// Result: ~10-20 seconds
```

### Scenario 2: Comprehensive Analysis

For detailed competitor analysis:

```javascript
const result = await crawlWebsite('https://example.com', {
  maxTotalPages: 40,
  level1SampleRate: 1.0,
  level2PlusSampleRate: 0.7, // Get 70% of sub-pages
  maxConcurrentPages: 5
});

// Result: ~60-90 seconds
```

### Scenario 3: Fast Timeout-Aware

When you need results fast:

```javascript
const result = await crawlWebsite('https://example.com', {
  pageLoadTimeout: 5000,  // 5 sec per page
  maxCrawlTime: 30000,    // 30 sec total
  maxTotalPages: 15
});

if (result.metadata.timedOut) {
  console.log('Got partial results before timeout');
}
```

## Accessing Results

### Homepage

```javascript
const { homepage } = result;

console.log(homepage.url);        // Final URL
console.log(homepage.html);       // Full HTML
console.log(homepage.depth);      // Always 0
console.log(homepage.loadTime);   // Milliseconds
```

### Additional Pages

```javascript
result.pages.forEach(page => {
  console.log(page.url);           // Page URL
  console.log(page.depth);         // 1, 2, etc.
  console.log(page.discoveredFrom); // Where it was found
  console.log(page.html.length);   // HTML size
});
```

### Metadata

```javascript
const { metadata } = result;

console.log(metadata.totalPagesCrawled);
console.log(metadata.totalLinksFound);
console.log(metadata.crawlTime + 'ms');
console.log(metadata.sampleRates);
console.log(metadata.failedPages);
```

## Error Handling

```javascript
const result = await crawlWebsite('https://example.com');

// Check for failures
if (result.metadata.failedPages.length > 0) {
  console.log('Failed pages:');
  result.metadata.failedPages.forEach(p => {
    console.log(`  ${p.url}: ${p.error}`);
  });
}

// Check for timeout
if (result.metadata.timedOut) {
  console.log('Crawl timed out - got partial results');
}

// Successfully crawled pages
console.log('Success:', result.metadata.totalPagesCrawled, 'pages');
```

## Integration with HTML Parser

```javascript
import { crawlWebsite } from './scrapers/multi-page-crawler.js';
import { parseHTML } from './scrapers/html-parser.js';

// Crawl
const crawlResult = await crawlWebsite('https://example.com');

// Parse homepage
const homepageData = parseHTML(
  crawlResult.homepage.html,
  crawlResult.homepage.url
);

console.log('SEO:', homepageData.seo);
console.log('Content:', homepageData.content);
console.log('Social:', homepageData.social);

// Parse all pages
const allPagesData = crawlResult.pages.map(page => ({
  url: page.url,
  depth: page.depth,
  parsed: parseHTML(page.html, page.url)
}));
```

## Configuration

Edit `analysis-engine/config/scraper-config.json`:

```json
{
  "crawling": {
    "depth": {
      "level_1": {
        "sample_rate": 1.0,
        "max_pages": 20
      },
      "level_2_plus": {
        "sample_rate": 0.5,
        "max_pages": 10
      }
    },
    "limits": {
      "max_total_pages": 30,
      "max_concurrent_pages": 3
    },
    "timeouts": {
      "page_load_timeout": 30000,
      "max_crawl_time": 120000
    }
  }
}
```

## Testing

Run the test suite:

```bash
node tests/test-multi-page-crawler.js
```

Run examples:

```bash
# Basic crawl
node scrapers/multi-page-crawler-example.js 1

# Estimate crawl
node scrapers/multi-page-crawler-example.js 2

# Custom settings
node scrapers/multi-page-crawler-example.js 3
```

## Troubleshooting

### "Failed to crawl homepage"

Check the URL:
```javascript
// ✗ Wrong
await crawlWebsite('example.com');

// ✓ Correct
await crawlWebsite('https://example.com');
```

### "Not enough pages crawled"

Increase sampling:
```javascript
await crawlWebsite('https://example.com', {
  level2PlusSampleRate: 0.8  // Crawl 80% instead of 50%
});
```

### "Crawl is too slow"

Reduce quality for speed:
```javascript
await crawlWebsite('https://example.com', {
  maxTotalPages: 10,
  waitForNetworkIdle: false,
  maxConcurrentPages: 5
});
```

## Performance Tips

**Fast (15-30 seconds):**
- `maxTotalPages: 10`
- `level2PlusSampleRate: 0.0`
- `waitForNetworkIdle: false`

**Balanced (60-90 seconds):**
- `maxTotalPages: 30`
- `level2PlusSampleRate: 0.5`
- `waitForNetworkIdle: true`

**Deep (2-5 minutes):**
- `maxTotalPages: 50`
- `level2PlusSampleRate: 0.8`
- `waitForNetworkIdle: true`

## Next Steps

- Read [MULTI-PAGE-CRAWLER-README.md](./MULTI-PAGE-CRAWLER-README.md) for complete documentation
- Run [multi-page-crawler-example.js](./multi-page-crawler-example.js) for 8 practical examples
- Check [test-multi-page-crawler.js](../tests/test-multi-page-crawler.js) for test suite

## Need Help?

1. Check `metadata.failedPages` for error details
2. Use `estimateCrawl()` to preview before crawling
3. Start with small `maxTotalPages` and increase gradually
4. Review the full README for advanced usage
