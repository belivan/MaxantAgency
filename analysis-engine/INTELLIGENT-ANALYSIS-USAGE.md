# Intelligent Multi-Page Analysis - Usage Guide

## Overview

The **Intelligent Multi-Page Analysis System** is an AI-powered website analysis pipeline that:
1. **Discovers** all pages on a website (via sitemap.xml, robots.txt, navigation)
2. **Selects** optimal pages using Grok-4-fast AI (~$0.001 cost)
3. **Crawls** only selected pages with desktop + mobile screenshots
4. **Analyzes** multiple pages per module (SEO, content, visual, social)
5. **Aggregates** results and detects site-wide issues

## Quick Start

```javascript
import { analyzeWebsiteIntelligent } from './analysis-engine/orchestrator.js';

const result = await analyzeWebsiteIntelligent(
  'https://example.com',
  {
    company_name: 'Example Co',
    industry: 'restaurant',
    prospect_id: 'prospect-123',
    project_id: 'project-456'
  },
  {
    maxPagesPerModule: 5, // Default: 5
    onProgress: (progress) => {
      console.log(`[${progress.step}] ${progress.message}`);
    }
  }
);

console.log(`Grade: ${result.grade}`);
console.log(`Pages Discovered: ${result.intelligent_analysis.pages_discovered}`);
console.log(`Pages Analyzed: ${result.intelligent_analysis.pages_crawled}`);
```

## How It Works

### Phase 1: Discovery (Fast)
Discovers all pages without visiting them:
- Fetches `sitemap.xml`
- Parses `robots.txt` sitemaps
- Quick homepage navigation scan

**Output**: List of all pages with URLs and estimated types

### Phase 2: AI Page Selection (~$0.001)
Grok-4-fast AI selects optimal pages for each module:
- **SEO**: Diverse page types (homepage, product, blog, contact)
- **Content**: Copy-heavy pages (about, services, homepage)
- **Visual**: Conversion pages (homepage, pricing, product)
- **Social**: Social proof pages (about, testimonials, homepage)

Industry-aware selection (e.g., restaurants → menu, SaaS → pricing)

**Output**: 8-12 unique pages to crawl (union of all selections)

### Phase 3: Targeted Crawling
Only crawls AI-selected pages:
- Desktop screenshot (1920x1080)
- Mobile screenshot (375x812)
- Full HTML content
- Page metadata

**Screenshots are analyzed then immediately discarded** (not stored)

### Phase 4: Multi-Page Analysis
Runs all 5 analyzers on appropriate pages:

#### SEO Analyzer
- Analyzes 4-5 diverse pages
- Detects site-wide issues:
  - Duplicate page titles
  - Missing meta descriptions
  - No schema markup
  - Missing Open Graph tags
  - Multiple H1 tags

#### Content Analyzer
- Analyzes 4-5 copy-heavy pages
- Detects patterns:
  - Weak value propositions
  - Thin content (<200 words)
  - Missing CTAs
  - No testimonials
  - No About/Services sections

#### Desktop Visual Analyzer
- Analyzes 3 desktop screenshots
- Detects issues:
  - Design consistency variance
  - Site-wide design problems
  - Per-page visual issues

#### Mobile Visual Analyzer
- Analyzes 3 mobile screenshots
- Detects issues:
  - Mobile UX consistency
  - Site-wide mobile problems
  - Per-page mobile issues

#### Social Analyzer
- Analyzes 3-4 pages for social integration
- Detects:
  - Missing social links
  - Inconsistent social presence
  - Integration issues

### Phase 5: Aggregation
- Calculates overall grade (A-F)
- Combines all issues
- Generates critique
- Returns comprehensive results

## Result Structure

```javascript
{
  success: true,
  analysis_mode: 'intelligent-multi-page',

  // Grading
  grade: 'B',
  overall_score: 78,
  design_score: 75,
  design_score_desktop: 80,
  design_score_mobile: 70,
  seo_score: 82,
  content_score: 76,
  social_score: 60,

  // Issues (multi-page)
  seo_issues: [...],
  content_issues: [...],
  design_issues_desktop: [...],
  design_issues_mobile: [...],
  social_issues: [...],

  // Quick wins
  quick_wins: ['Add alt text to images', ...],
  top_issue: { title: '...', description: '...' },

  // Critique
  one_liner: 'Your website scores B but could rank higher with better mobile UX',
  analysis_summary: '...',

  // Intelligent analysis metadata
  intelligent_analysis: {
    pages_discovered: 45,
    pages_crawled: 10,
    pages_analyzed_seo: 5,
    pages_analyzed_content: 5,
    pages_analyzed_visual: 3,
    pages_analyzed_social: 4,
    ai_page_selection: {
      reasoning: {
        seo: 'Selected diverse page types...',
        content: 'Chose copy-heavy pages...',
        // ...
      }
    },
    discovery_sources: {
      sitemap: 40,
      robots: 0,
      navigation: 5
    }
  },

  // Performance
  analysis_cost: 0.058, // USD
  analysis_time: 12500 // milliseconds
}
```

