# Refactor: Move Backup Logic to Orchestrator

**Issue**: Backup logic is currently in `server.js` but should be in `orchestrator.js`

**Correct Pattern** (from Prospecting Engine):
```
server.js (HTTP layer)
    ↓
orchestrator.js (Business logic + Database + Backups)
    ↓
database/supabase-client.js (Database operations)
```

**Current Wrong Pattern** (Analysis Engine):
```
server.js (HTTP layer + Database + Backups) ← TOO MUCH!
    ↓
orchestrator.js (Just analysis) ← TOO LITTLE!
```

---

## Solution

### Step 1: Add Backup to Orchestrator

**File**: `analysis-engine/orchestrator.js`

Add at top:
```javascript
import { saveLocalBackup, markAsUploaded, markAsFailed } from './utils/local-backup.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
```

### Step 2: Create `analyzeAndSave()` function in orchestrator

Add new function:
```javascript
/**
 * Analyze website and save to database with backup
 *
 * @param {string} url - Website URL
 * @param {object} context - Analysis context
 * @param {object} options - Analysis options
 * @returns {Promise<object>} Analysis result + database info
 */
export async function analyzeAndSave(url, context = {}, options = {}) {
  let backupPath;

  try {
    // STEP 1: Run analysis
    const analysisResult = await analyzeWebsite(url, context, options);

    if (!analysisResult.success) {
      return analysisResult; // Return analysis errors immediately
    }

    // STEP 2: Format lead data for database
    const leadData = formatLeadData(analysisResult);

    // STEP 3: Save local backup BEFORE database upload
    try {
      backupPath = await saveLocalBackup(analysisResult, leadData);
      console.log(`💾 [Orchestrator] Backup saved: ${backupPath}`);
    } catch (backupError) {
      console.error(`❌ [Orchestrator] Backup failed:`, backupError);
      // Continue - try database anyway
    }

    // STEP 4: Upload to database
    try {
      const { data: savedLead, error: saveError } = await supabase
        .from('leads')
        .upsert(leadData, { onConflict: 'url' })
        .select()
        .single();

      if (saveError) {
        // Database upload failed
        console.error(`❌ [Orchestrator] Database upload failed:`, saveError);

        // Mark backup as failed
        if (backupPath) {
          await markAsFailed(backupPath, saveError.message || saveError);
          console.log(`⚠️  [Orchestrator] Backup marked as failed`);
        }

        return {
          ...analysisResult,
          database_saved: false,
          database_error: saveError.message,
          backup_path: backupPath
        };
      }

      // Database upload succeeded
      console.log(`✅ [Orchestrator] Lead saved to database: ${savedLead.id}`);

      // Mark backup as uploaded
      if (backupPath) {
        await markAsUploaded(backupPath, savedLead.id);
        console.log(`✅ [Orchestrator] Backup marked as uploaded`);
      }

      return {
        ...analysisResult,
        database_saved: true,
        database_id: savedLead.id,
        backup_path: backupPath
      };

    } catch (dbError) {
      console.error(`❌ [Orchestrator] Database error:`, dbError);

      // Mark backup as failed
      if (backupPath) {
        await markAsFailed(backupPath, dbError.message || dbError);
      }

      return {
        ...analysisResult,
        database_saved: false,
        database_error: dbError.message,
        backup_path: backupPath
      };
    }

  } catch (error) {
    console.error('[Orchestrator] Analysis failed:', error);

    // If we have a backup of failed analysis, mark it
    if (backupPath) {
      await markAsFailed(backupPath, error.message);
    }

    return {
      success: false,
      error: error.message,
      backup_path: backupPath
    };
  }
}

/**
 * Format analysis result for database insertion
 */
function formatLeadData(result) {
  return {
    url: result.url,
    company_name: result.company_name,
    industry: result.industry,
    project_id: result.project_id || null,

    // Scores
    overall_score: Math.round(result.overall_score),
    website_grade: result.grade,
    design_score: Math.round(result.design_score),
    seo_score: Math.round(result.seo_score),
    content_score: Math.round(result.content_score),
    social_score: Math.round(result.social_score),

    // ... all other fields ...

    analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
```

### Step 3: Simplify Server

**File**: `analysis-engine/server.js`

Remove backup imports and logic, use orchestrator:

```javascript
import { analyzeAndSave } from './orchestrator.js'; // Add this
// Remove: saveLocalBackup, markAsUploaded, markAsFailed

app.post('/api/analyze-url', async (req, res) => {
  try {
    const { url, company_name, industry } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`[Analysis] Starting analysis for ${url}`);

    // Use orchestrator's analyzeAndSave (handles everything)
    const result = await analyzeAndSave(url, {
      company_name: company_name || 'Unknown Company',
      industry: industry || 'Unknown'
    }, {
      onProgress: (progress) => {
        console.log(`[Analysis] ${progress.step}: ${progress.message}`);
      }
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'Analysis failed',
        details: result.error
      });
    }

    console.log(`[Analysis] Complete - Grade: ${result.grade}, DB Saved: ${result.database_saved}`);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('[Analysis] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});
```

---

## Benefits

### ✅ Proper Separation of Concerns

```
server.js (HTTP Layer)
├─ Handle HTTP requests
├─ Validate input
├─ Call orchestrator
└─ Return HTTP responses

orchestrator.js (Business Logic Layer)
├─ Run analysis
├─ Save backups
├─ Upload to database
├─ Handle failures
└─ Return results

utils/local-backup.js (Backup Layer)
└─ Wrapper around BackupManager

database-tools/shared/backup-manager.js (Core Backup Logic)
└─ Centralized backup operations
```

### ✅ Matches Prospecting Engine Pattern

Now both engines follow the same architecture!

### ✅ Easier Testing

- Test orchestrator logic independently
- Test server HTTP handling separately
- Mock database in orchestrator tests

### ✅ Better Error Handling

Orchestrator can handle business logic errors properly before they reach HTTP layer

---

## Testing After Refactor

```bash
# 1. Run unit tests
cd analysis-engine
node scripts/test-backup-system.js

# 2. Test via API
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","company_name":"Test","industry":"tech"}'

# 3. Validate backups
cd ../database-tools
node scripts/validate-existing-backups.js
```

---

## Files to Modify

1. ✅ `analysis-engine/orchestrator.js` - Add database save + backup logic
2. ✅ `analysis-engine/server.js` - Simplify to just HTTP handling
3. ✅ Test and validate

---

**Status**: Ready to implement
**Time**: ~20 minutes
**Risk**: Low (just moving code, not changing logic)
