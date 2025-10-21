# Multi-Page Crawler - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-PAGE CRAWLER                           │
│                                                                 │
│  Input: URL + Options                                          │
│  Output: { homepage, pages[], metadata }                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIGURATION LAYER                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  scraper-config.json                                     │  │
│  │  ─────────────────────                                   │  │
│  │  • Depth settings (level_1, level_2_plus)                │  │
│  │  • Sample rates (1.0, 0.5, etc.)                         │  │
│  │  • Timeouts (page, total crawl)                          │  │
│  │  • Concurrency limits (3 pages default)                  │  │
│  │  • Filters (exclude patterns, file types)                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER AUTOMATION                           │
│                        (Playwright)                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Chromium Browser Instance                               │  │
│  │  • Headless mode                                         │  │
│  │  • User agent spoofing                                   │  │
│  │  • Viewport: 1920x1080                                   │  │
│  │  • Network idle detection                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CRAWL WORKFLOW                               │
└─────────────────────────────────────────────────────────────────┘

     STEP 1: CRAWL HOMEPAGE
     ┌────────────────────────────────────────────┐
     │  Launch browser                            │
     │  Navigate to homepage                      │
     │  Wait for page load                        │
     │  Extract HTML                              │
     └────────────────────────────────────────────┘
                    │
                    ▼
     ┌────────────────────────────────────────────┐
     │  Homepage Result:                          │
     │  • URL (final after redirects)             │
     │  • HTML (full page source)                 │
     │  • Load time (milliseconds)                │
     │  • Depth: 0                                │
     └────────────────────────────────────────────┘
                    │
                    ▼
     STEP 2: EXTRACT & CATEGORIZE LINKS
     ┌────────────────────────────────────────────┐
     │  Parse HTML with Cheerio                   │
     │  Extract all <a href> links                │
     │  Convert relative → absolute URLs          │
     │  Apply filters (cart, admin, files, etc.)  │
     └────────────────────────────────────────────┘
                    │
                    ▼
     ┌────────────────────────────────────────────┐
     │  Categorize by Depth:                      │
     │                                            │
     │  Level 1 (Main Nav):                       │
     │    /about, /services, /contact             │
     │    /blog, /portfolio, /team                │
     │                                            │
     │  Level 2+ (Sub-pages):                     │
     │    /services/web-design                    │
     │    /blog/post-1                            │
     │    /team/john-doe                          │
     └────────────────────────────────────────────┘
                    │
                    ▼
     STEP 3: APPLY SAMPLING
     ┌────────────────────────────────────────────┐
     │  Level 1: sample_rate = 1.0 (100%)         │
     │    → Select ALL level-1 links              │
     │    → Cap at max_pages (20)                 │
     │                                            │
     │  Level 2+: sample_rate = 0.5 (50%)         │
     │    → Randomly select 50% of links          │
     │    → Cap at max_pages (10)                 │
     │                                            │
     │  Apply global max_total_pages limit (30)   │
     └────────────────────────────────────────────┘
                    │
                    ▼
     ┌────────────────────────────────────────────┐
     │  Crawl Queue:                              │
     │  [                                         │
     │    { url: '/about', depth: 1 },            │
     │    { url: '/services', depth: 1 },         │
     │    { url: '/contact', depth: 1 },          │
     │    { url: '/services/web', depth: 2 },     │
     │    ... (up to 29 more pages)               │
     │  ]                                         │
     └────────────────────────────────────────────┘
                    │
                    ▼
     STEP 4: PARALLEL FETCH (Batches of 3)
     ┌─────────────┬─────────────┬─────────────┐
     │  Batch 1    │             │             │
     │  ─────────  │             │             │
     │  /about     │  /services  │  /contact   │
     │  (3 pages)  │             │             │
     └─────────────┴─────────────┴─────────────┘
                    │
                    ▼
     ┌─────────────┬─────────────┬─────────────┐
     │  Batch 2    │             │             │
     │  ─────────  │             │             │
     │  /blog      │  /portfolio │  /team      │
     │  (3 pages)  │             │             │
     └─────────────┴─────────────┴─────────────┘
                    │
                    ▼
     ┌─────────────┬─────────────┬─────────────┐
     │  Batch 3    │             │             │
     │  ─────────  │             │             │
     │  /services/ │  /blog/     │  /team/     │
     │  web        │  post-1     │  john       │
     └─────────────┴─────────────┴─────────────┘
                    │
                    │ (Continue until queue empty
                    │  or timeout reached)
                    ▼
     STEP 5: AGGREGATE RESULTS
     ┌────────────────────────────────────────────┐
     │  Successful Pages:                         │
     │  • Store HTML, URL, depth, load time       │
     │  • Track discoveredFrom link               │
     │                                            │
     │  Failed Pages:                             │
     │  • Store URL and error message             │
     │  • Continue crawling other pages           │
     │                                            │
     │  Metadata:                                 │
     │  • Total pages crawled                     │
     │  • Total links found                       │
     │  • Crawl time                              │
     │  • Sample rates used                       │
     │  • Timeout status                          │
     └────────────────────────────────────────────┘
                    │
                    ▼
     STEP 6: RETURN RESULTS
     ┌────────────────────────────────────────────┐
     │  {                                         │
     │    homepage: {                             │
     │      url, html, depth: 0, loadTime         │
     │    },                                      │
     │    pages: [                                │
     │      { url, html, depth, loadTime,         │
     │        discoveredFrom },                   │
     │      ...                                   │
     │    ],                                      │
     │    metadata: {                             │
     │      totalPagesCrawled,                    │
     │      totalLinksFound,                      │
     │      crawlTime,                            │
     │      sampleRates,                          │
     │      failedPages,                          │
     │      timedOut                              │
     │    }                                       │
     │  }                                         │
     └────────────────────────────────────────────┘

