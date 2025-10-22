# Backup System - Phased Testing Plan

## Overview

This testing plan validates the **centralized backup system** for the Prospecting Engine, including integration with database-tools and full end-to-end workflow testing.

---

## Phase 1: Local Backup System (Isolated Testing)

**Goal**: Verify backup wrapper works correctly without database interaction

### Test 1.1: Backup Creation
```bash
# Run isolated backup test
node prospecting-engine/scripts/test-backup-flow.js
```

**Expected Results**:
- ✅ Backups created in `local-backups/prospecting-engine/prospects/`
- ✅ Backup files contain correct metadata
- ✅ Filename format: `company-name-YYYY-MM-DD-timestamp.json`
- ✅ `upload_status` = `"pending"`

**Verification**:
```bash
# View backup stats
node prospecting-engine/scripts/backup-stats.js --detailed
```

**Success Criteria**:
- Total backups: 2
- Pending: 1
- Uploaded: 1
- Failed: 1
- Success rate: 50.0%

---

### Test 1.2: Failed Upload Handling
**Verification**:
```bash
# Check failed-uploads directory
ls local-backups/prospecting-engine/failed-uploads/

# View detailed stats
node prospecting-engine/scripts/backup-stats.js --detailed
```

**Expected Results**:
- ✅ Failed backup moved to `failed-uploads/` directory
- ✅ Original file removed from `prospects/` directory
- ✅ Backup contains `upload_error` field
- ✅ `upload_status` = `"failed"`

---

### Test 1.3: Cleanup
```bash
# Clean up test backups
rm -rf local-backups/prospecting-engine
```

---

## Phase 2: Database Integration Testing

**Goal**: Test backup system with real database operations

### Test 2.1: Database Connection Validation

**Pre-requisite**: Ensure Supabase credentials are configured
```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY

# Or check .env file
cat .env | grep SUPABASE
```

**Database Validation**:
```bash
# Validate database schema
cd database-tools
npm run db:validate

# Check prospects table exists
npm run db:setup -- --dry-run | grep prospects
```

**Expected Results**:
- ✅ `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set
- ✅ All schemas validate successfully
- ✅ `prospects` table exists with correct columns

---

### Test 2.2: Mock Prospect Upload Test

**Test Script**: Create a test that saves a real prospect to the database

```bash
# Create test script
cat > prospecting-engine/scripts/test-db-backup.js << 'EOF'
#!/usr/bin/env node

import { saveLocalBackup, markAsUploaded, markAsFailed } from '../utils/local-backup.js';
import { saveOrLinkProspect } from '../database/supabase-client.js';

console.log('Testing database backup workflow...\n');

const testProspect = {
  company_name: 'Test Backup Integration Co',
  industry: 'Technology',
  city: 'San Francisco',
  state: 'CA',
  website: 'https://test-backup-integration.example.com',
  contact_phone: '555-TEST',
  google_place_id: 'test-place-backup-' + Date.now(),
  google_rating: 4.8,
  icp_match_score: 92,
  is_relevant: true,
  website_status: 'accessible',
  status: 'ready_for_analysis',
  source: 'prospecting-engine',
  run_id: 'test-backup-' + Date.now()
};

let backupPath = null;

try {
  // Step 1: Save local backup
  console.log('1. Saving local backup...');
  backupPath = await saveLocalBackup(testProspect);
  console.log('   ✅ Backup saved:', backupPath.split(/[\\/]/).pop());

  // Step 2: Upload to database
  console.log('\n2. Uploading to database...');
  const savedProspect = await saveOrLinkProspect(testProspect, null, {
    run_id: testProspect.run_id,
    discovery_query: 'test backup integration query',
    query_generation_model: 'test-model'
  });
  console.log('   ✅ Uploaded to database with ID:', savedProspect.id);

  // Step 3: Mark as uploaded
  console.log('\n3. Marking backup as uploaded...');
  await markAsUploaded(backupPath, savedProspect.id);
  console.log('   ✅ Backup marked as uploaded');

  console.log('\n✅ TEST PASSED: Backup → Database → Mark Uploaded\n');

  // Cleanup: Delete test prospect from database
  const { supabase } = await import('../database/supabase-client.js');
  await supabase.from('prospects').delete().eq('id', savedProspect.id);
  console.log('🧹 Cleaned up test prospect from database\n');

} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);

  if (backupPath) {
    await markAsFailed(backupPath, error);
    console.log('⚠️  Backup marked as failed\n');
  }

  process.exit(1);
}
EOF

