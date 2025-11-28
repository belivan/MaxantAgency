# Self-Tuning Analysis Engine

**AI that optimizes itself.**

This system creates a feedback loop where AI analyzes its own performance and automatically improves the prompts used for website analysis.

## Overview

```
Every 25 analyses → AI analyzes performance → Suggests improvements → A/B tests changes → Applies winner
```

### The Problem

Website analyzers use AI prompts to identify design, SEO, content, and social media issues. But how do you know if the prompts are working well? Are they finding the right issues? Are they too expensive? Too slow? Inconsistent?

**Traditional approach:** Manually review results, guess at improvements, hope for the better.

**Self-tuning approach:** AI monitors its own metrics, identifies patterns, suggests specific improvements, tests them scientifically, and applies what works.

### The Solution

A meta-AI system that:

1. **Collects metrics** from every analysis (accuracy, cost, speed, quality)
2. **Identifies patterns** (e.g., "whitespace issues have 30% rejection rate")
3. **Suggests improvements** (e.g., "add examples, lower temperature")
4. **A/B tests changes** (50/50 split on next 20 analyses)
5. **Applies winners** (auto-applies safe changes, flags risky ones for review)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Analysis Engine                           │
│  (desktop-visual, mobile-visual, SEO, content, etc.)        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Every 25 analyses
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                 Optimization Scheduler                       │
│  Tracks analysis counts, triggers optimization               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                  Metrics Aggregator                          │
│  Collects data from ai_calls, leads, analysis_feedback      │
│  Calculates: accuracy, cost, speed, composite score         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                   Prompt Optimizer                           │
│  Meta-AI (GPT-5) analyzes metrics and suggests changes      │
│  Generates optimized prompt variant                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                 Decision Engine                              │
│  Safe changes? → Auto-apply                                  │
│  Moderate changes? → A/B test                                │
│  Major changes? → Human review                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                   A/B Test Manager                           │
│  Runs parallel tests (control vs experimental)               │
│  Evaluates results with statistical significance            │
│  Applies winner automatically                                │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 1. Comprehensive Metrics Collection

Tracks 3 categories of metrics:

**AI Call Metrics** (from `ai_calls` table):
- Average cost per call
- Average duration (speed)
- Token usage (efficiency)
- Error rate
- Cache hit rate

**Quality Metrics** (from `analysis_feedback` table):
- Accuracy rate (% of issues that are correct)
- Relevance rate (% of issues that matter to clients)
- Actionability rate (% of issues with clear fixes)
- False positive rate
- Conversion rate (% that lead to deals)

**Output Metrics** (from `leads` table):
- Average score consistency
- Issue count patterns
- Validation rejection rate
- Score variance (consistency indicator)

### 2. AI-Powered Optimization

The **meta-prompt** ([prompt-optimizer.json](prompts/meta-prompts/prompt-optimizer.json)) is an AI that:

- Analyzes performance data
- Identifies patterns and weaknesses
- Suggests specific, actionable improvements
- Explains reasoning for each change
- Estimates impact on accuracy, cost, and speed
- Classifies changes by risk level

**Example optimization:**
```
Pattern: "High rejection rate (30%) in 'whitespace' category"
Suggestion: "Add explicit good/bad examples for whitespace issues"
Expected impact: +10% accuracy, +2% cost
Classification: SAFE (auto-apply)
```

### 3. Intelligent Decision-Making

Not all optimizations are equal. The system classifies changes:

**SAFE** (auto-applied):
- Temperature adjustments (±0.1)
- Adding examples or clarifications
- Minor wording improvements
- Category definition refinements

**MODERATE** (requires A/B test):
- Model changes within same family
- Significant instruction rewording
- Temperature changes >0.1

**MAJOR** (requires human approval):
- Model family changes (GPT → Grok)
- Complete prompt rewrites
- Fundamental approach changes

### 4. Scientific A/B Testing

When changes need validation:

1. **Split traffic** 50/50 between control and experimental
2. **Collect samples** (minimum 20 per variant)
3. **Calculate composite scores** (accuracy 60%, cost 20%, speed 20%)
4. **Test statistical significance** (95% confidence)
5. **Apply winner** automatically if significant improvement

### 5. Safety Mechanisms

The system never makes changes that:
- Reduce accuracy below 80%
- Increase cost by more than 15%
- Slow down analysis by more than 25%

All changes are logged with full rollback capability.

## Setup

### 1. Database Setup

Run the database setup script to create required tables:

```bash
cd database-tools
npm run db:validate
npm run db:setup
```

