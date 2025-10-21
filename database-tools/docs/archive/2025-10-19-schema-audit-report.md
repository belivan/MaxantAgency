# Database Schema Audit Report
**Date:** 2025-10-19
**Audited By:** Database Setup Tool (Agent 5)

---

## Executive Summary

I visited all 4 agents and checked their database schemas. Here's what I found:

### Schema Count by Agent
| Agent | Schemas Found | Status |
|-------|--------------|--------|
| **Prospecting Engine** | 1 | ✅ Perfect Format |
| **Analysis Engine** | 1 | ⚠️ Wrong Format |
| **Outreach Engine** | 0 | ❌ Missing Schemas |
| **Pipeline Orchestrator** | 2 | ✅ Perfect Format (1 needs fix) |

---

## 1. PROSPECTING ENGINE ✅

**Location:** `prospecting-engine/database/schemas/`

### Schema: `prospects.json`
**Status:** ✅ **PERFECT - Database Setup Tool Compatible**

**Format:**
- ✅ Uses `"table"` field
- ✅ Uses `"columns": [...]` array format
- ✅ Proper column structure with `name` property
- ✅ Has composite indexes
- ✅ Has custom CHECK constraints

**Table:** `prospects`
**Columns:** 29 columns
**Indexes:** 4 composite indexes
**Constraints:** 2 CHECK constraints

**Notable Features:**
- Foreign key reference: `project_id` → `projects.id`
- Enum statuses: `ready_for_analysis`, `queued`, `analyzing`, `analyzed`, `error`
- Google Maps integration fields
- Social media profile tracking
- ICP (Ideal Customer Profile) scoring
- Cost and performance tracking

**Validation Result:** ⚠️ 3 warnings only
- `company_name` required but no default
- `industry` required but no default
- `project_id` foreign key but no index

**Grade:** A (excellent, minor warnings only)

---

## 2. ANALYSIS ENGINE ⚠️

**Location:** `analysis-engine/database/schemas/`

### Schema: `leads.json`
**Status:** ⚠️ **WRONG FORMAT - Needs Conversion**

**Current Format:**
```json
{
  "tableName": "leads",        // ❌ Should be "table"
  "schema": {                  // ❌ Should be "columns" array
    "id": {                    // ❌ Column name as key
      "type": "uuid",
      "primaryKey": true
    }
  }
}
```

**Expected Format:**
```json
{
  "table": "leads",
  "columns": [
    {
      "name": "id",            // ✅ Column name as property
      "type": "uuid",
      "primaryKey": true
    }
  ]
}
```

**Table:** `leads`
**Columns:** ~50 columns (complex analysis data)
**Indexes:** 5 indexes defined

**Issues:**
1. Uses `tableName` instead of `table`
2. Uses object format for columns instead of array
3. Column names are keys instead of `name` properties
4. Uses `nullable: false` instead of `required: true`
5. Foreign keys defined inline instead of `foreignKeys` array
6. Has raw SQL embedded (line 282+)

**What Needs to Happen:**
Agent 2 needs to convert this entire file to the standard format.

**Grade:** D (wrong format, needs full conversion)

---

## 3. OUTREACH ENGINE ❌

**Location:** `outreach-engine/database/schemas/`

### Status: ❌ **NO SCHEMAS FOUND**

**Expected Tables:**
Based on the agent specs, Outreach Engine should have schemas for:
- `composed_emails` - Generated email content
- `social_outreach` - Social media outreach posts
- `outreach_history` - Tracking sent messages
- `email_templates` - Template library

**Current State:**
- Directory exists: `outreach-engine/database/schemas/`
- **Contents:** EMPTY

**What Needs to Happen:**
Agent 3 needs to create schema files for their tables.

**Grade:** F (no schemas exist)

---

## 4. PIPELINE ORCHESTRATOR ✅

**Location:** `pipeline-orchestrator/database/schemas/`

### Schema: `campaigns.json`
**Status:** ✅ **PERFECT FORMAT**

**Table:** `campaigns`
**Columns:** 13 columns
**Indexes:** 3 indexes

