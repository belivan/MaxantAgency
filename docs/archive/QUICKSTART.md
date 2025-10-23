# MaxantAgency - Quick Start (5 Minutes) 🚀

Get MaxantAgency running on **any PC** in 5 minutes.

---

## 📦 One-Command Setup

### Windows:
```bash
setup.bat
```

### Mac/Linux:
```bash
chmod +x setup.sh
./setup.sh
```

This automatically:
- ✅ Checks Node.js installation
- ✅ Installs all dependencies
- ✅ Creates `.env` from template
- ✅ Installs Playwright browsers
- ✅ Checks port availability

---

## 🔑 Configure API Keys

Edit `.env` file (created by setup script):

```bash
# Minimum required to run:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# At least ONE AI provider:
ANTHROPIC_API_KEY=sk-ant-...
# OR
OPENAI_API_KEY=sk-proj-...

# Your contact info:
SENDER_NAME=Your Name
SENDER_COMPANY=Your Company
```

**Get API Keys:**
- 🗄️ **Supabase**: [supabase.com](https://supabase.com) (free tier available)
- 🤖 **Anthropic**: [console.anthropic.com](https://console.anthropic.com/)
- 🤖 **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

## 🗄️ Setup Database

```bash
cd database-tools
npm run db:setup
cd ..
```

This creates all tables automatically.

---

## ▶️ Start Services

```bash
npm run dev
```

Opens:
- 🖥️ **Dashboard**: http://localhost:3000
- 🔍 **Prospecting API**: http://localhost:3010
- 🎨 **Analysis API**: http://localhost:3001
- 📧 **Outreach API**: http://localhost:3002
- 🔄 **Pipeline API**: http://localhost:3020

---

## ✅ Verify Everything Works

```bash
npm run verify
```

Should show:
```
✅ Configuration: 15/15 checks passed (100%)
✅ Services Running: 5/5
🎉 All systems operational!
```

---

## 🎯 First Campaign

1. **Open Dashboard**: http://localhost:3000
2. **Create Project**: Projects → New Project
3. **Generate Prospects**: Enter industry, location, target count
4. **Analyze Websites**: Leads tab → Run Analysis
5. **Generate Emails**: Outreach tab → Compose

---

## 🆘 Troubleshooting

### "Port already in use"
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3001 | xargs kill -9
```

### "Cannot connect to database"
1. Check `.env` has correct Supabase credentials
2. Verify Supabase project is active
3. Run: `cd database-tools && npm run db:setup`

### Services won't start
Try starting individually:
```bash
npm run dev:prospecting  # Terminal 1
npm run dev:analysis     # Terminal 2
npm run dev:outreach     # Terminal 3
npm run dev:pipeline     # Terminal 4
npm run dev:ui           # Terminal 5
```

---

## 📚 Need More Help?

- **Full Setup Guide**: [SETUP.md](./SETUP.md)
- **Architecture Details**: [CLAUDE.md](./CLAUDE.md)
- **Database Guide**: [database-tools/README.md](./database-tools/README.md)

---

## 🎉 You're Ready!

Your MaxantAgency is now running at:

**http://localhost:3000**

Happy lead hunting! 🎯
