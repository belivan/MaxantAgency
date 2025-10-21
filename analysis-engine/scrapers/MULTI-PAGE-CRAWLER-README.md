# Multi-Page Crawler

Intelligent website crawler with configurable depth-based sampling for the MaxantAgency Analysis Engine.

## Features

- **Depth-Based Crawling**: Automatically categorizes pages by depth level (homepage, main nav, sub-pages)
- **Smart Sampling**: Configurable sampling rates for different depth levels
- **Parallel Fetching**: Concurrent page crawling with configurable concurrency
- **Timeout Handling**: Graceful handling of slow pages and overall crawl timeouts
- **Link Filtering**: Excludes cart/checkout pages, file downloads, and non-HTML content
- **Error Recovery**: Continues crawling even when individual pages fail
- **Estimation Mode**: Dry-run analysis to preview what will be crawled

## Installation

The crawler is part of the Analysis Engine and uses existing dependencies:

```bash
cd analysis-engine
npm install
```

Dependencies:
- `playwright` - For page loading
- `cheerio` - For link extraction

## Quick Start

```javascript
import { crawlWebsite } from './scrapers/multi-page-crawler.js';

// Basic crawl with default settings
const result = await crawlWebsite('https://example.com');

console.log('Homepage:', result.homepage.url);
console.log('Pages crawled:', result.metadata.totalPagesCrawled);
console.log('Links found:', result.metadata.totalLinksFound);
```

## Configuration

The crawler reads settings from `config/scraper-config.json`:

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
    "timeouts": {
      "page_load_timeout": 30000,
      "max_crawl_time": 120000
    },
    "limits": {
      "max_total_pages": 30,
      "max_concurrent_pages": 3
    }
  }
}
```

### Depth Levels Explained

- **Level 0 (Homepage)**: Always crawled (e.g., `https://example.com`)
- **Level 1 (Main Navigation)**: Pages linked from homepage, typically 1 path segment deep (e.g., `/about`, `/services`, `/contact`)
- **Level 2+ (Sub-Pages)**: Deeper pages (e.g., `/services/web-design`, `/blog/post-1`)

### Sample Rates

- `1.0` = Crawl ALL pages at this level
- `0.5` = Randomly sample 50% of pages
- `0.0` = Skip this level entirely

## API Reference

### `crawlWebsite(url, options)`

Crawls a website with intelligent depth-based sampling.

**Parameters:**
- `url` (string): Website URL to crawl
- `options` (object, optional): Override default settings
  - `maxTotalPages` (number): Maximum total pages to crawl (default: 30)
  - `maxConcurrentPages` (number): Concurrent page fetches (default: 3)
  - `maxCrawlTime` (number): Maximum crawl time in ms (default: 120000)
  - `pageLoadTimeout` (number): Per-page timeout in ms (default: 30000)
  - `waitForNetworkIdle` (boolean): Wait for network idle (default: true)
  - `level1SampleRate` (number): Level-1 sampling rate (default: 1.0)
  - `level1MaxPages` (number): Max level-1 pages (default: 20)
  - `level2PlusSampleRate` (number): Level-2+ sampling rate (default: 0.5)
  - `level2PlusMaxPages` (number): Max level-2+ pages (default: 10)

**Returns:** Promise<object>

```javascript
{
  homepage: {
    url: 'https://example.com',
    html: '<html>...</html>',
    depth: 0,
    loadTime: 2341
  },
  pages: [
    {
      url: 'https://example.com/about',
      html: '<html>...</html>',
      depth: 1,
      loadTime: 1523,
      discoveredFrom: 'https://example.com'
    }
  ],
  metadata: {
    totalPagesCrawled: 15,
    totalLinksFound: 47,
    crawlTime: 45231,
    sampleRates: {
      level_1: 1.0,
      level_2_plus: 0.5
    },
    failedPages: [],
    timedOut: false
  }
}
```

### `estimateCrawl(url)`

Performs a dry-run analysis to estimate what will be crawled.

**Parameters:**
- `url` (string): Website URL to analyze

**Returns:** Promise<object>

```javascript
{
  totalLinksFound: 47,
  linksByDepth: {
    level_1: 8,
    level_2_plus: 39
  },
  estimatedCrawl: {
    homepage: 1,
    level_1: 8,
    level_2_plus: 10,
    total: 19
  },
  sampleRates: {
    level_1: 1.0,
    level_2_plus: 0.5
  }
}
```

## Usage Examples

### Example 1: Shallow Crawl (Homepage + Main Nav Only)

Perfect for quick analysis of main pages:

```javascript
const result = await crawlWebsite('https://example.com', {
  maxTotalPages: 20,
  level1SampleRate: 1.0,     // Get all main nav pages
  level2PlusSampleRate: 0.0, // Skip sub-pages entirely
  waitForNetworkIdle: false  // Faster
});
```

### Example 2: Deep Crawl with High Sampling

For comprehensive site analysis:

```javascript
const result = await crawlWebsite('https://example.com', {
  maxTotalPages: 50,
  level1SampleRate: 1.0,
  level2PlusSampleRate: 0.8, // Crawl 80% of sub-pages
  maxConcurrentPages: 5
});
```

### Example 3: Estimate Before Crawling

Preview what will be crawled:

```javascript
const estimate = await estimateCrawl('https://example.com');

console.log('Total links:', estimate.totalLinksFound);
console.log('Will crawl:', estimate.estimatedCrawl.total, 'pages');

// Now crawl with confidence
const result = await crawlWebsite('https://example.com');
```

### Example 4: Fast Timeout-Aware Crawl

For time-sensitive operations:

