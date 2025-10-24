# MAKSANT OUTREACH ENGINE

**Agent 3** - Multi-Channel Outreach System
**Version**: 2.0.0
**Status**: ✅ Production Ready
**Port**: 3002

---

## Overview

The Outreach Engine is a production-ready AI-powered system for generating personalized cold emails and social media DMs. It analyzes website quality data from the Analysis Engine and creates targeted outreach messages using configurable AI prompt strategies.

### Key Features

- **Multi-Channel**: Email + Social DMs (Instagram, Facebook, LinkedIn)
- **AI-Powered**: Claude Haiku 3.5 for cost-effective generation (~$0.0004/email)
- **Externalized Config**: All prompts and validation rules in JSON files
- **A/B Variant Testing**: Generate multiple subject/body combinations
- **Quality Validation**: 175+ spam phrase detection, scoring system
- **Notion Integration**: Bi-directional sync for review/approval workflow
- **Gmail SMTP**: Send emails with rate limiting and retry logic
- **Cost Tracking**: Per-email generation costs and performance metrics

---

## Quick Start

### 1. Install Dependencies
```bash
cd outreach-engine
npm install
```

### 2. Configure Environment
Create `.env` file:
```bash
# Supabase (shared database)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Anthropic AI
ANTHROPIC_API_KEY=your-anthropic-key

# Gmail SMTP (optional)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Notion (optional)
NOTION_API_KEY=secret_xxxxxxxxxxxxx
NOTION_DATABASE_ID=your-database-id
```

### 3. Start the Server
```bash
node server.js
# Server runs on http://localhost:3002
```

### 4. Test the API
```bash
# Health check
curl http://localhost:3002/health

# Generate an email
curl -X POST http://localhost:3002/api/compose \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "strategy": "problem-first"
  }'
```

---

## Architecture

### Email Generation Strategies

**6 AI prompt strategies** (all in `config/prompts/email-strategies/`):
- **compliment-sandwich** - Compliment → Issue → Encouragement
- **problem-first** - Problem → Impact → Solution
- **achievement-focused** - Success → Opportunity → Quick Win
- **question-based** - Question → Observation → Offer
- **industry-insight** - Industry context → Specific observation
- **problem-agitation** - Problem → Consequences → Relief

### Social DM Strategies

**2 strategies** for social platforms (`config/prompts/social-strategies/`):
- **value-first** - Value proposition with soft CTA
- **compliment-question** - Genuine compliment + thought-provoking question

### Validation System

**3 validation configs** (`config/validation/`):
- **email-quality.json** - Subject/body length, spam detection, scoring
- **social-quality.json** - Platform-specific rules (char limits, tone)
- **spam-phrases.json** - 175+ banned phrases across 10 categories

---

## API Endpoints

### Composition
```bash
# Generate single email
POST /api/compose
{
  "url": "https://example.com",
  "strategy": "problem-first",
  "generateVariants": false
}

# Generate social DM
POST /api/compose-social
{
  "url": "https://example.com",
  "platform": "instagram",
  "strategy": "value-first"
}

# Batch process leads
POST /api/compose-batch
{
  "limit": 20,
  "grade": "C",
  "strategy": "compliment-sandwich"
}
# Returns Server-Sent Events (SSE) with progress
```

### Sending
```bash
# Send single email
POST /api/send-email
{
  "email_id": "uuid-here",
  "actualSend": true
}

# Send batch of approved emails
POST /api/send-batch
{
  "limit": 50,
  "actualSend": true
}
```

### Notion Integration
```bash
# Sync approved emails from Notion and send them
POST /api/sync-from-notion
{
  "autoSend": true,
  "dryRun": false
}
```

### Query
```bash
# List available strategies
GET /api/strategies

# Get composed emails by status
GET /api/emails?status=approved

# Get ready leads
GET /api/leads/ready?limit=10&grade=C

# Get statistics
GET /api/stats
```

See [API.md](API.md) for complete API documentation.

---

## Project Structure

```
outreach-engine/
├── server.js                      # Express API server (port 3002)
├── config/
│   ├── prompts/
│   │   ├── email-strategies/      # 6 email prompt configs
│   │   └── social-strategies/     # 2 social prompt configs
│   └── validation/                # 3 validation rule configs
├── generators/
│   ├── email-generator.js         # AI email generation
│   ├── variant-generator.js       # A/B variant testing
│   └── social-generator.js        # Platform-specific DMs
├── validators/
│   ├── email-validator.js         # Email quality scoring
│   └── social-validator.js        # Platform compliance
├── integrations/
│   ├── database.js                # Supabase CRUD operations
│   ├── notion.js                  # Notion sync
│   └── smtp-sender.js             # Gmail sending with rate limits
├── shared/
│   ├── prompt-loader.js           # Load & validate JSON prompts
│   └── personalization-builder.js # Extract 32+ context fields
├── database/
│   ├── schemas/
│   │   └── composed_emails.json   # Database schema
│   └── migrations/                # SQL migration scripts
├── tests/                         # 15 test files
├── scripts/                       # Utility scripts
└── docs/                          # Additional documentation
```

---

## Usage Examples

### Generate Email with Variants
```javascript
import { generateCompleteEmail } from './generators/email-generator.js';

const result = await generateCompleteEmail({
  url: 'https://example.com',
  strategy: 'compliment-sandwich',
  generateVariants: true
});

console.log(result.email.subject);           // Main subject
console.log(result.variants.subjects);        // 3 alternatives
console.log(result.variants.aiRecommendation); // Best combo
console.log(result.validation.score);         // 0-100 quality score
console.log(result.cost);                     // ~$0.0010
```

