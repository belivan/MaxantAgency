# Work Queue System - Complete Guide

## 🎉 What We Built

A **production-ready universal work queue system** that provides async job-based architecture, cross-engine coordination, priority handling, and cancellation support for all engines across the MaxantAgency platform.

---

## 📊 Summary of Changes

### Phase 1: Analysis Engine Integration ✅ (Completed Previously)

**What It Does**: Async job-based analysis with Redis coordination, priority handling, and full observability.

**Files Created**:
1. ✅ [analysis-engine/routes/analysis-queue-endpoints.js](analysis-engine/routes/analysis-queue-endpoints.js) - Queue API endpoints
2. ✅ [analysis-engine/utils/promise-timeout.js](analysis-engine/utils/promise-timeout.js) - Timeout protection

**Files Modified**:
1. ✅ [analysis-engine/server.js](analysis-engine/server.js) - Added queue routes

**Features**:
- ✅ POST /api/analyze - Queue analysis jobs
- ✅ GET /api/analysis-status - Check job status
- ✅ POST /api/cancel-analysis - Cancel queued jobs
- ✅ GET /api/queue-status - Overall queue stats

---

### Phase 2: Prospecting Engine Integration ✅ (Just Completed)

**What It Does**: Async job-based prospecting with priority handling and cancellation support.

**Files Created**:
1. ✅ [prospecting-engine/routes/prospecting-queue-endpoints.js](prospecting-engine/routes/prospecting-queue-endpoints.js) - Queue API endpoints

**Files Modified**:
1. ✅ [prospecting-engine/server.js](prospecting-engine/server.js) - Added queue routes

**Features**:
- ✅ POST /api/prospect-queue - Queue prospecting jobs
- ✅ GET /api/prospect-status - Check job status
- ✅ POST /api/cancel-prospect - Cancel queued jobs
- ✅ GET /api/queue-status - Overall queue stats

**Backward Compatibility**: Existing SSE-based `/api/prospect` endpoint remains fully functional.

---

### Phase 3: Report Engine Integration ✅ (Just Completed)

**What It Does**: Async job-based report generation with priority handling and cancellation support.

**Files Created**:
1. ✅ [report-engine/routes/report-queue-endpoints.js](report-engine/routes/report-queue-endpoints.js) - Queue API endpoints

**Files Modified**:
1. ✅ [report-engine/server.js](report-engine/server.js) - Added queue routes

**Features**:
- ✅ POST /api/generate-queue - Queue report generation jobs
- ✅ GET /api/report-status - Check job status
- ✅ POST /api/cancel-report - Cancel queued jobs
- ✅ GET /api/queue-status - Overall queue stats

**Backward Compatibility**: Existing synchronous `/api/generate` and `/api/generate-from-lead` endpoints remain fully functional.

---

### Phase 4: Outreach Engine Integration ✅ (Just Completed)

**What It Does**: Async job-based outreach composition with support for generating 12 variations per lead (3 email + 9 social DMs).

**Files Created**:
1. ✅ [outreach-engine/routes/outreach-queue-endpoints.js](outreach-engine/routes/outreach-queue-endpoints.js) - Queue API endpoints

**Files Modified**:
1. ✅ [outreach-engine/server.js](outreach-engine/server.js) - Added queue routes and enhanced startup console

**Features**:
- ✅ POST /api/compose-queue - Queue outreach composition jobs
- ✅ GET /api/compose-status - Check job status
- ✅ POST /api/cancel-compose - Cancel queued jobs
- ✅ GET /api/queue-status - Overall queue stats

**Key Capabilities**:
- Generates 12 variations per lead (3 email strategies + 9 social DM strategies)
- Priority calculated from batch size (1-5 leads = Priority 1)
- Supports force regeneration with `forceRegenerate: true`
- Can filter by project_id, status, priority_tier, website_grade
- Stores all variations in single `composed_outreach` row per lead

