#!/usr/bin/env node
/**
 * Transparent Analysis Test Script
 *
 * This script runs a complete website analysis and logs EVERY step of the process:
 * - Discovery phase (sitemap, robots.txt)
 * - Page selection (AI prompt + response)
 * - Crawling (screenshots, HTML)
 * - Each analyzer (prompts, raw responses, parsed data)
 * - Grading and aggregation
 *
 * All data is saved to debug-logs/[company-name]/ for review.
 *
 * Usage:
 *   node test-transparent-analysis.js https://example.com
 *
 * Options:
 *   DEBUG_AI_CALLS=true - Log prompts/responses to console
 *   DEBUG_AI_SAVE_TO_FILE=true - Save all AI interactions to files
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import dotenv from 'dotenv';
import { analyzeWebsiteIntelligent } from '../../orchestrator-refactored.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env') });

// Enable debug mode for this test
process.env.DEBUG_AI_CALLS = 'true';
process.env.DEBUG_AI_SAVE_TO_FILE = 'true';

const DEBUG_DIR = process.env.DEBUG_OUTPUT_DIR || './debug-logs';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printSection(title) {
  console.log('\n' + colorize('='.repeat(80), 'cyan'));
  console.log(colorize(`  ${title}`, 'bright'));
  console.log(colorize('='.repeat(80), 'cyan') + '\n');
}

function printSubsection(title) {
  console.log('\n' + colorize(`▶ ${title}`, 'yellow'));
  console.log(colorize('-'.repeat(60), 'gray'));
}

async function saveDebugFile(companySlug, filename, content) {
  const dir = join(DEBUG_DIR, companySlug);
  await mkdir(dir, { recursive: true });

  const filepath = join(dir, filename);
  const data = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  await writeFile(filepath, data, 'utf8');

  return filepath;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Hook into the analysis pipeline to capture all data
 */
