# Prospecting Prompts Save Feature

**Status:** ✅ Complete and Tested
**Date:** 2025-10-20

## Overview

The Prospecting Engine now saves AI prompts to the `projects` table for historical tracking, similar to how the Analysis Engine saves `analysis_prompts`. This ensures that every project preserves the exact AI instructions used for prospect generation.

## Changes Made

### 1. Database Schema
**File:** `database-tools/shared/schemas/projects.json`

Added new column:
```json
{
  "name": "prospecting_prompts",
  "type": "jsonb",
  "description": "AI prompts used for prospecting (query understanding, website extraction, relevance check). Saved on first prospect generation to preserve historical accuracy."
}
```

**Migration Script:** `add-prospecting-prompts-column.sql`

### 2. Prompt Loader Enhancements
**File:** `prospecting-engine/shared/prompt-loader.js`

Added functions:
- `loadRawPrompt(promptPath)` - Loads prompt config without variable substitution
- `loadAllProspectingPrompts()` - Loads all 3 prospecting prompts as raw configs

### 3. Database Client Functions
**File:** `prospecting-engine/database/supabase-client.js`

Added functions:
- `saveProjectProspectingPrompts(projectId, prompts)` - Saves prompts to project
- `saveProjectIcpAndPrompts(projectId, icpBrief, prompts)` - Saves both in one transaction

### 4. Orchestrator Integration
**File:** `prospecting-engine/orchestrator.js`

Updated to:
- Import `loadAllProspectingPrompts()` from prompt loader
- Import `saveProjectIcpAndPrompts()` from database client
- Load all prompts when saving ICP brief
- Save prompts alongside ICP brief in single transaction

## Prompts Saved

The following 3 prompts are saved to each project:

1. **Query Understanding** (`01-query-understanding.json`)
   - Model: `grok-4-fast`
   - Converts ICP brief into Google Maps search query

2. **Website Extraction** (`04-website-extraction.json`)
   - Model: `grok-vision-beta`
   - Extracts business data from website screenshots

3. **Relevance Check** (`07-relevance-check.json`)
   - Model: `grok-4-fast`
   - Scores prospect match against ICP (0-100)

## Database Structure

```json
{
  "prospecting_prompts": {
    "queryUnderstanding": {
      "version": "1.0",
      "name": "query-understanding",
      "model": "grok-4-fast",
      "temperature": 0.2,
      "systemPrompt": "...",
      "userPromptTemplate": "...",
      "variables": ["industry", "city", "target_description"],
      "examples": [...]
    },
    "websiteExtraction": {
      "version": "1.0",
      "name": "website-extraction",
      "model": "grok-vision-beta",
      "temperature": 0.2,
      "systemPrompt": "...",
      "userPromptTemplate": "...",
      "variables": ["company_name"],
      "examples": [...]
    },
    "relevanceCheck": {
      "version": "1.0",
      "name": "relevance-check",
      "model": "grok-4-fast",
      "temperature": 0.1,
      "systemPrompt": "...",
      "userPromptTemplate": "...",
      "variables": [...],
      "examples": [...]
    }
  }
}
```

## Testing

### Test Files Created

1. **`test-prompt-save.js`** - Unit tests for prompt loading and saving
   - ✅ Test 1: Load individual prompt files
   - ✅ Test 2: Load all prompts at once
   - ✅ Test 3: Verify database column exists
   - ✅ Test 4: Test saving prompts to a project

2. **`test-orchestrator-prompt-save.js`** - Integration test for orchestrator
   - ✅ Step 1: Create test project
   - ✅ Step 2: Simulate ICP + prompt save
   - ✅ Step 3: Verify data in database
   - ✅ Step 4: Verify prompt content integrity
   - ✅ Step 5: Clean up test project

### Test Results

```bash
# Run unit tests
cd prospecting-engine
node test-prompt-save.js
# ✅ Passed: 4, ❌ Failed: 0

# Run integration tests
node test-orchestrator-prompt-save.js
# ✅ ALL CHECKS PASSED - Ready for production use!
```

## How It Works

### Before (Old Behavior)
```javascript
// Only ICP brief was saved
await saveProjectIcpBrief(projectId, brief);
```

### After (New Behavior)
```javascript
// Load all prompts from config files
const prospectingPrompts = loadAllProspectingPrompts();

// Save both ICP brief and prompts together
await saveProjectIcpAndPrompts(projectId, brief, prospectingPrompts);
```

## Benefits

1. **Historical Accuracy** - Every project preserves the exact AI prompts used
2. **Version Tracking** - Prompt versions (1.0, 2.0, etc.) are preserved
3. **Reproducibility** - Future analysis can reference the exact instructions used
4. **Audit Trail** - Clear record of what AI models and parameters were used
5. **Consistency** - Matches the Analysis Engine's `analysis_prompts` pattern

## Migration Instructions

The SQL migration has been completed:

```sql
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS prospecting_prompts JSONB;

COMMENT ON COLUMN projects.prospecting_prompts IS
  'AI prompts used for prospecting (query understanding, website extraction, relevance check). Saved on first prospect generation to preserve historical accuracy.';
```

## Future Enhancements

Potential improvements:
- Allow custom prompt overrides at project level
- Version control for prompt changes
- Prompt comparison between projects
- Export/import prompt configurations
- UI for viewing saved prompts in Command Center

## Related Files

- Schema: `database-tools/shared/schemas/projects.json`
- Migration: `add-prospecting-prompts-column.sql`
- Prompt Loader: `prospecting-engine/shared/prompt-loader.js`
- Database Client: `prospecting-engine/database/supabase-client.js`
- Orchestrator: `prospecting-engine/orchestrator.js`
- Tests: `prospecting-engine/test-prompt-save.js`, `test-orchestrator-prompt-save.js`
