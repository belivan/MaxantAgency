# Local Backup System - CRITICAL FIX

**Status**: 🚨 **URGENT - NOT YET INTEGRATED**
**Date**: 2025-10-21

---

## PROBLEM DISCOVERED

**You were RIGHT to be concerned!**

### ❌ Current Situation:
1. **NO local backup** - If Supabase fails, analysis results are LOST
2. **NO screenshots saved yet** - Directory doesn't exist (no analysis completed)
3. **NO recovery mechanism** - Can't retry failed Supabase saves
4. **20+ hanging processes** - All stuck trying to connect to Supabase

### 💸 Cost Impact:
- Each analysis costs $0.10-0.50 in AI API calls (GPT-4o Vision + Grok)
- If Supabase fails = **money wasted, work lost**

---

## SOLUTION CREATED

I've built a **local-first backup system**:

**File**: [analysis-engine/utils/local-backup.js](analysis-engine/utils/local-backup.js)

### How It Works:

```
1. Run Analysis (screenshots, AI analysis, etc.)
   ↓
2. SAVE LOCALLY FIRST 💾
   → analysis-engine/local-backups/leads/{company}-{date}.json
   ↓
3. Try uploading to Supabase
   ↓
4a. SUCCESS? → Mark backup as uploaded ✅
4b. FAILED? → Move to failed-uploads/ for retry ⚠️
```

### What Gets Saved Locally:

```json
{
  "saved_at": "2025-10-21T18:45:00.000Z",
  "company_name": "Wilder",
  "url": "https://wilderphilly.com/",
  "analysis_result": {
    "grade": "C",
    "overall_score": 67,
    "design_score_desktop": 72,
    "design_score_mobile": 65,
    "screenshot_desktop_url": "/path/to/screenshot-desktop.png",
    "screenshot_mobile_url": "/path/to/screenshot-mobile.png",
    "social_profiles": {...},
    "crawl_metadata": {...},
    "...": "all fields"
  },
  "lead_data": {
    "...": "formatted for database"
  },
  "uploaded_to_db": false
}
```

---

## NEXT STEPS (NOT YET DONE)

### Step 1: Integrate into server.js

Update [analysis-engine/server.js](analysis-engine/server.js#L293-L295) to use local backup:

```javascript
// BEFORE (CURRENT - LOSES DATA ON FAILURE):
const { error: saveError } = await supabase
  .from('leads')
  .upsert(leadData, { onConflict: 'url' });

if (saveError) {
  console.error(`Failed to save lead:`, saveError);
  // ❌ DATA IS LOST!
}

// AFTER (WITH LOCAL BACKUP):
import { saveLocalBackup, markAsUploaded, markAsFailed } from './utils/local-backup.js';

// Save locally FIRST
const backupPath = await saveLocalBackup(result, leadData);

// THEN try Supabase
const { error: saveError } = await supabase
  .from('leads')
  .upsert(leadData, { onConflict: 'url' });

if (saveError) {
  console.error(`Failed to save lead:`, saveError);
  await markAsFailed(backupPath, saveError.message);
  // ✅ DATA SAFE IN LOCAL BACKUP!
} else {
  await markAsUploaded(backupPath);
  console.log(`✓ Saved to database AND local backup`);
}
```

### Step 2: Create Retry Script

Create `analysis-engine/scripts/retry-failed-uploads.js`:

```javascript
import { getFailedUploads } from '../utils/local-backup.js';
import { supabase } from '../database/supabase-client.js';

// Get all failed uploads
const failed = await getFailedUploads();

console.log(`Found ${failed.length} failed uploads to retry`);

for (const backup of failed) {
  try {
    const { error } = await supabase
      .from('leads')
      .upsert(backup.lead_data, { onConflict: 'url' });

    if (!error) {
      console.log(`✅ Retried: ${backup.company_name}`);
      // Move from failed-uploads/ back to leads/ and mark as uploaded
    }
  } catch (err) {
    console.log(`❌ Still failing: ${backup.company_name}`);
  }
}
```

### Step 3: Add Backup Stats Endpoint

Add to server.js:

```javascript
app.get('/api/backup-stats', async (req, res) => {
  const stats = await getBackupStats();
  res.json(stats);
});
```

Returns:
```json
{
  "total_backups": 50,
  "uploaded": 45,
  "pending_upload": 3,
  "failed_uploads": 2,
  "backup_dir": "C:\\...\\local-backups\\leads",
  "failed_dir": "C:\\...\\local-backups\\failed-uploads"
}
```

---

## BENEFITS

### ✅ Never Lose Data Again:
- Analysis results saved locally FIRST
- Supabase failures don't lose work
- Can retry uploads later

### ✅ Recovery Mechanism:
- Failed uploads tracked in `failed-uploads/`
- Can bulk retry with script
- Manual recovery possible

### ✅ Audit Trail:
- All analysis results logged locally
- Can verify what was processed
- Backup statistics available

### ✅ Offline Capable:
- Can run analysis offline
- Upload to Supabase when connection restored

---

## DIRECTORY STRUCTURE

```
analysis-engine/
├── screenshots/                    # Screenshots (created on demand)
├── local-backups/
│   ├── leads/                      # All analysis backups
│   │   ├── wilder-2025-10-21-abc123.json
│   │   ├── zahav-2025-10-21-def456.json
│   │   └── ...
│   └── failed-uploads/             # Failed Supabase uploads
│       ├── fork-2025-10-21-ghi789.json
│       └── ...
└── utils/
    ├── screenshot-storage.js       # Screenshot utilities
    └── local-backup.js             # ✨ NEW - Local backup system
```

---

## WHAT TO DO NOW

1. **Kill all hanging Node processes** (20+ processes stuck on Supabase)
2. **Integrate local-backup.js into server.js** (I can do this)
3. **Run the SQL migration** from RUN-THIS-SQL.sql
4. **Test with 1-2 prospects** to verify local backup works
5. **Then scale to 10+ prospects** knowing data is safe

---

## FILES CREATED

1. ✅ [analysis-engine/utils/local-backup.js](analysis-engine/utils/local-backup.js) - Backup system
2. ✅ [LOCAL-BACKUP-SYSTEM.md](LOCAL-BACKUP-SYSTEM.md) - This document
3. ⏳ **NEED TO INTEGRATE** into server.js

---

## RISK ASSESSMENT

### WITHOUT Local Backup (Current):
- ❌ **HIGH RISK** - Data loss on Supabase failures
- ❌ **HIGH COST** - Wasted AI API calls ($0.10-0.50 per analysis)
- ❌ **NO RECOVERY** - Can't retry failed saves

### WITH Local Backup (After Integration):
- ✅ **LOW RISK** - Data always saved locally first
- ✅ **COST PROTECTED** - Never waste AI API calls
- ✅ **FULL RECOVERY** - Can retry uploads anytime

---

## NEXT IMMEDIATE ACTION

**Do you want me to**:
1. **Integrate local backup into server.js NOW** ← RECOMMENDED
2. **Kill hanging processes and test schema cleanup first**
3. **Create retry script before integrating**

Choose option 1 and I'll integrate it immediately so you never lose data again.
