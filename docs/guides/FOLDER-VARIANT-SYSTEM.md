# Folder-Based Prompt Variant System

## Overview

The optimization system now uses a **hybrid database + filesystem** approach for managing prompt variants:

- **Database**: Tracks all variants, performance metrics, and active status
- **Filesystem**: Stores variant files for version control and easy browsing

## Folder Structure

```
analysis-engine/
├── config/
│   └── prompts/
│       └── web-design/
│           ├── desktop-visual-analysis/
│           │   ├── base.json                    # Original prompt
│           │   ├── v2-optimized.json           # Approved optimization
│           │   ├── v3-experimental.json        # A/B test variant
│           │   └── v4-optimized.json           # Another optimization
│           ├── seo-analysis/
│           │   ├── base.json
│           │   └── v2-optimized.json
│           └── ... (other analyzers)
└── optimization/
    ├── migrate-prompts-to-folders.js    # One-time migration script
    └── review-optimizations.js          # Approval workflow (saves files)
```

## How It Works

### 1. Optimization Creates Variant (Database Only)

When the system runs an optimization:

```javascript
// optimization/services/prompt-optimizer.js
const newVariant = await savePromptVariant(analyzerName, ...);
// Saves to database with file_path = null
```

**Why database-only?** We don't create files for variants that might get rejected.

### 2. Human Reviews and Approves

```bash
cd analysis-engine/optimization
node review-optimizations.js
```

The review tool shows:
- Current performance metrics
- AI analysis and recommendations
- Expected improvements

### 3. Approval Saves to Filesystem

When you approve an optimization:

```javascript
// review-optimizations.js
async function approveOptimization(runId) {
  // 1. Apply variant (sets is_active=true)
  await applyWinningVariant(variantId);

  // 2. Save to filesystem
  const filePath = await saveVariantToFile(variant);
  // Creates: config/prompts/web-design/desktop-visual-analysis/v2-optimized.json

  // 3. Update database with file path
  await supabase
    .from('prompt_variants')
    .update({ file_path: filePath })
    .eq('id', variantId);
}
```

### 4. Analyzers Load from Database First

```javascript
// shared/prompt-loader.js
export async function loadPrompt(analyzerName) {
  // 1. Check database for active variant
  const activeVariant = await getActiveVariant(analyzerName);

  // 2. Load from variant file if exists
  if (activeVariant?.file_path) {
    return loadFromFile(activeVariant.file_path);
  }

  // 3. Fall back to base.json
  return loadBasePrompt(analyzerName);
}
```

## Which Analyzers Are Optimized?

The optimization system supports **8 analyzers**, but not all are actively used in production:

### Primary Analyzers (Active in Production)

These are the analyzers actually being optimized and improved:

- **`unified-visual-analyzer`** - Combines desktop + mobile visual analysis in ONE AI call
  - Prompt: `config/prompts/web-design/unified-visual-analysis/`
  - Replaces: desktop-visual + mobile-visual analyzers
  - Cost savings: 50% fewer AI calls

- **`unified-technical-analyzer`** - Combines SEO + content analysis in ONE AI call
  - Prompt: `config/prompts/web-design/unified-technical-analysis/`
  - Replaces: seo + content analyzers
  - Cost savings: 50% fewer AI calls

- **`social-analyzer`** - Social media presence analysis
  - Prompt: `config/prompts/web-design/social-analysis/`
  - Always runs separately

- **`accessibility-analyzer`** - WCAG compliance and accessibility
  - Prompt: `config/prompts/web-design/accessibility-analysis/`
  - Always runs separately

### Legacy Analyzers (Fallback Only)

These analyzers are **still supported** but only used when unified analyzers are disabled:

- `desktop-visual-analyzer` - Desktop screenshot analysis (legacy)
- `mobile-visual-analyzer` - Mobile screenshot analysis (legacy)
- `seo-analyzer` - SEO analysis (legacy)
- `content-analyzer` - Content analysis (legacy)

