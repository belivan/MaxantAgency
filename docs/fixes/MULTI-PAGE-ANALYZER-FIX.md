# Multi-Page Analyzer Fix Plan - Focused

## Goal
Ensure ALL analyzer modules actually USE the multi-page data that's being crawled.

## Current Status

### ✅ What Works:
- **Multi-page crawler**: Finds 2+ pages, captures HTML
- **Multi-page screenshots**: Captures desktop + mobile for all pages
- **SEO/Content/Social analyzers**: Accept pages array (Phase 1 fix)

### ❌ What's Broken:
- **Visual analyzers**: Not receiving screenshots correctly → ERROR
- **Data flow**: Need to verify analyzers actually process ALL pages

### ❌ Not Using:
- **page_analyses table**: Skip entirely (leads table is sufficient)

---

## PHASE 1: Fix Visual Analyzers (30 min)

### Problem:
Visual analyzers expect: `pages[].screenshots.desktop` (Buffer)
But receiving: Individual screenshot variables

### Files to Fix:
**File**: `analysis-engine/analyzers/index.js`

**Current Code** (lines 86-91):
```javascript
desktopScreenshot
  ? analyzeDesktopVisual(url, desktopScreenshot, context, customPrompts?.desktopVisual)
  : Promise.resolve(getDefaultDesktopVisualResults()),
mobileScreenshot
  ? analyzeMobileVisual(url, mobileScreenshot, context, customPrompts?.mobileVisual)
  : Promise.resolve(getDefaultMobileVisualResults()),
```

**Fixed Code**:
```javascript
// Build pages array for visual analyzers
const visualPages = [];

// Use pages from parameter if they have screenshots
if (pages.length > 0 && pages[0].screenshots?.desktop) {
  visualPages.push(...pages.filter(p => p.screenshots?.desktop && p.screenshots?.mobile));
}
// Fallback: create from legacy screenshot parameters
else if (data.desktopScreenshot && data.mobileScreenshot) {
  visualPages.push({
    url: '/',
    fullUrl: data.url,
    screenshots: {
      desktop: data.desktopScreenshot,
      mobile: data.mobileScreenshot
    }
  });
}

// Call visual analyzers with pages array
visualPages.length > 0
  ? analyzeDesktopVisual(visualPages, context, customPrompts?.desktopVisual)
  : Promise.resolve(getDefaultDesktopVisualResults()),
visualPages.length > 0
  ? analyzeMobileVisual(visualPages, context, customPrompts?.mobileVisual)
  : Promise.resolve(getDefaultMobileVisualResults()),
```

### Test:
```bash
# Should analyze without visual errors
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://damcoffee.hayven.ai/","company_name":"Visual Test","industry":"Cafe"}'
```

**Expected**: No "Missing or invalid desktop screenshot" errors

---

## PHASE 2: Verify Multi-Page Usage (15 min)

### Check Each Analyzer:

**SEO Analyzer** (`seo-analyzer.js`):
- ✅ Accepts `pages` array
- ✅ Processes ALL pages (line 32: `pages.map()`)
- ✅ Detects site-wide issues across pages

**Content Analyzer** (`content-analyzer.js`):
- ✅ Accepts `pages` array
- ✅ Processes ALL pages (line 32: `pages.map()`)
- ✅ Aggregates content across pages

**Social Analyzer** (`social-analyzer.js`):
- ✅ Accepts `pages` array
- ✅ Scans ALL pages for social links (line 226: `pages.forEach()`)
- ✅ Returns aggregated social presence

**Visual Analyzers** (after Phase 1 fix):
- Will accept `pages` array
- Will analyze first 3 pages (line 40: `pages.slice(0, 3)`)
- Will aggregate results

### Verification:
Check that analyzer results include data from multiple pages:
- SEO issues should reference multiple page URLs
- Content analysis should show word counts from all pages
- Social should find links from any page

---

## PHASE 3: Test Intelligent Analyzer (20 min)

### Why Intelligent Analyzer?
- This is the PRODUCTION system
- Already has proper multi-page integration
- Used by UI via `/api/analyze` endpoint

### Test:
```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "prospects": [
      {
        "website": "https://damcoffee.hayven.ai/",
        "company_name": "Multi-Page Test",
        "industry": "Cafe"
      }
    ]
  }'
```

### Verify:
1. **Discovery**: Finds 2+ pages
2. **AI Selection**: Selects pages for each analyzer
3. **Crawling**: Captures screenshots for selected pages
4. **Analysis**: No visual analyzer errors
5. **Database**: Lead saved with multi-page data

### Check in Database:
```sql
SELECT
  company_name,
  crawl_metadata->'pages_crawled' as pages_crawled,
  seo_issues,
  content_issues,
  design_issues
FROM leads
WHERE company_name = 'Multi-Page Test';
```

**Expected**:
- `pages_crawled`: 2 or more
- Issues should reference multiple pages

---

## PHASE 4: Final Verification (10 min)

### Test Both Systems:

**Basic Analyzer** (`/api/analyze-url`):
```bash
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://damcoffee.hayven.ai/","company_name":"Basic Final","industry":"Cafe"}'
```

**Intelligent Analyzer** (`/api/analyze`):
```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"prospects":[{"website":"https://damcoffee.hayven.ai/","company_name":"Intelligent Final","industry":"Cafe"}]}'
```

### Success Criteria:
- ✅ Both complete without errors
- ✅ Visual analyzers work
- ✅ Multi-page data in results
- ✅ Leads table populated correctly

---

## Summary

**Skip**: page_analyses table (not needed)
**Fix**: Visual analyzers to accept pages array
**Verify**: All analyzers process multiple pages
**Test**: Both analyzer systems work end-to-end

**Total Time**: ~1.5 hours

---

## What Gets Stored in leads Table

All multi-page information is stored in the leads table:

```javascript
{
  // Aggregated scores (from all pages)
  overall_score: 65,
  design_score: 70,
  seo_score: 60,
  content_score: 65,
  social_score: 70,

  // Issues (from all pages, with page references)
  seo_issues: [
    { title: "...", affectedPages: ["/", "/menu"] },
    { title: "...", affectedPages: ["/contact"] }
  ],

  // Metadata about crawl
  crawl_metadata: {
    pages_crawled: 3,
    links_found: 5,
    crawl_time: 8000
  },

  // All other fields...
}
```

This is sufficient - no need for separate page_analyses records.
