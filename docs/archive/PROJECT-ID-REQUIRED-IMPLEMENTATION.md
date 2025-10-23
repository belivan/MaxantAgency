# Project ID Required - Implementation Complete

## What We Implemented (Option A)

Every lead must now belong to a project. When you delete a project, all its leads are automatically deleted via CASCADE.

## Changes Made

### 1. Schema Update ✅
**File**: [analysis-engine/database/schemas/leads.json](analysis-engine/database/schemas/leads.json#L406-L411)

```json
{
  "name": "project_id",
  "type": "uuid",
  "required": true,        // ← Added
  "index": true,           // ← Added
  "description": "Associated project ID - every lead must belong to a project"
}
```

### 2. Analysis Engine API Updates ✅
**File**: [analysis-engine/server.js](analysis-engine/server.js)

**POST /api/analyze-url** (line 87-97):
```javascript
if (!project_id) {
  return res.status(400).json({
    error: 'project_id is required - every lead must belong to a project'
  });
}
```

**POST /api/analyze** (line 295-301):
```javascript
if (!project_id) {
  return res.status(400).json({
    error: 'project_id is required - every lead must belong to a project'
  });
}
```

**Removed `|| null` fallbacks**:
- Line 105: `project_id: project_id` (was: `project_id || null`)
- Line 125: `project_id: project_id,  // Required`
- Line 383: `project_id: project_id  // Required`
- Line 393: `project_id: project_id,  // Required`

### 3. Database Migration SQL ✅
**File**: [scripts/migrate-project-id-required.sql](scripts/migrate-project-id-required.sql)

This SQL script will:
1. Create a default "Unassigned Leads" project
2. Assign orphaned leads (without `project_id`) to this default project
3. Add `NOT NULL` constraint to `project_id` column
4. Verify CASCADE delete is configured correctly
5. Test the CASCADE behavior

## CASCADE Delete Behavior

### What Happens When You Delete a Project

```
DELETE FROM projects WHERE id = 'some-project-id';
```

**Automatic CASCADE deletions**:
1. ✅ All `leads` with that `project_id` are deleted
2. ✅ All `project_prospects` junction entries are deleted
3. ✅ `prospects` stay in database (reusable across projects)

**Example Flow**:
```
Project "Restaurant Campaign"
  ├─ Prospect: "Joe's Pizza"
  │    └─ Lead: "Joe's Pizza analysis" ← DELETED
  ├─ Prospect: "Mario's Pasta"
  │    └─ Lead: "Mario's analysis" ← DELETED
  └─ Prospect: "Luigi's Cafe"
       └─ Lead: "Luigi's analysis" ← DELETED

After deleting project:
  - All 3 leads: DELETED ✅
  - All 3 prospects: Still in prospects table ✅ (can be used in other projects)
  - All junction entries: DELETED ✅
```

## Next Steps

### Step 1: Run the Database Migration

Execute [scripts/migrate-project-id-required.sql](scripts/migrate-project-id-required.sql) in Supabase SQL Editor.

This will:
- Handle existing orphaned leads
- Add NOT NULL constraint
- Verify CASCADE is configured
- Run a test to confirm behavior

### Step 2: Run Database Schema Setup

```bash
cd database-tools
npm run db:validate
npm run db:setup
```

This ensures the leads table schema is updated with the new requirements.

### Step 3: Restart Analysis Engine

```bash
npm run dev:analysis
```

Or restart your services:
```bash
npm run dev
```

### Step 4: Test the Changes

#### Test 1: API Requires project_id

```bash
# This should FAIL with 400 error
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "company_name": "Test"
  }'

# Expected response:
# {"error": "project_id is required - every lead must belong to a project"}
```

#### Test 2: API Works With project_id

```bash
# This should SUCCEED
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "company_name": "Test",
    "project_id": "valid-project-uuid-here"
  }'
```

#### Test 3: CASCADE Delete Works

1. Create a test project in your UI
2. Analyze some prospects for that project (creates leads)
3. Delete the project
4. Verify leads are also deleted

## Important Notes

### For Your Workflow

✅ **DO**: Always provide `project_id` when calling Analysis Engine
✅ **DO**: Create a project first, then analyze prospects for that project
✅ **DO**: Delete projects when you're done (leads will auto-delete)

❌ **DON'T**: Try to create leads without `project_id` (API will reject)
❌ **DON'T**: Worry about orphaned leads (migration handles existing ones)

### Default "Unassigned Leads" Project

The migration creates a special project with UUID `00000000-0000-0000-0000-000000000000`:
- Name: "Unassigned Leads"
- Purpose: Catch any orphaned leads from before this migration
- You can reassign leads from this project to proper projects later

### Backward Compatibility

**Breaking Change**: Old API calls without `project_id` will now return 400 errors.

**Update your integrations**:
- Command Center UI (if it calls Analysis Engine directly)
- Pipeline Orchestrator (should already pass `project_id`)
- Any scripts or external tools

## Benefits

1. **Cleaner Data**: No orphaned leads without project ownership
2. **Automatic Cleanup**: Delete project → leads auto-delete
3. **Clear Organization**: All leads belong to a specific project
4. **Easier Tracking**: Filter and manage leads by project
5. **Safer Deletes**: CASCADE ensures no dangling references

## Rollback Plan

If you need to rollback (unlikely):

```sql
-- Remove NOT NULL constraint
ALTER TABLE leads_core ALTER COLUMN project_id DROP NOT NULL;

-- (Optionally) Delete the default project
DELETE FROM projects WHERE id = '00000000-0000-0000-0000-000000000000';
```

Then revert the Analysis Engine code changes.

## Summary

✅ Schema updated to require `project_id`
✅ API endpoints now validate `project_id`
✅ Migration SQL ready to run
✅ CASCADE delete configured
✅ Default project for orphaned leads

**Next Action**: Run [scripts/migrate-project-id-required.sql](scripts/migrate-project-id-required.sql) in Supabase!