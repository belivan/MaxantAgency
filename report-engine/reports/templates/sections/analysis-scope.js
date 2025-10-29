/**
 * Analysis Scope Section
 * Shows comprehensiveness of the analysis - pages discovered vs analyzed
 */

export function generateAnalysisScope(analysisResult) {
  const {
    pages_discovered,
    pages_crawled,
    pages_analyzed,
    ai_page_selection,
    analysis_time,
    analysis_cost,
    crawl_metadata
  } = analysisResult;

  // Skip if no scope data available
  if (!pages_discovered && !pages_crawled && !pages_analyzed && !crawl_metadata) {
    return '';
  }

  let output = `# 📊 Analysis Scope & Coverage\n\n`;

  // Page analysis statistics
  if (pages_discovered || pages_analyzed) {
    output += `## Page Coverage\n\n`;

    if (pages_discovered) {
      output += `**Pages Discovered:** ${pages_discovered}\n`;
    }

    if (pages_crawled) {
      output += `**Pages with Screenshots:** ${pages_crawled}\n`;
    }

    if (pages_analyzed) {
      output += `**Pages Analyzed by AI:** ${pages_analyzed}\n`;
    }

    // Calculate coverage percentage
    if (pages_discovered && pages_analyzed) {
      const coverage = Math.round((pages_analyzed / pages_discovered) * 100);
      output += `**Coverage:** ${coverage}% of discovered pages analyzed\n`;

      if (coverage < 50) {
        output += `\n*Note: Analysis focused on the most important pages. Additional pages can be analyzed for deeper insights.*\n`;
      }
    }

    output += '\n';
  }

  // AI page selection reasoning
  if (ai_page_selection) {
    output += `## AI Page Selection\n\n`;

    if (typeof ai_page_selection === 'object') {
      if (ai_page_selection.strategy) {
        output += `**Strategy:** ${ai_page_selection.strategy}\n`;
      }

      if (ai_page_selection.selected_pages) {
        output += `**Selected Pages:**\n`;
        if (Array.isArray(ai_page_selection.selected_pages)) {
          ai_page_selection.selected_pages.forEach(page => {
            output += `- ${page}\n`;
          });
        }
      }

      if (ai_page_selection.reasoning) {
        output += `\n**Reasoning:** ${ai_page_selection.reasoning}\n`;
      }
    } else {
      output += `${ai_page_selection}\n`;
    }

    output += '\n';
  }

  // Crawl metadata details
  if (crawl_metadata) {
    output += `## Crawl Details\n\n`;

    if (crawl_metadata.pages_crawled) {
      output += `**Total Pages Processed:** ${crawl_metadata.pages_crawled}\n`;
    }

    if (crawl_metadata.crawl_time) {
      const seconds = Math.round(crawl_metadata.crawl_time / 1000);
      output += `**Crawl Time:** ${seconds} seconds\n`;
    }

    if (crawl_metadata.failed_pages && crawl_metadata.failed_pages.length > 0) {
      output += `**Failed Pages:** ${crawl_metadata.failed_pages.length}\n`;

      if (crawl_metadata.failed_pages.length <= 5) {
        output += `Failed URLs:\n`;
        crawl_metadata.failed_pages.forEach(page => {
          output += `- ${page.url || page}\n`;
        });
      }
    }

    if (crawl_metadata.links_found) {
      output += `**Total Links Found:** ${crawl_metadata.links_found}\n`;
    }

    output += '\n';
  }

  // Analysis performance metrics
  if (analysis_time || analysis_cost) {
    output += `## Analysis Performance\n\n`;

    if (analysis_time) {
      const seconds = Math.round(analysis_time / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;

      if (minutes > 0) {
        output += `**Analysis Time:** ${minutes}m ${remainingSeconds}s\n`;
      } else {
        output += `**Analysis Time:** ${seconds} seconds\n`;
      }
    }

    if (analysis_cost) {
      output += `**Analysis Cost:** $${analysis_cost.toFixed(2)} USD\n`;
    }

    output += '\n';
  }

  output += `---\n\n`;

  return output;
}