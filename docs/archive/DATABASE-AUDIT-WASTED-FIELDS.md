# Database Audit: Wasted & Unused Fields

## Executive Summary

After auditing both `leads` (89 fields) and `reports` (21 fields) tables:
- **Leads table**: 6 fields never populated, 8 redundant/legacy, 7 model tracking fields unnecessary
- **Reports table**: 3 fields never used, 2 are questionable
- **Recent improvements**: Added Outreach Strategy and Analysis Scope sections to reports, now using previously hidden fields
- **Actual waste**: ~15% of fields are truly wasted (never populated)
- **Potential savings**: ~20% reduction in database storage after cleanup

---

## 🔴 LEADS TABLE - WASTED FIELDS

### Category 1: NEVER POPULATED (6 fields)
These fields exist in schema but are NEVER set by any code:

| Field | Type | Issue | Recommendation |
|-------|------|-------|----------------|
| `city` | text | Never extracted/populated | **DELETE** or implement extraction |
| `state` | text | Never extracted/populated | **DELETE** or implement extraction |
| `contact_email` | text | Never extracted | **DELETE** or implement extraction |
| `contact_phone` | text | Never extracted | **DELETE** or implement extraction |
| `contact_name` | text | Never extracted | **DELETE** or implement extraction |
| `page_load_time` | integer | Never measured | **DELETE** or implement measurement |

### Category 2: POPULATED BUT UNDERUTILIZED (8 fields)
These fields are saved but rarely/never read:

| Field | Type | Current Status | Recommendation |
|-------|------|----------------|----------------|
| `*_analysis_model` fields (6) | text | Only in appendix | **DELETE** - Redundant, move to logs |
| `has_blog` | boolean | Set but never shown | **DELETE** - Not actionable |
| `grade_label` | text | Generated but not shown | **KEEP** - Now shown in reports |
| `call_to_action` | text | Generated but was hidden | **KEEP** - Now shown in Outreach Strategy |
| `outreach_angle` | text | Generated but was hidden | **KEEP** - Now shown in Outreach Strategy |
| `analysis_summary` | text | Generated but was hidden | **KEEP** - Now shown in reports |
| `tech_stack` | text | Detected and shown | **KEEP** - Used in reports |
| `meta_description` | text | Extracted and shown | **KEEP** - Shown in SEO |

### Category 3: REDUNDANT/LEGACY (8 fields)
Duplicate or deprecated fields:

| Field | Type | Issue | Recommendation |
|-------|------|-------|----------------|
| `design_score` | decimal | Legacy - replaced by desktop/mobile | **DEPRECATE** - Mark for removal |
| `design_issues` | jsonb | Legacy - replaced by desktop/mobile | **DEPRECATE** - Mark for removal |
| `website_score` | integer | Duplicate of `overall_score` | **DELETE** - Use overall_score |
| `website_grade` | text | Used inconsistently with `grade` | **STANDARDIZE** - Pick one |
| `social_platforms_present` | jsonb | Redundant with social_profiles | **DELETE** - Use social_profiles |
| `social_metadata` | jsonb | Stored but never shown | **DELETE** or add to reports |
| `content_insights` | jsonb | Vague, overlaps with content_issues | **DELETE** - Use content_issues |
| `crawl_metadata` | jsonb | Duplicates other page fields | **REFACTOR** - Consolidate |

### Category 4: QUESTIONABLE VALUE (4 fields)
Fields that might be valuable but are underutilized:

| Field | Type | Current Use | Decision Needed |
|-------|------|-------------|-----------------|
| `status` | text | Set to 'ready_for_outreach' always | Keep if pipeline tracking needed |
| `analysis_cost` | decimal | Calculated but rarely shown | Keep for ROI tracking |
| `analysis_time` | integer | Measured but hidden | Keep for performance monitoring |
| `discovery_log` | jsonb | Massive field, never shown | Archive separately or delete |

---

## 🔴 REPORTS TABLE - WASTED FIELDS

### NEVER USED (3 fields)

| Field | Type | Issue | Recommendation |
|-------|------|-------|----------------|
| `error_message` | text | Never populated (status is always 'completed') | **DELETE** - Handle errors differently |
| `last_downloaded_at` | timestamptz | Never updated | **DELETE** - Use download_count only |
| `updated_at` | timestamptz | Never different from created_at | **DELETE** - Reports are immutable |

### QUESTIONABLE (2 fields)

| Field | Type | Issue | Decision Needed |
|-------|------|-------|-----------------|
| `download_count` | integer | Increment logic exists but not called | Implement or remove |
| `report_type` | text | Always 'website_audit' | Remove if no other types planned |

---

## 📊 STORAGE IMPACT ANALYSIS

### Leads Table
- **Current**: 89 fields
- **After cleanup**: ~69 fields (-22%)
- **Storage saved**: ~15-20% per row
- **Index improvement**: Faster queries without unused columns

### Reports Table
- **Current**: 21 fields
- **After cleanup**: 16 fields (-24%)
- **Storage saved**: ~10% per row
- **Simpler schema**: Easier maintenance

---

## ✅ IMMEDIATE ACTIONS RECOMMENDED

