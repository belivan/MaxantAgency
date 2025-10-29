# Critical Fixes Needed for Modular Report Generator

## Issues Identified:

### 1. **Missing CSS Classes** ❌ CRITICAL
**Problem**: `base-styles.js` only has utility CSS, missing component-specific classes like:
- `.hero-section`, `.company-name`, `.score-card`
- `.section`, `.card`
- Component styling for all sections

**Fix**: Add complete CSS from old template (lines 217-1574) to `base-styles.js`

### 2. **Duplicate PageSpeed Sections** ❌
**Problem**: PageSpeed appears twice (in technical-deep-dive.js AND performance-metrics.js)
**Fix**: Remove PageSpeed from `technical-deep-dive.js`, keep only in `performance-metrics.js`

### 3. **Benchmark Comparison Missing** ❌
**Problem**: screenshot-comparison.js exists but gallery might be overriding it
**Fix**: Ensure both run - comparison for homepage, gallery for multi-page

### 4. **Timeline "3069 days" Bug** ❌
**Problem**: Date calculation error in timeline.js
**Fix**: Check date math in timeline calculation

### 5. **Business Intelligence Missing Data Labels** ❌
**Problem**: Empty fields show nothing instead of "Not found"
**Fix**: Add fallback text "Not available" for null/empty values

### 6. **Strength Categories Missing** ⚠️
**Problem**: Benchmark data incomplete
**Fix**: Better fallback messaging explaining why categories are missing

## Quick Fix Priority:
1. Add complete CSS (15 min) - BLOCKS EVERYTHING
2. Remove duplicate PageSpeed (2 min)
3. Fix business intelligence labels (5 min)
4. Fix timeline bug (5 min)
5. Fix benchmark comparison (5 min)

**Total Time**: ~30 minutes
