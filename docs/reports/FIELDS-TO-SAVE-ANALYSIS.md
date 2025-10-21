# Fields to Save Analysis - What We Actually Need

## Executive Summary

After analyzing **all downstream systems** (Outreach Engine, Command Center UI, Report Generator) and reviewing **8 files that query the leads table**, here's what we discovered:

**Current State:**
- ✅ **Saving:** 26 fields (32% of schema)
- ❌ **Missing:** 10 CRITICAL fields that break downstream functionality
- 📊 **Should Save:** 36 fields total (44% of schema) to support all features

---

## 🚨 CRITICAL - MUST SAVE (10 fields)

These fields are **actively used** by downstream systems. Missing them **breaks functionality**:

### 1. Screenshots (2 fields) - **BLOCKS REPORTS**

```javascript
screenshot_desktop_url: result.screenshot_desktop_url || null,
screenshot_mobile_url: result.screenshot_mobile_url || null,
```

**Problem:**
- Orchestrator doesn't even return these! ❌
- HTML report generator expects them (lines 37-55 of html-exporter.js)
- Reports fail to embed visual evidence

**Impact:** Reports are incomplete without screenshots

**Fix Required:**
1. Add to orchestrator return (line ~628)
2. Add to server.js save (line ~259)

---

### 2. Desktop/Mobile Split (4 fields) - **BREAKS REPORTS**

```javascript
design_score_desktop: result.design_score_desktop,
design_score_mobile: result.design_score_mobile,
design_issues_desktop: result.design_issues_desktop || [],
design_issues_mobile: result.design_issues_mobile || [],
```

**Problem:**
- Orchestrator returns these ✅
- Server.js doesn't save them ❌
- Report generator expects split scores (report-generator.js lines 52-56)

**Impact:** Reports show averaged scores instead of desktop vs mobile breakdown

**Used By:**
- Reports: Desktop/Mobile analysis sections
- UI: Type expects these (not displayed yet, but typed)

---

### 3. Social Profiles (2 fields) - **BREAKS DM GENERATION**

```javascript
social_profiles: result.social_profiles || {},
social_platforms_present: result.social_platforms_present || [],
```

**Problem:**
- Orchestrator returns these ✅
- Server.js doesn't save them ❌
- Outreach engine requires for social DM generation (database.js line 112, personalization-builder.js line 85-87)

**Impact:** Cannot generate social media DMs without this data

**Used By:**
- Outreach Engine: Platform routing, DM personalization
- UI: Social context display

---

### 4. Analysis Summary (1 field) - **BREAKS UI & EMAILS**

```javascript
analysis_summary: result.analysis_summary || null,
```

**Problem:**
- Orchestrator returns this ✅
- Server.js doesn't save it ❌
- UI TypeScript type marks this as **REQUIRED** (lead.ts)
- Outreach engine uses for email body (personalization-builder.js line 61)

**Impact:** Emails lack AI-generated summaries, UI may crash on required field

**Used By:**
- UI: Required field in Lead type
- Outreach Engine: Email body content
- Reports: Executive summary section

---

### 5. Crawl Metadata (1 object) - **BREAKS UI VISUALIZATION**

```javascript
crawl_metadata: result.crawl_metadata || {},
```

**Problem:**
- Orchestrator returns enhanced version with error logging ✅
- Server.js doesn't save it ❌
- UI expects this for crawl visualization (lead-details-card.tsx line 128)
- Reports use for business intelligence section (business-intel-section.js lines 23-46)

**Impact:** UI cannot show crawl visualization, reports lack scope context, **all our new error logging is lost**

**Contains:**
```javascript
{
  pages_discovered: 18,
  pages_crawled: 8,
  total_pages_attempted: 8,
  discovery_time_ms: 1674,
  crawl_time_ms: 118600,
  discovery_errors: {           // NEW: Our enhanced error tracking!
    sitemap: null,
    robots: "404 Not Found",
    navigation: null
  },
  failed_pages: [               // NEW: Detailed failure logging!
    {
      url: "/menus",
      error: "page.goto: Download is starting",
      fullUrl: "https://..."
    }
  ]
}
```

