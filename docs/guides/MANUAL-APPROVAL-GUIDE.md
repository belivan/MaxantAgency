# Manual Approval Guide

Since you've disabled auto-approval, all optimization suggestions will require your review and approval. Here's how to work with the system.

## Configuration

✅ **Auto-approval is DISABLED** in `config/optimization-config.json`:

```json
{
  "autoApproval": {
    "enabled": false,
    "comment": "DISABLED for initial rollout - all changes require human approval"
  }
}
```

This means **every optimization will be marked as `pending_review`** and wait for your approval.

## Workflow

### 1. System Runs Optimization

Every 25 analyses, the system will:
1. Collect performance metrics
2. Call meta-AI to analyze and suggest improvements
3. Create a new prompt variant
4. Mark optimization as **`pending_review`**
5. Save everything to database
6. **STOP** - wait for your approval

### 2. You Review Suggestions

Use the interactive review tool:

```bash
cd analysis-engine/optimization
node review-optimizations.js
```

This will show you:
- Current performance metrics
- AI's analysis of what's wrong
- Specific changes proposed
- Expected impact of changes
- Full reasoning

### 3. Approve or Reject

For each optimization, you can:
- **[a] Approve** - Apply the changes immediately
- **[r] Reject** - Archive the suggestion and keep current prompt
- **[s] Skip** - Review later
- **[v] View** - See full prompt details
- **[q] Quit** - Exit the tool

## Review Tool Usage

### Interactive Mode (Recommended)

```bash
node review-optimizations.js
```

Shows all pending optimizations one by one, with full details and interactive choices.

**Example Session:**
```
Found 2 pending optimization(s) to review:

1. desktop-visual-analyzer - Run #3 (11/5/2025)
2. seo-analyzer - Run #1 (11/4/2025)

═══════════════════════════════════════
[1] Optimization Run: abc-123-def
═══════════════════════════════════════

📊 Basic Info:
   Run #3 for desktop-visual-analyzer
   Created: 11/5/2025, 3:45 PM
   Data points analyzed: 25
   ...

🤖 AI Analysis:
   Patterns Identified:
   1. High rejection rate (30%) in 'whitespace' category
   2. Score variance of 12.5 indicates inconsistency

   Weaknesses:
   1. Overreporting minor whitespace issues
   2. Inconsistent scoring criteria

💡 Proposed Changes (2):
   1. temperature_adjustment (safe)
      Lower temperature will improve consistency
      Change: 0.4 → 0.3
      Expected Impact: Accuracy +5%, Cost 0%, Speed 0%

   2. example_addition (safe)
      Explicit examples will calibrate standards
      Expected Impact: Accuracy +10%, Cost +2%, Speed 0%

What would you like to do?
  [a] Approve and apply
  [r] Reject
  [s] Skip to next
  [v] View full details
  [q] Quit

Your choice: a

Are you sure you want to approve? (yes/no): yes

✅ Optimization approved and applied!
   Variant xyz-456 is now active for desktop-visual-analyzer
```

### Command-Line Mode

For scripting or quick actions:

**List pending optimizations:**
```bash
node review-optimizations.js --list
```

**Approve specific optimization:**
```bash
node review-optimizations.js --approve <run_id>
```

**Reject specific optimization:**
```bash
node review-optimizations.js --reject <run_id> "Not confident in these changes"
```

## What to Look For When Reviewing

### ✅ Good Signs (Safe to Approve)

1. **Clear reasoning** - AI explains exactly why it's making each change
2. **Evidence-based** - References specific metrics (e.g., "30% rejection rate")
3. **Small changes** - Temperature adjustments, adding examples, clarifications
4. **Positive expected impact** - Improves accuracy without hurting cost/speed
5. **Safe classification** - Changes marked as "safe"

### ⚠️ Warning Signs (Review Carefully)

1. **Vague reasoning** - "This might be better"
2. **Large changes** - Complete prompt rewrites
3. **Model changes** - Switching between different AI models
4. **Trade-offs** - Improves one metric but significantly hurts another
5. **Major classification** - Changes marked as "major" or "risky"

### ❌ Red Flags (Reject)

1. **Reduces accuracy** - Expected accuracy decrease
2. **No clear problem** - Suggests changes when metrics are good
3. **Unexplained changes** - Can't justify why it's doing something
4. **Removes important instructions** - Deletes crucial prompt sections

## Example Decision Process

