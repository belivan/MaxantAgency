# MaxantAgency Lead Generation System

AI-powered lead generation pipeline with automated prospecting, website analysis, and multi-channel outreach.

## System Overview

MaxantAgency is a complete lead generation platform built on a microservices architecture with 7 specialized agents:

```
┌─────────────────────────────────────────────────────────────┐
│                    Command Center UI                        │
│                   (Next.js - Port 3000)                     │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐       ┌─────▼─────┐      ┌─────▼─────┐
    │Prospecting│       │ Analysis  │      │ Outreach  │
    │  Engine   │       │  Engine   │      │  Engine   │
    │Port 3010  │       │Port 3001  │      │Port 3002  │
    └───────────┘       └───────────┘      └───────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                        ┌─────▼─────┐
                        │  Pipeline │
                        │Orchestrator│
                        │Port 3020  │
                        └───────────┘
                              │
                        ┌─────▼─────┐
                        │  Supabase │
                        │PostgreSQL │
                        └───────────┘
```

### The 7 Agents

1. **Prospecting Engine** - Universal company discovery via Google Maps, Yelp, directories
2. **Analysis Engine** - AI-powered website analysis with screenshot grading (A-F)
3. **Outreach Engine** - Multi-channel personalized messaging (email + social)
4. **Command Center UI** - Next.js dashboard for managing the entire pipeline
5. **Database Tools** - Supabase schemas, migrations, and utilities
6. **Pipeline Orchestrator** - Automated campaign scheduler with budget controls
7. **QA Supervisor** - Testing and validation framework

## Quick Start

### Development (Local)

```bash
# Install all dependencies
npm run install:all

# Start all services
npm run dev

# Access Command Center
open http://localhost:3000
```

### Production Deployment

Choose your deployment method:

#### Option 1: Docker (Recommended)
```bash
# Set up environment
cp .env.production.example .env
nano .env

# Build and start
npm run docker:build
npm run docker:up

# View logs
npm run docker:logs
```
See [DOCKER-DEPLOY.md](./DOCKER-DEPLOY.md) for full guide.

#### Option 2: VPS with PM2
```bash
# On your server
npm run install:all
npm run build
npm run pm2:start

# View status
pm2 status
```
See [DEPLOYMENT.md](./DEPLOYMENT.md) for full guide.

## Features

### Prospecting Engine
- Multi-source discovery (Google Maps, Yelp, industry directories)
- 4-phase intelligence gathering:
  - Phase 1: Basic info (name, location, phone)
  - Phase 2: Website discovery
  - Phase 3: Contact extraction (email, LinkedIn)
  - Phase 4: Decision-maker identification
- Smart deduplication across sources
- Supabase integration for storage

### Analysis Engine
- Playwright-powered screenshot capture
- Multi-dimensional website grading:
  - Visual design (A-F)
  - Content quality (A-F)
  - SEO analysis (A-F)
  - Mobile responsiveness (A-F)
- AI-generated actionable critiques
- Identifies web design agency opportunities

### Outreach Engine
- Email composition with 6+ strategies:
  - Problem-first approach
  - Achievement-focused
  - Industry insight
  - Compliment sandwich
- LinkedIn social outreach templates
- SMTP integration (Gmail, custom)
- Personalization engine using prospect data
- A/B testing support

### Pipeline Orchestrator
- Automated campaign scheduling (cron jobs)
- Budget controls (max cost per campaign)
- Multi-step pipeline execution:
  1. Prospect discovery
  2. Website analysis
  3. Outreach generation
  4. Email sending
- Campaign result tracking
- SSE (Server-Sent Events) for real-time progress

### Command Center UI
- **Prospects Tab**: Search, filter, manage prospects
- **Leads Tab**: View analyzed websites with grades
- **Outreach Tab**: Generated emails and social posts
- **Projects Tab**: Manual campaign management
- **Stats Tab**: Analytics and performance metrics
- **Settings Tab**: API configuration, SMTP setup
- Real-time SSE updates for long-running operations

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Node.js 18+
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4, Anthropic Claude
- **Automation**: Playwright (screenshots), Node-cron (scheduling)
- **APIs**: Google Maps, Yelp, SMTP (Nodemailer)

## Environment Variables

Required API keys and credentials:

