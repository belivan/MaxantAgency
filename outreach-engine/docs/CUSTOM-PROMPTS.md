# Outreach Engine - Custom Prompts & Model Customization

**Version:** 2.1.0  
**Feature:** AI Model and Prompt Customization  
**Updated:** December 2024

---

## Overview

Outreach Engine v2.1 introduces full customization of AI models and prompts for email composition and social DM generation. This feature enables you to:

- Override the default AI model (e.g., use Claude Sonnet instead of Haiku)
- Adjust temperature for more creative or focused outputs
- Replace the entire prompt with your own custom prompt configuration
- Apply different strategies and styles on a per-request basis

This follows the same pattern as the Prospecting Engine's `customPrompts` system.

---

## Priority System

When determining which model and temperature to use, the system follows this priority order:

**Model Selection:**
```
options.model > customPrompt.model > prompt.model > default (claude-haiku-4-5)
```

**Temperature Selection:**
```
options.temperature > customPrompt.temperature > prompt.temperature > default (0.7)
```

This allows you to override at any level depending on your needs.

---

## API Endpoints

### 1. Single Email Composition

**Endpoint:** `POST /api/compose`

**Request Body:**
```json
{
  "url": "https://example.com",
  "strategy": "compliment-sandwich",
  "model": "claude-sonnet-3-5",
  "temperature": 0.5,
  "generateVariants": false,
  "customPrompt": {
    "model": "claude-haiku-4-5",
    "temperature": 0.7,
    "systemPrompt": "You are a professional email copywriter...",
    "userPromptTemplate": "Generate an email for {{business_name}}...",
    "variables": ["business_name", "website"]
  }
}
```

**Parameters:**
- `url` (required): Website URL of the lead
- `strategy` (optional): Email strategy to use (default: "compliment-sandwich")
- `model` (optional): AI model override (e.g., "claude-sonnet-3-5", "claude-haiku-4-5")
- `temperature` (optional): Temperature override (0.0 - 1.0, default: 0.7)
- `generateVariants` (optional): Generate A/B test variants (default: false)
- `customPrompt` (optional): Full custom prompt configuration (see below)

---

### 2. Batch Email Composition

**Endpoint:** `POST /api/compose-batch`

**Request Body:**
```json
{
  "limit": 10,
  "grade": "A",
  "priorityTier": "hot",
  "strategy": "compliment-sandwich",
  "model": "claude-sonnet-3-5",
  "temperature": 0.5,
  "customPrompt": { /* same as above */ }
}
```

**Additional Parameters:**
- `limit` (optional): Maximum number of emails to generate (default: 10)
- `grade` (optional): Filter by grade (A, B, C, D, F)
- `priorityTier` (optional): Filter by priority tier (hot, warm, cold)
- `budgetLikelihood` (optional): Filter by budget likelihood (high, medium, low)
- `industry` (optional): Filter by industry
- `minScore` (optional): Minimum lead score

Returns Server-Sent Events (SSE) with progress updates.

---

### 3. Social DM Composition

**Endpoint:** `POST /api/compose-social`

**Request Body:**
```json
{
  "url": "https://example.com",
  "platform": "instagram",
  "strategy": "value-first",
  "model": "claude-sonnet-3-5",
  "temperature": 0.8,
  "customPrompt": {
    "model": "claude-haiku-4-5",
    "temperature": 0.8,
    "platforms": ["instagram", "facebook", "linkedin"],
    "systemPrompt": "You are a social media expert...",
    "userPromptTemplate": "Generate a {{platform}} DM for {{business_name}}...",
    "variables": ["business_name", "platform"],
    "platformSpecs": {
      "instagram": { "maxLength": 1000, "tone": "casual" }
    }
  }
}
```

**Parameters:**
- `url` (required): Website URL of the lead
- `platform` (required): Social platform ("instagram", "facebook", "linkedin")
- `strategy` (optional): DM strategy (default: "value-first")
- `model` (optional): AI model override
- `temperature` (optional): Temperature override (default: 0.8 for social)
- `customPrompt` (optional): Full custom prompt configuration

---

## Custom Prompt Structure

A custom prompt object has the following structure:

