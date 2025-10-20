/**
 * Report Generator - Creates beautiful HTML reports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ReportGenerator {
  constructor() {
    this.data = {
      timestamp: new Date().toISOString(),
      dateFormatted: new Date().toLocaleString(),
      agents: [],
      integration: [],
      performance: [],
      codeQuality: [],
      summary: {
        totalChecks: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        skipped: 0
      }
    };
  }

  /**
   * Add agent validation results
   */
  addAgentResults(results) {
    this.data.agents.push(results);

    this.data.summary.totalChecks += results.passed + results.errors + (results.warnings || 0);
    this.data.summary.passed += results.passed;
    this.data.summary.failed += results.errors;
    this.data.summary.warnings += results.warnings || 0;
  }

  /**
   * Add integration test results
   */
  addIntegrationResults(results) {
    this.data.integration = results.tests || [];
    this.data.summary.passed += results.passed || 0;
    this.data.summary.failed += results.failed || 0;
    this.data.summary.skipped += results.skipped || 0;
  }

  /**
   * Add performance test results
   */
  addPerformanceResults(results) {
    this.data.performance = results.tests || [];
    this.data.summary.passed += results.passed || 0;
    this.data.summary.failed += results.failed || 0;
    this.data.summary.skipped += results.skipped || 0;
  }

  /**
   * Add code quality results
   */
  addCodeQualityResults(results) {
    this.data.codeQuality = results.agents || [];
  }

  /**
   * Generate HTML report
   */
  generateHTML() {
    const html = this.buildHTML();

    // Ensure reports directory exists
    const reportsDir = path.join(__dirname);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Write to file
    const outputPath = path.join(reportsDir, 'qa-report.html');
    fs.writeFileSync(outputPath, html);

    return outputPath;
  }

  /**
   * Build complete HTML document
   */
  buildHTML() {
    const passRate = this.data.summary.totalChecks > 0
      ? ((this.data.summary.passed / this.data.summary.totalChecks) * 100).toFixed(1)
      : 0;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Supervisor Report - ${this.data.dateFormatted}</title>
  ${this.getStyles()}
</head>
<body>
  <div class="container">
    ${this.generateHeader()}
    ${this.generateSummaryCards()}
    ${this.generateAgentSection()}
    ${this.generateIntegrationSection()}
    ${this.generatePerformanceSection()}
    ${this.generateCodeQualitySection()}
    ${this.generateFooter()}
  </div>
  ${this.getScripts()}
</body>
</html>`;
  }

  /**
   * Generate header
   */
  generateHeader() {
    return `
    <header>
      <div class="header-content">
        <h1>🔍 QA Supervisor Report</h1>
        <p class="subtitle">Comprehensive Quality Assurance Analysis</p>
        <p class="timestamp">Generated: ${this.data.dateFormatted}</p>
      </div>
    </header>`;
  }

  /**
   * Generate summary cards
   */
  generateSummaryCards() {
    const { summary } = this.data;
    const passRate = summary.totalChecks > 0
      ? ((summary.passed / summary.totalChecks) * 100).toFixed(1)
      : 0;

    return `
    <section class="summary-section">
      <h2>📊 Summary</h2>
      <div class="summary-cards">
        <div class="summary-card total">
          <div class="card-icon">📋</div>
          <div class="card-content">
            <div class="card-value">${summary.totalChecks}</div>
            <div class="card-label">Total Checks</div>
          </div>
        </div>

        <div class="summary-card passed">
          <div class="card-icon">✅</div>
          <div class="card-content">
            <div class="card-value">${summary.passed}</div>
            <div class="card-label">Passed</div>
            <div class="card-percent">${passRate}%</div>
          </div>
        </div>

        <div class="summary-card failed">
          <div class="card-icon">❌</div>
          <div class="card-content">
            <div class="card-value">${summary.failed}</div>
            <div class="card-label">Failed</div>
          </div>
        </div>

        <div class="summary-card warnings">
          <div class="card-icon">⚠️</div>
          <div class="card-content">
            <div class="card-value">${summary.warnings}</div>
            <div class="card-label">Warnings</div>
          </div>
        </div>

        ${summary.skipped > 0 ? `
        <div class="summary-card skipped">
          <div class="card-icon">⏭️</div>
          <div class="card-content">
            <div class="card-value">${summary.skipped}</div>
            <div class="card-label">Skipped</div>
          </div>
        </div>` : ''}
      </div>

      <div class="progress-bar-container">
        <div class="progress-bar">
          <div class="progress-fill passed" style="width: ${passRate}%"></div>
        </div>
        <p class="progress-text">${passRate}% Pass Rate</p>
      </div>
    </section>`;
  }

  /**
   * Generate agent validation section
   */
  generateAgentSection() {
    if (!this.data.agents || this.data.agents.length === 0) {
      return '';
    }

    const agentCards = this.data.agents.map(agent => {
      const total = agent.passed + agent.errors + (agent.warnings || 0);
      const passRate = total > 0 ? ((agent.passed / total) * 100).toFixed(0) : 0;
      const status = agent.errors === 0 ? 'success' : 'error';

      return `
      <div class="agent-card ${status}">
        <div class="agent-header">
          <h3>${agent.agent}</h3>
          <div class="agent-badge ${status}">${agent.errors === 0 ? '✅ PASS' : '❌ FAIL'}</div>
        </div>

        <div class="agent-stats">
          <div class="stat">
            <span class="stat-label">Passed:</span>
            <span class="stat-value success">${agent.passed}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Failed:</span>
            <span class="stat-value error">${agent.errors}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Warnings:</span>
            <span class="stat-value warning">${agent.warnings || 0}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Pass Rate:</span>
            <span class="stat-value">${passRate}%</span>
          </div>
        </div>

        ${agent.details && agent.details.length > 0 ? `
        <details class="agent-details">
          <summary>View Details (${agent.details.length} checks)</summary>
          <div class="details-content">
            ${this.generateAgentDetails(agent.details)}
          </div>
        </details>` : ''}
      </div>`;
    }).join('');

    return `
    <section class="agents-section">
      <h2>🤖 Agent Validation Results</h2>
      <div class="agents-grid">
        ${agentCards}
      </div>
    </section>`;
  }

  /**
   * Generate agent details
   */
  generateAgentDetails(details) {
    const grouped = {};

    for (const detail of details) {
      if (!grouped[detail.category]) {
        grouped[detail.category] = [];
      }
      grouped[detail.category].push(detail);
    }

    return Object.entries(grouped).map(([category, items]) => `
      <div class="detail-category">
        <h4>${category}</h4>
        <ul class="detail-list">
          ${items.map(item => `
            <li class="detail-item ${item.status}">
              <span class="detail-icon">${item.status === 'pass' ? '✅' : item.status === 'warn' ? '⚠️' : '❌'}</span>
              <span class="detail-name">${item.name}</span>
              ${item.message ? `<span class="detail-message">${item.message}</span>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('');
  }

  /**
   * Generate integration tests section
   */
  generateIntegrationSection() {
    if (!this.data.integration || this.data.integration.length === 0) {
      return '';
    }

    const testCards = this.data.integration.map(test => {
      const status = test.passed ? 'success' : test.skipped ? 'skipped' : 'error';
      const icon = test.passed ? '✅' : test.skipped ? '⏭️' : '❌';

      return `
      <div class="test-card ${status}">
        <div class="test-icon">${icon}</div>
        <div class="test-content">
          <h4>${test.name}</h4>
          ${test.error ? `<p class="test-error">${test.error}</p>` : ''}
          ${test.message ? `<p class="test-message">${test.message}</p>` : ''}
        </div>
      </div>`;
    }).join('');

    return `
    <section class="integration-section">
      <h2>🔗 Integration Tests</h2>
      <div class="test-grid">
        ${testCards}
      </div>
    </section>`;
  }

  /**
   * Generate performance tests section
   */
  generatePerformanceSection() {
    if (!this.data.performance || this.data.performance.length === 0) {
      return '';
    }

    const perfCards = this.data.performance.map(test => {
      const status = test.passed ? 'success' : test.skipped ? 'skipped' : 'error';
      const icon = test.passed ? '✅' : test.skipped ? '⏭️' : '❌';

      return `
      <div class="test-card ${status}">
        <div class="test-icon">${icon}</div>
        <div class="test-content">
          <h4>${test.name}</h4>
          ${test.durationFormatted ? `<p class="test-metric">Duration: ${test.durationFormatted}</p>` : ''}
          ${test.error ? `<p class="test-error">${test.error}</p>` : ''}
          ${test.message ? `<p class="test-message">${test.message}</p>` : ''}
        </div>
      </div>`;
    }).join('');

    return `
    <section class="performance-section">
      <h2>⚡ Performance Tests</h2>
      <div class="test-grid">
        ${perfCards}
      </div>
    </section>`;
  }

  /**
   * Generate code quality section
   */
  generateCodeQualitySection() {
    if (!this.data.codeQuality || this.data.codeQuality.length === 0) {
      return '';
    }

    const qualityCards = this.data.codeQuality.map(agent => {
      const securityStatus = agent.security?.passed ? 'success' : 'error';
      const errorHandlingStatus = agent.errorHandling?.passed ? 'success' : 'warning';

      return `
      <div class="quality-card">
        <h4>${agent.name}</h4>

        <div class="quality-metric">
          <span class="metric-label">🔒 Security Scan:</span>
          <span class="metric-value ${securityStatus}">
            ${agent.security?.passed ? 'Clean' : `${agent.security?.issues?.length || 0} issues`}
          </span>
        </div>

        <div class="quality-metric">
          <span class="metric-label">⚙️ Error Handling:</span>
          <span class="metric-value ${errorHandlingStatus}">
            ${agent.errorHandling?.coverage || 0}%
          </span>
        </div>
      </div>`;
    }).join('');

    return `
    <section class="quality-section">
      <h2>🔍 Code Quality</h2>
      <div class="quality-grid">
        ${qualityCards}
      </div>
    </section>`;
  }

  /**
   * Generate footer
   */
  generateFooter() {
    return `
    <footer>
      <p>Generated by QA Supervisor v1.0.0</p>
      <p>Maxant Agency - Automated Quality Assurance System</p>
    </footer>`;
  }

  /**
   * Get CSS styles
   */
  getStyles() {
    return `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      color: #333;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      background: white;
      border-radius: 16px;
      padding: 40px;
      margin-bottom: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      text-align: center;
    }

    h1 {
      font-size: 48px;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      font-size: 20px;
      color: #666;
      margin-bottom: 10px;
    }

    .timestamp {
      color: #999;
      font-size: 14px;
    }

    section {
      background: white;
      border-radius: 16px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    h2 {
      font-size: 28px;
      margin-bottom: 25px;
      color: #333;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .summary-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 25px;
      color: white;
      display: flex;
      align-items: center;
      gap: 15px;
      transition: transform 0.2s;
    }

    .summary-card:hover {
      transform: translateY(-5px);
    }

    .summary-card.passed {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }

    .summary-card.failed {
      background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
    }

    .summary-card.warnings {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .summary-card.skipped {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }

    .card-icon {
      font-size: 36px;
    }

    .card-value {
      font-size: 36px;
      font-weight: bold;
    }

    .card-label {
      font-size: 14px;
      opacity: 0.9;
    }

    .card-percent {
      font-size: 12px;
      opacity: 0.8;
      margin-top: 5px;
    }

    .progress-bar-container {
      margin-top: 20px;
    }

    .progress-bar {
      height: 30px;
      background: #f0f0f0;
      border-radius: 15px;
      overflow: hidden;
      margin-bottom: 10px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%);
      transition: width 0.3s;
    }

    .progress-text {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      color: #666;
    }

    .agents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }

    .agent-card {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s;
    }

    .agent-card:hover {
      box-shadow: 0 5px 20px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }

    .agent-card.success {
      border-color: #38ef7d;
    }

    .agent-card.error {
      border-color: #f45c43;
    }

    .agent-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .agent-header h3 {
      font-size: 18px;
      color: #333;
    }

    .agent-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
    }

    .agent-badge.success {
      background: #d4edda;
      color: #155724;
    }

    .agent-badge.error {
      background: #f8d7da;
      color: #721c24;
    }

    .agent-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 15px;
    }

    .stat {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      background: #f9f9f9;
      border-radius: 8px;
    }

    .stat-label {
      color: #666;
      font-size: 14px;
    }

    .stat-value {
      font-weight: bold;
      font-size: 16px;
    }

    .stat-value.success {
      color: #38ef7d;
    }

    .stat-value.error {
      color: #f45c43;
    }

    .stat-value.warning {
      color: #f5576c;
    }

    .agent-details summary {
      cursor: pointer;
      padding: 10px;
      background: #f0f0f0;
      border-radius: 8px;
      user-select: none;
    }

    .agent-details summary:hover {
      background: #e0e0e0;
    }

    .details-content {
      margin-top: 15px;
    }

    .detail-category {
      margin-bottom: 20px;
    }

    .detail-category h4 {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .detail-list {
      list-style: none;
    }

    .detail-item {
      padding: 8px;
      margin-bottom: 5px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .detail-item.pass {
      background: #d4edda;
    }

    .detail-item.warn {
      background: #fff3cd;
    }

    .detail-item.fail {
      background: #f8d7da;
    }

    .detail-message {
      font-size: 12px;
      color: #666;
      margin-left: auto;
    }

    .test-grid, .quality-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .test-card, .quality-card {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      gap: 15px;
    }

    .test-card.success {
      border-color: #38ef7d;
      background: #f0fff4;
    }

    .test-card.error {
      border-color: #f45c43;
      background: #fff5f5;
    }

    .test-card.skipped {
      border-color: #4facfe;
      background: #f0f9ff;
    }

    .test-icon {
      font-size: 32px;
    }

    .test-content {
      flex: 1;
    }

    .test-content h4 {
      margin-bottom: 8px;
      color: #333;
    }

    .test-metric {
      font-size: 14px;
      color: #666;
      margin-bottom: 5px;
    }

    .test-error {
      color: #f45c43;
      font-size: 14px;
    }

    .test-message {
      color: #666;
      font-size: 14px;
      font-style: italic;
    }

    .quality-metric {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      background: #f9f9f9;
      border-radius: 8px;
      margin-bottom: 10px;
    }

    .metric-value.success {
      color: #38ef7d;
      font-weight: bold;
    }

    .metric-value.error {
      color: #f45c43;
      font-weight: bold;
    }

    .metric-value.warning {
      color: #f5576c;
      font-weight: bold;
    }

    footer {
      background: white;
      border-radius: 16px;
      padding: 30px;
      text-align: center;
      color: #666;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    footer p {
      margin: 5px 0;
    }

    @media print {
      body {
        background: white;
      }

      .container {
        max-width: 100%;
      }
    }
  </style>`;
  }

  /**
   * Get JavaScript
   */
  getScripts() {
    return `
  <script>
    // Smooth scroll for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Print functionality
    function printReport() {
      window.print();
    }

    console.log('QA Supervisor Report loaded successfully');
  </script>`;
  }
}

export default ReportGenerator;
