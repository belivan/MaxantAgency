# PIPELINE ORCHESTRATOR - Technical Specification
Version: 2.0
Agent Assignment: Agent 6
Status: NEW SERVICE - BUILD FROM SCRATCH

═══════════════════════════════════════════════════════════════════

## 1. PURPOSE & SCOPE

### What This Service Does:
The Pipeline Orchestrator automates the complete end-to-end lead generation
workflow. It chains together all 3 engines (Prospecting → Analysis → Outreach)
and runs them automatically based on schedules or triggers. Think of it as the
"autopilot" for your lead generation system.

### What This Service Does NOT Do:
- Does NOT replace the engines (calls their APIs)
- Does NOT have a UI (runs as background service)
- Does NOT store data (reads/writes via engines)

### Core Philosophy:
"Set it and forget it - automated campaigns that run on schedule"

═══════════════════════════════════════════════════════════════════

## 2. ARCHITECTURE OVERVIEW

### Service Name: pipeline-orchestrator
### Port: 3020
### Language: Node.js (ES Modules)
### Type: Background scheduler + API service

### How It Works:

```
USER CREATES CAMPAIGN:
{
  "name": "Weekly Restaurant Outreach",
  "schedule": "0 9 * * MON",  // Every Monday at 9am
  "steps": [
    {"engine": "prospecting", "params": {...}},
    {"engine": "analysis", "params": {...}},
    {"engine": "outreach", "params": {...}},
    {"engine": "sender", "params": {...}}
  ]
}

ORCHESTRATOR RUNS CAMPAIGN:
1. Monday 9:00am → Wake up
2. Call Prospecting Engine → Generate 20 prospects
3. Wait for completion
4. Call Analysis Engine → Analyze all new prospects
5. Wait for completion
6. Filter for Grade A/B with emails
7. Call Outreach Engine → Compose emails
8. Wait for composition
9. Call Outreach Engine → Send batch (with delay)
10. Log results
11. Sleep until next Monday 9am
```

═══════════════════════════════════════════════════════════════════

## 3. FILE STRUCTURE (REQUIRED)

pipeline-orchestrator/
├── server.js                      # Express API
├── package.json
├── .env.template
│
├── campaigns/                     # Campaign definitions
│   ├── weekly-restaurant.json
│   ├── monthly-retail.json
│   └── test-campaign.json
│
├── scheduler/
│   ├── cron-scheduler.js          # Handles schedules (node-cron)
│   ├── campaign-runner.js         # Executes campaigns
│   └── index.js
│
├── steps/                         # Step executors
│   ├── prospecting-step.js        # Calls Agent 1 API
│   ├── analysis-step.js           # Calls Agent 2 API
│   ├── outreach-step.js           # Calls Agent 3 API
│   ├── sender-step.js             # Calls Agent 3 send API
│   └── index.js
│
├── orchestrator.js                # Main pipeline runner
│
├── budget/
│   ├── cost-tracker.js            # Tracks spending
│   └── budget-enforcer.js         # Stops if budget exceeded
│
├── database/
│   ├── supabase-client.js
│   └── schemas/
│       ├── campaigns.json
│       └── campaign_runs.json
│
├── shared/
│   ├── logger.js
│   └── retry-handler.js           # Retry logic for failures
│
└── tests/
    ├── test-campaign.js
    └── test-scheduler.js

═══════════════════════════════════════════════════════════════════

## 4. CAMPAIGN CONFIGURATION

### Example: Weekly Restaurant Campaign

File: campaigns/weekly-restaurant.json

