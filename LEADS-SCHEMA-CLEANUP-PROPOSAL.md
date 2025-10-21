# Leads Table Schema Cleanup Proposal

**Status**: Draft for Review
**Date**: 2025-10-21
**Purpose**: Eliminate redundant/deprecated columns and streamline the leads table

---

## Executive Summary

The leads table has **88 columns**, many of which are:
- **Redundant** (old vs new formats)
- **Deprecated** (legacy fields no longer used)
- **Not referenced** by UI or Outreach Engine

**Recommendation**: Remove 12 redundant/deprecated columns, keeping 76 essential columns.

---

## Redundant Fields Analysis

### 1. **REMOVE: `screenshot_url` (LEGACY)**
- **Lines**: 268-271
- **Reason**: Replaced by `screenshot_desktop_url` and `screenshot_mobile_url`
- **UI Usage**: ❌ UI uses `screenshot_url` and `mobile_screenshot_url` (different names!)
- **Impact**: **HIGH** - Need to update UI to use correct field names
- **Action**:
  1. Update UI types to use `screenshot_desktop_url` instead of `screenshot_url`
  2. Update UI types to use `screenshot_mobile_url` instead of `mobile_screenshot_url`
  3. Remove `screenshot_url` column

### 2. **KEEP BUT DEPRECATE: `design_score` (LEGACY)**
- **Lines**: 81-85
- **Reason**: Replaced by `design_score_desktop` and `design_score_mobile`
- **UI Usage**: ✅ UI still uses `design_score`
- **Current Code**: Analysis Engine saves both (for backwards compatibility)
- **Action**: Keep for now, mark as deprecated in schema description

### 3. **KEEP BUT DEPRECATE: `design_issues` (LEGACY)**
- **Lines**: 121-125
- **Reason**: Replaced by `design_issues_desktop` and `design_issues_mobile`
- **UI Usage**: ✅ UI still uses `design_issues`
- **Current Code**: Analysis Engine saves all three
- **Action**: Keep for now, mark as deprecated

### 4. **REMOVE: `visual_analysis_model` (DEPRECATED)**
- **Lines**: 151-154
- **Reason**: Replaced by `desktop_visual_model` and `mobile_visual_model`
- **UI Usage**: ❌ Not used
- **Current Code**: Not populated anymore
- **Action**: Remove column

### 5. **UNCLEAR: `social_metadata` (POSSIBLY REDUNDANT)**
- **Lines**: 294-297
- **Reason**: May be redundant with `social_profiles`
- **UI Usage**: ❌ Not used in UI types
- **Current Code**: Used by social analyzer for engagement data
- **Action**: **Review needed** - Check if data is duplicated in `social_profiles`

### 6. **UNCLEAR: Missing Fields in Schema**
- **Issue**: UI expects fields that don't exist in schema:
  - `website` (UI uses this, schema has `url`)
  - `analysis_tier` (UI expects, not in schema)
  - `analysis_modules` (UI expects, not in schema)
  - `analysis_duration_ms` (UI expects, schema has `analysis_time`)

---

## Fields Missing from Database Schema

These fields are used by the UI but **not in the database schema**:

| Field | UI Type | Database Column | Action Needed |
|-------|---------|-----------------|---------------|
| `website` | string | `url` | Add `website` as alias/computed field OR update UI |
| `analysis_tier` | enum | ❌ Missing | Add column OR remove from UI |
| `analysis_modules` | string[] | ❌ Missing | Add column OR remove from UI |
| `analysis_duration_ms` | number | `analysis_time` | Rename `analysis_time` → `analysis_duration_ms` |

---

## Fields in Schema but Not Used by UI

These columns exist in the database but are **not used by the Command Center UI**:

### Outreach/Pipeline Fields (Used by Outreach Engine)
- `status` - Lead status tracking ✅ **KEEP**
- `one_liner` - Email subject line ✅ **KEEP**
- `call_to_action` - CTA for outreach ✅ **KEEP**
- `top_issue` - Outreach hook ✅ **KEEP**

### Mobile/Desktop Split Fields (Not Yet in UI)
- `design_score_desktop` ✅ **KEEP** (new intelligent analysis)
- `design_score_mobile` ✅ **KEEP** (new intelligent analysis)
- `design_issues_desktop` ✅ **KEEP** (new intelligent analysis)
- `design_issues_mobile` ✅ **KEEP** (new intelligent analysis)
- `mobile_critical_issues` ✅ **KEEP** (useful for prioritization)
- `desktop_critical_issues` ✅ **KEEP** (useful for prioritization)
- `desktop_visual_model` ✅ **KEEP** (AI model tracking)
- `mobile_visual_model` ✅ **KEEP** (AI model tracking)

### Intelligent Multi-Page Analysis Fields (New)
- `pages_discovered` ✅ **KEEP** (new intelligent analysis)
- `pages_crawled` ✅ **KEEP** (new intelligent analysis)
- `pages_analyzed` ✅ **KEEP** (new intelligent analysis)
- `ai_page_selection` ✅ **KEEP** (new intelligent analysis)
- `crawl_metadata` ✅ **KEEP** (stores ALL page screenshots)

