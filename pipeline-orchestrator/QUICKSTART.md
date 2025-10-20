# Pipeline Orchestrator - Quick Start Guide

Get the Pipeline Orchestrator up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Supabase account with project created
- Other engines running (ports 3000, 3001, 3010)

## Step 1: Install Dependencies

```bash
cd pipeline-orchestrator
npm install
```

## Step 2: Configure Environment

```bash
cp .env.template .env
```

Edit `.env` and set:

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here

# Optional (for email notifications)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Step 3: Set Up Database

Run this SQL in your Supabase SQL editor:

```sql
-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  schedule_cron TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'error')),
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  total_runs INTEGER DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  project_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign runs table
CREATE TABLE IF NOT EXISTS campaign_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'aborted')),
  steps_completed INTEGER DEFAULT 0,
  steps_failed INTEGER DEFAULT 0,
  results JSONB,
  total_cost DECIMAL(10,2) DEFAULT 0,
  errors JSONB,
  trigger_type TEXT DEFAULT 'scheduled' CHECK (trigger_type IN ('scheduled', 'manual'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_next_run ON campaigns(next_run_at);
CREATE INDEX IF NOT EXISTS idx_campaign_runs_campaign_id ON campaign_runs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_runs_started_at ON campaign_runs(started_at DESC);
```

## Step 4: Start the Server

```bash
npm start
```

You should see:

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║           PIPELINE ORCHESTRATOR - Agent 6                    ║
║                                                               ║
║   Status: ONLINE                                             ║
║   Port:   3020                                               ║
║   Health: http://localhost:3020/api/health                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

## Step 5: Test the API

```bash
# Health check
curl http://localhost:3020/api/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "pipeline-orchestrator",
#   "activeCampaigns": 0
# }
```

## Step 6: Create Your First Campaign

### Option A: Use the test campaign (manual trigger only)

```bash
curl -X POST http://localhost:3020/api/campaigns \
  -H "Content-Type: application/json" \
  -d @campaigns/test-campaign.json
```

### Option B: Use the weekly restaurant campaign (scheduled)

```bash
curl -X POST http://localhost:3020/api/campaigns \
  -H "Content-Type: application/json" \
  -d @campaigns/weekly-restaurant.json
```

## Step 7: Manually Trigger a Campaign

Get the campaign ID from the create response, then:

```bash
curl -X POST http://localhost:3020/api/campaigns/{campaign-id}/run
```

## Step 8: Check Campaign Status

```bash
# List all campaigns
curl http://localhost:3020/api/campaigns

# Get specific campaign runs
curl http://localhost:3020/api/campaigns/{campaign-id}/runs
```

## Common Commands

### List all campaigns
```bash
curl http://localhost:3020/api/campaigns
```

### Pause a campaign
```bash
curl -X PUT http://localhost:3020/api/campaigns/{id}/pause
```

### Resume a campaign
```bash
curl -X PUT http://localhost:3020/api/campaigns/{id}/resume
```

### Delete a campaign
```bash
curl -X DELETE http://localhost:3020/api/campaigns/{id}
```

### View system stats
```bash
curl http://localhost:3020/api/stats
```

## Testing the Scheduler

The test campaign can be triggered manually. To test the scheduler:

1. Create a campaign with a cron schedule that runs soon:

```json
{
  "name": "Test Scheduler",
  "schedule": {
    "cron": "*/2 * * * *",  // Every 2 minutes
    "timezone": "America/New_York",
    "enabled": true
  },
  "steps": [ /* ... */ ]
}
```

2. Watch the logs:

```bash
tail -f logs/orchestrator.log
```

3. Wait for the schedule to trigger

## Troubleshooting

### Server won't start
- Check if port 3020 is already in use
- Verify `.env` has correct Supabase credentials
- Check Node.js version: `node --version` (should be 18+)

### Campaign not running
- Verify other engines are running (3000, 3001, 3010)
- Check campaign status: should be 'active'
- Review logs: `tail -f logs/orchestrator.log`

### Database errors
- Verify Supabase credentials in `.env`
- Check if tables were created successfully
- Test connection from Supabase dashboard

### Email notifications not working
- SMTP credentials are optional
- If not configured, campaigns will still run
- To enable, add SMTP settings to `.env`

## Next Steps

1. **Customize campaigns**: Edit JSON files in `campaigns/` directory
2. **Set up monitoring**: Use `/api/health` endpoint
3. **Configure budget limits**: Adjust in campaign config
4. **Add more campaigns**: Create new JSON config files
5. **Review logs**: Check `logs/` directory for detailed execution logs

## Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production` in environment
- [ ] Configure production Supabase credentials
- [ ] Set up SMTP for email notifications
- [ ] Configure appropriate budget limits
- [ ] Set up process manager (PM2 or systemd)
- [ ] Enable SSL/HTTPS for API
- [ ] Set up monitoring/alerting
- [ ] Review and test all campaign configurations
- [ ] Set up log rotation
- [ ] Configure firewall rules

## Support

Need help? Check:

1. [README.md](README.md) - Full documentation
2. `logs/orchestrator.log` - Detailed logs
3. Supabase dashboard - Database inspection
4. Engine logs - Check individual engines (Agents 1, 2, 3)

## Example: Complete Workflow

```bash
# 1. Create campaign
CAMPAIGN_ID=$(curl -s -X POST http://localhost:3020/api/campaigns \
  -H "Content-Type: application/json" \
  -d @campaigns/test-campaign.json | jq -r '.campaign.id')

echo "Campaign ID: $CAMPAIGN_ID"

# 2. Trigger manually
curl -X POST http://localhost:3020/api/campaigns/$CAMPAIGN_ID/run

# 3. Wait a moment for execution
sleep 5

# 4. Check results
curl http://localhost:3020/api/campaigns/$CAMPAIGN_ID/runs | jq

# 5. Pause if needed
curl -X PUT http://localhost:3020/api/campaigns/$CAMPAIGN_ID/pause
```

You're all set! The Pipeline Orchestrator is now managing your automated campaigns. 🚀