```

## Component Breakdown

### 1. Configuration Loader

**Location:** Top of `multi-page-crawler.js`

**Responsibilities:**
- Load `scraper-config.json`
- Fallback to default config if file missing
- Merge runtime options with config defaults

**Key Settings:**
- `depth.level_1.sample_rate`: 1.0 (crawl all)
- `depth.level_2_plus.sample_rate`: 0.5 (sample 50%)
- `limits.max_total_pages`: 30
- `limits.max_concurrent_pages`: 3
- `timeouts.page_load_timeout`: 30000ms
- `timeouts.max_crawl_time`: 120000ms

### 2. Browser Manager

**Technology:** Playwright Chromium

**Lifecycle:**
1. Launch browser (once per crawl)
2. Create new context per page (isolation)
3. Navigate and wait for load
4. Extract HTML
5. Close context
6. Close browser when done

**Features:**
- Headless mode (no GUI)
- Custom user agent (avoid bot detection)
- Network idle detection (optional)
- Timeout protection

### 3. Link Extractor

**Technology:** Cheerio (HTML parsing)

**Process:**
1. Load HTML into Cheerio
2. Select all `<a href>` elements
3. Extract href attributes
4. Convert relative → absolute URLs
5. Apply domain filter (same-domain only)
6. Apply pattern filters (exclude cart, admin, etc.)
7. Apply file type filters (exclude PDFs, images, etc.)
8. Remove duplicates
9. Remove fragment identifiers (#section)

**Output:** Array of unique, filtered, absolute URLs

### 4. Depth Categorizer

**Algorithm:**

```javascript
const basePath = new URL(baseUrl).pathname;
const linkPath = new URL(link).pathname;

const baseSegments = basePath.split('/').filter(Boolean);
const linkSegments = linkPath.split('/').filter(Boolean);

const depth = linkSegments.length - baseSegments.length;