{
  "name": "Weekly Restaurant Outreach - Philadelphia",
  "description": "Generate 20 restaurant prospects every Monday, analyze, compose, and send emails",

  "schedule": {
    "cron": "0 9 * * MON",
    "timezone": "America/New_York",
    "enabled": true
  },

  "budget": {
    "daily": 5.00,
    "weekly": 20.00,
    "monthly": 80.00,
    "perLead": 0.20
  },

  "steps": [
    {
      "name": "prospecting",
      "engine": "prospecting",
      "endpoint": "http://localhost:3010/api/prospect",
      "method": "POST",
      "params": {
        "brief": {
          "icp": {
            "industry": "Restaurant",
            "niches": ["Italian", "American", "French"]
          },
          "geo": {
            "city": "Philadelphia, PA"
          }
        },
        "count": 20,
        "model": "grok-4-fast",
        "verify": true
      },
      "timeout": 300000,
      "retry": {
        "attempts": 3,
        "delay": 5000
      },
      "onSuccess": "continue",
      "onFailure": "abort"
    },

    {
      "name": "analysis",
      "engine": "analysis",
      "endpoint": "http://localhost:3000/api/analyze",
      "method": "POST",
      "params": {
        "filters": {
          "status": "ready_for_analysis",
          "city": "Philadelphia, PA",
          "limit": 50
        },
        "options": {
          "tier": "tier2",
          "modules": ["design", "seo", "content", "social"]
        }
      },
      "timeout": 600000,
      "retry": {
        "attempts": 2,
        "delay": 10000
      },
      "onSuccess": "continue",
      "onFailure": "continue"
    },

    {
      "name": "outreach-compose",
      "engine": "outreach",
      "endpoint": "http://localhost:3001/api/compose-batch",
      "method": "POST",
      "params": {
        "filters": {
          "grade": ["A", "B"],
          "hasEmail": true,
          "status": "ready_for_outreach"
        },
        "strategy": "compliment-sandwich",
        "generateVariants": false,
        "model": "haiku"
      },
      "timeout": 300000,
      "retry": {
        "attempts": 2,
        "delay": 5000
      },
      "onSuccess": "continue",
      "onFailure": "abort"
    },

    {
      "name": "send-emails",
      "engine": "outreach",
      "endpoint": "http://localhost:3001/api/send-batch",
      "method": "POST",
      "params": {
        "filters": {
          "status": "pending",
          "quality_score_min": 80
        },
        "provider": "gmail",
        "actualSend": true,
        "delayMs": 5000
      },
      "timeout": 600000,
      "retry": {
        "attempts": 1,
        "delay": 0
      },
      "onSuccess": "continue",
      "onFailure": "log"
    }
  ],

  "notifications": {
    "onComplete": {
      "email": "your-email@example.com",
      "slack": null
    },
    "onFailure": {
      "email": "your-email@example.com",
      "slack": null
    }
  },

  "metadata": {
    "project_id": "uuid-here",
    "tags": ["restaurants", "philadelphia", "weekly"],
    "owner": "maksant-agency"
  }
}

═══════════════════════════════════════════════════════════════════

## 5. API ENDPOINTS

### 5.1 POST /api/campaigns

Create new campaign.

Request:
{
  "name": "Weekly Restaurant Outreach",
  "schedule": "0 9 * * MON",
  "steps": [...],
  "budget": {...}
}

Response:
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "name": "Weekly Restaurant Outreach",
    "status": "active",
    "nextRun": "2025-01-20T09:00:00Z"
  }
}

---

### 5.2 GET /api/campaigns

List all campaigns.

Response:
{
  "success": true,
  "campaigns": [
    {
      "id": "uuid",
      "name": "Weekly Restaurant Outreach",
      "schedule": "0 9 * * MON",
      "status": "active",
      "lastRun": "2025-01-13T09:00:00Z",
      "nextRun": "2025-01-20T09:00:00Z",
      "totalRuns": 12,
      "totalCost": 45.80
    }
  ]
}

---

### 5.3 POST /api/campaigns/:id/run

Manually trigger campaign (ignore schedule).

Response:
{
  "success": true,
  "runId": "uuid",
  "message": "Campaign started"
}

---

### 5.4 GET /api/campaigns/:id/runs

Get campaign run history.

Response:
{
  "success": true,
  "runs": [
    {
      "id": "uuid",
      "started_at": "2025-01-13T09:00:00Z",
      "completed_at": "2025-01-13T09:45:23Z",
      "status": "completed",
      "steps_completed": 4,
      "steps_failed": 0,
      "prospects_generated": 20,
      "leads_analyzed": 18,
      "emails_sent": 12,
      "total_cost": 3.85,
      "errors": []
    }
  ]
}

---

### 5.5 DELETE /api/campaigns/:id

Delete campaign (stops future runs).

Response:
{
  "success": true,
  "message": "Campaign deleted"
}

---

### 5.6 PUT /api/campaigns/:id/pause

Pause campaign (keep config, stop running).

Response:
{
  "success": true,
  "status": "paused"
}

---

### 5.7 GET /api/health

Health check.

Response:
{
  "status": "healthy",
  "service": "pipeline-orchestrator",
  "activeCampaigns": 3,
  "scheduledRuns": 5
}

═══════════════════════════════════════════════════════════════════

## 6. DATABASE SCHEMA

