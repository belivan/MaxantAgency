/**
 * Business Intelligence Section
 */

import { createBusinessIntelTable } from '../../formatters/table-formatter.js';

export function generateBusinessIntelSection(analysisResult) {
  const { business_intelligence, crawl_metadata } = analysisResult;

  if (!business_intelligence || Object.keys(business_intelligence).length === 0) {
    return ''; // Skip if no business intelligence data
  }

  let output = `# 7. Business Intelligence\n\n`;

  output += `This section provides insights about the business derived from multi-page crawling and content analysis.\n\n`;

  // Company Profile
  output += `## 🏢 Company Profile\n\n`;
  output += createBusinessIntelTable(business_intelligence);

  // Crawl Statistics
  if (crawl_metadata) {
    output += `## 📊 Website Analysis Scope\n\n`;
    output += `| Metric | Value |\n`;
    output += `|--------|-------|\n`;

    if (crawl_metadata.pages_crawled) {
      output += `| **Pages Analyzed** | ${crawl_metadata.pages_crawled} |\n`;
    }

    if (crawl_metadata.links_found) {
      output += `| **Links Discovered** | ${crawl_metadata.links_found} |\n`;
    }

    if (crawl_metadata.crawl_time) {
      const crawlSeconds = (crawl_metadata.crawl_time / 1000).toFixed(1);
      output += `| **Crawl Time** | ${crawlSeconds}s |\n`;
    }

    if (crawl_metadata.failed_pages) {
      output += `| **Failed Pages** | ${crawl_metadata.failed_pages} |\n`;
    }

    output += '\n';
  }

  output += `---\n\n`;

  return output;
}