```javascript
{
  // AI Configuration
  "model": "claude-sonnet-3-5",           // AI model to use
  "temperature": 0.7,                      // Temperature (0.0-1.0)
  
  // Prompt Content
  "systemPrompt": "System instructions...",
  "userPromptTemplate": "Template with {{variables}}...",
  
  // Context Variables
  "variables": [                           // Required context variables
    "business_name",
    "website",
    "desktop_score",
    "mobile_score"
  ],
  
  // Optional Metadata
  "version": "1.0",
  "name": "My Custom Strategy",
  "description": "A direct, action-oriented email style"
}
```

### Available Context Variables

The personalization context includes **103 variables** from Analysis Engine v2.0:

**Business Info:**
- `business_name`, `website`, `domain`, `contact_email`, `phone`

**Scores & Grades:**
- `desktop_score`, `mobile_score`, `accessibility_score`, `seo_score`
- `desktop_grade`, `mobile_grade`, `accessibility_grade`, `seo_grade`

**Critical Issues:**
- `desktop_critical`, `mobile_critical`, `critical_issues`
- `desktop_critical_issues` (array), `mobile_critical_issues` (array)

**Design Issues:**
- `contrast_issues`, `font_issues`, `layout_issues`
- `desktop_design_issues`, `mobile_design_issues`

**Performance:**
- `slow_resources`, `large_files`, `optimization_needed`

**Content:**
- `missing_alt_tags`, `poor_headings`, `broken_links`

**Technical:**
- `schema_present`, `meta_description`, `title_tag`

**Business Context:**
- `priority_tier`, `budget_likelihood`, `industry_category`
- `engagement_signals`, `competitive_positioning`

**AI Analysis:**
- `business_context`, `pain_points`, `value_propositions`

See `outreach-engine/shared/personalization-builder.js` for the full list.

---

## Usage Examples

### Example 1: Quick Model Override

```javascript
// Use Sonnet instead of Haiku for better quality
const response = await fetch('http://localhost:3002/api/compose', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com',
    model: 'claude-sonnet-3-5'
  })
});
```

### Example 2: Adjust Temperature

```javascript
// Lower temperature for more consistent, focused output
const response = await fetch('http://localhost:3002/api/compose', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com',
    temperature: 0.3  // More focused (default: 0.7)
  })
});
```

### Example 3: Custom Prompt (Direct Style)

```javascript
const customPrompt = {
  model: 'claude-sonnet-3-5',
  temperature: 0.5,
  systemPrompt: `You are a direct, no-nonsense business development expert.
Write concise, action-oriented emails that get to the point immediately.
Focus on specific, measurable improvements.`,
  
  userPromptTemplate: `Generate a business email for:

Company: {{business_name}}
Website: {{website}}
Desktop Score: {{desktop_score}}/100
Mobile Score: {{mobile_score}}/100
Critical Issues: {{critical_issues}}

Rules:
- Keep under 100 words
- Start with the biggest problem
- End with specific action items
- No fluff or niceties`,
  
  variables: ['business_name', 'website', 'desktop_score', 'mobile_score', 'critical_issues']
};

const response = await fetch('http://localhost:3002/api/compose', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com',
    customPrompt: customPrompt
  })
});
```

### Example 4: Batch with Custom Settings

```javascript
// Generate 20 emails with Sonnet model and lower temperature
const response = await fetch('http://localhost:3002/api/compose-batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    limit: 20,
    priorityTier: 'hot',
    model: 'claude-sonnet-3-5',
    temperature: 0.4
  })
});
```

### Example 5: Social DM with Custom Prompt

```javascript
const socialPrompt = {
  model: 'claude-haiku-4-5',
  temperature: 0.9,  // Higher for more creative social content
  platforms: ['instagram'],
  
  systemPrompt: 'You are a social media expert. Write friendly, authentic DMs.',
  
  userPromptTemplate: `Generate an Instagram DM for:

Business: {{business_name}}
Website: {{website}}
Desktop Score: {{desktop_score}}

