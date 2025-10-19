const analyzeBtn = document.getElementById('analyzeBtn');
const urlsTextarea = document.getElementById('urls');
const emailTypeSelect = document.getElementById('emailType');
const textModelSelect = document.getElementById('textModel');
const visionModelSelect = document.getElementById('visionModel');

const depthTier1 = document.getElementById('depthTier1');
const depthTier2 = document.getElementById('depthTier2');
const depthTier3 = document.getElementById('depthTier3');

const moduleBasic = document.getElementById('moduleBasic');
const moduleIndustry = document.getElementById('moduleIndustry');
const moduleVisual = document.getElementById('moduleVisual');
const moduleSEO = document.getElementById('moduleSEO');
const moduleCompetitor = document.getElementById('moduleCompetitor');

const totalCostDisplay = document.getElementById('totalCost');
const totalTimeDisplay = document.getElementById('totalTime');
const critiqueCountDisplay = document.getElementById('critiqueCount');

const statusDiv = document.getElementById('status');
const resultsSection = document.getElementById('resultsSection');
const resultsDiv = document.getElementById('results');
const exportBtn = document.getElementById('exportBtn');
const progressSection = document.getElementById('progressSection');
const progressContainer = document.getElementById('progressContainer');

let currentResults = [];
let currentProgress = null;

// Cost configuration (per site)
// ALWAYS RUNS (included in every analysis):
const ALWAYS_RUNS_COST = 0.015;  // Grok AI only (email ops removed)  // Grok AI ($0.015) + Email Writing + Critique Reasoning + QA Review ($0.003)

const DEPTH_COSTS = {
  tier1: 0,      // 1 page (homepage only) - base cost
  tier2: 0.006,  // 3 pages - +2 additional pages analyzed
  tier3: 0.020   // 5-10 pages - full site crawl
};

const MODULE_COSTS = {
  industry: 0.003,  // Industry-specific analysis
  visual: 0.004,    // GPT-4o vision (per image)
  seo: 0.002,       // Technical SEO deep-dive
  competitor: 0.030 // Grok with web search + 3 competitor analyses
};

const MODEL_COSTS = {
  'gpt-5-mini': 0.003,         // Recommended - best cost/quality
  'gpt-5': 0.011,              // Most advanced
  'gpt-4o': 0.015,             // Vision-capable
  'claude-sonnet-4-5': 0.013,  // Anthropic premium
  'claude-haiku-4-5': 0.002,   // Cheapest option
};

const VISION_MODEL_COSTS = {
  'gpt-4o': 0.004,             // Recommended for screenshots
  'gpt-5': 0.011,              // Best quality
  'claude-sonnet-4-5': 0.020,  // Anthropic vision
};

// Event listeners
analyzeBtn.addEventListener('click', analyzeWebsites);
exportBtn.addEventListener('click', exportAllEmails);

// Auto-check Industry module when Competitor is checked (competitor requires industry)
moduleCompetitor.addEventListener('change', () => {
  if (moduleCompetitor.checked && !moduleIndustry.checked) {
    moduleIndustry.checked = true;
    updateCostEstimate();
  }
});

// Prevent unchecking Industry module if Competitor is checked
moduleIndustry.addEventListener('change', () => {
  if (!moduleIndustry.checked && moduleCompetitor.checked) {
    moduleIndustry.checked = true;
    alert('Industry-Specific Insights is required for AI Competitor Discovery. Uncheck Competitor Discovery first.');
  }
});

// Update cost estimate when anything changes
[textModelSelect, visionModelSelect, depthTier1, depthTier2, depthTier3, moduleIndustry, moduleVisual, moduleSEO, moduleCompetitor, urlsTextarea]
  .forEach(el => el.addEventListener('change', updateCostEstimate));
urlsTextarea.addEventListener('input', updateCostEstimate);

// Initial cost calculation
updateCostEstimate();

/**
 * Update real-time cost estimate
 */
