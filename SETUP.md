# MaxantAgency - Setup Guide

Complete guide to get MaxantAgency running on **any PC** (Windows, Mac, Linux).

---

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **8GB+ RAM** (for Analysis Engine with Playwright)

**Optional:**
- **PM2** for production deployment: `npm install -g pm2`

---

## 🚀 Quick Start (5 Minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/MaxantAgency.git
cd MaxantAgency
```

### 2. Run the Setup Script

**Windows:**
```bash
npm run setup
```

**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

This will:
- ✅ Install all dependencies for all services
- ✅ Create `.env` from template (if not exists)
- ✅ Verify Node.js version
- ✅ Check required ports are available

### 3. Configure Environment Variables

Edit `.env` in the root directory:

```bash
# Windows
notepad .env

# Mac/Linux
nano .env
```

**Minimum Required:**
```env
# Database (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# AI Keys (At least one required)
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...

# Sender Info (Required for outreach)
SENDER_NAME=Your Name
SENDER_COMPANY=Your Company
SENDER_PHONE=123-456-7890
SENDER_WEBSITE=https://yoursite.com
```

**Get API Keys:**
- **Supabase**: [supabase.com](https://supabase.com) → Create project → Settings → API
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com/)
- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 4. Setup Database

```bash
cd database-tools
npm run db:validate    # Check schemas
npm run db:setup       # Create tables
cd ..
```

### 5. Start All Services

```bash
npm run dev
```

This starts:
- 🔍 **Prospecting Engine** → http://localhost:3010
- 🎨 **Analysis Engine** → http://localhost:3001
- 📧 **Outreach Engine** → http://localhost:3002
- 🔄 **Pipeline Orchestrator** → http://localhost:3020
- 🖥️ **Command Center UI** → http://localhost:3000

### 6. Open Dashboard

```bash
# Open in browser
http://localhost:3000
```

---

## 🔧 Manual Setup (Step-by-Step)

If the automated script doesn't work, follow these steps:

### Step 1: Verify Prerequisites

```bash
node --version    # Should be v18.0.0 or higher
npm --version     # Should be 8.0.0 or higher
```

### Step 2: Install Root Dependencies

```bash
npm install
```

### Step 3: Install Service Dependencies

```bash
# Install all at once
npm run install:all

# OR install individually
cd prospecting-engine && npm install && cd ..
cd analysis-engine && npm install && cd ..
cd outreach-engine && npm install && cd ..
cd pipeline-orchestrator && npm install && cd ..
cd command-center-ui && npm install && cd ..
cd database-tools && npm install && cd ..
```

### Step 4: Install Playwright Browsers

```bash
cd analysis-engine
npx playwright install chromium
cd ..
```

### Step 5: Create Environment File

```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env  # or use any text editor
```

### Step 6: Setup Database

```bash
cd database-tools

# Validate schemas
npm run db:validate

# Preview SQL (optional)
npm run db:setup -- --dry-run

# Create tables
npm run db:setup

cd ..
```

### Step 7: Start Services

**Option A: All services together**
```bash
npm run dev
```

**Option B: Individual services** (in separate terminals)
```bash
# Terminal 1: Prospecting Engine
npm run dev:prospecting

# Terminal 2: Analysis Engine
npm run dev:analysis

# Terminal 3: Outreach Engine
npm run dev:outreach

# Terminal 4: Pipeline Orchestrator
npm run dev:pipeline

# Terminal 5: Command Center UI
npm run dev:ui
```

---

## ✅ Verification

### Test All Services

```bash
# Run verification script
node scripts/verify-setup.js
```

This checks:
- ✅ All services are running
- ✅ Database connection works
- ✅ API keys are configured
- ✅ All health endpoints respond

### Manual Health Checks

```bash
curl http://localhost:3010/health  # Prospecting
curl http://localhost:3001/health  # Analysis
curl http://localhost:3002/health  # Outreach
curl http://localhost:3020/health  # Pipeline
```

Expected response:
```json
{
  "status": "ok",
  "service": "prospecting-engine",
  "version": "2.0.0",
  "timestamp": "2025-10-22T..."
}
```

---

## 🐛 Troubleshooting

### Issue: "Port already in use"

**Error:** `EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3001 | xargs kill -9
```

### Issue: "Cannot find module"

**Error:** `Error: Cannot find module '@supabase/supabase-js'`

**Solution:**
```bash
# Reinstall all dependencies
npm run install:all