**Why keep legacy analyzers?**
- Backward compatibility
- Flexibility for different optimization strategies
- A/B testing unified vs separate approaches

### Environment Configuration

Control which analyzers run via `.env`:

```env
# Use unified analyzers (recommended for production)
USE_UNIFIED_VISUAL_ANALYZER=true
USE_UNIFIED_TECHNICAL_ANALYZER=true

# Legacy fallbacks (only used if unified is disabled)
ENABLE_DESKTOP_VISUAL_ANALYZER=true
ENABLE_MOBILE_VISUAL_ANALYZER=true
ENABLE_SEO_ANALYZER=true
ENABLE_CONTENT_ANALYZER=true

# Always-active analyzers
ENABLE_SOCIAL_ANALYZER=true
ENABLE_ACCESSIBILITY_ANALYZER=true
```

## Preventing Template Literal Corruption

### The Problem

Template literals can get corrupted during copy/paste operations:
- `` ` `` becomes `\`` (escaped backtick)
- `${variable}` becomes `\${variable}` (escaped dollar sign)

This breaks the JavaScript syntax and prevents the engine from starting.

### The Solution: Syntax Validation

Use the syntax validator before committing changes:

```bash
cd analysis-engine/optimization

# Validate a single file
node validate-syntax.js ../shared/prompt-loader.js

# Validate multiple files
node validate-syntax.js services/*.js

# Validate all optimization files
node validate-syntax.js *.js services/*.js
```

The validator checks for:
- ✅ Valid JavaScript syntax (`node --check`)
- ✅ Escaped backticks (`\``)
- ✅ Escaped template literal syntax (`\${`)

**Prevention Best Practices:**
1. Always run syntax validation after editing files
2. Use a proper code editor (VS Code, WebStorm) with syntax highlighting
3. Avoid copy/pasting from rich text editors (Word, Google Docs)
4. Test imports: `node -e "import('./file.js').then(() => console.log('OK'))"`

## Migration Guide

### First Time Setup

1. **Migrate existing prompts to folders:**

```bash
cd analysis-engine/optimization
node migrate-prompts-to-folders.js
```

This converts:
```
config/prompts/web-design/desktop-visual-analysis.json
→ config/prompts/web-design/desktop-visual-analysis/base.json
```

2. **Update database schema:**

```bash
cd database-tools
npm run db:validate
npm run db:setup
```

This adds the `file_path` column to `prompt_variants`.

3. **Update analyzers to use new loader:**

```javascript
// Before (OLD)
import { loadPrompt } from '../shared/prompt-loader.js';
const prompt = loadPrompt('web-design', 'desktop-visual-analysis', { company_name: 'Example' });

// After (NEW)
import { loadPrompt } from '../shared/prompt-loader.js';
const prompt = await loadPrompt('desktop-visual-analyzer');
```

## File Naming Convention

- **Base prompt**: `base.json`
- **Optimized variants**: `v{N}-optimized.json` (e.g., `v2-optimized.json`)
- **Experimental variants**: `v{N}-experimental.json`
- **Control variants**: `v{N}-control.json`
- **Archived variants**: `v{N}-archived.json`

Where `{N}` is the version number from the database.

## Database Schema

### prompt_variants Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `analyzer_name` | text | Which analyzer (desktop-visual-analyzer, etc.) |
| `prompt_category` | text | Prompt category (web-design, benchmarking, etc.) |
| `prompt_file` | text | Original filename (desktop-visual-analysis.json) |
| **`file_path`** | text | **Relative path to variant file** |
| `version_number` | integer | Sequential version (1, 2, 3...) |
| `variant_type` | text | optimized, experimental, control, archived |
| `is_active` | boolean | Is this the currently active version? |
| `prompt_content` | jsonb | Full prompt JSON |
| `performance_metrics` | jsonb | Aggregated metrics |
| `parent_variant_id` | uuid | ID of parent variant |