**Backward Compatibility**: Existing SSE-based `/api/compose-all-variations` and other composition endpoints remain fully functional.

---

## 🚀 How It Works

### Architecture Overview

The work queue system is built on 4 layers:

```
┌─────────────────────────────────────────────────────────┐
│                     ENGINE APIs                         │
│  (Prospecting, Analysis, Report, Outreach)              │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│              WORK QUEUE (Layer 4)                       │
│  • Job scheduling & prioritization                      │
│  • Cross-engine coordination via Redis                  │
│  • Per-type concurrency limits                          │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│         REQUEST QUEUE (Layer 3)                         │
│  • Per-engine concurrency (10 concurrent AI calls)      │
│  • Token reservation                                    │
│  • 150ms traffic spreading                             │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│    DISTRIBUTED RATE LIMITER (Layer 2)                   │
│  • Cross-engine coordination via Redis                  │
│  • System-wide token buckets                            │
│  • Wait time calculations                               │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│      LOCAL RATE LIMITER (Layer 1)                       │
│  • Per-process token buckets                            │
│  • Token reservation                                    │
│  • In-memory tracking                                   │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│              AI PROVIDERS                               │
│  OpenAI, Anthropic, xAI                                 │
└─────────────────────────────────────────────────────────┘
```

---

### Core Components

#### 1. **Work Queue** ([database-tools/shared/work-queue.js](database-tools/shared/work-queue.js))

**Purpose**: Universal job scheduling system for all engines.

**Key Features**:
- Priority-based scheduling (1=high, 2=medium, 3=low)
- Per-work-type concurrency limits
- Redis-backed persistence with in-memory fallback
- Job states: queued, running, completed, failed, cancelled
- Automatic job processing with retry support
- 24-hour TTL for automatic cleanup

**Work Types & Concurrency**:
```javascript
{
  analysis: 2,      // Max 2 concurrent analyses
  outreach: 2,      // Max 2 concurrent outreach
  report: 1,        // Max 1 concurrent report
  prospecting: 1    // Max 1 concurrent prospecting
}
```

**Priority Calculation**:
- Small batches (1-5 items) = Priority 1 (high)
- Medium batches (6-20 items) = Priority 2 (medium)
- Large batches (21+ items) = Priority 3 (low)

**Environment Variables**:
```bash
USE_WORK_QUEUE=true                    # Enable work queue system
MAX_CONCURRENT_ANALYSES=2
MAX_CONCURRENT_OUTREACH=2
MAX_CONCURRENT_REPORTS=1
MAX_CONCURRENT_PROSPECTING=1
```

---

#### 2. **Request Queue** ([database-tools/shared/request-queue.js](database-tools/shared/request-queue.js))

**Purpose**: Per-engine concurrency control for AI API calls.

**Key Features**:
- Global concurrency limiter (default: 10 concurrent calls per engine)
- Token reservation system prevents race conditions
- 150ms minimum delay spreads traffic
- Automatic rate limit checking (local + distributed)
- Wait & retry logic with exponential backoff
- Statistics tracking (total processed, failed, wait times)

**Configuration**:
```bash
MAX_CONCURRENT_AI_CALLS=10          # Per-engine concurrency limit
MIN_DELAY_BETWEEN_AI_CALLS_MS=150   # Traffic spreading delay
USE_REQUEST_QUEUE=true              # Enable/disable (default: true)
```

---

#### 3. **Distributed Rate Limiter** ([database-tools/shared/distributed-rate-limiter.js](database-tools/shared/distributed-rate-limiter.js))

**Purpose**: Cross-engine rate limit coordination via Redis.

**Key Features**:
- Redis-backed token bucket algorithm
- Per-provider/model rate limit tracking
- Atomic operations via Lua scripts
- 60-second rolling windows
- 90% safety margin before limits
- Automatic refill based on provider limits

