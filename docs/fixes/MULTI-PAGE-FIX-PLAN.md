# Multi-Page Analysis System - Complete Fix Plan

## Current Data Flow Analysis

### Step 1: Multi-Page Crawler ✅ (WORKING)
**File**: `scrapers/multi-page-crawler.js`
**Status**: Working correctly
**Output**:
```javascript
{
  homepage: { url, html, screenshot, metadata, techStack, isMobileFriendly, pageLoadTime },
  pages: [ /* array of additional pages */ ],
  pagesDiscovered: 0,
  metadata: { totalPagesCrawled, totalLinksFound, crawlTime }
}
```
**Test Result**: Crawled 2 pages for đậm coffee bar ✅

### Step 2: Screenshot Capture ❌ (BROKEN)
**File**: `orchestrator.js:97`
**Current**: Only captures homepage
```javascript
const dualScreenshots = await captureDualViewports(crawlResult.homepage.url);
```
**Should be**: Capture ALL pages
```javascript
// Need to loop through all pages and capture each one
```
**Impact**: Missing screenshots for `/menu` and other pages

### Step 3: Business Intelligence ✅ (WORKING)
**File**: `scrapers/business-intelligence-extractor.js`
**Current**: Line 113
```javascript
const allPages = [crawlResult.homepage, ...crawlResult.pages].filter(p => p && p.html);
const businessIntel = extractBusinessIntelligence(allPages);
```
**Status**: Correctly processes all pages ✅

### Step 4: HTML Parsing ❌ (BROKEN - Single Page Only)
**File**: `orchestrator.js:118`
**Current**: Only parses homepage
```javascript
const parsedData = parseHTML(html, url); // Only homepage HTML
```
**Should be**: Parse ALL pages or use multi-page data
**Impact**: SEO/content/social data only from homepage

### Step 5: Analyzers ❌ (BROKEN - Parameter Mismatch)
**File**: `analyzers/index.js:68-78`
**Current**:
```javascript
analyzeSEO(url, html, context, customPrompts?.seo),           // WRONG
analyzeContent(url, html, context, customPrompts?.content),   // WRONG
analyzeSocial(url, socialProfiles, socialMetadata, context)   // WRONG
```
**Expected by analyzers**:
```javascript
// seo-analyzer.js:27
analyzeSEO(pages, context, customPrompt)         // Expects pages[]!
analyzeContent(pages, context, customPrompt)     // Expects pages[]!
analyzeSocial(pages, context, customPrompt)      // Expects pages[]!
```
**Impact**: "pages.map is not a function" errors

### Step 6: Grading ⚠️ (PARTIAL - Uses broken analyzer data)
**File**: `grading/grader.js`
**Status**: Works but receives incomplete data from analyzers
**Impact**: Grades based on failed analyzer results

### Step 7: Database Storage ❌ (INCOMPLETE)
**Files**:
- `orchestrator.js` (analyzeAndSave)
- `database/supabase-client.js`

**Current**: Only saves to `leads` table
**Missing**: No functions to save to `page_analyses` table
**Impact**: Multi-page data never persisted

---

## Phased Fix Plan

### PHASE 1: Fix Analyzer Parameter Passing (30 min)
**Goal**: Make analyzers receive correct multi-page data

**Files to modify**:
1. `analyzers/index.js` - Update `runAllAnalyses()`

**Changes**:
```javascript
// OLD signature:
export async function runAllAnalyses(data)

// NEW signature (add pages parameter):
export async function runAllAnalyses(data, pages = [])
```

**Update calls to analyzers**:
```javascript
// Build pages array for analyzers
const pagesForAnalysis = pages.map(p => ({
  url: p.url || '/',
  fullUrl: p.fullUrl || data.url,
  html: p.html,
  metadata: p.metadata
}));

// Call analyzers with pages array
analyzeSEO(pagesForAnalysis, context, customPrompts?.seo),
analyzeContent(pagesForAnalysis, context, customPrompts?.content),
analyzeSocial(pagesForAnalysis, context, customPrompts?.social)
```

**Files to modify**:
2. `orchestrator.js` - Pass pages to runAllAnalyses()

