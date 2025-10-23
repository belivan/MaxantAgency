# Outreach Engine v2.1 - Quick Reference

**AI-Powered Outreach with Analysis Engine v2.0 Integration**

---

## 🚀 Quick Start

```bash
cd outreach-engine
npm install
node server.js
# Server runs on http://localhost:3002
```

---

## 🎯 Priority-Based Targeting (NEW!)

### Priority Tiers
- **hot** (75-100): High quality, high budget, urgent need → Target first!
- **warm** (50-74): Good quality, medium budget → Target second
- **cold** (0-49): Lower quality or budget → Target last

### Budget Likelihood
- **high**: Strong budget signals (pricing page, large staff, awards)
- **medium**: Moderate budget signals
- **low**: Weak budget signals (small business, limited info)

---

## 📊 Lead Scoring Dimensions

Each lead gets scored on 6 dimensions (totaling 100 points):

| Dimension | Max Points | What It Measures |
|-----------|-----------|------------------|
| Quality Gap | 25 | How much improvement potential |
| Budget | 25 | Estimated budget capacity |
| Urgency | 20 | How urgently they need help |
| Industry Fit | 15 | How well they match target |
| Company Size | 10 | Company size assessment |
| Engagement | 5 | Social media engagement |

---

## 🔌 API Quick Reference

### Get Hot Leads
```bash
GET /api/leads/ready?priorityTier=hot&limit=20
```

### Batch Compose for Hot Leads
```bash
POST /api/compose-batch
{
  "priorityTier": "hot",
  "budgetLikelihood": "high",
  "industry": "restaurant",
  "limit": 10,
  "strategy": "problem-first"
}
```

### Get Leads by Multiple Filters
```bash
GET /api/leads/ready?grade=C&priorityTier=warm&industry=dentist&minScore=60
```

---

## 📝 Available Context Variables (100+)

### Priority & Scoring
```
{{lead_priority}}           - 0-100 AI priority score
{{priority_tier}}           - "hot", "warm", "cold"
{{budget_likelihood}}       - "high", "medium", "low"
{{fit_score}}               - ICP fit (0-100)
{{quality_gap_score}}       - Improvement potential (0-25)
{{urgency_score}}           - Need urgency (0-20)
```

### Scores (Desktop/Mobile Separated!)
```
{{overall_score}}           - Overall quality (0-100)
{{website_grade}}           - A, B, C, D, F
{{design_score_desktop}}    - Desktop design (0-100)
{{design_score_mobile}}     - Mobile design (0-100)
{{seo_score}}               - SEO quality (0-100)
{{content_score}}           - Content quality (0-100)
{{social_score}}            - Social presence (0-100)
{{accessibility_score}}     - WCAG compliance (0-100)
```

### Issues (NEW: Desktop/Mobile Separated!)
```
{{mobile_critical_issues}}  - Count of critical mobile issues
{{desktop_critical_issues}} - Count of critical desktop issues
{{design_issues_desktop}}   - Array of desktop issues
{{design_issues_mobile}}    - Array of mobile issues
{{accessibility_issues}}    - Array of WCAG violations
{{seo_issues}}              - Array of SEO issues
{{content_issues}}          - Array of content issues
```

### Analysis Insights
```
{{top_issue}}               - Most critical issue
{{quick_win}}               - Easiest fix with high impact
{{analysis_summary}}        - Full analysis summary
{{one_liner}}               - One-line critique
{{outreach_angle}}          - AI-generated sales angle
{{business_impact}}         - Business impact statement
```

### Business Intelligence (NEW!)
```
{{business_intelligence}}   - Full structured data object
{{years_in_business}}       - Years in business
{{business_context}}        - Credibility signals string
{{google_rating}}           - Google rating (1-5)
{{review_count}}            - Google review count
```

### Multi-Page Analysis (NEW!)
```
{{pages_discovered}}        - Total pages found
{{pages_crawled}}           - Pages with screenshots
{{pages_analyzed}}          - Pages AI analyzed
```

### Technical
```
{{tech_stack}}              - WordPress, Shopify, etc.
{{page_load_time}}          - Load time in milliseconds
{{is_mobile_friendly}}      - true/false
{{has_https}}               - true/false
{{has_blog}}                - true/false
```

---

## 📧 Email Strategy Examples