**Features:**
- Campaign scheduling with cron expressions
- Budget tracking (`total_cost`)
- Status management (active, paused, completed, error)
- Project association
- Next run calculation
- JSONB config storage

**Validation Result:** ⚠️ 2 warnings
- `name` required but no default
- `config` required but no default

**Grade:** A (excellent, minor warnings only)

---

### Schema: `campaign_runs.json`
**Status:** ⚠️ **GOOD FORMAT - 1 LINE FIX NEEDED**

**Table:** `campaign_runs`
**Columns:** 10 columns
**Indexes:** 3 indexes

**Issue:** Line 89
```json
"columns": ["started_at DESC"]  // ❌ Remove DESC
```

**Fix:**
```json
"columns": ["started_at"]       // ✅ Correct
```

**Features:**
- Tracks campaign execution history
- Records success/failure status
- Stores detailed results per step
- Cost tracking per run
- Error logging
- Trigger type tracking (scheduled vs manual)
- Foreign key to `campaigns` table

**Validation Result:** ❌ 1 error, 2 warnings
- ERROR: Invalid index column `"started_at DESC"`
- WARNING: `campaign_id` required but no default
- WARNING: `campaign_id` foreign key but no index

**Grade:** B+ (one line fix needed)

---

## Format Consistency Analysis

### Standard Format Used By:
1. ✅ Prospecting Engine - `prospects.json`
2. ✅ Pipeline Orchestrator - `campaigns.json`
3. ✅ Pipeline Orchestrator - `campaign_runs.json` (after fix)

### Non-Standard Format:
1. ❌ Analysis Engine - `leads.json` (completely different format)

### Missing Schemas:
1. ❌ Outreach Engine - NO schemas at all

---

## Naming Conventions Comparison

### Table Names
| Agent | Table | Convention |
|-------|-------|-----------|
| Prospecting | `prospects` | ✅ Plural, lowercase |
| Analysis | `leads` | ✅ Plural, lowercase |
| Pipeline | `campaigns` | ✅ Plural, lowercase |
| Pipeline | `campaign_runs` | ✅ Plural, lowercase with underscore |

**Result:** ✅ All consistent (plural, lowercase, underscores)

### Primary Keys
| Table | Primary Key | Type | Default |
|-------|------------|------|---------|
| `prospects` | `id` | `uuid` | `gen_random_uuid()` |
| `leads` | `id` | `uuid` | `uuid_generate_v4()` |
| `campaigns` | `id` | `uuid` | `gen_random_uuid()` |
| `campaign_runs` | `id` | `uuid` | `gen_random_uuid()` |

**Issue:** ⚠️ Analysis Engine uses different UUID function
- 3 agents use: `gen_random_uuid()`
- 1 agent uses: `uuid_generate_v4()`

Both work, but `gen_random_uuid()` is the modern PostgreSQL standard.

### Timestamp Columns
| Agent | Pattern |
|-------|---------|
| Prospecting | `created_at`, `updated_at` (timestamptz) |
| Analysis | `created_at`, `updated_at`, `analyzed_at` (timestamp) |
| Pipeline | `created_at`, `updated_at` (timestamptz) |

**Issue:** ⚠️ Analysis Engine uses `timestamp` instead of `timestamptz`
- Should use `timestamptz` for timezone awareness

### Status Enums
| Table | Status Values |
|-------|--------------|
| `prospects` | `ready_for_analysis`, `queued`, `analyzing`, `analyzed`, `error` |
| `leads` | `ready_for_outreach`, `email_composed`, `contacted`, `replied`, `not_interested` |
| `campaigns` | `active`, `paused`, `completed`, `error` |
| `campaign_runs` | `running`, `completed`, `failed`, `aborted` |

**Result:** ✅ Each agent has appropriate status values for their domain

### Foreign Key Patterns
| From Table | To Table | Column Name | Pattern |
|-----------|----------|-------------|---------|
| `prospects` | `projects` | `project_id` | ✅ `{table}_id` |
| `leads` | `prospects` | `prospect_id` | ✅ `{table}_id` |
| `leads` | `projects` | `project_id` | ✅ `{table}_id` |
| `campaigns` | `projects` | `project_id` | ✅ `{table}_id` |
| `campaign_runs` | `campaigns` | `campaign_id` | ✅ `{table}_id` |