if (depth === 1) {
  // Level 1: Main navigation
  categorized.level_1.push(link);
} else {
  // Level 2+: Sub-pages
  categorized.level_2_plus.push(link);
}
```

**Examples:**

| Base URL | Link URL | Depth | Category |
|----------|----------|-------|----------|
| https://example.com | /about | 1 | Level 1 |
| https://example.com | /services | 1 | Level 1 |
| https://example.com | /services/web-design | 2 | Level 2+ |
| https://example.com | /blog/2024/post-1 | 3 | Level 2+ |

### 5. Sampler

**Algorithm:** Random sampling with cap

```javascript
function sampleLinks(links, sampleRate, maxPages) {
  // Apply sample rate
  let sampled = links.filter(() => Math.random() < sampleRate);

  // Apply max pages
  if (sampled.length > maxPages) {
    sampled = shuffleArray(sampled).slice(0, maxPages);
  }

  return sampled;
}
```

**Example:**

| Input | Sample Rate | Max Pages | Output |
|-------|-------------|-----------|--------|
| 20 links | 1.0 (100%) | 20 | 20 links |
| 20 links | 0.5 (50%) | 10 | ~10 links (random) |
| 5 links | 0.5 (50%) | 10 | ~2-3 links (random) |
| 30 links | 1.0 (100%) | 20 | 20 links (capped) |

### 6. Parallel Fetcher

**Concurrency Control:** Batch processing

```javascript
const concurrency = 3; // Crawl 3 pages at once

