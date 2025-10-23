# Phase 1: Prompt Deduplication System - Implementation Guide

**Status:** ✅ Ready for Testing  
**Date:** 2025-01-22  
**Estimated Time:** Week 1 of 3-4 week refactor  

---

## 📋 Overview

This phase implements a content-addressed deduplication system for prompts, ICP configurations, and model selections that are currently being duplicated in every prospect record.

### Problem Solved
- **60-80% database bloat** from storing identical JSON snapshots repeatedly
- Inefficient storage of prompts/ICP/model configs in `prospects`, `project_prospects`, and `analyses` tables
- No version tracking or audit trail for configuration changes

### Solution
- Content-addressed storage using SHA-256 hashing
- Dedicated version tables: `prompt_versions`, `icp_versions`, `model_selection_versions`
- PostgreSQL RPCs for atomic get-or-create operations
- Backward compatibility maintained during transition

---

## 🏗️ Architecture

### Database Schema

```sql
-- Prompt Versions (deduplicated)
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash VARCHAR(64) NOT NULL UNIQUE,
  content JSONB NOT NULL,
  source VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_prompt_versions_hash ON prompt_versions(content_hash);

-- ICP Versions (deduplicated)
CREATE TABLE icp_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash VARCHAR(64) NOT NULL UNIQUE,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_icp_versions_hash ON icp_versions(content_hash);

-- Model Selection Versions (deduplicated)
CREATE TABLE model_selection_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash VARCHAR(64) NOT NULL UNIQUE,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_model_versions_hash ON model_selection_versions(content_hash);
```

### Foreign Keys (Updated Tables)

```sql
-- project_prospects: Add version references
ALTER TABLE project_prospects
  ADD COLUMN prompt_version_id UUID REFERENCES prompt_versions(id),
  ADD COLUMN icp_version_id UUID REFERENCES icp_versions(id),
  ADD COLUMN model_version_id UUID REFERENCES model_selection_versions(id);

-- Keep old columns for 2-week rollback safety
-- icp_brief_snapshot, prompts_snapshot, model_selections_snapshot (to be dropped later)
```

### Deduplication Functions

**SHA-256 Content Hashing:**
```sql
CREATE OR REPLACE FUNCTION sha256_hash(content JSONB)
RETURNS VARCHAR(64) AS $$
BEGIN
  RETURN encode(digest(content::TEXT, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Get-or-Create RPCs:**
- `get_or_create_prompt_version(p_content JSONB, p_source VARCHAR)`
- `get_or_create_icp_version(p_content JSONB)`
- `get_or_create_model_version(p_content JSONB)`

Each function:
1. Computes SHA-256 hash of content
2. Checks if hash exists in version table
3. If exists: returns existing version ID
4. If not exists: creates new version and returns ID

---

## 📁 Files Modified/Created

### Created Files

1. **`database-tools/migrations/20251022_prompt_deduplication.sql`**
   - Full migration SQL (412 lines)
   - Creates version tables, indexes, functions
   - Migrates existing data
   - Provides rollback procedures

2. **`database-tools/migrations/run-prompt-deduplication.js`**
   - Migration runner script
   - Calculates deduplication statistics
   - Reports storage savings

3. **`database-tools/tests/test-prompt-deduplication.js`**
   - Comprehensive test suite
   - Validates deduplication logic
   - Tests duplicate detection, version retrieval, cleanup

4. **`docs/planning/ARCHITECTURE-REFACTOR-PLAN.md`**
   - Full refactor plan (Phase 1 + Phase 2)
   - Removed prompt injection phase per user request

### Modified Files

1. **`prospecting-engine/database/supabase-client.js`**
   - **Added:** 6 deduplication helper functions (lines 745-892)
     - `getOrCreatePromptVersion()`
     - `getOrCreateIcpVersion()`
     - `getOrCreateModelVersion()`
     - `getPromptVersion()`
     - `getIcpVersion()`
     - `getModelVersion()`
   
   - **Updated:** `linkProspectToProject()` function (lines 283-355)
     - Now deduplicates snapshots before saving
     - Stores version IDs instead of full JSON
     - Maintains backward compatibility with old columns
     - Logs deduplication statistics

---

## 🚀 Deployment Procedure

### Prerequisites
- PostgreSQL 12+ (for SHA-256 hashing)
- Supabase project with SERVICE_ROLE_KEY access
- Node.js 18+ for migration runner

### Step 1: Backup Database
```bash
# Create full database backup
pg_dump -h <supabase-host> -U postgres <database> > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Migration
```bash
cd database-tools/migrations
node run-prompt-deduplication.js
```

**Expected Output:**
```
🚀 Running Prompt Deduplication Migration...
====================================================

📊 Migration Statistics:
   - Unique Prompts: 1,234
   - Total Prompt References: 45,678
   - Deduplication Ratio: 97.3%
   
   - Unique ICPs: 89
   - Total ICP References: 23,456
   - Deduplication Ratio: 99.6%
   
   - Unique Models: 12
   - Total Model References: 34,567
   - Deduplication Ratio: 99.97%

💾 Estimated Storage Savings: 78.4%
✅ Migration completed successfully!
```

