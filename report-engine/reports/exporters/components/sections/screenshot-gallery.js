/**
 * Multi-Page Screenshot Gallery - Full Report Only
 *
 * CRITICAL FIXES APPLIED:
 * - Desktop screenshots: max-height: 200px with object-fit: cover; object-position: top;
 * - Mobile screenshots: max-height: 250px with object-fit: cover; object-position: top;
 * - Prevents oversized images from dominating the report layout
 * - Shows multi-page screenshots if available, otherwise displays homepage screenshots
 */

import { escapeHtml } from '../utils/helpers.js';

/**
 * Generate Multi-Page Screenshot Gallery
 * Shows multi-page screenshots if available, otherwise displays homepage screenshots
 *
 * NEW: Works with screenshots_manifest from Supabase Storage
 * - All screenshots are already loaded as dataURIs in screenshotData
 * - screenshotData.screenshots includes all pages with page URL metadata
 * - No need to read local files or fetch URLs - already embedded
 */
export function generateMultiPageScreenshotGallery(analysisResult, synthesisData, options) {
  // Extract screenshotData from options
  const screenshotData = options.screenshotData || {};
  const registry = options.registry;

  // NEW: Group screenshots by page URL
  const screenshotsByPage = new Map();

  if (screenshotData && screenshotData.screenshots) {
    screenshotData.screenshots.forEach(screenshot => {
      const pageUrl = screenshot.page || '/';
      if (!screenshotsByPage.has(pageUrl)) {
        screenshotsByPage.set(pageUrl, { desktop: null, mobile: null });
      }
      if (screenshot.device === 'desktop') {
        screenshotsByPage.get(pageUrl).desktop = screenshot;
      } else if (screenshot.device === 'mobile') {
        screenshotsByPage.get(pageUrl).mobile = screenshot;
      }
    });
  }

  const hasMultiPageData = screenshotsByPage.size > 1; // More than just homepage
  const totalPages = screenshotsByPage.size;

  let html = '';
  html += '    <!-- Multi-Page Screenshot Gallery -->\n';
  html += '    <section class="section" id="screenshot-gallery">\n';
  html += '      <div class="section-header">\n';
  html += '        <h2 class="section-title" style="font-size: 1.5rem; font-weight: bold;">\n';
  html += '          <span class="section-title-icon">📸</span>\n';
  html += '          Visual Evidence Gallery\n';
  html += '        </h2>\n';

  if (hasMultiPageData) {
    html += `        <p class="section-description">Screenshots from all ${totalPages} analyzed pages (desktop & mobile views).</p>\n`;
  } else {
    html += '        <p class="section-description">Homepage screenshots showing desktop and mobile views of the website.</p>\n';
  }
  html += '      </div>\n\n';

  // If no screenshots at all, show message
  if (screenshotsByPage.size === 0) {
    html += '      <div style="background: var(--bg-secondary); padding: 32px; border-radius: 12px; text-align: center; border: 1px solid var(--border-light);">\n';
    html += '        <div style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;">📷</div>\n';
    html += '        <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 12px; color: var(--text-primary);">Screenshots Not Available</h3>\n';
    html += '        <p style="opacity: 0.7; font-size: 0.95rem;">Screenshot capture was not enabled or failed during analysis.</p>\n';
    html += '      </div>\n';
    html += '    </section>\n\n';
    return html;
  }

  // If only homepage, show notice
  if (!hasMultiPageData) {
    html += '      <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid var(--primary);">\n';
    html += '        <p style="margin: 0; opacity: 0.8;"><strong>📌 Note:</strong> This analysis covered the homepage only. Enable multi-page crawling to capture screenshots from about, services, and other key pages.</p>\n';
    html += '      </div>\n';

    // Show homepage screenshots only
    const homepageScreenshots = screenshotsByPage.get('/');
    if (homepageScreenshots) {
      html += '      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px;">\n';
      html += '        <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px;">Homepage</h3>\n';
      html += '        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">\n';

      // Desktop screenshot - CRITICAL FIX: max-height 400px, object-fit cover
      if (homepageScreenshots.desktop && homepageScreenshots.desktop.dataUri) {
        html += '          <div>\n';
        html += '            <h4 style="font-size: 1rem; margin-bottom: 12px; opacity: 0.8;">🖥️ Desktop View</h4>\n';
        html += '            <div style="border: 2px solid var(--border-default); border-radius: 8px; overflow: hidden; background: var(--bg-secondary);">\n';
        html += `              <img src="${homepageScreenshots.desktop.dataUri}" alt="Homepage - Desktop" style="width: 100%; max-height: 200px; object-fit: cover; object-position: top; display: block;" />\n`;
        html += '            </div>\n';
        html += '          </div>\n';
      }

      // Mobile screenshot - CRITICAL FIX: max-height 250px, object-fit cover
      if (homepageScreenshots.mobile && homepageScreenshots.mobile.dataUri) {
        html += '          <div>\n';
        html += '            <h4 style="font-size: 1rem; margin-bottom: 12px; opacity: 0.8;">📱 Mobile View</h4>\n';
        html += '            <div style="border: 2px solid var(--border-default); border-radius: 8px; overflow: hidden; background: var(--bg-secondary); max-width: 400px;">\n';
        html += `              <img src="${homepageScreenshots.mobile.dataUri}" alt="Homepage - Mobile" style="width: 100%; max-height: 250px; object-fit: cover; object-position: top; display: block;" />\n`;
        html += '            </div>\n';
        html += '          </div>\n';
      }

      html += '        </div>\n';
      html += '      </div>\n';
    }

    html += '    </section>\n\n';
    return html;
  }

  // Multi-page screenshots - iterate through all pages
  // Sort pages: homepage first, then alphabetically
  const sortedPages = Array.from(screenshotsByPage.entries()).sort((a, b) => {
    if (a[0] === '/') return -1;
    if (b[0] === '/') return 1;
    return a[0].localeCompare(b[0]);
  });

  sortedPages.forEach(([pageUrl, screenshots], idx) => {
    if (!screenshots.desktop && !screenshots.mobile) {
      return; // Skip if no screenshots
    }

    const pageTitle = pageUrl === '/' || pageUrl === '' ? 'Homepage' : pageUrl;

    html += `      <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; margin-bottom: 24px;">\n`;
    html += `        <h3 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 16px;">${idx + 1}. ${escapeHtml(pageTitle)}</h3>\n`;
    html += '        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">\n';

    // Desktop screenshot - CRITICAL FIX: max-height 200px, object-fit cover
    if (screenshots.desktop && screenshots.desktop.dataUri) {
      html += '          <div>\n';
      html += '            <h4 style="font-size: 1rem; margin-bottom: 12px; opacity: 0.8;">🖥️ Desktop View</h4>\n';
      html += '            <div style="border: 2px solid var(--border-default); border-radius: 8px; overflow: hidden; background: var(--bg-secondary);">\n';
      html += `              <img src="${screenshots.desktop.dataUri}" alt="${escapeHtml(pageTitle)} - Desktop" style="width: 100%; max-height: 200px; object-fit: cover; object-position: top; display: block;" loading="lazy" />\n`;
      html += '            </div>\n';
      html += '          </div>\n';
    }

    // Mobile screenshot - CRITICAL FIX: max-height 250px, object-fit cover
    if (screenshots.mobile && screenshots.mobile.dataUri) {
      html += '          <div>\n';
      html += '            <h4 style="font-size: 1rem; margin-bottom: 12px; opacity: 0.8;">📱 Mobile View</h4>\n';
      html += '            <div style="border: 2px solid var(--border-default); border-radius: 8px; overflow: hidden; background: var(--bg-secondary); max-width: 400px;">\n';
      html += `              <img src="${screenshots.mobile.dataUri}" alt="${escapeHtml(pageTitle)} - Mobile" style="width: 100%; max-height: 250px; object-fit: cover; object-position: top; display: block;" loading="lazy" />\n`;
      html += '            </div>\n';
      html += '          </div>\n';
    }

    html += '        </div>\n';
    html += '      </div>\n';
  });

  html += '    </section>\n\n';
  return html;
}