This creates:
- `prompt_variants` - Stores prompt versions
- `analysis_feedback` - Tracks quality ratings
- `optimization_runs` - Logs optimization sessions

### 2. Configuration

The system is configured via [config/optimization-config.json](config/optimization-config.json):

```json
{
  "optimization": {
    "enabled": true,
    "triggerFrequency": 25,  // Optimize every N analyses
    "minimumDataPoints": 10   // Require at least 10 data points
  },
  "metrics": {
    "weights": {
      "accuracy": 0.6,  // Most important
      "cost": 0.2,
      "speed": 0.2
    }
  },
  "autoApproval": {
    "enabled": true,
    "safetyThresholds": {
      "minimumAccuracy": 0.80,
      "maximumCostIncrease": 0.15,
      "maximumSpeedDecrease": 0.25
    }
  }
}
```

**⚠️ IMPORTANT: Manual Approval Mode**

By default, **auto-approval is DISABLED** for the initial rollout. This means all optimizations will require your review and approval.

To enable manual approval mode (recommended for rollout):
```json
{
  "autoApproval": {
    "enabled": false,  // All changes need approval
    "comment": "DISABLED for initial rollout - all changes require human approval"
  }
}
```

See [MANUAL-APPROVAL-GUIDE.md](MANUAL-APPROVAL-GUIDE.md) for complete instructions on reviewing and approving optimizations.

### 3. Environment Variables

No additional environment variables required. Uses existing:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY` (for GPT-5 meta-AI)

### 4. Enable Logging

To track AI costs and performance:

```env
LOG_AI_CALLS_TO_DB=true
```

## Usage

### Automatic Mode (Recommended)

The system runs automatically! Every 25 analyses, optimization triggers automatically.

**Integration point** in your analysis engine:

```javascript
import { incrementAnalysisCount } from './optimization/services/optimization-scheduler.js';

// After each analysis completes:
await incrementAnalysisCount('desktop-visual-analyzer');

// That's it! The system handles the rest.
```

### Manual Trigger

Force an optimization run:

```bash
cd analysis-engine/optimization
node -e "import('./services/optimization-scheduler.js').then(m => m.manualTrigger('desktop-visual-analyzer'))"
```

### Check Status

See optimization progress for all analyzers:

```bash
node -e "import('./services/optimization-scheduler.js').then(m => m.getOptimizationStatus().then(console.log))"
```

Output:
```json
{
  "desktop-visual-analyzer": {
    "analysisCount": 18,
    "threshold": 25,
    "progress": "18/25",
    "progressPercent": "72.0",
    "activeTest": null,
    "lastOptimization": "2025-11-05T10:30:00Z"
  }
}
```

### Review and Approve Optimizations (Manual Approval Mode)

When auto-approval is disabled, optimizations will be marked as `pending_review` and wait for your approval.

**Interactive review tool:**

```bash
cd analysis-engine/optimization
node review-optimizations.js
```

This shows you:
- Current performance metrics
- AI's analysis and patterns identified
- Specific changes proposed with reasoning
- Expected impact (accuracy, cost, speed)
- Interactive approve/reject/skip options

**Command-line options:**

```bash
# List all pending optimizations
node review-optimizations.js --list

# Approve specific optimization
node review-optimizations.js --approve <run_id>

# Reject specific optimization
node review-optimizations.js --reject <run_id> "reason"
```

**What the tool shows you:**

```
Found 1 pending optimization to review:

═══════════════════════════════════════
Optimization Run: abc-123-def
═══════════════════════════════════════

📊 Current Performance:
   Composite Score: 78%
   Accuracy: 85%, Cost: 70%, Speed: 65%

🤖 AI Analysis:
   Patterns Identified:
   1. High rejection rate (30%) in whitespace category
   2. Score variance of 12.5 indicates inconsistency

💡 Proposed Changes (2):
   1. temperature_adjustment (safe)
      Lower temperature from 0.4 to 0.3 for consistency
      Expected: Accuracy +5%, Cost 0%, Speed 0%

   2. example_addition (safe)
      Add explicit good/bad examples for whitespace
      Expected: Accuracy +10%, Cost +2%, Speed 0%

What would you like to do?
  [a] Approve and apply
  [r] Reject
  [s] Skip
  [v] View full details
  [q] Quit
```

See [MANUAL-APPROVAL-GUIDE.md](MANUAL-APPROVAL-GUIDE.md) for detailed review guidelines and best practices.

### Submit Feedback

Help the AI learn by providing feedback:

```javascript
import { supabase } from './database/supabase-client.js';