**Configuration**:
```bash
REDIS_URL=redis://localhost:6379
USE_DISTRIBUTED_RATE_LIMITING=true  # Enable cross-engine coordination
FALLBACK_TO_LOCAL_LIMITING=true     # Fall back if Redis fails
```

**Supported Providers**:
- **OpenAI**: TPM (tokens per minute), RPM (requests per minute)
- **Anthropic**: ITPM (input TPM), OTPM (output TPM), RPM
- **xAI (Grok)**: TPM, RPM

---

#### 4. **Rate Limit Monitor** ([database-tools/shared/rate-limit-monitor.js](database-tools/shared/rate-limit-monitor.js))

**Purpose**: Real-time monitoring and alerting dashboard.

**Usage**:
```bash
# One-time check
node database-tools/shared/rate-limit-monitor.js

# Live monitoring (every 5 seconds)
node database-tools/shared/rate-limit-monitor.js --watch

# Live monitoring (custom interval)
node database-tools/shared/rate-limit-monitor.js --watch=10
```

**Features**:
- Live status display with ASCII progress bars
- Alert generation (warning at 70%, critical at 85%)
- Queue statistics integration
- Summary statistics across all providers

---

## 📚 API Documentation

### Prospecting Engine Queue Endpoints

#### **POST /api/prospect-queue** - Queue Prospecting Job

**Request**:
```json
{
  "brief": {
    "industry": "restaurant",
    "city": "San Francisco",
    "target": "Italian restaurants",
    "count": 50
  },
  "options": {
    "projectId": "uuid",
    "model": "grok-4-fast",
    "visionModel": "gpt-5",
    "useIterativeDiscovery": true,
    "maxIterations": 5,
    "maxVariationsPerIteration": 7,
    "minRating": 3.5,
    "checkRelevance": true,
    "filterIrrelevant": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "job_id": "uuid",
  "message": "Queued prospecting for 50 prospects",
  "brief": {
    "industry": "restaurant",
    "city": "San Francisco",
    "target": "Italian restaurants",
    "count": 50
  }
}
```

---

#### **GET /api/prospect-status?job_ids=uuid1,uuid2,...** - Check Job Status

**Response**:
```json
{
  "success": true,
  "jobs": [
    {
      "job_id": "uuid",
      "state": "completed",
      "type": "prospecting",
      "priority": 2,
      "created_at": "2025-11-10T...",
      "started_at": "2025-11-10T...",
      "completed_at": "2025-11-10T...",
      "error": null,
      "result": {
        "success": true,
        "found": 50,
        "saved": 48,
        "skipped": 2,
        "failed": 0,
        "prospects": [...],
        "duration_ms": 125000
      }
    }
  ],
  "summary": {
    "total": 1,
    "queued": 0,
    "running": 0,
    "completed": 1,
    "failed": 0,
    "cancelled": 0,
    "not_found": 0
  }
}
```

---

#### **POST /api/cancel-prospect** - Cancel Queued Jobs

**Request**:
```json
{
  "job_ids": ["uuid1", "uuid2"]
}
```

**Response**:
```json
{
  "success": true,
  "cancelled": 2,
  "total": 2,
  "results": [
    { "job_id": "uuid1", "cancelled": true },
    { "job_id": "uuid2", "cancelled": true }
  ]
}
```

---

### Report Engine Queue Endpoints

#### **POST /api/generate-queue** - Queue Report Generation

**Request (with lead_id)**:
```json
{
  "lead_id": "uuid",
  "options": {
    "format": "html",
    "sections": ["all"],
    "saveToDatabase": true,
    "project_id": "uuid"
  }
}
```

**Request (with analysisResult)**:
```json
{
  "analysisResult": {
    "company_name": "Example Co",
    "url": "https://example.com",
    "industry": "restaurant",
    "overall_score": 75,
    "grade": "B",
    ...
  },
  "options": {
    "format": "html",
    "sections": ["all"],
    "saveToDatabase": true,
    "project_id": "uuid"
  }
}
```

