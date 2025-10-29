# QA / Report Reviewer Agent

Automated validation agent that ensures report quality and evidence integrity.

## 🎯 Purpose

The QA Validator automatically reviews synthesis outputs to catch quality issues before reports are delivered to clients.

## ✅ What It Validates

### 1. **Executive Summary Quality**
- ✓ Has overview section
- ✓ Contains key findings (with evidence)
- ✓ Lists priority actions (with rationale)
- ✓ Includes next steps
- ✓ Screenshot references are valid (SS-1, SS-2, etc.)
- ✓ Evidence count is sufficient

### 2. **Issue Evidence Quality**
- ✓ Title present
- ✓ Description present
- ✓ Source modules identified
- ✓ Evidence provided
- ✓ Screenshot references included
- ✓ Affected pages listed

### 3. **Screenshot References**
- ✓ All SS-X references exist in screenshot reference list
- ✓ No broken or missing references
- ✓ Evidence properly linked

### 4. **Synthesis Pipeline**
- ✓ No AI errors during synthesis
- ✓ All stages completed successfully
- ✓ Fallbacks triggered when needed

## 📊 Quality Scoring

Reports are scored 0-100 based on:

| Criteria | Points Deducted |
|----------|----------------|
| Missing executive summary | -30 |
| Invalid executive summary | -25 |
| Poor executive summary | -15 |
| Good executive summary | -5 |
| Each poor issue | -5 |
| Each acceptable issue | -2 |
| Each screenshot error | -3 |
| Each synthesis error | -10 |

**Quality Tiers:**
- **90-100**: EXCELLENT ✅
- **70-89**: PASS ✓
- **50-69**: WARN ⚠️
- **0-49**: FAIL ❌

## 🔧 Integration

The QA validator runs automatically after synthesis in the results aggregator:

```javascript
// Automatically runs during analysis
const qaValidation = validateReportQuality(synthesisResults);
console.log(generateQAReport(qaValidation));
```

Results are included in the final analysis output:
```javascript
{
  qa_validation: {
    status: 'EXCELLENT',
    qualityScore: 95,
    summary: { ... },
    recommendations: [ ... ]
  }
}
```

## 📋 Manual QA Validation

Use the CLI tool to validate existing reports:

```bash
# Validate latest analysis
node reports/synthesis/qa-cli.js --latest

# Validate specific URL
node reports/synthesis/qa-cli.js --url https://example.com

# Validate by company name
node reports/synthesis/qa-cli.js --company "Acme Corp"
```

**Exit Codes:**
- `0` - PASS or EXCELLENT
- `1` - FAIL (critical errors)
- `2` - WARN (quality issues)

## 📈 Output Example

```
═══════════════════════════════════════════════════════════
           QA / REPORT REVIEWER VALIDATION REPORT          
═══════════════════════════════════════════════════════════

Status: ✅ EXCELLENT
Quality Score: 95/100
Timestamp: 2024-12-25T10:30:00.000Z
Execution Time: 45ms

─────────────────────────────────────────────────────────
SUMMARY
─────────────────────────────────────────────────────────
Total Issues: 12
  ✓ Excellent: 10
  ✓ Good: 2
  ~ Acceptable: 0
  ✗ Poor: 0

Screenshot References Available: 8
Screenshot Reference Errors: 0
Synthesis Pipeline Errors: 0

─────────────────────────────────────────────────────────
EXECUTIVE SUMMARY VALIDATION
─────────────────────────────────────────────────────────
Quality: EXCELLENT
Valid: YES
Evidence Count: 6 screenshot reference(s)

─────────────────────────────────────────────────────────
RECOMMENDATIONS
─────────────────────────────────────────────────────────
1. Report quality is excellent - ready to deliver

═══════════════════════════════════════════════════════════
```

## 🔍 Functions

### `validateReportQuality(synthesisResults)`

Main validation function. Returns comprehensive validation report.

**Parameters:**
- `synthesisResults` - Output from `runReportSynthesis()`

**Returns:**
```javascript
{
  status: 'EXCELLENT' | 'PASS' | 'WARN' | 'FAIL',
  qualityScore: 0-100,
  summary: { ... },
  issueEvidence: [ ... ],
  executiveSummary: { ... },
  recommendations: [ ... ]
}
```

### `generateQAReport(validationResults)`

Generates human-readable report text.

**Parameters:**
- `validationResults` - Output from `validateReportQuality()`

**Returns:** String (formatted report)

### `validateScreenshotReferences(text, screenshotReferences)`

Validates screenshot references in text against available references.

**Returns:**
```javascript
{
  total: 6,
  valid: 6,
  missing: [],
  validRefs: ['SS-1', 'SS-2', ...],
  isValid: true
}
```

## 🚨 Common Issues & Fixes

### Issue: "Executive summary contains no screenshot references"
**Fix:** Update `executive-insights-generator.json` prompt to emphasize evidence usage.

### Issue: "Invalid screenshot references: SS-12, SS-15"
**Fix:** AI generated references that don't exist. Check `buildScreenshotReferences()` in `report-synthesis.js`.

### Issue: "Synthesis pipeline error: issue-deduplication failed"
**Fix:** Check AI API status, token limits, or prompt format in `issue-deduplication.json`.

### Issue: "Poor issue quality - missing evidence"
**Fix:** Update analyzer prompts to include more evidence/screenshots in issues.

## 📂 Files

```
reports/synthesis/
├── qa-validator.js       # Main QA validation logic
├── qa-cli.js            # CLI tool for manual validation
└── README-QA.md         # This file
```

## 🔗 Related

- [Report Synthesis Pipeline](./report-synthesis.js)
- [Executive Summary Template](../templates/sections/executive-summary.js)
- [Results Aggregator](../../services/results-aggregator.js)