Update line 130:
```javascript
// OLD:
const analysisResults = await runAllAnalyses({
  url,
  screenshot,
  desktopScreenshot: dualScreenshots.desktop.screenshot,
  mobileScreenshot: dualScreenshots.mobile.screenshot,
  html,
  context: enrichedContext,
  ...
});

// NEW:
const analysisResults = await runAllAnalyses({
  url,
  screenshot,
  desktopScreenshot: dualScreenshots.desktop.screenshot,
  mobileScreenshot: dualScreenshots.mobile.screenshot,
  html,
  context: enrichedContext,
  ...
}, allPages); // Pass the pages array!
```

**Test**: Run analysis and verify no "pages.map is not a function" errors

---

### PHASE 2: Add Multi-Page Screenshot Capture (1 hour)
**Goal**: Capture desktop + mobile screenshots for ALL crawled pages

**Files to modify**:
1. `orchestrator.js` - Add screenshot loop

**New code to add after line 109**:
```javascript
// Capture screenshots for ALL pages (not just homepage)
const allPagesWithScreenshots = [];

// Add homepage with screenshots
allPagesWithScreenshots.push({
  ...crawlResult.homepage,
  desktopScreenshot: dualScreenshots.desktop.screenshot,
  mobileScreenshot: dualScreenshots.mobile.screenshot,
  desktopScreenshotPath: screenshotPaths.desktop,
  mobileScreenshotPath: screenshotPaths.mobile
});

// Capture screenshots for additional pages
for (const page of crawlResult.pages || []) {
  progress('screenshots', `Capturing screenshots for ${page.url}...`);

  try {
    const pageScreenshots = await captureDualViewports(page.fullUrl || page.url);
    const pagePaths = await saveDualScreenshots(
      {
        desktop: pageScreenshots.desktop.screenshot,
        mobile: pageScreenshots.mobile.screenshot
      },
      `${context.company_name || 'website'}-${page.url.replace(/\//g, '-')}`
    );

    allPagesWithScreenshots.push({
      ...page,
      desktopScreenshot: pageScreenshots.desktop.screenshot,
      mobileScreenshot: pageScreenshots.mobile.screenshot,
      desktopScreenshotPath: pagePaths.desktop,
      mobileScreenshotPath: pagePaths.mobile
    });
  } catch (error) {
    console.error(`Failed to capture screenshots for ${page.url}:`, error);
    // Add page without screenshots
    allPagesWithScreenshots.push(page);
  }
}

console.log(`📸 Captured screenshots for ${allPagesWithScreenshots.length} pages`);
```

**Update**: Use `allPagesWithScreenshots` instead of `allPages` when calling analyzers

**Test**: Verify screenshots created for all pages

---

### PHASE 3: Update Visual Analyzers for Multi-Page (45 min)
**Goal**: Make desktop/mobile analyzers process multiple page screenshots

**Files to modify**:
1. `analyzers/index.js` - Update visual analyzer calls

**Current** (lines 69-74):
```javascript
desktopScreenshot
  ? analyzeDesktopVisual(url, desktopScreenshot, context, customPrompts?.desktopVisual)
  : Promise.resolve(getDefaultDesktopVisualResults()),
mobileScreenshot
  ? analyzeMobileVisual(url, mobileScreenshot, context, customPrompts?.mobileVisual)
  : Promise.resolve(getDefaultMobileVisualResults()),
```

**NEW**:
```javascript
// Collect all desktop screenshots from pages
const desktopScreenshots = pages
  .filter(p => p.desktopScreenshot)
  .map(p => ({
    url: p.url,
    screenshot: p.desktopScreenshot,
    screenshotPath: p.desktopScreenshotPath
  }));

const mobileScreenshots = pages
  .filter(p => p.mobileScreenshot)
  .map(p => ({
    url: p.url,
    screenshot: p.mobileScreenshot,
    screenshotPath: p.mobileScreenshotPath
  }));

// Analyze all screenshots (or just homepage for now)
desktopScreenshots.length > 0
  ? analyzeDesktopVisual(
      desktopScreenshots[0].url,
      desktopScreenshots[0].screenshot,
      context,
      customPrompts?.desktopVisual
    )
  : Promise.resolve(getDefaultDesktopVisualResults()),
mobileScreenshots.length > 0
  ? analyzeMobileVisual(
      mobileScreenshots[0].url,
      mobileScreenshots[0].screenshot,
      context,
      customPrompts?.mobileVisual
    )
  : Promise.resolve(getDefaultMobileVisualResults()),
