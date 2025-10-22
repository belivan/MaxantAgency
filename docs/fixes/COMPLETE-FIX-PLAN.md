# Complete Multi-Page Analysis System Fix Plan

## Executive Summary

Based on comprehensive code review and exploration, here's what needs to be fixed:

### Current State:
- ✅ **Intelligent Analyzer** - Has proper multi-page support with screenshots
- ✅ **Analyzers** - Accept pages array (after Phase 1 fix)
- ✅ **Crawler** - Returns proper page structure with Buffer screenshots
- ❌ **Visual Analyzers Integration** - Broken in both systems
- ❌ **page_analyses Database** - Table exists but no code saves to it

### Root Causes Found:
1. **Visual analyzers expect**: `page.screenshots.desktop` (Buffer)
2. **Basic analyzer provides**: `desktopScreenshot` variable (not in pages array)
3. **Intelligent analyzer provides**: Correct structure but NOT passed to runAllAnalyses()
4. **Database saving**: Completely missing for page_analyses table

---

## PHASED FIX PLAN

### PHASE 1: Fix Visual Analyzer Integration (30 min) ✅ PARTIALLY DONE

**Issue**: Visual analyzers expect different data structure than what's provided

**Current Broken Flow (Basic Analyzer)**:
```javascript
// orchestrator.js:130
const analysisResults = await runAllAnalyses({
  desktopScreenshot: dualScreenshots.desktop.screenshot,  // ❌ Wrong format
  mobileScreenshot: dualScreenshots.mobile.screenshot,     // ❌ Wrong format
  ...
}, allPages);

// analyzers/index.js:86-87
analyzeDesktopVisual(url, desktopScreenshot, context, ...)  // ❌ Old signature
analyzeMobileVisual(url, mobileScreenshot, context, ...)    // ❌ Old signature
```

**Expected by Visual Analyzers**:
```javascript
// desktop-visual-analyzer.js:27
analyzeDesktopVisual(pages, context, customPrompt)

// Expects: pages[].screenshots.desktop (Buffer)
```

**Fix Required**:
- Update `analyzers/index.js` to pass pages to visual analyzers (not individual screenshots)
- Visual analyzers already expect pages array - just need to route data correctly

**Files to Modify**:
1. `analyzers/index.js` - Fix visual analyzer calls

---

### PHASE 2: Fix Intelligent Analyzer Visual Integration (15 min)

**Issue**: Intelligent analyzer doesn't use `runAllAnalyses()` - it calls analyzers directly

**Current Code** (`orchestrator.js:678-688`):
```javascript
const [seoResults, contentResults, desktopVisualResults, mobileVisualResults, ...] = await Promise.all([
  analyzeSEO(seoPages, enrichedContext, customPrompts?.seo),
  analyzeContent(contentPages, enrichedContext, customPrompts?.content),
  analyzeDesktopVisual(visualPages, enrichedContext, customPrompts?.desktopVisual),  // ✅ Correct!
  analyzeMobileVisual(visualPages, enrichedContext, customPrompts?.mobileVisual),   // ✅ Correct!
  ...
]);
```

**Status**: ✅ **ALREADY CORRECT!** Intelligent analyzer passes pages properly.

**Verification Needed**: Test that visualPages has screenshots attached

---

### PHASE 3: Add page_analyses Database Functions (30 min)

**Issue**: Table exists but no code to save to it

**Files to Modify**:
1. `database/supabase-client.js` - Add 3 new functions

**Functions to Add**:

