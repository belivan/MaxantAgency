# Quick Start Guide - Maksant Email Composer

## What You Got

A fully functional AI-powered email composition tool that:
- Pulls leads from your Supabase database
- Generates **highly personalized** cold outreach emails using 2025 best practices
- Creates **A/B test variants** (multiple subject lines and bodies)
- Uses **4 different email strategies** (compliment sandwich, problem-first, etc.)
- Optional **website re-verification** to get fresh data
- Beautiful web UI + REST API

## Start the App

```bash
cd c:\Users\anton\Desktop\MaxantAgency\email-composer
npm start
```

Then open: [http://localhost:3001](http://localhost:3001)

## How to Use

### Web Interface (Easiest)

1. Open [http://localhost:3001](http://localhost:3001)
2. You'll see:
   - **Stats dashboard** (total leads, grades, etc.)
   - **Lead list** on the left (filtered by Ready/Grade A/Grade B)
   - **Email composer** on the right
3. Click a lead from the list
4. Choose your strategy (default: "Compliment Sandwich" - recommended)
5. Toggle options:
   -  **Generate A/B variants** (recommended - gives you 3 subjects + 2 bodies)
   -  **Re-verify website** (optional - sends AI agent to check for fresh data)
6. Click "Compose Email"
7. Wait ~15 seconds for AI to generate
8. Review the variants and copy the one you like!

### API (For Automation)

**Get leads ready for outreach:**
```bash
curl http://localhost:3001/api/leads/ready
```

**Compose email for a specific lead:**
```bash
curl -X POST http://localhost:3001/api/compose \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "strategy": "compliment-sandwich",
    "generateVariants": true,
    "verify": false
  }'
```

**Other useful endpoints:**
```bash
# Database stats
curl http://localhost:3001/api/stats

# Get Grade A leads
curl http://localhost:3001/api/leads/grade/A

# Get all leads with email
curl "http://localhost:3001/api/leads?hasEmail=true"

# Available strategies
curl http://localhost:3001/api/strategies
```

## Example Output

For Squarespace (Grade B lead), the AI generated:

**Subject Line Variants:**
1. "Quick win for Squarespace's homepage conversion" (52 chars)
2. "Anthony  noticed something on squarespace.com" (46 chars)
3. "Your H1 might be costing Squarespace conversions" (51 chars)

**Body Variant 1:**
```
Hey Anthony,

Squarespace's homepage loads fast and the product breadth is impressive 
but "A website makes it real" doesn't tell comparison-shoppers why to
choose you over Wix or Webflow.

Two quick fixes that could move the needle: (1) rewrite the H1 to call
out your ease + AI/commerce edge (then A/B test variants for creators vs.
stores), and (2) surface starting pricing or a "See plans" link on the
homepage  right now price-sensitive agencies have to hunt for it.

Both are low-lift changes that typically lift trial signups 812%.

Up for a 15-minute conversation on what we're seeing work for other
no-code platforms in NYC?

Anton Yanovich
Maksant
https://maksant.com
412-315-8398
```

**Why This Email is Good:**
-  Personalized (mentions Anthony, NYC, specific competitors)
-  Specific (quotes actual H1 text, mentions load time)
-  Conversational (not salesy)
-  Business-focused (mentions conversion metrics)
-  Short (under 1000 chars)
-  Single clear CTA (15-minute call)

## Email Strategies

### 1. Compliment Sandwich (RECOMMENDED)
- Opens with genuine compliment using personalization data
- Identifies 1-3 specific issues with business impact
- Closes with positive encouragement
- **Best for:** Most situations

### 2. Problem-First
- Identifies specific problem immediately
- Explains business consequence
- Offers solution
- **Best for:** When there's an obvious urgent issue

### 3. Achievement-Focused
- Genuine compliment about their business
- Points out improvement opportunity
- Suggests quick win
- **Best for:** High-performing businesses (Grade A)

### 4. Question-Based
- Asks genuine question about their site/business
- Shares specific observation
- Offers to share findings
- **Best for:** Building curiosity, softer approach

## What Makes This Different?

### vs. Template-Based Email Generators
- **This tool:** AI generates full email from scratch using all available data
- **Templates:** Fill-in-the-blank with {{placeholders}}

### vs. The website-audit-tool
- **This tool:** Dedicated email composition with variants and strategies
- **Audit tool:** Generates one email during analysis as part of pipeline

### Key Features
- **2025 Best Practices:** Short (2-5 sentences), specific, conversational
- **Rich Personalization:** Uses company name, industry, location, website critiques, load time, etc.
- **A/B Variants:** 3 subject lines × 2 bodies = 6 combinations to test
- **Quality Validation:** Auto-scores every email (0-100)
- **Website Re-Verification:** Optional AI agent checks for fresh data before composing

## Current Database

You have **8 leads** in Supabase:
- **3 Grade B** (good quality, has email)
- **5 Grade F** (low quality or missing email)

Industries include:
- HVAC & Plumbing
- Restaurants (healthy fast-casual, vegan cafe)
- Coffee roasters
- Website builders (Squarespace, etc.)
- Web design agencies

## Configuration

All settings in `.env`:
- `DEFAULT_EMAIL_MODEL=claude-sonnet-4-5` - AI model (Claude Sonnet 4.5)
- `GENERATE_VARIANTS=true` - Enable A/B variants
- `SUBJECT_VARIANTS=3` - Number of subject line options
- `BODY_VARIANTS=2` - Number of body options
- `ENABLE_REVERIFICATION=true` - Optional website re-check
- `EMAIL_MAX_LENGTH=1200` - Max characters (based on research)

## Next Steps

1. **Try it out:** Compose emails for your 3 Grade B leads
2. **Copy & send:** Use the web UI to copy the best variants
3. **Add more leads:** Run the website-audit-tool to analyze more sites
4. **Track results:** Record which variants get the best responses
5. **Refine strategy:** Adjust based on what works

## Research-Backed Stats

This tool implements findings from `docs/01-email-outreach-research-2025.md`:
- Subject lines 61-70 chars = **43% open rate**
- Personalized emails = **6x higher transaction rates**
- Small campaigns (<50 recipients) = **5.8% reply rate** (vs 2.1% for 1000+)
- Follow-ups increase replies by **65.8%**

## Support

Questions? Check:
- [README.md](README.md) - Full documentation
- [Research docs](../website-audit-tool/docs/) - Email best practices
- Server logs - Real-time output shows what's happening

Server is running at: **http://localhost:3001**

---

**Happy composing!** =ç(