Keep it under 200 characters. Be casual and friendly.`,
  
  variables: ['business_name', 'website', 'desktop_score'],
  
  platformSpecs: {
    instagram: {
      maxLength: 1000,
      tone: 'casual',
      style: 'conversational'
    }
  }
};

const response = await fetch('http://localhost:3002/api/compose-social', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com',
    platform: 'instagram',
    customPrompt: socialPrompt
  })
});
```

---

## Model Comparison

| Model | Speed | Cost | Quality | Best For |
|-------|-------|------|---------|----------|
| **claude-haiku-4-5** | ⚡⚡⚡ Fast | 💰 Low | ⭐⭐⭐ Good | Batch operations, quick drafts |
| **claude-sonnet-3-5** | ⚡⚡ Medium | 💰💰 Medium | ⭐⭐⭐⭐ Excellent | High-value leads, important emails |
| **claude-opus-3** | ⚡ Slow | 💰💰💰 High | ⭐⭐⭐⭐⭐ Outstanding | VIP clients, critical communications |

**Recommendation:**
- Use **Haiku** for bulk operations (batch composing, testing)
- Use **Sonnet** for hot leads and important prospects
- Use **Opus** only for your highest-priority opportunities

---

## Temperature Guidelines

| Temperature | Behavior | Best For |
|-------------|----------|----------|
| **0.0 - 0.3** | Very focused, deterministic | Technical content, formal emails |
| **0.4 - 0.6** | Balanced, professional | Business emails (default range) |
| **0.7 - 0.9** | Creative, varied | Social DMs, casual outreach |
| **0.9 - 1.0** | Very creative, diverse | Brainstorming, A/B variants |

**Default temperatures:**
- Email composition: `0.7`
- Social DMs: `0.8`
- Subject line variants: `0.9`

---

## Testing

Run the custom prompt test suite:

```bash
cd outreach-engine
node test-custom-prompts.js
```

This will test:
- Default prompt behavior
- Model overrides
- Temperature overrides
- Full custom prompts
- Priority system validation

---

## Migration Guide

If you have existing code calling the Outreach Engine API, no changes are required. The new parameters are optional and backward compatible.

**Before (still works):**
```javascript
await fetch('/api/compose', {
  method: 'POST',
  body: JSON.stringify({ url: 'https://example.com' })
});
```

**After (with new features):**
```javascript
await fetch('/api/compose', {
  method: 'POST',
  body: JSON.stringify({
    url: 'https://example.com',
    model: 'claude-sonnet-3-5',
    temperature: 0.5
  })
});
```

---

## Best Practices

1. **Start with defaults** - Test the default prompts before creating custom ones
2. **Use Haiku for testing** - Save costs during development
3. **Validate outputs** - Check validation scores before sending
4. **A/B test strategies** - Compare default vs custom prompts
5. **Monitor costs** - Track API costs when using Sonnet/Opus models
6. **Keep prompts simple** - Complex prompts don't always produce better results
7. **Use context variables** - Leverage all 103 available variables for personalization

---

## Troubleshooting

### Custom prompt not being used

**Check priority system:**
- If you pass both `model` and `customPrompt.model`, the `model` parameter wins
- Make sure you're not accidentally overriding your custom prompt

### Variables not populating

**Verify variable names:**
- Use exact names from personalization-builder.js
- Field aliases: `business_name` (not `company_name`), `website` (not `url`)

### Model not found error

**Supported models:**
- `claude-haiku-4-5`
- `claude-sonnet-3-5`
- `claude-opus-3`

Make sure you're using the exact model name.

### Temperature out of range

**Valid range:** 0.0 - 1.0
- Values outside this range will cause an error
- Default is 0.7 for emails, 0.8 for social

---

## Related Documentation

- [Outreach Engine API Reference](./API.md)
- [Personalization Variables](./docs/PERSONALIZATION-VARIABLES.md)
- [Email Strategies](./config/prompts/email-strategies/)
- [Social Strategies](./config/prompts/social-strategies/)
- [Prospecting Engine customPrompts](../prospecting-engine/README.md)

---

## Support

For questions or issues with custom prompts:
1. Check this documentation
2. Review test-custom-prompts.js for examples
3. Check validation scores to debug prompt effectiveness
4. Review personalization-builder.js for available variables

**Last Updated:** December 2024  
**Version:** 2.1.0