await supabase.from('analysis_feedback').insert({
  lead_id: 'uuid',
  analyzer_name: 'desktop-visual-analyzer',
  feedback_type: 'issue_accuracy',
  is_accurate: true,
  is_relevant: true,
  is_actionable: true,
  feedback_text: 'Excellent catch - client loved this insight'
});
```

## Testing

### Run All Tests

```bash
cd analysis-engine/optimization/tests

# Test metrics aggregation
node test-metrics-aggregation.js

# Test prompt optimization
node test-prompt-optimization.js

# Test A/B testing
node test-ab-testing.js

# Full workflow test
node test-full-workflow.js
```

### Full Workflow Test

The [test-full-workflow.js](tests/test-full-workflow.js) script demonstrates the complete cycle:

```bash
node tests/test-full-workflow.js
```

Output shows:
1. Initial system state
2. Current performance metrics
3. AI analysis and recommendations
4. Expected outcome
5. Decision and next steps
6. Final status

## How It Works: Step-by-Step

### Step 1: Metric Collection

Every AI call is logged to `ai_calls` table with:
- Cost, tokens, duration
- Model used
- Full request/response

Every analysis is logged to `leads` table with:
- Scores, issues, grades
- Validation results

Feedback is collected in `analysis_feedback` table.

### Step 2: Trigger Detection

After each analysis, the scheduler increments a counter. When counter reaches 25:

```javascript
// Threshold reached!
triggerOptimization('desktop-visual-analyzer')
```

### Step 3: Metrics Aggregation

The metrics aggregator pulls last 25 analyses and calculates:

```javascript
{
  aiCalls: {
    avgCost: 0.012,
    avgDuration: 3200,
    avgTokens: 2400,
    errorRate: 0.02
  },
  leads: {
    avgScore: 68,
    avgIssues: 9,
    rejectionRate: 0.15
  },
  composite: {
    score: 0.78,
    components: {
      accuracy: 0.85,
      cost: 0.70,
      speed: 0.65
    }
  }
}
```

### Step 4: AI Optimization

The meta-AI (GPT-5) receives:
- Current prompt
- Performance metrics
- Patterns identified

Returns:
```json
{
  "analysis": {
    "patternsIdentified": [
      "High rejection rate in whitespace category",
      "Score variance of 12.5 indicates inconsistency"
    ],
    "weaknesses": [
      "Overreporting minor whitespace issues",
      "Inconsistent scoring criteria"
    ]
  },
  "recommendations": [
    {
      "changeType": "temperature_adjustment",
      "classification": "safe",
      "currentValue": 0.4,
      "proposedValue": 0.3,
      "reasoning": "Lower temperature will improve consistency",
      "expectedImpact": {
        "accuracy": "+5%",
        "cost": "0%",
        "speed": "0%"
      }
    },
    {
      "changeType": "example_addition",
      "classification": "safe",
      "content": "Example: GOOD whitespace issue: ...",
      "reasoning": "Explicit examples will calibrate standards",
      "expectedImpact": {
        "accuracy": "+10%",
        "cost": "+2%",
        "speed": "0%"
      }
    }
  ],
  "proposedPrompt": { /* full optimized prompt */ },
  "expectedOutcome": {
    "accuracyImprovement": "+15%",
    "costReduction": "-8%",
    "newCompositeScore": 0.85
  }
}
```

### Step 5: Decision

The system checks safety thresholds and change classifications:

**If all changes are SAFE:**
- Auto-apply immediately
- Reset counter
- Done!

**If changes need testing:**
- Create A/B test
- Split next N analyses 50/50
- Wait for results

**If changes are risky:**
- Save to database
- Notify human for review
- Wait for approval

### Step 6: A/B Testing (if needed)

For the next 40 analyses (20 per variant):

1. Random selection: use control or experimental?
2. Run analysis with selected variant
3. Record result (cost, duration, accuracy)
4. Check if test is complete (20 samples each)

When complete:
```
Control:      accuracy 0.85, cost $0.012, duration 3200ms → composite 0.78
Experimental: accuracy 0.92, cost $0.011, duration 3100ms → composite 0.85

