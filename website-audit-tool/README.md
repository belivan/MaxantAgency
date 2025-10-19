# Maksant Website Audit Tool - Data Collection Edition

**An AI-powered data collection tool with 6 specialized agents that analyzes websites, extracts comprehensive contact data, detects tech stacks, and saves everything to a database - all with transparent cost & time tracking.**

> **Note:** Email generation has been moved to a separate app. This tool focuses exclusively on data collection and analysis.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

---

## 🎯 What Does This Tool Do?

This tool helps you build a comprehensive lead database by:

1. **Extracts contact data intelligently** - Email, phone, name with source tracking & confidence scoring
2. **Analyzes website quality** - 6 specialized AI agents identify specific issues and opportunities
3. **Detects platforms & tech stacks** - WordPress, Shopify, React, Tailwind, ProcessWire, etc.
4. **Grades data completeness** - A-F scoring shows which leads have the most complete information
5. **Tracks cost & time** - Know exactly how much each analysis costs (typically $0.016-0.070 per website)
6. **Saves everything to database** - All data in Supabase PostgreSQL for easy querying and integration

Instead of spending hours manually collecting contact info, you get comprehensive lead data in ~60-90 seconds per website, organized by data quality, with full transparency.

**Email generation** is handled by a separate app - this tool focuses exclusively on data collection.

---

## ✨ Key Features

### 🤖 6 Specialized AI Agents (Sequential Pipeline)

Each agent has ONE job and does it well:

**1. Grok AI Extractor** ($0.015/site) - Deep data mining *(Always Runs)*
- Company name, industry, location, founding year
- Contact info (email, phone, name, title) with source tracking & confidence scoring
- Services, target audience, value proposition
- Social profiles (LinkedIn, Instagram, Twitter, Facebook)
- Blog posts, content info
- **Platform/tech stack** (WordPress, Shopify, React, Tailwind, ProcessWire, etc.)

**2. Basic Analysis Agent** ($0.001-0.003/page) - Structure & missing elements *(Always Runs)*
- HTML structure, SEO metadata, performance
- Missing CTAs, contact forms, trust signals
- **Strict rule:** NO visual critiques unless visual module enabled

**3. Industry-Specific Agent** ($0.002/site) - Tailored recommendations *(Optional)*
- Auto-detects industry (Web Design, HVAC, E-commerce, Consulting, etc.)
- Provides industry-specific best practices
- Compares against vertical standards

**4. SEO Analysis Agent** ($0.001/site) - Technical SEO *(Optional)*
- Title tags, meta descriptions, heading structure
- Performance metrics, mobile-friendliness
- Schema markup, Open Graph tags

**5. Visual Design Agent** ($0.004-0.020/screenshot) - Screenshot analysis *(Optional)*
- Desktop + mobile screenshots
- Visual hierarchy, button visibility, contrast
- **Only runs if explicitly enabled**

**6. Competitor Discovery Agent** ($0.030/site) - Find & analyze competitors *(Optional)*
- Uses Grok AI with web search to find 3 competitors
- Comparative analysis of features and positioning

> **Note:** Email Writing, Critique Reasoning, and QA Review agents have been moved to a separate email composer app.

### 📊 Dual Grading System

**Website Grade (A-F):** How comprehensive the analysis was
- 40 points: Data extraction (email, phone, company, location)
- 60 points: Analysis modules run (basic, industry, SEO, visual, competitor)

**Lead Grade (A-F):** How good the outreach email is *(from QA Agent)*
- **Grade A:** Contact immediately! (no issues, max 1 warning)
- **Grade B:** Review then contact (2-3 warnings)
- **Grade C:** Needs editing (4+ warnings)
- **Grade D:** Major rewrite needed (almost all warnings)
- **Grade F:** Do not contact (missing email or critical issues)

### 📁 Lead-Based Folder Organization

Results organized by **Lead Grade** (not website quality):