### Table: campaigns

{
  "table": "campaigns",
  "description": "Automated pipeline campaigns",

  "columns": [
    {
      "name": "id",
      "type": "uuid",
      "primaryKey": true
    },
    {
      "name": "name",
      "type": "text",
      "required": true
    },
    {
      "name": "description",
      "type": "text"
    },
    {
      "name": "config",
      "type": "jsonb",
      "description": "Full campaign config (steps, budget, etc.)"
    },
    {
      "name": "schedule_cron",
      "type": "text",
      "description": "Cron expression"
    },
    {
      "name": "status",
      "type": "text",
      "enum": ["active", "paused", "completed", "error"],
      "default": "active"
    },
    {
      "name": "last_run_at",
      "type": "timestamptz"
    },
    {
      "name": "next_run_at",
      "type": "timestamptz"
    },
    {
      "name": "total_runs",
      "type": "integer",
      "default": 0
    },
    {
      "name": "total_cost",
      "type": "decimal",
      "default": 0
    },
    {
      "name": "project_id",
      "type": "uuid"
    },
    {
      "name": "created_at",
      "type": "timestamptz",
      "default": "now()"
    }
  ]
}

### Table: campaign_runs

{
  "table": "campaign_runs",
  "description": "History of campaign executions",

  "columns": [
    {
      "name": "id",
      "type": "uuid",
      "primaryKey": true
    },
    {
      "name": "campaign_id",
      "type": "uuid",
      "foreignKey": "campaigns.id"
    },
    {
      "name": "started_at",
      "type": "timestamptz",
      "default": "now()"
    },
    {
      "name": "completed_at",
      "type": "timestamptz"
    },
    {
      "name": "status",
      "type": "text",
      "enum": ["running", "completed", "failed", "aborted"]
    },
    {
      "name": "steps_completed",
      "type": "integer"
    },
    {
      "name": "steps_failed",
      "type": "integer"
    },
    {
      "name": "results",
      "type": "jsonb",
      "description": "Detailed results from each step"
    },
    {
      "name": "total_cost",
      "type": "decimal"
    },
    {
      "name": "errors",
      "type": "jsonb",
      "description": "Array of error messages"
    }
  ]
}

═══════════════════════════════════════════════════════════════════

## 7. KEY MODULES

### 7.1 Campaign Runner

File: scheduler/campaign-runner.js

export async function runCampaign(campaign, runId) {
  /**
   * Execute all steps in campaign
   *
   * @param {object} campaign - Campaign config
   * @param {string} runId - Unique run ID
   * @returns {Promise<object>} Run results
   */

  const results = {
    runId,
    started_at: new Date(),
    steps_completed: 0,
    steps_failed: 0,
    total_cost: 0,
    errors: []
  };

  // Budget check
  if (await isBudgetExceeded(campaign.budget)) {
    throw new Error('Budget exceeded, aborting campaign');
  }

  // Run each step sequentially
  for (const step of campaign.steps) {
    try {
      logger.info('Running step', { step: step.name });

      const stepResult = await executeStep(step);

      results.steps_completed++;
      results.total_cost += stepResult.cost || 0;
      results[step.name] = stepResult;

      if (step.onSuccess === 'abort') break;

    } catch (error) {
      logger.error('Step failed', { step: step.name, error });

      results.steps_failed++;
      results.errors.push({
        step: step.name,
        error: error.message
      });

      if (step.onFailure === 'abort') {
        throw error;
      }
    }
  }

  results.completed_at = new Date();
  results.status = results.steps_failed === 0 ? 'completed' : 'partial';

  return results;
}

---

### 7.2 Step Executor

File: steps/prospecting-step.js

export async function executeProspectingStep(config) {
  /**
   * Call Prospecting Engine API
   *
   * @param {object} config - Step configuration
   * @returns {Promise<object>} Step results
   */

  const response = await fetch(config.endpoint, {
    method: config.method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config.params),
    signal: AbortSignal.timeout(config.timeout)
  });

  if (!response.ok) {
    throw new Error(`Prospecting failed: ${response.statusText}`);
  }

  // Listen to SSE events
  const eventSource = new EventSource(`${config.endpoint}?...`);
  const results = await waitForCompletion(eventSource);

  return {
    success: true,
    prospects_generated: results.found,
    prospects_verified: results.verified,
    cost: results.cost,
    time_ms: results.timeMs
  };
}

---

### 7.3 Scheduler

