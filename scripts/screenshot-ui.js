/**
 * Command Center UI Screenshot Script
 * 
 * Navigates through all pages/tabs of the Command Center UI and captures screenshots
 * Perfect for documentation, showcasing, or visual regression testing
 * 
 * Usage:
 *   node scripts/screenshot-ui.js
 * 
 * Requirements:
 *   npm install playwright
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  outputDir: path.join(__dirname, '../screenshots/ui-showcase'),
  viewport: {
    width: 1920,
    height: 1080
  },
  // Wait time for pages to fully load (in ms)
  pageLoadWait: 2000,
  // Wait for animations to complete
  animationWait: 500,
  // Browser options
  headless: true,
  slowMo: 100 // Slow down by 100ms for stability
};

// Pages to screenshot - all main pages
const PAGES = [
  {
    name: '01-Dashboard',
    path: '/',
    description: 'Main dashboard with stats overview',
    waitForSelector: '.container'
  },
  {
    name: '02-Prospecting',
    path: '/prospecting',
    description: 'Prospect generation page',
    waitForSelector: '.container'
  },
  {
    name: '03-Analysis',
    path: '/analysis',
    description: 'Prospect analysis page',
    waitForSelector: '.container'
  },
  {
    name: '04-Leads',
    path: '/leads',
    description: 'Leads management page',
    waitForSelector: '.container'
  },
  {
    name: '05-Projects',
    path: '/projects',
    description: 'Projects/campaigns page',
    waitForSelector: '.container'
  },
  {
    name: '06-Analytics',
    path: '/analytics',
    description: 'Analytics and insights page',
    waitForSelector: '.container'
  },
  {
    name: '07-About',
    path: '/about',
    description: 'About page - AI architecture showcase',
    waitForSelector: 'h1'
  }
];

// Removed complex tabbed pages - keeping it simple with main pages only

/**
 * Ensure output directory exists
 */
function ensureOutputDir() {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  console.log(`📁 Screenshots will be saved to: ${CONFIG.outputDir}`);
}

/**
 * Take screenshot of a page
 */
async function screenshotPage(page, name, description) {
  const filename = `${name}.png`;
  const filepath = path.join(CONFIG.outputDir, filename);
  
  console.log(`📸 Capturing: ${name}`);
  console.log(`   ${description}`);
  
  await page.screenshot({
    path: filepath,
    fullPage: true // Capture entire scrollable page
  });
  
  console.log(`   ✅ Saved: ${filename}\n`);
}

/**
 * Wait for page to be fully loaded and stable
 */
async function waitForPageStable(page, waitForSelector) {
  try {
    // Wait for the main selector
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }
    
    // Wait for network to be idle
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Additional wait for any animations or dynamic content
    await page.waitForTimeout(CONFIG.pageLoadWait);
    
  } catch (error) {
    console.warn(`   ⚠️  Warning: ${error.message}`);
    // Continue anyway - page might be partially loaded
  }
}

/**
 * Screenshot all basic pages
 */
async function screenshotBasicPages(page) {
  console.log('🎯 Capturing basic pages...\n');
  
  for (const pageConfig of PAGES) {
    const url = `${CONFIG.baseUrl}${pageConfig.path}`;
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await waitForPageStable(page, pageConfig.waitForSelector);
      await screenshotPage(page, pageConfig.name, pageConfig.description);
    } catch (error) {
      console.error(`   ❌ Error capturing ${pageConfig.name}: ${error.message}\n`);
    }
  }
}

// Removed tabbed pages function - keeping it simple

// Removed full dashboard and mobile views - all screenshots are now full-page by default

/**
 * Generate an HTML index page for easy viewing
 */