chmod +x prospecting-engine/scripts/test-db-backup.js
node prospecting-engine/scripts/test-db-backup.js
```

**Expected Results**:
- ✅ Backup created locally
- ✅ Prospect uploaded to database
- ✅ Backup marked as uploaded with database ID
- ✅ Test prospect cleaned up from database

---

### Test 2.3: Database Failure Simulation

**Test Script**: Simulate database failure by using invalid credentials

```bash
# Create test script
cat > prospecting-engine/scripts/test-db-failure.js << 'EOF'
#!/usr/bin/env node

import { saveLocalBackup, markAsFailed } from '../utils/local-backup.js';

console.log('Testing database failure scenario...\n');

const testProspect = {
  company_name: 'Failed Upload Test Co',
  industry: 'Retail',
  city: 'Boston',
  state: 'MA',
  website: 'https://failed-upload-test.example.com',
  run_id: 'test-failure-' + Date.now()
};

let backupPath = null;

try {
  // Step 1: Save local backup
  console.log('1. Saving local backup...');
  backupPath = await saveLocalBackup(testProspect);
  console.log('   ✅ Backup saved:', backupPath.split(/[\\/]/).pop());

  // Step 2: Simulate database failure
  console.log('\n2. Simulating database failure...');
  throw new Error('Simulated database connection timeout');

} catch (error) {
  console.log('   ❌ Database upload failed:', error.message);

  // Step 3: Mark as failed
  console.log('\n3. Marking backup as failed...');
  const failedPath = await markAsFailed(backupPath, error);
  console.log('   ✅ Backup moved to failed-uploads');

  console.log('\n✅ TEST PASSED: Failure handling works correctly\n');
}
EOF

chmod +x prospecting-engine/scripts/test-db-failure.js
node prospecting-engine/scripts/test-db-failure.js
```

**Expected Results**:
- ✅ Backup created locally
- ✅ Database failure simulated
- ✅ Backup moved to `failed-uploads/` directory
- ✅ Backup contains error message

**Verification**:
```bash
# Check failed uploads
node prospecting-engine/scripts/backup-stats.js --detailed
```

---

## Phase 3: Retry Mechanism Testing

**Goal**: Test both engine-specific and centralized retry scripts

### Test 3.1: Engine-Specific Retry

```bash
# Preview failed uploads
node prospecting-engine/scripts/retry-failed-prospects.js --dry-run

# Retry failed uploads (this should fail because the test prospect doesn't have valid data)
node prospecting-engine/scripts/retry-failed-prospects.js
```

**Expected Results**:
- ✅ Script finds failed uploads
- ✅ Displays failure details
- ✅ Attempts retry for each failed backup

---

### Test 3.2: Centralized Database-Tools Retry

```bash
# Preview all engines' failed uploads
node database-tools/scripts/retry-failed-uploads.js --dry-run

# Retry only prospecting engine
node database-tools/scripts/retry-failed-uploads.js --engine prospecting-engine --dry-run

# Actually retry (if you have valid failed backups)
node database-tools/scripts/retry-failed-uploads.js --engine prospecting-engine
```

**Expected Results**:
- ✅ Script scans `local-backups/` directory
- ✅ Finds prospecting-engine failed uploads
- ✅ Uses correct upload function (`saveOrLinkProspect`)
- ✅ Moves successful retries back to `prospects/` directory

---

### Test 3.3: Successful Retry Verification

**Create a valid failed backup for retry testing**:

```bash
cat > prospecting-engine/scripts/create-valid-failed-backup.js << 'EOF'
#!/usr/bin/env node

import { saveLocalBackup, markAsFailed } from '../utils/local-backup.js';