## Benefits of This Approach

### Database-First Loading
✅ Always loads the correct active variant
✅ Instant rollback (just change `is_active` flag)
✅ A/B testing support
✅ Performance metrics tracking

### File-Based Storage
✅ Version control with Git
✅ Easy to browse and compare variants
✅ Human-readable JSON files
✅ Backup and restore
✅ No vendor lock-in

### Hybrid Advantages
✅ Best of both worlds
✅ Database tracks what's active
✅ Files store the actual content
✅ Easy debugging (inspect files directly)
✅ Git history shows prompt evolution

## Workflow Examples

### Example 1: Approve Optimization

```bash
# Review pending optimizations
cd analysis-engine/optimization
node review-optimizations.js

# System shows:
[1] desktop-visual-analyzer - Run #2 (2025-11-05)
# ... detailed analysis ...

# Your choice: a
# Are you sure? yes

# ✅ Approved!
# 📁 Saved variant to: web-design/desktop-visual-analysis/v2-optimized.json
# ✅ Variant is now active
```

### Example 2: Rollback to Previous Version

```sql
-- Deactivate current variant
UPDATE prompt_variants
SET is_active = false
WHERE analyzer_name = 'desktop-visual-analyzer' AND is_active = true;

-- Activate previous version
UPDATE prompt_variants
SET is_active = true
WHERE analyzer_name = 'desktop-visual-analyzer' AND version_number = 1;
```

Next analysis will automatically use the v1 variant.

### Example 3: Compare Variants

```bash
# View all variants for an analyzer
ls config/prompts/web-design/desktop-visual-analysis/
# base.json
# v2-optimized.json
# v3-experimental.json

# Compare changes
diff config/prompts/web-design/desktop-visual-analysis/base.json \
     config/prompts/web-design/desktop-visual-analysis/v2-optimized.json
```

## Troubleshooting

### Issue: Analyzer not loading new variant

**Check 1: Is variant active in database?**
```sql
SELECT version_number, variant_type, is_active, file_path
FROM prompt_variants
WHERE analyzer_name = 'desktop-visual-analyzer'
ORDER BY version_number DESC;
```

**Check 2: Does file exist?**
```bash
ls config/prompts/web-design/desktop-visual-analysis/v2-optimized.json
```

**Check 3: Is analyzer using new loader?**
```javascript
// Should be:
import { loadPrompt } from '../shared/prompt-loader.js';
const prompt = await loadPrompt('desktop-visual-analyzer');
```

### Issue: Variant files not being created

**Check**: Did you approve the optimization?

Variants are only saved to filesystem when **approved** via `review-optimizations.js`.

Pending/rejected optimizations remain database-only.

## API Reference

### Prompt Loader

```javascript
import { loadPrompt } from '../shared/prompt-loader.js';

// Load active variant for analyzer
const prompt = await loadPrompt('desktop-visual-analyzer');

// Returns:
{
  model: 'gpt-5',
  temperature: 0.7,
  systemPrompt: '...',
  userPrompt: '...',
  schema: { ... }
}
```

### Save Variant to File

```javascript
// In review-optimizations.js
const filePath = await saveVariantToFile(variant);

// Creates:
// config/prompts/{category}/{analyzer}/v{N}-{type}.json

// Returns:
// "{category}/{analyzer}/v{N}-{type}.json"
```

## Next Steps

1. ✅ Migrate existing prompts to folders
2. ✅ Update database schema
3. ⏳ Update analyzers to use new `loadPrompt()`
4. ⏳ Test approval workflow end-to-end
5. ⏳ Run first optimization and approve it
6. ⏳ Verify new variant file is created
7. ⏳ Confirm next analysis uses new variant

---

**Last Updated**: 2025-11-05
**Version**: 2.0 (Folder-based variant system)
