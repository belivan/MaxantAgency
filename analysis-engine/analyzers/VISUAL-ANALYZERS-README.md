# Visual Analyzers - Desktop & Mobile

Two new analyzer modules for comprehensive visual analysis of websites using GPT-4o Vision.

## Files Created

### Analyzer Modules
- `analyzers/desktop-visual-analyzer.js` - Desktop screenshot analysis
- `analyzers/mobile-visual-analyzer.js` - Mobile screenshot analysis

### Prompt Configurations
- `config/prompts/web-design/desktop-visual-analysis.json` - Desktop visual analysis prompt
- `config/prompts/web-design/mobile-visual-analysis.json` - Mobile visual analysis prompt

### Tests & Examples
- `tests/test-visual-analyzers.js` - Comprehensive test suite (16 tests)
- `examples/visual-analyzer-usage.js` - Usage example with Puppeteer

## Module Pattern

Both modules follow the established analyzer pattern used by `seo-analyzer.js` and `content-analyzer.js`:

### Imports
```javascript
import { loadPrompt } from '../shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../shared/ai-client.js';
```

### Main Function Signature
```javascript
// Desktop
analyzeDesktopVisual(url, screenshotBuffer, context, customPrompt)

// Mobile
analyzeMobileVisual(url, screenshotBuffer, context, customPrompt)
```

### Context Parameter
Both functions expect a context object with:
```javascript
{
  company_name: string,  // Company name
  industry: string,      // Industry type
  url: string,          // Website URL
  tech_stack: string,   // Technology stack
  load_time: number     // Page load time in milliseconds
}
```

### Return Value
Both functions return:
```javascript
{
  visualScore: number,        // 0-100 score
  issues: Array<Issue>,       // Array of identified issues
  positives: Array<string>,   // Positive aspects
  quickWinCount: number,      // Number of quick-win fixes
  _meta: {
    analyzer: string,         // 'desktop-visual' or 'mobile-visual'
    model: string,           // 'gpt-4o'
    cost: number,            // API call cost
    timestamp: string,       // ISO timestamp
    screenshotSize: number   // Buffer size in bytes
  }
}
```

### Issue Object Format
```javascript
{
  category: string,      // design|ux|navigation|performance|trust|typography|layout|mobile|touch|accessibility|forms
  title: string,        // Brief, specific title
  description: string,  // Detailed description
  impact: string,       // Business impact
  difficulty: string,   // quick-win|medium|major
  priority: string      // high|medium|low
}
```

## Key Features

### 1. Screenshot Buffer Validation
Both modules validate that the screenshot is a Buffer:
```javascript
if (!Buffer.isBuffer(screenshotBuffer)) {
  throw new Error('screenshotBuffer must be a Buffer');
}
```

### 2. Graceful Error Handling
If analysis fails, both return safe default values:
```javascript
{
  visualScore: 50,
  issues: [{ category: 'error', ... }],
  positives: [],
  quickWinCount: 0,
  _meta: { analyzer: '...', error: '...' }
}
```

### 3. Custom Prompt Support
Both support custom prompts via the 4th parameter:
```javascript
const customPrompt = {
  name: 'custom-visual',
  model: 'gpt-4o',
  temperature: 0.5,
  systemPrompt: '...',
  userPromptTemplate: '...',
  variables: [...],
  outputFormat: {...}
};

const result = await analyzeDesktopVisual(url, screenshot, context, customPrompt);
```

### 4. Helper Functions
Both modules export a helper to count critical issues:
```javascript
// Desktop
import { countCriticalDesktopIssues } from './desktop-visual-analyzer.js';
const criticalCount = countCriticalDesktopIssues(results);

// Mobile
import { countCriticalMobileIssues } from './mobile-visual-analyzer.js';
const criticalCount = countCriticalMobileIssues(results);
```

Counts issues with:
- `severity === 'critical'`
- `priority === 'high'`
- `difficulty === 'quick-win'`

## Prompt Configurations

### Desktop Visual Analysis
**File:** `config/prompts/web-design/desktop-visual-analysis.json`

**Model:** GPT-4o
**Temperature:** 0.4
**Cost:** ~$0.015 per analysis

**Focus Areas:**
- Desktop layout and visual hierarchy
- Desktop navigation usability
- Typography on large screens
- Wide-screen optimization
- Grid and alignment
- Desktop-specific UX patterns

### Mobile Visual Analysis
**File:** `config/prompts/web-design/mobile-visual-analysis.json`

**Model:** GPT-4o
**Temperature:** 0.4
**Cost:** ~$0.015 per analysis

**Focus Areas:**
- Touch target sizes (minimum 44px)
- Mobile navigation (hamburger menus)
- Mobile typography (minimum 16px)
- Viewport optimization
- Thumb-zone optimization
- Mobile performance indicators