```
analysis-results/
  ├── lead-A/  (Contact immediately - perfect emails!)
  │   └── maksant.com/2025-10-18_20-15-30/
  │       ├── email.txt
  │       ├── qa-review.txt (Grade A explanation)
  │       ├── analysis-data.json
  │       └── ...
  ├── lead-B/  (Review then contact)
  ├── lead-C/  (Needs editing before sending)
  ├── lead-D/  (Major rewrite needed)
  └── lead-F/  (Do not contact - no email or bad quality)
```

**Why?** Go straight to `lead-A/` folder and send those emails. Simple!

### 💰 Cost & Time Tracking

Every analysis tracks:
- **Total cost** in dollars (e.g., $0.0408)
- **Analysis time** in seconds (e.g., 110s / 1m 50s)
- **Cost breakdown** per AI operation

**Example cost breakdown (Basic + Industry):**
```
Grok AI Extraction:      $0.0400  (largest cost)
Basic Analysis:          $0.0003
Industry Analysis:       $0.0002
Email Writing:           $0.0001
Critique Reasoning:      $0.0001
QA Review:               $0.0001
───────────────────────────────
TOTAL:                   $0.0408 per website
```

Displayed in:
- UI result cards *(green for time, blue for cost)*
- Export files
- Supabase database

### 🗄️ Supabase Database Integration

Auto-saves all leads to PostgreSQL:
- Company name, industry, location
- Contact info (email, phone, name, title) with source & confidence
- Social profiles (JSONB)
- Services, blog posts, content
- **Platform/tech stack** (WordPress, Shopify, ProcessWire, etc.)
- All critiques from all 9 agents (JSONB)
- Email subject & body, QA review
- **Cost and time data** (NEW!)
- Outreach status tracking (not_contacted → email_sent → replied → converted)

**Query examples:**
```sql
-- Find all Grade A leads not yet contacted
SELECT company_name, contact_email, location
FROM leads
WHERE lead_grade = 'A' AND outreach_status = 'not_contacted';

-- Calculate total spend
SELECT SUM(analysis_cost) as total, AVG(analysis_time) as avg_time
FROM leads;

-- Find all WordPress sites
SELECT company_name, tech_stack->>'platform' as platform
FROM leads
WHERE tech_stack->>'platform' = 'WordPress';
```

---

## 🚀 Quick Start

### 1. Install Node.js