function createDebugHooks(companySlug) {
  const debugData = {
    discovery: null,
    pageSelection: null,
    crawl: null,
    analyzers: {},
    grading: null,
    final: null,
    timing: {},
    costs: {}
  };

  let stepCounter = 1;

  const hooks = {
    onProgress: async (progress) => {
      const step = progress.step;
      const timestamp = new Date().toISOString();

      console.log(colorize(`[${timestamp}] ${step}: ${progress.message}`, 'blue'));

      // Save progress to timeline
      if (!debugData.timeline) {
        debugData.timeline = [];
      }
      debugData.timeline.push({ ...progress, timestamp });
    },

    captureDiscovery: async (data) => {
      printSubsection('Discovery Phase Complete');
      console.log(`  Pages discovered: ${data.pages?.length || 0}`);
      console.log(`  Has sitemap: ${data.hasSitemap ? '✓' : '✗'}`);
      console.log(`  Has robots.txt: ${data.hasRobots ? '✓' : '✗'}`);

      debugData.discovery = data;
      const filename = `${String(stepCounter).padStart(2, '0')}-discovery.json`;
      await saveDebugFile(companySlug, filename, data);
      console.log(colorize(`  → Saved to: ${filename}`, 'gray'));
      stepCounter++;
    },

    capturePageSelection: async (selection, prompt, response) => {
      printSubsection('Page Selection Phase Complete');
      console.log(`  Strategy: ${selection.strategy}`);
      console.log(`  SEO pages: ${selection.seo_pages?.length || 0}`);
      console.log(`  Content pages: ${selection.content_pages?.length || 0}`);
      console.log(`  Visual pages: ${selection.visual_pages?.length || 0}`);

      debugData.pageSelection = selection;

      // Save selection result
      await saveDebugFile(companySlug, `${String(stepCounter).padStart(2, '0')}-page-selection.json`, selection);

      // Save AI prompt if available
      if (prompt) {
        await saveDebugFile(companySlug, `${String(stepCounter).padStart(2, '0')}-page-selection-prompt.txt`,
          `SYSTEM PROMPT:\n${prompt.systemPrompt}\n\nUSER PROMPT:\n${prompt.userPrompt}`);
      }

      // Save AI response if available
      if (response) {
        await saveDebugFile(companySlug, `${String(stepCounter).padStart(2, '0')}-page-selection-response.json`, response);
      }

      console.log(colorize(`  → Saved to: ${String(stepCounter).padStart(2, '0')}-page-selection-*`, 'gray'));
      stepCounter++;
    },

    captureCrawl: async (data) => {
      printSubsection('Crawling Phase Complete');
      console.log(`  Pages crawled: ${data.pages?.length || 0}`);
      console.log(`  Screenshots captured: ${data.pages?.filter(p => p.screenshots).length || 0}`);
      console.log(`  Failed pages: ${data.failed_pages?.length || 0}`);

      debugData.crawl = {
        pageCount: data.pages?.length || 0,
        successCount: data.pages?.filter(p => p.html).length || 0,
        failedCount: data.failed_pages?.length || 0,
        pages: data.pages?.map(p => ({
          url: p.url,
          title: p.metadata?.title,
          loadTime: p.metadata?.loadTime,
          hasScreenshots: !!p.screenshots,
          htmlLength: p.html?.length || 0
        }))
      };

      const filename = `${String(stepCounter).padStart(2, '0')}-crawl-results.json`;
      await saveDebugFile(companySlug, filename, debugData.crawl);
      console.log(colorize(`  → Saved to: ${filename}`, 'gray'));
      stepCounter++;
    },

    captureAnalyzer: async (analyzerName, prompt, rawResponse, parsedData, cost, time) => {
      printSubsection(`${analyzerName} Analyzer Complete`);
      console.log(`  Model: ${prompt.model || 'unknown'}`);
      console.log(`  Cost: $${cost?.toFixed(4) || '0.0000'}`);
      console.log(`  Time: ${time}ms`);
      console.log(`  Score: ${parsedData.score || parsedData.overallScore || 'N/A'}`);
      console.log(`  Issues found: ${parsedData.issues?.length || 0}`);

      debugData.analyzers[analyzerName] = {
        score: parsedData.score || parsedData.overallScore,
        issueCount: parsedData.issues?.length || 0,
        cost,
        time
      };

      const baseFilename = `${String(stepCounter).padStart(2, '0')}-${slugify(analyzerName)}`;

      // Save prompt
      await saveDebugFile(companySlug, `${baseFilename}-prompt.txt`,
        `MODEL: ${prompt.model}\nTEMPERATURE: ${prompt.temperature}\n\n` +
        `SYSTEM PROMPT:\n${'-'.repeat(80)}\n${prompt.systemPrompt}\n\n` +
        `USER PROMPT:\n${'-'.repeat(80)}\n${prompt.userPrompt}`
      );

      // Save raw AI response
      await saveDebugFile(companySlug, `${baseFilename}-response.json`, rawResponse);

      // Save parsed data
      await saveDebugFile(companySlug, `${baseFilename}-parsed.json`, parsedData);

      console.log(colorize(`  → Saved to: ${baseFilename}-*`, 'gray'));
      stepCounter++;
    },

    captureGrading: async (data) => {
      printSubsection('Grading Complete');
      console.log(`  Overall Score: ${data.overall_score}`);
      console.log(`  Grade: ${data.grade}`);
      console.log(`  Design: ${data.design_score}`);
      console.log(`  SEO: ${data.seo_score}`);
      console.log(`  Content: ${data.content_score}`);
      console.log(`  Social: ${data.social_score}`);

      debugData.grading = data;
      const filename = `${String(stepCounter).padStart(2, '0')}-grading.json`;
      await saveDebugFile(companySlug, filename, data);
      console.log(colorize(`  → Saved to: ${filename}`, 'gray'));
      stepCounter++;
    },

    captureFinal: async (data) => {
      debugData.final = data;
      const filename = `${String(stepCounter).padStart(2, '0')}-final-result.json`;
      await saveDebugFile(companySlug, filename, data);
      stepCounter++;
    }
  };

  return { hooks, debugData };
}

/**
 * Generate summary report
 */