```javascript
/**
 * Save a single page analysis
 */
export async function savePageAnalysis(leadId, pageData) {
  const { data, error } = await supabase
    .from('page_analyses')
    .insert({
      lead_id: leadId,
      url: pageData.url,
      full_url: pageData.fullUrl,
      page_title: pageData.pageTitle,
      page_type: pageData.pageType || 'other',

      // SEO
      seo_analyzed: pageData.seoAnalyzed || false,
      seo_score: pageData.seoScore,
      seo_issues: pageData.seoIssues || [],

      // Content
      content_analyzed: pageData.contentAnalyzed || false,
      content_score: pageData.contentScore,
      content_issues: pageData.contentIssues || [],

      // Visual Desktop
      visual_desktop_analyzed: pageData.desktopAnalyzed || false,
      visual_desktop_score: pageData.desktopScore,
      visual_desktop_issues: pageData.desktopIssues || [],

      // Visual Mobile
      visual_mobile_analyzed: pageData.mobileAnalyzed || false,
      visual_mobile_score: pageData.mobileScore,
      visual_mobile_issues: pageData.mobileIssues || [],

      // Social
      social_analyzed: pageData.socialAnalyzed || false,
      social_score: pageData.socialScore,
      social_issues: pageData.socialIssues || [],

      // Metadata
      load_time: pageData.loadTime,
      analysis_model: pageData.analysisModel || 'gpt-4o'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Save multiple page analyses in batch
 */
export async function savePageAnalysesBatch(leadId, pagesData) {
  const records = pagesData.map(pageData => ({
    lead_id: leadId,
    url: pageData.url,
    full_url: pageData.fullUrl,
    page_title: pageData.pageTitle,
    page_type: pageData.pageType || 'other',
    seo_analyzed: pageData.seoAnalyzed || false,
    seo_score: pageData.seoScore,
    seo_issues: pageData.seoIssues || [],
    content_analyzed: pageData.contentAnalyzed || false,
    content_score: pageData.contentScore,
    content_issues: pageData.contentIssues || [],
    visual_desktop_analyzed: pageData.desktopAnalyzed || false,
    visual_desktop_score: pageData.desktopScore,
    visual_desktop_issues: pageData.desktopIssues || [],
    visual_mobile_analyzed: pageData.mobileAnalyzed || false,
    visual_mobile_score: pageData.mobileScore,
    visual_mobile_issues: pageData.mobileIssues || [],
    social_analyzed: pageData.socialAnalyzed || false,
    social_score: pageData.socialScore,
    social_issues: pageData.socialIssues || [],
    load_time: pageData.loadTime,
    analysis_model: pageData.analysisModel || 'gpt-4o'
  }));

  const { data, error } = await supabase
    .from('page_analyses')
    .insert(records)
    .select();

  if (error) throw error;
  console.log(`✅ Saved ${data.length} page analyses for lead ${leadId}`);
  return data;
}

/**
 * Get page analyses for a lead
 */
export async function getPageAnalyses(leadId) {
  const { data, error } = await supabase
    .from('page_analyses')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}
```

---

### PHASE 4: Extract Per-Page Data from Intelligent Analyzer (45 min)

**Issue**: Analyzer results are aggregated - need to extract per-page data

**Files to Modify**:
1. `orchestrator.js` - Add helper function

**Function to Add** (before `analyzeWebsiteIntelligent()`):

