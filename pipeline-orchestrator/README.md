# Pipeline Orchestrator - Agent 6

Automated campaign orchestrator for the lead generation pipeline. Chains together Prospecting → Analysis → Outreach engines and runs them on schedule.

## Features

- **Automated Campaigns**: Run campaigns on cron schedules (daily, weekly, monthly)
- **Budget Control**: Enforce daily/weekly/monthly spending limits
- **Error Handling**: Configurable retry logic with exponential backoff
- **Notifications**: Email alerts for campaign completion/failure
- **REST API**: Manage campaigns via HTTP endpoints
- **Database Integration**: Persistent storage with Supabase
- **Logging**: Comprehensive Winston-based logging

## Architecture

```
Pipeline Orchestrator
├── Scheduler (node-cron)
│   └── Triggers campaigns on schedule
├── Campaign Runner
│   └── Executes steps sequentially
├── Step Executors
│   ├── Prospecting (Agent 1)
│   ├── Analysis (Agent 2)
│   ├── Outreach Compose (Agent 3)
│   └── Sender (Agent 3)
├── Budget Enforcer
│   └── Prevents overspending
└── Notification System
    └── Email alerts
```

## Installation

```bash
cd pipeline-orchestrator
npm install
```

## Configuration

Copy `.env.template` to `.env` and configure:

```bash
cp .env.template .env
```

Required environment variables:

```env
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# SMTP (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Database Setup

Create tables in Supabase:

```sql
-- See database/schemas/campaigns.json for full schema
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  schedule_cron TEXT,
  status TEXT DEFAULT 'active',
  -- ... see schema file for full definition
);

CREATE TABLE campaign_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'running',
  -- ... see schema file for full definition
);
```

## Usage

### Start the Server

```bash
npm start

# Or with auto-reload during development
npm run dev
```

Server will start on port 3020 (configurable via `PORT` env variable).

### Create a Campaign

```bash
curl -X POST http://localhost:3020/api/campaigns \
  -H "Content-Type: application/json" \
  -d @campaigns/weekly-restaurant.json
```

### List All Campaigns

```bash
curl http://localhost:3020/api/campaigns
```

### Manually Trigger a Campaign

```bash
curl -X POST http://localhost:3020/api/campaigns/{campaign-id}/run
```

### View Campaign Run History

```bash
curl http://localhost:3020/api/campaigns/{campaign-id}/runs
```

### Pause a Campaign

```bash
curl -X PUT http://localhost:3020/api/campaigns/{campaign-id}/pause
```

### Resume a Campaign

```bash
curl -X PUT http://localhost:3020/api/campaigns/{campaign-id}/resume
```

### Delete a Campaign

```bash
curl -X DELETE http://localhost:3020/api/campaigns/{campaign-id}
```

### Health Check

```bash
curl http://localhost:3020/api/health
```

## Campaign Configuration

Example campaign structure:

```json
{
  "name": "Weekly Restaurant Outreach",
  "description": "Generate and contact 20 restaurants every Monday",

  "schedule": {
    "cron": "0 9 * * MON",
    "timezone": "America/New_York",
    "enabled": true
  },

  "budget": {
    "daily": 5.00,
    "weekly": 20.00,
    "monthly": 80.00
  },

  "steps": [
    {
      "name": "prospecting",
      "engine": "prospecting",
      "endpoint": "http://localhost:3010/api/prospect",
      "params": { /* engine-specific params */ },
      "timeout": 300000,
      "retry": {
        "attempts": 3,
        "delay": 5000,
        "backoff": "exponential"
      },
      "onSuccess": "continue",
      "onFailure": "abort"
    }
    // ... more steps
  ],

  "notifications": {
    "onComplete": {
      "email": "your-email@example.com"
    },
    "onFailure": {
      "email": "your-email@example.com"
    }
  }
}
```

### Cron Schedule Examples

- `0 9 * * MON` - Every Monday at 9am
- `0 8 1 * *` - First day of every month at 8am
- `0 */6 * * *` - Every 6 hours
- `30 14 * * 1-5` - 2:30pm on weekdays

## Error Handling

Each step supports configurable failure actions:

- `"onFailure": "abort"` - Stop campaign immediately
- `"onFailure": "continue"` - Log error and proceed to next step
- `"onFailure": "log"` - Just log, continue (for non-critical steps)

Retry logic with exponential backoff:

```json
{
  "retry": {
    "attempts": 3,
    "delay": 5000,
    "backoff": "exponential"
  }
}
```

Results in: 5s → 10s → 20s delays between retries.

## Budget Enforcement

The orchestrator automatically pauses campaigns that exceed budget limits:

- **Daily Budget**: Resets at midnight
- **Weekly Budget**: Resets on Sunday
- **Monthly Budget**: Resets on 1st of month

When budget is exceeded:
1. Campaign is paused
2. Email notification sent
3. Campaign resumes next period automatically

## Testing

Run tests:

```bash
npm test

