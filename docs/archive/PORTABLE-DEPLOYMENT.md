# MaxantAgency - Portable Deployment Package 📦

This package is configured for **easy deployment on any PC**. Just clone, run setup, and go!

---

## 🎯 What Makes This Portable?

✅ **Single `.env` file** - All configuration in one place (root directory)
✅ **Automated setup scripts** - One command installs everything
✅ **Centralized database tools** - Schemas managed from one location
✅ **Self-contained services** - Each engine has its own dependencies
✅ **No hardcoded paths** - Works on Windows, Mac, and Linux
✅ **Verification script** - Check if everything is configured correctly

---

## 📁 Files for Portable Deployment

### Setup Files (New!)
- **`setup.bat`** - Windows automated setup script
- **`setup.sh`** - Mac/Linux automated setup script (executable)
- **`scripts/verify-setup.js`** - System verification tool
- **`.env.example`** - Template with all required variables

### Documentation (New!)
- **`QUICKSTART.md`** - 5-minute setup guide
- **`SETUP.md`** - Comprehensive installation guide
- **`DEPLOYMENT-CHECKLIST.md`** - Step-by-step deployment checklist
- **`PORTABLE-DEPLOYMENT.md`** - This file

### Existing Documentation
- **`README.md`** - Project overview and features
- **`CLAUDE.md`** - Architecture and development patterns
- **`database-tools/README.md`** - Database schema management

---

## 🚀 Deployment Workflow

### For End Users (Non-Technical)

1. **Clone repository**
```bash
git clone <repo-url>
cd MaxantAgency
```

2. **Run setup** (auto-installs everything)
```bash
# Windows
setup.bat

# Mac/Linux
./setup.sh
```

3. **Add API keys** (guided by setup script)
```bash
# Setup script opens .env for you
# Just paste your API keys
```

4. **Setup database**
```bash
cd database-tools
npm run db:setup
cd ..
```

5. **Start services**
```bash
npm run dev
```

6. **Open dashboard**
```
http://localhost:3000
```

**Total time:** ~10 minutes (including API key signup)

---

### For Developers

```bash
# 1. Clone
git clone <repo-url>
cd MaxantAgency

# 2. Quick setup
./setup.sh  # or setup.bat on Windows

# 3. Configure
cp .env.example .env
nano .env  # Add your keys

# 4. Database
cd database-tools && npm run db:setup && cd ..

# 5. Verify
npm run verify

# 6. Start
npm run dev
```

---

## 🔧 Configuration

### Minimum Required (5 variables)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...
ANTHROPIC_API_KEY=sk-ant-...  # OR OpenAI
SENDER_NAME=Your Name
SENDER_COMPANY=Your Company
```

### Full Production (35+ variables)
See `.env.example` for complete list with:
- Multiple AI providers
- Google Maps integration
- Gmail SMTP
- Notion sync
- Pipeline automation
- Budget controls

---

## 📦 What Gets Installed

### Root Level
- `concurrently` - Run multiple services
- `dotenv` - Environment variables
- `@supabase/supabase-js` - Database client

### Per Service
- **Prospecting Engine** (~200MB)
  - Express, Supabase, OpenAI, Anthropic, Playwright

- **Analysis Engine** (~300MB)
  - Express, Supabase, OpenAI, Anthropic, Playwright, Sharp

- **Outreach Engine** (~150MB)
  - Express, Supabase, OpenAI, Anthropic, Nodemailer

- **Pipeline Orchestrator** (~100MB)
  - Express, Supabase, node-cron

- **Command Center UI** (~500MB)
  - Next.js, React, Tailwind, Radix UI, Supabase

**Total disk space:** ~2GB (including node_modules)

---

## 🌍 Cross-Platform Compatibility

### Windows
- ✅ Setup via `setup.bat`
- ✅ PowerShell compatible
- ✅ Command Prompt compatible
- ✅ Ports 3000-3020 available by default

### Mac
- ✅ Setup via `setup.sh`
- ✅ Bash/Zsh compatible
- ✅ Apple Silicon (M1/M2/M3) supported
- ✅ Homebrew-friendly

### Linux (Ubuntu/Debian/CentOS)
- ✅ Setup via `setup.sh`
- ✅ systemd service files available
- ✅ Docker images available
- ✅ PM2 production deployment

---

## 🔒 Security for Distribution

### Before Sharing Repository

1. **Verify `.gitignore` is correct**
```bash
git status
# Should NOT show .env
```

2. **Check no secrets in history**
```bash
git log --all --full-history -- "*/.env"
# Should return nothing
```

3. **Remove API keys from .env**
```bash
# Replace your .env with .env.example
cp .env.example .env
```

4. **Clean local backups** (optional)
```bash
rm -rf local-backups/
rm -rf logs/
```

5. **Clean screenshots** (optional)
```bash
rm -rf */screenshots/
rm -rf */analysis-results/
```

### Distribution Checklist
- [ ] No `.env` committed
- [ ] No API keys in code
- [ ] `.env.example` has placeholders only
- [ ] `local-backups/` excluded
- [ ] `logs/` excluded
- [ ] `screenshots/` excluded
- [ ] `node_modules/` excluded

---

## 📊 Port Configuration

### Default Ports
| Service | Port | Can Override |
|---------|------|--------------|
| Command Center UI | 3000 | ✅ via .env |
| Analysis Engine | 3001 | ✅ via .env |
| Outreach Engine | 3002 | ✅ via .env |
| Prospecting Engine | 3010 | ✅ via .env |
| Pipeline Orchestrator | 3020 | ✅ via .env |

### Changing Ports
Edit `.env`:
```env
# Override default ports
PORT=3001  # For analysis-engine
# (Set in each service's .env if running independently)
```

Or edit each service's defaults in their `server.js`:
```javascript
const PORT = process.env.PORT || 3001;
```

---

## 🧪 Testing After Deployment

### Quick Test
```bash
npm run verify
```

### Manual Tests
```bash
# Test health endpoints
curl http://localhost:3010/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3020/health

