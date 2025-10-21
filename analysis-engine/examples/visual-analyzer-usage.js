/**
 * Visual Analyzer Usage Example
 *
 * Demonstrates how to use the desktop-visual-analyzer and mobile-visual-analyzer
 */

import { analyzeDesktopVisual, countCriticalDesktopIssues } from '../analyzers/desktop-visual-analyzer.js';
import { analyzeMobileVisual, countCriticalMobileIssues } from '../analyzers/mobile-visual-analyzer.js';
import puppeteer from 'puppeteer';

/**
 * Example: Analyze a website's desktop and mobile visual design
 */
async function analyzeWebsiteVisuals(url) {
  console.log(`\n📸 Capturing screenshots for: ${url}\n`);

  // Launch browser
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to website
    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const loadTime = Date.now() - startTime;

    // Get tech stack (simple detection)
    const techStack = await detectTechStack(page);

    // Context shared by both analyzers
    const context = {
      company_name: 'Example Business',
      industry: 'Technology',
      url: url,
      tech_stack: techStack,
      load_time: loadTime
    };

    // Capture desktop screenshot
    console.log('📱 Capturing desktop screenshot (1920x1080)...');
    await page.setViewport({ width: 1920, height: 1080 });
    const desktopScreenshot = await page.screenshot({ fullPage: false });

    // Capture mobile screenshot
    console.log('📱 Capturing mobile screenshot (375x667)...');
    await page.setViewport({ width: 375, height: 667 });
    const mobileScreenshot = await page.screenshot({ fullPage: false });

    await browser.close();

    // Analyze desktop visual design
    console.log('\n🔍 Analyzing desktop visual design...');
    const desktopResults = await analyzeDesktopVisual(url, desktopScreenshot, context);

    console.log('\n=== Desktop Visual Analysis ===');
    console.log(`Score: ${desktopResults.visualScore}/100`);
    console.log(`Issues Found: ${desktopResults.issues.length}`);
    console.log(`Quick Wins: ${desktopResults.quickWinCount || 0}`);
    console.log(`Critical Issues: ${countCriticalDesktopIssues(desktopResults)}`);
    console.log(`Model: ${desktopResults._meta.model}`);
    console.log(`Cost: $${desktopResults._meta.cost.toFixed(4)}`);

    if (desktopResults.positives && desktopResults.positives.length > 0) {
      console.log('\nPositive Aspects:');
      desktopResults.positives.forEach((positive, idx) => {
        console.log(`  ${idx + 1}. ${positive}`);
      });
    }

    if (desktopResults.issues.length > 0) {
      console.log('\nTop Desktop Issues:');
      desktopResults.issues.slice(0, 3).forEach((issue, idx) => {
        console.log(`\n  ${idx + 1}. ${issue.title}`);
        console.log(`     Category: ${issue.category}`);
        console.log(`     Priority: ${issue.priority}`);
        console.log(`     Difficulty: ${issue.difficulty}`);
        console.log(`     Impact: ${issue.impact}`);
      });
    }

    // Analyze mobile visual design
    console.log('\n\n🔍 Analyzing mobile visual design...');
    const mobileResults = await analyzeMobileVisual(url, mobileScreenshot, context);

    console.log('\n=== Mobile Visual Analysis ===');
    console.log(`Score: ${mobileResults.visualScore}/100`);
    console.log(`Issues Found: ${mobileResults.issues.length}`);
    console.log(`Quick Wins: ${mobileResults.quickWinCount || 0}`);
    console.log(`Critical Issues: ${countCriticalMobileIssues(mobileResults)}`);
    console.log(`Model: ${mobileResults._meta.model}`);
    console.log(`Cost: $${mobileResults._meta.cost.toFixed(4)}`);

    if (mobileResults.positives && mobileResults.positives.length > 0) {
      console.log('\nPositive Aspects:');
      mobileResults.positives.forEach((positive, idx) => {
        console.log(`  ${idx + 1}. ${positive}`);
      });
    }

    if (mobileResults.issues.length > 0) {
      console.log('\nTop Mobile Issues:');
      mobileResults.issues.slice(0, 3).forEach((issue, idx) => {
        console.log(`\n  ${idx + 1}. ${issue.title}`);
        console.log(`     Category: ${issue.category}`);
        console.log(`     Priority: ${issue.priority}`);
        console.log(`     Difficulty: ${issue.difficulty}`);
        console.log(`     Impact: ${issue.impact}`);
      });
    }

    // Summary
    console.log('\n\n=== Summary ===');
    const totalCost = desktopResults._meta.cost + mobileResults._meta.cost;
    const totalIssues = desktopResults.issues.length + mobileResults.issues.length;
    const totalCritical = countCriticalDesktopIssues(desktopResults) + countCriticalMobileIssues(mobileResults);

    console.log(`Total Cost: $${totalCost.toFixed(4)}`);
    console.log(`Total Issues: ${totalIssues}`);
    console.log(`Total Critical Issues: ${totalCritical}`);
    console.log(`Average Score: ${Math.round((desktopResults.visualScore + mobileResults.visualScore) / 2)}/100`);

    return {
      desktop: desktopResults,
      mobile: mobileResults,
      summary: {
        totalCost,
        totalIssues,
        totalCritical,
        averageScore: Math.round((desktopResults.visualScore + mobileResults.visualScore) / 2)
      }
    };

  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Simple tech stack detection
 */
async function detectTechStack(page) {
  try {
    const techStack = await page.evaluate(() => {
      const detected = [];

      // Check for common frameworks
      if (window.React || document.querySelector('[data-reactroot]')) {
        detected.push('React');
      }
      if (window.Vue) {
        detected.push('Vue');
      }
      if (window.angular) {
        detected.push('Angular');
      }
      if (document.querySelector('[data-gatsby]')) {
        detected.push('Gatsby');
      }
      if (document.querySelector('meta[name="generator"][content*="WordPress"]')) {
        detected.push('WordPress');
      }

      return detected.length > 0 ? detected.join(', ') : 'Unknown';
    });

    return techStack;
  } catch {
    return 'Unknown';
  }
}

// Run example if called directly
const url = process.argv[2] || 'https://example.com';

console.log('=================================================');
console.log('   Visual Analyzer Usage Example');
console.log('=================================================');

analyzeWebsiteVisuals(url)
  .then(() => {
    console.log('\n✅ Analysis complete!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Analysis failed:', error.message);
    process.exit(1);
  });
