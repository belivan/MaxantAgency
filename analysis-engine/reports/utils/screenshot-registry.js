/**
 * Screenshot Registry System
 *
 * Manages screenshot references throughout HTML reports.
 * Screenshots are displayed in an appendix at the end with clickable references.
 */

export class ScreenshotRegistry {
  constructor() {
    this.screenshots = [];
    this.counter = 1;
  }

  /**
   * Register a screenshot and get its reference ID
   * @param {object} screenshot - Screenshot details
   * @param {string} screenshot.title - Screenshot title (e.g., "Homepage - Desktop View")
   * @param {string} screenshot.viewport - 'desktop' or 'mobile'
   * @param {string} screenshot.page - Page URL or name
   * @param {string} screenshot.src - Base64 data URI or URL
   * @param {string} [screenshot.description] - Optional description
   * @returns {string} Reference ID (e.g., "SS-1")
   */
  register(screenshot) {
    const id = `SS-${this.counter++}`;
    this.screenshots.push({
      id,
      title: screenshot.title || `Screenshot ${this.counter - 1}`,
      viewport: screenshot.viewport || 'desktop',
      page: screenshot.page || '',
      src: screenshot.src,
      description: screenshot.description || '',
      referencedIn: []
    });
    return id;
  }

  /**
   * Add a reference to where this screenshot is used
   * @param {string} id - Screenshot ID (e.g., "SS-1")
   * @param {string} sectionName - Section name (e.g., "Executive Summary")
   */
  addReference(id, sectionName) {
    const screenshot = this.screenshots.find(s => s.id === id);
    if (screenshot && !screenshot.referencedIn.includes(sectionName)) {
      screenshot.referencedIn.push(sectionName);
    }
  }

  /**
   * Get clickable reference link HTML
   * @param {string} id - Screenshot ID (e.g., "SS-1")
   * @returns {string} HTML anchor link
   */
  getReference(id) {
    const screenshot = this.screenshots.find(s => s.id === id);
    if (!screenshot) return `[${id}]`;

    return `<a href="#${id}" class="screenshot-ref" title="${this.escapeHtml(screenshot.title)}">[${id}]</a>`;
  }

  /**
   * Get multiple references as a space-separated string
   * @param {string[]} ids - Array of screenshot IDs
   * @returns {string} HTML with multiple reference links
   */
  getReferences(ids) {
    if (!ids || ids.length === 0) return '';
    return ids.map(id => this.getReference(id)).join(' ');
  }

  /**
   * Check if a screenshot reference exists
   * @param {string} id - Screenshot ID
   * @returns {boolean} True if screenshot exists
   */
  hasReference(id) {
    return this.screenshots.some(s => s.id === id);
  }

  /**
   * Get screenshot by ID
   * @param {string} id - Screenshot ID
   * @returns {object|null} Screenshot object or null
   */
  getScreenshot(id) {
    return this.screenshots.find(s => s.id === id) || null;
  }

  /**
   * Get all screenshots for a specific viewport
   * @param {string} viewport - 'desktop' or 'mobile'
   * @returns {array} Array of screenshots
   */
  getByViewport(viewport) {
    return this.screenshots.filter(s => s.viewport === viewport);
  }

  /**
   * Get total count of registered screenshots
   * @returns {number}
   */
  getCount() {
    return this.screenshots.length;
  }

  /**
   * Generate the screenshots appendix HTML section
   * @returns {string} HTML for appendix section
   */
  generateAppendixHTML() {
    if (this.screenshots.length === 0) {
      return '';
    }

    let html = '<div class="section" id="appendix-screenshots">\n';
    html += '  <h2>📸 Appendix: Screenshots</h2>\n';
    html += '  <p class="text-secondary">Visual evidence referenced throughout this report. Click any reference link above to jump to the corresponding screenshot.</p>\n\n';

    // Group by viewport
    const desktopScreenshots = this.getByViewport('desktop');
    const mobileScreenshots = this.getByViewport('mobile');

    if (desktopScreenshots.length > 0) {
      html += '  <h3>Desktop Screenshots</h3>\n';
      html += '  <div class="screenshot-grid">\n';
      desktopScreenshots.forEach(screenshot => {
        html += this.generateScreenshotHTML(screenshot);
      });
      html += '  </div>\n\n';
    }

    if (mobileScreenshots.length > 0) {
      html += '  <h3>Mobile Screenshots</h3>\n';
      html += '  <div class="screenshot-grid">\n';
      mobileScreenshots.forEach(screenshot => {
        html += this.generateScreenshotHTML(screenshot);
      });
      html += '  </div>\n\n';
    }

    html += '</div>\n\n';
    return html;
  }

  /**
   * Generate HTML for a single screenshot
   * @param {object} screenshot - Screenshot object
   * @returns {string} HTML
   */
  generateScreenshotHTML(screenshot) {
    let html = `  <div class="screenshot-grid-item" id="${screenshot.id}">\n`;
    html += `    <div class="screenshot-id-badge">${screenshot.id}</div>\n`;

    if (screenshot.src) {
      html += `    <img src="${screenshot.src}" alt="${this.escapeHtml(screenshot.title)}" class="screenshot-thumbnail" loading="lazy" />\n`;
    } else {
      html += `    <div class="screenshot-placeholder">Not available</div>\n`;
    }

    html += `    <div class="screenshot-caption">\n`;
    html += `      <div class="screenshot-title">${this.escapeHtml(screenshot.title)}</div>\n`;
    if (screenshot.referencedIn.length > 0) {
      html += `      <div class="screenshot-refs">Ref: ${screenshot.referencedIn.join(', ')}</div>\n`;
    }
    html += `    </div>\n`;

    html += `  </div>\n\n`;
    return html;
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Generate a summary of the registry (for debugging)
   * @returns {object} Summary statistics
   */
  getSummary() {
    return {
      total: this.screenshots.length,
      desktop: this.getByViewport('desktop').length,
      mobile: this.getByViewport('mobile').length,
      mostReferenced: this.screenshots
        .sort((a, b) => b.referencedIn.length - a.referencedIn.length)
        .slice(0, 3)
        .map(s => ({ id: s.id, title: s.title, references: s.referencedIn.length }))
    };
  }
}

export default ScreenshotRegistry;
