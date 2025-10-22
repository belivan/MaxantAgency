# Backup System End-to-End Testing Plan

**Purpose**: Validate the complete backup workflow for Analysis Engine
**Approach**: Phased testing with database tools validation at each checkpoint

---

## Pre-Test Setup

### 1. Check Current State

```bash
# Check if backup directories exist
dir local-backups\analysis-engine\leads
dir local-backups\analysis-engine\failed-uploads

# Run validation to see current state
cd database-tools
node scripts\validate-existing-backups.js
```

**Expected**: Directories exist, no backups currently (or existing backups validated)

### 2. Start Analysis Engine

```bash
cd analysis-engine
npm run dev
```

**Expected**: Server starts on port 3001

Keep this terminal open for the rest of testing.

---

## Phase 1: Test Basic Backup Creation

**Goal**: Verify backups are created locally before database upload

### 1.1 Trigger a Test Analysis

Open a **new terminal** and run:

```bash
curl -X POST http://localhost:3001/api/analyze-url ^
  -H "Content-Type: application/json" ^
  -d "{\"url\":\"https://www.anthropic.com\",\"company_name\":\"Anthropic Test\",\"industry\":\"technology\"}"
```

**Watch the server logs** for:
```
💾 [analysis-engine] Local backup saved: anthropic-test-YYYY-MM-DD-timestamp.json
[Analysis] Local backup saved: C:\Users\anton\Desktop\MaxantAgency\local-backups\...
[Analysis] Lead saved to database with ID: uuid-here
[Analysis] Backup marked as uploaded
```

### 1.2 Validate with Database Tools

```bash
cd database-tools
node scripts\validate-existing-backups.js
```

**Expected Output**:
```
Analysis Engine:
  leads/: 1 files
    ✅ Valid: 1
    ❌ Invalid: 0

TOTAL: 1 files scanned
✅ VALID: 1 (100%)
```

### 1.3 Inspect the Backup File

```bash
# List backup files
dir local-backups\analysis-engine\leads

# View the latest backup (replace with actual filename)
type "local-backups\analysis-engine\leads\anthropic-test-*.json"
```

**Expected Fields**:
- ✅ `saved_at` - timestamp
- ✅ `company_name` - "Anthropic Test"
- ✅ `url` - "https://www.anthropic.com"
- ✅ `data.analysis_result` - full analysis object
- ✅ `data.lead_data` - formatted for database
- ✅ `uploaded_to_db` - true
- ✅ `upload_status` - "uploaded"
- ✅ `database_id` - UUID from Supabase

### 1.4 Verify Database Record

```bash
# Check if lead exists in database
node -e "import { createClient } from '@supabase/supabase-js'; import dotenv from 'dotenv'; dotenv.config(); const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY); supabase.from('leads').select('*').eq('company_name', 'Anthropic Test').then(r => console.log(JSON.stringify(r.data, null, 2)));"
```

**Expected**: Record exists with matching URL, grade, scores

### ✅ Phase 1 Checkpoint

- [ ] Backup file created in `leads/` directory
- [ ] Backup file validates successfully
- [ ] `uploaded_to_db` is `true`
- [ ] `upload_status` is `"uploaded"`
- [ ] `database_id` is set
- [ ] Lead record exists in Supabase
- [ ] Validation shows 1 valid backup

---

## Phase 2: Test Batch Analysis (SSE)

**Goal**: Verify multiple backups are created during batch analysis

### 2.1 Prepare Test Data

Create a test file `test-prospects.json`:

```json
[
  {
    "company_name": "OpenAI Test",
    "website": "https://www.openai.com",
    "industry": "technology"
  },
  {
    "company_name": "Google Test",
    "website": "https://www.google.com",
    "industry": "technology"
  }
]
```

### 2.2 Trigger Batch Analysis

```bash
curl -X POST http://localhost:3001/api/analyze ^
  -H "Content-Type: application/json" ^
  -d "{\"prospects\":[{\"company_name\":\"OpenAI Test\",\"website\":\"https://www.openai.com\",\"industry\":\"technology\"},{\"company_name\":\"Google Test\",\"website\":\"https://www.google.com\",\"industry\":\"technology\"}]}"
```