## Usage Example

```javascript
import { analyzeDesktopVisual } from './analyzers/desktop-visual-analyzer.js';
import { analyzeMobileVisual } from './analyzers/mobile-visual-analyzer.js';
import puppeteer from 'puppeteer';

// Capture screenshots
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://example.com');

// Desktop screenshot (1920x1080)
await page.setViewport({ width: 1920, height: 1080 });
const desktopScreenshot = await page.screenshot({ fullPage: false });

// Mobile screenshot (375x667)
await page.setViewport({ width: 375, height: 667 });
const mobileScreenshot = await page.screenshot({ fullPage: false });

await browser.close();

// Context
const context = {
  company_name: 'Example Co',
  industry: 'Technology',
  url: 'https://example.com',
  tech_stack: 'React',
  load_time: 2100
};

// Analyze
const desktopResults = await analyzeDesktopVisual(
  'https://example.com',
  desktopScreenshot,
  context
);

const mobileResults = await analyzeMobileVisual(
  'https://example.com',
  mobileScreenshot,
  context
);

console.log('Desktop Score:', desktopResults.visualScore);
console.log('Mobile Score:', mobileResults.visualScore);
console.log('Desktop Issues:', desktopResults.issues.length);
console.log('Mobile Issues:', mobileResults.issues.length);
```

## Testing

Run the test suite:
```bash
cd analysis-engine
node tests/test-visual-analyzers.js
```

**Test Coverage:**
- Module exports validation
- Buffer validation
- Graceful error handling
- Helper function behavior
- Prompt loading
- Output schema validation

**Results:**
- ✅ 16 tests
- ✅ All passing

## Integration Notes

### Complements Existing Analyzers
These modules complement the existing analyzer ecosystem:
- `design-analyzer.js` - General design critique (uses same prompt as desktop)
- `seo-analyzer.js` - Technical SEO analysis
- `content-analyzer.js` - Content quality
- `social-analyzer.js` - Social media presence

### Desktop vs Design Analyzer
The `desktop-visual-analyzer.js` uses the same prompt as the existing `design-analyzer.js` by default but provides:
- Explicit desktop-specific prompt (`desktop-visual-analysis.json`)
- Clearer naming convention
- Separation of concerns for responsive analysis

### Response Format Alignment
Both modules return `visualScore` instead of `designScore` to differentiate from the general design analyzer, but the field structure is compatible with the existing grading system.

## Cost Estimates

| Analyzer | Model | Cost per Analysis |
|----------|-------|-------------------|
| Desktop Visual | GPT-4o | ~$0.015 |
| Mobile Visual | GPT-4o | ~$0.015 |
| **Both** | GPT-4o | ~$0.030 |

Combined with other analyzers:
- SEO: ~$0.006 (Grok-4-fast)
- Content: ~$0.006 (Grok-4-fast)
- Social: ~$0.006 (Grok-4-fast)
- **Total Full Analysis:** ~$0.048

## Best Practices

1. **Always capture both viewports** - Desktop and mobile provide different insights
2. **Use fullPage: false** - Above-the-fold is most critical
3. **Validate screenshots** - Ensure buffers are valid before analysis
4. **Handle errors gracefully** - Both modules return safe defaults on failure
5. **Track costs** - Access `_meta.cost` to monitor API expenses
6. **Prioritize quick wins** - Focus on issues with `difficulty: 'quick-win'`

## JSDoc Comments

Both modules include comprehensive JSDoc comments:
```javascript
/**
 * Analyze desktop visual design using GPT-4o Vision
 *
 * @param {string} url - Website URL
 * @param {Buffer} screenshotBuffer - Desktop screenshot as Buffer
 * @param {object} context - Additional context
 * @param {string} context.company_name - Company name
 * @param {string} context.industry - Industry type
 * @param {string} context.url - Website URL
 * @param {string} context.tech_stack - Technology stack
 * @param {number} context.load_time - Page load time in milliseconds
 * @param {object} customPrompt - Custom prompt configuration (optional)
 * @returns {Promise<object>} Desktop visual analysis results
 */
```

## Future Enhancements

Potential improvements:
- [ ] Add tablet viewport analysis (768x1024)
- [ ] Support for accessibility scoring (WCAG compliance)
- [ ] Performance budgets integration
- [ ] Automated screenshot capture in analyzers
- [ ] Comparative analysis (before/after)
- [ ] Screenshot caching for repeat analysis

---

**Created:** October 21, 2025
**Pattern Source:** `seo-analyzer.js`, `content-analyzer.js`
**AI Model:** GPT-4o Vision
**Test Status:** ✅ 16/16 passing
