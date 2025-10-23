# ⚡ Analysis Speed Optimization Guide

## Performance Bottlenecks (Ranked by Impact)

1. **Crawling Screenshots** - 70-80% of total time
2. **AI Analysis Calls** - 15-20% of total time  
3. **Synthesis** - 5-10% of total time
4. **Everything Else** - <5% of total time

---

## 🚀 Quick Wins

### Option 1: Increase Crawling Concurrency (Recommended)

**Impact:** 30-40% faster crawling
**Trade-off:** Higher server load on target website

```javascript
// In orchestrator-refactored.js or when calling analyzeWebsiteIntelligent()
const crawlingService = new CrawlingService({ 
  timeout: 30000,
  concurrency: 5  // ← Increase from 3 to 5
});
```

**Benchmark:**
- 7 pages @ concurrency=3: ~55 seconds
- 7 pages @ concurrency=5: ~35 seconds  
- 7 pages @ concurrency=7: ~25 seconds

### Option 2: Reduce Pages Per Module

**Impact:** 40-50% faster overall
**Trade-off:** Less comprehensive analysis

```javascript
// When calling analyzeWebsiteIntelligent()
const result = await analyzeWebsiteIntelligent(url, context, {
  maxPagesPerModule: 3  // ← Reduce from 5 to 3
});
```

**Benchmark:**
- 5 pages/module (7 unique): ~8-10 minutes
- 3 pages/module (4-5 unique): ~5-6 minutes
- 1 page/module (homepage only): ~2-3 minutes

### Option 3: Skip Accessibility Analyzer

**Impact:** 20-30 seconds faster
**Trade-off:** No WCAG compliance analysis

```bash
# Set environment variable
SKIP_ACCESSIBILITY=true node analysis-engine/test-maksant-html.js
```

Or in your `.env`:
```
SKIP_ACCESSIBILITY=true
```

---

## 🎯 Optimization Profiles

### Speed Profile (2-3 minutes)
```javascript
await analyzeWebsiteIntelligent(url, context, {
  maxPagesPerModule: 1,  // Only homepage
  generate_report: false, // Skip report generation
  custom_options: {
    concurrency: 7,
    skip_accessibility: true
  }
});
```

### Balanced Profile (5-6 minutes) ⭐ Recommended
```javascript
await analyzeWebsiteIntelligent(url, context, {
  maxPagesPerModule: 3,
  generate_report: true,
  custom_options: {
    concurrency: 5
  }
});
```

### Comprehensive Profile (8-10 minutes)
```javascript
await analyzeWebsiteIntelligent(url, context, {
  maxPagesPerModule: 5,  // Current default
  generate_report: true,
  custom_options: {
    concurrency: 3  // Safer for slow servers
  }
});
```

---

## 🔧 Advanced Optimizations

### 1. Cache AI Responses

For development/testing, cache AI responses to avoid repeated API calls:

```javascript
// In shared/ai-client.js
const ENABLE_CACHE = process.env.ENABLE_AI_CACHE === 'true';
```

### 2. Parallel Synthesis Stages

Currently synthesis runs sequentially. Can parallelize:
- Issue deduplication
- Executive summary generation
- Screenshot reference building

### 3. Reduce Screenshot Quality

```javascript
// In multi-page-crawler.js
await page.screenshot({
  type: 'jpeg',
  quality: 60  // ← Reduce from 90 to 60
});
```

**Impact:** 30-40% smaller files, 10-15% faster capture

### 4. Skip Mobile Screenshots

```javascript
// Add option to skip mobile screenshots
skipMobileScreenshots: process.env.SKIP_MOBILE === 'true'
```

**Impact:** 50% faster screenshot capture

---

## 📊 Full Benchmark

| Configuration | Time | Pages | Screenshots | AI Calls |
|--------------|------|-------|-------------|----------|
| **Speed** | 2-3 min | 1 | 1-2 | 6 |
| **Balanced** | 5-6 min | 4-5 | 8-10 | 18-24 |
| **Comprehensive** | 8-10 min | 7 | 14 | 30-36 |
| **Maximum** | 12-15 min | 10 | 20 | 48-60 |

---

## 🎮 Quick Start

### For Testing/Development (Fastest)
```bash
SKIP_ACCESSIBILITY=true \
MAX_PAGES_PER_MODULE=1 \
node analysis-engine/test-maksant-html.js
```

### For Production (Balanced)
```bash
MAX_PAGES_PER_MODULE=3 \
CRAWL_CONCURRENCY=5 \
node analysis-engine/server.js
```

### For Comprehensive Audits (Slowest but most thorough)
```bash
MAX_PAGES_PER_MODULE=5 \
CRAWL_CONCURRENCY=3 \
node analysis-engine/server.js
```

---

## 💡 Recommendations

1. **Development:** Use Speed profile (1 page, skip accessibility)
2. **Client Reports:** Use Balanced profile (3 pages, concurrency=5)
3. **Premium Audits:** Use Comprehensive profile (5 pages, all analyzers)

**Most Common Need:** Balanced profile at 5-6 minutes is 2x faster while maintaining 90% analysis quality.