**Response**:
```json
{
  "success": true,
  "job_id": "uuid",
  "message": "Queued report generation for Example Co",
  "company_name": "Example Co",
  "website_url": "https://example.com",
  "format": "html"
}
```

---

#### **GET /api/report-status?job_ids=uuid1,uuid2,...** - Check Job Status

**Response**:
```json
{
  "success": true,
  "jobs": [
    {
      "job_id": "uuid",
      "state": "completed",
      "type": "report",
      "priority": 1,
      "created_at": "2025-11-10T...",
      "started_at": "2025-11-10T...",
      "completed_at": "2025-11-10T...",
      "error": null,
      "result": {
        "success": true,
        "report_id": "uuid",
        "storage_path": "reports/...",
        "download_url": "https://...",
        "format": "html",
        "company_name": "Example Co",
        "website_url": "https://example.com",
        "duration_ms": 45000
      }
    }
  ],
  "summary": {
    "total": 1,
    "queued": 0,
    "running": 0,
    "completed": 1,
    "failed": 0,
    "cancelled": 0,
    "not_found": 0
  }
}
```

---

#### **POST /api/cancel-report** - Cancel Queued Jobs

**Request**:
```json
{
  "job_ids": ["uuid1", "uuid2"]
}
```

**Response**:
```json
{
  "success": true,
  "cancelled": 2,
  "total": 2,
  "results": [
    { "job_id": "uuid1", "cancelled": true },
    { "job_id": "uuid2", "cancelled": true }
  ]
}
```

---

### Outreach Engine Queue Endpoints

#### **POST /api/compose-queue** - Queue Outreach Composition

**Request**:
```json
{
  "lead_ids": ["uuid1", "uuid2", "uuid3"],
  "options": {
    "forceRegenerate": false,
    "project_id": "uuid",
    "status": "analyzed",
    "priority_tier": "high",
    "website_grade": "C"
  }
}
```

**Response**:
```json
{
  "success": true,
  "job_id": "uuid",
  "message": "Queued outreach composition for 3 leads",
  "batch_size": 3,
  "priority": 1,
  "variations_per_lead": 12,
  "total_variations": 36
}
```

**Curl Example**:
```bash
curl -X POST http://localhost:3002/api/compose-queue \
  -H "Content-Type: application/json" \
  -d '{
    "lead_ids": ["uuid1", "uuid2"],
    "options": {
      "forceRegenerate": false
    }
  }'
```

---

#### **GET /api/compose-status?job_ids=uuid1,uuid2,...** - Check Job Status

**Response**:
```json
{
  "success": true,
  "jobs": [
    {
      "job_id": "uuid",
      "state": "completed",
      "type": "outreach",
      "priority": 1,
      "created_at": "2025-11-10T...",
      "started_at": "2025-11-10T...",
      "completed_at": "2025-11-10T...",
      "error": null,
      "result": {
        "success": true,
        "total_leads": 3,
        "processed_leads": 3,
        "total_variations": 36,
        "total_cost": 0.24,
        "cost_per_lead": 0.08,
        "cost_per_variation": 0.006667,
        "generation_time_ms": 145000,
        "total_duration_ms": 147000,
        "errors": [],
        "error_count": 0
      }
    }
  ],
  "summary": {
    "total": 1,
    "queued": 0,
    "running": 0,
    "completed": 1,
    "failed": 0,
    "cancelled": 0,
    "not_found": 0
  }
}
```

**Curl Example**:
```bash
curl "http://localhost:3002/api/compose-status?job_ids=uuid1,uuid2"
```

---

#### **POST /api/cancel-compose** - Cancel Queued Jobs

**Request**:
```json
{
  "job_ids": ["uuid1", "uuid2"]
}
```