### Phase 1: Delete Never-Used Fields (Quick Win)
```sql
-- Leads table - remove never populated fields
ALTER TABLE leads
DROP COLUMN grade_label,
DROP COLUMN city,
DROP COLUMN state,
DROP COLUMN contact_email,
DROP COLUMN contact_phone,
DROP COLUMN contact_name,
DROP COLUMN page_load_time,
DROP COLUMN has_blog;

-- Reports table - remove unused fields
ALTER TABLE reports
DROP COLUMN error_message,
DROP COLUMN last_downloaded_at,
DROP COLUMN updated_at;
```

### Phase 2: Remove Redundant Fields
```sql
-- Remove duplicate/legacy fields
ALTER TABLE leads
DROP COLUMN design_score,        -- Use design_score_desktop/mobile
DROP COLUMN design_issues,       -- Use design_issues_desktop/mobile
DROP COLUMN social_platforms_present, -- Use social_profiles
DROP COLUMN social_metadata,     -- Not shown anywhere
DROP COLUMN content_insights;    -- Use content_issues
```

### Phase 3: Standardize Naming
```sql
-- Pick one: website_grade or grade
ALTER TABLE leads RENAME COLUMN website_grade TO grade;
-- Or remove one if both exist
```

---

## 🎯 FIELDS ACTUALLY VALUABLE & USED

### Leads Table - Core Fields (Actually Used)
1. **Identity**: id, url, company_name, industry
2. **Scores**: overall_score, all category scores, grade
3. **Issues**: All issue arrays (design, SEO, content, social, accessibility)
4. **Lead Scoring**: All priority and scoring fields
5. **Analysis**: quick_wins, top_issue, one_liner
6. **Outreach**: call_to_action, outreach_angle, analysis_summary
7. **Screenshots**: screenshot_desktop_url, screenshot_mobile_url
8. **Technical**: is_mobile_friendly, has_https
9. **Intelligence**: business_intelligence, pages_analyzed
10. **Timestamps**: analyzed_at, created_at

### Reports Table - Core Fields (Actually Used)
1. **Identity**: id, lead_id, project_id
2. **Storage**: storage_path, storage_bucket, format
3. **Metadata**: company_name, website_url, overall_score, grade
4. **Config**: config (sections, options)
5. **Size**: file_size_bytes
6. **Status**: status, generated_at

---

## 💡 OPTIMIZATION OPPORTUNITIES

### 1. Contact Information Strategy
Either:
- **Option A**: Implement contact extraction (valuable for sales)
- **Option B**: Remove fields entirely (save storage)

Currently these 3 fields are completely wasted.

### 2. Model Tracking
The 6 `*_analysis_model` fields are saved but never queried:
- If needed for debugging: Move to a separate audit log table
- If not needed: Delete entirely

### 3. Discovery Log
The `discovery_log` field can be massive (KB of JSON) but is never shown:
- Consider moving to separate `analysis_logs` table
- Or remove if not needed for debugging

### 4. Standardize Grade Fields
Using both `grade` and `website_grade` inconsistently:
- Pick one and stick with it
- Update all code references

---

## 📈 EXPECTED BENEFITS

After implementing these changes:

1. **Storage**: 15-20% reduction in database size
2. **Performance**: Faster queries (fewer columns to scan)
3. **Maintenance**: Cleaner schema, easier to understand
4. **Cost**: Lower storage costs in production
5. **Development**: Less confusion about which fields to use

---

## ⚠️ MIGRATION NOTES

### Before Deleting Fields:
1. Backup the database
2. Check for any custom reports/queries using these fields
3. Update schema JSON files in `database/schemas/`
4. Update any TypeScript interfaces
5. Test thoroughly in staging

### Safe Deletion Order:
1. First: Never-populated fields (no data loss)
2. Second: Never-read fields (data exists but unused)
3. Third: Redundant fields (after migrating logic)
4. Last: Legacy fields (after deprecation period)

---

## SUMMARY

**Actually wasted fields in leads table** (truly unused):
- **6 fields never populated** (contact info, location)
- **7 model tracking fields** (redundant, could be logged elsewhere)
- **8 legacy/duplicate fields** (design_score, website_grade vs grade, etc.)
- **Total: 21 fields** (~24% of 89 fields)

**Previously hidden but now used** (fixed in report enhancements):
- `call_to_action` - Now shown in Outreach Strategy section
- `outreach_angle` - Now shown in Outreach Strategy section
- `analysis_summary` - Now shown in reports
- `status` - Now shown as badge in Executive Summary
- `contact_*` fields - Would be valuable if populated

**Reports table waste** (minimal):
- **3 fields never used** (error_message, last_downloaded_at, updated_at)
- **2 questionable** (report_type always same, download_count not tracked)
- **Total: 5 fields** (24% of 21 fields)

**Recommended actions**:
1. **Immediate**: Delete the 6 never-populated fields (contact/location)
2. **Quick win**: Remove 7 model tracking fields (move to logs if needed)
3. **Cleanup**: Consolidate duplicate fields (grade vs website_grade)
4. **Consider**: Implement contact extraction to use those fields

The recent report enhancements have recovered value from several "wasted" fields by actually displaying them. The real waste is primarily in never-populated fields and redundant tracking.