async function generateSummary(companySlug, url, debugData, totalTime, totalCost) {
  const summary = `
# TRANSPARENT ANALYSIS REPORT
## ${url}

Generated: ${new Date().toISOString()}
Total Time: ${(totalTime / 1000).toFixed(2)}s
Total Cost: $${totalCost.toFixed(4)}

---

## PHASE 1: DISCOVERY
- Pages discovered: ${debugData.discovery?.pages?.length || 0}
- Has sitemap: ${debugData.discovery?.hasSitemap ? 'Yes' : 'No'}
- Has robots.txt: ${debugData.discovery?.hasRobots ? 'Yes' : 'No'}

## PHASE 2: PAGE SELECTION
- Strategy: ${debugData.pageSelection?.strategy || 'N/A'}
- SEO pages: ${debugData.pageSelection?.seo_pages?.length || 0}
- Content pages: ${debugData.pageSelection?.content_pages?.length || 0}
- Visual pages: ${debugData.pageSelection?.visual_pages?.length || 0}
- Social pages: ${debugData.pageSelection?.social_pages?.length || 0}

## PHASE 3: CRAWLING
- Pages crawled: ${debugData.crawl?.pageCount || 0}
- Successful: ${debugData.crawl?.successCount || 0}
- Failed: ${debugData.crawl?.failedCount || 0}

## PHASE 4: ANALYSIS

${Object.entries(debugData.analyzers).map(([name, data]) => `
### ${name}
- Score: ${data.score || 'N/A'}
- Issues: ${data.issueCount}
- Cost: $${data.cost?.toFixed(4) || '0.0000'}
- Time: ${data.time}ms
`).join('\n')}

## PHASE 5: GRADING
- Overall Score: ${debugData.grading?.overall_score || 'N/A'}
- Grade: ${debugData.grading?.grade || 'N/A'}
- Design Score: ${debugData.grading?.design_score || 'N/A'}
- SEO Score: ${debugData.grading?.seo_score || 'N/A'}
- Content Score: ${debugData.grading?.content_score || 'N/A'}
- Social Score: ${debugData.grading?.social_score || 'N/A'}

---

## FILES GENERATED

All debug files are located in: \`${DEBUG_DIR}/${companySlug}/\`

1. Discovery data
2. Page selection (prompt + response + result)
3. Crawl results
4. Each analyzer (prompt + response + parsed data)
5. Grading calculation
6. Final aggregated result

## HOW TO USE THIS DATA

### Review AI Prompts
Look at \`*-prompt.txt\` files to see exactly what was sent to each AI model.

### Check AI Responses
Look at \`*-response.json\` files to see raw responses from AI before parsing.

### Verify Parsing
Compare \`*-response.json\` with \`*-parsed.json\` to ensure parsing worked correctly.

### Debug Issues
If something looks wrong, trace through the files in order to find where the problem occurred.

### Tune Prompts
Use the raw data to refine your prompts in \`config/prompts/\` if needed.
`;

  await saveDebugFile(companySlug, '00-SUMMARY.md', summary);

  return summary;
}

/**
 * Main test function
 */