**Response**:
```json
{
  "success": true,
  "cancelled": 2,
  "total": 2,
  "results": [
    { "job_id": "uuid1", "cancelled": true },
    { "job_id": "uuid2", "cancelled": true }
  ]
}
```

**Curl Example**:
```bash
curl -X POST http://localhost:3002/api/cancel-compose \
  -H "Content-Type: application/json" \
  -d '{"job_ids": ["uuid1", "uuid2"]}'
```

**Key Features**:
- Generates 12 variations per lead (3 email + 9 social DMs)
- Stores all variations in single `composed_outreach` row per lead
- Priority calculated from batch size (1-5 leads = Priority 1)
- Supports force regeneration with `forceRegenerate: true`
- Can filter by project_id, status, priority_tier, website_grade

---

### Analysis Engine Queue Endpoints

See [analysis-engine/routes/analysis-queue-endpoints.js](analysis-engine/routes/analysis-queue-endpoints.js) for full documentation. API pattern is identical to Prospecting, Report, and Outreach engines.

**Key Endpoints**:
- POST /api/analyze - Queue analysis jobs
- GET /api/analysis-status - Check job status
- POST /api/cancel-analysis - Cancel queued jobs
- GET /api/queue-status - Overall queue stats

---

### Universal Endpoint (All Engines)

#### **GET /api/queue-status** - Overall Queue Status

**Response**:
```json
{
  "success": true,
  "types": {
    "analysis": {
      "queued": 5,
      "running": 2,
      "completed": 100,
      "failed": 2,
      "total": 109
    },
    "prospecting": {
      "queued": 2,
      "running": 1,
      "completed": 50,
      "failed": 0,
      "total": 53
    },
    "report": {
      "queued": 3,
      "running": 1,
      "completed": 75,
      "failed": 1,
      "total": 80
    },
    "outreach": {
      "queued": 0,
      "running": 0,
      "completed": 0,
      "failed": 0,
      "total": 0
    }
  },
  "stats": {
    "totalQueued": 10,
    "totalRunning": 4,
    "totalCompleted": 225,
    "totalFailed": 3,
    "totalJobs": 242
  }
}
```

---

## 🎯 Usage Examples

### Example 1: Queue Prospecting Job

```javascript
// Queue prospecting job
const response = await fetch('http://localhost:3010/api/prospect-queue', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    brief: {
      industry: 'restaurant',
      city: 'San Francisco',
      count: 50
    },
    options: {
      projectId: 'my-project-uuid',
      useIterativeDiscovery: true
    }
  })
});

const { job_id } = await response.json();
console.log('Job queued:', job_id);

// Poll for status
const checkStatus = async () => {
  const statusResponse = await fetch(`http://localhost:3010/api/prospect-status?job_ids=${job_id}`);
  const { jobs } = await statusResponse.json();

  const job = jobs[0];
  console.log(`Status: ${job.state}`);

  if (job.state === 'completed') {
    console.log('Found:', job.result.saved, 'prospects');
    return job.result;
  } else if (job.state === 'failed') {
    console.error('Job failed:', job.error);
    return null;
  } else {
    // Still running, check again in 5 seconds
    setTimeout(checkStatus, 5000);
  }
};

checkStatus();
```

---

### Example 2: Queue Report Generation

```javascript
// Queue report generation for existing lead
const response = await fetch('http://localhost:3003/api/generate-queue', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lead_id: 'my-lead-uuid',
    options: {
      format: 'html',
      sections: ['all'],
      saveToDatabase: true
    }
  })
});

const { job_id } = await response.json();
console.log('Report queued:', job_id);

// Poll for status
const checkStatus = async () => {
  const statusResponse = await fetch(`http://localhost:3003/api/report-status?job_ids=${job_id}`);
  const { jobs } = await statusResponse.json();

  const job = jobs[0];
  console.log(`Status: ${job.state}`);

  if (job.state === 'completed') {
    console.log('Report ID:', job.result.report_id);
    console.log('Download URL:', job.result.download_url);
    return job.result;
  } else if (job.state === 'failed') {
    console.error('Report failed:', job.error);
    return null;
  } else {
    // Still running, check again in 5 seconds
    setTimeout(checkStatus, 5000);
  }
};