# Or individually
node tests/test-scheduler.js
node tests/test-campaign.js
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/campaigns` | Create campaign |
| GET | `/api/campaigns` | List campaigns |
| GET | `/api/campaigns/:id` | Get campaign details |
| POST | `/api/campaigns/:id/run` | Trigger campaign manually |
| GET | `/api/campaigns/:id/runs` | Get run history |
| PUT | `/api/campaigns/:id/pause` | Pause campaign |
| PUT | `/api/campaigns/:id/resume` | Resume campaign |
| DELETE | `/api/campaigns/:id` | Delete campaign |
| GET | `/api/health` | Health check |
| GET | `/api/stats` | System statistics |

## Logging

Logs are written to:
- Console (colored output)
- `logs/orchestrator.log` (all logs)
- `logs/error.log` (errors only)

Log levels: `error`, `warn`, `info`, `debug`

Configure via `LOG_LEVEL` environment variable.

## File Structure

```
pipeline-orchestrator/
├── server.js                 # Express API
├── orchestrator.js           # Main orchestrator
├── package.json
├── .env.template
│
├── campaigns/                # Example campaigns
│   ├── weekly-restaurant.json
│   ├── monthly-retail.json
│   └── test-campaign.json
│
├── scheduler/
│   ├── cron-scheduler.js     # Cron scheduling
│   ├── campaign-runner.js    # Campaign execution
│   └── index.js
│
├── steps/                    # Step executors
│   ├── prospecting-step.js
│   ├── analysis-step.js
│   ├── outreach-step.js
│   ├── sender-step.js
│   └── index.js
│
├── budget/
│   ├── cost-tracker.js
│   └── budget-enforcer.js
│
├── database/
│   ├── supabase-client.js
│   └── schemas/
│       ├── campaigns.json
│       └── campaign_runs.json
│
├── shared/
│   ├── logger.js
│   ├── retry-handler.js
│   └── notifier.js
│
└── tests/
    ├── test-campaign.js
    └── test-scheduler.js
```

## Troubleshooting

### Campaign not triggering on schedule

- Check cron expression is valid
- Verify campaign status is 'active'
- Check `schedule.enabled` is true
- Review logs for errors

### Budget exceeded errors

- Check budget limits in campaign config
- Review spending with `/api/campaigns/:id/runs`
- Increase budget limits if needed

### Email notifications not working

- Verify SMTP credentials in `.env`
- Test with: `curl -X POST http://localhost:3020/api/test-email`
- Check spam folder

### Steps failing

- Verify engine APIs are running (ports 3000, 3001, 3010)
- Check step timeout values
- Review retry configuration
- Check engine-specific error logs

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Use a process manager (PM2, systemd)
3. Configure production database
4. Set up monitoring/alerting
5. Enable SSL for API endpoints
6. Configure firewall rules

Example PM2 config:

```bash
pm2 start server.js --name pipeline-orchestrator
pm2 save
pm2 startup
```

## License

MIT - Maksant Agency

## Support

For issues or questions, check the logs first:

```bash
tail -f logs/orchestrator.log
```

Or contact support with:
- Campaign ID
- Error message
- Log excerpts
