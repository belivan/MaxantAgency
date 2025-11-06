# Quick Start: Self-Tuning with Manual Approval

Get started with the self-tuning system in manual approval mode.

## ✅ Current Configuration

Auto-approval is **DISABLED**. All optimizations require your review.

## 🚀 Setup (One-Time)

### Step 1: Create Database Tables

```bash
cd database-tools
npm run db:validate
npm run db:setup
```

This creates 3 new tables:
- `prompt_variants` - Prompt version history
- `analysis_feedback` - Quality feedback tracking
- `optimization_runs` - Optimization session logs

### Step 2: Verify Configuration

Check that auto-approval is disabled:

```bash
cd analysis-engine/optimization
cat config/optimization-config.json | grep -A2 "autoApproval"
```

Should show:
```json
"autoApproval": {
  "enabled": false,
  "comment": "DISABLED for initial rollout"
}
```

✅ You're ready!

## 📊 Daily Workflow

### 1. Run Your Analyses

The system tracks analysis counts automatically. Every 25 analyses triggers an optimization.

**If not already integrated**, add this to your analysis engine:

```javascript
import { incrementAnalysisCount } from './optimization/services/optimization-scheduler.js';

// After each analysis completes:
await incrementAnalysisCount('desktop-visual-analyzer');
```

### 2. Wait for Optimization

After 25 analyses, you'll see:

```
🔔 Optimization threshold reached for desktop-visual-analyzer
   Analyses since last optimization: 25

══════════════════════════════════════════════════════════════════
🚀 OPTIMIZATION WORKFLOW STARTED: desktop-visual-analyzer
══════════════════════════════════════════════════════════════════

📊 Step 1: Analyzing performance and generating recommendations...

🤖 Optimization completed!
   Decision: pending_review

👤 Human review required:
   Reason: Auto-approval is disabled - all changes require human review
   Review optimization run: abc-123-def
```

### 3. Review the Optimization

Run the review tool:

```bash
cd analysis-engine/optimization
node review-optimizations.js
```

You'll see:
- Performance metrics (accuracy, cost, speed)
- What problems the AI found
- What changes it's suggesting
- Expected impact of changes

### 4. Make a Decision

Choose one:
- **[a] Approve** - Apply the changes
- **[r] Reject** - Keep current prompt
- **[s] Skip** - Review later

### 5. Monitor Results

After approving, the new prompt takes effect immediately. Monitor the next 25 analyses to see if metrics improve as expected.

## 📋 Example Session

```bash
$ node review-optimizations.js

═══════════════════════════════════════
🔍 OPTIMIZATION REVIEW TOOL
═══════════════════════════════════════

Found 1 pending optimization to review:

1. desktop-visual-analyzer - Run #3 (11/5/2025)

═══════════════════════════════════════
[1] Optimization Run: abc-123-def
═══════════════════════════════════════

📊 Basic Info:
   Run #3 for desktop-visual-analyzer
   Data points analyzed: 25
   Optimization cost: $0.018
   Duration: 4.2s

📈 Current Performance:
   Composite Score: 78%
   Accuracy: 85%
   Cost Efficiency: 70%
   Speed: 65%

   AI Metrics:
     Avg Cost: $0.012
     Avg Duration: 3200ms

🤖 AI Analysis:

   Patterns Identified:
   1. High rejection rate (30%) in whitespace category
   2. Score variance of 12.5 indicates inconsistency

   Weaknesses:
   1. Overreporting minor whitespace issues
   2. Inconsistent scoring criteria

💡 Proposed Changes (2):

   1. temperature_adjustment (safe)
      Lower temperature will improve consistency. Current temp
      of 0.4 is causing 15-point score variance for similar sites.
      Change: 0.4 → 0.3
      Expected impact: Accuracy +5%, Cost 0%, Speed 0%

   2. example_addition (safe)
      30% rejection rate in whitespace category suggests unclear
      standards. Explicit good/bad examples will calibrate model.
      Expected impact: Accuracy +10%, Cost +2%, Speed 0%

🎯 Expected Outcome:
   accuracyImprovement: +15%
   costReduction: -8%
   newCompositeScore: 85%
   confidence: high

────────────────────────────────────────
What would you like to do?
  [a] Approve and apply
  [r] Reject
  [s] Skip to next
  [v] View full details
  [q] Quit
────────────────────────────────────────

Your choice: a

Are you sure you want to approve? (yes/no): yes

✅ Optimization approved and applied!
   Variant xyz-456 is now active for desktop-visual-analyzer

✨ All pending optimizations have been reviewed!
```

## 🎯 What to Approve

### ✅ Safe to Approve

These are low-risk, high-value changes:

1. **Temperature adjustments** (0.4 → 0.3)
   - Improves consistency
   - No cost/speed impact

2. **Adding examples**
   - Calibrates AI behavior
   - Minimal cost increase

3. **Clarifying instructions**
   - Reduces confusion
   - Prevents false positives

### ⚠️ Review Carefully

Think twice about:

1. **Model changes** (gpt-5 → grok-4)
   - May affect quality
   - Validate with A/B test

2. **Large instruction changes**
   - Could have unexpected effects
   - Check reasoning carefully

### ❌ Reject These

Don't approve:

1. **Vague reasoning** ("might be better")
2. **Reduces accuracy** (even if saves cost)
3. **No clear problem** (don't fix what isn't broken)

## 🔧 Commands Reference

### Check optimization status
```bash
node -e "import('./services/optimization-scheduler.js').then(m => m.getOptimizationStatus().then(console.log))"
```

### Force optimization (testing)
```bash
node -e "import('./services/optimization-scheduler.js').then(m => m.manualTrigger('desktop-visual-analyzer'))"
```

### List pending reviews
```bash
node review-optimizations.js --list
```

### Quick approve (if you trust it)
```bash
node review-optimizations.js --approve <run_id>
```

### View optimization history
```sql
SELECT analyzer_name, run_number, decision, created_at
FROM optimization_runs
ORDER BY created_at DESC LIMIT 10;
```

## 🎓 Learning Resources

- **[README.md](README.md)** - Complete system documentation
- **[MANUAL-APPROVAL-GUIDE.md](MANUAL-APPROVAL-GUIDE.md)** - Detailed approval guidelines
- **[tests/test-full-workflow.js](tests/test-full-workflow.js)** - See the system in action

## 🆘 Troubleshooting

**Q: Optimization not triggering?**
A: Need 25 analyses first. Check count:
```bash
node -e "import('./services/optimization-scheduler.js').then(m => m.getOptimizationStatus().then(s => console.log(s['desktop-visual-analyzer'])))"
```

**Q: No pending optimizations to review?**
A: Check if any ran:
```sql
SELECT * FROM optimization_runs ORDER BY created_at DESC LIMIT 1;
```

**Q: Want to undo an approval?**
A: See rollback section in [MANUAL-APPROVAL-GUIDE.md](MANUAL-APPROVAL-GUIDE.md)

**Q: Ready to enable auto-approval?**
A: After ~20 successful manual approvals, update config:
```json
{ "autoApproval": { "enabled": true } }
```

## 🎉 Success Metrics

After a few optimization cycles, you should see:
- ✅ Reduced validation rejection rates
- ✅ More consistent scoring
- ✅ Lower AI costs per analysis
- ✅ Faster analysis times

The system learns and improves continuously!

---

**Questions?** Check the [MANUAL-APPROVAL-GUIDE.md](MANUAL-APPROVAL-GUIDE.md) for detailed workflows.