checkStatus();
```

---

### Example 3: Batch Analysis with Priority

```javascript
// Queue multiple analyses (small batch = high priority)
const smallBatch = [/* 5 prospect IDs */];
const largeBatch = [/* 50 prospect IDs */];

// Small batch gets priority 1 (processed first)
const smallBatchResponse = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prospect_ids: smallBatch,
    project_id: 'my-project-uuid'
  })
});

// Large batch gets priority 3 (processed after small batches)
const largeBatchResponse = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prospect_ids: largeBatch,
    project_id: 'my-project-uuid'
  })
});

// Small batch will be processed before large batch even though submitted after
```

---

### Example 4: Cancel Queued Jobs

```javascript
// Queue multiple jobs
const job1 = await queueAnalysis(...);
const job2 = await queueAnalysis(...);
const job3 = await queueAnalysis(...);

// Cancel jobs that haven't started yet
const cancelResponse = await fetch('http://localhost:3001/api/cancel-analysis', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    job_ids: [job1.job_id, job2.job_id, job3.job_id]
  })
});

const { cancelled, total } = await cancelResponse.json();
console.log(`Cancelled ${cancelled}/${total} jobs`);
// Note: Only jobs in "queued" state can be cancelled
```

---

### Example 5: Monitor Overall Queue

```javascript
// Get system-wide queue status
const response = await fetch('http://localhost:3001/api/queue-status');
const status = await response.json();

console.log('Queue Status:');
console.log('- Analysis:', status.types.analysis);
console.log('- Prospecting:', status.types.prospecting);
console.log('- Report:', status.types.report);
console.log('- Outreach:', status.types.outreach);
console.log('\nTotals:');
console.log('- Queued:', status.stats.totalQueued);
console.log('- Running:', status.stats.totalRunning);
console.log('- Completed:', status.stats.totalCompleted);
console.log('- Failed:', status.stats.totalFailed);
```

---

## 🔧 Configuration

### Environment Variables

Add to your `.env` file:

```bash
# ═══════════════════════════════════════════════════════════
# WORK QUEUE SYSTEM
# ═══════════════════════════════════════════════════════════

# Enable/Disable Work Queue
USE_WORK_QUEUE=true                    # Enable universal work queue (default: true)

# Redis Configuration (required for cross-engine coordination)
REDIS_URL=redis://localhost:6379      # Redis connection URL
# Or use individual fields:
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=your-password

# Per-Type Concurrency Limits
MAX_CONCURRENT_ANALYSES=2              # Max concurrent analysis jobs
MAX_CONCURRENT_OUTREACH=2              # Max concurrent outreach jobs
MAX_CONCURRENT_REPORTS=1               # Max concurrent report jobs
MAX_CONCURRENT_PROSPECTING=1           # Max concurrent prospecting jobs

# Request Queue (Per-Engine AI Concurrency)
MAX_CONCURRENT_AI_CALLS=10             # Max concurrent AI calls per engine process
MIN_DELAY_BETWEEN_AI_CALLS_MS=150      # Minimum delay between AI calls (traffic spreading)
USE_REQUEST_QUEUE=true                 # Enable request queue (default: true)

# Distributed Rate Limiting
USE_DISTRIBUTED_RATE_LIMITING=true     # Enable cross-engine rate limit coordination
FALLBACK_TO_LOCAL_LIMITING=true        # Fall back to local if Redis fails
```

---

### Redis Setup

#### Local Development (Docker)

```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Test connection
redis-cli ping
# Should return: PONG
```

#### Production (Upstash)

1. Create Upstash Redis account: https://upstash.com
2. Create new Redis database
3. Copy connection URL
4. Update `.env`:

```bash
REDIS_URL=rediss://default:password@endpoint.upstash.io:6379
```

---

## 📈 Benefits

### 1. **Unified Monitoring**

```bash
GET /api/queue-status