```javascript
const result = await crawlWebsite('https://example.com', {
  pageLoadTimeout: 5000,  // 5 seconds per page
  maxCrawlTime: 30000,    // 30 seconds total
  maxTotalPages: 10
});

if (result.metadata.timedOut) {
  console.log('Partial crawl completed before timeout');
}
```

## Link Filtering

The crawler automatically filters out:

**URL Patterns:**
- `/cart`, `/checkout` - E-commerce flows
- `/login`, `/register`, `/account` - User account pages
- `/admin`, `/wp-admin`, `/wp-login` - Admin panels
- Query parameters: `?add-to-cart=`, `?s=`, `?p=`
- Fragment identifiers: `#section`

**File Types:**
- Documents: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.svg`, `.webp`
- Archives: `.zip`, `.rar`
- Media: `.mp4`, `.mp3`

**Domain Filtering:**
- Only crawls same-domain links by default
- External links are extracted but not followed

## Error Handling

The crawler handles errors gracefully:

```javascript
const result = await crawlWebsite('https://example.com');

// Check for failed pages
if (result.metadata.failedPages.length > 0) {
  console.log('Failed pages:');
  result.metadata.failedPages.forEach(page => {
    console.log(`  ${page.url}: ${page.error}`);
  });
}

// Check for timeout
if (result.metadata.timedOut) {
  console.log('Crawl timed out - partial results returned');
}

// Successfully crawled pages are still available
console.log('Successfully crawled:', result.metadata.totalPagesCrawled, 'pages');
```

## Integration with HTML Parser

Combine with the HTML parser for full analysis:

```javascript
import { crawlWebsite } from './scrapers/multi-page-crawler.js';
import { parseHTML } from './scrapers/html-parser.js';

// Crawl website
const crawlResult = await crawlWebsite('https://example.com', {
  maxTotalPages: 10
});

// Parse homepage
const homepageData = parseHTML(
  crawlResult.homepage.html,
  crawlResult.homepage.url
);

console.log('Homepage SEO:', homepageData.seo);
console.log('Homepage content:', homepageData.content);

// Parse all pages
const parsedPages = crawlResult.pages.map(page => {
  return {
    url: page.url,
    depth: page.depth,
    data: parseHTML(page.html, page.url)
  };
});
```

## Performance Considerations

### Crawl Speed

- **Concurrency**: Higher concurrency = faster crawling, but more server load
- **Network Idle**: Disabling `waitForNetworkIdle` speeds up crawls but may miss dynamic content
- **Timeouts**: Lower timeouts = faster crawling but may fail on slow pages

### Recommended Settings by Use Case

**Quick Analysis (30 seconds):**
```javascript
{
  maxTotalPages: 10,
  maxConcurrentPages: 5,
  level2PlusSampleRate: 0.0,
  waitForNetworkIdle: false,
  pageLoadTimeout: 5000
}
```

**Balanced Analysis (2 minutes):**
```javascript
{
  maxTotalPages: 30,
  maxConcurrentPages: 3,
  level2PlusSampleRate: 0.5,
  waitForNetworkIdle: true,
  pageLoadTimeout: 30000
}
```

**Deep Analysis (5 minutes):**
```javascript
{
  maxTotalPages: 50,
  maxConcurrentPages: 3,
  level2PlusSampleRate: 0.8,
  waitForNetworkIdle: true,
  pageLoadTimeout: 30000,
  maxCrawlTime: 300000
}
```

## Testing

Run the test suite:

```bash
cd analysis-engine
node tests/test-multi-page-crawler.js
```

Run usage examples:

```bash
# Example 1: Basic crawl
node scrapers/multi-page-crawler-example.js 1

# Example 2: Estimate crawl
node scrapers/multi-page-crawler-example.js 2

# Example 3: Custom settings
node scrapers/multi-page-crawler-example.js 3
```

## Troubleshooting

### "Failed to crawl homepage"

- Check if the URL is accessible
- Verify the URL includes protocol (`https://`)
- Check if the site blocks automated browsers

### "Crawl timed out"

- Increase `maxCrawlTime`
- Decrease `maxTotalPages`
- Increase `pageLoadTimeout` for slow sites
- Reduce concurrency to avoid overwhelming the server

### "Too many failed pages"

- Check individual error messages in `metadata.failedPages`
- Some sites may block Playwright's user agent
- Network issues may cause sporadic failures

### "Not enough pages crawled"

- Site may have fewer pages than expected
- Check `estimateCrawl()` to see total available pages
- Increase `level2PlusSampleRate` to crawl more sub-pages
- Check if filters are excluding too many pages

## Architecture

The crawler follows MaxantAgency's architectural patterns:

- **Playwright for Browser Automation**: Same as `screenshot-capture.js`
- **Cheerio for HTML Parsing**: Same as `html-parser.js`
- **ES Modules**: Uses `import/export` syntax
- **Configuration-Driven**: All settings in `scraper-config.json`
- **Error Resilience**: Continues on individual page failures
- **Detailed Logging**: Console output for debugging

## Future Enhancements

Potential improvements for future versions:

- **Sitemap Support**: Parse `sitemap.xml` for complete page list
- **Robots.txt Compliance**: Respect crawl rules
- **Cache Support**: Store crawl results for faster re-analysis
- **JavaScript Execution**: Option to wait for JS-rendered content
- **Custom Link Extractors**: Configurable link selection strategies
- **Breadth-First vs Depth-First**: Configurable crawl order
- **Progressive Disclosure**: Stream results as pages are crawled

## License

MIT License - Part of MaxantAgency Analysis Engine
