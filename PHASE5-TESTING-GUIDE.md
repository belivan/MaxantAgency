# Phase 5 Testing Guide: Project-based Prospecting

## Prerequisites

Before testing, ensure these steps are completed:

### 1. Database Migration (REQUIRED)

The `projects` table needs new columns. Execute this SQL in Supabase SQL Editor:

```sql
-- Add configuration columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS icp_brief jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS analysis_config jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS outreach_config jsonb;

-- Add descriptions
COMMENT ON COLUMN projects.icp_brief IS 'Ideal Customer Profile brief';
COMMENT ON COLUMN projects.analysis_config IS 'Analysis configuration';
COMMENT ON COLUMN projects.outreach_config IS 'Outreach configuration';
```

**Verify columns were added**:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('icp_brief', 'analysis_config', 'outreach_config');
```

### 2. Create Test Project

```sql
INSERT INTO projects (name, description, status)
VALUES (
  'Test Project - Phase 5',
  'Testing project-based prospecting with ICP brief',
  'active'
)
RETURNING id, name;
```

Save the returned `id` - you'll need it for testing.

## Automated Tests

### Test 1: Database Integration Test

```bash
cd command-center-ui
node test-prospecting-project.js
```

**Expected Output**:
```
🧪 Testing Project-based Prospecting Integration

Test 1: Creating test project...
✅ Project created: Test Project - Prospecting (ID: xxxxxxxx...)

Test 2: Saving ICP brief to project...
✅ ICP brief saved successfully

Test 3: Verifying ICP brief persistence...
✅ ICP brief matches expected data
   Industry: restaurants
   City: San Francisco
   Target: Local restaurants in San Francisco

Test 4: Testing PATCH endpoint...
✅ PATCH endpoint working correctly
   Updated ICP brief industry: cafes

============================================================
📊 Test Summary:
   ✅ Project creation: PASSED
   ✅ ICP brief save: PASSED
   ✅ ICP brief persistence: PASSED
   ✅ PATCH endpoint: PASSED
============================================================