# Returns status for ALL work types across ALL engines
{
  "types": {
    "analysis": { "queued": 5, "running": 2 },
    "prospecting": { "queued": 2, "running": 1 },
    "report": { "queued": 3, "running": 1 },
    "outreach": { "queued": 0, "running": 0 }
  }
}
```

### 2. **Priority Handling**

- Small batches (1-5 items) = Priority 1 (processed first)
- Medium batches (6-20 items) = Priority 2
- Large batches (21+ items) = Priority 3

### 3. **Resource Protection**

- System-wide concurrency limits prevent overload
- Each work type respects its configured limit
- Redis coordination prevents duplicate work

### 4. **Cancellation Support**

- Cancel queued jobs before they start
- Useful for testing/debugging
- Save costs on mistaken submissions

### 5. **Better UX**

- No timeout issues with long-running jobs
- Poll for status instead of maintaining SSE connection
- Clear job lifecycle (queued → running → completed/failed)

### 6. **Cross-Engine Coordination**

- All engines share same Redis queue
- Visibility into system-wide workload
- Prevents resource contention

---

## 🔍 Monitoring & Debugging

### Check Queue Status

```bash
# Live monitoring (updates every 5 seconds)
node database-tools/shared/rate-limit-monitor.js --watch

# One-time check
curl http://localhost:3001/api/queue-status
```

### View Job Details

```bash
# Check specific job
curl "http://localhost:3001/api/analysis-status?job_ids=uuid1,uuid2"
```

### Debug Redis

```bash
# Connect to Redis
redis-cli

# List all work queue keys
KEYS work:*

# View job data
GET work:jobs:uuid

# View queue for specific type
LRANGE work:queue:analysis 0 -1
```

---

## 🚨 Troubleshooting

### Issue: Jobs stuck in "queued" state

**Cause**: Worker not processing jobs (Redis connection issue or worker not running).

**Solution**:
1. Check Redis connection: `redis-cli ping`
2. Check engine logs for worker errors
3. Restart engine server

---

### Issue: "Job not found" errors

**Cause**: Jobs expire after 24 hours or Redis was flushed.

**Solution**:
- Jobs older than 24 hours are automatically cleaned up
- For production, consider longer TTL if needed
- Check `work-queue.js` and adjust TTL:
  ```javascript
  const REDIS_TTL = 86400; // 24 hours (adjust as needed)
  ```

---

### Issue: Jobs failing with rate limit errors

**Cause**: Too many concurrent jobs hitting AI provider rate limits.

**Solution**:
1. Reduce concurrency limits in `.env`:
   ```bash
   MAX_CONCURRENT_ANALYSES=1
   MAX_CONCURRENT_AI_CALLS=5
   ```
2. Check rate limit status:
   ```bash
   node database-tools/shared/rate-limit-monitor.js
   ```
3. Consider upgrading AI provider tier

---

### Issue: Redis connection failures

**Cause**: Redis not running or incorrect connection URL.

**Solution**:
1. Check Redis is running: `redis-cli ping`
2. Verify `.env` REDIS_URL
3. System falls back to in-memory queue (loses cross-engine coordination)

---

## 📝 Migration Guide

### Migrating Existing Code to Use Work Queue

**Before** (Synchronous):
```javascript
app.post('/api/analyze-url', async (req, res) => {
  const result = await analyzeWebsiteIntelligent(url, data);
  res.json({ success: true, result });
});
```

**After** (Queue-based):
```javascript
import { enqueueWork } from '../../database-tools/shared/work-queue.js';