# Or specific service
cd analysis-engine
npm install
```

### Issue: "Playwright browser not found"

**Error:** `browserType.launch: Executable doesn't exist`

**Solution:**
```bash
cd analysis-engine
npx playwright install chromium
npx playwright install-deps  # Linux only
```

### Issue: "Database connection failed"

**Error:** `Failed to connect to Supabase`

**Solution:**
1. Check `.env` has correct `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
2. Verify Supabase project is active
3. Test connection:
```bash
curl $SUPABASE_URL/rest/v1/
```

### Issue: Services won't start on Windows

**Solution:**
Use individual commands instead of `npm run dev`:
```bash
# In separate terminals
cd prospecting-engine && node server.js
cd analysis-engine && node server.js
cd outreach-engine && node server.js
cd pipeline-orchestrator && node server.js
cd command-center-ui && npm run dev
```

---

## 📦 Project Structure

```
MaxantAgency/
├── .env                      # ← Your API keys (DO NOT COMMIT)
├── .env.example              # ← Template
├── package.json              # ← Root npm scripts
├── setup.sh                  # ← Automated setup (Mac/Linux)
├── setup.bat                 # ← Automated setup (Windows)
│
├── prospecting-engine/       # Port 3010
├── analysis-engine/          # Port 3001
├── outreach-engine/          # Port 3002
├── pipeline-orchestrator/    # Port 3020
├── command-center-ui/        # Port 3000
│
├── database-tools/           # Schema management
├── scripts/                  # Setup & verification scripts
└── logs/                     # Service logs
```

---

## 🔐 Security Best Practices

### Before Committing:

1. **Never commit `.env`**
```bash
# Verify .env is ignored
git status
# Should NOT show .env

# If it does:
git rm --cached .env
```

2. **Use `.env.example` only**
```bash
# Update template without secrets
cp .env .env.example
# Then manually remove API keys from .env.example
```

3. **Rotate keys if exposed**
If you accidentally commit API keys, rotate them immediately:
- Anthropic: [console.anthropic.com](https://console.anthropic.com/)
- OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Supabase: [supabase.com/dashboard](https://supabase.com/dashboard)

---

## 🚀 Production Deployment

### Option 1: PM2 (Recommended for VPS)

```bash
# Install PM2 globally
npm install -g pm2

# Build UI
cd command-center-ui
npm run build
cd ..

# Start all services
pm2 start ecosystem.config.js

# Save for auto-restart
pm2 save
pm2 startup

# Monitor
pm2 status
pm2 logs
pm2 monit
```

### Option 2: Docker

```bash
# Build
docker-compose build

# Start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 📚 Next Steps

Once setup is complete:

1. **Create a Project** → http://localhost:3000/projects
2. **Generate Prospects** → Projects → Start Prospecting
3. **Analyze Websites** → Leads Tab → Run Analysis
4. **Generate Outreach** → Outreach Tab → Compose Emails
5. **Set Up Campaigns** → Pipeline Tab → Create Campaign

---

## 🆘 Getting Help

- **Documentation**: See [CLAUDE.md](./CLAUDE.md) for architecture details
- **Database**: See [database-tools/README.md](./database-tools/README.md)
- **Issues**: Check logs in `logs/` directory
- **Health Status**: Run `node scripts/verify-setup.js`

---

## ✨ Quick Commands Reference

```bash
# Development
npm run dev                    # Start all services
npm run dev:prospecting        # Start prospecting only
npm run dev:analysis          # Start analysis only
npm run dev:outreach          # Start outreach only
npm run dev:pipeline          # Start pipeline only
npm run dev:ui                # Start UI only

# Database
cd database-tools
npm run db:validate           # Check schemas
npm run db:setup              # Create tables
npm run db:setup -- --dry-run # Preview SQL

# Production
pm2 start ecosystem.config.js # Start all (PM2)
pm2 status                    # View status
pm2 logs                      # View logs
pm2 restart all               # Restart all

# Verification
node scripts/verify-setup.js  # Check everything
```

---

**You're all set! 🎉**

Open http://localhost:3000 and start generating leads!