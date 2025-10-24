# Testing and Debugging Guide

MaxantAgency now includes powerful modular configuration and transparent debugging capabilities to help you test, troubleshoot, and optimize the analysis pipeline.

## Table of Contents

- [Quick Start](#quick-start)
- [Module Toggles](#module-toggles)
- [Transparent Analysis Testing](#transparent-analysis-testing)
- [Debug Logging](#debug-logging)
- [Common Testing Scenarios](#common-testing-scenarios)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install `cross-env` which is needed for cross-platform environment variable support.

### 2. Run Transparent Test on a Website

```bash
# Basic test (uses your .env settings)
npm run test:transparent -- https://example.com

# With full debug logging
npm run test:debug -- https://example.com

# Single-page analysis only (faster, cheaper)
npm run test:single-page -- https://example.com

# Test only SEO analyzer (isolate specific module)
npm run test:seo-only -- https://example.com
```

### 3. View Debug Output

All debug files are saved to `debug-logs/[company-name]/`:
- `00-SUMMARY.md` - Overview of the entire analysis
- `*-prompt.txt` - Exact prompts sent to AI
- `*-response.json` - Raw AI responses
- `*-parsed.json` - Parsed/transformed data

---

## Module Toggles

You can enable/disable individual modules by setting environment variables in your `.env` file or passing them inline.

### Analysis Engine Modules

**In `.env`:**
```env
# Individual Analyzers
ENABLE_SEO_ANALYZER=true
ENABLE_CONTENT_ANALYZER=true
ENABLE_DESKTOP_VISUAL_ANALYZER=true
ENABLE_MOBILE_VISUAL_ANALYZER=true
ENABLE_SOCIAL_ANALYZER=true
ENABLE_ACCESSIBILITY_ANALYZER=true

# Unified Analyzers (RECOMMENDED - cost/speed optimization)
USE_UNIFIED_VISUAL_ANALYZER=true      # Desktop + Mobile in 1 call (saves $0.005 + 10s)
USE_UNIFIED_TECHNICAL_ANALYZER=true   # SEO + Content in 1 call (saves $0.008 + 20s)

# Lead Scoring
ENABLE_LEAD_SCORING=true

# Multi-Page Analysis
ENABLE_MULTI_PAGE_CRAWL=true
MAX_PAGES_PER_MODULE=5
```

**Inline (temporary override):**
```bash
# Disable all except SEO
ENABLE_SEO_ANALYZER=true \
ENABLE_CONTENT_ANALYZER=false \
ENABLE_DESKTOP_VISUAL_ANALYZER=false \
ENABLE_MOBILE_VISUAL_ANALYZER=false \
ENABLE_SOCIAL_ANALYZER=false \
ENABLE_ACCESSIBILITY_ANALYZER=false \
node analysis-engine/server.js
```

### Prospecting Engine Modules

```env
ENABLE_GOOGLE_MAPS_DISCOVERY=true
ENABLE_BUSINESS_INTELLIGENCE_EXTRACTION=true
```

### Outreach Engine Modules

```env
ENABLE_EMAIL_GENERATION=true
ENABLE_SOCIAL_MESSAGE_GENERATION=true
```

---

## Transparent Analysis Testing

The transparent analysis test script provides complete visibility into the analysis pipeline.

### What It Shows

1. **Discovery Phase**
   - Pages discovered from sitemap/robots
   - Discovery method used

2. **Page Selection Phase**
   - AI prompt for page selection
   - AI response (which pages to analyze)
   - Selection strategy chosen

3. **Crawl Phase**
   - Pages crawled successfully
   - Failed pages (if any)
   - Screenshot capture status

4. **Analysis Phase** (for each analyzer):
   - Model used
   - Exact system prompt
   - Exact user prompt
   - Raw AI response (JSON)
   - Parsed data
   - Cost and duration

5. **Grading Phase**
   - Score calculations
   - Letter grade assignment

6. **Final Results**
   - Complete aggregated data

### Running the Test

**Basic Usage:**
```bash
cd analysis-engine
node tests/debug/test-transparent-analysis.js https://example.com
```

**With Options:**
```bash
# Full debug mode (console + files)
DEBUG_AI_CALLS=true \
DEBUG_AI_SAVE_TO_FILE=true \
node tests/debug/test-transparent-analysis.js https://example.com

# Or use the npm script
npm run test:debug -- https://example.com
```

### Output Structure

```
debug-logs/
└── example-com/
    ├── 00-SUMMARY.md              # Executive summary of entire run
    ├── 01-discovery.json          # Discovery results
    ├── 02-page-selection-prompt.txt
    ├── 02-page-selection-response.json
    ├── 02-page-selection.json
    ├── 03-crawl-results.json
    ├── 04-seo-prompt.txt          # SEO analyzer input
    ├── 04-seo-response.json       # SEO analyzer raw output
    ├── 04-seo-parsed.json         # SEO analyzer parsed data
    ├── 05-content-prompt.txt
    ├── 05-content-response.json
    ├── 05-content-parsed.json
    ├── 06-desktop-visual-prompt.txt
    ├── 06-desktop-visual-response.json
    ├── 06-desktop-visual-parsed.json
    ├── 07-mobile-visual-prompt.txt
    ├── 07-mobile-visual-response.json
    ├── 07-mobile-visual-parsed.json
    ├── 08-social-prompt.txt
    ├── 08-social-response.json
    ├── 08-social-parsed.json
    ├── 09-accessibility-prompt.txt
    ├── 09-accessibility-response.json
    ├── 09-accessibility-parsed.json
    ├── 10-grading.json
    └── 11-final-result.json
```

---

## Debug Logging

### Console Debug Mode

Shows AI calls in real-time in the console.

**Enable:**
```env
DEBUG_AI_CALLS=true
```

**Output:**
```
================================================================================
🤖 AI CALL #1 - gpt-5
================================================================================
Temperature: 0.3 | JSON Mode: true | Has Image: false

📝 SYSTEM PROMPT:
--------------------------------------------------------------------------------
You are an SEO expert analyzing a website...

📝 USER PROMPT:
--------------------------------------------------------------------------------
Analyze the following website for SEO issues...
================================================================================

================================================================================
✅ AI RESPONSE #1
================================================================================
Tokens: 1234 input + 567 output = 1801 total
Cost: $0.0123

📄 RESPONSE CONTENT:
--------------------------------------------------------------------------------
{
  "seoScore": 72,
  "issues": [
    "Missing meta description on homepage",
    ...
  ]
}
================================================================================
```

### File Debug Mode

Saves all AI interactions to JSON files.

**Enable:**
```env
DEBUG_AI_SAVE_TO_FILE=true
DEBUG_OUTPUT_DIR=./debug-logs
```

**Output:**
```
debug-logs/
└── ai-calls/
    ├── ai-call-1-2025-10-24T10-30-00.json
    ├── ai-call-2-2025-10-24T10-30-15.json
    └── ai-call-3-2025-10-24T10-30-30.json
```

**Each file contains:**
```json
{
  "callNumber": 1,
  "timestamp": "2025-10-24T10:30:00.000Z",
  "request": {
    "model": "gpt-5",
    "systemPrompt": "You are an SEO expert...",
    "userPrompt": "Analyze the following...",
    "temperature": 0.3,
    "hasImage": false,
    "jsonMode": true,
    "maxTokens": 16384
  },
  "response": {
    "content": "{\"seoScore\": 72, ...}",
    "usage": {
      "prompt_tokens": 1234,
      "completion_tokens": 567,
      "total_tokens": 1801
    },
    "cost": 0.0123,
    "provider": "openai"
  },
  "metadata": {
    "durationMs": 3456,
    "cached": false
  }
}
```

---

## Common Testing Scenarios

### 1. Test a Single Analyzer

**Problem:** Want to isolate and test just the SEO analyzer.

**Solution:**
```bash
# In .env, set:
ENABLE_SEO_ANALYZER=true
ENABLE_CONTENT_ANALYZER=false
ENABLE_DESKTOP_VISUAL_ANALYZER=false
ENABLE_MOBILE_VISUAL_ANALYZER=false
ENABLE_SOCIAL_ANALYZER=false
ENABLE_ACCESSIBILITY_ANALYZER=false

# Or use inline:
npm run test:seo-only -- https://example.com
```

**Cost Savings:** ~$0.03 per run (SEO only) vs ~$0.08 (all analyzers)

### 2. Debug Failing Prompts

**Problem:** An analyzer is returning unexpected results.

**Solution:**
```bash
# Enable debug logging
DEBUG_AI_CALLS=true \
DEBUG_AI_SAVE_TO_FILE=true \
npm run test:transparent -- https://example.com

# Check the debug files:
# 1. Open *-prompt.txt to see what was sent
# 2. Open *-response.json to see raw AI output
# 3. Open *-parsed.json to see how it was parsed
```

### 3. Fast Iteration During Development

**Problem:** Testing prompt changes is slow because of multi-page crawling.

**Solution:**
```bash
# Single-page mode (much faster)
ENABLE_MULTI_PAGE_CRAWL=false \
npm run test:transparent -- https://example.com
```

**Speed Improvement:** ~30s per run vs ~2-3 minutes for multi-page

### 4. Test on a Budget

**Problem:** Running out of AI API credits during testing.

**Solution:**
```bash
# Disable expensive visual analyzers
ENABLE_DESKTOP_VISUAL_ANALYZER=false \
ENABLE_MOBILE_VISUAL_ANALYZER=false \
npm run test:transparent -- https://example.com
```

**Cost Savings:** Visual analyzers cost ~$0.03 total, disable them to save

### 5. Verify Prompt Changes

**Problem:** Modified a prompt in `config/prompts/` and want to verify it works.

**Solution:**
```bash
# Run with debug mode
DEBUG_AI_CALLS=true npm run test:transparent -- https://example.com

# The console will show:
# 1. The exact prompt being sent (with your changes)
# 2. The AI response
# 3. Whether parsing succeeded
```

### 6. Compare Unified vs Legacy Analyzers

**Problem:** Want to verify unified analyzers produce similar results to legacy separate analyzers.

**Solution:**
```bash
# Run with unified analyzers (default)
USE_UNIFIED_VISUAL_ANALYZER=true \
USE_UNIFIED_TECHNICAL_ANALYZER=true \
npm run test:transparent -- https://example.com

# Save results, then run with legacy analyzers
USE_UNIFIED_VISUAL_ANALYZER=false \
USE_UNIFIED_TECHNICAL_ANALYZER=false \
npm run test:transparent -- https://example.com

# Compare debug-logs/example-com/ files:
# - Scores should be within 5-10 points
# - Issues should be similar (count and severity)
# - Unified should be cheaper + faster
# - Unified includes crossCuttingIssues and responsiveIssues
```

**Expected Differences:**
- **Cost**: Unified ~10% cheaper ($0.118 vs $0.131)
- **Time**: Unified ~12% faster (3:30 vs 4:00)
- **API Calls**: Unified makes 4 calls, legacy makes 6
- **New Insights**: Unified detects cross-cutting and responsive issues

---

## Troubleshooting

### AI Response Parsing Errors

**Symptom:**
```
Error: Invalid JSON response
```

**Diagnosis:**
1. Check `*-response.json` to see raw AI output
2. Check `*-prompt.txt` to verify prompt has correct JSON schema

**Fix:**
- Ensure prompt includes explicit JSON schema in system prompt
- Add `jsonMode: true` in analyzer if using GPT-4o/Claude

### Module Not Disabling

**Symptom:**
Analyzer still runs even though `ENABLE_*_ANALYZER=false`

**Diagnosis:**
1. Check `.env` file has correct syntax (no quotes, no spaces)
2. Verify environment variable is loaded

**Fix:**
```env
# Correct:
ENABLE_SEO_ANALYZER=false

# Incorrect:
ENABLE_SEO_ANALYZER="false"  # Don't use quotes
ENABLE_SEO_ANALYZER = false  # No spaces around =
```

### Debug Files Not Saving

**Symptom:**
`DEBUG_AI_SAVE_TO_FILE=true` but no files in `debug-logs/`

**Diagnosis:**
1. Check `DEBUG_OUTPUT_DIR` path exists and is writable
2. Check for file permission errors in console

**Fix:**
```bash
# Create directory manually
mkdir -p debug-logs/ai-calls

# Check permissions
ls -la debug-logs/
```

### Multi-Page Crawl Takes Too Long

**Symptom:**
Analysis takes 5+ minutes per website

**Diagnosis:**
Crawling too many pages

**Fix:**
```env
# Reduce pages per module
MAX_PAGES_PER_MODULE=3  # Default is 5

# Or disable multi-page entirely for testing
ENABLE_MULTI_PAGE_CRAWL=false
```

---

## Best Practices

### 1. Development Workflow

```bash
# 1. Work on a specific analyzer
ENABLE_ONLY_THAT_ANALYZER=true npm run test:transparent

# 2. Test with debug logging
DEBUG_AI_CALLS=true npm run test:transparent

# 3. Verify on multiple sites
npm run test:transparent -- https://site1.com
npm run test:transparent -- https://site2.com
npm run test:transparent -- https://site3.com

# 4. Run full pipeline when ready
# (all modules enabled, no debug)
npm run test:transparent -- https://production-site.com
```

### 2. Cost Optimization

**Production (all features):**
```env
# All analyzers enabled
ENABLE_SEO_ANALYZER=true
ENABLE_CONTENT_ANALYZER=true
ENABLE_DESKTOP_VISUAL_ANALYZER=true
ENABLE_MOBILE_VISUAL_ANALYZER=true
ENABLE_SOCIAL_ANALYZER=true
ENABLE_ACCESSIBILITY_ANALYZER=true

# Multi-page for comprehensive analysis
ENABLE_MULTI_PAGE_CRAWL=true
MAX_PAGES_PER_MODULE=5
```

**Development (fast & cheap):**
```env
# Only essential analyzers
ENABLE_SEO_ANALYZER=true
ENABLE_CONTENT_ANALYZER=true
ENABLE_DESKTOP_VISUAL_ANALYZER=false  # Skip expensive visual
ENABLE_MOBILE_VISUAL_ANALYZER=false
ENABLE_SOCIAL_ANALYZER=false
ENABLE_ACCESSIBILITY_ANALYZER=false

# Single-page for speed
ENABLE_MULTI_PAGE_CRAWL=false
```

### 3. Debugging Strategy

1. **Start with Console Debug**
   ```env
   DEBUG_AI_CALLS=true
   DEBUG_AI_SAVE_TO_FILE=false
   ```

2. **If Issue Persists, Enable File Debug**
   ```env
   DEBUG_AI_CALLS=true
   DEBUG_AI_SAVE_TO_FILE=true
   ```

3. **Use Transparent Test Script**
   ```bash
   npm run test:debug -- https://problematic-site.com
   ```

4. **Review Debug Files**
   - Check prompts for correctness
   - Verify AI responses are valid JSON
   - Confirm parsing logic handles edge cases

---

## Support

If you encounter issues not covered here:

1. Check the debug logs in `debug-logs/`
2. Review AI call logs in `debug-logs/ai-calls/`
3. Verify `.env` configuration is correct
4. Test with a known-good website (e.g., https://stripe.com)
5. Check for API rate limits or quota issues

For bugs or feature requests, please refer to the project README.