```javascript
/**
 * Extract per-page analysis data from intelligent analyzer results
 * Maps analyzer results to page_analyses table structure
 */
function extractPageAnalysesFromIntelligent(crawledPages, pageSelection, analysisResults) {
  return crawledPages
    .filter(p => p.success)
    .map(page => {
      // Determine which analyzers processed this page
      const seoAnalyzed = pageSelection.seo_pages.includes(page.url);
      const contentAnalyzed = pageSelection.content_pages.includes(page.url);
      const visualAnalyzed = pageSelection.visual_pages.includes(page.url);
      const socialAnalyzed = pageSelection.social_pages.includes(page.url);

      // Extract page-specific issues from aggregated results
      const pageData = {
        url: page.url,
        fullUrl: page.fullUrl,
        pageTitle: page.metadata?.title || null,
        pageType: classifyPageType(page.url),
        loadTime: page.metadata?.loadTime || null,

        // SEO
        seoAnalyzed,
        seoScore: seoAnalyzed ? analysisResults.seo?.seoScore : null,
        seoIssues: seoAnalyzed ? analysisResults.seo?.issues?.filter(i =>
          !i.affectedPages || i.affectedPages.includes(page.fullUrl)
        ) : [],

        // Content
        contentAnalyzed,
        contentScore: contentAnalyzed ? analysisResults.content?.contentScore : null,
        contentIssues: contentAnalyzed ? analysisResults.content?.issues?.filter(i =>
          !i.affectedPages || i.affectedPages.includes(page.fullUrl)
        ) : [],

        // Visual Desktop
        desktopAnalyzed: visualAnalyzed,
        desktopScore: visualAnalyzed ? analysisResults.desktopVisual?.visualScore : null,
        desktopIssues: visualAnalyzed ? analysisResults.desktopVisual?.issues?.filter(i =>
          i.page === page.url || !i.page
        ) : [],

        // Visual Mobile
        mobileAnalyzed: visualAnalyzed,
        mobileScore: visualAnalyzed ? analysisResults.mobileVisual?.visualScore : null,
        mobileIssues: visualAnalyzed ? analysisResults.mobileVisual?.issues?.filter(i =>
          i.page === page.url || !i.page
        ) : [],

        // Social
        socialAnalyzed,
        socialScore: socialAnalyzed ? analysisResults.social?.socialScore : null,
        socialIssues: socialAnalyzed ? analysisResults.social?.issues?.filter(i =>
          !i.affectedPages || i.affectedPages.includes(page.fullUrl)
        ) : [],

        analysisModel: 'gpt-4o'
      };

      return pageData;
    });
}

/**
 * Classify page type from URL
 */
function classifyPageType(url) {
  const urlLower = url.toLowerCase();
  if (urlLower === '/' || urlLower === '') return 'homepage';
  if (urlLower.includes('about')) return 'about';
  if (urlLower.includes('contact')) return 'contact';
  if (urlLower.includes('service')) return 'services';
  if (urlLower.includes('pricing') || urlLower.includes('price')) return 'pricing';
  if (urlLower.includes('blog') || urlLower.includes('post')) return 'blog';
  if (urlLower.includes('portfolio') || urlLower.includes('work')) return 'portfolio';
  if (urlLower.includes('team')) return 'team';
  if (urlLower.includes('menu')) return 'menu';
  return 'other';
}
```

---

### PHASE 5: Save page_analyses in Intelligent Analyzer (20 min)

**Issue**: After lead is saved, page analyses aren't saved

**Files to Modify**:
1. `orchestrator.js` - In `analyzeWebsiteIntelligent()`
2. `server.js` - In `/api/analyze` endpoint

**Location in orchestrator.js**: After line 850 (where lead is returned)

**Code to Add**:

```javascript
// Return analysis results including page analyses data
return {
  // ... existing return data ...
  _pageAnalyses: extractPageAnalysesFromIntelligent(crawledPages, pageSelection, analysisResults)
};
```

**Location in server.js**: After line 330 (where lead is saved)

**Code to Add**:

```javascript
// Import at top of file
import { savePageAnalysesBatch } from './database/supabase-client.js';

// After lead save (line 330-340)
if (result._pageAnalyses && result._pageAnalyses.length > 0) {
  try {
    await savePageAnalysesBatch(savedLead.id, result._pageAnalyses);
    console.log(`[Analysis] Saved ${result._pageAnalyses.length} page analyses for ${savedLead.company_name}`);
  } catch (pageError) {
    console.error(`[Analysis] Failed to save page analyses:`, pageError.message);
    // Don't fail the whole operation - lead is already saved
  }
}
```

---

### PHASE 6: Fix Visual Analyzers in runAllAnalyses (30 min)

**Issue**: Basic analyzer doesn't pass pages correctly to visual analyzers