🧹 Cleaning up test project...
✅ Test project deleted
```

**If Test Fails**:
- Check database migration was run
- Verify Supabase credentials in `.env`
- Ensure Next.js dev server is running (for Test 4)

## Manual UI Tests

### Test 2: ProjectSelector Component

1. **Start the UI**:
   ```bash
   cd command-center-ui
   npm run dev
   ```

2. **Navigate to**: http://localhost:3000/prospecting

3. **Verify ProjectSelector appears**:
   - Should see "Project (optional)" dropdown below page header
   - Should have "Global (All Projects)" as first option
   - Should list all active projects

4. **Test dropdown functionality**:
   - Click dropdown
   - Select a project
   - Verify selection persists
   - Change to "Global"
   - Verify it resets to null

### Test 3: URL Parameter Pre-selection

1. **Get a project ID**:
   ```sql
   SELECT id, name FROM projects WHERE status = 'active' LIMIT 1;
   ```

2. **Navigate with parameter**:
   ```
   http://localhost:3000/prospecting?project_id=YOUR_PROJECT_ID
   ```

3. **Verify**:
   - ProjectSelector should show the selected project
   - Not "Global (All Projects)"

### Test 4: Prospect Generation with Project

**Prerequisites**:
- Prospecting engine running on port 3010
- Valid Google Maps API key in prospecting-engine `.env`

**Steps**:

1. **Navigate to**: http://localhost:3000/prospecting

2. **Select a project** from dropdown

3. **Enter ICP Brief**:
   ```json
   {
     "industry": "coffee shops",
     "city": "Oakland",
     "target": "Specialty coffee shops in Oakland"
   }
   ```

4. **Configure generation**:
   - Count: 5
   - Verify: true
   - Model: grok-beta (or your preference)

5. **Click "Generate Prospects"**

6. **Monitor progress**:
   - SSE stream should show real-time progress
   - "Connected to prospect generation stream" message
   - Progress updates for each company

7. **Verify completion**:
   - Success message: "Successfully generated X prospects"
   - Should also show: "ICP brief saved to project"
   - Link to Analysis page should appear

8. **Verify in database**:
   ```sql
   SELECT id, name, icp_brief
   FROM projects
   WHERE id = 'YOUR_PROJECT_ID';
   ```

   The `icp_brief` column should contain:
   ```json
   {
     "industry": "coffee shops",
     "city": "Oakland",
     "target": "Specialty coffee shops in Oakland",
     "count": 5
   }
   ```

9. **Verify prospects linked to project**:
   ```sql
   SELECT pp.project_id, p.company_name, p.industry
   FROM project_prospects pp
   JOIN prospects p ON p.id = pp.prospect_id
   WHERE pp.project_id = 'YOUR_PROJECT_ID'
   LIMIT 5;
   ```

### Test 5: Global (No Project) Generation

1. **Navigate to**: http://localhost:3000/prospecting

2. **Select "Global (All Projects)"** (or leave unselected)

3. **Enter ICP Brief**:
   ```json
   {
     "industry": "restaurants",
     "city": "San Francisco",
     "target": "Italian restaurants in San Francisco"
   }
   ```

4. **Generate prospects**

5. **Verify**:
   - Prospects generated successfully
   - NO message about "ICP brief saved to project"
   - Prospects NOT linked to any project in `project_prospects` table

6. **Check database**:
   ```sql
   SELECT COUNT(*)
   FROM prospects
   WHERE id NOT IN (SELECT prospect_id FROM project_prospects);
   ```
   Should include your newly generated prospects.

### Test 6: Error Handling

**Test 6a: Invalid ICP Brief**

1. Enter invalid JSON:
   ```
   {industry: "restaurants"}  // Missing quotes
   ```

2. Click "Generate Prospects"

3. **Expected**: Error message "Invalid ICP brief JSON"

**Test 6b: Engine Offline**

1. Stop prospecting engine (port 3010)

2. Try to generate prospects

3. **Expected**:
   - Red warning: "Prospecting Engine Offline"
   - Generate button disabled

**Test 6c: Project Update Failure**

This is harder to test but check browser console:
- If PATCH fails, should see warning in console
- User still sees prospect generation success
- No crash or blocking error

## Integration Tests

### Test 7: End-to-End Workflow

**Full workflow from prospecting to outreach**:

1. **Create Project**:
   ```sql
   INSERT INTO projects (name, status)
   VALUES ('E2E Test Project', 'active')
   RETURNING id;
   ```

2. **Generate Prospects** (with project):
   - Go to Prospecting page
   - Select "E2E Test Project"
   - Enter ICP, generate 3 prospects
   - Verify "ICP brief saved to project"

3. **Analyze Prospects**:
   - Go to Analysis page
   - Filter by "E2E Test Project"
   - Select the 3 prospects
   - Run analysis
   - Verify analysis config can be saved to project

4. **Compose Outreach**:
   - Go to Outreach page
   - Filter by "E2E Test Project"
   - Select analyzed leads
   - Compose emails
   - Verify outreach config can be saved to project

5. **Verify Project Data**:
   ```sql
   SELECT
     name,
     icp_brief,
     analysis_config,
     outreach_config
   FROM projects
   WHERE name = 'E2E Test Project';
   ```

   Should have all three configs populated.

## Performance Tests

### Test 8: Large Project List

1. **Create 50 test projects**:
   ```sql
   INSERT INTO projects (name, status)
   SELECT
     'Test Project ' || generate_series,
     'active'
   FROM generate_series(1, 50);
   ```

2. **Navigate to Prospecting page**

3. **Verify**:
   - Dropdown loads quickly (< 1 second)
   - No UI freezing
   - All 50+ projects visible
   - Searchable/scrollable

4. **Cleanup**:
   ```sql
   DELETE FROM projects
   WHERE name LIKE 'Test Project %';
   ```

## Regression Tests

### Test 9: Existing Functionality Still Works

**Verify these work WITHOUT selecting a project**:

1. Generate prospects (Global mode)
2. Prospects appear in Analysis page
3. Can analyze prospects
4. Can compose emails
5. No errors in console
6. No database integrity issues

## Success Criteria

All tests should pass with:
- ✅ No JavaScript errors in browser console
- ✅ No TypeScript compilation errors
- ✅ No database constraint violations
- ✅ ICP brief correctly saved to projects table
- ✅ Prospects correctly linked via project_prospects
- ✅ UI remains responsive
- ✅ Error messages are user-friendly
- ✅ Success messages are clear

## Troubleshooting

### Issue: "Could not find the 'icp_brief' column"

**Solution**: Database migration not run. Execute the SQL in section 1.

### Issue: ProjectSelector shows "No active projects"

**Solutions**:
1. Create an active project in database
2. Check project status (must be 'active', not 'completed' or 'archived')
3. Verify API endpoint: http://localhost:3000/api/projects?status=active

### Issue: "Failed to save ICP brief to project"

**Check**:
1. Browser console for error details
2. Next.js server logs
3. Supabase dashboard for database errors
4. Project ID is valid UUID
5. PATCH endpoint is working: `curl -X PATCH http://localhost:3000/api/projects/{id}`

### Issue: Prospects not linking to project

**Check**:
1. Prospecting engine received projectId
2. Check prospecting engine logs
3. Verify project_prospects table exists
4. Check foreign key constraints

### Issue: TypeScript errors

**Solution**: These are expected in development. Run:
```bash
npm run build
```
To verify production build works.

## Cleanup After Testing

```sql
-- Remove test projects
DELETE FROM projects
WHERE name LIKE '%Test%' OR name LIKE '%E2E%';

-- Remove test prospects (if not linked to real projects)
DELETE FROM prospects
WHERE id NOT IN (SELECT prospect_id FROM project_prospects);
```

---

**Last Updated**: 2025-10-20

**Phase**: 5 - Project-based Prospecting

**Status**: Ready for Testing (after database migration)
