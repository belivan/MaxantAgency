# QA & INTEGRATION SUPERVISOR - Technical Specification
Version: 2.0
Agent Assignment: Agent 7
Status: NEW UTILITY - BUILD FROM SCRATCH

═══════════════════════════════════════════════════════════════════

## 1. PURPOSE & SCOPE

### What This Agent Does:
The QA & Integration Supervisor is your "Technical Lead" - it oversees all other
agents to ensure they're building correctly, following specs, and integrating
properly. Think of it as the quality assurance team + integration testing + code
review all rolled into one automated agent.

### What This Agent Does NOT Do:
- Does NOT write production code (only test code)
- Does NOT replace other agents
- Does NOT run as a service (it's a CLI testing tool)

### Core Philosophy:
"Trust, but verify - automated quality assurance for all agents"

═══════════════════════════════════════════════════════════════════

## 2. WHAT IT CHECKS

### For Each Agent (1-6):

**1. SPEC COMPLIANCE**
✅ Does the code match the specification?
✅ Are all required files present?
✅ Are all required API endpoints implemented?
✅ Are all prompts externalized to JSON files?

**2. CODE QUALITY**
✅ Consistent naming conventions
✅ Proper error handling
✅ Structured logging
✅ No hardcoded credentials
✅ Comments for complex logic

**3. INTEGRATION**
✅ Can Agent 1 → Agent 2 pass data correctly?
✅ Can Agent 2 → Agent 3 pass data correctly?
✅ Do all APIs return expected formats?
✅ Do SSE connections work?

**4. PERFORMANCE**
✅ Meets speed requirements (e.g., 20 prospects in <3 min)
✅ Meets cost requirements (e.g., <$0.15 per lead)
✅ No memory leaks
✅ Handles timeouts gracefully

**5. DATABASE**
✅ All tables exist
✅ All columns match specs
✅ Foreign keys work
✅ Indexes created

**6. SECURITY**
✅ No API keys in code
✅ Environment variables used correctly
✅ Input validation present
✅ SQL injection prevention

═══════════════════════════════════════════════════════════════════

## 3. FILE STRUCTURE

qa-supervisor/
├── package.json
├── cli.js                         # Main CLI entrypoint
│
├── validators/                    # Spec compliance checks
│   ├── agent1-validator.js        # Check Agent 1 compliance
│   ├── agent2-validator.js        # Check Agent 2 compliance
│   ├── agent3-validator.js        # Check Agent 3 compliance
│   ├── agent4-validator.js        # Check Agent 4 compliance
│   ├── agent5-validator.js        # Check Agent 5 compliance
│   ├── agent6-validator.js        # Check Agent 6 compliance
│   └── index.js
│
├── integration-tests/             # Cross-agent tests
│   ├── test-prospect-to-lead.js   # Agent 1 → Agent 2
│   ├── test-lead-to-email.js      # Agent 2 → Agent 3
│   ├── test-full-pipeline.js      # End-to-end test
│   ├── test-ui-integration.js     # UI → All engines
│   └── test-orchestrator.js       # Agent 6 → All
│
├── performance-tests/             # Speed & cost tests
│   ├── test-prospecting-speed.js  # 20 prospects in <3min
│   ├── test-analysis-speed.js     # 10 websites in <5min
│   ├── test-cost-tracking.js      # Verify cost estimates
│   └── load-test.js               # 100 leads stress test
│
├── code-quality/                  # Static analysis
│   ├── check-naming.js            # Naming conventions
│   ├── check-error-handling.js    # Try/catch coverage
│   ├── check-logging.js           # Structured logging
│   ├── check-security.js          # Security issues
│   └── check-prompts.js           # Prompts externalized
│
├── database-tests/                # Database validation
│   ├── test-schema-compliance.js  # Tables match specs
│   ├── test-foreign-keys.js       # FK constraints work
│   ├── test-indexes.js            # Indexes exist
│   └── test-migrations.js         # Migrations run
│
├── checklists/                    # Agent checklists
│   ├── agent1-checklist.json
│   ├── agent2-checklist.json
│   ├── agent3-checklist.json
│   ├── agent4-checklist.json
│   ├── agent5-checklist.json
│   └── agent6-checklist.json
│
├── reports/                       # Generated reports
│   ├── qa-report.html
│   ├── integration-report.html
│   └── performance-report.html
│
└── shared/
    ├── test-utils.js
    └── logger.js

═══════════════════════════════════════════════════════════════════

## 4. CLI COMMANDS

### 4.1 Check All Agents

```bash
npm run qa:check
# or
node cli.js check
```

**What it does:**
1. Runs all validation checks
2. Runs all integration tests
3. Runs performance tests
4. Generates comprehensive report

**Example Output:**
```
🔍 QA SUPERVISOR - Checking All Agents
═══════════════════════════════════════════════════════════════

📦 AGENT 1: Prospecting Engine
   ✅ File structure matches spec
   ✅ All API endpoints present
   ✅ Prompts externalized (3/3)
   ✅ Database schema valid
   ⚠️  WARNING: Missing error handling in social-scraper.js:45
   ✅ Integration test passed (Agent 1 → Agent 2)
   ✅ Performance: 20 prospects in 2.8s ✓
   ✅ Cost: $0.09 per prospect ✓

📦 AGENT 2: Analysis Engine
   ✅ File structure matches spec
   ✅ All API endpoints present
   ✅ Prompts externalized (4/4)
   ❌ ERROR: Missing SEO analyzer module
   ✅ Database schema valid
   ✅ Integration test passed (Agent 2 → Agent 3)
   ⚠️  Performance: 10 sites in 6.2s (target: <5min) - SLOW
   ✅ Cost: $0.14 per lead ✓

📦 AGENT 3: Outreach Engine
   ✅ File structure matches spec
   ✅ All API endpoints present
   ✅ Prompts externalized (6/6)
   ✅ Database schema valid
   ✅ Email validation working
   ✅ SMTP sending working
   ⚠️  WARNING: Notion sync not configured
   ✅ Performance: Email generation 1.8s ✓
   ✅ Cost: $0.003 per email ✓

📦 AGENT 4: Command Center UI
   ✅ All 7 tabs implemented
   ✅ SSE connections working
   ⚠️  WARNING: Analytics tab has no data
   ✅ API integration tests passed
   ✅ Responsive design verified

📦 AGENT 5: Database Setup Tool
   ✅ CLI commands working
   ✅ SQL generation correct
   ✅ All tables created successfully
   ✅ Migrations working

📦 AGENT 6: Pipeline Orchestrator
   ✅ Campaign scheduler working
   ✅ All step executors implemented
   ✅ Budget enforcement working
   ✅ End-to-end pipeline test passed

═══════════════════════════════════════════════════════════════
📊 SUMMARY
═══════════════════════════════════════════════════════════════

Total Checks: 87
✅ Passed: 82
⚠️  Warnings: 4
❌ Errors: 1

Critical Issues:
  ❌ Agent 2: Missing SEO analyzer module

Performance Issues:
  ⚠️  Agent 2: Analysis slower than spec (6.2s vs 5min target)

Integration Status: ✅ ALL PASSING
  ✅ Agent 1 → Agent 2
  ✅ Agent 2 → Agent 3
  ✅ Agent 4 → All engines
  ✅ Agent 6 → End-to-end pipeline

═══════════════════════════════════════════════════════════════

📄 Full report saved to: reports/qa-report.html
```

---

### 4.2 Check Single Agent

```bash
npm run qa:check -- --agent 1
# or
node cli.js check --agent 2
```

**Focuses on one agent only.**

---

### 4.3 Integration Tests Only

```bash
npm run qa:integration
```

**Runs cross-agent integration tests:**
- Agent 1 → Agent 2 data flow
- Agent 2 → Agent 3 data flow
- Full pipeline end-to-end
- UI → All engines
- Orchestrator → All engines

---

### 4.4 Performance Tests

```bash
npm run qa:performance
```

**Runs performance benchmarks:**
- Prospecting speed (20 companies)
- Analysis speed (10 websites)
- Email generation speed
- Database query performance
- API response times

---

### 4.5 Generate Report

```bash
npm run qa:report
```

**Generates HTML report with:**
- All test results
- Performance charts
- Code quality scores
- Integration status
- Recommendations

═══════════════════════════════════════════════════════════════════

## 5. AGENT CHECKLISTS

### Agent 1 Checklist

File: checklists/agent1-checklist.json

```json
{
  "agent": "Agent 1 - Prospecting Engine",
  "checks": [
    {
      "category": "File Structure",
      "items": [
        {
          "name": "config/prompts/ directory exists",
          "path": "prospecting-engine/config/prompts",
          "type": "directory"
        },
        {
          "name": "discoverers/google-maps.js exists",
          "path": "prospecting-engine/discoverers/google-maps.js",
          "type": "file"
        },
        {
          "name": "orchestrator.js exists",
          "path": "prospecting-engine/orchestrator.js",
          "type": "file"
        }
      ]
    },
    {
      "category": "API Endpoints",
      "items": [
        {
          "name": "POST /api/prospect exists",
          "test": "curl -X POST http://localhost:3010/api/prospect",
          "expectStatus": 400
        },
        {
          "name": "GET /api/prospects exists",
          "test": "curl http://localhost:3010/api/prospects",
          "expectStatus": 200
        },
        {
          "name": "GET /api/health exists",
          "test": "curl http://localhost:3010/api/health",
          "expectStatus": 200
        }
      ]
    },
    {
      "category": "Prompts Externalized",
      "items": [
        {
          "name": "Query understanding prompt exists",
          "path": "prospecting-engine/config/prompts/01-query-understanding.json",
          "type": "file",
          "validate": "isValidJSON"
        },
        {
          "name": "Website extraction prompt exists",
          "path": "prospecting-engine/config/prompts/04-website-extraction.json",
          "type": "file"
        },
        {
          "name": "Relevance check prompt exists",
          "path": "prospecting-engine/config/prompts/07-relevance-check.json",
          "type": "file"
        }
      ]
    },
    {
      "category": "Database Schema",
      "items": [
        {
          "name": "prospects.json schema exists",
          "path": "prospecting-engine/database/schemas/prospects.json",
          "type": "file"
        },
        {
          "name": "prospects table exists in Supabase",
          "test": "checkTableExists",
          "table": "prospects"
        }
      ]
    },
    {
      "category": "Integration",
      "items": [
        {
          "name": "Can generate prospects",
          "test": "integration-tests/test-prospecting.js"
        },
        {
          "name": "Prospects saved to database",
          "test": "integration-tests/test-prospect-save.js"
        },
        {
          "name": "Agent 2 can read prospects",
          "test": "integration-tests/test-prospect-to-lead.js"
        }
      ]
    },
    {
      "category": "Performance",
      "items": [
        {
          "name": "Generate 20 prospects in <3 minutes",
          "test": "performance-tests/test-prospecting-speed.js",
          "target": 180000
        },
        {
          "name": "Cost per prospect <$0.15",
          "test": "performance-tests/test-prospecting-cost.js",
          "target": 0.15
        }
      ]
    },
    {
      "category": "Code Quality",
      "items": [
        {
          "name": "No hardcoded API keys",
          "test": "code-quality/check-security.js",
          "pattern": "sk-|xai-|AKIA"
        },
        {
          "name": "Error handling present",
          "test": "code-quality/check-error-handling.js",
          "minCoverage": 80
        },
        {
          "name": "Logging uses winston",
          "test": "code-quality/check-logging.js"
        }
      ]
    }
  ]
}
```

---

### Agent 2 Checklist

Similar format, checking for:
- `analyzers/design-analyzer.js`
- `analyzers/seo-analyzer.js`
- `grading/grader.js`
- Prompts in `config/prompts/web-design/`
- `leads` table exists
- Analysis speed: 10 sites in <5 minutes
- Cost: <$0.15 per lead

---

### Agent 3 Checklist

Checking for:
- `generators/email-generator.js`
- `validators/email-validator.js`
- `senders/smtp-sender.js`
- Email strategy prompts
- `composed_emails` table
- Email quality validation working
- SMTP sending working

═══════════════════════════════════════════════════════════════════

## 6. INTEGRATION TESTS

### Test: Agent 1 → Agent 2 Flow

File: integration-tests/test-prospect-to-lead.js

```javascript
import { test, expect } from '@jest/globals';

test('Agent 1 prospects flow to Agent 2 analysis', async () => {
  // 1. Generate prospect via Agent 1
  const prospectResponse = await fetch('http://localhost:3010/api/prospect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brief: {
        icp: { industry: "Restaurant" },
        geo: { city: "Philadelphia, PA" }
      },
      count: 1,
      verify: true
    })
  });

  expect(prospectResponse.ok).toBe(true);

  // Wait for SSE completion
  const prospectResult = await waitForSSEComplete(prospectResponse);
  expect(prospectResult.found).toBeGreaterThan(0);

  // 2. Verify prospect saved to database
  const { data: prospects } = await supabase
    .from('prospects')
    .select('*')
    .eq('status', 'ready_for_analysis')
    .limit(1);

  expect(prospects).toHaveLength(1);
  const prospect = prospects[0];

  // 3. Trigger Agent 2 analysis
  const analysisResponse = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    body: JSON.stringify({
      filters: { status: 'ready_for_analysis', limit: 1 }
    })
  });

  expect(analysisResponse.ok).toBe(true);

  // Wait for analysis completion
  const analysisResult = await waitForSSEComplete(analysisResponse);
  expect(analysisResult.analyzed).toBe(1);

  // 4. Verify lead created
  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('prospect_id', prospect.id);

  expect(leads).toHaveLength(1);
  const lead = leads[0];

  // 5. Verify data integrity
  expect(lead.company_name).toBe(prospect.company_name);
  expect(lead.url).toBe(prospect.website);
  expect(lead.website_grade).toMatch(/[A-F]/);
  expect(lead.overall_score).toBeGreaterThan(0);
  expect(lead.design_score).toBeDefined();
  expect(lead.seo_score).toBeDefined();

  // ✅ Integration test passed!
});
```

---

### Test: End-to-End Pipeline

File: integration-tests/test-full-pipeline.js

```javascript
test('Full pipeline: Prospect → Analyze → Compose → Send', async () => {
  // STEP 1: Generate prospect
  console.log('Step 1: Generating prospect...');
  const prospect = await generateProspect({
    industry: "Restaurant",
    city: "Philadelphia, PA",
    count: 1
  });
  expect(prospect.status).toBe('ready_for_analysis');

  // STEP 2: Analyze
  console.log('Step 2: Analyzing website...');
  const lead = await analyzeProspect(prospect.id);
  expect(lead.website_grade).toMatch(/[A-B]/);
  expect(lead.contact_email).toBeTruthy();

  // STEP 3: Compose email
  console.log('Step 3: Composing email...');
  const email = await composeEmail(lead.url, {
    strategy: 'compliment-sandwich',
    generateVariants: false
  });
  expect(email.email_subject).toBeTruthy();
  expect(email.email_body).toBeTruthy();
  expect(email.quality_score).toBeGreaterThan(70);

  // STEP 4: Send email (dry run)
  console.log('Step 4: Sending email (dry run)...');
  const sendResult = await sendEmail(email.id, {
    actualSend: false
  });
  expect(sendResult.emlPath).toBeTruthy();
  expect(fs.existsSync(sendResult.emlPath)).toBe(true);

  // ✅ Full pipeline test passed!
  console.log('✅ Full pipeline completed successfully!');
});
```

═══════════════════════════════════════════════════════════════════

## 7. PERFORMANCE TESTS

### Test: Prospecting Speed

File: performance-tests/test-prospecting-speed.js

```javascript
test('Agent 1: Generate 20 prospects in under 3 minutes', async () => {
  const startTime = Date.now();

  const result = await fetch('http://localhost:3010/api/prospect', {
    method: 'POST',
    body: JSON.stringify({
      brief: { /* ICP brief */ },
      count: 20,
      verify: true
    })
  });

  const finalResult = await waitForSSEComplete(result);
  const duration = Date.now() - startTime;

  expect(finalResult.found).toBe(20);
  expect(duration).toBeLessThan(180000); // 3 minutes

  console.log(`✅ Generated 20 prospects in ${duration}ms`);
});
```

---

### Test: Analysis Speed

```javascript
test('Agent 2: Analyze 10 websites in under 5 minutes', async () => {
  // Seed 10 prospects
  await seedProspects(10);

  const startTime = Date.now();

  const result = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    body: JSON.stringify({
      filters: { status: 'ready_for_analysis', limit: 10 }
    })
  });

  const finalResult = await waitForSSEComplete(result);
  const duration = Date.now() - startTime;

  expect(finalResult.analyzed).toBe(10);
  expect(duration).toBeLessThan(300000); // 5 minutes

  console.log(`✅ Analyzed 10 sites in ${duration}ms`);
});
```

---

### Test: Cost Tracking

```javascript
test('Cost per lead is under $0.20', async () => {
  const costs = await runFullPipeline({
    count: 10
  });

  const avgCost = costs.total / 10;

  expect(avgCost).toBeLessThan(0.20);

  console.log(`Average cost per lead: $${avgCost.toFixed(4)}`);
});
```

═══════════════════════════════════════════════════════════════════

## 8. CODE QUALITY CHECKS

### Check: No Hardcoded Secrets

File: code-quality/check-security.js

```javascript
export function checkForHardcodedSecrets(agentDir) {
  const files = getAllJSFiles(agentDir);
  const issues = [];

  const dangerousPatterns = [
    /sk-[a-zA-Z0-9]{20,}/,     // OpenAI keys
    /xai-[a-zA-Z0-9]{20,}/,     // XAI keys
    /AKIA[A-Z0-9]{16}/,         // AWS keys
    /eyJhbGc[a-zA-Z0-9_-]+/     // JWT tokens
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        issues.push({
          file,
          pattern: pattern.toString(),
          severity: 'CRITICAL'
        });
      }
    }
  }

  return issues;
}
```

---

### Check: Error Handling Coverage

```javascript
export function checkErrorHandling(agentDir) {
  const files = getAllJSFiles(agentDir);
  let totalFunctions = 0;
  let functionsWithErrorHandling = 0;

  for (const file of files) {
    const ast = parseToAST(file);
    const functions = findAllFunctions(ast);

    totalFunctions += functions.length;

    for (const fn of functions) {
      if (hasTryCatch(fn) || hasErrorParameter(fn)) {
        functionsWithErrorHandling++;
      }
    }
  }

  const coverage = (functionsWithErrorHandling / totalFunctions) * 100;

  return {
    coverage: coverage.toFixed(1),
    passed: coverage >= 80,
    totalFunctions,
    functionsWithErrorHandling
  };
}
```

═══════════════════════════════════════════════════════════════════

## 9. CONTINUOUS MONITORING

### Watch Mode

```bash
npm run qa:watch
```

**Runs QA checks on file changes:**
- Watches all agent directories
- Re-runs relevant tests when files change
- Shows live test results in terminal

---

### Pre-Commit Hook

```bash
npm run qa:pre-commit
```

**Runs before git commit:**
- Quick validation checks
- Integration smoke tests
- Blocks commit if critical errors

═══════════════════════════════════════════════════════════════════

## 10. REPORT GENERATION

### HTML Report

Generated at: `reports/qa-report.html`

**Includes:**
- Executive summary
- Pass/fail rates per agent
- Integration test results
- Performance benchmarks
- Code quality scores
- Security scan results
- Recommendations

**Visual elements:**
- Progress bars
- Charts for performance
- Color-coded results
- Links to failed tests

═══════════════════════════════════════════════════════════════════

## 11. DEPENDENCIES

```json
{
  "name": "qa-supervisor",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "qa:check": "node cli.js check",
    "qa:integration": "node cli.js integration",
    "qa:performance": "node cli.js performance",
    "qa:report": "node cli.js report",
    "qa:watch": "node cli.js watch"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.75.1",
    "dotenv": "^16.3.1",
    "chalk": "^5.3.0",
    "ora": "^8.0.1",
    "jest": "^29.7.0",
    "node-fetch": "^3.3.2",
    "cheerio": "^1.0.0-rc.12"
  }
}
```

═══════════════════════════════════════════════════════════════════

## 12. SUCCESS CRITERIA

✅ All 6 agents validated against specs
✅ Integration tests pass
✅ Performance benchmarks met
✅ No hardcoded secrets found
✅ Error handling coverage >80%
✅ Database schema compliance
✅ HTML reports generated
✅ Watch mode works
✅ Pre-commit hooks work

═══════════════════════════════════════════════════════════════════

## 13. USAGE WORKFLOW

### During Development

```bash
# Developer working on Agent 2
cd analysis-engine
# ... makes changes ...

# Run QA check
npm run qa:check -- --agent 2

# Output shows:
# ✅ File structure: OK
# ✅ API endpoints: OK
# ❌ Missing seo-analyzer.js
# ⚠️  Performance: 6.2s (target: <5min)

# Fix issues, re-run
npm run qa:check -- --agent 2

# All green!
```

---

### Before Integration

```bash
# All agents built independently
# Now test integration

npm run qa:integration

# Output:
# ✅ Agent 1 → Agent 2: PASS
# ✅ Agent 2 → Agent 3: PASS
# ✅ End-to-end pipeline: PASS

# Ready to integrate!
```

---

### Before Release

```bash
# Full QA check
npm run qa:check

# Generate report
npm run qa:report

# Review reports/qa-report.html
# Fix any issues
# Re-run until all green
```

═══════════════════════════════════════════════════════════════════

END OF SPECIFICATION - AGENT 7