function updateCostEstimate() {
  const urlsText = urlsTextarea.value.trim();
  const urls = urlsText.split('\n').filter(url => url.trim().length > 0);
  const siteCount = Math.max(urls.length, 1);

  // Get selected depth tier
  let depthTier = 'tier1';
  if (depthTier2.checked) depthTier = 'tier2';
  if (depthTier3.checked) depthTier = 'tier3';

  // Calculate cost per site
  // Start with costs that ALWAYS run (Grok AI + Email Writing + Critique Reasoning + QA Review)
  let costPerSite = ALWAYS_RUNS_COST;

  // Add selected text analysis model cost (Basic Analysis agent)
  costPerSite += MODEL_COSTS[textModelSelect.value] || 0.003;

  // Add depth tier cost (more pages = more API calls)
  costPerSite += DEPTH_COSTS[depthTier];

  // Add optional module costs
  if (moduleIndustry.checked) costPerSite += MODULE_COSTS.industry;
  if (moduleVisual.checked) costPerSite += VISION_MODEL_COSTS[visionModelSelect.value];
  if (moduleSEO.checked) costPerSite += MODULE_COSTS.seo;
  if (moduleCompetitor.checked) costPerSite += MODULE_COSTS.competitor;

  const totalCost = costPerSite * siteCount;

  // Calculate time estimate (base time varies by depth)
  let timePerSite = depthTier === 'tier1' ? 45 : depthTier === 'tier2' ? 120 : 300;

  if (moduleIndustry.checked) timePerSite += 15;
  if (moduleVisual.checked) timePerSite += 20;
  if (moduleSEO.checked) timePerSite += 10;
  if (moduleCompetitor.checked) timePerSite += 120;

  const totalTime = Math.ceil((timePerSite * siteCount) / 60);

  // Calculate critique count (varies by depth)
  let baseCritiques = depthTier === 'tier1' ? 3 : depthTier === 'tier2' ? 5 : 8;
  let critiqueCount = baseCritiques;

  if (moduleIndustry.checked) critiqueCount += 1;
  if (moduleVisual.checked) critiqueCount += 2;
  if (moduleSEO.checked) critiqueCount += 1;
  if (moduleCompetitor.checked) critiqueCount += 2;

  const maxCritiques = Math.min(critiqueCount, 12);

  // Update display
  totalCostDisplay.textContent = `$${totalCost.toFixed(3)}`;
  totalTimeDisplay.textContent = `~${totalTime} minute${totalTime > 1 ? 's' : ''}`;
  critiqueCountDisplay.textContent = `${baseCritiques}-${maxCritiques}`;
}

/**
 * Main analysis function
 */
async function analyzeWebsites() {
  const urlsText = urlsTextarea.value.trim();

  if (!urlsText) {
    showStatus('Please enter at least one URL', 'error');
    return;
  }

  // Parse URLs (one per line)
  const urls = urlsText
    .split('\n')
    .map(url => url.trim())
    .filter(url => url.length > 0);

  if (urls.length === 0) {
    showStatus('Please enter at least one valid URL', 'error');
    return;
  }

  if (urls.length > 10) {
    showStatus('Maximum 10 URLs allowed per batch', 'error');
    return;
  }

  // Validate URLs
  const invalidUrls = urls.filter(url => !isValidUrl(url));
  if (invalidUrls.length > 0) {
    showStatus(`Invalid URLs: ${invalidUrls.join(', ')}`, 'error');
    return;
  }

  // Get selected depth tier
  let depthTier = 'tier1';
  if (depthTier2.checked) depthTier = 'tier2';
  if (depthTier3.checked) depthTier = 'tier3';

  // Get Gmail drafts and Supabase checkboxes
  const saveToGmailDrafts = document.getElementById('saveToGmailDrafts');
  const saveToSupabase = document.getElementById('saveToSupabase');

  // Gather selected options
  const options = {
    urls,
    emailType: emailTypeSelect.value,
    textModel: textModelSelect.value,
    visionModel: visionModelSelect.value,
    depthTier: depthTier,
    modules: {
      basic: true, // always on
      industry: moduleIndustry.checked,
      visual: moduleVisual.checked,
      seo: moduleSEO.checked,
      competitor: moduleCompetitor.checked
    },
    saveToDrafts: saveToGmailDrafts ? saveToGmailDrafts.checked : false,
    saveToSupabase: saveToSupabase ? saveToSupabase.checked : true  // Default true
  };

  // Start analysis
  analyzeBtn.disabled = true;
  analyzeBtn.querySelector('.btn-text').classList.add('hidden');
  analyzeBtn.querySelector('.btn-loader').classList.remove('hidden');

  resultsSection.classList.add('hidden');
  resultsDiv.innerHTML = '';

  // Show progress section
  progressSection.classList.remove('hidden');
  progressContainer.innerHTML = '';

  showStatus(`Starting analysis of ${urls.length} website${urls.length > 1 ? 's' : ''}...`, 'loading');

  try {
    // Use Server-Sent Events for real-time progress
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    // Check if response is SSE
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      // Handle SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            handleProgressUpdate(data);

            // If complete or error, break
            if (data.type === 'complete' || data.type === 'error') {
              if (data.type === 'complete') {
                currentResults = data.results;
                displayResults(data.results);
                showStatus(`Successfully analyzed ${data.count} website${data.count > 1 ? 's' : ''}!`, 'success');
                resultsSection.classList.remove('hidden');
              } else {
                throw new Error(data.error);
              }
            }
          }
        }
      }
    } else {
      throw new Error('Expected SSE stream');
    }

  } catch (error) {
    console.error('Analysis error:', error);
    showStatus(`Error: ${error.message}`, 'error');
    progressSection.classList.add('hidden');
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.querySelector('.btn-text').classList.remove('hidden');
    analyzeBtn.querySelector('.btn-loader').classList.add('hidden');
  }
}

