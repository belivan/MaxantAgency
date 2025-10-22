# Prospecting Engine - Backup System Migration

## Summary

The Prospecting Engine has been successfully migrated to use the **centralized BackupManager** from `database-tools/shared/`. This ensures consistent backup handling across all MaxantAgency engines.

## What Changed

### 1. **Backup Wrapper Created**
- **File**: [prospecting-engine/utils/local-backup.js](prospecting-engine/utils/local-backup.js)
- **Purpose**: Wraps the centralized BackupManager with prospect-specific metadata
- **Pattern**: Follows the example in `database-tools/shared/examples/backup-wrapper-example.js`

### 2. **Orchestrator Updated**
- **File**: [prospecting-engine/orchestrator.js](prospecting-engine/orchestrator.js:30)
- **Changes**:
  - Imports backup functions: `saveLocalBackup`, `markAsUploaded`, `markAsFailed`
  - Implements atomic backup workflow (lines 489-552):
    1. Save local backup BEFORE database upload
    2. Attempt database upload
    3. If success → mark as uploaded
    4. If failure → mark as failed (moves to `failed-uploads/`)

### 3. **Utility Scripts Created**

#### a. **Backup Stats** (`scripts/backup-stats.js`)
```bash
# View backup statistics
node scripts/backup-stats.js

# View detailed file list
node scripts/backup-stats.js --detailed
```

#### b. **Retry Failed Uploads** (`scripts/retry-failed-prospects.js`)
```bash
# Preview failed uploads
node scripts/retry-failed-prospects.js --dry-run

# Retry all failed uploads
node scripts/retry-failed-prospects.js

# Retry for specific project
node scripts/retry-failed-prospects.js --project-id=<uuid>
```

#### c. **Cleanup Old Backups** (`scripts/cleanup-backups.js`)
```bash
# Preview cleanup (30 days default)
node scripts/cleanup-backups.js --dry-run

# Clean up backups older than 7 days
node scripts/cleanup-backups.js --days=7

# Preview 90-day cleanup
node scripts/cleanup-backups.js --days=90 --dry-run
```

#### d. **Test Backup Flow** (`scripts/test-backup-flow.js`)
```bash
# Test the backup system
node scripts/test-backup-flow.js
```

### 4. **Bug Fix in BackupManager**
- **File**: [database-tools/shared/backup-manager.js](database-tools/shared/backup-manager.js:280)
- **Fix**: Added `unlink(backupPath)` after moving failed backups to `failed-uploads/`
- **Result**: Failed backups are now properly removed from the primary directory

## Directory Structure

```
local-backups/
└── prospecting-engine/
    ├── prospects/              # All prospect backups (uploaded and pending)
    └── failed-uploads/         # Prospects that failed to upload to database
```

## Backup Workflow

### Normal Flow (Success)
```javascript
// 1. Save local backup FIRST
const backupPath = await saveLocalBackup(prospectData);

// 2. Upload to database
const savedProspect = await saveOrLinkProspect(prospectData, projectId, metadata);

// 3. Mark as uploaded
await markAsUploaded(backupPath, savedProspect.id);
```

### Error Flow (Database Failure)
```javascript
try {
  // 1. Save local backup FIRST
  const backupPath = await saveLocalBackup(prospectData);

  // 2. Attempt database upload
  const savedProspect = await saveOrLinkProspect(prospectData, projectId, metadata);

  // 3. Mark as uploaded
  await markAsUploaded(backupPath, savedProspect.id);

} catch (dbError) {
  // 4. Mark as failed (moves to failed-uploads/)
  await markAsFailed(backupPath, dbError);
  // Data is preserved locally for later retry
}
```

## Backup File Format

Each backup file contains:

```json
{
  "saved_at": "2025-10-21T20:27:04.803Z",
  "company_name": "Example Company",
  "industry": "Technology",
  "city": "San Francisco",
  "state": "CA",
  "website": "https://example.com",
  "google_place_id": "ChIJ...",
  "google_rating": 4.5,
  "icp_match_score": 85,
  "is_relevant": true,
  "run_id": "uuid-...",
  "website_status": "accessible",
  "data": { /* Full prospect data */ },
  "uploaded_to_db": false,
  "upload_status": "pending",
  "database_id": null,
  "uploaded_at": null
}
```