const validProspect = {
  company_name: 'Valid Retry Test Co',
  industry: 'Technology',
  city: 'Austin',
  state: 'TX',
  website: 'https://valid-retry-test.example.com',
  google_place_id: 'valid-retry-' + Date.now(),
  google_rating: 4.5,
  icp_match_score: 88,
  is_relevant: true,
  website_status: 'accessible',
  status: 'ready_for_analysis',
  source: 'prospecting-engine',
  run_id: 'valid-retry-' + Date.now(),
  contact_phone: '555-RETRY'
};

const backupPath = await saveLocalBackup(validProspect);
console.log('Created backup:', backupPath.split(/[\\/]/).pop());

// Mark as failed with a temporary error
await markAsFailed(backupPath, 'Temporary database error (testing retry)');
console.log('Marked as failed for retry testing\n');
console.log('Now run: node database-tools/scripts/retry-failed-uploads.js --engine prospecting-engine');
EOF

chmod +x prospecting-engine/scripts/create-valid-failed-backup.js
node prospecting-engine/scripts/create-valid-failed-backup.js
```

**Then test the retry**:
```bash
# Retry with centralized script
node database-tools/scripts/retry-failed-uploads.js --engine prospecting-engine
```

**Expected Results**:
- ✅ Failed backup found
- ✅ Upload successful
- ✅ Backup moved from `failed-uploads/` to `prospects/`
- ✅ Database contains the prospect
- ✅ Backup file updated with `uploaded_to_db: true` and `database_id`

**Verification**:
```bash
# Check backup stats (should show 0 failed uploads)
node prospecting-engine/scripts/backup-stats.js

# Verify in database (check for the prospect)
# You can use Supabase dashboard or write a query script
```

---

## Phase 4: Cleanup Testing

**Goal**: Test backup archiving/cleanup functionality

### Test 4.1: Cleanup Preview

```bash
# Preview cleanup (30-day default)
node prospecting-engine/scripts/cleanup-backups.js --dry-run

# Preview 7-day cleanup
node prospecting-engine/scripts/cleanup-backups.js --days=7 --dry-run
```

**Expected Results**:
- ✅ Shows current backup statistics
- ✅ Displays cutoff date
- ✅ Indicates which backups would be deleted (dry run)

---

### Test 4.2: Cleanup Execution

```bash
# Clean up backups older than 0 days (for testing, this will delete all uploaded backups)
node prospecting-engine/scripts/cleanup-backups.js --days=0

# Verify cleanup
node prospecting-engine/scripts/backup-stats.js
```

**Expected Results**:
- ✅ Only uploaded backups are deleted
- ✅ Pending and failed backups are NOT deleted
- ✅ Statistics updated correctly

---

## Phase 5: End-to-End Pipeline Testing

**Goal**: Test full prospecting pipeline with real backup integration

### Test 5.1: Simple Prospecting Run (1 Prospect)

```bash
# Create test ICP brief
cat > test-icp-brief.json << 'EOF'
{
  "industry": "restaurant",
  "city": "Austin",
  "target": "family restaurants in Austin",
  "count": 1
}
EOF

# Create test script
cat > prospecting-engine/scripts/test-e2e-backup.js << 'EOF'
#!/usr/bin/env node

import { runProspectingPipeline } from '../orchestrator.js';
import { getBackupStats } from '../utils/local-backup.js';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  END-TO-END BACKUP TESTING                                     ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Get initial backup stats
console.log('Initial backup stats:');
const statsBefore = await getBackupStats();
console.log(`  Total: ${statsBefore?.total_backups || 0}`);
console.log(`  Uploaded: ${statsBefore?.uploaded || 0}`);
console.log(`  Pending: ${statsBefore?.pending_upload || 0}`);
console.log(`  Failed: ${statsBefore?.failed_uploads || 0}\n`);

// Run prospecting pipeline
const brief = {
  industry: 'restaurant',
  city: 'Austin',
  target: 'family restaurants in Austin',
  count: 1
};