/**
 * Handle progress update from server
 */
function handleProgressUpdate(data) {
  console.log('Progress:', data);

  if (data.type === 'start') {
    // Analysis started
    currentProgress = {
      totalSites: data.totalSites,
      currentSite: 0,
      steps: []
    };
  } else if (data.type === 'cost_estimate') {
    // Show cost estimate before analysis starts
    const estimateDiv = document.createElement('div');
    estimateDiv.className = 'progress-cost-estimate';
    estimateDiv.innerHTML = `
      <div class="cost-info">
        <strong>💰 Cost Estimate:</strong> ${data.estimatedCalls} AI calls × ~$${(data.estimatedCost / data.estimatedCalls).toFixed(6)} = <strong>~$${data.estimatedCost.toFixed(4)}</strong>
      </div>
    `;
    progressContainer.appendChild(estimateDiv);
  } else if (data.type === 'cost_summary') {
    // Show final cost at the end
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'progress-cost-summary';
    summaryDiv.innerHTML = `
      <div class="cost-info success">
        <strong>✅ Final Cost:</strong> ${data.totalCalls} AI calls (${data.totalInputTokens.toLocaleString()} in + ${data.totalOutputTokens.toLocaleString()} out tokens) = <strong>$${data.totalCost.toFixed(4)}</strong>
      </div>
    `;
    progressContainer.appendChild(summaryDiv);
    
    // Update the total cost display in the header
    if (totalCostDisplay) {
      totalCostDisplay.textContent = `$${data.totalCost.toFixed(4)}`;
    }
  } else if (data.type === 'site_start') {
    // New site started
    currentProgress.currentSite = data.siteNum;
    currentProgress.steps = [];

    // Add site progress container
    const siteDiv = document.createElement('div');
    siteDiv.className = 'progress-site';
    siteDiv.id = `progress-site-${data.siteIndex}`;
    siteDiv.innerHTML = `
      <h4>${data.message}</h4>
      <div class="progress-steps" id="progress-steps-${data.siteIndex}"></div>
    `;
    progressContainer.appendChild(siteDiv);

  } else if (data.type === 'step') {
    // Step update
    const siteIndex = currentProgress.currentSite - 1;
    const stepsContainer = document.getElementById(`progress-steps-${siteIndex}`);

    if (stepsContainer) {
      // Add or update step
      const stepDiv = document.createElement('div');
      stepDiv.className = 'progress-step in-progress';
      stepDiv.textContent = data.message;
      stepsContainer.appendChild(stepDiv);

      // Mark previous step as completed
      const prevSteps = stepsContainer.querySelectorAll('.progress-step');
      if (prevSteps.length > 1) {
        prevSteps[prevSteps.length - 2].className = 'progress-step completed';
      }
    }

  } else if (data.type === 'site_complete') {
    // Site completed
    const siteIndex = data.siteIndex;
    const stepsContainer = document.getElementById(`progress-steps-${siteIndex}`);

    if (stepsContainer) {
      // Mark all steps as completed
      const steps = stepsContainer.querySelectorAll('.progress-step');
      steps.forEach(step => step.className = 'progress-step completed');

      // Add completion message
      const completeDiv = document.createElement('div');
      completeDiv.className = 'progress-step completed';
      completeDiv.textContent = data.message;
      completeDiv.style.fontWeight = 'bold';
      stepsContainer.appendChild(completeDiv);
    }
  }
}

/**
 * Display analysis results
 */