**Used By:**
- UI: Crawl visualization component
- Reports: Business intelligence section

---

## ⭐ HIGH VALUE - SHOULD SAVE (8 fields)

These fields significantly enhance features but don't break existing functionality:

### 6. Accessibility Compliance (1 field)

```javascript
accessibility_compliance: result.accessibility_compliance || {},
```

**Value:** WCAG 2.1 compliance breakdown for reports
- Contains: compliance_percentage, violations_by_level, critical_issues
- **Used by:** Reports (accessibility section expects detailed compliance)
- **Future:** Could enable compliance-focused outreach campaigns

---

### 7. SEO/Tech Metadata (5 fields)

```javascript
tech_stack: result.tech_stack || null,
has_blog: result.has_blog || false,
has_https: result.has_https || false,
page_title: result.page_title || null,
meta_description: result.meta_description || null,
```

**Value:** Technical credibility in emails, SEO context
- **Used by:**
  - Outreach: Tech stack mention (personalization-builder.js line 80)
  - UI: Type expects tech_stack, page_title, meta_description
- **Future:** Could enhance SEO section in reports

---

### 8. Call to Action (1 field)

```javascript
call_to_action: result.call_to_action || null,
```

**Value:** AI-generated CTA for email personalization
- **Used by:** Outreach (future feature for dynamic CTAs)
- **Current:** Not actively used but orchestrator generates it

---

### 9. Outreach Angle (1 field)

```javascript
outreach_angle: result.outreach_angle || null,
```

**Value:** Email strategy selection (e.g., "mobile-first-optimization")
- **Used by:** Outreach (future feature for template selection)
- **Current:** Not actively used but orchestrator generates it

---

## ⚠️ FIELD NAME FIX

**Current Bug:**
```javascript
// Server.js saves:
analysis_time_seconds: result.time_seconds || 0,  // ❌ WRONG

// Should save:
analysis_time: result.analysis_time,              // ✅ CORRECT (milliseconds)
```

**Impact:** Field name mismatch between code and schema

---

## ❌ SKIP - NOT USED (Debugging Data)

These fields returned by orchestrator have **zero downstream usage**:

```javascript
// Don't save these - they're in intelligent_analysis object:
pages_analyzed_seo: ...              // Too granular
pages_analyzed_content: ...          // Too granular
pages_analyzed_visual: ...           // Too granular
pages_analyzed_social: ...           // Too granular
discovery_sources: ...               // Internal debugging
ai_page_selection: ...               // Debugging only

// Don't save these from orchestrator:
grade_label: ...                     // Not used
grade_description: ...               // Not used
recommendations: ...                 // Not used
critique_sections: ...               // Not used
outreach_angle: ...                  // Generated but not used yet
```

**Why Skip:**
- Not queried by any downstream system
- Not displayed in UI
- Not used in reports
- Not used in outreach
- Pure debugging/transparency data

---

## 📊 Impact Summary

| Category | Fields Missing | Systems Broken | Severity |
|----------|---------------|----------------|----------|
| Screenshots | 2 | Reports | 🔴 CRITICAL |
| Desktop/Mobile Split | 4 | Reports, UI | 🔴 CRITICAL |
| Social Profiles | 2 | Outreach (DMs) | 🔴 CRITICAL |
| Analysis Summary | 1 | UI (required), Outreach | 🔴 CRITICAL |
| Crawl Metadata | 1 | UI, Reports | 🔴 CRITICAL |
| Accessibility | 1 | Reports (incomplete) | 🟡 HIGH |
| SEO/Tech Metadata | 5 | Outreach (less personalized) | 🟡 HIGH |
| CTA/Angle | 2 | Outreach (future) | 🟢 MEDIUM |

**Total Critical Fields Missing:** 10 fields
**Total Systems Affected:** 3 systems (Reports, UI, Outreach)

---

## ✅ Recommended Implementation

### Phase 1: Fix Critical Breaks (NOW)

**File 1: `analysis-engine/orchestrator.js` (line ~628)**
```javascript
// ADD: Screenshot paths (currently missing!)
screenshot_desktop_url: homepage.screenshots?.desktop || null,
screenshot_mobile_url: homepage.screenshots?.mobile || null,
```

