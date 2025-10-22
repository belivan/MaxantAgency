# Database Timeout Fix - RESOLVED ✅

## Date: 2025-10-21

## Problem

Intelligent analyzer (`/api/analyze`) was experiencing database timeout errors:

```
Database save failed: canceling statement due to statement timeout
```

## Root Cause

The `crawl_metadata` JSONB field was storing raw **screenshot Buffer objects** (binary PNG data) instead of just metadata:

**Before (orchestrator.js:853-854):**
```javascript
screenshot_desktop_url: p.screenshots?.desktop || null,  // THIS WAS A BUFFER!
screenshot_mobile_url: p.screenshots?.mobile || null,    // THIS WAS A BUFFER!
```

**Impact:**
- 2 pages × 2 screenshots (desktop + mobile) = 4 screenshots
- ~200KB average per screenshot
- **~800KB of binary data in a single JSONB field**
- Supabase statement timeout exceeded

The comments even said "just file paths, not binary data" but the code was doing the opposite!

## Solution

Modified `analysis-engine/orchestrator.js` (lines 849-860) to store only metadata, not binary data:

**After:**
```javascript
// Pages analyzed (metadata only - screenshots are NOT stored to avoid database bloat)
pages_analyzed: successfulPages.map(p => ({
  url: p.url,
  fullUrl: p.fullUrl,
  has_screenshots: !!(p.screenshots?.desktop && p.screenshots?.mobile),
  analyzed_for: {
    seo: seoPages.some(sp => sp.url === p.url),
    content: contentPages.some(cp => cp.url === p.url),
    visual: visualPages.some(vp => vp.url === p.url),
    social: socialPages.some(sp => sp.url === p.url)
  }
}))
```

## Changes Made

**File:** [analysis-engine/orchestrator.js:849-860](analysis-engine/orchestrator.js#L849-L860)

**Changed:**
- Removed: `screenshot_desktop_url` and `screenshot_mobile_url` fields (were storing Buffers)
- Added: `has_screenshots` boolean flag (metadata only)
- Kept: All analyzer tracking metadata

**Why This Works:**
- Screenshots are analyzed by visual analyzers, then discarded (as intended)
- No need to store screenshot data in database - they're already saved to disk for reports
- `crawl_metadata` now contains only lightweight metadata (~few KB instead of ~800KB)

## Verification

**Test Command:**
```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "prospects": [{
      "website": "https://damcoffee.hayven.ai/",
      "company_name": "Database Timeout Fix Test",
      "industry": "Cafe"
    }]
  }'
```

**Results:**
```
event: success ✅
data: {"current":1,"total":1,"company_name":"Database Timeout Fix Test",
      "url":"https://damcoffee.hayven.ai/","grade":"C","score":58.8}

event: complete
data: {"success":true,"total":1,"successful":1,"failed":0,...}
```

**Server Logs:**
```
💾 [analysis-engine] Local backup saved: database-timeout-fix-test-2025-10-21-1761085501524.json
[Intelligent Analysis] ✓ Database Timeout Fix Test: Grade C (58.8/100)
✅ [analysis-engine] Backup marked as uploaded
[Intelligent Analysis] Completed: 1/1 successful
```

**NO MORE TIMEOUT ERRORS!** ✅

## Impact

**Before:**
- Intelligent analyzer: Database timeout on multi-page analysis
- Database payload: ~800KB+ for 2 pages
- Status: Analysis successful, database save failed

**After:**
- Intelligent analyzer: Database save successful ✅
- Database payload: ~few KB for metadata only
- Status: Full end-to-end success

## Related Files

- **Fixed:** [analysis-engine/orchestrator.js](analysis-engine/orchestrator.js) (lines 849-860)
- **Reference:** [analysis-engine/scrapers/multi-page-crawler.js](analysis-engine/scrapers/multi-page-crawler.js) (lines 731-732 - screenshot Buffer source)

## Lessons Learned

1. **Always check JSONB payload size** - Binary data in JSONB causes massive database bloat
2. **Trust the comments** - "will be analyzed then discarded" was the right approach
3. **Separation of concerns** - Screenshots for AI analysis ≠ Screenshots for database storage
4. **Buffer objects serialize to massive JSON** - Node.js Buffers become huge base64 strings when JSON.stringify is called

## Status

✅ **RESOLVED** - Database timeout fixed, intelligent analyzer working end-to-end