### Technical/SEO Fields
- `tech_stack` ✅ **KEEP** (useful for targeting)
- `has_https` ✅ **KEEP** (affects grading)
- `has_blog` ✅ **KEEP** (affects content score)
- `is_mobile_friendly` ✅ **KEEP** (affects grading)

### Accessibility Fields
- `accessibility_score` ✅ **KEEP**
- `accessibility_issues` ✅ **KEEP**
- `accessibility_compliance` ✅ **KEEP** (WCAG compliance details)
- `accessibility_analysis_model` ✅ **KEEP** (AI model tracking)

### Social Media Fields
- `social_profiles` ✅ **KEEP** (DM generation needs this)
- `social_platforms_present` ✅ **KEEP** (DM generation needs this)
- `social_metadata` ⚠️ **REVIEW** (may be redundant)
- `social_analysis_model` ✅ **KEEP** (AI model tracking)

---

## Recommended Actions

### Phase 1: Critical Fixes (Breaking Changes)

1. **Fix UI Field Name Mismatches**:
   ```typescript
   // In command-center-ui/lib/types/lead.ts
   export interface Lead {
     // OLD:
     screenshot_url?: string;
     mobile_screenshot_url?: string;

     // NEW:
     screenshot_desktop_url?: string;
     screenshot_mobile_url?: string;
   }
   ```

2. **Add Missing Alias Fields** (or update UI):
   - Option A: Add `website` as computed column (alias for `url`)
   - Option B: Update UI to use `url` instead of `website`

3. **Remove Deprecated Columns**:
   - `screenshot_url` (replaced by desktop/mobile)
   - `visual_analysis_model` (replaced by desktop_visual_model/mobile_visual_model)

### Phase 2: Optional Cleanup (Non-Breaking)

4. **Mark Legacy Fields as Deprecated** (keep for backwards compat):
   - `design_score` → Use `design_score_desktop/mobile` in new code
   - `design_issues` → Use `design_issues_desktop/mobile` in new code

5. **Review Redundant Data**:
   - Check if `social_metadata` duplicates data in `social_profiles`
   - If yes, consolidate into `social_profiles` only

### Phase 3: Add Missing UI Fields

6. **Add Missing UI Fields** (if needed):
   - `analysis_tier` - Tier1/Tier2/Tier3 tracking
   - `analysis_modules` - Which analyzers were run
   - OR remove from UI if not needed

---

## Columns to REMOVE (Final List)

| Column | Reason | Migration Action |
|--------|--------|------------------|
| `screenshot_url` | Replaced by desktop/mobile | Update UI first, then DROP |
| `visual_analysis_model` | Replaced by desktop/mobile models | DROP (not used) |

---

## Data Migration Required

### Step 1: Update UI to use new field names
```typescript
// Before
const screenshot = lead.screenshot_url;
const mobileScreenshot = lead.mobile_screenshot_url;

// After
const screenshot = lead.screenshot_desktop_url;
const mobileScreenshot = lead.screenshot_mobile_url;
```

### Step 2: Drop deprecated columns
```sql
BEGIN;

-- Remove legacy screenshot field
ALTER TABLE leads DROP COLUMN IF EXISTS screenshot_url;

-- Remove legacy visual analysis model field
ALTER TABLE leads DROP COLUMN IF EXISTS visual_analysis_model;

COMMIT;
```

---

## Summary Statistics

### Current State
- **Total columns**: 88
- **Redundant/deprecated**: 2 (to remove)
- **Legacy/backwards compat**: 2 (to keep but deprecate)
- **Essential/active**: 84

### After Cleanup
- **Total columns**: 86
- **Reduction**: 2 columns (-2.3%)
- **Cleaner schema**: Yes
- **Breaking changes**: Yes (UI field name updates required)

---

## Risk Assessment

### HIGH RISK
- ❌ **UI field name mismatches** - `screenshot_url` vs `screenshot_desktop_url`
  - **Impact**: UI may not display screenshots correctly
  - **Mitigation**: Update UI types before removing columns

### MEDIUM RISK
- ⚠️ **Missing UI fields** - `analysis_tier`, `analysis_modules`, `website`
  - **Impact**: UI may expect fields that don't exist
  - **Mitigation**: Add columns OR update UI to remove unused fields

### LOW RISK
- ✅ **Removing unused deprecated columns** - `visual_analysis_model`
  - **Impact**: None (not used anywhere)

---

## Recommendation

**Proceed in 3 phases**:

1. ✅ **Phase 1** (CRITICAL): Fix UI field name mismatches
2. ✅ **Phase 2** (SAFE): Remove `visual_analysis_model` column
3. ⏳ **Phase 3** (OPTIONAL): Review `social_metadata` redundancy

Would you like me to:
- A) Generate SQL migrations for Phase 1 & 2
- B) Update UI types first to fix field name mismatches
- C) Review `social_metadata` vs `social_profiles` redundancy first