File: scheduler/cron-scheduler.js

import cron from 'node-cron';

export function scheduleCampaign(campaign) {
  /**
   * Register campaign with cron scheduler
   *
   * @param {object} campaign - Campaign with schedule
   * @returns {object} Scheduled task
   */

  const task = cron.schedule(campaign.schedule.cron, async () => {
    try {
      logger.info('Campaign triggered by schedule', { campaign: campaign.name });

      const runId = generateRunId();
      await runCampaign(campaign, runId);

      logger.info('Campaign completed', { campaign: campaign.name, runId });

    } catch (error) {
      logger.error('Campaign failed', { campaign: campaign.name, error });

      // Send notification
      await sendFailureNotification(campaign, error);
    }
  }, {
    timezone: campaign.schedule.timezone
  });

  return task;
}

---

### 7.4 Budget Enforcer

File: budget/budget-enforcer.js

export async function isBudgetExceeded(budgetConfig) {
  /**
   * Check if budget limits are exceeded
   *
   * @param {object} budgetConfig - Budget constraints
   * @returns {Promise<boolean>} True if exceeded
   */

  const today = new Date();
  const spending = await getSpending({
    daily: today,
    weekly: getWeekStart(today),
    monthly: getMonthStart(today)
  });

  if (budgetConfig.daily && spending.daily >= budgetConfig.daily) {
    logger.warn('Daily budget exceeded', { spent: spending.daily, limit: budgetConfig.daily });
    return true;
  }

  if (budgetConfig.weekly && spending.weekly >= budgetConfig.weekly) {
    logger.warn('Weekly budget exceeded', { spent: spending.weekly, limit: budgetConfig.weekly });
    return true;
  }

  if (budgetConfig.monthly && spending.monthly >= budgetConfig.monthly) {
    logger.warn('Monthly budget exceeded', { spent: spending.monthly, limit: budgetConfig.monthly });
    return true;
  }

  return false;
}

═══════════════════════════════════════════════════════════════════

## 8. ERROR HANDLING

### Retry Logic

Each step can configure retry behavior:
```json
{
  "retry": {
    "attempts": 3,
    "delay": 5000,
    "backoff": "exponential"
  }
}
```

### Failure Actions

- `"onFailure": "abort"` → Stop campaign immediately
- `"onFailure": "continue"` → Log error, continue to next step
- `"onFailure": "log"` → Log error, continue (for non-critical steps)

### Budget Protection

If budget exceeded:
- Pause campaign
- Send notification
- Wait until next period (daily/weekly/monthly)

═══════════════════════════════════════════════════════════════════

## 9. NOTIFICATIONS

### Email Notifications

```javascript
// On campaign completion
await sendEmail({
  to: campaign.notifications.onComplete.email,
  subject: `Campaign "${campaign.name}" completed`,
  body: `
    Prospects: ${results.prospects_generated}
    Analyzed: ${results.leads_analyzed}
    Sent: ${results.emails_sent}
    Cost: $${results.total_cost}
  `
});

// On failure
await sendEmail({
  to: campaign.notifications.onFailure.email,
  subject: `Campaign "${campaign.name}" failed`,
  body: `Error: ${error.message}`
});
```

═══════════════════════════════════════════════════════════════════

## 10. DEPENDENCIES

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "node-cron": "^3.0.3",
    "@supabase/supabase-js": "^2.75.1",
    "winston": "^3.11.0",
    "node-fetch": "^3.3.2"
  }
}
```

═══════════════════════════════════════════════════════════════════

## 11. SUCCESS CRITERIA

✅ Campaign scheduler working
✅ Cron jobs trigger on schedule
✅ All 4 step types implemented
✅ Budget enforcement working
✅ Retry logic handles failures
✅ Error notifications sent
✅ Campaign runs logged to database
✅ Manual trigger API works
✅ Pause/resume campaigns
✅ All tests passing

═══════════════════════════════════════════════════════════════════

## 12. USAGE EXAMPLES

### Create Campaign
```bash
curl -X POST http://localhost:3020/api/campaigns \
  -H "Content-Type: application/json" \
  -d @campaigns/weekly-restaurant.json
```

### Manually Trigger
```bash
curl -X POST http://localhost:3020/api/campaigns/{id}/run
```

### Check History
```bash
curl http://localhost:3020/api/campaigns/{id}/runs
```

═══════════════════════════════════════════════════════════════════

END OF SPECIFICATION - AGENT 6