### Generate Social DM
```javascript
import { generateSocialDM } from './generators/social-generator.js';

const dm = await generateSocialDM({
  url: 'https://example.com',
  platform: 'instagram',
  strategy: 'value-first'
});

console.log(dm.message);              // Platform-optimized message
console.log(dm.validation.score);     // Quality score
console.log(dm.characterCount);       // 283/1000 chars
```

### Validate Email Quality
```javascript
import { validateEmail } from './validators/email-validator.js';

const validation = validateEmail({
  subject: 'Quick question about your website',
  body: 'Hi [Name], I noticed your site...'
});

console.log(validation.score);        // 85
console.log(validation.rating);       // "good"
console.log(validation.issues);       // ["Placeholder detected: [Name]"]
```

---

## Testing

### Run Test Suite
```bash
# All integration tests
node tests/test-phase1-integration.js   # Config system
node tests/test-phase2-integration.js   # Generators & validators
node tests/test-phase3-integration.js   # Database & integrations
node tests/test-api-endpoints.js        # API server

# Individual module tests
node tests/test-prompt-loading.js       # Prompt loader
node tests/test-batch-generation.js     # Batch processing
node tests/test-notion-sync.js          # Notion integration
```

### Test Coverage
- **72 total tests**
- **66/72 passing (92%)**
- Integration, unit, and end-to-end tests

---

## Configuration

### Updating Prompts

Edit JSON files in `config/prompts/email-strategies/`:

```json
{
  "version": "1.0",
  "name": "my-custom-strategy",
  "description": "Custom approach",
  "model": "claude-haiku-4-5",
  "temperature": 0.7,
  "systemPrompt": "You are an expert cold email writer...",
  "userPromptTemplate": "Write an email to {{company_name}}...",
  "variables": [
    "company_name",
    "top_issue",
    "industry"
  ]
}
```

**No code changes needed** - prompts reload dynamically!

### Adding Validation Rules

Edit `config/validation/email-quality.json`:

```json
{
  "spamPhrases": [
    "amazing opportunity",
    "limited time offer"
  ],
  "optimalSubjectLength": { "min": 50, "max": 70 },
  "maxBodyWordCount": 200
}
```

---

## Notion Setup

See [docs/NOTION-SETUP.md](docs/NOTION-SETUP.md) for complete setup guide.

**Quick setup:**
```bash
# Auto-create all properties
node integrations/notion-schema-setup.js --live

# Test connection
node tests/test-notion-sync.js
```

---

## Performance

### Generation Costs
- Basic email: **$0.0004** (10x cheaper than target)
- With variants: **$0.0010**
- Social DM: **$0.0002**

### Rate Limits
- **Gmail**: 500/day, 100/hour (auto-enforced)
- **Claude API**: Unlimited (within budget)

### Speed
- Basic email: ~5 seconds
- With variants: ~15 seconds
- Social DM: ~3 seconds

---

## Integration with MaxantAgency

The Outreach Engine integrates with:

1. **Analysis Engine** (port 3001) - Provides lead data with website scores
2. **Command Center UI** (port 3000) - Displays emails, triggers generation
3. **Pipeline Orchestrator** (port 3020) - Schedules batch campaigns
4. **Supabase** - Shared database for all engines

### Data Flow
```
Analysis Engine → leads table → Outreach Engine → composed_emails → Notion → Review → Gmail
```

---

## Troubleshooting

### "No leads found"
- Check Analysis Engine has analyzed websites
- Verify leads have `website_grade` and `status='analyzed'`

### "Validation failed: placeholder detected"
- Lead is missing required fields (company_name, contact_email)
- Check lead data in Supabase

### "SMTP connection failed"
- Verify `GMAIL_USER` and `GMAIL_APP_PASSWORD` in `.env`
- Enable 2FA and create App Password in Google Account

### "Notion sync failed"
- Run `node scripts/check-notion-columns.js` to verify properties
- Check integration has access to database

### Utility Scripts

Located in `scripts/` directory:
- `check-leads.js` - View leads in database
- `check-notion-columns.js` - Verify Notion properties
- `check-status-constraint.js` - Check database constraints
- `check-table-usage.js` - Show table statistics
- `show-all-leads.js` - Display all leads with details

---

## Documentation

- [API.md](API.md) - Complete API reference with examples
- [docs/NOTION-SETUP.md](docs/NOTION-SETUP.md) - Notion integration guide
- [docs/INTEGRATION-GUIDE.md](docs/INTEGRATION-GUIDE.md) - Command Center integration
- [docs/SUPABASE-UI-GUIDE.md](docs/SUPABASE-UI-GUIDE.md) - Database UI access
- [docs/AB-TESTING-GUIDE.md](docs/AB-TESTING-GUIDE.md) - A/B variant testing

---

## Development

### Adding a New Email Strategy

1. Create `config/prompts/email-strategies/my-strategy.json`
2. Test with `POST /api/compose` using `"strategy": "my-strategy"`
3. No code changes required!

### Adding a New Validation Rule

1. Edit `config/validation/email-quality.json`
2. Add phrase to `spamPhrases` array
3. Changes take effect immediately

### Running in Development

```bash
# Start with auto-reload (if using nodemon)
npm run dev

# Or standard start
node server.js
```

---

## Production Deployment

See root [DEPLOYMENT.md](../DEPLOYMENT.md) for VPS deployment with PM2.

**Quick start:**
```bash
pm2 start server.js --name outreach-engine
pm2 save
```

---

## License

Proprietary - MaxantAgency

---

**Server**: http://localhost:3002
**Health**: http://localhost:3002/health
**API Docs**: [API.md](./API.md)