**Watch server logs** for:
```
[Intelligent Analysis] Local backup saved for OpenAI Test
[Intelligent Analysis] Backup marked as uploaded for OpenAI Test
[Intelligent Analysis] Local backup saved for Google Test
[Intelligent Analysis] Backup marked as uploaded for Google Test
```

### 2.3 Validate with Database Tools

```bash
cd database-tools
node scripts\validate-existing-backups.js
```

**Expected Output**:
```
Analysis Engine:
  leads/: 3 files  # (1 from Phase 1 + 2 new)
    ✅ Valid: 3
    ❌ Invalid: 0

TOTAL: 3 files scanned
✅ VALID: 3 (100%)
```

### 2.4 Check Backup Statistics

```bash
cd analysis-engine
node -e "import { getBackupStats } from './utils/local-backup.js'; getBackupStats().then(s => console.log('Total:', s.total_backups, '| Uploaded:', s.uploaded, '| Pending:', s.pending_upload, '| Failed:', s.failed_uploads, '| Success rate:', s.success_rate + '%'));"
```

**Expected Output**:
```
Total: 3 | Uploaded: 3 | Pending: 0 | Failed: 0 | Success rate: 100.0%
```

### ✅ Phase 2 Checkpoint

- [ ] 3 total backup files created
- [ ] All 3 validate successfully
- [ ] All have `upload_status: "uploaded"`
- [ ] Success rate is 100%
- [ ] No pending or failed uploads

---

## Phase 3: Test Failed Upload Handling

**Goal**: Simulate database failure and verify backup is marked as failed

### 3.1 Simulate Database Failure

**Option A**: Temporarily break Supabase credentials

Edit `.env` (make a backup first!):
```bash
# Backup original .env
copy .env .env.backup

# Break the Supabase key (add "INVALID" to the end)
# SUPABASE_SERVICE_KEY=your-key-here-INVALID
```

**Option B**: Use a test URL that will fail validation

