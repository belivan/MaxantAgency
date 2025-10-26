# Outreach Engine - Implementation Summary

## What Was Built

Your Outreach Engine now automatically generates **12 variations** of outreach content per lead, leveraging ALL the rich analysis data from your Analysis Engine.

### ✅ Completed

1. **3 Email Prompt Templates** (based on Alex Hormozi research)
   - Free Value Delivery - Direct report, zero ask
   - Portfolio Building - Honest "building agency" positioning
   - Problem-First - Lead with critical issues (for D/F grades)

2. **9 Social DM Templates** (3 variations × 3 platforms)
   - Instagram: Ultra-casual, no URLs, emoji-friendly
   - LinkedIn: Professional-casual, business-focused
   - Facebook: Community-friendly, local angle

3. **Enhanced Personalization Builder**
   - Now extracts 50+ data fields from Analysis Engine
   - Includes AI synthesis data (executive summary, consolidated issues)
   - Calculates mobile vs desktop gaps, urgency indicators
   - Identifies weakest categories, compliance risks

4. **Batch Generation Script**
   - Generates all 12 variations for all leads in one command
   - Progress tracking and cost reporting
   - ~$0.02 per lead for all 12 variations

5. **Database Schema Updates**
   - Added `variation_type` field to track positioning approach
   - Added `data_sources_used` JSONB to track which rich data was used
   - Applied to Supabase successfully

6. **Complete Documentation**
   - [OUTREACH-VARIATIONS-GUIDE.md](./OUTREACH-VARIATIONS-GUIDE.md) - Complete guide with examples

---

## Quick Start

### 1. Generate Outreach for Your Leads

```bash
cd outreach-engine

# Test with 5 leads first
node batch-generate-all-variations.js --limit=5

# Once satisfied, generate for all leads
node batch-generate-all-variations.js
```

**Output Example**:
```
📊 SUMMARY:
   Leads processed: 20/20
   Emails generated: 60
   Social DMs generated: 180
   Total content pieces: 240

💰 COST:
   Total API cost: $0.48 (~$0.02 per lead)
```

### 2. Export to CSV

Use your existing database-tools:

```bash
cd database-tools
npm run db:export -- composed_emails
```

### 3. Review & Send

1. Open the CSV in Excel/Google Sheets
2. Review the 12 variations per lead
3. Filter by `variation_type` to test one approach first
4. Import to your email automation tool (Instantly, etc.)
5. Track results

---

## File Locations

### New Files Created

```
outreach-engine/
├── batch-generate-all-variations.js       # Main batch generator
├── OUTREACH-VARIATIONS-GUIDE.md          # Complete documentation
├── IMPLEMENTATION-SUMMARY.md             # This file
├── config/prompts/
│   ├── email-strategies/
│   │   ├── free-value-delivery.json      # ✨ New
│   │   ├── portfolio-building.json       # ✨ New
│   │   ├── problem-first-urgent.json     # ✨ New
│   │   └── _archive/                     # Old templates moved here
│   └── social-strategies/
│       ├── instagram-free-value.json     # ✨ New
│       ├── instagram-portfolio-building.json
│       ├── instagram-problem-first.json
│       ├── linkedin-free-value.json      # ✨ New
│       ├── linkedin-portfolio-building.json
│       ├── linkedin-problem-first.json
│       ├── facebook-free-value.json      # ✨ New
│       ├── facebook-portfolio-building.json
│       ├── facebook-problem-first.json
│       └── _archive/                     # Old template moved here
└── shared/
    └── personalization-builder.js        # ✨ Enhanced with 50+ fields
```

### Modified Files

```
outreach-engine/
├── database/schemas/composed_emails.json  # ✨ Added variation_type, data_sources_used
└── integrations/database.js               # ✨ Added getLeads() function
```

---

## The Three Positioning Approaches

### 1. Free Value (`free_value`)
**Best For**: B/C/D grades, most leads

**Email Subject**: `Free website analysis for [Company]`

**Approach**:
- "I analyzed [X] businesses in [city] and thought you'd find this valuable"
- Direct report delivery (no permission asking)
- Quick summary: Grade, issues found, quick wins
- "No catch, no strings"

**Social DM**: Very casual, "Want me to send over what I found?"

---

### 2. Portfolio Building (`portfolio_building`)
**Best For**: A/B grades, established businesses

**Email Subject**: `Website audit for [Company]`

**Approach**:
- "We just launched and are offering free audits to build our portfolio"
- Honest about being new
- Clear value exchange (audit for case study)
- Professional but transparent

**Social DM**: "Building portfolio by helping [city] businesses"

---

### 3. Problem-First (`problem_first`)
**Best For**: D/F grades, high urgency, critical issues

**Email Subject**: `Quick question about [Company]'s website`

**Approach**:
- Lead with specific problem ("Your mobile site breaks on phones")
- Business impact ("60%+ of traffic affected")
- Brief intro
- Report delivered
- "Thought you should know"

**Social DM**: "Quick heads up - found [specific issue]"

---

## What Data Gets Used

The system intelligently uses ALL your Analysis Engine data:

### From AI Synthesis
- ✅ **Executive Summary** - Strategic insights, 30/60/90 roadmap
- ✅ **Consolidated Issues** - AI-deduplicated (40-70% cleaner)
- ✅ **Quick Wins** - Full array of actionable improvements

