/**
 * Enhanced HTML Report with All Screenshots
 * Embeds all screenshots from crawled pages, organized by section
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function normalizeRelativeUrl(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = new URL(value, 'https://example.com');
    return parsed.pathname || '/';
  } catch {
    return value.startsWith('/') ? value : `/${value}`;
  }
}

function issueMatchesPage(issue, pageUrls) {
  if (!issue) return false;
  const candidates = new Set();
  const addCandidate = (val) => {
    const normalized = normalizeRelativeUrl(val);
    if (normalized) candidates.add(normalized);
  };

  if (issue.page) addCandidate(issue.page);
  if (issue.url) addCandidate(issue.url);
  if (Array.isArray(issue.affectedPages)) issue.affectedPages.forEach(addCandidate);
  if (Array.isArray(issue.pages)) issue.pages.forEach(addCandidate);
  if (issue.location) addCandidate(issue.location);

  for (const candidate of candidates) {
    if (pageUrls.has(candidate)) {
      return true;
    }
  }
  return false;
}

function formatIssueSummary(issue) {
  const parts = [];
  if (issue.title) parts.push(`<strong>${escapeHtml(issue.title)}</strong>`);
  if (issue.description) parts.push(escapeHtml(issue.description));
  if (issue.recommendation) parts.push(`<em>Fix: ${escapeHtml(issue.recommendation)}</em>`);
  return parts.join(' &mdash; ');
}

function collectInsightsForPage(page, analysisResult = {}) {
  const modules = [
    { key: 'design_issues', label: 'Design' },
    { key: 'seo_issues', label: 'SEO' },
    { key: 'content_issues', label: 'Content' },
    { key: 'social_issues', label: 'Social' },
    { key: 'accessibility_issues', label: 'Accessibility' }
  ];

  const pageUrls = new Set(
    [normalizeRelativeUrl(page.url), normalizeRelativeUrl(page.fullUrl)].filter(Boolean)
  );

  const insights = [];

  for (const { key, label } of modules) {
    const relevant = (analysisResult[key] || []).filter(issue => issueMatchesPage(issue, pageUrls));
    if (relevant.length) {
      insights.push({
        label,
        items: relevant.map(formatIssueSummary)
      });
    }
  }

  return insights;
}

/**
 * Convert image file to base64 data URI
 */
async function imageToBase64(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  
  const trimmed = filePath.trim();
  
  // Already a data URI
  if (trimmed.startsWith('data:')) return trimmed;
  
  // Remote URL - can't embed
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed; // Return as-is
  }
  
  // Handle file:// URLs
  let actualPath = trimmed;
  if (trimmed.startsWith('file://')) {
    actualPath = fileURLToPath(trimmed);
  }
  
  // Check existence
  if (!existsSync(actualPath)) {
    console.warn(`[Screenshot] File not found: ${actualPath}`);
    return null;
  }
  
  try {
    const buffer = await readFile(actualPath);
    const base64 = buffer.toString('base64');
    
    // Detect MIME type
    const ext = actualPath.toLowerCase().split('.').pop();
    const mimeTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp',
      'gif': 'image/gif'
    };
    const mimeType = mimeTypes[ext] || 'image/png';
    
    return `data:${mimeType};base64,${base64}`;
  } catch (err) {
    console.error(`[Screenshot] Failed to embed ${actualPath}: ${err.message}`);
    return null;
  }
}

/**
 * Generate section showing all crawled pages with their screenshots
 */
export async function generateAllScreenshotsSection(crawlMetadata, analysisResult = {}) {
  if (!crawlMetadata) {
    return '';
  }
  
  // Support both field names: successful_pages (from tests) and pages_analyzed (from orchestrator)
  const allPages = crawlMetadata.successful_pages || crawlMetadata.pages_analyzed || crawlMetadata.pages;
  
  if (!allPages) {
    return '';
  }
  
  const pagesWithScreenshots = allPages.filter(p => 
    p.screenshot_paths && (p.screenshot_paths.desktop || p.screenshot_paths.mobile)
  );
  
  if (pagesWithScreenshots.length === 0) {
    return '';
  }
  
  let html = '<div class="section">\n';
  html += '  <h2>All Page Screenshots</h2>\n';
  html += `  <p class="text-secondary">Screenshots captured from ${pagesWithScreenshots.length} page(s) during analysis</p>\n\n`;
  
  for (const page of pagesWithScreenshots) {
    const pageTitle = page.title || page.url || 'Untitled Page';
    const pageUrl = page.url;
    
    html += '  <div style="margin: 2rem 0; padding: 1.5rem; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color);">\n';
    html += `    <h3 style="margin-bottom: 0.5rem; color: var(--accent-blue);">${escapeHtml(pageTitle)}</h3>\n`;
    html += `    <p class="text-secondary" style="margin-bottom: 1rem; font-size: 0.9em;">${escapeHtml(pageUrl)}</p>\n\n`;
    
    // Desktop screenshot
    if (page.screenshot_paths.desktop) {
      const desktopSrc = await imageToBase64(page.screenshot_paths.desktop);
      if (desktopSrc) {
        html += '    <div style="margin-bottom: 1.5rem;">\n';
        html += '      <h4 style="color: var(--text-secondary); font-size: 0.9em; margin-bottom: 0.5rem;">Desktop View</h4>\n';
        html += '      <div style="border: 1px solid #333; border-radius: 8px; overflow: hidden;">\n';
        html += `        <img src="${desktopSrc}" alt="Desktop screenshot of ${escapeHtml(pageTitle)}" style="width: 100%; display: block;" />\n`;
        html += '      </div>\n';
        html += '    </div>\n';
      }
    }
    
    // Mobile screenshot
    if (page.screenshot_paths.mobile) {
      const mobileSrc = await imageToBase64(page.screenshot_paths.mobile);
      if (mobileSrc) {
        html += '    <div>\n';
        html += '      <h4 style="color: var(--text-secondary); font-size: 0.9em; margin-bottom: 0.5rem;">Mobile View</h4>\n';
        html += '      <div style="max-width: 375px; border: 1px solid #333; border-radius: 8px; overflow: hidden;">\n';
        html += `        <img src="${mobileSrc}" alt="Mobile screenshot of ${escapeHtml(pageTitle)}" style="width: 100%; display: block;" />\n`;
        html += '      </div>\n';
        html += '    </div>\n';
      }
    }

    const insights = collectInsightsForPage(page, analysisResult);
    if (insights.length > 0) {
      html += '    <div style="margin-top: 1.25rem; padding: 1rem; background: var(--bg-muted); border-radius: 8px;">\n';
      html += '      <h4 style="margin-bottom: 0.75rem; color: var(--accent-blue); font-size: 0.95em;">Page-Specific Insights</h4>\n';
      insights.forEach(section => {
        html += `      <div style="margin-bottom: 0.75rem;">\n`;
        html += `        <h5 style="margin: 0 0 0.35rem; font-size: 0.85em; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">${escapeHtml(section.label)}</h5>\n`;
        html += '        <ul style="margin: 0; padding-left: 1.1rem; font-size: 0.9em; color: var(--text-muted-secondary);">\n';
        section.items.forEach(item => {
          html += `          <li style="margin-bottom: 0.35rem;">${item}</li>\n`;
        });
        html += '        </ul>\n';
        html += '      </div>\n';
      });
      html += '    </div>\n';
    }
    
    html += '  </div>\n';
  }
  
  html += '</div>\n\n';
  return html;
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

