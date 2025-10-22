# Phased Refactor Plan: Move Backup Logic to Orchestrator

**Goal**: Move backup/database logic from `server.js` to `orchestrator.js`
**Pattern**: Match Prospecting Engine architecture
**Time**: ~30 minutes (with testing)
**Risk**: Low (we'll backup everything and test each phase)

---

## 🎯 Architecture Goal

```
BEFORE (Current - Wrong)                 AFTER (Target - Correct)
═══════════════════════════════         ═══════════════════════════════
server.js:                               server.js:
├─ HTTP handling                         ├─ HTTP handling ✓
├─ Backup logic ❌                       └─ Call orchestrator ✓
├─ Database saves ❌
└─ Error handling                        orchestrator.js:
                                         ├─ Run analysis ✓
orchestrator.js:                         ├─ Save backups ✓
└─ Run analysis only                     ├─ Upload to database ✓
                                         └─ Handle failures ✓
```

---

## Phase 0: Pre-Refactor Validation (5 min)

### ✅ Checklist
- [ ] Server is running (or can start)
- [ ] Backup system works (unit tests pass)
- [ ] Database connection configured
- [ ] Create backup of files before changes

### Commands

```bash
# Step 1: Stop server if running
taskkill /F /IM node.exe /FI "WINDOWTITLE eq analysis*" 2>nul || echo "No server running"

# Step 2: Run unit tests (ensure baseline works)
cd analysis-engine
node scripts/test-backup-system.js

# Step 3: Backup current files
copy server.js server.js.backup
copy orchestrator.js orchestrator.js.backup
echo "✅ Backup files created"

# Step 4: Validate current state
cd ../database-tools
node scripts/validate-existing-backups.js
```

**Expected**:
- Unit tests: 10/10 passed ✅
- Backups: All valid ✅
- Files backed up ✅

---

## Phase 1: Add Database Client to Orchestrator (5 min)

### Changes to `orchestrator.js`

**Add imports at top** (after line 14):
```javascript
// Add after existing imports:
import { saveLocalBackup, markAsUploaded, markAsFailed } from './utils/local-backup.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Initialize Supabase client
dotenv.config();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
```

### Test Phase 1

```bash
# Test that imports work (no syntax errors)
cd analysis-engine
node -e "import('./orchestrator.js').then(() => console.log('✅ Orchestrator imports OK')).catch(e => console.error('❌ Import error:', e.message))"
```

**Expected**: `✅ Orchestrator imports OK`

---

## Phase 2: Add `formatLeadData()` Helper (5 min)

### Add to `orchestrator.js` (at end of file, before exports)

```javascript
/**
 * Format analysis result for database insertion
 *
 * @param {object} result - Analysis result from analyzeWebsite()
 * @returns {object} Formatted lead data for database
 */
function formatLeadData(result) {
  return {
    // Basic info
    url: result.url,
    company_name: result.company_name,
    industry: result.industry,
    project_id: result.project_id || null,
    prospect_id: result.prospect_id || null,

    // Scores (round to integers)
    overall_score: Math.round(result.overall_score),
    website_grade: result.grade,
    design_score: Math.round(result.design_score),
    design_score_desktop: result.design_score_desktop ? Math.round(result.design_score_desktop) : Math.round(result.design_score),
    design_score_mobile: result.design_score_mobile ? Math.round(result.design_score_mobile) : Math.round(result.design_score),
    seo_score: Math.round(result.seo_score),
    content_score: Math.round(result.content_score),
    social_score: Math.round(result.social_score),
    accessibility_score: Math.round(result.accessibility_score || 50),

    // Issues and wins
    design_issues: result.design_issues || [],
    design_issues_desktop: result.design_issues_desktop || [],
    design_issues_mobile: result.design_issues_mobile || [],
    seo_issues: result.seo_issues || [],
    content_issues: result.content_issues || [],
    social_issues: result.social_issues || [],
    accessibility_issues: result.accessibility_issues || [],
    accessibility_compliance: result.accessibility_compliance || {},
    quick_wins: result.quick_wins || [],

    // Top issue and one-liner
    top_issue: result.top_issue || null,
    one_liner: result.one_liner || null,

    // Model tracking
    seo_analysis_model: result.seo_analysis_model || null,
    content_analysis_model: result.content_analysis_model || null,
    desktop_visual_model: result.desktop_visual_model || null,
    mobile_visual_model: result.mobile_visual_model || null,
    social_analysis_model: result.social_analysis_model || null,
    accessibility_analysis_model: result.accessibility_analysis_model || null,

    // Screenshots
    screenshot_desktop_url: result.screenshot_desktop_url || null,
    screenshot_mobile_url: result.screenshot_mobile_url || null,

    // Social profiles
    social_profiles: result.social_profiles || {},
    social_platforms_present: result.social_platforms_present || [],

    // SEO/Tech metadata
    tech_stack: result.tech_stack || null,
    has_blog: result.has_blog || false,
    has_https: result.has_https || false,
    page_title: result.page_title || null,
    meta_description: result.meta_description || null,

    // Outreach support
    analysis_summary: result.analysis_summary || null,
    call_to_action: result.call_to_action || null,
    outreach_angle: result.outreach_angle || null,

    // Crawl metadata
    crawl_metadata: result.crawl_metadata || {},

    // Intelligent analysis metadata
    pages_discovered: result.intelligent_analysis?.pages_discovered || 0,
    pages_crawled: result.intelligent_analysis?.pages_crawled || 0,
    pages_analyzed: result.intelligent_analysis?.pages_crawled || 0,
    ai_page_selection: result.intelligent_analysis?.ai_page_selection || null,

    // Performance
    analysis_cost: result.analysis_cost || 0,
    analysis_time: result.analysis_time || 0,

    // Timestamps
    analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
```

### Test Phase 2

```bash
# Test that function exists
cd analysis-engine
node -e "import('./orchestrator.js').then(m => console.log('✅ Orchestrator loaded successfully')).catch(e => console.error('❌ Error:', e.message))"
```

**Expected**: `✅ Orchestrator loaded successfully`

---

## Phase 3: Add `analyzeAndSave()` Function (10 min)

### Add to `orchestrator.js` (after `analyzeWebsite()`, before `analyzeWebsiteIntelligent()`)

```javascript
/**
 * Analyze website and save to database with backup
 *
 * This function wraps analyzeWebsite() and adds:
 * - Local backup (before database upload)
 * - Database upload
 * - Failure tracking
 *
 * @param {string} url - Website URL to analyze
 * @param {object} context - Business context
 * @param {object} options - Analysis options
 * @returns {Promise<object>} Analysis result + database info
 */
export async function analyzeAndSave(url, context = {}, options = {}) {
  let backupPath;

  try {
    // STEP 1: Run analysis
    console.log(`[Orchestrator] Starting analysis for ${url}...`);
    const analysisResult = await analyzeWebsite(url, context, options);

    if (!analysisResult.success) {
      console.log(`[Orchestrator] Analysis failed: ${analysisResult.error}`);
      return analysisResult; // Return analysis errors immediately
    }

    // STEP 2: Format lead data for database
    const leadData = formatLeadData(analysisResult);

    // STEP 3: Save local backup BEFORE database upload
    try {
      backupPath = await saveLocalBackup(analysisResult, leadData);
      console.log(`💾 [Orchestrator] Backup saved: ${backupPath}`);
    } catch (backupError) {
      console.error(`❌ [Orchestrator] Failed to save backup:`, backupError);
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
        console.error(`❌ [Orchestrator] Database upload failed:`, saveError.message);

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
      console.error(`❌ [Orchestrator] Database error:`, dbError.message);

      // Mark backup as failed
      if (backupPath) {
        await markAsFailed(backupPath, dbError.message || dbError);
        console.log(`⚠️  [Orchestrator] Backup marked as failed`);
      }

      return {
        ...analysisResult,
        database_saved: false,
        database_error: dbError.message,
        backup_path: backupPath
      };
    }

  } catch (error) {
    console.error('[Orchestrator] Unexpected error:', error);

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
```

### Test Phase 3

```bash
# Verify function exports
cd analysis-engine
node -e "import { analyzeAndSave } from './orchestrator.js'; console.log('✅ analyzeAndSave exported:', typeof analyzeAndSave === 'function' ? 'function' : 'NOT FOUND');"
```

**Expected**: `✅ analyzeAndSave exported: function`

---

## Phase 4: Update Server to Use Orchestrator (5 min)

### Changes to `server.js`

**1. Update imports** (line ~20):
```javascript
// CHANGE THIS:
import { analyzeWebsite, analyzeMultiple, getBatchSummary, analyzeWebsiteIntelligent } from './orchestrator.js';
import { saveLocalBackup, markAsUploaded, markAsFailed } from './utils/local-backup.js';

// TO THIS:
import { analyzeWebsite, analyzeAndSave, analyzeMultiple, getBatchSummary, analyzeWebsiteIntelligent } from './orchestrator.js';
// Remove: saveLocalBackup, markAsUploaded, markAsFailed
```

**2. Simplify `/api/analyze-url` endpoint** (line ~81):
```javascript
app.post('/api/analyze-url', async (req, res) => {
  try {
    const { url, company_name, industry } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`[Analysis] Starting analysis for ${url}`);

    // Use orchestrator's analyzeAndSave (handles backup + database)
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

**3. Remove old backup code** from `/api/analyze-url`:
- Delete lines with `saveLocalBackup`
- Delete lines with `markAsUploaded`
- Delete lines with `markAsFailed`
- Delete `extractLeadData` function call (now in orchestrator)

### Test Phase 4

```bash
# Check syntax
cd analysis-engine
node -e "import('./server.js').then(() => console.log('✅ Server syntax OK')).catch(e => console.error('❌ Syntax error:', e.message))"
```

**Expected**: `✅ Server syntax OK`

---

## Phase 5: Start Server & Test (5 min)

### Start Server

```bash
cd analysis-engine
node server.js
```

**Watch for**:
```
═══════════════════════════════════════════════════════════════
Analysis Engine Server v2.0
═══════════════════════════════════════════════════════════════
Server running on http://localhost:3001
```

### Test Analysis (New Terminal)

```bash
curl -X POST http://localhost:3001/api/analyze-url \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://www.example.com\",\"company_name\":\"Refactor Test\",\"industry\":\"technology\"}"
```

**Watch server logs for**:
```
[Orchestrator] Starting analysis for https://www.example.com...
💾 [Orchestrator] Backup saved: ...
✅ [Orchestrator] Lead saved to database: ...
✅ [Orchestrator] Backup marked as uploaded
```

### Validate

```bash
# Check backup created
cd ../database-tools
node scripts/validate-existing-backups.js

# Check statistics
cd ../analysis-engine
node -e "import { getBackupStats } from './utils/local-backup.js'; getBackupStats().then(s => console.log('Success rate:', s.success_rate + '%'));"
```

**Expected**:
- Backup created ✅
- All valid ✅
- Success rate: 100% ✅

---

## Phase 6: Update Batch Endpoint (Optional - 5 min)

If we want to update `/api/analyze` (batch endpoint) as well:

### Add `analyzeAndSaveIntelligent()` to orchestrator

Similar to `analyzeAndSave()` but for `analyzeWebsiteIntelligent()`.

### Or Keep Current Approach

The batch endpoint can keep inline backup logic since it uses SSE and needs custom progress reporting.

**Decision**: Leave batch endpoint as-is for now (SSE complexity)

---

## Phase 7: Final Validation & Cleanup (5 min)

### Run Full Test Suite

```bash
# Unit tests
cd analysis-engine
node scripts/test-backup-system.js

# Validation
cd ../database-tools
node scripts/validate-existing-backups.js

# Test retry script
cd ../analysis-engine
node scripts/retry-failed-uploads.js --dry-run
```

**Expected**:
- Unit tests: 10/10 ✅
- Validation: All valid ✅
- Retry: Working ✅

### Cleanup

```bash
# If everything works, remove backup files
cd analysis-engine
del server.js.backup
del orchestrator.js.backup
echo "✅ Refactor complete!"

# If there are issues, restore:
# copy server.js.backup server.js
# copy orchestrator.js.backup orchestrator.js
```

---

## Testing Checklist

### ✅ After Each Phase

- [ ] No syntax errors
- [ ] Server can start
- [ ] Imports work

### ✅ After Refactor Complete

- [ ] Analysis works via API
- [ ] Backup created locally
- [ ] Database upload works
- [ ] Failed uploads tracked
- [ ] Retry script works
- [ ] Unit tests pass (10/10)
- [ ] Validation passes
- [ ] Statistics correct

---

## Rollback Plan

If something breaks:

```bash
# Stop server
taskkill /F /IM node.exe

# Restore backups
cd analysis-engine
copy server.js.backup server.js
copy orchestrator.js.backup orchestrator.js

# Test restore
node server.js
```

---

## Success Criteria

After refactor:

✅ **Architecture matches Prospecting Engine**
```
server.js → HTTP only
orchestrator.js → Business logic + Database + Backups
```

✅ **All tests pass**
- Unit tests: 10/10
- Validation: 100%
- Real analysis: Working

✅ **Backup workflow intact**
- Saves locally first
- Tracks failures
- Retry works

---

## Time Estimate

```
Phase 0: Pre-validation       5 min
Phase 1: Add imports          5 min
Phase 2: Add helper           5 min
Phase 3: Add analyzeAndSave   10 min
Phase 4: Update server        5 min
Phase 5: Test                 5 min
Phase 6: Optional batch       5 min (skip)
Phase 7: Final validation     5 min
─────────────────────────────────
TOTAL:                        ~30 min
```

---

**Ready to start?** Follow phases 0-7 in order, testing after each phase! 🚀