# Should all return:
# {"status":"ok","service":"...","version":"2.0.0"}
```

### End-to-End Test
1. Create project in UI
2. Generate 1 prospect
3. Analyze 1 website
4. Generate 1 email
5. View in Outreach tab

**Expected time:** 2-3 minutes

---

## 🔄 Updates & Maintenance

### Pulling Latest Changes
```bash
git pull origin main
npm run install:all  # Update dependencies
cd database-tools && npm run db:setup  # Update schemas
npm run verify  # Check everything works
```

### Updating Dependencies
```bash
# Update all packages
npm run install:all

# Or update individually
cd prospecting-engine && npm update
cd ../analysis-engine && npm update
# etc.
```

### Database Migrations
```bash
cd database-tools
npm run db:validate  # Check new schemas
npm run db:setup -- --dry-run  # Preview changes
npm run db:setup  # Apply changes
```

---

## 📞 Support & Troubleshooting

### Common Issues

**"Port already in use"**
```bash
# Kill process on port
lsof -ti:3001 | xargs kill -9  # Mac/Linux
netstat -ano | findstr :3001   # Windows (find PID)
taskkill /PID <PID> /F         # Windows (kill)
```

**"Cannot find module"**
```bash
npm run install:all
```

**"Database connection failed"**
```bash
# Check Supabase credentials in .env
# Test connection
curl $SUPABASE_URL/rest/v1/
```

**"Playwright browser not found"**
```bash
cd analysis-engine
npx playwright install chromium
```

### Getting Help
1. Check [SETUP.md](./SETUP.md) troubleshooting section
2. Run `npm run verify` to diagnose issues
3. Check service logs in `logs/` directory
4. Review service console output

---

## 📝 Deployment Notes

### Recommended Specs
- **Development:** 8GB RAM, 4 cores, 10GB disk
- **Production (light):** 8GB RAM, 4 cores, 20GB disk
- **Production (heavy):** 16GB RAM, 8 cores, 50GB disk

### Scaling
- Each engine is independent and can scale horizontally
- Use PM2 cluster mode for multiple instances
- Consider Redis for session management (future)
- Consider message queue for async jobs (future)

### Backup Strategy
- Database: Supabase automatic backups
- Local data: `local-backups/` directory (git-ignored)
- Configs: `.env.example` committed as template
- Code: Git repository

---

## ✨ What's Different from Other Projects?

### This Project
- ✅ One `.env` file (centralized)
- ✅ Automated setup scripts
- ✅ Verification tool
- ✅ Comprehensive documentation
- ✅ Local-first data persistence
- ✅ Cross-platform compatible

### Typical Projects
- ❌ Multiple `.env` files scattered
- ❌ Manual setup (error-prone)
- ❌ No verification
- ❌ Minimal README only
- ❌ Rely on external services only
- ❌ Platform-specific

---

## 🎉 You're Ready to Deploy!

Your MaxantAgency project is now fully portable and ready for deployment on any PC.

**Quick commands:**
```bash
./setup.sh              # Setup everything
npm run verify          # Check configuration
npm run dev             # Start development
npm run pm2:start       # Start production
```

**Open:** http://localhost:3000

Happy deploying! 🚀
