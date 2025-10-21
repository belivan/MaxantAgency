# OUTREACH ENGINE - Technical Specification
Version: 2.0
Agent Assignment: Agent 3
Business Focus: Web Design & Development Agency
Status: COMPLETE REFACTOR REQUIRED

═══════════════════════════════════════════════════════════════════

## 1. PURPOSE & SCOPE

Generates personalized outreach (emails + social DMs) for web design services.
Uses analysis results to craft specific, actionable, non-salesy messages.

**Core Philosophy:** "Hyper-personalized, helpful expert tone, not salesperson. Reference specific issues. 2-5 sentences max."

═══════════════════════════════════════════════════════════════════

## 2. PIPELINE STEPS

```
EMAIL PATH:
STEP 1: Choose email strategy (compliment-sandwich, problem-first, etc.)
STEP 2: Generate email using AI + personalization data
STEP 3: Generate A/B variants (optional)
STEP 4: Validate quality (subject 50-70 chars, body under 200 words)
STEP 5: Generate technical reasoning
STEP 6: Save to composed_emails table + sync to Notion

SOCIAL DM PATH:
STEP 1: Choose platform (Instagram, Facebook, LinkedIn)
STEP 2: Select DM strategy (value-first, compliment-question, etc.)
STEP 3: Generate DM (very casual, platform-specific constraints)
STEP 4: Validate (char limits, banned words)
STEP 5: Save to social_outreach table

OUTPUT: Messages ready for review/sending
```

═══════════════════════════════════════════════════════════════════

## 3. REQUIRED FILE STRUCTURE

```
outreach-engine/
├── server.js
├── config/
│   ├── prompts/
│   │   ├── email-strategies/
│   │   │   ├── compliment-sandwich.json
│   │   │   ├── problem-first.json
│   │   │   └── subject-line-generator.json
│   │   └── social-strategies/
│   │       ├── value-first.json
│   │       └── compliment-question.json
│   └── validation/
│       ├── email-quality.json
│       └── social-quality.json
├── generators/
│   ├── email-generator.js
│   ├── social-generator.js
│   └── variant-generator.js
├── validators/
│   ├── email-validator.js
│   ├── social-validator.js
│   └── spam-checker.js
├── senders/
│   ├── smtp-sender.js
│   └── gmail-sender.js
├── integrations/
│   └── notion-sync.js
├── database/
│   └── schemas/
│       ├── composed_emails.json
│       └── social_outreach.json
└── shared/
    ├── personalization-builder.js
    └── prompt-loader.js
```

═══════════════════════════════════════════════════════════════════

## 4. API ENDPOINTS

**POST /api/compose**
- Compose email for single lead
- Body: { url, strategy, generateVariants, model }

**POST /api/compose-social**
- Generate social DM
- Body: { url, platform, strategy, variants }

**POST /api/compose-batch**
- Compose emails for multiple leads
- Response: Server-Sent Events

**POST /api/send-email**
- Send email via SMTP
- Body: { email_id, provider, actualSend }

**POST /api/send-batch**
- Batch send approved emails
- Body: { email_ids, provider, actualSend, delayMs }

**POST /api/sync-from-notion**
- Sync status changes from Notion
- Auto-sends emails marked "Approved"

**GET /api/emails**
- Get composed emails with filters

**GET /api/strategies**
- Get available email strategies

═══════════════════════════════════════════════════════════════════

## 5. DATABASE SCHEMA

Table: **composed_emails**

Required columns:
- id, lead_id (foreign key)
- url, company_name, industry
- contact_email, contact_name, contact_title
- email_subject, email_body, email_strategy
- has_variants, subject_variants (jsonb), body_variants (jsonb)
- recommended_variant (jsonb), variant_reasoning
- technical_reasoning, business_summary, verification_checklist
- quality_score (0-100), validation_issues (jsonb)
- status (pending, approved, rejected, sent, failed)
- reviewed_at, sent_at, email_message_id
- notion_page_id, synced_to_notion, notion_sync_at
- project_id, campaign_id, client_name, source_app
- ai_model, generation_cost, created_at, updated_at

Table: **social_outreach**

Required columns:
- id, lead_id
- url, company_name, industry, contact_name
- platform (instagram, facebook, linkedin)
- outreach_type (dm, comment)
- message_body, character_count, social_profile_url
- strategy, quality_score
- status (pending, sent, responded)
- sent_at, project_id, ai_model, generation_cost

═══════════════════════════════════════════════════════════════════

## 6. PROMPT CONFIGURATION EXAMPLES