**File 2: `analysis-engine/server.js` (line 215-259)**
```javascript
const leadData = {
  // ... existing fields ...

  // ADD: Desktop/Mobile split (CRITICAL)
  design_score_desktop: result.design_score_desktop,
  design_score_mobile: result.design_score_mobile,
  design_issues_desktop: result.design_issues_desktop || [],
  design_issues_mobile: result.design_issues_mobile || [],

  // ADD: Screenshots (CRITICAL)
  screenshot_desktop_url: result.screenshot_desktop_url || null,
  screenshot_mobile_url: result.screenshot_mobile_url || null,

  // ADD: Social profiles (CRITICAL for DMs)
  social_profiles: result.social_profiles || {},
  social_platforms_present: result.social_platforms_present || [],

  // ADD: Analysis summary (REQUIRED by UI)
  analysis_summary: result.analysis_summary || null,

  // ADD: Crawl metadata (CRITICAL for UI/Reports)
  crawl_metadata: result.crawl_metadata || {},

  // FIX: Field name mismatch
  analysis_time: result.analysis_time,  // NOT analysis_time_seconds

  // ... rest of fields ...
};
```

### Phase 2: Enhance Features (NEXT SPRINT)

```javascript
// ADD to leadData object:

// Accessibility compliance
accessibility_compliance: result.accessibility_compliance || {},

// SEO/Tech metadata
tech_stack: result.tech_stack || null,
has_blog: result.has_blog || false,
has_https: result.has_https || false,
page_title: result.page_title || null,
meta_description: result.meta_description || null,

// Outreach support
call_to_action: result.call_to_action || null,
outreach_angle: result.outreach_angle || null,
```

---

## 🎯 Verification Checklist

After implementing Phase 1, verify:

- [ ] Reports include desktop/mobile screenshots
- [ ] Reports show desktop vs mobile score breakdown
- [ ] Outreach engine can generate social DMs
- [ ] UI displays analysis_summary without errors
- [ ] UI crawl visualization shows enhanced error logging
- [ ] Database column `analysis_time` (not `analysis_time_seconds`)

---

## 📈 Before & After

### BEFORE (Current State)
```
Saving: 26/81 fields (32%)
- ❌ Reports missing screenshots
- ❌ Reports missing desktop/mobile breakdown
- ❌ DM generation broken
- ❌ UI missing required analysis_summary
- ❌ Enhanced error logging lost
```

### AFTER (Phase 1)
```
Saving: 36/81 fields (44%)
- ✅ Reports include screenshots
- ✅ Reports show desktop/mobile split
- ✅ DM generation works
- ✅ UI receives required fields
- ✅ Error logging preserved
```

### AFTER (Phase 2)
```
Saving: 44/81 fields (54%)
- ✅ All Phase 1 fixes
- ✅ WCAG compliance details
- ✅ SEO/tech metadata for personalization
- ✅ Future-ready for enhanced outreach
```

---

## 🔍 Query Usage Evidence

Based on analysis of **8 files** that query the leads table:

**Files analyzed:**
1. `analysis-engine/database/supabase-client.js`
2. `outreach-engine/integrations/database.js`
3. `command-center-ui/app/api/leads/route.ts`
4. `command-center-ui/app/api/stats/route.ts`
5. `command-center-ui/app/api/activity/route.ts`
6. `command-center-ui/lib/api/supabase.ts`
7. `analysis-engine/server.js`
8. `analysis-engine/reports/exporters/html-exporter.js`

**Most common query pattern:**
```javascript
const { data } = await supabase
  .from('leads')
  .select('*')  // ← Most queries select ALL fields
```

**Impact:** When queries select `*`, missing fields result in `null` values, which can break:
- UI TypeScript types (required fields)
- Report generation (expected fields)
- Outreach personalization (missing context)

---

**Report Generated:** 2025-10-21
**Systems Analyzed:** 3 (Outreach, UI, Reports)
**Files Reviewed:** 15+ files
**Critical Fields Missing:** 10 fields
**Recommended Saves:** 36 fields (Phase 1) → 44 fields (Phase 2)