Winner: Experimental (+8.9% improvement, p=0.02, significant)
Recommendation: APPLY_EXPERIMENTAL
```

### Step 7: Application

Winner is marked as active:

```sql
UPDATE prompt_variants
SET is_active = true, variant_type = 'optimized', applied_at = NOW()
WHERE id = 'winner-uuid'
```

Future analyses use the optimized prompt automatically.

### Step 8: Continuous Loop

Counter resets to 0. After 25 more analyses, the cycle repeats!

The system continuously improves itself.

## Cost Analysis

**Per optimization run:**
- Meta-AI call: ~$0.02 (GPT-5, ~3000 tokens)
- Happens every 25 analyses
- Cost per analysis: $0.0008

**Per A/B test:**
- 40 analyses at normal cost
- No additional overhead

**Expected savings:**
- 10-15% cost reduction from optimization
- 5-10% speed improvements
- ROI positive after ~100 analyses

## Monitoring

### View Recent Optimizations

```sql
SELECT
  analyzer_name,
  run_number,
  decision,
  created_at,
  cost_of_optimization,
  metrics_before->>'composite'->>'score' as before_score,
  metrics_after->>'composite'->>'score' as after_score
FROM optimization_runs
ORDER BY created_at DESC
LIMIT 10;
```

### Track Improvements Over Time

```sql
SELECT
  analyzer_name,
  AVG((metrics_after->>'composite'->>'score')::float -
      (metrics_before->>'composite'->>'score')::float) as avg_improvement
FROM optimization_runs
WHERE decision = 'auto_applied'
GROUP BY analyzer_name;
```

### View Active Variants

```sql
SELECT
  analyzer_name,
  version_number,
  variant_type,
  sample_size,
  performance_metrics->>'accuracy' as accuracy,
  applied_at
FROM prompt_variants
WHERE is_active = true
ORDER BY analyzer_name;
```

## Troubleshooting

### Optimization not triggering

**Check:**
1. Is optimization enabled? `config.optimization.enabled = true`
2. Enough data points? Need at least 10 ai_calls
3. Counter incremented? Call `incrementAnalysisCount()` after each analysis

### Changes not being auto-applied

**Check:**
1. Auto-approval enabled? `config.autoApproval.enabled = true`
2. Changes classified as safe? Check `optimization_runs.decision`
3. Safety thresholds met? Review `decision_reasoning`

### A/B tests not completing

**Check:**
1. Are analyses still running? Need 20 samples per variant
2. Check active test status: `getOptimizationStatus()`
3. Variants collecting data? Query `prompt_variants.sample_size`

## Advanced Usage

### Custom Weights

Prioritize different metrics:

```json
{
  "metrics": {
    "weights": {
      "accuracy": 0.8,  // Prioritize accuracy
      "cost": 0.1,
      "speed": 0.1
    }
  }
}
```

### Aggressive Optimization

Optimize more frequently:

```json
{
  "optimization": {
    "triggerFrequency": 10,  // Every 10 analyses
    "minimumDataPoints": 5
  }
}
```

### Conservative Mode

Only apply changes after thorough testing:

```json
{
  "autoApproval": {
    "enabled": false  // Require human approval for all changes
  },
  "abTesting": {
    "minimumSampleSize": 50  // Larger sample size
  }
}
```

## Future Enhancements

Potential improvements:

1. **Multi-variate testing** - Test multiple changes simultaneously
2. **Prompt genetics** - Combine successful variants from different analyzers
3. **Context-aware optimization** - Different prompts for different industries
4. **Real-time feedback** - Learn from client responses in real-time
5. **Cross-analyzer learning** - Apply insights from one analyzer to others
6. **Automated rollback** - Detect degradation and revert automatically

## Architecture Decisions

### Why GPT-5 for meta-AI?

GPT-5 has superior reasoning for analyzing patterns and suggesting improvements. The cost ($0.02 per run) is justified by potential savings from optimization.

### Why composite scoring?

Single metric optimization leads to perverse incentives. Composite scoring (accuracy 60%, cost 20%, speed 20%) ensures balanced improvements.

### Why A/B testing?

Prevents "reward hacking" where AI optimizes for metrics but hurts real quality. A/B tests validate improvements on real data.

### Why automatic application?

Manual review of every change doesn't scale. Safe changes (temperature, examples) are low-risk and high-value. Human review for major changes only.

## Contributing

To add a new analyzer to self-tuning:

1. Ensure analyzer logs to `ai_calls` with `module = 'analyzer-name'`
2. Add analyzer to `config.analyzers.enabled`
3. Add prompt file mapping to `prompt-optimizer.js`
4. Add field mapping to `metrics-aggregator.js` (if custom fields)
5. Call `incrementAnalysisCount('analyzer-name')` after analyses

## License

Part of MaxantAgency system. See root LICENSE file.

---

**Questions?** Check the test files in `tests/` for working examples.

**Built by AI, for AI.** 🤖✨
