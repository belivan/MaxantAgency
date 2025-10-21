# Model Selections Feature - Setup & Testing Guide

## 🎯 Quick Start (3 Steps)

### Step 1: Run SQL Migration in Supabase

1. Open your Supabase project dashboard
2. Go to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste this SQL:

```sql
-- Add model selection columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS prospecting_model_selections JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS analysis_model_selections JSONB DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN projects.prospecting_model_selections IS 'AI model selections for prospecting modules (queryUnderstanding, websiteExtraction, relevanceCheck). Saved on first prospect generation to preserve historical accuracy.';

COMMENT ON COLUMN projects.analysis_model_selections IS 'AI model selections for analysis modules (design, SEO, content, social). Saved on first analysis to preserve historical accuracy.';

-- Verify columns exist
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('prospecting_model_selections', 'prospecting_prompts', 'analysis_model_selections', 'analysis_prompts')
ORDER BY column_name;
```

5. Click **Run** (or press Ctrl/Cmd + Enter)
6. You should see a table showing 4 columns - the 2 new ones + 2 existing ones

### Step 2: Run End-to-End Test

From the project root, run:

```bash
node test-model-selections-e2e.js
```

**Expected Output:**
```
✅ Database has model_selections columns
✅ Created project with model selections
✅ Model selections saved correctly
✅ Prompts saved correctly
✅ Loaded project successfully
✅ Model selections loaded correctly
✅ Prompts loaded correctly
✅ Forked project with new models
✅ Forked project has different models
✅ Original project unchanged
✅ Can query projects by model usage
✅ Cleaned up test projects

🎉 All tests passed! Model selections feature is working correctly!
```

### Step 3: Test the UI

1. Start the development server:
```bash
npm run dev
```

2. Go to **Prospecting page**
3. Select a project (or create a new one)
4. Expand **"🎯 Model Selection (Advanced)"**
5. Change a model (e.g., Website Extraction → GPT-5 Vision)
6. Generate prospects
7. Check the database - your model selections should be saved!

**Verify in Supabase:**
```sql
SELECT
  id,
  name,
  prospecting_model_selections,
  prospecting_prompts
FROM projects
WHERE prospecting_model_selections IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

## ✅ What's Working

### 1. UI Features
- ✅ No more duplicate model checkmarks (gpt-4o vs gpt-4o-vision are unique)
- ✅ Model selector shows previously used models when loading a project
- ✅ Prompt editor shows previously used prompts
- ✅ Fork warnings appear when modifying models/prompts with existing prospects
- ✅ Auto-fork preserves both prompts AND model selections

### 2. Backend Features
- ✅ Receives `model_selections` from frontend
- ✅ Saves to database on first prospect generation
- ✅ Normalizes vision model IDs before API calls (strips `-vision` suffix)
- ✅ Logging shows which models are being used

### 3. Database Features
- ✅ Stores model selections as JSONB
- ✅ Queryable by model usage
- ✅ Historical tracking of which models were used
- ✅ Auto-fork preserves configuration

## 📊 Example Data

**Frontend sends:**
```json
{
  "model_selections": {
    "queryUnderstanding": "grok-4-fast",
    "websiteExtraction": "gpt-4o-vision",
    "relevanceCheck": "claude-haiku-4-5"
  }
}
```

**Backend normalizes to:**
```json
{
  "queryUnderstanding": "grok-4-fast",
  "websiteExtraction": "gpt-4o",  // -vision suffix stripped
  "relevanceCheck": "claude-haiku-4-5"
}
```

**Database stores:**
```json
{
  "queryUnderstanding": "grok-4-fast",
  "websiteExtraction": "gpt-4o-vision",  // Original value preserved
  "relevanceCheck": "claude-haiku-4-5"
}
```

## 🎯 Use Cases Enabled

### 1. Cost Analysis
Query which projects used expensive models:
```sql
SELECT name, prospecting_model_selections
FROM projects
WHERE prospecting_model_selections->>'websiteExtraction' = 'gpt-4o-vision';
```

### 2. Quality Comparison
Compare results across different model configurations:
```sql
SELECT
  p.name,
  p.prospecting_model_selections,
  COUNT(pr.id) as prospect_count,
  AVG(pr.relevance_score) as avg_relevance
FROM projects p
LEFT JOIN project_prospects pp ON p.id = pp.project_id
LEFT JOIN prospects pr ON pp.prospect_id = pr.id
WHERE p.prospecting_model_selections IS NOT NULL
GROUP BY p.id, p.name, p.prospecting_model_selections;
```

### 3. Auto-Fork with Complete Config
When a project is forked (prompts modified + prospects exist):
- Original project: Uses `grok-4-fast` for all modules
- Forked project: Uses `gpt-4o` for query understanding
- Both configurations preserved for comparison

## 🔍 Troubleshooting

### Migration Failed
- Check if you have the necessary permissions in Supabase
- Verify you're connected to the correct project
- Try running each `ALTER TABLE` statement separately

### Test Failed
- Make sure migration ran successfully first
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env`
- Verify you can connect to Supabase

### UI Not Showing Saved Models
- Check browser console for errors
- Verify the project has `prospecting_model_selections` in database
- Try refreshing the page

## 📝 Files Modified/Created

**Database:**
- `database-tools/migrations/add-model-selections.sql` - SQL migration
- `database-tools/migrations/README.md` - Migration docs

**Backend:**
- `prospecting-engine/database/supabase-client.js` - Added saveProspectingConfig()
- `prospecting-engine/server.js` - Accepts and saves model_selections

**Frontend:**
- `command-center-ui/lib/types/project.ts` - Added model_selections types
- `command-center-ui/lib/api/projects.ts` - Updated create/update APIs
- `command-center-ui/lib/constants/prospecting.ts` - Fixed duplicate model IDs
- `command-center-ui/components/prospecting/enhanced-config-form.tsx` - Load/save models
- `command-center-ui/app/prospecting/page.tsx` - Auto-fork with models

**Tests:**
- `test-model-selections-e2e.js` - Complete E2E test suite

## 🚀 Next Steps

After verifying everything works:

1. **Delete test projects** (if any were created during testing)
2. **Start using the feature** - generate prospects and see models being tracked
3. **Monitor costs** - use SQL queries to see which models are being used most
4. **Compare quality** - fork projects with different models and compare results

## 📞 Support

If you encounter issues:
1. Check the E2E test output
2. Review Supabase logs
3. Check browser console for frontend errors
4. Review backend logs for API errors