**config/prompts/email-strategies/compliment-sandwich.json:**
```json
{
  "name": "compliment-sandwich",
  "model": "claude-haiku",
  "temperature": 0.7,
  "systemPrompt": "You are a web design expert writing helpful, conversational cold email.\n\nRULES:\n1. 2-5 sentences, under 200 words\n2. Be SPECIFIC: mention actual findings\n3. Business impact, not tech jargon\n4. Conversational tone\n5. ONE CTA: 15-min call\n\nSTRUCTURE:\n- Sentence 1: Genuine compliment\n- Sentence 2-3: Specific issue + business impact\n- Sentence 4: Simple CTA",
  "userPromptTemplate": "Company: {{company_name}}\nTop Issue: {{top_issue}}\nQuick Win: {{quick_win}}\n\nWrite email following Compliment Sandwich structure.",
  "variables": ["company_name", "industry", "top_issue", "quick_win", "contact_name"],
  "constraints": {
    "maxWords": 200,
    "maxSentences": 5,
    "tone": "helpful-colleague"
  }
}
```

**config/validation/email-quality.json:**
```json
{
  "rules": {
    "subject": {
      "minLength": 50,
      "maxLength": 70,
      "bannedPhrases": ["free", "click here", "limited time"],
      "requiredLowercase": true
    },
    "body": {
      "maxWords": 200,
      "maxSentences": 5,
      "bannedPhrases": ["leverage", "synergy", "world-class"]
    }
  },
  "scoring": {
    "subjectLength": {"61-70": 100, "50-60": 85},
    "bodyLength": {"under100": 100, "100-150": 95},
    "hasSpecificFinding": 20,
    "hasBusinessImpact": 20
  }
}
```

═══════════════════════════════════════════════════════════════════

## 7. KEY MODULE SIGNATURES

**generators/email-generator.js:**
```javascript
export async function generateEmail(lead, options) {
  // Load strategy prompt
  // Build personalization context
  // Generate subject + body
  // Optional: generate variants
  return {
    subject, body,
    subjects: ["variant 1", "variant 2"],
    bodies: ["body 1", "body 2"],
    recommended: {subject: 0, body: 0},
    cost: 0.002
  };
}
```

**validators/email-validator.js:**
```javascript
export function validateEmail(email) {
  // Check subject length, body length
  // Check banned phrases
  // Check placeholders
  return {
    isValid: true,
    score: 95,
    issues: []
  };
}
```

**senders/smtp-sender.js:**
```javascript
export async function sendEmail(emailData, options) {
  // Create .eml file (always)
  // If actualSend: send via SMTP
  return {
    success: true,
    emlPath: "emails/sent/...",
    smtpSent: true,
    messageId: "...",
    sentAt: "2025-..."
  };
}
```

**shared/personalization-builder.js:**
```javascript
export function buildPersonalizationContext(lead) {
  // Extract all personalization data
  return {
    company_name, industry, url,
    contact_name, grade, top_issue,
    quick_wins, business_impact,
    sender_name, sender_company
  };
}
```

═══════════════════════════════════════════════════════════════════

## 8. 2025 BEST PRACTICES

✅ Subject lines: 50-70 characters (optimal: 61-70 = 43% open rate)
✅ Email body: 2-5 sentences, under 200 words
✅ Specific website findings (not generic)
✅ Business impact, not technical jargon
✅ Conversational tone
✅ Personalized opening
✅ Single clear CTA (15-min call)
✅ No spam phrases, no exclamation marks

═══════════════════════════════════════════════════════════════════

## 9. SUCCESS CRITERIA

✅ All prompts in external JSON
✅ Email generation uses analysis data
✅ Subject lines 50-70 chars
✅ Body under 200 words
✅ A/B variants work
✅ Social DM generation works
✅ Quality validation catches spam
✅ SMTP sending works
✅ .eml files created
✅ Notion two-way sync
✅ Auto-send on "Approved"
✅ Duplicate protection
✅ Costs under $0.005 per email
✅ All tests passing

═══════════════════════════════════════════════════════════════════

## 10. MIGRATION FROM email-composer/

1. Rename: email-composer → outreach-engine
2. Extract prompts from email-generator.js → config/prompts/
3. Extract validation rules → config/validation/
4. Split email-generator.js
5. Move SMTP code → senders/
6. Move Notion code → integrations/
7. Create personalization-builder.js
8. Update server.js
9. Create database/schemas/
10. Test with real leads

═══════════════════════════════════════════════════════════════════

END OF SPECIFICATION