for (let i = 0; i < queue.length; i += concurrency) {
  const batch = queue.slice(i, i + concurrency);

  // Crawl batch in parallel
  const results = await Promise.allSettled(
    batch.map(item => crawlPage(browser, item.url, ...))
  );

  // Handle results
  // ...
}
```

**Benefits:**
- Faster than sequential (3x speedup)
- Prevents server overload (vs unlimited concurrency)
- Graceful error handling (Promise.allSettled)

### 7. Error Handler

**Error Types:**

| Error | Cause | Handling |
|-------|-------|----------|
| HTTP 4xx/5xx | Server error | Mark as failed, continue |
| Timeout | Slow page | Mark as failed, continue |
| DNS error | Invalid domain | Mark as failed, continue |
| Network error | Connection issue | Mark as failed, continue |
| Browser crash | Playwright error | Mark as failed, continue |

**Recovery:**
- Individual page failures don't stop crawl
- Failed pages tracked in `metadata.failedPages`
- Successfully crawled pages still returned

### 8. Result Aggregator

**Data Structure:**

```javascript
{
  homepage: {
    url: string,
    html: string,
    depth: 0,
    loadTime: number
  },
  pages: [
    {
      url: string,
      html: string,
      depth: number,
      loadTime: number,
      discoveredFrom: string
    }
  ],
  metadata: {
    totalPagesCrawled: number,
    totalLinksFound: number,
    crawlTime: number,
    sampleRates: {
      level_1: number,
      level_2_plus: number
    },
    failedPages: [
      { url: string, error: string }
    ],
    timedOut: boolean
  }
}
```

## Integration Points

### With Existing Scrapers

```
┌─────────────────────────────────────────┐
│  screenshot-capture.js                  │
│  • Uses Playwright (same as crawler)    │
│  • Captures screenshots                 │
│  • Can be called on crawled pages       │
└─────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│  multi-page-crawler.js                  │
│  • Uses Playwright to fetch HTML        │
│  • Returns raw HTML for all pages       │
└─────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│  html-parser.js                         │
│  • Uses Cheerio (same as crawler)       │
│  • Parses HTML into structured data     │
│  • Extracts SEO, content, social data   │
└─────────────────────────────────────────┘
```

### With Analysis Pipeline

```
┌────────────────────────────────────────────────────┐
│  Orchestrator (orchestrator.js)                    │
└────────────────────────────────────────────────────┘
                      │
                      ▼
     ┌────────────────────────────────┐
     │  1. Crawl Website              │
     │     crawlWebsite(url)          │
     └────────────────────────────────┘
                      │
                      ▼
     ┌────────────────────────────────┐
     │  2. Parse All Pages            │
     │     parseHTML(html, url)       │
     └────────────────────────────────┘
                      │
                      ▼
     ┌────────────────────────────────┐
     │  3. Extract Business Intel     │
     │     (Agent 2's job)            │
     └────────────────────────────────┘
                      │
                      ▼
     ┌────────────────────────────────┐
     │  4. Run AI Analyzers           │
     │     (design, SEO, content)     │
     └────────────────────────────────┘
                      │
                      ▼
     ┌────────────────────────────────┐
     │  5. Calculate Grade            │
     │     (grading-system.js)        │
     └────────────────────────────────┘
                      │
                      ▼
     ┌────────────────────────────────┐
     │  6. Save to Database           │
     │     (supabase-client.js)       │
     └────────────────────────────────┘
```

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Crawl homepage | O(1) | Single page fetch |
| Extract links | O(n) | n = number of links on page |
| Categorize links | O(n) | n = number of links |
| Sample links | O(n log n) | Shuffle algorithm |
| Crawl queue | O(m/c) | m = queue size, c = concurrency |
| Parse HTML | O(h) | h = HTML size |

### Space Complexity

| Data | Size | Notes |
|------|------|-------|
| Homepage HTML | ~50-500 KB | Typical website |
| Per-page HTML | ~20-200 KB | Varies by page |
| 30 pages | ~1-10 MB | Total HTML storage |
| Metadata | ~1-5 KB | Small overhead |

### Network Complexity

| Concurrency | Pages/sec | Total Time (30 pages) |
|-------------|-----------|----------------------|
| 1 | ~0.3-0.5 | 60-100 seconds |
| 3 (default) | ~0.8-1.2 | 25-40 seconds |
| 5 | ~1.2-2.0 | 15-25 seconds |
| 10 | ~1.5-2.5 | 12-20 seconds |

*Note: Times vary based on website speed and network latency*

## Security Considerations

### User Agent

- Uses realistic Chrome user agent
- Avoids detection as bot
- Some sites may still block automated browsers

### Rate Limiting

- Respects concurrency limits
- Doesn't overwhelm servers
- Can be adjusted per site

### Data Privacy

- Only crawls publicly accessible pages
- Doesn't store authentication cookies
- Respects same-domain restriction

### Excluded Patterns

- `/admin`, `/wp-admin` - Avoid admin areas
- `/login`, `/register` - Skip auth flows
- `/cart`, `/checkout` - Avoid e-commerce triggers

## Scalability

### Current Limits

- Default: 30 pages per website
- Configurable up to 100+ pages
- Single-threaded browser (one at a time)

### Potential Optimizations

1. **Multiple browsers**: Parallel browser instances
2. **Distributed crawling**: Separate workers per website
3. **Cache layer**: Store crawl results (24h TTL)
4. **Queue system**: Redis/RabbitMQ for large queues
5. **Sitemap parsing**: Pre-extract all URLs from sitemap.xml

## Error Scenarios

### Scenario 1: Homepage Fails

**Cause:** DNS error, 404, timeout

**Result:** Exception thrown, no partial results

**Handling:** Catch at orchestrator level

### Scenario 2: Some Pages Fail

**Cause:** Individual page errors

**Result:** Partial results with failed pages tracked

**Handling:** Check `metadata.failedPages`, continue with successful pages

### Scenario 3: Timeout Reached

**Cause:** `maxCrawlTime` exceeded

**Result:** Partial results with `timedOut: true`

**Handling:** Use partial data, log warning

### Scenario 4: All Pages Fail

**Cause:** Site blocks Playwright, network issues

**Result:** Only homepage returned

**Handling:** Fallback to single-page analysis

## Future Enhancements

1. **Sitemap Support**
   - Parse `sitemap.xml` for complete URL list
   - More accurate than link extraction

2. **Robots.txt Compliance**
   - Respect `User-agent: *` rules
   - Skip disallowed paths

3. **JavaScript Rendering**
   - Wait for JS-rendered content
   - Handle SPAs (React, Vue, Angular)

4. **Breadth-First Crawl**
   - Crawl by priority (main nav first)
   - Progressive disclosure of results

5. **Streaming Results**
   - Return pages as they're crawled
   - Don't wait for entire crawl to complete

6. **Link Graph Analysis**
   - Build site structure map
   - Identify important pages by link count

7. **Content Deduplication**
   - Detect duplicate pages
   - Skip near-identical content

8. **Smart Retry Logic**
   - Retry failed pages with exponential backoff
   - Detect temporary vs permanent failures