**Files to Modify**:
1. `analyzers/index.js` - Update visual analyzer calls

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
// Build pages for visual analysis from provided data
const visualAnalysisPages = pages.length > 0 && pages[0].screenshots?.desktop
  ? pages  // Use provided pages if they have screenshots
  : (data.desktopScreenshot && data.mobileScreenshot)
    ? [{  // Fallback: create single-page array from legacy params
        url: '/',
        fullUrl: data.url,
        screenshots: {
          desktop: data.desktopScreenshot,
          mobile: data.mobileScreenshot
        }
      }]
    : [];

// Run visual analyzers
visualAnalysisPages.length > 0
  ? analyzeDesktopVisual(visualAnalysisPages, context, customPrompts?.desktopVisual)
  : Promise.resolve(getDefaultDesktopVisualResults()),
visualAnalysisPages.length > 0
  ? analyzeMobileVisual(visualAnalysisPages, context, customPrompts?.mobileVisual)
  : Promise.resolve(getDefaultMobileVisualResults()),
```

---

### PHASE 7: Test End-to-End (30 min)

**Test 1: Intelligent Analyzer (Production System)**

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "prospects": [
      {
        "website": "https://damcoffee.hayven.ai/",
        "company_name": "E2E Test",
        "industry": "Cafe"
      }
    ]
  }'
```

**Expected Results**:
- ✅ Discovers multiple pages (sitemap/robots)
- ✅ AI selects pages for analysis
- ✅ Crawls with desktop + mobile screenshots
- ✅ No visual analyzer errors
- ✅ Saves to leads table
- ✅ Saves to page_analyses table
- ✅ 2+ records in page_analyses

**Verification Query**:
```javascript
// Check page_analyses table
SELECT lead_id, url, page_type, seo_score, content_score,
       visual_desktop_score, visual_mobile_score
FROM page_analyses
WHERE lead_id = '<lead_id_from_response>'
ORDER BY created_at;
```

**Test 2: Basic Analyzer (Testing System)**

```bash
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.example.com","company_name":"Basic Test","industry":"technology"}'
```

**Expected Results**:
- ✅ Crawls homepage + linked pages
- ✅ Captures screenshots for all pages
- ✅ No visual analyzer errors
- ✅ Analysis completes successfully

---

## EXECUTION ORDER

### Priority Order:
1. **Phase 6** - Fix visual analyzers in basic system (quick fix)
2. **Phase 3** - Add database functions (infrastructure)
3. **Phase 4** - Extract per-page data (data mapping)
4. **Phase 5** - Save page analyses (integration)
5. **Phase 7** - Test everything

### Skip:
- Phase 1 - Already done (analyzers accept pages)
- Phase 2 - Already correct (intelligent uses proper structure)

---

## SUCCESS CRITERIA

After all phases complete:

### Basic Analyzer:
- ✅ No visual analyzer errors
- ✅ Desktop + mobile screenshots work
- ✅ Multi-page crawling works
- ✅ Analysis completes successfully

### Intelligent Analyzer:
- ✅ No visual analyzer errors
- ✅ AI page selection works
- ✅ Multi-page screenshots captured
- ✅ Leads table populated
- ✅ page_analyses table populated
- ✅ Per-page scores/issues stored

### Database:
- ✅ `leads` table has aggregated scores
- ✅ `page_analyses` table has per-page data
- ✅ Foreign key relationship works
- ✅ CASCADE delete works

---

## TIME ESTIMATE

- Phase 3: 30 min (database functions)
- Phase 4: 45 min (data extraction)
- Phase 5: 20 min (integration)
- Phase 6: 30 min (visual analyzer fix)
- Phase 7: 30 min (testing)

**Total: ~2.5 hours**

---

## ROLLBACK PLAN

If issues occur:
1. All files have backups (`.backup` extension)
2. Database changes are non-destructive (only INSERTs)
3. Can revert orchestrator.js and server.js from backups
4. New database functions can remain (won't break anything)
