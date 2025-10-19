# Maksant Agency - Complete Lead Generation System

**One unified interface for the complete pipeline: Find Leads → Analyze Websites → Compose Emails**

---

## Quick Start (30 Seconds)

### Option 1: Double-Click (Windows)

```
Double-click: start.bat
```

This starts everything automatically:
- Email Composer API (port 3001)
- Command Center UI (port 3000)

Then open: **http://localhost:3000**

### Option 2: Single Command (All Platforms)

```bash
npm install
npm start
```

---

## What You Get

### 4 Apps in One Interface

**1. Client Orchestrator** - Generate prospect lists from your ICP brief
**2. Website Audit Tool** - Analyze websites and extract contact data
**3. Email Composer** - Create personalized AI-powered outreach emails
**4. Command Center UI** - Unified dashboard to manage everything

### Complete Workflow

```
Overview Tab     → Real-time stats and pipeline health
Prospects Tab    → Generate leads from brief → Analyze websites
Leads Tab        → Browse analyzed leads → Filter by grade/email
Emails Tab       → Compose personalized emails → Send or sync to Notion
```

---

## First Time Setup

### 1. Install Dependencies

```bash
npm run install:all
```

This installs packages for all 4 apps.

### 2. Configure Environment

All `.env` files are already configured! If you need to update credentials:

- `website-audit-tool/.env` - Main config (Supabase, AI keys)
- `email-composer/.env` - Email API config
- `command-center-ui/.env` - UI config (auto-synced)

### 3. Start Everything

```bash
npm start
```

Or double-click `start.bat` (Windows)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Command Center UI                         │
│                   (localhost:3000)                           │
├─────────────────────────────────────────────────────────────┤
│  Overview  │  Prospects  │  Leads  │  Emails                │
└─────────────────────────────────────────────────────────────┘
              ↓                ↓               ↓
    ┌─────────────┐   ┌──────────────┐   ┌──────────────┐
    │   Client    │   │   Website    │   │    Email     │
    │Orchestrator │   │  Audit Tool  │   │  Composer    │
    └─────────────┘   └──────────────┘   └──────────────┘
              ↓                ↓               ↓
    ┌─────────────────────────────────────────────────────┐
    │              Supabase Database                       │
    │  prospects → leads → composed_emails                │
    └─────────────────────────────────────────────────────┘
```

---

## Project Structure

```
MaxantAgency/
├── start.bat                      ← Double-click to start everything
├── package.json                   ← Root package with start scripts
├── UNIFIED-SETUP.md              ← Detailed setup guide
│
├── command-center-ui/            ← Main UI (port 3000)
│   ├── app/                      │  - 4 tabs: Overview, Prospects, Leads, Emails
│   ├── components/               │  - Real-time stats
│   └── .env                      │  - Unified dashboard
│
├── email-composer/               ← Email API (port 3001)
│   ├── server.js                 │  - AI-powered email generation
│   ├── modules/                  │  - Notion sync
│   └── .env                      │  - Quality validation
│
├── website-audit-tool/           ← Analysis engine
│   ├── analyzer.js               │  - 6 specialized AI agents
│   ├── modules/                  │  - Contact extraction
│   └── .env                      │  - Website grading (A-F)
│
└── client-orchestrator/          ← Prospect generation
    ├── index.js                  │  - LLM-powered lead discovery
    └── brief.json                │  - URL verification
```

---

## Available Commands

### Start Everything

```bash
npm start                 # Start all services
npm run dev              # Same as npm start
```

### Individual Services

```bash
npm run start:email      # Just email composer (port 3001)
npm run start:ui         # Just UI (port 3000)
```

### Maintenance

```bash
npm run install:all      # Install all dependencies
```

---

## How to Use

### 1. Generate Prospects (Prospects Tab)

1. Edit your ICP brief (JSON format)
2. Set parameters: count, city, model
3. Click "Generate Prospects"
4. Wait ~30-60 seconds
5. See table of verified companies

### 2. Analyze Websites (Prospects Tab)

1. Select prospects (or keep all selected)
2. Configure analyzer: tier, modules
3. Click "Run Analyzer"
4. Wait 1-3 min per website
5. Results saved to database

### 3. Browse Leads (Leads Tab)

1. View all analyzed leads
2. Filter by grade (A/B/C/D/F)
3. Filter by email availability
4. Select leads to contact

### 4. Compose Emails (Emails Tab)

1. Choose email strategy
2. Generate A/B variants (optional)
3. Click "Compose Emails"
4. Review quality scores
5. Copy or sync to Notion

---

## Ports

| Service | Port | URL |
|---------|------|-----|
| Command Center UI | 3000 | http://localhost:3000 |
| Email Composer API | 3001 | http://localhost:3001 |

---

## Database

All apps share one Supabase database:

- **prospects** - Generated leads (status: pending → queued → analyzed)
- **leads** - Analyzed websites (grade A-F, contact info)
- **composed_emails** - Generated emails (status: pending → sent)

---

## Cost Estimates

**Per Lead (Full Pipeline):**
- Prospect generation: $0.001
- Website analysis: $0.04-0.12
- Email composition: $0.002-0.005
- **Total: ~$0.05-0.13 per lead**

**Monthly Examples:**
- 50 leads: ~$2.50-6.50
- 100 leads: ~$5.00-13.00
- 500 leads: ~$25.00-65.00

---

## Troubleshooting

### Port already in use

**Error:** Port 3000 or 3001 already in use

**Fix:**
```bash
# Windows
taskkill /F /PID <port-number>

# Mac/Linux
lsof -ti:3000 | xargs kill
lsof -ti:3001 | xargs kill
```

### Email composer not responding

**Fix:** Make sure it's running on port 3001:
```bash
npm run start:email
```

### Supabase errors

**Fix:** Check credentials in `command-center-ui/.env`:
```
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=eyJ...
```

---

## Documentation

- **Command Center UI:** [command-center-ui/README.md](command-center-ui/README.md)
- **Setup Guide:** [UNIFIED-SETUP.md](UNIFIED-SETUP.md)
- **Website Audit Tool:** [website-audit-tool/README.md](website-audit-tool/README.md)
- **Email Composer:** [email-composer/README.md](email-composer/README.md)
- **Client Orchestrator:** [client-orchestrator/README.md](client-orchestrator/README.md)

---

## Support

**Built by Maksant**
- Website: [maksant.com](https://maksant.com)
- Email: maksantagency@gmail.com

---

**Ready to generate leads?**

```bash
npm start
```

Then open: http://localhost:3000