## Benefits Over Legacy Analysis

| Feature | Legacy `analyzeWebsite()` | New `analyzeWebsiteIntelligent()` |
|---------|---------------------------|-----------------------------------|
| Pages analyzed | 1 (homepage only) | 8-12 (AI-selected) |
| Site-wide issues | ❌ No | ✅ Yes |
| Consistency detection | ❌ No | ✅ Yes |
| Industry-aware | ❌ No | ✅ Yes |
| AI page selection | ❌ No | ✅ Yes ($0.001) |
| Screenshot storage | ✅ Yes (15MB+) | ❌ No (analyze & discard) |
| Analysis cost | ~$0.045 | ~$0.055 |
| Analysis quality | Good | Excellent |

## Options

### `maxPagesPerModule` (default: 5)
Controls how many pages each analyzer receives:
```javascript
{
  maxPagesPerModule: 5 // SEO gets ≤5, content gets ≤5, etc.
}
```

**Recommended values**:
- Small sites (<20 pages): `3`
- Medium sites (20-100 pages): `5` (default)
- Large sites (100+ pages): `7`

### `onProgress` (optional)
Callback for real-time progress updates:
```javascript
{
  onProgress: (progress) => {
    console.log(`[${progress.step}] ${progress.message}`);
    // progress.step: 'discovery' | 'selection' | 'crawl' | 'analyze' | 'grade' | 'critique' | 'complete'
    // progress.message: Human-readable message
    // progress.timestamp: ISO timestamp
  }
}
```

### `customPrompts` (optional)
Override default AI prompts:
```javascript
{
  customPrompts: {
    seo: { /* custom SEO prompt */ },
    content: { /* custom content prompt */ },
    desktopVisual: { /* custom desktop visual prompt */ },
    mobileVisual: { /* custom mobile visual prompt */ },
    social: { /* custom social prompt */ }
  }
}
```

## Cost Breakdown

Typical analysis of a medium-sized site:

| Component | Cost |
|-----------|------|
| AI Page Selection (Grok-4-fast) | $0.001 |
| SEO Analysis (5 pages, Grok-4-fast) | $0.006 |
| Content Analysis (5 pages, Grok-4-fast) | $0.006 |
| Desktop Visual (3 pages, GPT-4o) | $0.020 |
| Mobile Visual (3 pages, GPT-4o) | $0.020 |
| Social Analysis (4 pages, Grok-4-fast) | $0.006 |
| **Total** | **~$0.058** |

## Testing

Run the test file:
```bash
node test-intelligent-analysis.js
```

Or test programmatically:
```javascript
import { analyzeWebsiteIntelligent } from './analysis-engine/orchestrator.js';

const result = await analyzeWebsiteIntelligent(
  'https://www.anthropic.com',
  { company_name: 'Anthropic', industry: 'AI' }
);

console.log('Grade:', result.grade);
console.log('Discovered:', result.intelligent_analysis.pages_discovered, 'pages');
console.log('Analyzed:', result.intelligent_analysis.pages_crawled, 'pages');
```

## Migration from Legacy

If you're currently using `analyzeWebsite()`, migrating is simple:

**Before:**
```javascript
const result = await analyzeWebsite(url, context, options);
```

**After:**
```javascript
const result = await analyzeWebsiteIntelligent(url, context, options);
```

That's it! The result structure is similar, with added `intelligent_analysis` metadata.

## Troubleshooting

### "Failed to discover pages"
- Website blocks sitemap.xml access
- No sitemap.xml exists
- Solution: System falls back to homepage navigation scan

### "AI selected 0 pages"
- Very small website (<3 pages)
- All pages failed to classify
- Solution: System uses homepage only

### "Failed to crawl any selected pages"
- Network timeout
- Website blocks bots
- Solution: Increase timeout or check robots.txt

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  analyzeWebsiteIntelligent()                        │
└─────────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
  Discovery      Selection      Crawling
(sitemap.xml)  (Grok-4-fast)  (Playwright)
        │             │             │
        └─────────────┼─────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
   Multi-Page                  Aggregation
    Analysis                   & Grading
(5 analyzers in parallel)
```

## Next Steps

1. Test with a real website
2. Compare results with legacy `analyzeWebsite()`
3. Integrate into your prospecting pipeline
4. Monitor costs and adjust `maxPagesPerModule` as needed