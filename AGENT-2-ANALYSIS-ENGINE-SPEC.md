# ANALYSIS ENGINE - Technical Specification
Version: 2.0
Agent Assignment: Agent 2
Business Focus: Web Design & Development Agency
Status: COMPLETE REFACTOR REQUIRED

═══════════════════════════════════════════════════════════════════

## 1. PURPOSE & SCOPE

Analyzes websites specifically for web design/development opportunities.
Identifies design issues, SEO problems, content gaps, social presence.

**Core Philosophy:** "Analyze websites like a web design expert, find specific fixable issues"

═══════════════════════════════════════════════════════════════════

## 2. PIPELINE STEPS

```
STEP 1: Website Screenshot & HTML Capture
→ Playwright loads page, captures screenshot + HTML

STEP 2: Design & UX Analysis
→ GPT-4o Vision analyzes screenshot for design issues

STEP 3: SEO Analysis
→ Check meta tags, headings, images, page speed

STEP 4: Content Analysis
→ Extract blog posts, analyze content quality

STEP 5: Social Media Presence Analysis
→ Analyze social profiles for consistency

STEP 6: Grading & Critique Generation
→ Calculate A-F grade, generate actionable critique

OUTPUT: Save to leads table, status: "ready_for_outreach"
```

═══════════════════════════════════════════════════════════════════

## 3. REQUIRED FILE STRUCTURE

```
analysis-engine/
├── server.js
├── config/
│   └── prompts/
│       └── web-design/
│           ├── design-critique.json
│           ├── seo-analysis.json
│           ├── content-analysis.json
│           └── social-analysis.json
├── analyzers/
│   ├── design-analyzer.js
│   ├── seo-analyzer.js
│   ├── content-analyzer.js
│   ├── social-analyzer.js
│   └── index.js
├── grading/
│   ├── grader.js
│   ├── critique-generator.js
│   └── weights.json
├── scrapers/
│   ├── screenshot-capture.js
│   └── html-parser.js
├── orchestrator.js
└── database/
    └── schemas/
        └── leads.json
```

═══════════════════════════════════════════════════════════════════

## 4. API ENDPOINTS

**POST /api/analyze**
- Analyze prospects from database
- Response: Server-Sent Events with progress

**POST /api/analyze-url**
- Analyze single URL (testing/demo)

**GET /api/leads**
- Get analyzed leads with filters
- Query params: grade, industry, hasEmail, minScore, limit

═══════════════════════════════════════════════════════════════════

## 5. DATABASE SCHEMA

Table: **leads**

Required columns:
- id, prospect_id (foreign key)
- company_name, industry, url, city
- contact_email, contact_phone, contact_name
- website_grade (A-F), overall_score (0-100)
- design_score, seo_score, content_score, social_score
- design_issues (jsonb), seo_issues (jsonb)
- content_issues (jsonb), social_issues (jsonb)
- quick_wins (jsonb array)
- analysis_summary (text), top_issue (text)
- tech_stack, page_load_time, screenshot_url
- social_profiles (jsonb), social_metadata (jsonb)
- has_blog, content_insights (jsonb)
- status (ready_for_outreach, email_composed, contacted)
- project_id, analyzed_at, analysis_cost

═══════════════════════════════════════════════════════════════════

## 6. PROMPT CONFIGURATION EXAMPLES

**config/prompts/web-design/design-critique.json:**
```json
{
  "name": "design-critique",
  "model": "gpt-4o",
  "systemPrompt": "You are a web design expert. Identify SPECIFIC, ACTIONABLE issues.",
  "userPromptTemplate": "Analyze this screenshot for {{company_name}}.\n\nFind 5-10 specific design issues.",
  "outputFormat": {
    "issues": [{
      "category": "design|ux|mobile",
      "title": "Brief title",
      "description": "Specific issue",
      "impact": "Business impact",
      "difficulty": "quick-win|medium|major",
      "priority": "high|medium|low"
    }],
    "overallDesignScore": "0-100"
  }
}
```

**grading/weights.json:**
```json
{
  "weights": {
    "design": 0.30,
    "seo": 0.30,
    "content": 0.20,
    "social": 0.20
  },
  "scale": {
    "A": {"min": 85},
    "B": {"min": 70},
    "C": {"min": 55},
    "D": {"min": 40},
    "F": {"min": 0}
  }
}
```

═══════════════════════════════════════════════════════════════════

## 7. KEY MODULE SIGNATURES

**analyzers/design-analyzer.js:**
```javascript
export async function analyzeDesign(url, screenshot, context) {
  // Load prompt, send to GPT-4o Vision
  return {
    designScore: 75,
    issues: [{category, title, description, impact, difficulty}],
    quickWins: ["Fix mobile menu"],
    positives: ["Clean colors"]
  };
}
```

**analyzers/seo-analyzer.js:**
```javascript
export async function analyzeSEO(url, html, pageLoadTime) {
  // Parse HTML, check meta tags, send to AI
  return {
    seoScore: 68,
    issues: [{category, title, description, fix, priority}],
    opportunities: ["Add schema markup"]
  };
}
```

**grading/grader.js:**
```javascript
export function calculateGrade(scores) {
  // Load weights, calculate weighted average
  const weightedScore =
    scores.design * 0.3 +
    scores.seo * 0.3 +
    scores.content * 0.2 +
    scores.social * 0.2;

  return {
    grade: "B",
    overallScore: 72,
    breakdown: {...}
  };
}
```

═══════════════════════════════════════════════════════════════════

## 8. SUCCESS CRITERIA

✅ All prompts in external JSON
✅ Analyze 10 websites in under 5 minutes
✅ Letter grades accurately reflect quality
✅ Quick wins identified
✅ Design, SEO, content, social all analyzed
✅ Server-Sent Events for progress
✅ Handles failures gracefully
✅ Costs under $0.15 per lead
✅ All tests passing

═══════════════════════════════════════════════════════════════════

## 9. MIGRATION FROM website-audit-tool/

1. Rename: website-audit-tool → analysis-engine
2. Extract prompts from analyzer.js → config/prompts/web-design/
3. Split analyzer.js into separate analyzers
4. Move grading logic → grading/grader.js
5. Create critique-generator.js
6. Update server.js
7. Create database/schemas/leads.json
8. Test with real prospects

═══════════════════════════════════════════════════════════════════

END OF SPECIFICATION