app.post('/api/analyze', async (req, res) => {
  const jobId = await enqueueWork('analysis', data, batchSize, async (data) => {
    return await analyzeWebsiteIntelligent(data.url, data);
  });

  res.json({ success: true, job_id: jobId });
});

app.get('/api/analysis-status', async (req, res) => {
  const job = getJob(req.query.job_id);
  res.json({ success: true, job });
});
```

---

## 🎓 Best Practices

### 1. **Always Use Queue Endpoints for New Code**

✅ **Good**:
```javascript
POST /api/prospect-queue
GET /api/prospect-status
```

❌ **Avoid**:
```javascript
POST /api/prospect  // SSE-based, legacy
```

### 2. **Implement Polling with Exponential Backoff**

```javascript
async function pollJobStatus(jobId, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`/api/analysis-status?job_ids=${jobId}`);
    const { jobs } = await response.json();

    if (jobs[0].state === 'completed' || jobs[0].state === 'failed') {
      return jobs[0];
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const delay = Math.min(1000 * Math.pow(2, i), 30000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error('Job timeout');
}
```

### 3. **Handle Job Lifecycle Properly**

```javascript
const job = await getJobStatus(jobId);

switch (job.state) {
  case 'queued':
    console.log('Job is waiting in queue...');
    break;
  case 'running':
    console.log('Job is processing...');
    break;
  case 'completed':
    console.log('Job completed:', job.result);
    break;
  case 'failed':
    console.error('Job failed:', job.error);
    break;
  case 'cancelled':
    console.log('Job was cancelled');
    break;
}
```

### 4. **Set Appropriate Concurrency Limits**

For production environments:
```bash
# Development (more aggressive)
MAX_CONCURRENT_ANALYSES=2
MAX_CONCURRENT_AI_CALLS=10

# Production (conservative)
MAX_CONCURRENT_ANALYSES=1
MAX_CONCURRENT_AI_CALLS=5
```

### 5. **Monitor Queue Depth**

Set up alerting if queue depth exceeds thresholds:
```javascript
const status = await getQueueStatus();
const totalQueued = status.stats.totalQueued;

if (totalQueued > 50) {
  console.warn('Queue depth high:', totalQueued);
  // Send alert
}
```

---

## 📦 What's Next?

### Phase 4: Outreach Engine Integration (Future)

**Planned Features**:
- POST /api/compose-queue - Queue outreach composition
- GET /api/compose-status - Check composition status
- POST /api/cancel-compose - Cancel queued jobs
- Priority handling for urgent outreach

**Effort**: 4-6 hours
**Impact**: High (completes full system integration)

---

## 🏆 Summary

The Work Queue System provides:

✅ **Async job-based architecture** - No more blocking requests
✅ **Cross-engine coordination** - Unified monitoring and control
✅ **Priority handling** - Small batches process first
✅ **Cancellation support** - Cancel jobs before they start
✅ **Resource protection** - Per-type concurrency limits
✅ **Better UX** - Poll for status, no SSE timeouts
✅ **Production-ready** - Redis-backed with in-memory fallback
✅ **Zero breaking changes** - Backward compatible with existing endpoints

**Total Integration Time**: ~12-16 hours
**Engines Integrated**: 3/4 (Analysis ✅, Prospecting ✅, Report ✅, Outreach 🔜)
**Lines of Code**: ~1,500 (across all engines)
**Dependencies**: Redis (optional, falls back to in-memory)

---

## 📚 Additional Resources

- [Rate Limit System Guide](RATE-LIMIT-SYSTEM-GUIDE.md) - Comprehensive rate limiting documentation
- [CLAUDE.md](CLAUDE.md) - Full system architecture and patterns
- [work-queue.js](database-tools/shared/work-queue.js) - Source code with inline documentation
- [rate-limit-monitor.js](database-tools/shared/rate-limit-monitor.js) - Monitoring tool

---

**Questions?** Check the inline documentation in [work-queue.js](database-tools/shared/work-queue.js) or reach out to the team.
