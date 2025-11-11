# Unified Visual Analysis Prompts

## Overview

This directory contains TWO separate prompts for the unified visual analyzer:

### 1. `base.json` (Standard Mode)
- **Used when:** Context sharing is DISABLED
- **Purpose:** Standard single-page or non-context analysis
- **Characteristics:**
  - Clean prompt without context-specific instructions
  - Reports all issues found on the page
  - Temperature: 0.4 (balanced creativity)
  - Expected: 3-5 issues per category

### 2. `context-aware.json` (Context Mode)
- **Used when:** Context sharing is ENABLED
- **Purpose:** Multi-page analysis with AGGRESSIVE duplicate avoidance
- **Characteristics:**
  - Emphasizes SKIPPING site-wide issues already reported
  - Temperature: 0.3 (more conservative)
  - Expected: 0-3 issues per category (most duplicates skipped)
  - **Key instruction:** "When in doubt, SKIP IT"

## How It Works

The analyzer automatically selects the appropriate prompt based on the `enableCrossPageContext` setting:

```javascript
const promptName = useCrossPageContext
  ? 'unified-visual-analyzer-context-aware'  // Aggressive duplicate avoidance
  : 'unified-visual-analyzer';                // Standard prompt
```

## Key Differences

| Aspect | Standard (`base.json`) | Context-Aware (`context-aware.json`) |
|--------|------------------------|-------------------------------------|
| **Duplicate Handling** | N/A - analyzes independently | Aggressively skips site-wide patterns |
| **Issue Target** | 3-5 per category | 0-3 per category (most are duplicates) |
| **Temperature** | 0.4 | 0.3 (more focused) |
| **Default Behavior** | Report all issues | Skip when in doubt |
| **Focus** | Comprehensive analysis | Page-specific uniqueness |

## Context-Aware Strategy

The context-aware prompt uses **aggressive duplicate avoidance**:

### Site-Wide Patterns (ALWAYS SKIP if already reported):
- Navigation/header layout issues
- Footer problems
- CTA button styling
- Color contrast issues
- Font/typography problems
- Brand consistency

### Only Report If:
1. **Truly page-specific** - Element doesn't exist elsewhere (e.g., pricing calculator only on /pricing)
2. **Completely different layout** - Page uses unique template
3. **Unique functionality** - Feature not present on other pages (e.g., booking form only on /contact)

### Examples of What NOT to Report:

❌ **BAD (Duplicate):**
- Context: "Homepage CTA is small"
- This page: "Services page CTA also small" ← SKIP (same issue)

❌ **BAD (Duplicate):**
- Context: "Navigation cluttered on desktop"
- This page: "Navigation also cluttered on About page" ← SKIP (same nav)

✅ **GOOD (Unique):**
- "Pricing calculator labels overlap on mobile" ← ONLY if calculator doesn't exist elsewhere
- "Gallery images don't load" ← ONLY if this page has unique gallery

## Testing

To test the impact of improved prompts:

```bash
cd analysis-engine
node tests/test-context-ab-comparison.js
```

Expected improvements with context-aware prompt:
- 40-60% reduction in cross-page duplicate issues
- Similar or better scores
- Slightly slower due to context processing, but better quality

## Troubleshooting

If context sharing still shows minimal duplicate reduction:
1. Check that `enableCrossPageContext: true` in test config
2. Verify logs show "Cross-page context enabled"
3. Check logs for "Added context from N previous pages"
4. Review actual issues to confirm they're truly unique vs duplicates

## Maintenance

When updating prompts:
- Update BOTH files with any common changes (artifact detection, scoring, etc.)
- Keep context-specific instructions ONLY in `context-aware.json`
- Test both modes after changes