### Status Values
- `upload_status`: `"pending"` | `"uploaded"` | `"failed"`
- `uploaded_to_db`: `true` | `false`

### Metadata Fields
- `company_name` - Prospect company name
- `industry` - Business industry
- `city`, `state` - Location
- `website` - Company website URL
- `google_place_id` - Google Maps Place ID
- `google_rating` - Google rating (0-5)
- `icp_match_score` - ICP relevance score (0-100)
- `is_relevant` - AI-determined relevance
- `run_id` - Prospecting run identifier
- `website_status` - Website accessibility status

## Testing

All tests passed successfully:

```bash
✅ Test 1: Save local backup
✅ Test 2: Check backup statistics
✅ Test 3: Mark as uploaded
✅ Test 4: Verify upload stats
✅ Test 5: Create failed backup
✅ Test 6: Mark as failed
✅ Test 7: Verify failed stats
✅ Test 8: Retrieve failed uploads
✅ Test 9: Verify pending uploads
```

**Results**:
- Backups are saved locally before database upload ✅
- Backups can be marked as uploaded with DB ID ✅
- Failed uploads are moved to `failed-uploads/` ✅
- Statistics are tracked correctly ✅
- Original files are deleted after moving to failed ✅

## Benefits

### 1. **Data Safety**
- All prospects are saved locally BEFORE attempting database upload
- Network failures don't result in data loss
- Failed uploads can be retried later

### 2. **Consistent Behavior**
- Uses the same BackupManager as Analysis Engine and Outreach Engine
- Centralized bug fixes benefit all engines
- Standardized backup file format

### 3. **Easy Recovery**
- `retry-failed-prospects.js` script retries all failed uploads
- `backup-stats.js` shows upload success rate
- Failed backups include error messages for debugging

### 4. **Maintenance**
- `cleanup-backups.js` archives old uploaded backups
- Configurable retention period (default: 30 days)
- Only deletes backups that are confirmed uploaded

## Migration Checklist

- [x] Analyze current backup usage in orchestrator.js
- [x] Create backup wrapper using centralized BackupManager
- [x] Update orchestrator.js to use backup wrapper
- [x] Add atomic backup operations (markAsUploaded/markAsFailed)
- [x] Create retry script for failed uploads
- [x] Create backup stats script
- [x] Create cleanup script
- [x] Create test script
- [x] Fix BackupManager bug (delete original after moving to failed)
- [x] Test backup and upload flow
- [x] Verify all tests pass

## Next Steps

### Recommended Actions

1. **Monitor Backups**
   ```bash
   # Check backup health regularly
   node scripts/backup-stats.js
   ```

2. **Retry Failed Uploads**
   ```bash
   # Retry any failed uploads (e.g., after database downtime)
   node scripts/retry-failed-prospects.js
   ```

3. **Cleanup Old Backups**
   ```bash
   # Archive old backups monthly
   node scripts/cleanup-backups.js --days=30
   ```

### Integration with Pipeline Orchestrator

The Pipeline Orchestrator (port 3020) can now safely run prospecting workflows knowing that:
- All discovered prospects are backed up locally
- Database failures won't lose data
- Failed uploads can be retried automatically

### Future Enhancements

Potential improvements:
- [ ] Automatic retry scheduling (cron job)
- [ ] Slack/email notifications for failed uploads
- [ ] Backup compression for long-term storage
- [ ] Upload to S3/cloud storage for off-site backup
- [ ] Backup validation on startup

## Documentation

- **BackupManager API**: See `database-tools/shared/backup-manager.js` for full API
- **Example Usage**: See `database-tools/shared/examples/backup-wrapper-example.js`
- **Prospecting Wrapper**: See `prospecting-engine/utils/local-backup.js`

## Support

If you encounter issues:

1. **Check backup stats**: `node scripts/backup-stats.js --detailed`
2. **Review logs**: Check console output for backup errors
3. **Validate backups**: `node scripts/test-backup-flow.js`
4. **Manual inspection**: Backups are JSON files in `local-backups/prospecting-engine/`

---

**Migration Date**: October 21, 2025
**Migrated By**: Claude Code
**Status**: ✅ Complete
