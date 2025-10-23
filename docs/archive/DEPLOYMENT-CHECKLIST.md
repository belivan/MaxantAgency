# MaxantAgency Deployment Checklist ✅

Use this checklist when setting up MaxantAgency on a new PC or server.

---

## 📋 Pre-Deployment

### System Requirements
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm 8+ installed (`npm --version`)
- [ ] 8GB+ RAM available (for Playwright in Analysis Engine)
- [ ] 2GB+ disk space
- [ ] Git installed (for cloning repo)

### Accounts & API Keys
- [ ] Supabase account created ([supabase.com](https://supabase.com))
- [ ] Supabase project created
- [ ] At least ONE AI provider account:
  - [ ] Anthropic API key ([console.anthropic.com](https://console.anthropic.com/))
  - [ ] OR OpenAI API key ([platform.openai.com](https://platform.openai.com/))
- [ ] Google Maps API key (if using prospecting)
- [ ] Gmail app password (if sending emails)
- [ ] Notion API key (if using Notion sync)

---

## 🚀 Installation Steps

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/MaxantAgency.git
cd MaxantAgency
```
- [ ] Repository cloned
- [ ] Changed to project directory

### 2. Run Setup Script
**Windows:**
```bash
setup.bat
```
**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```
- [ ] Setup script completed successfully
- [ ] All dependencies installed
- [ ] `.env` file created

### 3. Configure Environment
```bash
# Edit .env file
notepad .env  # Windows
nano .env     # Mac/Linux
```

**Required variables:**
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_SERVICE_KEY` - Service role key (NOT anon key)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Same as SUPABASE_URL
- [ ] `NEXT_PUBLIC_SUPABASE_KEY` - Service key or anon key
- [ ] `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` - At least one
- [ ] `SENDER_NAME` - Your name
- [ ] `SENDER_COMPANY` - Your company
- [ ] `SENDER_PHONE` - Your phone
- [ ] `SENDER_WEBSITE` - Your website

**Optional but recommended:**
- [ ] `XAI_API_KEY` - For Grok AI
- [ ] `GOOGLE_MAPS_API_KEY` - For prospecting
- [ ] `GMAIL_USER` - For email sending
- [ ] `GMAIL_APP_PASSWORD` - Gmail app password
- [ ] `NOTION_API_KEY` - For Notion integration

### 4. Setup Database
```bash
cd database-tools
npm run db:validate    # Check schemas
npm run db:setup       # Create tables
cd ..
```
- [ ] Schema validation passed
- [ ] Database tables created
- [ ] No errors in console

### 5. Verify Installation
```bash
npm run verify
```
- [ ] Configuration checks: 100% passed
- [ ] All service dependencies installed
- [ ] Database connection working

---

## ▶️ Starting Services

### Development Mode
```bash
npm run dev
```
- [ ] All 5 services started successfully
- [ ] No port conflicts
- [ ] Dashboard accessible at http://localhost:3000

### Production Mode (PM2)
```bash
# Build UI first
cd command-center-ui
npm run build
cd ..

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```
- [ ] All services running in PM2
- [ ] PM2 startup script configured
- [ ] Services set to auto-restart

---

## 🧪 Testing

### Health Check All Services
```bash
curl http://localhost:3010/health  # Prospecting
curl http://localhost:3001/health  # Analysis
curl http://localhost:3002/health  # Outreach
curl http://localhost:3020/health  # Pipeline
```
- [ ] Prospecting Engine: Status OK
- [ ] Analysis Engine: Status OK
- [ ] Outreach Engine: Status OK
- [ ] Pipeline Orchestrator: Status OK
- [ ] Command Center UI: Loads successfully

### Basic Functionality Test
1. **Create Project**
   - [ ] Navigate to http://localhost:3000/projects
   - [ ] Click "New Project"
   - [ ] Fill in details and save
   - [ ] Project appears in list

2. **Generate Test Prospect**
   - [ ] Open project
   - [ ] Enter ICP (industry, location, target)
   - [ ] Generate 1-2 prospects
   - [ ] Prospects appear in database

3. **Analyze Website**
   - [ ] Navigate to Leads tab
   - [ ] Run analysis on a prospect
   - [ ] Analysis completes with grade (A-F)
   - [ ] Results save to database

4. **Generate Email**
   - [ ] Navigate to Outreach tab
   - [ ] Select analyzed lead
   - [ ] Generate email
   - [ ] Email appears with personalization

---

## 🔐 Security Check

### Before Going Live
- [ ] `.env` is in `.gitignore`
- [ ] `.env` NOT committed to git
- [ ] No API keys in code
- [ ] Supabase Row Level Security enabled
- [ ] Strong service role key used
- [ ] SSL/HTTPS configured (production)
- [ ] Firewall rules configured (production)
- [ ] Regular backups scheduled

### Git Check
```bash
git status
# Should NOT show .env file

git log --all --full-history -- "*/.env"
# Should return nothing
```

---

## 📊 Monitoring Setup

### Local Development
```bash
# Check service status
npm run verify

# View logs
pm2 logs                    # All services
pm2 logs prospecting-engine # Specific service
```

### Production Monitoring
- [ ] PM2 monitoring configured
- [ ] Log rotation enabled
- [ ] Disk space alerts set
- [ ] Backup system tested
- [ ] Health check cron job scheduled

---

## 🔄 Post-Deployment

### First Week
- [ ] Monitor logs for errors
- [ ] Test all major workflows
- [ ] Verify database backups working
- [ ] Check API usage/costs
- [ ] Review system resource usage

### Regular Maintenance
- [ ] Weekly: Check `npm run verify`
- [ ] Weekly: Review error logs
- [ ] Monthly: Update dependencies
- [ ] Monthly: Rotate API keys
- [ ] Quarterly: Review and optimize

---

## 📞 Support Resources

**Documentation:**
- [QUICKSTART.md](./QUICKSTART.md) - 5-minute setup
- [SETUP.md](./SETUP.md) - Detailed setup guide
- [CLAUDE.md](./CLAUDE.md) - Architecture & patterns
- [README.md](./README.md) - Project overview

**Common Issues:**
- Port conflicts → See SETUP.md troubleshooting
- Database errors → Check Supabase credentials
- Service won't start → Check logs in `logs/`
- Playwright errors → Run `npx playwright install chromium`

**Commands:**
```bash
npm run verify          # Check system health
npm run dev            # Start development
npm run pm2:start      # Start production
pm2 status             # Check PM2 services
pm2 logs               # View logs
```

---

## ✅ Deployment Complete!

When all items are checked:
- ✨ System is fully operational
- 🚀 Ready for production use
- 📊 Monitoring is active
- 🔐 Security is configured

**Next Steps:**
1. Create your first campaign
2. Monitor performance
3. Scale as needed

---

**Date Deployed:** _______________
**Deployed By:** _______________
**Server/PC:** _______________
**Version:** _______________
