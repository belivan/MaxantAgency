# Maksant Command Center UI

**Unified interface for the complete lead generation pipeline: Prospects → Analysis → Emails**

This Next.js application brings together three separate tools into one seamless workflow:

1. **Client Orchestrator** - Generate targeted prospect lists from your ICP brief
2. **Website Audit Tool** - Analyze websites and extract contact data
3. **Email Composer** - Create personalized AI-powered outreach emails

---

## Features

### 4 Main Tabs

#### 1. Overview
- Real-time pipeline statistics
- Prospects, Leads, and Emails metrics
- Conversion rates and success indicators
- Quick action cards

#### 2. Prospects
- Edit your ICP brief (JSON)
- Generate prospect lists using AI
- Configure analysis depth and modules
- Run website analyzer on selected prospects
- Track status: pending → queued → analyzed

#### 3. Leads
- View all analyzed leads from Supabase
- Filter by grade (A/B/C/D/F), industry, email availability
- See contact information and analysis results
- Select leads for email composition
- Export or copy data

#### 4. Emails
- Compose personalized emails for selected leads
- Choose strategy: compliment-sandwich, problem-first, etc.
- Generate A/B variants for testing
- Optional website re-verification
- Copy to clipboard or sync to Notion
- Track quality scores

---

## Quick Start

### 1. Install Dependencies

```bash
cd command-center-ui
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
OPENAI_API_KEY=sk-...

# Optional
EMAIL_COMPOSER_URL=http://localhost:3001
ANTHROPIC_API_KEY=sk-ant-...
XAI_API_KEY=xai-...
```

### 3. Start Email Composer API

The email composer runs separately on port 3001:

```bash
cd ../email-composer
npm start
```

### 4. Start Next.js Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
command-center-ui/
├── app/              # Next.js pages and API routes
│   ├── page.tsx      # Dashboard (/)
│   ├── prospecting/  # Prospecting module
│   ├── analysis/     # Analysis module
│   ├── leads/        # Leads module
│   ├── outreach/     # Outreach module (emails & social)
│   ├── projects/     # Project management
│   ├── analytics/    # Analytics & reporting
│   └── api/          # API routes for all features
│
├── components/       # React components (organized by feature)
│   ├── ui/           # shadcn/ui primitives
│   ├── shared/       # Reusable components
│   ├── analysis/     # Analysis feature components
│   ├── leads/        # Lead management components
│   ├── outreach/     # Outreach feature components
│   └── prospecting/  # Prospecting feature components
│
├── lib/              # Utilities and business logic
│   ├── api/          # API orchestration
│   ├── database/     # Supabase client
│   ├── server/       # Server utilities
│   ├── utils/        # Domain utilities
│   └── types/        # TypeScript definitions
│
├── docs/             # All documentation
│   ├── features/     # Feature specifications
│   ├── integration/  # Integration guides
│   └── audits/       # System audits
│
└── tests/            # Test suites
    ├── integration/  # Integration tests
    ├── e2e/          # End-to-end tests
    └── database/     # Database tests
```

See [CLEANUP-PLAN.md](CLEANUP-PLAN.md) for detailed structure documentation.

### Data Flow

```
User Input → Next.js API Routes → Backend Services → Supabase

Prospects Tab:
  1. Edit brief → POST /api/prospects → client-orchestrator
  2. Generate URLs → Save to prospects table
  3. Select URLs → POST /api/analyze → website-audit-tool
  4. Analysis complete → Save to leads table

Leads Tab:
  1. GET /api/leads → Query Supabase leads table
  2. Filter and select leads
  3. Click "Compose Emails" → Switch to Emails tab

Emails Tab:
  1. POST /api/compose → email-composer (port 3001)
  2. Generate personalized emails
  3. Save to composed_emails table
  4. Sync to Notion (optional)