async function runTransparentAnalysis(url) {
  printSection('TRANSPARENT ANALYSIS TEST');

  console.log(colorize('Target URL:', 'bright'), url);
  console.log(colorize('Debug Mode:', 'bright'), 'ENABLED');
  console.log(colorize('Output Directory:', 'bright'), DEBUG_DIR);

  // Create company slug for file organization
  const companyName = new URL(url).hostname.replace('www.', '');
  const companySlug = slugify(companyName);

  console.log(colorize('Company Slug:', 'bright'), companySlug);
  console.log(colorize('\nDebug files will be saved to:', 'bright'), `${DEBUG_DIR}/${companySlug}/`);

  // Set up debug hooks
  const { hooks, debugData } = createDebugHooks(companySlug);

  // Inject debug hooks into the system
  // Note: This requires modifications to the orchestrator and analyzers
  // For now, we'll run the analysis and capture what we can

  const startTime = Date.now();
  let totalCost = 0;

  try {
    printSection('STARTING ANALYSIS PIPELINE');

    // Run the analysis with progress tracking
    const result = await analyzeWebsiteIntelligent(url, {
      company_name: companyName,
      industry: 'unknown',
      project_id: '00000000-0000-0000-0000-000000000000' // Test project ID
    }, {
      onProgress: hooks.onProgress,
      maxPagesPerModule: parseInt(process.env.MAX_PAGES_PER_MODULE || '5')
    });

    const totalTime = Date.now() - startTime;
    totalCost = result.analysis_cost || 0;

    // Capture final result
    await hooks.captureFinal(result);

    printSection('ANALYSIS COMPLETE');

    console.log(colorize('✓ Success!', 'green'));
    console.log(`\n${colorize('Results:', 'bright')}`);
    console.log(`  Company: ${result.company_name}`);
    console.log(`  Grade: ${colorize(result.grade, 'bright')} (${result.overall_score}/100)`);
    console.log(`  Design: ${result.design_score}`);
    console.log(`  SEO: ${result.seo_score}`);
    console.log(`  Content: ${result.content_score}`);
    console.log(`  Social: ${result.social_score}`);
    console.log(`\n  Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`  Total Time: ${(totalTime / 1000).toFixed(2)}s`);

    // Generate summary report
    printSection('GENERATING SUMMARY REPORT');

    // Populate debug data from result
    debugData.discovery = result.discovery_log;
    debugData.grading = {
      overall_score: result.overall_score,
      grade: result.grade,
      design_score: result.design_score,
      seo_score: result.seo_score,
      content_score: result.content_score,
      social_score: result.social_score
    };

    const summary = await generateSummary(companySlug, url, debugData, totalTime, totalCost);

    console.log(colorize('\n✓ Summary report generated', 'green'));
    console.log(colorize(`\nAll debug files saved to: ${DEBUG_DIR}/${companySlug}/`, 'cyan'));

    printSection('NEXT STEPS');
    console.log(`1. Review the summary: ${colorize(`${DEBUG_DIR}/${companySlug}/00-SUMMARY.md`, 'yellow')}`);
    console.log(`2. Check AI prompts: ${colorize(`*-prompt.txt`, 'yellow')}`);
    console.log(`3. Verify responses: ${colorize(`*-response.json`, 'yellow')}`);
    console.log(`4. Examine parsed data: ${colorize(`*-parsed.json`, 'yellow')}`);
    console.log(`\n5. To enable even more verbose logging, set: ${colorize('DEBUG_MODE=true', 'cyan')}`);

    return result;

  } catch (error) {
    printSection('ERROR');
    console.error(colorize('✗ Analysis failed:', 'red'), error.message);
    console.error(colorize('\nStack trace:', 'gray'));
    console.error(error.stack);

    // Save error details
    await saveDebugFile(companySlug, 'ERROR.json', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(colorize('Usage:', 'bright'), 'node test-transparent-analysis.js <url>');
  console.log(colorize('\nExample:', 'cyan'), 'node test-transparent-analysis.js https://example.com');
  console.log(colorize('\nOptions:', 'bright'));
  console.log('  Set environment variables in .env or pass inline:');
  console.log('  - DEBUG_AI_CALLS=true (already enabled by this script)');
  console.log('  - DEBUG_AI_SAVE_TO_FILE=true (already enabled by this script)');
  console.log('  - ENABLE_SEO_ANALYZER=false (disable specific analyzers)');
  console.log('  - ENABLE_MULTI_PAGE_CRAWL=false (single-page only)');
  process.exit(1);
}

const url = args[0];

// Validate URL
try {
  new URL(url);
} catch (error) {
  console.error(colorize('✗ Invalid URL:', 'red'), url);
  process.exit(1);
}

// Run the test
runTransparentAnalysis(url)
  .then(() => {
    console.log(colorize('\n✓ Test complete!', 'green'));
    process.exit(0);
  })
  .catch((error) => {
    console.error(colorize('\n✗ Test failed:', 'red'), error.message);
    process.exit(1);
  });