(We'll use Option B to keep things simple)

### 3.2 Restart Server with Broken Credentials

```bash
# Stop the server (Ctrl+C in the server terminal)
# Restart it
cd analysis-engine
npm run dev
```

### 3.3 Trigger Analysis That Will Fail Database Upload

We'll intentionally pass malformed data:

```bash
# Try to analyze with a URL that will cause issues
curl -X POST http://localhost:3001/api/analyze-url ^
  -H "Content-Type: application/json" ^
  -d "{\"url\":\"https://www.example-test-fail.com\",\"company_name\":\"Failed Upload Test\",\"industry\":\"test\"}"
```

Actually, let's use a better approach - temporarily disconnect from network or use invalid Supabase URL.

**Better Option C**: Modify server.js temporarily to force a failure

Create a simple test script instead:

```bash
cd analysis-engine
node -e "
import { saveLocalBackup, markAsFailed } from './utils/local-backup.js';

// Create test data
const testResult = {
  url: 'https://test-fail.com',
  company_name: 'Forced Fail Test',
  industry: 'test',
  grade: 'C',
  overall_score: 60,
  design_score: 60,
  seo_score: 60,
  content_score: 60,
  social_score: 60
};

const testLeadData = {
  url: 'https://test-fail.com',
  company_name: 'Forced Fail Test',
  industry: 'test',
  website_grade: 'C',
  overall_score: 60,
  design_score: 60,
  seo_score: 60,
  content_score: 60,
  social_score: 60
};

// Save backup
const path = await saveLocalBackup(testResult, testLeadData);
console.log('Backup saved:', path);

// Mark as failed
const failedPath = await markAsFailed(path, 'Simulated database connection error');
console.log('Marked as failed:', failedPath);
"
```

### 3.4 Validate Failed Upload

```bash
cd database-tools
node scripts\validate-existing-backups.js
```

**Expected Output**:
```
Analysis Engine:
  leads/: 3 files
    ✅ Valid: 3

  failed-uploads/: 1 files
    ✅ Valid: 1

TOTAL: 4 files scanned
✅ VALID: 4 (100%)
```

### 3.5 Inspect Failed Backup

```bash
dir local-backups\analysis-engine\failed-uploads
type "local-backups\analysis-engine\failed-uploads\forced-fail-test-*.json"
```

**Expected Fields**:
- ✅ `upload_failed` - true
- ✅ `upload_status` - "failed"
- ✅ `upload_error` - "Simulated database connection error"
- ✅ `failed_at` - timestamp

### 3.6 Check Statistics

```bash
cd analysis-engine
node -e "import { getBackupStats } from './utils/local-backup.js'; getBackupStats().then(s => console.log('Total:', s.total_backups, '| Uploaded:', s.uploaded, '| Pending:', s.pending_upload, '| Failed:', s.failed_uploads, '| Success rate:', s.success_rate + '%'));"
```

**Expected Output**:
```
Total: 3 | Uploaded: 3 | Pending: 0 | Failed: 1 | Success rate: 100.0%
```

### ✅ Phase 3 Checkpoint

- [ ] Failed backup moved to `failed-uploads/` directory
- [ ] Failed backup validates successfully
- [ ] `upload_status` is `"failed"`
- [ ] `upload_error` contains error message
- [ ] `failed_at` timestamp is set
- [ ] Statistics show 1 failed upload

---

## Phase 4: Test Retry Script

**Goal**: Retry failed upload and verify it moves back to leads directory

### 4.1 Preview Retry (Dry Run)

```bash
cd analysis-engine
node scripts\retry-failed-uploads.js --dry-run
```

**Expected Output**:
```
Found 1 failed upload(s)

[1/1] Retrying: Forced Fail Test
   URL: https://test-fail.com
   Original error: Simulated database connection error
   [DRY RUN] Would attempt upload

RETRY SUMMARY
Total attempted:   1
✅ Successful:     0
❌ Failed:         0
⏭️  Skipped (dry):  1
```

### 4.2 Restore Database Connection (if needed)

If you modified `.env` in Phase 3:

```bash
# Restore original .env
copy .env.backup .env
```

### 4.3 Run Retry Script

```bash
cd analysis-engine
node scripts\retry-failed-uploads.js
```

**Expected Output**:
```
Found 1 failed upload(s)

[1/1] Retrying: Forced Fail Test
   URL: https://test-fail.com
   Original error: Simulated database connection error
   ✅ SUCCESS: Uploaded to database

RETRY SUMMARY
Total attempted:   1
✅ Successful:     1
❌ Failed:         0

Success rate: 100.0%
```

### 4.4 Validate After Retry

```bash
cd database-tools
node scripts\validate-existing-backups.js
```

**Expected Output**:
```
Analysis Engine:
  leads/: 4 files  # Moved back from failed-uploads
    ✅ Valid: 4

  failed-uploads/: 0 files

TOTAL: 4 files scanned
✅ VALID: 4 (100%)
```

### 4.5 Verify Retry Metadata

```bash
# Check the backup file that was retried
type "local-backups\analysis-engine\leads\forced-fail-test-*.json"
```

**Expected Fields**:
- ✅ `uploaded_to_db` - true
- ✅ `upload_status` - "uploaded"
- ✅ `database_id` - UUID
- ✅ `retry_count` - 1
- ✅ No `upload_failed`, `upload_error`, or `failed_at` fields

### ✅ Phase 4 Checkpoint

- [ ] Failed backup successfully retried
- [ ] Backup moved from `failed-uploads/` to `leads/`
- [ ] `upload_status` changed to `"uploaded"`
- [ ] `retry_count` is set to 1
- [ ] Lead record exists in database
- [ ] No failed uploads remaining

---

## Phase 5: Test Migration Script

**Goal**: Test migration from old format to new format

### 5.1 Create Old Format Backup

```bash
cd analysis-engine
node -e "
import { writeFile } from 'fs/promises';
import { join } from 'path';

const oldFormatBackup = {
  saved_at: new Date().toISOString(),
  company_name: 'Old Format Test',
  url: 'https://old-format-test.com',
  analysis_result: {
    grade: 'B',
    overall_score: 75,
    design_score: 70,
    seo_score: 80
  },
  lead_data: {
    url: 'https://old-format-test.com',
    company_name: 'Old Format Test',
    industry: 'test',
    website_grade: 'B',
    overall_score: 75,
    design_score: 70,
    seo_score: 80,
    content_score: 75,
    social_score: 70
  },
  uploaded_to_db: false
};

const path = join(process.cwd(), '..', 'local-backups', 'analysis-engine', 'leads', 'old-format-test-2025-10-21-123456.json');
await writeFile(path, JSON.stringify(oldFormatBackup, null, 2));
console.log('Old format backup created:', path);
"
```

### 5.2 Validate Before Migration

```bash
cd database-tools
node scripts\validate-existing-backups.js
```

**Expected**: Shows warnings about missing new format fields (this is okay)

### 5.3 Run Migration (Dry Run)

```bash
cd analysis-engine
node scripts\migrate-old-backups.js --dry-run
```

**Expected Output**:
```
Found 5 backup file(s)

📦 Converting: old-format-test-2025-10-21-123456.json
   Old format detected, converting to BackupManager format...
   [DRY RUN] Would convert to new format

[DRY RUN] Would upload to database (if pending)

MIGRATION SUMMARY
Total files:       5
Converted:         0  (dry run)
Uploaded:          0  (dry run)
Failed:            0
Skipped:           4

✨ Dry run complete - No changes were made
```

### 5.4 Run Migration

```bash
cd analysis-engine
node scripts\migrate-old-backups.js
```

**Expected Output**:
```
Found 5 backup file(s)

📦 Converting: old-format-test-2025-10-21-123456.json
   Old format detected, converting to BackupManager format...
   ✅ Converted successfully

📤 Uploading: old-format-test-2025-10-21-123456.json
   Company: Old Format Test
   URL: https://old-format-test.com
   ✅ Uploaded successfully with ID: uuid-here

MIGRATION SUMMARY
Total files:       5
Converted:         1
Uploaded:          1
Failed:            0
Skipped:           4
```

### 5.5 Validate After Migration

```bash
cd database-tools
node scripts\validate-existing-backups.js
```

**Expected Output**:
```
Analysis Engine:
  leads/: 5 files
    ✅ Valid: 5
    ❌ Invalid: 0

TOTAL: 5 files scanned
✅ VALID: 5 (100%)
```

### 5.6 Inspect Migrated Backup

```bash
type "local-backups\analysis-engine\leads\old-format-test-2025-10-21-123456.json"
```

**Expected**: Now has new BackupManager format with `data` object and rich metadata

### ✅ Phase 5 Checkpoint

- [ ] Old format backup detected
- [ ] Backup converted to new format
- [ ] Converted backup uploaded to database
- [ ] All backups validate successfully
- [ ] Migrated backup has `data` object
- [ ] Migrated backup has rich metadata fields

---

## Phase 6: Final Validation & Cleanup

**Goal**: Comprehensive validation and cleanup test data

### 6.1 Run Complete Test Suite

```bash
cd analysis-engine
node scripts\test-backup-system.js
```

**Expected Output**:
```
Total tests:  10
✅ Passed:    10
❌ Failed:    0

Success rate: 100.0%
```

### 6.2 Run Comprehensive Validation

```bash
cd database-tools
node scripts\validate-existing-backups.js
```

**Expected Output**:
```
Analysis Engine:
  leads/: 5+ files
    ✅ Valid: 5+
    ❌ Invalid: 0

  failed-uploads/: 0 files

TOTAL: 5+ files scanned
✅ VALID: 5+ (100%)
❌ INVALID: 0
```

### 6.3 Final Statistics Check

```bash
cd analysis-engine
node -e "import { getBackupStats } from './utils/local-backup.js'; getBackupStats().then(s => { console.log('═══════════════════════════════════════'); console.log('FINAL BACKUP STATISTICS'); console.log('═══════════════════════════════════════'); console.log('Total backups:    ', s.total_backups); console.log('Uploaded:         ', s.uploaded); console.log('Pending:          ', s.pending_upload); console.log('Failed:           ', s.failed_uploads); console.log('Success rate:     ', s.success_rate + '%'); console.log('═══════════════════════════════════════'); });"
```

**Expected Output**:
```
═══════════════════════════════════════
FINAL BACKUP STATISTICS
═══════════════════════════════════════
Total backups:     5+
Uploaded:          5+
Pending:           0
Failed:            0
Success rate:      100.0%
═══════════════════════════════════════
```

### 6.4 Database Validation

Check that all leads exist in Supabase:

```bash
node -e "import { createClient } from '@supabase/supabase-js'; import dotenv from 'dotenv'; dotenv.config(); const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY); supabase.from('leads').select('company_name, url, website_grade, overall_score').in('company_name', ['Anthropic Test', 'OpenAI Test', 'Google Test', 'Forced Fail Test', 'Old Format Test']).then(r => { console.log('Found', r.data.length, 'test leads in database:'); r.data.forEach(l => console.log('  -', l.company_name, '|', l.website_grade, '|', l.overall_score)); });"
```

**Expected**: All test leads found in database

### 6.5 Cleanup Test Data (Optional)

```bash
# Remove test backups
cd local-backups\analysis-engine\leads
del *test*.json

# Remove test leads from database
node -e "import { createClient } from '@supabase/supabase-js'; import dotenv from 'dotenv'; dotenv.config(); const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY); supabase.from('leads').delete().in('company_name', ['Anthropic Test', 'OpenAI Test', 'Google Test', 'Forced Fail Test', 'Old Format Test']).then(r => console.log('Deleted test leads'));"
```

### ✅ Phase 6 Checkpoint

- [ ] All test suite tests pass (10/10)
- [ ] All backups validate successfully
- [ ] Success rate is 100%
- [ ] No pending or failed uploads
- [ ] All test leads exist in database
- [ ] Test data cleaned up (optional)

---

## Success Criteria

### ✅ Complete System Validation

All of the following must be true:

**Backup Creation**:
- [x] Backups created for single URL analysis
- [x] Backups created for batch analysis
- [x] Backups have correct new format
- [x] Backups validate successfully

**Database Integration**:
- [x] Successful uploads marked correctly
- [x] Failed uploads tracked properly
- [x] Retry mechanism works
- [x] Database records match backups

**Migration & Tools**:
- [x] Old format converts to new format
- [x] Migration script works correctly
- [x] Retry script works correctly
- [x] Validation script works correctly
- [x] Test suite passes 100%

**Statistics**:
- [x] Success rate is 100% (after retries)
- [x] No pending uploads (all uploaded or failed)
- [x] Failed uploads can be retried successfully

---

## Troubleshooting

### Issue: Validation shows errors

**Solution**: Check the error details in validation output, fix the backup file format

### Issue: Retry fails

**Solution**: Check Supabase credentials, network connection, and error messages

### Issue: Backups not created

**Solution**: Check directory permissions, disk space, and server logs

### Issue: Database records missing

**Solution**: Check if backup was marked as uploaded, verify Supabase connection

---

## Test Results Log

Use this template to track your testing:

```
Date: 2025-10-21
Tester: [Your name]

Phase 1: Basic Backup Creation
  ✅ Backup created
  ✅ Validation passed
  ✅ Database record exists

Phase 2: Batch Analysis
  ✅ Multiple backups created
  ✅ All validated
  ✅ Statistics correct

Phase 3: Failed Upload Handling
  ✅ Failed backup tracked
  ✅ Moved to failed-uploads
  ✅ Error logged

Phase 4: Retry Script
  ✅ Dry run worked
  ✅ Retry succeeded
  ✅ Backup moved back to leads

Phase 5: Migration Script
  ✅ Old format detected
  ✅ Converted successfully
  ✅ Uploaded to database

Phase 6: Final Validation
  ✅ Test suite: 10/10 passed
  ✅ All backups valid
  ✅ 100% success rate

OVERALL: ✅ PASSED
```

---

## Next Steps After Testing

Once all phases pass:

1. ✅ Document any issues found
2. ✅ Update team on new backup system
3. ✅ Set up monitoring for failed uploads
4. ✅ Schedule regular cleanup of old backups
5. ✅ Train team on retry procedures

---

**Testing complete!** You now have a fully validated backup system ready for production use. 🎉
