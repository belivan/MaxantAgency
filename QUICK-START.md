# QUICK START - Maksant Command Center

## ⚡ Start Everything (10 Seconds)

### Step 1: Double-Click This

```
👉 START-HERE.bat
```

### Step 2: Wait 15 Seconds

The script will:
- ✅ Clean up old processes
- ✅ Start Email Composer API (port 3001)
- ✅ Start Command Center UI (port 3000)
- ✅ Open your browser automatically

### Step 3: You're Ready!

Open: **http://localhost:3000**

---

## 📊 The 4 Tabs

### 1. Overview Tab
- Real-time pipeline stats
- Prospects → Leads → Emails metrics
- Conversion rates
- Quick action cards

### 2. Prospects Tab
**Generate leads from your ICP brief:**
1. Edit the brief JSON (or use default)
2. Set count, city, model
3. Click "Generate Prospects"
4. Select prospects
5. Configure analyzer (tier, modules)
6. Click "Run Analyzer"
7. Results save to database

### 3. Leads Tab
**Browse analyzed leads:**
1. Filter by grade (A/B/C/D/F)
2. Filter by "Has Email Only"
3. Select leads to contact
4. Click "Compose X Emails"

### 4. Emails Tab
**Generate personalized emails:**
1. Choose AI strategy:
   - Compliment Sandwich (recommended)
   - Problem-First
   - Achievement-Focused
   - Question-Based
2. Toggle A/B variants
3. Toggle website re-verification
4. Click "Compose Emails"
5. Copy or sync to Notion

---

## 🛑 Stop Everything

```
👉 STOP-ALL.bat
```

---

## 🔧 What's Running

### 2 Services:

**1. Email Composer API** (Port 3001)
- Backend service
- Called by UI for email generation
- Runs in separate window

**2. Command Center UI** (Port 3000)
- Main interface (all 4 tabs)
- Imports website-audit-tool and client-orchestrator
- Everything happens here

**Note:** website-audit-tool and client-orchestrator don't run as servers - they're imported as code libraries.

---

## 💰 Cost Per Lead

- Prospect generation: $0.001
- Website analysis: $0.04-0.12
- Email composition: $0.002-0.005

**Total:** ~$0.05-0.13 per lead

---

## 🎯 Complete Workflow Example

### Generate 20 Prospects → Analyze → Email

**1. Prospects Tab**
- Edit brief for "Philadelphia Restaurants"
- Count: 20
- Click "Generate Prospects" (~30 sec)
- Select all 20
- Choose tier1, modules: SEO
- Click "Run Analyzer" (~2-3 min)

**2. Leads Tab**
- Filter: Grade A, Has Email
- Select leads (maybe 8-10 have emails)
- Click "Compose 8 Emails"

**3. Emails Tab**
- Strategy: Compliment Sandwich
- Click "Compose 8 Emails" (~15 sec)
- Review quality scores
- Copy best emails

**Total time:** ~5 minutes for 8 personalized, ready-to-send emails!

---

## 📁 Files You Care About

- **START-HERE.bat** - Start everything
- **STOP-ALL.bat** - Stop everything
- **client-orchestrator/brief.json** - Edit your ICP
- **command-center-ui/** - Main UI (don't touch unless customizing)
- **email-composer/** - Email backend (don't touch)
- **website-audit-tool/** - Analysis engine (don't touch)

---

## ⚠️ Troubleshooting

### "Port already in use"

**Fix:** Run STOP-ALL.bat first, then START-HERE.bat

### "Failed to compose email"

**Fix:** Make sure Email Composer API is running (check window)

### "No leads found"

**Fix:** Go to Prospects tab and run analyzer first

### "Supabase error"

**Fix:** Check command-center-ui/.env has SUPABASE_URL and SUPABASE_SERVICE_KEY

---

## 📖 Full Documentation

- **Complete Setup:** [UNIFIED-SETUP.md](UNIFIED-SETUP.md)
- **Command Center UI:** [command-center-ui/README.md](command-center-ui/README.md)
- **Root README:** [README.md](README.md)

---

**That's it! Now go generate some leads!** 🚀