const options = {
  verifyWebsites: true,
  scrapeWebsites: false,  // Skip scraping for faster test
  findSocial: false,       // Skip social for faster test
  scrapeSocial: false,
  checkRelevance: true,
  filterIrrelevant: false  // Keep all prospects
};

console.log('Running prospecting pipeline...\n');

const results = await runProspectingPipeline(brief, options, (event) => {
  if (event.type === 'step') {
    console.log(`  [${event.step}] ${event.name}: ${event.status}`);
  } else if (event.type === 'progress') {
    console.log(`  Processing: ${event.company} (${event.current}/${event.total})`);
  }
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('Pipeline Results:');
console.log(`  Found: ${results.found}`);
console.log(`  Verified: ${results.verified}`);
console.log(`  Saved: ${results.saved}`);
console.log(`  Skipped: ${results.skipped}`);
console.log(`  Failed: ${results.failed}`);
console.log('═══════════════════════════════════════════════════════════════\n');

// Get updated backup stats
console.log('Updated backup stats:');
const statsAfter = await getBackupStats();
console.log(`  Total: ${statsAfter?.total_backups || 0}`);
console.log(`  Uploaded: ${statsAfter?.uploaded || 0}`);
console.log(`  Pending: ${statsAfter?.pending_upload || 0}`);
console.log(`  Failed: ${statsAfter?.failed_uploads || 0}\n`);

// Validate backup was created
const backupsCreated = (statsAfter?.total_backups || 0) - (statsBefore?.total_backups || 0);
console.log('═══════════════════════════════════════════════════════════════');
console.log('BACKUP VALIDATION:');
console.log(`  Backups created: ${backupsCreated}`);
console.log(`  Expected: ${results.saved}`);

if (backupsCreated === results.saved) {
  console.log('  ✅ PASSED: Backup count matches saved prospects');
} else {
  console.log('  ❌ FAILED: Backup count mismatch');
  process.exit(1);
}

if ((statsAfter?.uploaded || 0) > (statsBefore?.uploaded || 0)) {
  console.log('  ✅ PASSED: Backups marked as uploaded');
} else {
  console.log('  ⚠️  WARNING: No backups marked as uploaded');
}

console.log('═══════════════════════════════════════════════════════════════\n');

console.log('✅ END-TO-END TEST COMPLETE\n');
EOF

chmod +x prospecting-engine/scripts/test-e2e-backup.js
node prospecting-engine/scripts/test-e2e-backup.js
```

**Expected Results**:
- ✅ Pipeline discovers 1 prospect
- ✅ Backup created in `local-backups/prospecting-engine/prospects/`
- ✅ Prospect uploaded to database
- ✅ Backup marked as uploaded with database ID
- ✅ Backup stats show 1 new uploaded backup

---

### Test 5.2: Batch Prospecting (5 Prospects)

```bash
# Modify the test to run 5 prospects
# Edit test-e2e-backup.js and change count: 5
# Then run again
```

**Expected Results**:
- ✅ All prospects backed up locally
- ✅ All prospects uploaded to database
- ✅ All backups marked as uploaded
- ✅ Success rate: 100%

---

### Test 5.3: Database Failure During Pipeline

**Temporarily break database connection**:
```bash
# Save current env
cp .env .env.backup

# Break database connection
echo "SUPABASE_SERVICE_KEY=invalid-key-for-testing" >> .env

# Run pipeline (should fail gracefully)
node prospecting-engine/scripts/test-e2e-backup.js

# Restore env
mv .env.backup .env
```

**Expected Results**:
- ✅ Prospects discovered
- ✅ Backups created locally
- ✅ Database uploads fail
- ✅ Backups moved to `failed-uploads/`
- ✅ Pipeline continues (doesn't crash)

**Verify**:
```bash
# Check failed uploads
node prospecting-engine/scripts/backup-stats.js --detailed

# Retry with working database
node database-tools/scripts/retry-failed-uploads.js --engine prospecting-engine
```

---

## Phase 6: Cross-Engine Integration

**Goal**: Verify centralized backup system works across multiple engines

### Test 6.1: Database-Tools Validation Script

```bash
# Run the centralized validation script
node database-tools/scripts/validate-existing-backups.js
```

**Expected Results**:
- ✅ Scans `local-backups/prospecting-engine/`
- ✅ Validates all backup files
- ✅ Reports any invalid JSON or missing fields
- ✅ Shows validation summary

---

### Test 6.2: Cross-Engine Retry Test

```bash
# Create failed backups in multiple engines (if analysis-engine is also migrated)
# Then run centralized retry for all engines
node database-tools/scripts/retry-failed-uploads.js --dry-run

# Or just prospecting engine
node database-tools/scripts/retry-failed-uploads.js --engine prospecting-engine
```

**Expected Results**:
- ✅ Script scans all engines
- ✅ Uses engine-specific upload functions
- ✅ Correctly routes to `saveOrLinkProspect` for prospecting-engine
- ✅ Reports results per engine

---

## Test Summary Checklist

### Phase 1: Local Backup System ✅
- [ ] Test 1.1: Backup Creation
- [ ] Test 1.2: Failed Upload Handling
- [ ] Test 1.3: Cleanup

### Phase 2: Database Integration ✅
- [ ] Test 2.1: Database Connection Validation
- [ ] Test 2.2: Mock Prospect Upload Test
- [ ] Test 2.3: Database Failure Simulation

### Phase 3: Retry Mechanism ✅
- [ ] Test 3.1: Engine-Specific Retry
- [ ] Test 3.2: Centralized Database-Tools Retry
- [ ] Test 3.3: Successful Retry Verification

### Phase 4: Cleanup ✅
- [ ] Test 4.1: Cleanup Preview
- [ ] Test 4.2: Cleanup Execution

### Phase 5: End-to-End Pipeline ✅
- [ ] Test 5.1: Simple Prospecting Run (1 Prospect)
- [ ] Test 5.2: Batch Prospecting (5 Prospects)
- [ ] Test 5.3: Database Failure During Pipeline

### Phase 6: Cross-Engine Integration ✅
- [ ] Test 6.1: Database-Tools Validation Script
- [ ] Test 6.2: Cross-Engine Retry Test

---

## Quick Test Commands

```bash
# Phase 1: Local System
node prospecting-engine/scripts/test-backup-flow.js
node prospecting-engine/scripts/backup-stats.js --detailed

# Phase 2: Database Integration
node prospecting-engine/scripts/test-db-backup.js
node prospecting-engine/scripts/test-db-failure.js

# Phase 3: Retry
node prospecting-engine/scripts/retry-failed-prospects.js --dry-run
node database-tools/scripts/retry-failed-uploads.js --engine prospecting-engine --dry-run

# Phase 4: Cleanup
node prospecting-engine/scripts/cleanup-backups.js --dry-run

# Phase 5: End-to-End
node prospecting-engine/scripts/test-e2e-backup.js

# Phase 6: Cross-Engine
node database-tools/scripts/validate-existing-backups.js
node database-tools/scripts/retry-failed-uploads.js --dry-run
```

---

## Success Criteria

The backup system is **production-ready** when:

1. ✅ All Phase 1-6 tests pass
2. ✅ Backup success rate >= 95%
3. ✅ Failed uploads can be retried successfully
4. ✅ No data loss during database failures
5. ✅ Cleanup script archives old backups correctly
6. ✅ Centralized retry script works for prospecting-engine
7. ✅ All backup files validate successfully

---

## Troubleshooting

### Issue: Backups not created
**Check**:
```bash
# Verify backup manager is initialized
node -e "import('./prospecting-engine/utils/local-backup.js').then(m => console.log(m.getConfig()))"
```

### Issue: Database uploads failing
**Check**:
```bash
# Verify Supabase credentials
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY

# Test database connection
cd database-tools
npm run db:validate
```

### Issue: Retry not working
**Check**:
```bash
# Verify failed uploads exist
ls -la local-backups/prospecting-engine/failed-uploads/

# Check backup file format
cat local-backups/prospecting-engine/failed-uploads/<filename>.json | jq
```

---

**Testing Plan Version**: 1.0
**Last Updated**: October 21, 2025
**Status**: Ready for Execution