```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# AI
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Prospecting
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

See [.env.production.example](./.env.production.example) for full list.

## Project Structure

```
MaxantAgency/
├── prospecting-engine/          # Agent 1: Company discovery
│   ├── server.js                # Express API (port 3010)
│   ├── discoverers/             # Google Maps, Yelp scrapers
│   ├── enrichers/               # Contact extraction
│   └── tests/
├── analysis-engine/             # Agent 2: Website analysis
│   ├── server.js                # Express API (port 3001)
│   ├── analyzers/               # Design, SEO, content analysis
│   ├── grading/                 # A-F grading system
│   ├── scrapers/                # Playwright screenshot capture
│   └── tests/
├── outreach-engine/             # Agent 3: Personalized outreach
│   ├── server.js                # Express API (port 3002)
│   ├── composers/               # Email/social generation
│   ├── strategies/              # Outreach strategy templates
│   └── tests/
├── pipeline-orchestrator/       # Agent 6: Automation
│   ├── server.js                # Express API (port 3020)
│   ├── campaign-manager.js      # Scheduled campaign execution
│   └── pipeline-executor.js     # Multi-step workflows
├── command-center-ui/           # Agent 4: Dashboard
│   ├── app/                     # Next.js 14 app router
│   ├── components/              # React components
│   └── lib/                     # Utilities, hooks
├── database/                    # Agent 5: Database tools
│   ├── schema.sql               # Supabase tables
│   └── migrations/
└── qa-supervisor/               # Agent 7: Testing framework
    └── tests/
```

## API Endpoints

### Prospecting Engine (port 3010)
- `POST /api/discover` - Discover prospects by query
- `POST /api/enrich` - Enrich existing prospects
- `GET /api/prospects` - List all prospects
- `GET /health` - Health check

### Analysis Engine (port 3001)
- `POST /api/analyze` - Analyze prospects from database
- `POST /api/analyze-url` - Analyze single URL
- `GET /api/leads` - Get analyzed leads
- `GET /api/stats` - Analysis statistics
- `GET /health` - Health check

### Outreach Engine (port 3002)
- `POST /api/compose-email` - Generate personalized email
- `POST /api/compose-social` - Generate social outreach
- `POST /api/send-email` - Send via SMTP
- `GET /api/outreach` - List generated outreach
- `GET /health` - Health check

### Pipeline Orchestrator (port 3020)
- `POST /api/campaigns` - Create scheduled campaign
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns/:id/run` - Run campaign manually
- `DELETE /api/campaigns/:id` - Delete campaign
- `GET /health` - Health check

## Database Schema

Supabase tables:
- `prospects` - Raw prospect data from discovery
- `leads` - Analyzed prospects with grades
- `composed_emails` - Generated email outreach
- `social_outreach` - Generated social messages
- `campaigns` - Scheduled automation campaigns

## Cost Estimates

**Monthly Operating Costs:**
- VPS Hosting: $20-48 (4-8GB RAM)
- Supabase: Free tier (500MB database)
- OpenAI API: $10-50 (GPT-4 usage)
- Google Maps API: $5-20 (search queries)
- Domain: $1/month ($12/year)

**Total: $35-110/month** depending on scale

## Development

```bash
# Run individual services
npm run dev:prospecting    # Prospecting Engine only
npm run dev:analysis       # Analysis Engine only
npm run dev:outreach       # Outreach Engine only
npm run dev:pipeline       # Pipeline Orchestrator only
npm run dev:ui             # Command Center UI only

# Run tests
cd prospecting-engine && npm test
cd analysis-engine && npm test
cd outreach-engine && npm test
```

## Deployment Options

1. **Docker Compose** - Containerized deployment
2. **PM2 on VPS** - Traditional server deployment
3. **Railway** - One-click platform deployment
4. **DigitalOcean App Platform** - Managed container hosting
5. **Vercel (UI only)** - Frontend-only deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) and [DOCKER-DEPLOY.md](./DOCKER-DEPLOY.md) for guides.

## Security

- All API keys in `.env` file (never committed)
- HTTPS via Let's Encrypt (in production)
- Supabase Row Level Security (RLS)
- CORS configured for frontend origin only
- Rate limiting on API endpoints
- Input validation and sanitization

## Monitoring

### PM2 Deployment
```bash
pm2 status          # View all services
pm2 logs            # View logs
pm2 monit           # CPU/Memory monitoring
```

### Docker Deployment
```bash
docker-compose ps           # View containers
docker-compose logs -f      # View logs
docker stats                # Resource usage
```

## Troubleshooting

**Services won't start:**
- Check `.env` file exists with all required keys
- Verify ports 3000-3002, 3010, 3020 are available
- Check logs: `pm2 logs` or `docker-compose logs`

**Playwright fails:**
- Install dependencies: `npx playwright install --with-deps chromium`
- Ensure 8GB+ RAM for Analysis Engine
- Check shared memory in Docker: `shm_size: '2gb'`

**Can't connect to database:**
- Verify Supabase credentials in `.env`
- Check Supabase project is running
- Test connection: `curl $SUPABASE_URL/rest/v1/`

## Contributing

This is a private project for MaxantAgency. To add features:
1. Create feature branch: `git checkout -b feature/name`
2. Make changes and test
3. Commit: `git commit -m "Add feature"`
4. Push and create PR

## License

MIT License - © 2025 MaxantAgency

---

**Need Help?**
- Deployment: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- Docker: See [DOCKER-DEPLOY.md](./DOCKER-DEPLOY.md)
- Issues: Check logs and troubleshooting section above
