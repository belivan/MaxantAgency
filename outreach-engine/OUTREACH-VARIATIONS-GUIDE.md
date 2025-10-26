# Outreach Variations System - Complete Guide

## Overview

The Outreach Engine now generates **12 variations** of outreach content per lead:
- **3 email variations** (different positioning angles)
- **9 social DM variations** (3 variations × 3 platforms)

This system leverages the rich analysis data from the Analysis Engine to create highly personalized, data-driven outreach content based on Alex Hormozi's "give until they ask" philosophy.

---

## Table of Contents

1. [The Three Positioning Approaches](#the-three-positioning-approaches)
2. [Rich Analysis Data Integration](#rich-analysis-data-integration)
3. [Generating Outreach Variations](#generating-outreach-variations)
4. [Exporting to CSV](#exporting-to-csv)
5. [Database Schema](#database-schema)
6. [Prompt Templates](#prompt-templates)
7. [Best Practices](#best-practices)

---

## The Three Positioning Approaches

Based on research into effective cold outreach strategies, we've implemented three distinct positioning angles:

### 1. **Free Value Delivery** (`free_value`)
**Philosophy**: Direct value bomb with zero ask. Give massive value upfront.

**Structure**:
- Lead with "Here's your free report"
- Include quick summary (grade, issues, quick wins)
- One specific insight as hook
- "No catch, no strings" explicit statement
- Soft P.S. offering to explain

**Best For**: B, C, D grades | Warm/Cold leads

**Example Subject**: `Free website analysis for [Company]`

**Tone**: Helpful, non-threatening, no pressure

---

### 2. **Portfolio Building** (`portfolio_building`)
**Philosophy**: Radical honesty - explain you're building your agency and offering free audits for case studies.

**Structure**:
- Honest positioning ("just launched our agency")
- What you're doing (free audits for portfolio)
- Value delivery + report link
- Why it's free (building case studies)
- No obligation statement

**Best For**: A, B, C grades | Hot/Warm leads

**Example Subject**: `Website audit for [Company]`

**Tone**: Professional but transparent, confident beginner

---

### 3. **Problem-First** (`problem_first`)
**Philosophy**: Lead with specific problem and business impact - for sites with critical issues.

**Structure**:
- Hook: Specific problem found
- Business impact (what this costs them)
- Brief intro
- Detailed report delivered
- Soft close ("thought you should know")

**Best For**: D, F grades | High urgency score | Critical issues

**Example Subject**: `Quick question about [Company]'s website`

**Tone**: Direct and helpful, urgent but not panicked

---

## Rich Analysis Data Integration

The new system leverages ALL analysis data from the Analysis Engine:

### From AI Synthesis Pipeline

- **`consolidated_issues`** - AI-deduplicated issues (40-70% cleaner than raw)
- **`executive_summary`** - AI-generated strategic insights with:
  - Headline assessing site health
  - Business-friendly overview
  - Critical findings with evidence
  - 30/60/90 day strategic roadmap
  - ROI projections
- **`quick_wins`** - Full array of actionable improvements

### Strategic Insights

- **`one_liner`** - Concise critique perfect for hooks
- **`top_issue`** - Most critical finding
- **`call_to_action`** - Suggested CTA
- **`outreach_angle`** - Pre-determined sales angle based on grade

### Detailed Scoring

- **Desktop vs Mobile**: `design_score_desktop`, `design_score_mobile`
- **By Category**: `seo_score`, `content_score`, `social_score`, `accessibility_score`
- **Performance**: `performance_score_mobile`, `performance_score_desktop`
- **Gaps**: Calculated mobile vs desktop gap with severity

### Priority & Urgency

- **`priority_tier`** - hot / warm / cold
- **`lead_priority`** - 0-100 score
- **`urgency_score`** - 0-20 urgency level
- **`budget_likelihood`** - high / medium / low
- **`fit_score`** - How well they match ICP

### Compliance & Risk

- **`has_https`** - Security status
- **`is_mobile_friendly`** - Mobile optimization
- **`accessibility_issues`** - WCAG violations array
- **`compliance_risk`** - Assessed risk level

---

## Generating Outreach Variations

### Batch Generation (Recommended)

Generate all 12 variations for all leads in one command:

```bash
# Generate for all leads ready for outreach
node batch-generate-all-variations.js

# Generate for specific project
node batch-generate-all-variations.js --project-id=abc-123

# Limit to first N leads (testing)
node batch-generate-all-variations.js --limit=10

# Dry run (preview without generating)
node batch-generate-all-variations.js --dry-run
```

### What Happens:

1. Fetches all leads with `status='ready_for_outreach'`
2. For each lead:
   - Builds rich personalization context (includes synthesis data)
   - Generates 3 email variations
   - Generates 9 social DM variations (3 per platform)
   - Saves all to `composed_emails` table
3. Provides detailed progress and cost tracking

### Output Example:

```
📊 SUMMARY:
   Leads processed: 20/20
   Emails generated: 60
   Social DMs generated: 180
   Total content pieces: 240

💰 COST:
   Total API cost: $0.48
   Cost per lead: $0.024
   Cost per piece: $0.002

⏱️  TIME:
   Total generation time: 45.3s
   Avg time per lead: 2.3s
```

---

## Exporting to CSV

Use the existing database-tools export utility:

```bash
cd database-tools

# Export all outreach variations
npm run db:export -- composed_emails

# Or use your custom export scripts
# (you mentioned you already have these!)
```

### CSV Structure

Each row contains:
- **Lead info**: company_name, industry, url, contact details
- **Content**: platform, variation_type, email_strategy, subject, body
- **Metadata**: AI model, cost, quality score, status
- **Analysis data used**: Flags for which rich data was used
- **Priority**: priority_tier from lead scoring

### Filtering in Your Export Tool

You can filter by:
- `platform` - email, instagram, linkedin, facebook
- `variation_type` - free_value, portfolio_building, problem_first
- `status` - ready, approved, sent, etc.
- `project_id` - Specific project

---

## Database Schema

### `composed_emails` Table

New columns added:

```javascript
variation_type           // 'free_value', 'portfolio_building', 'problem_first'
data_sources_used        // JSONB - tracks which analysis fields were used
                         // {
                         //   used_executive_summary: true,
                         //   used_consolidated_issues: true,
                         //   used_quick_wins: true,
                         //   priority_tier: 'hot'
                         // }
```

Existing columns:
- All lead/contact info
- `email_subject`, `email_body`
- `platform` (email, instagram, linkedin, facebook)
- `email_strategy` (prompt template name)
- `ai_model`, `generation_cost`, `generation_time_ms`
- `usage_input_tokens`, `usage_output_tokens`
- `status`, `created_at`, `sent_at`

---

## Prompt Templates

### Email Strategies

Located in: `config/prompts/email-strategies/`

- **`free-value-delivery.json`** - Direct report delivery, zero ask
- **`portfolio-building.json`** - Honest new agency positioning
- **`problem-first-urgent.json`** - Lead with critical issue

### Social Strategies

Located in: `config/prompts/social-strategies/`

**Instagram** (ultra-casual, no URLs, 80-150 chars):
- `instagram-free-value.json`
- `instagram-portfolio-building.json`
- `instagram-problem-first.json`

**LinkedIn** (professional-casual, 150-250 chars):
- `linkedin-free-value.json`
- `linkedin-portfolio-building.json`
- `linkedin-problem-first.json`

**Facebook** (friendly-community, 120-200 chars):
- `facebook-free-value.json`
- `facebook-portfolio-building.json`
- `facebook-problem-first.json`

### Archived Templates

Old templates moved to `_archive/`:
- compliment-sandwich
- problem-first
- problem-agitation
- achievement-focused
- question-based
- industry-insight

---

## Best Practices

### 1. **Testing Variations**

A/B test the three positioning approaches to see which resonates best with your audience:

- **Metric 1**: Open rates (test subject lines)
- **Metric 2**: Response rates (test body content)
- **Metric 3**: Conversion to meeting (test CTAs)

### 2. **Personalization Variables**

All templates use `{{variable}}` syntax and are filled with rich context:

```javascript
// Email templates have access to:
{{company_name}}, {{contact_name}}, {{industry}}
{{website_grade}}, {{website_score}}
{{one_liner}}, {{top_issue}}
{{consolidated_issues_count}}, {{quick_wins_count}}
{{quick_wins_formatted}}  // Bullet list
{{executive_summary_headline}}
{{mobile_vs_desktop_gap.description}}
{{urgency_indicator}}
{{compliance_risk.description}}
// ... and 50+ more fields
```

### 3. **Report Link Placeholder**

Email templates include `[REPORT_LINK]` placeholder. Replace with actual report URL before sending:

- Option A: Host PDFs on document tracking service
- Option B: Host HTML reports on your domain
- Option C: Attach PDF directly to email

### 4. **Cost Management**

- **Per lead**: ~$0.02 (12 variations × ~$0.002 each)
- **Model used**: claude-haiku-4-5 (fast and cheap)
- **For 100 leads**: ~$2.00 total
- **For 1000 leads**: ~$20.00 total

### 5. **Quality Assurance**

Before bulk sending:
1. Generate for 5-10 test leads
2. Review all 12 variations per lead
3. Check for:
   - Proper personalization (no `{{placeholders}}` left)
   - Appropriate tone for variation type
   - Accurate analysis data references
   - Platform-specific constraints (Instagram no URLs)

### 6. **Progressive Enhancement**

Start conservatively:
1. **Week 1**: Free Value variation only (safest approach)
2. **Week 2**: Add Portfolio Building (if response rate good)
3. **Week 3**: Add Problem-First for D/F grades
4. **Week 4**: A/B test all three, analyze results

### 7. **Platform-Specific Notes**

**Instagram**:
- NO URLs in DMs (Instagram blocks them)
- Keep under 150 characters
- Use "I can send you the link" approach
- Very casual tone

**LinkedIn**:
- Professional but not stiff
- Business outcome focused
- OK to include links
- 150-250 characters optimal

**Facebook**:
- Community-friendly
- Mention local/city connection
- Friendly neighbor tone
- Links OK

### 8. **Status Workflow**

Recommended status progression in `composed_emails`:
1. `ready` - Generated, ready for review
2. `approved` - Human reviewed, ready to send
3. `sent` - Sent to prospect
4. `replied` - Prospect responded
5. `bounced` - Email bounced
6. `failed` - Send failed

### 9. **Follow-Up Sequences**

The 3-variation approach maps to Alex Hormozi's 3.5:1 give-to-ask ratio:

- **Email 1**: Free Value delivery (this system)
- **Email 2**: "Did you see this?" bump (3 days later)
- **Email 3**: "Was this helpful?" (5 days after Email 2)
- **Email 4**: Soft service mention (only if positive response)

### 10. **Tracking & Analytics**

Track performance by `variation_type` to optimize:

```sql
-- Response rate by variation type
SELECT
  variation_type,
  COUNT(*) as sent,
  SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied,
  ROUND(100.0 * SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) / COUNT(*), 2) as response_rate
FROM composed_emails
WHERE status IN ('sent', 'replied')
GROUP BY variation_type
ORDER BY response_rate DESC;
```

---

## Troubleshooting

### Issue: "Missing required context variables"

**Cause**: Lead doesn't have all analysis data populated

**Solution**: Check lead record has:
- `website_grade`, `overall_score`
- `consolidated_issues` or `top_issue`
- `quick_wins` or at least one issue array

### Issue: "Template not found"

**Cause**: Prompt file doesn't exist or has wrong name

**Solution**: Check file exists in `config/prompts/email-strategies/` or `social-strategies/`

### Issue: "Supabase connection failed"

**Cause**: Missing environment variables

**Solution**: Ensure `.env` has:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### Issue: "Generation too slow"

**Cause**: Batch processing 1000+ leads

**Solution**:
- Use `--limit` flag to batch in chunks of 50-100
- Run during off-peak hours
- Consider parallel processing (advanced)

---

## Next Steps

1. **Generate test batch**:
   ```bash
   node batch-generate-all-variations.js --limit=5
   ```

2. **Review output** in Supabase `composed_emails` table

3. **Export to CSV** using database-tools

4. **Import to email tool** (Instantly, Smartlead, etc.)

5. **Track results** and optimize variations

---

## Contact

For questions or issues:
- Check the outreach-engine README
- Review the CLAUDE.md project guide
- Test with the batch generator dry-run mode

---

**Version**: 2.0.0
**Last Updated**: 2025-01-XX
**Author**: MaxantAgency Team
