# Outreach Engine v2.0 - API Documentation

**Base URL:** `http://localhost:3002`

---

## 📊 Status: Production Ready ✅

- **90.9% Test Coverage** (20/22 tests passing)
- **Live & Operational** on port 3002
- **Side-by-side** with email-composer (port 3001)

---

## 🔥 Quick Test

```bash
# Health check
curl http://localhost:3002/health

# Get stats
curl http://localhost:3002/api/stats

# Compose email
curl -X POST http://localhost:3002/api/compose \
  -H "Content-Type: application/json" \
  -d '{"url":"https://zahavrestaurant.com","strategy":"problem-first"}'
```

---

## 📡 Endpoints

### 1. Health & Status

#### `GET /health`
```bash
curl http://localhost:3002/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "outreach-engine",
  "version": "2.0"
}
```

#### `GET /api/stats`
```bash
curl http://localhost:3002/api/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "leads": { "regular": 3, "social": 5, "total": 8 },
    "emails": { "total": 8, "ready": 0, "sent": 0 }
  },
  "rateLimits": {
    "daily": { "sent": 0, "limit": 500, "remaining": 500 },
    "hourly": { "sent": 0, "limit": 100, "remaining": 100 }
  }
}
```

---

### 2. Email Composition

#### `POST /api/compose` - Compose Single Email

**Request:**
```bash
curl -X POST http://localhost:3002/api/compose \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://zahavrestaurant.com",
    "strategy": "problem-first",
    "generateVariants": false,
    "model": "claude-haiku-3-5"
  }'
```

**Parameters:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string | Yes | - | Website URL of the lead |
| `strategy` | string | No | `"compliment-sandwich"` | Email strategy to use |
| `generateVariants` | boolean | No | `false` | Generate A/B test variants |
| `model` | string | No | `"claude-haiku-3-5"` | AI model to use |

**Strategies:**
- `compliment-sandwich` - Compliment → Issue → Encouragement
- `problem-first` - Problem → Impact → Solution
- `achievement-focused` - Success → Opportunity → Quick win
- `question-based` - Question → Observation → Offer

**Response:**
```json
{
  "success": true,
  "email": {
    "id": "722cc08c-9732-4d66-84f5-5976053e2b5b",
    "email_subject": "missing contact info on zahavrestaurant.com",
    "email_body": "I noticed your restaurant website is missing...",
    "email_strategy": "problem-first",
    "status": "pending"
  },
  "result": {
    "subject": "missing contact info on zahavrestaurant.com",
    "body": "...",
    "total_cost": 0.00036425,
    "generation_time_ms": 4769,
    "validation": {
      "isValid": true,
      "score": 100,
      "rating": "excellent"
    }
  }
}
```

#### `POST /api/compose-social` - Generate Social DM

**Request:**
```bash
curl -X POST http://localhost:3002/api/compose-social \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://brightsmileortho.com",
    "platform": "instagram",
    "strategy": "value-first"
  }'
```

**Parameters:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string | Yes | - | Website URL of the lead |
| `platform` | string | No | `"instagram"` | Social platform (`instagram`, `facebook`, `linkedin`) |
| `strategy` | string | No | `"value-first"` | DM strategy |
| `model` | string | No | `"claude-haiku-3-5"` | AI model |

**Platform Limits:**
- Instagram: 1000 chars (no URLs!)
- Facebook: 5000 chars
- LinkedIn: 1900 chars

**Response:**
```json
{
  "success": true,
  "result": {
    "message": "Hey there! Saw your page and love how you're helping...",
    "platform": "instagram",
    "character_count": 283,
    "validation": {
      "valid": true,
      "score": 80,
      "rating": "good"
    },
    "cost": 0.000173
  }
}
```

#### `POST /api/compose-batch` - Batch Composition

**Request:**
```bash
curl -X POST http://localhost:3002/api/compose-batch \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 10,
    "grade": "C",
    "strategy": "compliment-sandwich"
  }'
```

**Response:** Server-Sent Events stream
```
data: {"type":"start","total":10}

data: {"type":"progress","completed":1,"total":10,"current":{"company":"Zahav","email_id":"...","validation_score":95}}

data: {"type":"complete","completed":10,"failed":0,"total":10}
```

---

### 3. Email Sending

#### `POST /api/send-email` - Send Single Email

**Request (Dry Run):**
```bash
curl -X POST http://localhost:3002/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email_id": "722cc08c-9732-4d66-84f5-5976053e2b5b",
    "actualSend": false
  }'
```

**Request (Live Send):**
```bash
curl -X POST http://localhost:3002/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email_id": "722cc08c-9732-4d66-84f5-5976053e2b5b",
    "actualSend": true
  }'
```

**Response (Live):**
```json
{
  "success": true,
  "result": {
    "success": true,
    "messageId": "<abc@gmail.com>",
    "to": "contact@example.com",
    "sentAt": "2025-10-19T23:15:30.000Z"
  }
}
```

#### `POST /api/send-batch` - Batch Send

**Request:**
```bash
curl -X POST http://localhost:3002/api/send-batch \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 10,
    "actualSend": false,
    "delayMs": 2000
  }'
```

**Response:**
```json
{
  "success": true,
  "results": {
    "sent": [{"id": "...", "to": "..."}],
    "failed": [],
    "skipped": []
  }
}
```

---

### 4. Query Endpoints

#### `GET /api/strategies` - List Available Strategies

**Request:**
```bash
curl http://localhost:3002/api/strategies
```

