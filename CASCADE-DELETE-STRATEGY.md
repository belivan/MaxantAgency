# CASCADE Delete Strategy Analysis

## Your Question

> "If I delete a project, the prospects should be deleted from project_prospects table. In the prospects table everything can stay. But stuff in the leads table should also be deleted."

## Current Schema

```
projects table
    ↓
project_prospects (junction table)
    ↓ (references)
prospects table
    ↓
leads table
```

**Foreign Keys Currently:**

1. **project_prospects**:
   - `project_id → projects.id` (CASCADE) ✅
   - `prospect_id → prospects.id` (CASCADE) ✅

2. **leads**:
   - `project_id → projects.id` (CASCADE) ✅
   - `prospect_id → prospects.id` (**SET NULL**) ❌

## What Happens Now

When you `DELETE FROM projects WHERE id = '...'`:

1. ✅ `project_prospects` entries CASCADE deleted (junction table cleaned)
2. ✅ `prospects` stay in database (reusable)
3. ✅ `leads` with that `project_id` CASCADE deleted
4. ❌ `leads` with only `prospect_id` (no `project_id`) stay and get `prospect_id` set to NULL

## Two Solutions

### Solution A: Make project_id Required (RECOMMENDED)

**Ensures every lead belongs to a project.**

Benefits:
- Deleting a project automatically deletes all its leads (via `project_id` CASCADE)
- Clear ownership: leads can't be orphaned
- Simpler to reason about

Changes needed:
1. Update leads schema: make `project_id` required
2. Update Analysis Engine: always set `project_id` when creating leads
3. No SQL changes needed (CASCADE already set on `project_id`)

### Solution B: CASCADE on prospect_id

**Delete leads when their prospect is deleted.**

Benefits:
- Deleting a prospect deletes all leads for that prospect
- More granular control

Drawbacks:
- If you delete a prospect from the `prospects` table directly, ALL leads for that prospect (across ALL projects) get deleted
- More complex cascade chains

Changes needed:
1. Run SQL to change `prospect_id` foreign key from SET NULL to CASCADE

## Recommendation

**Use Solution A** because:

1. Your workflow is project-centric:
   ```
   Create Project → Prospect → Analyze → Lead
   ```

2. Leads belong to projects semantically:
   - "I'm analyzing this lead for Project X"
   - Not "I'm analyzing this lead in general"

3. Simpler CASCADE chain:
   ```
   Delete Project
     ↓ (via project_id CASCADE)
   Delete Leads ✅
   ```

4. Prospects can be reused across projects without side effects

## Implementation

### If you choose Solution A (Recommended):

1. **Update leads schema** to require `project_id`
2. **Update Analysis Engine** to always set `project_id`
3. **Leave prospect_id as SET NULL** (it's optional metadata)

### If you choose Solution B:

1. **Run the SQL fix** in [scripts/fix-cascade-deletes.sql](scripts/fix-cascade-deletes.sql)
2. **Be careful** when deleting prospects directly (deletes ALL leads)

## Which Do You Want?

**Option A**: "Every lead must belong to a project. Delete project → delete all its leads."
- Simpler
- Prevents orphaned leads
- Already works (just needs schema update to enforce it)

**Option B**: "Leads can exist without projects. Delete prospect → delete all its leads."
- More flexible
- Requires SQL fix
- More complex cascade behavior

Let me know which approach fits your workflow better!