Download & install Node.js 18+ from [nodejs.org](https://nodejs.org)

### 2. Install Dependencies

```bash
cd website-audit-tool
npm install
npx playwright install
```

### 3. Get API Keys

**Required:**
- **Grok AI (xAI):** Get key at [x.ai](https://x.ai/) - $5 per 1M tokens
- **OpenAI:** Get key at [platform.openai.com](https://platform.openai.com/) - $0.15-7.50 per 1M tokens

**Optional:**
- **Anthropic Claude:** Get key at [console.anthropic.com](https://console.anthropic.com/) - $0.10-6.50 per 1M tokens
- **Supabase:** Free at [supabase.com](https://supabase.com/) - PostgreSQL database

### 4. Configure .env File

```bash
cp .env.example .env
```

Edit `.env` and add your keys:

```bash
# Required
XAI_API_KEY=xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional (for database)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# Models
TEXT_MODEL=gpt-5-mini
VISION_MODEL=gpt-4o
```

### 5. Set Up Supabase (Optional but Recommended)

1. Create project at [supabase.com](https://supabase.com)
2. Run SQL from [`docs/SUPABASE-SETUP.md`](docs/SUPABASE-SETUP.md)
3. Run migration: [`docs/supabase-migration-cost-time.sql`](docs/supabase-migration-cost-time.sql)
4. Add URL and key to `.env`

### 6. Start the Server

```bash
npm start
```

Open browser at: **http://localhost:3000**

---

## 🎮 How to Use

### Web UI

1. **Enter URLs** (one per line):
   ```
   https://maksant.com
   https://goettl.com
   https://sweetgreen.com
   ```

2. **Configure options:**
   - **Email Type:** Local (Philadelphia area) or National
   - **Text Model:** GPT-5 Mini ($0.15/1M tokens) or GPT-5 ($5.50/1M)
   - **Vision Model:** GPT-4o ($7.50/1M) or GPT-5 ($5.50/1M)
   - **Depth Tier:** 1 page (fast), 3 pages (standard), or 5-10 pages (comprehensive)
   - **Modules:** Basic (always runs), Industry, Visual, SEO, Competitor
   - **Supabase:** Check to save to database

3. **Click "Analyze Websites"**

4. **View real-time progress:**
   - Each step shown as it runs
   - Cost estimate before starting
   - Final cost & time after completion

5. **Review results:**
   - Company name, load time, **analysis time, cost**
   - Summary, critiques, email preview
   - Copy email or export all

### API (for integrations)

```javascript
POST /api/analyze

{
  "urls": ["https://maksant.com"],
  "textModel": "gpt-5-mini",
  "visionModel": "gpt-4o",
  "depthTier": "tier1",
  "modules": {
    "basic": true,
    "industry": true,
    "visual": false,
    "seo": false,
    "competitor": false
  },
  "emailType": "local",
  "saveToSupabase": true
}
```

**Response:** Server-Sent Events (real-time progress)

---

## 📂 Output Files

Each analysis creates:

```
analysis-results/lead-A/maksant.com/2025-10-18_20-15-30/
├── analysis-data.json       # Full analysis (all data)
├── client-info.json          # Quick reference (email, phone, grades, cost, time)
├── email.txt                 # Final outreach email
├── qa-review.txt             # QA review with lead grade
├── critiques.txt             # All critiques from all agents
├── critique-reasoning.txt    # WHY critiques were made
├── screenshots/              # Desktop + mobile (if visual enabled)
│   ├── desktop-full.png
│   └── mobile-full.png
└── logs/
    └── analysis.log
```

---

## 💰 Cost Information

### Typical Costs

**Basic + Industry (Recommended):** ~$0.04/website
```
Grok AI:           $0.0400  (8,000 tokens × $5/1M)
Basic Analysis:    $0.0003  (2,000 tokens × $0.15/1M)
Industry Analysis: $0.0002  (1,500 tokens × $0.15/1M)
Email Writing:     $0.0001  (800 tokens × $0.15/1M)
Critique Reasoning:$0.0001  (600 tokens × $0.15/1M)
QA Review:         $0.0001  (500 tokens × $0.15/1M)
```

**All Modules (Comprehensive):** ~$0.12/website
- Adds: SEO ($0.0002), Visual ($0.03), Competitor ($0.05)

### Monthly Budgets

| Websites/Month | Basic Only | All Modules |
|----------------|------------|-------------|
| 50 websites    | ~$2.00     | ~$6.00      |
| 100 websites   | ~$4.00     | ~$12.00     |
| 500 websites   | ~$20.00    | ~$60.00     |

**Pro tip:** Use Basic + Industry for prospecting. Add Visual/Competitor only for high-value leads.

---

## 🎯 Advanced Features

### Platform & Tech Stack Detection

Grok AI automatically detects what each website is built with:

**Detects:**
- Platform: WordPress, Shopify, Webflow, Wix, Squarespace, **ProcessWire**, Drupal, Custom
- Framework: React, Vue, Next.js, Angular
- CSS Framework: Tailwind, Bootstrap, Foundation
- Hosting: Vercel, Netlify, AWS, Cloudflare
- Tools: Google Tag Manager, Hotjar, analytics

**Example output:**
```json
{
  "platform": "ProcessWire",
  "platformVersion": "3.0.210",
  "framework": "None",
  "cssFramework": "Tailwind",
  "hosting": "Unknown",
  "confidence": 0.8,
  "detectionMethod": "class-conventions, script-urls"
}
```

**Saved to:** `analysis-data.json` → `grokData.techStack` and Supabase `tech_stack` column

### Honest Personalization

**Email Writing Agent** has strict rules:

✅ **ALLOWED** (we have this data):
- "I see you're on Instagram" (have URL)
- "Noticed you offer Web Design" (have services list)
- "Read your blog post about [title]" (extracted title)

❌ **BANNED** (fake personalization):
- "Love your Instagram content" (didn't see content!)
- "Your Facebook posts are great" (didn't read posts!)
- "Amazing work on X" (fake engagement)

**Result:** Emails sound genuine, not spammy.

### Agent Separation

Each agent stays in its lane:

| Agent | CAN Do | CANNOT Do |
|-------|--------|-----------|
| Grok AI | Extract data | Analyze or critique |
| Basic Analysis | Comment on HTML/text | Visual elements (when visual OFF) |
| Visual Analysis | Comment on design | Run when module disabled |
| Email Writing | Use extracted data | Fake personalization |
| QA Review | Grade email quality | Create new critiques |

**Enforced by:** Detailed prompts in [`docs/AGENT-PROMPTS.md`](docs/AGENT-PROMPTS.md)

---

## 📚 File Structure

```
website-audit-tool/
├── analyzer.js               # Main orchestrator (9 agents run here)
├── server.js                 # Express API server
├── ai-providers.js           # AI model initialization
├── package.json              # Dependencies
├── .env                      # Configuration (SECRET!)
│
├── modules/                  # Specialized modules
│   ├── grok-extractor.js     # Agent 1: Data extraction
│   ├── prompt-builder.js     # Agent 2: Basic analysis
│   ├── industry.js           # Agent 3: Industry-specific
│   ├── seo.js                # Agent 4: SEO deep-dive
│   ├── visual.js             # Agent 5: Visual design
│   ├── competitor.js         # Agent 6: Competitor discovery
│   ├── email-sanitizer.js    # Agent 7: Email humanization
│   ├── cost-tracker.js       # Cost & time tracking (NEW!)
│   ├── supabase-client.js    # Database integration
│   └── ...
│
├── public/                   # Web UI
│   ├── index.html            # Main interface
│   ├── app.js                # Client-side JavaScript
│   └── styles.css            # Styling
│
├── scripts/                  # Test scripts
│   ├── test-all-features.js           # Comprehensive test
│   ├── test-cost-time-tracking.js     # Cost/time verification
│   ├── test-15-websites-supabase.js   # Supabase integration test
│   └── query-supabase.js              # Database queries
│
├── docs/                     # Documentation
│   ├── SUPABASE-SETUP.md             # Database setup guide
│   ├── AGENT-PROMPTS.md              # 9 agent separation blueprint
│   ├── SESSION-COMPLETE.md           # Feature summary
│   ├── supabase-migration-cost-time.sql  # Cost/time migration
│   └── ...
│
└── analysis-results/         # Output (organized by lead grade)
    ├── lead-A/              # Contact immediately!
    ├── lead-B/              # Review then contact
    ├── lead-C/              # Needs editing
    ├── lead-D/              # Major rewrite
    └── lead-F/              # Do not contact
```

---

## 🔧 Troubleshooting

### Supabase saves failing

**Error:** `TypeError: fetch failed`

**Fix:**
1. Verify `SUPABASE_URL` in `.env` is correct
2. Use `service_role` key (not `anon` key)
3. Run migration: [`docs/supabase-migration-cost-time.sql`](docs/supabase-migration-cost-time.sql)
4. Check project status at [app.supabase.com](https://app.supabase.com)

### Cost showing $0.0000

**Fix:** Already fixed in latest version. Verify [modules/cost-tracker.js:6](modules/cost-tracker.js#L6) shows `'grok-beta': 5.00` (not `0.00500`)

### Playwright browser errors

**Fix:**
```bash
npx playwright install chromium
```

### "Port 3000 already in use"

**Fix:**
- Change `PORT=3001` in `.env`
- Or kill process: `taskkill /F /PID <port_number>` (Windows) or `lsof -ti:3000 | xargs kill` (Mac/Linux)

---

## 🧪 Testing

### Run Tests

```bash
# Comprehensive feature test
node scripts/test-all-features.js

# Cost & time tracking verification
node scripts/test-cost-time-tracking.js

# Supabase integration (15 websites)
node scripts/test-15-websites-supabase.js

# Query Supabase database
node scripts/query-supabase.js
```

### Development Mode

```bash
npm run dev  # Auto-restart on file changes
```

---

## 📊 Multi-Tenant Support (Coming Soon)

Your orchestrator app can specify which database to use:

```javascript
POST /api/analyze
{
  "urls": ["https://site.com"],

  // Option 1: Same table with project IDs
  "database": {
    "projectId": "philly-restaurants-2025",
    "campaignId": "week-1-batch",
    "clientName": "Maksant"
  },

  // Option 2: Different database per client
  "database": {
    "url": "https://client-abc.supabase.co",
    "key": "eyJhbGc...",
    "table": "leads_client_xyz"
  }
}
```

See implementation details in the roadmap.

---

## 🎯 Tips for Success

### Getting Better Results

1. **Analyze Quality Websites**
   - Target businesses that can afford your services
   - Focus on sites with issues but not completely broken
   - Target industries you understand

2. **Always Personalize**
   - AI writes specific emails, but add personal touches
   - Add recipient's actual name
   - Add your name and contact info
   - Reference something unique about their business

3. **Research Before Sending**
   - Visit website yourself
   - Verify AI's findings
   - Check if they're actually hiring
   - Find the right person (not generic info@)

4. **Quality Over Quantity**
   - Send 10-20 quality emails/week (not 100 generic ones)
   - Only email businesses you've researched
   - Follow up once if no response, then stop
   - Track responses and adjust

### Avoiding Spam Issues

**DO:**
- Send emails one at a time
- Personalize every email
- Use your real email address
- Make it easy to opt out
- Space out emails (not 50 in one day)

**DON'T:**
- Use exact same template for everyone
- Send without reading analysis
- Email same person multiple times
- Buy email lists
- Send at weird hours (3am, etc.)

---

## 🛠 Development

### Project Architecture

**Core Workflow ([analyzer.js](analyzer.js)):**
```
1. Load homepage with Playwright
2. Capture screenshots (desktop + mobile)
3. Extract data with Grok AI (Agent 1)
4. Detect industry (Agent 3)
5. Crawl additional pages (if Tier 2/3)
6. Run analysis modules (Agents 2-6)
7. Generate email (Agent 7)
8. Explain critiques (Agent 8)
9. QA review (Agent 9) → determines Lead Grade
10. Calculate cost & time
11. Save files (organized by Lead Grade)
12. Save to Supabase (if enabled)
```

**Data Flow:**
```
HTML → Grok AI → Company Data
    ↓
Screenshots → Vision AI → Visual Critiques
    ↓
All Data → Email AI → Personalized Email
    ↓
Email → QA AI → Lead Grade → Folder (lead-A/, lead-B/, etc.)
    ↓
Everything → Supabase → Database
    ↓
Cost Tracker → Cost & Time Data → UI + Database
```

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

Built with:
- [Playwright](https://playwright.dev/) - Browser automation
- [Grok AI (xAI)](https://x.ai/) - Data extraction
- [OpenAI](https://openai.com/) - GPT models
- [Anthropic](https://anthropic.com/) - Claude models
- [Supabase](https://supabase.com/) - PostgreSQL database
- [Express.js](https://expressjs.com/) - Web server

---

## 📞 Support

- **Documentation:** See [`docs/`](docs/) folder
- **Issues:** Report bugs or suggest features
- **Email:** maksantagency@gmail.com
- **Website:** [maksant.com](https://maksant.com)

---

**Built by [Maksant](https://maksant.com)** - Helping businesses grow through better web presence.

Need website help? Let's connect!