**Response:**
```json
{
  "success": true,
  "email": [
    "achievement-focused",
    "compliment-sandwich",
    "problem-first",
    "question-based"
  ],
  "social": ["value-first"]
}
```

#### `GET /api/leads/ready` - Get Leads

**Request:**
```bash
curl "http://localhost:3002/api/leads/ready?type=regular&limit=5"
```

**Query Parameters:**
- `type` - Lead type: `regular` or `social` (default: `regular`)
- `limit` - Max leads to return (default: 50)

**Response:**
```json
{
  "success": true,
  "count": 3,
  "leads": [
    {
      "id": "...",
      "url": "https://example.com",
      "company_name": "Example Company",
      "industry": "Legal Services",
      "lead_grade": "C"
    }
  ]
}
```

#### `GET /api/emails` - Get Composed Emails

**Request:**
```bash
curl "http://localhost:3002/api/emails?status=pending&limit=10"
```

**Query Parameters:**
- `status` - Email status: `pending`, `approved`, `sent` (default: `pending`)
- `limit` - Max emails to return (default: 50)

**Response:**
```json
{
  "success": true,
  "count": 8,
  "emails": [
    {
      "id": "...",
      "email_subject": "...",
      "email_body": "...",
      "status": "pending",
      "leads": {
        "company_name": "Example",
        "contact_email": "contact@example.com"
      }
    }
  ]
}
```

---

## 💰 Cost Tracking

Every generation includes detailed cost tracking:

```json
{
  "total_cost": 0.00036425,
  "usage": {
    "body": {
      "input_tokens": 330,
      "output_tokens": 107
    },
    "subject": {
      "input_tokens": 367,
      "output_tokens": 45
    }
  }
}
```

**Model Pricing:**
- Claude Haiku 3.5: $0.25/$1.25 per MTok (recommended)
- Claude Sonnet 4.5: $3/$15 per MTok (premium)

**Average Costs:**
- Basic email: ~$0.0004
- Email with variants: ~$0.0010
- Social DM: ~$0.0002

---

## 📊 Validation Scoring

**Email Validation:**
- 0-49: Poor (fails)
- 50-69: Needs review
- 70-84: Acceptable
- 85-94: Good
- 95-100: Excellent

**Social DM Validation:**
- 0-49: Poor (fails)
- 50-64: Needs review
- 65-79: Acceptable
- 80-94: Good
- 95-100: Excellent

**Common Penalties:**
- Unfilled placeholder: -30 points
- Spam phrase in subject: -15 points
- Email too long: -20 points
- Missing personalization: -15 points

---

## 🚦 Rate Limits

**Gmail SMTP:**
- Daily: 500 emails
- Hourly: 100 emails

Check current limits: `GET /api/stats`

Automatic enforcement prevents exceeding limits.

---

## 🎯 Command Center Integration Examples

### 1. Single Email Composition Flow

```javascript
// 1. Get leads
const leadsResponse = await fetch('http://localhost:3002/api/leads/ready?type=regular&limit=10');
const leads = await leadsResponse.json();

// 2. Compose email for selected lead
const composeResponse = await fetch('http://localhost:3002/api/compose', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: leads.leads[0].url,
    strategy: 'compliment-sandwich',
    generateVariants: true
  })
});

const composed = await composeResponse.json();
console.log('Email ID:', composed.email.id);
console.log('Validation Score:', composed.result.validation.score);
console.log('Cost:', composed.result.total_cost);

// 3. Review & send
if (userApproved) {
  const sendResponse = await fetch('http://localhost:3002/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email_id: composed.email.id,
      actualSend: true
    })
  });
}
```

### 2. Batch Composition with Progress

```javascript
const eventSource = new EventSource('http://localhost:3002/api/compose-batch?' + new URLSearchParams({
  limit: 20,
  grade: 'C',
  strategy: 'problem-first'
}));

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'start':
      console.log(`Starting batch of ${data.total} emails`);
      break;
    case 'progress':
      updateProgressBar(data.completed, data.total);
      console.log(`Composed for ${data.current.company}: Score ${data.current.validation_score}`);
      break;
    case 'complete':
      console.log(`Batch complete: ${data.completed} emails composed`);
      eventSource.close();
      break;
  }
};
```

### 3. Social DM Generation

```javascript
// Get social leads
const socialLeads = await fetch('http://localhost:3002/api/leads/ready?type=social&limit=10')
  .then(r => r.json());

// Generate Instagram DM
const dm = await fetch('http://localhost:3002/api/compose-social', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: socialLeads.leads[0].url,
    platform: 'instagram',
    strategy: 'value-first'
  })
}).then(r => r.json());

console.log('DM:', dm.result.message);
console.log('Validation:', dm.result.validation.score);
console.log('Chars:', dm.result.character_count);
```

---

## ✅ Testing

```bash
# Run all API endpoint tests
node tests/test-api-endpoints.js

# Expected output:
# Total Tests: 22
# Passed: 20+
# Success Rate: 90%+
```

---

## 🐛 Error Handling

All endpoints return errors in consistent format:

```json
{
  "success": false,
  "error": "Lead not found for URL: https://example.com"
}
```

**Common Errors:**
- `url is required` - Missing URL parameter
- `Lead not found for URL` - URL not in database (use website-audit-tool first)
- `GMAIL_APP_PASSWORD not configured` - Gmail SMTP not set up
- `Daily Gmail limit reached` - Hit 500 email/day limit

---

**Ready to integrate! 🚀**

For more details, see [README.md](./README.md)