function generateIndexHTML() {
  console.log('📄 Generating index.html...\n');
  
  const allScreenshots = PAGES.map(p => ({ name: p.name, description: p.description }));
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Command Center UI - Screenshots</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 2rem;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    header {
      text-align: center;
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 2px solid #334155;
    }
    
    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .subtitle {
      color: #94a3b8;
      font-size: 1.1rem;
    }
    
    .timestamp {
      color: #64748b;
      font-size: 0.9rem;
      margin-top: 1rem;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }
    
    .screenshot-card {
      background: #1e293b;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #334155;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .screenshot-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      border-color: #475569;
    }
    
    .screenshot-card img {
      width: 100%;
      height: auto;
      display: block;
      cursor: pointer;
    }
    
    .screenshot-info {
      padding: 1rem;
    }
    
    .screenshot-name {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #f1f5f9;
    }
    
    .screenshot-description {
      font-size: 0.9rem;
      color: #94a3b8;
    }
    
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 1000;
      padding: 2rem;
      overflow: auto;
    }
    
    .modal.active {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .modal img {
      max-width: 95%;
      max-height: 95vh;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      border-radius: 8px;
    }
    
    .close-modal {
      position: absolute;
      top: 1rem;
      right: 1rem;
      font-size: 2rem;
      color: white;
      cursor: pointer;
      background: #1e293b;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #334155;
    }
    
    .close-modal:hover {
      background: #334155;
    }
    
    .section-title {
      font-size: 1.5rem;
      margin: 3rem 0 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #334155;
      color: #f1f5f9;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 3rem;
    }
    
    .stat-card {
      background: #1e293b;
      padding: 1.5rem;
      border-radius: 8px;
      border: 1px solid #334155;
      text-align: center;
    }
    
    .stat-number {
      font-size: 2rem;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 0.5rem;
    }
    
    .stat-label {
      color: #94a3b8;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 Command Center UI</h1>
      <p class="subtitle">Complete UI Screenshots Showcase</p>
      <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
    </header>
    
    <div class="stats">
      <div class="stat-card">
        <div class="stat-number">${allScreenshots.length}</div>
        <div class="stat-label">Total Screenshots</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">Full Page</div>
        <div class="stat-label">Screenshot Type</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">1920x1080</div>
        <div class="stat-label">Viewport Size</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">Ready!</div>
        <div class="stat-label">Status</div>
      </div>
    </div>
    
    <h2 class="section-title">📱 All Screenshots</h2>
    <div class="grid">
      ${allScreenshots.map(screenshot => `
        <div class="screenshot-card">
          <img src="${screenshot.name}.png" alt="${screenshot.description}" onclick="openModal('${screenshot.name}.png')">
          <div class="screenshot-info">
            <div class="screenshot-name">${screenshot.name.replace(/-/g, ' ')}</div>
            <div class="screenshot-description">${screenshot.description}</div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
  
  <div class="modal" id="modal" onclick="closeModal()">
    <span class="close-modal" onclick="closeModal()">×</span>
    <img id="modal-img" src="" alt="">
  </div>
  
  <script>
    function openModal(src) {
      document.getElementById('modal').classList.add('active');
      document.getElementById('modal-img').src = src;
    }
    
    function closeModal() {
      document.getElementById('modal').classList.remove('active');
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    });
  </script>
</body>
</html>`;
  
  const indexPath = path.join(CONFIG.outputDir, 'index.html');
  fs.writeFileSync(indexPath, html);
  console.log(`   ✅ Created: index.html`);
  console.log(`   🌐 Open file://${indexPath} in your browser\n`);
}

/**
 * Main function
 */
async function main() {
  console.log('\n🎬 Command Center UI Screenshot Tool\n');
  console.log('━'.repeat(60) + '\n');
  
  // Ensure output directory exists
  ensureOutputDir();
  
  // Launch browser
  console.log('🌐 Launching browser...\n');
  const browser = await chromium.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.slowMo
  });
  
  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    deviceScaleFactor: 1
  });
  
  const page = await context.newPage();
  
  try {
    // Check if the app is running
    try {
      await page.goto(CONFIG.baseUrl, { timeout: 5000 });
      console.log(`✅ Connected to ${CONFIG.baseUrl}\n`);
    } catch (error) {
      console.error(`❌ Cannot connect to ${CONFIG.baseUrl}`);
      console.error(`   Please make sure the Command Center UI is running!`);
      console.error(`   Start it with: cd command-center-ui && npm run dev\n`);
      await browser.close();
      process.exit(1);
    }
    
    // Screenshot all pages (all full-page now!)
    await screenshotBasicPages(page);
    
    // Generate index page
    generateIndexHTML();
    
    console.log('━'.repeat(60) + '\n');
    console.log('✨ All screenshots captured successfully!\n');
    console.log(`📁 Location: ${CONFIG.outputDir}`);
    console.log(`🌐 View gallery: file://${path.join(CONFIG.outputDir, 'index.html')}\n`);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// Run the script
main().catch(console.error);