```

---

## API Endpoints

### `POST /api/prospects`

Generate prospect list from brief.

**Request:**
```json
{
  "brief": { /* ICP brief JSON */ },
  "count": 20,
  "city": "Philadelphia, PA",
  "model": "gpt-4o-mini",
  "verify": true
}
```

**Response:**
```json
{
  "success": true,
  "companies": [...],
  "urls": [...],
  "runId": "uuid"
}
```

### `POST /api/analyze`

Run website analyzer on URLs.

**Request:**
```json
{
  "urls": ["https://example.com"],
  "options": {
    "tier": "tier1",
    "emailType": "local",
    "modules": ["seo", "visual"],
    "metadata": { "campaignId": "fall-2025" }
  }
}
```

### `GET /api/leads`

Fetch analyzed leads with filters.

**Query params:**
- `grade` - Filter by A/B/C/D/F
- `industry` - Filter by industry
- `hasEmail` - Only leads with email
- `limit` - Max results (default 50)
- `offset` - Pagination

### `POST /api/compose`

Compose email for a lead.

**Request:**
```json
{
  "url": "https://example.com",
  "strategy": "compliment-sandwich",
  "generateVariants": false,
  "verify": false
}
```

**Response:**
```json
{
  "success": true,
  "lead": { "company": "Example Inc", ... },
  "email": { "subject": "...", "body": "..." },
  "validation": { "score": 95, ... },
  "supabase_id": "uuid",
  "notion_page_id": "notion-id"
}
```

### `GET /api/stats`

Dashboard statistics.

**Response:**
```json
{
  "success": true,
  "prospects": { "total": 100, "pending": 20, ... },
  "leads": { "total": 80, "A": 15, "B": 30, ... },
  "emails": { "total": 45, "sent": 20, ... }
}
```

---

## Database Schema

### Required Supabase Tables

**prospects** - Generated prospects
```sql
create table prospects (
  id uuid primary key,
  website text unique not null,
  company_name text,
  industry text,
  why_now text,
  status text default 'pending_analysis',
  created_at timestamptz default now()
);
```

**leads** - Analyzed websites
```sql
create table leads (
  id uuid primary key,
  url text unique not null,
  company_name text,
  industry text,
  lead_grade text,
  contact_email text,
  contact_phone text,
  analysis_cost numeric,
  created_at timestamptz default now()
);
```

**composed_emails** - Generated emails
```sql
create table composed_emails (
  id uuid primary key,
  lead_id uuid references leads(id),
  url text,
  email_subject text,
  email_body text,
  status text default 'pending',
  quality_score integer,
  created_at timestamptz default now()
);
```

See each app's docs for full schema definitions.

---

## Development

### Run in Development Mode

```bash
npm run dev
```

Changes auto-reload with Fast Refresh.

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

---

## Customization

### Change Brand Colors

Edit `tailwind.config.ts`:

```typescript
colors: {
  brand: {
    400: '#60a5fa',  // Light
    500: '#3b82f6',  // Medium
    600: '#2563eb',  // Dark
  }
}
```

### Add New Modules

1. Create component in `components/`
2. Add API route in `app/api/`
3. Update `unified-dashboard.tsx` to include new tab

### Environment Variables

All config comes from `.env`:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Service role key (full access)
- `EMAIL_COMPOSER_URL` - Email composer API (default localhost:3001)
- `OPENAI_API_KEY` - For prospect generation
- `ANTHROPIC_API_KEY` - Optional
- `XAI_API_KEY` - Optional

---

## Deployment

### Vercel (Recommended)

```bash
vercel
```

Add environment variables in Vercel dashboard.

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

---

## Troubleshooting

### "Supabase credentials not configured"

Make sure `.env` has `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.

### "Failed to compose email"

Check that `email-composer` is running on port 3001:

```bash
cd ../email-composer
npm start
```

### API routes returning 404

Restart dev server:

```bash
npm run dev
```

---

## Documentation

### Guides & References
- [Cleanup Plan](CLEANUP-PLAN.md) - Detailed directory reorganization documentation
- [Documentation Index](docs/README.md) - Complete documentation directory
- [Testing Guide](tests/README.md) - Test suites and standards
- [Components Guide](components/README.md) - Component architecture
- [Lib Utilities Guide](lib/README.md) - Utility functions reference

### Feature Documentation
- [Fork Warning System](docs/features/fork-warning-system.md)
- [Lead Detail Enhancements](docs/features/lead-detail-enhancements.md)
- [Lead Detail Refactor](docs/features/lead-detail-refactor.md)

### Integration & Security
- [Client Orchestrator Integration](docs/integration/client-orchestrator.md)
- [Security Guidelines](docs/security/security.md)

### Reports & Audits
- [UI Audit (2025-10-20)](docs/audits/ui-audit.md)
- [Implementation Phases 6-8](docs/implementation/phases-6-8.md)

---

## License

MIT

---

## Support

Built by [Maksant](https://maksant.com)

- Email: maksantagency@gmail.com
- See individual app READMEs for detailed documentation