function displayResults(results) {
  resultsDiv.innerHTML = '';

  results.forEach((result, index) => {
    const card = document.createElement('div');
    card.className = `result-card ${result.error ? 'error' : ''}`;

    if (result.error) {
      card.innerHTML = `
        <div class="result-header">
          <h3>${result.url}</h3>
        </div>
        <div class="error-message">
          Error: ${result.error}
        </div>
      `;
    } else {
      // Build critiques HTML
      let critiquesHTML = '<div class="critiques"><h4>Key Issues Found:</h4><ol>';

      Object.keys(result.critiques).forEach(category => {
        if (result.critiques[category] && Array.isArray(result.critiques[category])) {
          result.critiques[category].forEach(critique => {
            critiquesHTML += `<li>${critique}</li>`;
          });
        }
      });

      critiquesHTML += '</ol></div>';

      card.innerHTML = `
        <div class="result-header">
          <div>
            <h3>${result.companyName}</h3>
            <p style="color: #666; font-size: 0.9rem; margin-top: 5px;">${result.url}</p>
          </div>
          <div class="result-meta">
            <div class="load-time">Load Time: ${(result.loadTime / 1000).toFixed(2)}s</div>
            ${result.analysisTime ? `<div style="margin-top: 5px; font-size: 0.9rem; color: #28a745;"><strong>Analysis Time:</strong> ${formatTimeDisplay(result.analysisTime)}</div>` : ''}
            ${result.cost ? `<div style="margin-top: 5px; font-size: 0.9rem; color: #007bff;"><strong>Cost:</strong> $${result.cost.toFixed(4)}</div>` : ''}
            ${result.modulesUsed ? `<div style="margin-top: 5px; font-size: 0.8rem;">Modules: ${result.modulesUsed.join(', ')}</div>` : ''}
          </div>
        </div>

        <div class="summary">
          ${result.summary}
        </div>

        ${critiquesHTML}

        ${result.competitorComparison ? `
          <div class="critiques">
            <h4>Competitor Analysis:</h4>
            <p style="margin: 10px 0; color: #555;">${result.competitorComparison}</p>
          </div>
        ` : ''}

        <div class="email-preview">
          <h4>Generated Outreach Email:</h4>
          <div class="email-subject">
            <strong>Subject:</strong> ${result.email.subject}
          </div>
          <div class="email-body">${result.email.body}</div>
        </div>

        <div class="result-actions">
          <button class="btn-copy" onclick="copyEmail(${index})">
            Copy Email to Clipboard
          </button>
        </div>
      `;
    }

    resultsDiv.appendChild(card);
  });
}

/**
 * Format time in seconds to human-readable format
 */
function formatTimeDisplay(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Copy email to clipboard
 */
function copyEmail(index) {
  const result = currentResults[index];
  const emailText = `Subject: ${result.email.subject}\n\n${result.email.body}`;

  navigator.clipboard.writeText(emailText).then(() => {
    const btn = document.querySelectorAll('.btn-copy')[index];
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    btn.style.background = '#28a745';
    btn.style.color = 'white';
    btn.style.borderColor = '#28a745';

    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 2000);
  }).catch(err => {
    alert('Failed to copy to clipboard');
    console.error('Copy error:', err);
  });
}

/**
 * Export all emails
 */
function exportAllEmails() {
  if (currentResults.length === 0) return;

  let exportText = '# Maksant Website Audit - Email Outreach Templates\n';
  exportText += `Generated: ${new Date().toLocaleString()}\n`;
  exportText += `Total Websites Analyzed: ${currentResults.length}\n\n`;
  exportText += '=' .repeat(80) + '\n\n';

  currentResults.forEach((result, index) => {
    if (result.error) {
      exportText += `## ${index + 1}. ${result.url}\n`;
      exportText += `ERROR: ${result.error}\n\n`;
      exportText += '-'.repeat(80) + '\n\n';
      return;
    }

    exportText += `## ${index + 1}. ${result.companyName}\n`;
    exportText += `URL: ${result.url}\n`;
    exportText += `Load Time: ${(result.loadTime / 1000).toFixed(2)}s\n`;
    if (result.analysisTime) exportText += `Analysis Time: ${formatTimeDisplay(result.analysisTime)}\n`;
    if (result.cost) exportText += `Cost: $${result.cost.toFixed(4)}\n`;
    exportText += '\n';

    exportText += `### Analysis Summary\n`;
    exportText += `${result.summary}\n\n`;

    exportText += `### Key Issues\n`;
    Object.keys(result.critiques).forEach(category => {
      if (result.critiques[category] && Array.isArray(result.critiques[category])) {
        result.critiques[category].forEach((critique, i) => {
          exportText += `${i + 1}. ${critique}\n`;
        });
      }
    });
    exportText += '\n';

    if (result.competitorComparison) {
      exportText += `### Competitor Analysis\n`;
      exportText += `${result.competitorComparison}\n\n`;
    }

    exportText += `### Email Template\n\n`;
    exportText += `**Subject:** ${result.email.subject}\n\n`;
    exportText += `**Body:**\n${result.email.body}\n\n`;
    exportText += '='.repeat(80) + '\n\n';
  });

  // Download as text file
  const blob = new Blob([exportText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `maksant-outreach-emails-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showStatus('Emails exported successfully!', 'success');
}

/**
 * Show status message
 */
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove('hidden');

  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusDiv.classList.add('hidden');
    }, 5000);
  }
}

/**
 * Validate URL
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Allow Ctrl+Enter in textarea to submit
urlsTextarea.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    analyzeWebsites();
  }
});