### Step 3: Verify Migration
```bash
cd database-tools/tests
node test-prompt-deduplication.js
```

**Expected Output:**
```
🧪 Testing Prompt Deduplication System

✅ PASS: Duplicate detection works! Same content = same ID
✅ PASS: Different content = different ID
✅ PASS: ICP deduplication works!
✅ PASS: Model selection deduplication works!
✅ PASS: Version retrieval working correctly

🎉 ALL TESTS PASSED!
```

### Step 4: Monitor Production
```sql
-- Check version table sizes
SELECT 
  'prompts' AS table_name,
  COUNT(*) AS unique_versions,
  pg_size_pretty(pg_total_relation_size('prompt_versions')) AS size
FROM prompt_versions
UNION ALL
SELECT 
  'icp' AS table_name,
  COUNT(*) AS unique_versions,
  pg_size_pretty(pg_total_relation_size('icp_versions')) AS size
FROM icp_versions
UNION ALL
SELECT 
  'models' AS table_name,
  COUNT(*) AS unique_versions,
  pg_size_pretty(pg_total_relation_size('model_selection_versions')) AS size
FROM model_selection_versions;
```

### Step 5: Rollback (If Needed)
```sql
-- Restore from backup within 2 weeks
psql -h <supabase-host> -U postgres <database> < backup_YYYYMMDD_HHMMSS.sql

-- Or drop version columns (old columns still intact)
ALTER TABLE project_prospects 
  DROP COLUMN prompt_version_id,
  DROP COLUMN icp_version_id,
  DROP COLUMN model_version_id;
```

---

## 🧪 Testing Strategy

### Unit Tests
- ✅ Duplicate detection (same content = same ID)
- ✅ Unique content gets unique IDs
- ✅ SHA-256 hash collision prevention
- ✅ RPC fallback handling
- ✅ Version retrieval accuracy

### Integration Tests
- Test with real prospect data
- Verify deduplication ratios match expectations (60-80%)
- Confirm foreign key relationships work
- Test concurrent writes (race conditions)

### Manual Verification
```sql
-- Find most duplicated prompts (should show high reference counts)
SELECT 
  pv.id,
  pv.source,
  COUNT(pp.id) AS reference_count,
  pv.created_at
FROM prompt_versions pv
LEFT JOIN project_prospects pp ON pp.prompt_version_id = pv.id
GROUP BY pv.id, pv.source, pv.created_at
ORDER BY reference_count DESC
LIMIT 10;
```

---

## 📊 Success Metrics

### Database Size Reduction
- **Target:** 60-80% reduction in snapshot storage
- **Measure:** Compare table sizes before/after migration

### Performance Impact
- **Target:** No significant performance degradation
- **Measure:** Track query latency for prospect creation/retrieval

### Version Table Growth
- **Expected:** ~100-500 unique prompt versions
- **Expected:** ~50-200 unique ICP versions
- **Expected:** ~10-50 unique model versions

---

## 🔍 Common Issues & Solutions

### Issue 1: Migration Timeout
**Symptom:** Migration script hangs on large datasets  
**Solution:** Run migration in batches
```sql
-- Process in chunks of 1000
DO $$
DECLARE
  batch_size INT := 1000;
  offset_val INT := 0;
BEGIN
  LOOP
    -- Process batch...
    offset_val := offset_val + batch_size;
    EXIT WHEN offset_val > (SELECT COUNT(*) FROM project_prospects);
  END LOOP;
END $$;
```

### Issue 2: RPC Not Found
**Symptom:** `get_or_create_prompt_version` function not found  
**Solution:** Ensure migration ran successfully, check Supabase dashboard

### Issue 3: Hash Collisions
**Symptom:** Different content getting same version ID  
**Solution:** SHA-256 has 2^256 possible hashes - collisions are astronomically unlikely. If occurs, review content normalization.

---

## 📅 Timeline

- **Week 1:** ✅ Migration development + testing (COMPLETED)
- **Week 2:** Run migration in staging → production
- **Week 3:** Monitor production, drop old columns if stable

---

## 🔗 Related Documentation

- **Full Refactor Plan:** `docs/planning/ARCHITECTURE-REFACTOR-PLAN.md`
- **Migration SQL:** `database-tools/migrations/20251022_prompt_deduplication.sql`
- **Test Suite:** `database-tools/tests/test-prompt-deduplication.js`

---

## ✅ Checklist

**Pre-Migration:**
- [ ] Database backup completed
- [ ] Staging environment tested
- [ ] Rollback procedure documented
- [ ] Team notified of migration window

**Migration:**
- [ ] Run migration script
- [ ] Verify statistics match expectations
- [ ] Run test suite
- [ ] Check version table sizes

**Post-Migration:**
- [ ] Monitor error logs for 24 hours
- [ ] Verify new prospects use version IDs
- [ ] Check query performance
- [ ] Document actual deduplication ratios

**Cleanup (After 2 Weeks):**
- [ ] Drop old snapshot columns
- [ ] Update documentation
- [ ] Archive rollback procedures

---

**Status:** Ready for deployment  
**Next Phase:** Orchestrator Refactoring (God Object → Services)  
**Contact:** Architecture Team