### Problem-First (Best for Hot Leads)
```json
{
  "strategy": "problem-first",
  "userPromptTemplate": "Hi {{first_name}},

I analyzed {{company_name}}'s website and found {{mobile_critical_issues}} critical mobile issues.

Top issue: {{top_issue}}

This is {{business_impact}}.

Quick win: {{quick_win}}

Can we chat?

{{sender_name}}"
}
```

### Achievement-Focused (Best for Warm Leads)
```json
{
  "strategy": "achievement-focused",
  "userPromptTemplate": "Hi {{first_name}},

Congrats on {{business_context}}!

Your site scores {{overall_score}}/100 - Grade {{website_grade}}.

One quick fix: {{quick_win}}

Worth 15 minutes to discuss?

{{sender_name}}"
}
```

---

## 🎨 Smart Issue Prioritization

The system now intelligently prioritizes issues:

1. **Mobile critical issues** (60% of traffic!)
2. **Desktop critical issues** (professional appearance)
3. **Accessibility violations** (legal compliance risk)
4. **SEO issues** (revenue impact)
5. **Content issues** (messaging clarity)
6. **Social presence** (engagement opportunities)

---

## 🔍 Filter Combinations

### High-Value Targets
```json
{
  "priorityTier": "hot",
  "budgetLikelihood": "high",
  "grade": "C",
  "limit": 20
}
```

### Industry-Specific
```json
{
  "industry": "restaurant",
  "priorityTier": "warm",
  "grade": "C",
  "limit": 50
}
```

### Quick Wins (Low-Hanging Fruit)
```json
{
  "grade": "B",
  "priorityTier": "warm",
  "minScore": 75,
  "limit": 100
}
```

### Accessibility Compliance Angle
```javascript
// First, get leads with low accessibility scores
// Then filter for accessibility_score < 70 in your app
```

---

## ⚡ Performance Tips

1. **Target hot leads first** - Higher conversion, better ROI
2. **Use priority sorting** - Already sorted by `lead_priority` DESC
3. **Batch by industry** - Industry-specific messaging converts better
4. **Check mobile issues** - 60% of traffic is mobile
5. **Leverage business intelligence** - Personalize with years in business, ratings

---

## 🛠️ Common Workflows

### Daily Outreach Routine
```bash
# 1. Get today's hot leads
GET /api/leads/ready?priorityTier=hot&limit=10

# 2. Batch compose
POST /api/compose-batch
{
  "priorityTier": "hot",
  "budgetLikelihood": "high",
  "strategy": "problem-first",
  "limit": 10
}

# 3. Review in Notion, approve

# 4. Send approved
POST /api/send-batch
{
  "actualSend": true,
  "limit": 10
}
```

### Industry Campaign
```bash
# 1. Target specific industry
GET /api/leads/ready?industry=restaurant&priorityTier=warm&limit=50

# 2. Use industry-focused strategy
POST /api/compose-batch
{
  "industry": "restaurant",
  "priorityTier": "warm",
  "strategy": "industry-insight",
  "limit": 50
}
```

---

## 🐛 Quick Troubleshooting

### No hot leads?
```bash
# Check if leads have priority scores
GET /api/leads/ready?limit=1
# Look for: lead_priority, priority_tier
```

### Old field names?
```javascript
// Update to new names:
website_score → overall_score
lead_grade → website_grade
load_time → page_load_time (in ms)
```

### Missing analysis data?
```bash
# Re-analyze the lead
POST http://localhost:3001/api/analyze-url
{
  "url": "https://example.com"
}
```

---

## 📚 Documentation

- **Full API Docs**: [README.md](./README.md)
- **Upgrade Guide**: [UPGRADE-GUIDE-v2.1.md](./UPGRADE-GUIDE-v2.1.md)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **API Documentation**: [API.md](./API.md)

---

## 🎯 Key Takeaways

✅ **Use priority tiers** - Focus on hot leads (75-100)
✅ **Combine filters** - Grade + Priority + Budget = precision targeting
✅ **Mobile-first messaging** - 60% of traffic is mobile
✅ **Leverage business intel** - Years in business, ratings, employees
✅ **Check accessibility** - Legal compliance angle (WCAG 2.1)
✅ **Multi-page awareness** - Some leads have deep analysis

---

**Version**: 2.1.0  
**Status**: ✅ Production Ready  
**Compatibility**: Analysis Engine v2.0+