**Result:** ✅ Consistent naming: `{referenced_table}_id`

---

## Data Type Consistency

### UUID Usage
✅ All agents use `uuid` for IDs

### Text Fields
✅ All use `text` (not `varchar`)

### Numbers
- ✅ Integers: all use `integer` or `bigint`
- ⚠️ Decimals: mix of `decimal` and `numeric` (both valid, but inconsistent)

### JSON
- ✅ Prospecting: uses `jsonb`
- ⚠️ Analysis: uses `jsonb`
- ✅ Pipeline: uses `jsonb`

**Result:** ✅ All use `jsonb` (correct choice)

### Timestamps
- ✅ Prospecting: `timestamptz`
- ❌ Analysis: `timestamp` (should be `timestamptz`)
- ✅ Pipeline: `timestamptz`

**Recommendation:** Analysis Engine should change to `timestamptz` for timezone support

---

## Missing Relationships

### Expected Foreign Keys Not Yet Implemented

**From `leads` to `prospects`:**
- ✅ Exists: `prospect_id` → `prospects.id`

**From `composed_emails` to `leads`:**
- ❌ Missing: No schema exists yet

**From `social_outreach` to `leads`:**
- ❌ Missing: No schema exists yet

**From campaigns/runs to projects:**
- ⚠️ References `projects` table, but no `projects` schema exists yet

---

## Recommendations

### HIGH PRIORITY

1. **Analysis Engine** - Convert `leads.json` to standard format
   - Change `tableName` → `table`
   - Change `schema` object → `columns` array
   - Move foreign keys to `foreignKeys` array
   - Change `nullable` → `required`
   - Change `uuid_generate_v4()` → `gen_random_uuid()`
   - Change `timestamp` → `timestamptz`

2. **Pipeline Orchestrator** - Fix `campaign_runs.json` line 89
   - Remove `DESC` from index column definition

3. **Outreach Engine** - Create missing schemas
   - `composed_emails.json`
   - `social_outreach.json`

### MEDIUM PRIORITY

4. **Create `projects` table schema**
   - Referenced by `prospects`, `leads`, and `campaigns`
   - Currently doesn't exist

5. **Add indexes to foreign key columns**
   - `prospects.project_id` needs index
   - `campaign_runs.campaign_id` needs index

### LOW PRIORITY

6. **Standardize decimal vs numeric**
   - Choose one (recommend `numeric` for precision)

7. **Add `updated_at` triggers**
   - Automatically update timestamp on row changes

---

## Database Setup Tool Compatibility

### Ready to Use (3 schemas):
1. ✅ `prospects.json` - Works perfectly
2. ✅ `campaigns.json` - Works perfectly
3. ⚠️ `campaign_runs.json` - Works after 1-line fix

### Needs Conversion (1 schema):
1. ❌ `leads.json` - Complete format conversion required

### Missing (3+ schemas):
1. ❌ `composed_emails.json` - Doesn't exist
2. ❌ `social_outreach.json` - Doesn't exist
3. ❌ `projects.json` - Doesn't exist (but referenced by others)

---

## Summary

**Total Schemas Found:** 4
**Correct Format:** 3 (75%)
**Wrong Format:** 1 (25%)
**Missing Agents:** 1 (Outreach Engine)

**Overall System Grade:** C+

The database schema situation is **mostly good** with consistent naming and structure across most agents. The main issues are:

1. Analysis Engine using a different format
2. Outreach Engine missing schemas entirely
3. Missing `projects` table that multiple tables reference

Once these are fixed, the Database Setup Tool will be able to automatically create the entire database from the schema definitions.

---

**Next Steps:**
1. Fix `campaign_runs.json` (1 line)
2. Convert `leads.json` to standard format
3. Create Outreach Engine schemas
4. Create `projects` schema
5. Run `npm run db:setup` and automate everything! 🚀