```

**Note**: Visual analyzers already accept single screenshot - this phase uses homepage screenshot but from the pages array for consistency. Future enhancement: analyze all page screenshots.

**Test**: Verify visual analyzers work without errors

---

### PHASE 4: Add page_analyses Database Functions (45 min)
**Goal**: Add functions to save per-page analysis data

**Files to modify**:
1. `database/supabase-client.js` - Add new functions

**Add these functions**:

```javascript
/**
 * Save a single page analysis record
 *
 * @param {string} leadId - Lead ID (foreign key)
 * @param {object} pageData - Page analysis data
 * @returns {Promise<object>} Saved page analysis
 */
export async function savePageAnalysis(leadId, pageData) {
  try {
    const { data, error } = await supabase
      .from('page_analyses')
      .insert({
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
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save page analysis:', error);
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Save multiple page analyses in batch
 *
 * @param {string} leadId - Lead ID (foreign key)
 * @param {array} pagesData - Array of page analysis data
 * @returns {Promise<array>} Array of saved page analyses
 */
export async function savePageAnalysesBatch(leadId, pagesData) {
  try {
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

    if (error) {
      console.error('Failed to save page analyses batch:', error);
      throw error;
    }

    console.log(`✅ Saved ${data.length} page analyses for lead ${leadId}`);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get all page analyses for a lead
 *
 * @param {string} leadId - Lead ID
 * @returns {Promise<array>} Array of page analyses
 */
export async function getPageAnalyses(leadId) {
  try {
    const { data, error } = await supabase
      .from('page_analyses')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get page analyses:', error);
    throw error;
  }
}
```

**Test**: Manually call `savePageAnalysis()` to verify it works

---

### PHASE 5: Extract Per-Page Results from Analyzers (1 hour)
**Goal**: Extract individual page results from analyzer outputs

**Files to modify**:
1. `orchestrator.js` - After analysis, extract per-page data

**Add new function** (before `analyzeWebsite()`):

```javascript
/**
 * Extract per-page analysis data from aggregated analyzer results
 *
 * @param {array} pages - Array of pages with metadata
 * @param {object} analysisResults - Aggregated analyzer results
 * @returns {array} Array of per-page analysis records
 */
function extractPageAnalysesData(pages, analysisResults) {
  return pages.map((page, index) => {
    // For now, we'll use aggregated scores for all pages
    // TODO: Update analyzers to return per-page scores

    return {
      url: page.url || '/',
      fullUrl: page.fullUrl || page.url,
      pageTitle: page.metadata?.title || null,
      pageType: classifyPageType(page.url),

      // SEO data
      seoAnalyzed: true,
      seoScore: analysisResults.seo?.seoScore || 50,
      seoIssues: analysisResults.seo?.issues || [],

      // Content data
      contentAnalyzed: true,
      contentScore: analysisResults.content?.contentScore || 50,
      contentIssues: analysisResults.content?.issues || [],

      // Visual data (only for pages with screenshots)
      desktopAnalyzed: !!page.desktopScreenshot,
      desktopScore: index === 0 ? (analysisResults.desktopVisual?.visualScore || 50) : null,
      desktopIssues: index === 0 ? (analysisResults.desktopVisual?.issues || []) : [],

      mobileAnalyzed: !!page.mobileScreenshot,
      mobileScore: index === 0 ? (analysisResults.mobileVisual?.visualScore || 50) : null,
      mobileIssues: index === 0 ? (analysisResults.mobileVisual?.issues || []) : [],

      // Social data
      socialAnalyzed: true,
      socialScore: analysisResults.social?.socialScore || 50,
      socialIssues: analysisResults.social?.issues || [],

      // Load time
      loadTime: page.metadata?.loadTime || null,
      analysisModel: 'gpt-4o'
    };
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
  if (urlLower.includes('location')) return 'locations';
  return 'other';
}
```

**Test**: Verify function creates correct page analysis records

---

### PHASE 6: Update analyzeAndSave() to Save Page Analyses (30 min)
**Goal**: After saving lead, save per-page data

**Files to modify**:
1. `orchestrator.js` - Update `analyzeAndSave()` function

**Find line** (around 459 - after "Lead saved to database"):
```javascript
// Database upload succeeded
console.log(`✅ [Orchestrator] Lead saved to database: ${savedLead.id}`);
```

**Add after this**:
```javascript
// STEP 5: Save per-page analyses
if (analysisResult._raw?.crawlResult?.pages) {
  try {
    const allPages = [
      analysisResult._raw.crawlResult.homepage,
      ...analysisResult._raw.crawlResult.pages
    ].filter(p => p && p.html);

    const pageAnalysesData = extractPageAnalysesData(
      allPages,
      analysisResult._raw.analysisResults
    );

    const savedPageAnalyses = await savePageAnalysesBatch(
      savedLead.id,
      pageAnalysesData
    );

    console.log(`✅ [Orchestrator] Saved ${savedPageAnalyses.length} page analyses`);
  } catch (pageError) {
    console.error(`⚠️ [Orchestrator] Failed to save page analyses:`, pageError.message);
    // Don't fail the whole operation - lead is already saved
  }
}
```

**Import** `savePageAnalysesBatch` at top:
```javascript
import { savePageAnalysesBatch } from './database/supabase-client.js';
```

**Test**: Run analysis and verify records in page_analyses table

---

### PHASE 7: Comprehensive End-to-End Testing (1 hour)

**Test Case 1**: Single-page website
```bash
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.example.com","company_name":"Example","industry":"technology"}'
```

**Expected**:
- ✅ 1 page crawled
- ✅ 2 screenshots (desktop + mobile for homepage)
- ✅ No analyzer errors
- ✅ 1 lead in `leads` table
- ✅ 1 record in `page_analyses` table

**Test Case 2**: Multi-page website
```bash
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://damcoffee.hayven.ai/","company_name":"đậm coffee bar","industry":"Cafe"}'
```

**Expected**:
- ✅ 2+ pages crawled
- ✅ 4+ screenshots (desktop + mobile for each page)
- ✅ No analyzer errors (no "pages.map is not a function")
- ✅ SEO analyzer processes all pages
- ✅ Content analyzer processes all pages
- ✅ Social analyzer processes all pages
- ✅ 1 lead in `leads` table
- ✅ 2+ records in `page_analyses` table
- ✅ Backup file contains complete data

**Verification Queries**:
```javascript
// Check leads
SELECT id, company_name, url, crawl_metadata FROM leads ORDER BY analyzed_at DESC LIMIT 5;

// Check page analyses
SELECT lead_id, url, page_type, seo_score, content_score FROM page_analyses ORDER BY created_at DESC LIMIT 10;

// Check relationship
SELECT l.company_name, COUNT(pa.id) as page_count
FROM leads l
LEFT JOIN page_analyses pa ON l.id = pa.lead_id
GROUP BY l.id, l.company_name;
```

---

## Summary of Changes

### Files Modified:
1. ✅ `analyzers/index.js` - Fix parameter passing to analyzers
2. ✅ `orchestrator.js` - Multi-page screenshot capture
3. ✅ `orchestrator.js` - Pass pages array to analyzers
4. ✅ `orchestrator.js` - Extract per-page data function
5. ✅ `orchestrator.js` - Save page analyses in analyzeAndSave()
6. ✅ `database/supabase-client.js` - Add page_analyses functions

### New Functions Added:
- `extractPageAnalysesData()` - Extract per-page results
- `classifyPageType()` - Classify page from URL
- `savePageAnalysis()` - Save single page analysis
- `savePageAnalysesBatch()` - Save multiple page analyses
- `getPageAnalyses()` - Retrieve page analyses for a lead

### Total Estimated Time:
- Phase 1: 30 min
- Phase 2: 1 hour
- Phase 3: 45 min
- Phase 4: 45 min
- Phase 5: 1 hour
- Phase 6: 30 min
- Phase 7: 1 hour
**Total**: ~5.5 hours

---

## Success Criteria

After all fixes:
- ✅ No "pages.map is not a function" errors
- ✅ Screenshots captured for ALL crawled pages
- ✅ Analyzers process multiple pages
- ✅ page_analyses table populated with per-page data
- ✅ Crawl metadata shows correct page count
- ✅ Backup files contain complete multi-page data
- ✅ All tests pass

---

## Rollback Plan

If issues occur:
1. Revert `orchestrator.js` from `orchestrator.js.backup`
2. Revert `analyzers/index.js` using git
3. Remove new database functions (non-breaking)
4. Server restart required after rollback
