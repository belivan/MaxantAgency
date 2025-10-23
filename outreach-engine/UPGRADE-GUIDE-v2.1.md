# Outreach Engine v2.1.0 Upgrade Guide

**Updated for Analysis Engine v2.0 Compatibility**

---

## Overview

Outreach Engine v2.1.0 has been updated to leverage the enhanced data from Analysis Engine v2.0. This guide explains what's changed and how to use the new features.

---

## What's New

### 1. Enhanced Lead Data Structure

The Analysis Engine now provides much richer data per lead:

**New Fields Available:**
- `design_score_desktop` - Desktop-specific design score (0-100)
- `design_score_mobile` - Mobile-specific design score (0-100)
- `design_issues_desktop` - Array of desktop design issues
- `design_issues_mobile` - Array of mobile design issues
- `mobile_critical_issues` - Count of critical mobile issues
- `desktop_critical_issues` - Count of critical desktop issues
- `accessibility_score` - WCAG compliance score (0-100)
- `accessibility_issues` - Array of accessibility violations
- `accessibility_compliance` - Detailed WCAG compliance data
- `accessibility_wcag_level` - Compliance level (A, AA, AAA)

**AI Lead Scoring:**
- `lead_priority` - AI-scored lead quality (0-100)
- `lead_priority_reasoning` - Explanation for the priority
- `priority_tier` - hot (75-100), warm (50-74), cold (0-49)
- `budget_likelihood` - high, medium, low
- `fit_score` - ICP fit score (0-100)

**Dimensional Scores:**
- `quality_gap_score` - How much improvement potential (0-25)
- `budget_score` - Estimated budget capacity (0-25)
- `urgency_score` - How urgently they need help (0-20)
- `industry_fit_score` - Industry match (0-15)
- `company_size_score` - Company size assessment (0-10)
- `engagement_score` - Social engagement level (0-5)

**Business Intelligence:**
- `business_intelligence` - Structured data (years in business, employee count, certifications, etc.)
- `outreach_angle` - AI-generated sales angle
- `one_liner` - One-line critique for subject lines

**Multi-Page Analysis:**
- `pages_discovered` - Total pages found
- `pages_crawled` - Pages with screenshots
- `pages_analyzed` - Pages that got AI analysis
- `ai_page_selection` - AI's page selection reasoning
- `crawl_metadata` - Complete crawl details

---

## Breaking Changes

### Field Name Updates

**Old → New:**
- `website_score` → `overall_score` (field still works but use new name)
- `lead_grade` → `website_grade` (standardized name)
- `load_time` → `page_load_time` (now in milliseconds, not seconds)

### Personalization Context Changes

The `buildPersonalizationContext()` function now returns 100+ variables instead of 32.

**New variables available in email templates:**
```
{{lead_priority}}           - 0-100 AI priority score
{{priority_tier}}           - "hot", "warm", or "cold"
{{budget_likelihood}}       - "high", "medium", or "low"
{{design_score_desktop}}    - Desktop design score
{{design_score_mobile}}     - Mobile design score
{{mobile_critical_issues}}  - Count of mobile issues
{{accessibility_score}}     - WCAG compliance score
{{outreach_angle}}          - AI-generated sales angle
{{one_liner}}               - One-line critique
{{pages_analyzed}}          - Multi-page analysis count
{{business_intelligence}}   - Structured business data
```

---

## New Features

### 1. Priority-Based Lead Filtering

You can now filter leads by AI priority tier:

```javascript
// Get only "hot" leads (priority 75-100)
GET /api/leads/ready?priorityTier=hot&limit=20

// Batch compose for high-budget, hot leads
POST /api/compose-batch
{
  "priorityTier": "hot",
  "budgetLikelihood": "high",
  "limit": 10
}
```

### 2. Multi-Dimensional Filtering

Combine multiple filters for precise targeting:

```javascript
POST /api/compose-batch
{
  "grade": "C",
  "priorityTier": "warm",
  "budgetLikelihood": "medium",
  "industry": "restaurant",
  "minScore": 60,
  "limit": 50
}
```

### 3. Enhanced Top Issue Detection

The system now intelligently prioritizes:
1. Mobile critical issues (highest impact)
2. Desktop critical issues
3. Accessibility violations (compliance risk)
4. SEO issues (revenue impact)
5. Content issues
6. Social presence

### 4. Business Intelligence Extraction

Emails can now reference:
- Years in business
- Employee count
- Awards and certifications
- Pricing information
- Decision maker names

### 5. Mobile vs Desktop Messaging

Separate tracking allows targeted messaging:
- "Your mobile site has 3 critical issues"
- "Desktop experience is solid, but mobile needs work"

---

## Migration Steps

### Step 1: Update Dependencies

```bash
cd outreach-engine
npm install
```

### Step 2: Update Email Prompts (Optional)

If you have custom email strategies, you can now use new variables:

**Example: Update `problem-first.json`**

```json
{
  "userPromptTemplate": "Write an email to {{company_name}} ({{industry}}). 
  
  They have a priority score of {{lead_priority}}/100 and are in the {{priority_tier}} tier.
  
  Top issue: {{top_issue}}
  Business impact: {{business_impact}}
  
  Mobile critical issues: {{mobile_critical_issues}}
  Accessibility score: {{accessibility_score}}/100
  
  {{business_intelligence.years_in_business}} years in business.
  Budget likelihood: {{budget_likelihood}}"
}
```

### Step 3: Test with Sample Leads

```bash
# Test with a hot lead
curl -X POST http://localhost:3002/api/compose \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "strategy": "problem-first"
  }'

# Check priority-based filtering
curl http://localhost:3002/api/leads/ready?priorityTier=hot&limit=5
```

### Step 4: Update Batch Workflows

If you have scripts that call `/api/compose-batch`, add new filters:

```javascript
// Before (v2.0)
fetch('/api/compose-batch', {
  method: 'POST',
  body: JSON.stringify({
    limit: 20,
    grade: 'C'
  })
});

// After (v2.1)
fetch('/api/compose-batch', {
  method: 'POST',
  body: JSON.stringify({
    limit: 20,
    grade: 'C',
    priorityTier: 'hot',
    budgetLikelihood: 'high',
    industry: 'restaurant'
  })
});
```

---

## Recommended Workflows

### Workflow 1: High-Priority Outreach

Target only hot leads with high budget likelihood:

```javascript
POST /api/compose-batch
{
  "priorityTier": "hot",
  "budgetLikelihood": "high",
  "strategy": "problem-first",
  "limit": 10
}
```

### Workflow 2: Industry-Specific Campaigns

Target specific industries with appropriate messaging:

```javascript
POST /api/compose-batch
{
  "industry": "restaurant",
  "grade": "C",
  "priorityTier": "warm",
  "strategy": "achievement-focused",
  "limit": 50
}
```

### Workflow 3: Mobile-First Outreach

Target leads with mobile issues (check in your email strategy):

```javascript
// In your email strategy prompt:
{
  "userPromptTemplate": "Focus on mobile issues if {{mobile_critical_issues}} > 0.
  
  Desktop score: {{design_score_desktop}}
  Mobile score: {{design_score_mobile}}
  
  Emphasize: {{#if mobile_critical_issues}}Mobile experience is hurting business{{/if}}"
}
```

### Workflow 4: Accessibility Compliance Angle

Target leads with accessibility issues (legal risk angle):

```javascript
// Filter for low accessibility scores
GET /api/leads/ready?minScore=0&limit=100

// Then filter in your app for accessibility_score < 70
```

---

## API Reference Updates

### Updated Endpoints

**`GET /api/leads/ready`**

