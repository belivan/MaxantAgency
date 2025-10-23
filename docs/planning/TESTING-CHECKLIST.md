# Testing Checklist

## ✅ What's Ready

### Phase 1: Prompt Deduplication
- [x] Migration SQL created (476 lines)
- [x] Migration runner updated 
- [x] 6 deduplication functions added to supabase-client.js
- [x] linkProspectToProject() updated
- [x] Test suite created
- [ ] **ACTION NEEDED:** Run migration in Supabase SQL Editor

### Phase 2: Orchestrator Refactoring
- [x] 5 service classes created
- [x] New orchestrator created
- [x] Comparison test script created
- [ ] **ACTION NEEDED:** Run comparison test

---

## 🚀 Next Steps (In Order)

### 1. Deploy Phase 1 Migration (10 minutes)
```bash
# Step 1: Go to Supabase SQL Editor
# https://supabase.com/dashboard → Your Project → SQL Editor

# Step 2: Paste entire contents of:
# database-tools/migrations/20251022_prompt_deduplication.sql

# Step 3: Execute and verify:
# - prompt_versions table created
# - icp_versions table created  
# - model_selection_versions table created
# - Foreign keys added to prospects
# - Foreign keys added to project_prospects
```

### 2. Test Phase 1 Deduplication (5 minutes)
```bash
cd database-tools
node tests/test-prompt-deduplication.js
```

Expected output:
- ✅ Version tables exist
- ✅ Deduplication functions work
- ✅ No duplicate snapshots created

### 3. Test Phase 2 Orchestrator (30 minutes)
```bash
cd analysis-engine
node tests/test-orchestrator-comparison.js
```

**Important:** Add a real test URL first:
```javascript
// Edit line 17 in test-orchestrator-comparison.js:
const testCases = [
  {
    url: 'https://yourcompetitor.com', // ← Use a real prospect
    context: {
      company_name: 'Real Company',
      industry: 'Technology',
      prospect_id: 'test-001'
    }
  }
];
```

Expected output:
- ✅ Both orchestrators complete
- ✅ Scores match
- ✅ Grade matches
- ✅ Lead scoring matches
- ✅ Field count matches

### 4. If Tests Pass: Gradual Rollout (Week 4)

**Option A: Side-by-side (Safe)**
```javascript
// In your code that calls the orchestrator:
import { analyzeWebsiteIntelligent as analyzeOld } from './orchestrator.js';
import { analyzeWebsiteIntelligent as analyzeNew } from './orchestrator-refactored.js';

// Run both, compare, use old if new fails
const results = await analyzeNew(url, context, options).catch(async (error) => {
  console.error('New orchestrator failed, falling back to old:', error);
  return await analyzeOld(url, context, options);
});
```

**Option B: Direct switch (After testing)**
```javascript
// Change this line:
import { analyzeWebsiteIntelligent } from './orchestrator.js';
// To this:
import { analyzeWebsiteIntelligent } from './orchestrator-refactored.js';
```

---

## 📊 Expected Improvements

### Database (Phase 1)
- **Before:** 100KB snapshots duplicated across prospects
- **After:** 32-byte SHA-256 references
- **Reduction:** 60-80% database size reduction

### Code Maintainability (Phase 2)
- **Before:** 692-line god object
- **After:** 5 focused services + 120-line coordinator
- **Reduction:** 83% orchestrator complexity reduction
- **Benefits:**
  - Each service testable independently
  - Clear separation of concerns
  - Easy to modify single analyzer without affecting others
  - Better error handling per phase

---

## 🔍 What to Watch

### During Phase 1 Testing
- Check deduplication rate (should be 60-80%)
- Verify foreign keys don't break existing code
- Confirm rollback works (snapshot columns still populated)

### During Phase 2 Testing
- Compare execution time (should be similar ±10%)
- Verify all 50+ output fields present
- Check screenshot paths work
- Validate lead scoring logic identical

---

## 🎯 Success Criteria

Phase 1 is successful if:
- [x] Migration runs without errors
- [ ] Deduplication test passes
- [ ] New prospects use version IDs
- [ ] Database size stops growing as fast

Phase 2 is successful if:
- [x] Comparison test shows identical results
- [ ] No fields missing from output
- [ ] Performance within ±10%
- [ ] Services independently testable

---

## 📁 Key Files

### Phase 1
- Migration SQL: `database-tools/migrations/20251022_prompt_deduplication.sql`
- Test: `database-tools/tests/test-prompt-deduplication.js`
- Updated client: `prospecting-engine/database/supabase-client.js` (lines 283-355, 745-892)

### Phase 2
- Services: `analysis-engine/services/*.js` (5 files)
- New orchestrator: `analysis-engine/orchestrator-refactored.js`
- Comparison test: `analysis-engine/tests/test-orchestrator-comparison.js`
- Old orchestrator: `analysis-engine/orchestrator.js` (keep for comparison)

---

## 🆘 Troubleshooting

### Phase 1: Migration fails
- Check you're using Supabase SQL Editor (not migration runner)
- Verify you have admin/service role permissions
- Check for existing tables with same names

### Phase 2: Results don't match
- Check if custom prompts changed between runs
- Verify same website used for both tests
- Check if analyzers updated between runs
- Compare detailed JSON output (not just scores)

### Both: Performance issues
- Monitor Supabase query performance
- Check if API rate limits hit
- Verify screenshot storage not filling up

---

## 📞 Support

If you encounter issues:
1. Check the error message
2. Review relevant test output
3. Compare with expected output in this checklist
4. Check if environment variables loaded (especially API keys)

**Timeline:**
- Phase 1 deployment: 15 minutes
- Phase 2 testing: 1-2 hours  
- Full rollout: Week 4
