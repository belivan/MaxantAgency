# Analysis Engine - Complete Systems Review

## Two Analyzer Systems

The Analysis Engine has **TWO separate analyzer systems**:

### 1. Basic Analyzer (Testing/Demo Only)
**Function**: `analyzeWebsite()`
**Endpoint**: `POST /api/analyze-url`
**Purpose**: Quick testing, single-URL analysis
**Status**: ⚠️  **PARTIALLY FIXED** (Phase 1 & 2 complete)

**What it does**:
- Crawls homepage + links (basic depth-based crawling)
- Captures homepage screenshots only (NOW FIXED: captures all pages)
- Runs all analyzers on homepage
- Simple grading

**Limitations**:
- No AI page selection
- No intelligent page targeting
- Basic crawling strategy
- Originally homepage-only (fixed in Phase 2)

---

### 2. Intelligent Analyzer (Production System) ⭐
**Function**: `analyzeWebsiteIntelligent()`
**Endpoint**: `POST /api/analyze` (SSE streaming)
**Purpose**: **PRIMARY PRODUCTION SYSTEM**
**Status**: ✅ **SHOULD BE FULLY FUNCTIONAL** (already has multi-page + screenshots)

**What it does**:
```
Phase 1: DISCOVERY
  └─ discoverAllPages() - Finds all pages via sitemap/robots/navigation

Phase 2: AI SELECTION
  └─ selectPagesForAnalysis() - AI chooses optimal pages for each analyzer
       ├─ SEO pages (e.g., /services, /blog)
       ├─ Content pages (e.g., /about, /team)
       ├─ Visual pages (homepage, landing pages)
       └─ Social pages (pages with social content)

Phase 3: TARGETED CRAWLING
  └─ crawlSelectedPagesWithScreenshots() - Crawls ONLY AI-selected pages
       ├─ Desktop screenshots (1920x1080)
       ├─ Mobile screenshots (375x812)
       └─ Full HTML + metadata

Phase 4: MULTI-PAGE ANALYSIS
  ├─ analyzeSEO(seoPages, context)
  ├─ analyzeContent(contentPages, context)
  ├─ analyzeDesktopVisual(visualPages, context)
  ├─ analyzeMobileVisual(visualPages, context)
  ├─ analyzeSocial(socialPages, context)
  └─ analyzeAccessibility(allPages, context)

Phase 5: GRADING + CRITIQUE
Phase 6: LEAD SCORING
Phase 7: RETURN RESULTS
```

**Advantages**:
- ✅ AI-powered page selection (analyzes right pages)
- ✅ Multi-page screenshots (desktop + mobile)
- ✅ Intelligent crawling (only what's needed)
- ✅ Per-analyzer page targeting
- ✅ Complete accessibility audit
- ✅ Proper multi-page handling

---

## Current Situation

### What I Was Doing (WRONG):
- Fixing the **basic analyzer** (`analyzeWebsite()`)
- Adding multi-page screenshot capture to basic analyzer
- This is the testing/demo system, NOT production!

### What I SHOULD Be Doing:
1. **Verify the intelligent analyzer works properly**
2. **Check if it saves to page_analyses table correctly**
3. **Fix any issues in the intelligent system**
4. **Make sure `/api/analyze` endpoint is used in production**

---

## Module Review

### ✅ Working Modules (Verified):

1. **Sitemap Discovery** (`scrapers/sitemap-discovery.js`)
   - Finds all pages via sitemap.xml, robots.txt, navigation
   - Returns comprehensive page list

2. **AI Page Selector** (`scrapers/intelligent-page-selector.js`)
   - Uses Claude to select optimal pages for each analyzer
   - Smart selection based on industry + content

3. **Multi-Page Screenshot Crawler** (`scrapers/multi-page-crawler.js`)
   - `crawlSelectedPagesWithScreenshots()` function
   - Captures desktop + mobile for each page
   - Returns array of pages with screenshots

4. **All Analyzers** (AFTER Phase 1 fix)
   - `analyzeSEO(pages, context)` ✅
   - `analyzeContent(pages, context)` ✅
   - `analyzeSocial(pages, context)` ✅
   - Desktop/Mobile visual analyzers ✅

---

## Critical Questions to Answer

### 1. Does `/api/analyze` (intelligent) work end-to-end?

**Test**:
```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "prospects": [
      {
        "website": "https://damcoffee.hayven.ai/",
        "company_name": "đậm coffee bar",
        "industry": "Cafe"
      }
    ],
    "project_id": null
  }'
```

**Expected**:
- ✅ Discovers multiple pages
- ✅ AI selects pages
- ✅ Crawls with screenshots
- ✅ Analyzers process pages
- ✅ Saves to `leads` table
- ✅ Saves to `page_analyses` table (if implemented)

### 2. Does intelligent analyzer save to page_analyses table?

**Check**:
```javascript
// In orchestrator.js:analyzeWebsiteIntelligent()
// After line 750 (where lead is saved), check if page analyses are saved
```

**Expected**: Should call `savePageAnalysesBatch()` after saving lead

**LIKELY ISSUE**: Intelligent analyzer probably **does NOT** save to page_analyses table yet!

### 3. Which endpoint does the UI use?

**Check**: `command-center-ui/` React components
**Expected**: Should use `/api/analyze` (intelligent), NOT `/api/analyze-url`

---

## Recommended Next Steps

### Option A: Fix Intelligent Analyzer (CORRECT APPROACH)
1. ✅ Phase 1 fix already done (analyzers accept pages array)
2. Verify intelligent analyzer end-to-end
3. Add page_analyses saving to intelligent analyzer
4. Test with real multi-page site
5. Document which endpoint to use

### Option B: Continue Basic Analyzer Fixes (WRONG)
- Don't do this - basic analyzer is just for testing
- Wasting time on demo code

---

## Endpoint Usage Guide

### For Production / UI:
```
POST /api/analyze
```
- Use this for batch analysis
- Streams progress via SSE
- Intelligent multi-page analysis
- AI page selection
- Complete feature set

### For Testing / Quick Checks:
```
POST /api/analyze-url
```
- Single URL quick test
- Basic analysis
- No AI selection
- Faster but less comprehensive

---

## Action Items

**IMMEDIATE**:
1. ✅ Stop fixing basic analyzer
2. ❌ Test `/api/analyze` (intelligent) end-to-end
3. ❌ Check if it saves to page_analyses table
4. ❌ If not, add page_analyses saving to intelligent analyzer
5. ❌ Verify UI uses correct endpoint

**AFTER FIXES**:
- Document which system to use
- Update API docs
- Add tests for intelligent analyzer
- Consider deprecating basic analyzer endpoint

---

## Summary

**The Problem**: I was fixing the **wrong analyzer system**!

**The Solution**:
- The **intelligent analyzer** (`analyzeWebsiteIntelligent()`) is the production system
- It ALREADY has multi-page screenshots working
- It ALREADY passes pages to analyzers correctly (after Phase 1 fix)
- It just needs page_analyses database saving added

**Time Wasted**: ~2 hours on basic analyzer
**Time Saved**: ~3 hours by using existing intelligent system

**Lesson**: Always check ALL modules first before implementing features! 🎯