New query parameters:
- `priorityTier` - Filter by hot/warm/cold
- `budgetLikelihood` - Filter by high/medium/low
- `industry` - Filter by industry
- `minScore` - Minimum overall_score

**`POST /api/compose-batch`**

New body parameters:
- `priorityTier` - Target specific priority tier
- `budgetLikelihood` - Target specific budget tier
- `industry` - Target specific industry
- `minScore` - Minimum overall_score threshold

---

## Personalization Context Reference

### Complete Variable List (100+ variables)

**Basic Info:**
- `company_name`, `industry`, `url`, `domain`, `city`, `state`

**Contact:**
- `contact_name`, `contact_email`, `contact_phone`, `contact_title`, `first_name`

**Scores:**
- `overall_score`, `website_grade`, `design_score`, `design_score_desktop`, `design_score_mobile`
- `seo_score`, `content_score`, `social_score`, `accessibility_score`

**Priority:**
- `lead_priority`, `priority_tier`, `budget_likelihood`, `fit_score`
- `quality_gap_score`, `budget_score`, `urgency_score`, `industry_fit_score`

**Issues:**
- `design_issues`, `design_issues_desktop`, `design_issues_mobile`
- `mobile_critical_issues`, `desktop_critical_issues`
- `seo_issues`, `content_issues`, `social_issues`, `accessibility_issues`

**Analysis:**
- `top_issue`, `quick_wins`, `quick_win`, `analysis_summary`, `one_liner`
- `call_to_action`, `outreach_angle`

**Performance:**
- `page_load_time`, `load_time`, `is_mobile_friendly`, `has_https`

**Multi-Page:**
- `pages_discovered`, `pages_crawled`, `pages_analyzed`

**Business:**
- `business_intelligence`, `business_context`, `business_impact`
- `years_in_business`, `google_rating`, `review_count`

**Technical:**
- `tech_stack`, `has_blog`, `content_insights`, `social_profiles`

---

## Troubleshooting

### Issue: "Missing field: lead_priority"

**Solution:** Re-run analysis on leads. Old leads don't have priority scoring.

```bash
# Re-analyze a lead
POST http://localhost:3001/api/analyze-url
{
  "url": "https://example.com"
}
```

### Issue: "No hot leads found"

**Solution:** Check if leads have been scored. Priority tiers require Analysis Engine v2.0.

```bash
# Check lead data
GET http://localhost:3002/api/leads/ready?limit=1
# Look for: lead_priority, priority_tier, budget_likelihood
```

### Issue: "Old field names in email templates"

**Solution:** Update custom email strategies to use new field names:
- `website_score` → `overall_score`
- `lead_grade` → `website_grade`

---

## Performance Impact

**No performance degradation** - All new fields are:
- Already indexed in database
- Computed during analysis (no extra API calls)
- Returned in standard lead queries

**Improved targeting** - Priority-based filtering reduces wasted outreach:
- Focus on hot leads = higher conversion
- Avoid cold leads = lower costs

---

## Backward Compatibility

✅ **Fully backward compatible** - Old API calls still work:

```javascript
// v2.0 API call still works in v2.1
POST /api/compose-batch
{
  "limit": 20,
  "grade": "C"
}
```

✅ **Legacy field names** still work:
- `website_score` still available (alias for `overall_score`)
- `lead_grade` still available (alias for `website_grade`)

⚠️ **Deprecated (but functional):**
- `design_issues` (use `design_issues_desktop`/`design_issues_mobile`)

---

## Next Steps

1. **Update email strategies** to leverage new variables
2. **Test priority-based filtering** with your lead data
3. **Review AI priority scores** to calibrate targeting
4. **Monitor conversion rates** by priority tier
5. **Experiment with new filters** for better segmentation

---

## Questions?

Check the main [README.md](./README.md) for full API documentation.

**Status:** ✅ Production Ready (v2.1.0)
**Compatibility:** Analysis Engine v2.0+
**Migration Required:** No (backward compatible)