**Scenario 1: Temperature Adjustment**
```
Change: temperature 0.4 → 0.3
Reasoning: "Score variance of 12.5 indicates inconsistency. Lower temperature will improve consistency."
Expected: Accuracy +5%, Cost 0%, Speed 0%
Classification: safe

✅ APPROVE - Clear problem (high variance), simple fix, no downsides
```

**Scenario 2: Adding Examples**
```
Change: Add 2 examples of good/bad whitespace issues
Reasoning: "30% rejection rate in whitespace category suggests unclear standards"
Expected: Accuracy +10%, Cost +2%, Speed 0%
Classification: safe

✅ APPROVE - Evidence-based, addresses real problem, minimal cost increase
```

**Scenario 3: Model Switch**
```
Change: gpt-5-mini → grok-4-fast
Reasoning: "Could save costs"
Expected: Accuracy -5%, Cost -40%, Speed +20%
Classification: moderate

⚠️ REVIEW CAREFULLY - Trades accuracy for cost. Only approve if cost is critical concern.
```

**Scenario 4: Complete Rewrite**
```
Change: Completely rewrite system prompt
Reasoning: "Different approach might work better"
Expected: Accuracy +2%, Cost 0%, Speed 0%
Classification: major

❌ REJECT - Vague reasoning, risky change, minimal expected benefit
```

## Monitoring

### Check Optimization History

```sql
-- View recent optimizations
SELECT
  analyzer_name,
  run_number,
  decision,
  reviewed_by,
  created_at,
  applied_at
FROM optimization_runs
ORDER BY created_at DESC
LIMIT 10;
```

### Track Improvements

```sql
-- See improvements from approved optimizations
SELECT
  analyzer_name,
  run_number,
  metrics_before->'composite'->>'score' as before_score,
  metrics_after->'composite'->>'score' as after_score,
  applied_at
FROM optimization_runs
WHERE decision = 'approved'
ORDER BY applied_at DESC;
```

### View Active Variants

```sql
-- See what's currently running
SELECT
  analyzer_name,
  version_number,
  applied_at,
  sample_size,
  performance_metrics->'accuracy' as accuracy
FROM prompt_variants
WHERE is_active = true;
```

## Tips

### Start Conservatively

For the first few optimizations:
- Only approve "safe" changes with strong reasoning
- Look for evidence of real problems (high rejection rates, inconsistency, errors)
- Prefer incremental improvements over big changes

### Build Trust Gradually

After 5-10 successful approvals:
- You'll start seeing patterns in what the AI suggests
- You'll learn which types of changes work well
- You can become more confident in approvals

### Enable Auto-Approval Later

Once you're comfortable (after ~20 optimizations), you can enable auto-approval for safe changes:

```json
{
  "autoApproval": {
    "enabled": true,
    "comment": "Enable after validating system behavior"
  }
}
```

This will auto-apply safe changes but still flag risky ones for review.

## Troubleshooting

### No pending optimizations showing up?

**Check if optimization ran:**
```sql
SELECT * FROM optimization_runs
ORDER BY created_at DESC LIMIT 5;
```

If no runs exist, optimization hasn't triggered yet (need 25 analyses).

### Can't find run ID to approve?

Use the `--list` command:
```bash
node review-optimizations.js --list
```

### Want to undo an approval?

Use rollback:
```sql
-- Find previous variant
SELECT * FROM prompt_variants
WHERE analyzer_name = 'desktop-visual-analyzer'
ORDER BY version_number DESC;

-- Reactivate previous version
UPDATE prompt_variants
SET is_active = false
WHERE analyzer_name = 'desktop-visual-analyzer';

UPDATE prompt_variants
SET is_active = true
WHERE id = '<previous-variant-id>';
```

### Want to see what changed?

View the variant differences:
```javascript
const { data: variants } = await supabase
  .from('prompt_variants')
  .select('*')
  .eq('analyzer_name', 'desktop-visual-analyzer')
  .order('version_number', { ascending: false })
  .limit(2);

console.log('Current:', variants[0].prompt_content);
console.log('Previous:', variants[1].prompt_content);
console.log('Changes:', variants[0].changes_made);
```

## Next Steps

1. **Run some analyses** to generate data (need 25+ for first optimization)
2. **Wait for optimization to trigger** (automatic after 25 analyses)
3. **Review the suggestion** using `node review-optimizations.js`
4. **Approve or reject** based on the guidelines above
5. **Monitor results** to see if improvement was real
6. **Repeat** - build confidence over time

---

**Remember:** The AI is suggesting improvements, but **you have the final say**. Don't approve anything you're not comfortable with!