### From Analysis
- ✅ **Scores**: Desktop vs Mobile, SEO, Content, Social, Accessibility
- ✅ **Issues**: By category (design, SEO, content, social, accessibility, performance)
- ✅ **Strategic**: one_liner, top_issue, outreach_angle, call_to_action

### From Lead Scoring
- ✅ **Priority**: priority_tier (hot/warm/cold), lead_priority (0-100)
- ✅ **Urgency**: urgency_score, urgency_indicator
- ✅ **Budget**: budget_likelihood (high/medium/low)

### Calculated
- ✅ **Mobile vs Desktop Gap**: "Mobile 28 points lower than desktop"
- ✅ **Weakest Category**: "SEO needs most improvement (35/100)"
- ✅ **Compliance Risk**: WCAG violations, HTTPS, mobile-friendly

---

## Cost Breakdown

### Per Lead
- 3 email variations: ~$0.006
- 9 social DM variations: ~$0.014
- **Total per lead: ~$0.02**

### Scaling
- 50 leads: ~$1.00
- 100 leads: ~$2.00
- 500 leads: ~$10.00
- 1,000 leads: ~$20.00

**Model Used**: claude-haiku-4-5 (fast & cheap)

---

## Testing Strategy

### Week 1: Single Variation Test
Start conservative with one approach:

```bash
# Generate only Free Value variation for 20 leads
node batch-generate-all-variations.js --limit=20
```

1. Export to CSV
2. Filter `variation_type = 'free_value'`
3. Send first 20 emails
4. Track open rate + response rate

### Week 2: A/B Test
If Week 1 results are positive:

```bash
# Generate all 3 variations for next 30 leads
node batch-generate-all-variations.js --limit=30
```

1. Split into 3 groups of 10
2. Group A: Free Value
3. Group B: Portfolio Building
4. Group C: Problem-First (only for D/F grades)
5. Compare response rates

### Week 3: Winner + Social
Use winning email variation + add social DMs:

```bash
# Generate all 12 variations for next 50 leads
node batch-generate-all-variations.js --limit=50
```

1. Send winning email variation to all
2. Add Instagram DMs to prospects with active IG
3. Add LinkedIn messages to decision-makers
4. Track multi-channel response rates

---

## Integration with Your Workflow

### Current Workflow
1. Analysis Engine → Generates reports → Saves to `leads` table
2. (Your manual process) → Draft emails → Send

### New Automated Workflow
1. Analysis Engine → Generates reports → Saves to `leads` table
2. **Outreach Engine** → Batch generates 12 variations → Saves to `composed_emails`
3. Database Tools → Export to CSV
4. Your Email Tool (Instantly/Smartlead) → Import CSV → Send
5. Track responses → Update `status` in database

---

## Metrics to Track

### Primary Metrics
- **Open Rate** by `variation_type`
- **Response Rate** by `variation_type`
- **Meeting Booked Rate** by `variation_type`

### Secondary Metrics
- **Open Rate** by `priority_tier` (hot/warm/cold)
- **Response Rate** by `website_grade` (A/B/C/D/F)
- **Cost per Response** = Total Cost / Total Responses

### Platform Comparison
- **Email** vs **Instagram** vs **LinkedIn** vs **Facebook**
- Response rate by platform
- Cost per response by platform

---

## Next Actions

### Today
1. ✅ **Test the batch generator** with 5 leads:
   ```bash
   node batch-generate-all-variations.js --limit=5
   ```

2. ✅ **Review the output** in Supabase `composed_emails` table:
   - Check 1 lead has 12 records (3 emails + 9 social DMs)
   - Review email subject lines and bodies
   - Check personalization is accurate

### This Week
3. ✅ **Generate for real leads** (start with 20-50):
   ```bash
   node batch-generate-all-variations.js --limit=20
   ```

4. ✅ **Export to CSV** using database-tools

5. ✅ **Review & edit** any emails that need tweaking

6. ✅ **Send first batch** using Free Value variation only

### Next Week
7. ✅ **Track results** - open rates, response rates
8. ✅ **A/B test** all 3 variations
9. ✅ **Scale up** to more leads
10. ✅ **Add social DMs** to high-priority leads

---

## Support

- **Full Documentation**: [OUTREACH-VARIATIONS-GUIDE.md](./OUTREACH-VARIATIONS-GUIDE.md)
- **Project Overview**: `../CLAUDE.md`
- **Database Schema**: `database/schemas/composed_emails.json`
- **Example Prompts**: `config/prompts/email-strategies/`

---

## Key Takeaways

✅ **12 variations per lead** - Test which works best

✅ **Leverages ALL analysis data** - AI synthesis, scores, issues, urgency

✅ **Based on research** - Alex Hormozi's "give until they ask" + 2025 cold email best practices

✅ **Cost-effective** - ~$0.02 per lead for all 12 variations

✅ **Easy to test** - Start with one variation, scale to all

✅ **Export-ready** - Use your existing database-tools CSV export

---

**Ready to send?** Start with:

```bash
node batch-generate-all-variations.js --limit=5
```

Then review the output and scale up! 🚀
