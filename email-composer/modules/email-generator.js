/**
 * MAKSANT EMAIL COMPOSER - Email Generator Module
 *
 * AI-first email composition using 2025 best practices.
 * Generates personalized cold outreach emails from lead data.
 *
 * Key Principles (Research-Based):
 * - 2-5 sentences, max 200 words (~1000 chars)
 * - Subject lines 50-70 characters
 * - Personalized with specific website findings
 * - Conversational tone (not salesy)
 * - Business impact over technical jargon
 * - Lead with value/compliment
 * - Industry-specific approaches
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Email generation strategies
const STRATEGIES = {
  PROBLEM_FIRST: 'problem-first',
  ACHIEVEMENT_FOCUSED: 'achievement-focused',
  QUESTION_BASED: 'question-based',
  COMPLIMENT_SANDWICH: 'compliment-sandwich',
};

/**
 * Generate a personalized email for a lead using AI
 * @param {Object} lead - Lead data from Supabase
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generated email(s)
 */
export async function generateEmail(lead, options = {}) {
  const {
    strategy = STRATEGIES.COMPLIMENT_SANDWICH,
    generateVariants = process.env.GENERATE_VARIANTS === 'true',
    subjectVariants = parseInt(process.env.SUBJECT_VARIANTS) || 3,
    bodyVariants = parseInt(process.env.BODY_VARIANTS) || 2,
    model = process.env.DEFAULT_EMAIL_MODEL || 'claude-sonnet-4-5',
  } = options;

  console.log(`=� Generating email for ${lead.url} using ${strategy} strategy...`);

  // Build personalization context from lead data
  const context = buildPersonalizationContext(lead);

  // Generate the email(s)
  if (generateVariants) {
    return await generateEmailVariants(lead, context, strategy, subjectVariants, bodyVariants, model);
  } else {
    return await generateSingleEmail(lead, context, strategy, model);
  }
}

/**
 * Build rich personalization context from lead data
 * @param {Object} lead - Lead data from Supabase
 * @returns {Object} Personalization context
 */
function buildPersonalizationContext(lead) {
  const context = {
    // Basic info
    domain: new URL(lead.url).hostname.replace('www.', ''),
    companyName: lead.company_name,
    industry: lead.industry,
    location: lead.location,

    // Contact info
    contactName: lead.contact_name,
    contactTitle: lead.contact_title,
    firstName: lead.contact_name ? lead.contact_name.split(' ')[0] : null,

    // Website quality
    websiteScore: lead.website_score,
    websiteGrade: lead.website_grade,
    leadGrade: lead.lead_grade,
    loadTime: lead.load_time,

    // Analysis findings
    basicCritiques: lead.critiques_basic || [],
    industryCritiques: lead.critiques_industry || [],
    seoCritiques: lead.critiques_seo || [],
    visualCritiques: lead.critiques_visual || [],
    competitorCritiques: lead.critiques_competitor || [],

    // Detailed data (if available)
    seoData: lead.seo_data,
    visualData: lead.visual_data,
    competitorData: lead.competitor_data,

    // Performance metrics
    pagesAnalyzed: lead.pages_analyzed || 1,

    // Rich metadata (for personalization hooks)
    companyDescription: lead.company_description,
    foundingYear: lead.founding_year,
  };

  // Extract personalization hooks
  context.personalizationHooks = extractPersonalizationHooks(lead, context);

  // Select top 3 most impactful critiques
  context.topCritiques = selectTopCritiques(context);

  return context;
}

/**
 * Extract personalization hooks from lead data
 * (Similar to what Grok extraction provides)
 */
function extractPersonalizationHooks(lead, context) {
  const hooks = [];

  // Location hook
  if (context.location) {
    hooks.push({
      type: 'location',
      value: context.location,
      hint: 'Add local context or reference local market',
    });
  }

  // Industry hook
  if (context.industry) {
    hooks.push({
      type: 'industry',
      value: context.industry,
      hint: `Industry-specific insight for ${context.industry}`,
    });
  }

  // Performance hook
  if (context.loadTime && context.loadTime > 3) {
    hooks.push({
      type: 'performance',
      value: `${context.loadTime}s load time`,
      hint: '53% of visitors abandon sites over 3 seconds',
    });
  }

  // Company age hook
  if (context.foundingYear) {
    const age = new Date().getFullYear() - context.foundingYear;
    if (age > 5) {
      hooks.push({
        type: 'company_age',
        value: `${age} years in business`,
        hint: 'Compliment their longevity',
      });
    }
  }

  // Website grade hook
  if (context.websiteGrade && ['D', 'F'].includes(context.websiteGrade)) {
    hooks.push({
      type: 'website_grade',
      value: `Grade ${context.websiteGrade} website`,
      hint: 'Significant improvement opportunity',
    });
  }

  return hooks;
}

/**
 * Select top 3 most impactful critiques from all categories
 */
function selectTopCritiques(context) {
  const allCritiques = [
    ...(context.basicCritiques || []),
    ...(context.industryCritiques || []),
    ...(context.seoCritiques || []),
    ...(context.visualCritiques || []),
    ...(context.competitorCritiques || []),
  ];

  // Prioritize critiques with business impact
  const prioritized = allCritiques
    .filter(c => c && c.length > 10) // Filter out empty/invalid
    .slice(0, 5); // Top 5

  return prioritized.slice(0, 3); // Top 3 for email
}

/**
 * Generate a single email (no variants)
 */
async function generateSingleEmail(lead, context, strategy, model) {
  const prompt = buildEmailPrompt(context, strategy, 1, 1);

  const response = await callAI(model, prompt);

  return parseEmailResponse(response);
}

/**
 * Generate multiple email variants for A/B testing
 */
async function generateEmailVariants(lead, context, strategy, subjectVariants, bodyVariants, model) {
  console.log(`=� Generating ${subjectVariants} subject variants and ${bodyVariants} body variants...`);

  const prompt = buildEmailPrompt(context, strategy, subjectVariants, bodyVariants);

  const response = await callAI(model, prompt);

  return parseEmailVariantsResponse(response, subjectVariants, bodyVariants);
}

/**
 * Build the email generation prompt based on strategy
 */
function buildEmailPrompt(context, strategy, subjectVariants = 1, bodyVariants = 1) {
  const senderName = process.env.SENDER_NAME;
  const senderCompany = process.env.SENDER_COMPANY || 'Maksant';
  const senderWebsite = process.env.SENDER_WEBSITE;
  const senderPhone = process.env.SENDER_PHONE;

  // Build personalization section
  let personalizationSection = '\n## PERSONALIZATION DATA (Use These!):\n\n';

  if (context.companyName) {
    personalizationSection += `<� COMPANY: ${context.companyName}\n`;
  }
  if (context.industry) {
    personalizationSection += `<� INDUSTRY: ${context.industry}\n`;
  }
  if (context.location) {
    personalizationSection += `=� LOCATION: ${context.location}\n`;
  }
  if (context.companyDescription) {
    personalizationSection += `=� DESCRIPTION: ${context.companyDescription}\n`;
  }
  if (context.foundingYear) {
    const age = new Date().getFullYear() - context.foundingYear;
    personalizationSection += `<� AGE: ${age} years in business (founded ${context.foundingYear})\n`;
  }

  personalizationSection += `\n=� PERSONALIZATION HOOKS:\n`;
  context.personalizationHooks.forEach(hook => {
    personalizationSection += `- ${hook.type.toUpperCase()}: ${hook.value} (${hook.hint})\n`;
  });

  // Build critiques section
  let critiquesSection = '\n## WEBSITE ISSUES FOUND:\n\n';

  if (context.topCritiques.length > 0) {
    context.topCritiques.forEach((critique, i) => {
      critiquesSection += `${i + 1}. ${critique}\n`;
    });
  } else {
    critiquesSection += 'No major issues found, but there are opportunities for improvement.\n';
  }

  // Add performance data
  if (context.loadTime) {
    critiquesSection += `\n� LOAD TIME: ${context.loadTime} seconds`;
    if (context.loadTime > 3) {
      critiquesSection += ' (SLOW - 53% of visitors abandon sites over 3 seconds)';
    }
    critiquesSection += '\n';
  }

  // Strategy-specific instructions
  let strategyInstructions = '';

  switch (strategy) {
    case STRATEGIES.PROBLEM_FIRST:
      strategyInstructions = `
## EMAIL STRATEGY: Problem-First

Structure:
1. Opening: Identify the specific problem (1 sentence)
2. Impact: Explain business consequence (1 sentence)
3. Solution: Offer help (1 sentence)
4. CTA: Simple ask for a call

Tone: Direct, helpful consultant
`;
      break;

    case STRATEGIES.ACHIEVEMENT_FOCUSED:
      strategyInstructions = `
## EMAIL STRATEGY: Achievement-Focused

Structure:
1. Opening: Genuine compliment about their business (1 sentence)
2. Opportunity: Point out improvement potential (1-2 sentences)
3. Offer: Suggest quick win (1 sentence)
4. CTA: Low-commitment ask

Tone: Encouraging, positive
`;
      break;

    case STRATEGIES.QUESTION_BASED:
      strategyInstructions = `
## EMAIL STRATEGY: Question-Based

Structure:
1. Opening: Genuine question about their site/business (1 sentence)
2. Insight: Share specific observation (1-2 sentences)
3. Value: Offer to share findings (1 sentence)
4. CTA: Ask permission to share

Tone: Curious, collaborative
`;
      break;

    case STRATEGIES.COMPLIMENT_SANDWICH:
    default:
      strategyInstructions = `
## EMAIL STRATEGY: Compliment Sandwich (RECOMMENDED)

Structure:
1. Opening: Genuine compliment using personalization data (1 sentence)
2. Middle: 1 problem + 2-3 specific fixes with business impact (2-3 sentences)
3. Closing: Positive encouragement (1 sentence)
4. CTA: Simple ask for 15-minute call

Tone: Friendly consultant, conversational
`;
      break;
  }

  // Variant instructions
  let variantInstructions = '';
  if (subjectVariants > 1 || bodyVariants > 1) {
    variantInstructions = `
## VARIANT GENERATION:

Generate ${subjectVariants} different subject line variants and ${bodyVariants} different body variants.

Subject line variants should vary in:
- Approach (question vs. statement vs. specific finding)
- Specificity (general vs. very specific)
- Urgency (neutral vs. opportunity-focused)

Body variants should vary in:
- Opening hook (compliment vs. question vs. observation)
- Critique selection (which issues to highlight)
- Tone (friendly vs. professional vs. casual)

Return in this JSON format:
\`\`\`json
{
  "subjects": ["subject 1", "subject 2", "subject 3"],
  "bodies": [
    "body variant 1",
    "body variant 2"
  ],
  "recommended": {
    "subject": 0,
    "body": 0
  },
  "reasoning": "Brief explanation of why recommended combo is best"
}
\`\`\`
`;
  } else {
    variantInstructions = `
## OUTPUT FORMAT:

Return in this JSON format:
\`\`\`json
{
  "subject": "the subject line",
  "body": "the email body"
}
\`\`\`
`;
  }

  // Build the full prompt
  return `You are an expert cold email copywriter specializing in personalized B2B outreach for web design/development services.

You are writing an email to ${context.firstName || 'the business owner'} at ${context.companyName || context.domain}.

${personalizationSection}

${critiquesSection}

${strategyInstructions}

## 2025 COLD EMAIL BEST PRACTICES (MANDATORY):

1. **Length**: 2-5 sentences maximum, under 200 words (~1000 characters)
2. **Subject Line**: 50-70 characters (sweet spot: 61-70 chars = 43% open rate)
3. **Personalization**: Use SPECIFIC findings from their website (not generic observations)
4. **Tone**: Conversational, helpful (NOT salesy or pushy)
5. **Language**: Business outcomes (NOT technical jargon)
   -  "Mobile visitors can't find your contact form"
   - L "Missing responsive CSS media queries"
6. **Opening**: Use personalization data (NOT "Hope this email finds you well")
7. **CTA**: Single, clear ask (15-minute call)

## REQUIREMENTS:

- Use ${context.firstName || 'Hi there'} as greeting
- Reference ${context.domain} naturally
- Include 1-3 specific website observations
- Focus on business impact, not technical details
- Be genuinely helpful, not salesy
- Keep total email under 1200 characters
- Subject line must be 50-70 characters
- End with: "${senderName}\\n${senderCompany}\\n${senderWebsite}${senderPhone ? '\\n' + senderPhone : ''}"

## AVOID:

- Generic templates
- All caps or excessive punctuation
- Spammy phrases ("guaranteed", "amazing opportunity", "limited time")
- Multiple CTAs
- Obvious placeholders
- Salesy language

## CRITICAL: NO TECHNICAL JARGON!

This is EXTREMELY important. Business owners don't think in developer terms.

FORBIDDEN WORDS/PHRASES:
❌ H1, H2, H3, heading tags
❌ CSS, HTML, JavaScript
❌ Meta tags, meta description, title tag
❌ Alt text, alt attributes
❌ Responsive design, mobile-first
❌ SEO keywords, schema markup
❌ TTFB, LCP, CLS, Core Web Vitals
❌ DOM, APIs, frameworks
❌ Above the fold, hero section (too technical)

INSTEAD USE BUSINESS LANGUAGE:
✅ "main headline" or "big headline at the top"
✅ "Google preview text" instead of "meta description"
✅ "page load speed" instead of "TTFB/LCP"
✅ "mobile visitors" instead of "responsive design"
✅ "image descriptions" instead of "alt text"
✅ "top of the page" instead of "above the fold"

ALWAYS FOCUS ON: What does this mean for their customers? Their revenue? Their conversions?

${variantInstructions}

Generate the email now.`;
}

/**
 * Call AI provider (Claude or OpenAI)
 */
async function callAI(model, prompt) {
  if (model.includes('claude')) {
    return await callClaude(model, prompt);
  } else if (model.includes('gpt')) {
    return await callOpenAI(model, prompt);
  } else {
    throw new Error(`Unsupported model: ${model}`);
  }
}

/**
 * Call Claude API
 */
async function callClaude(model, prompt) {
  const modelMap = {
    'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929',
    'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
  };

  const response = await anthropic.messages.create({
    model: modelMap[model] || model,
    max_tokens: 2000,
    temperature: 0.8, // Higher temperature for creative variation
    messages: [{
      role: 'user',
      content: prompt,
    }],
  });

  return response.content[0].text;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(model, prompt) {
  const response = await openai.chat.completions.create({
    model: model,
    messages: [{
      role: 'user',
      content: prompt,
    }],
    temperature: 0.8,
    max_tokens: 2000,
  });

  return response.choices[0].message.content;
}

/**
 * Parse single email response (extract JSON from AI response)
 */
function parseEmailResponse(response) {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) ||
                      response.match(/```\n([\s\S]*?)\n```/) ||
                      response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      return {
        subject: parsed.subject,
        body: parsed.body,
      };
    }

    throw new Error('Could not parse JSON from AI response');
  } catch (error) {
    console.error('L Error parsing email response:', error);
    console.error('Raw response:', response);
    throw error;
  }
}

/**
 * Parse variants response
 */
function parseEmailVariantsResponse(response, subjectVariants, bodyVariants) {
  try {
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) ||
                      response.match(/```\n([\s\S]*?)\n```/) ||
                      response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      return {
        subjects: parsed.subjects || [],
        bodies: parsed.bodies || [],
        recommended: parsed.recommended || { subject: 0, body: 0 },
        reasoning: parsed.reasoning || '',
      };
    }

    throw new Error('Could not parse JSON from AI response');
  } catch (error) {
    console.error('L Error parsing variants response:', error);
    console.error('Raw response:', response);
    throw error;
  }
}

/**
 * Validate email quality (QA check)
 */
export function validateEmail(email) {
  const issues = [];

  // Check subject line length
  if (email.subject.length < 50) {
    issues.push({
      severity: 'warning',
      issue: 'Subject line is shorter than 50 characters (optimal: 50-70)',
      value: email.subject.length,
    });
  }
  if (email.subject.length > 70) {
    issues.push({
      severity: 'warning',
      issue: 'Subject line is longer than 70 characters (optimal: 50-70)',
      value: email.subject.length,
    });
  }

  // Check body length
  if (email.body.length > 1200) {
    issues.push({
      severity: 'error',
      issue: 'Email body is too long (max: 1200 characters)',
      value: email.body.length,
    });
  }

  // Check for spammy phrases
  const spammyPhrases = [
    'guaranteed', 'amazing opportunity', 'limited time', 'act now',
    'free', 'urgent', 'exclusive', 'winner', 'congratulations',
  ];

  const emailText = (email.subject + ' ' + email.body).toLowerCase();
  spammyPhrases.forEach(phrase => {
    if (emailText.includes(phrase)) {
      issues.push({
        severity: 'warning',
        issue: `Contains potentially spammy phrase: "${phrase}"`,
      });
    }
  });

  // Check for generic placeholders
  const placeholders = ['{{', '}}', '[Name]', '[Company]', '[Your Name]'];
  placeholders.forEach(placeholder => {
    if (email.subject.includes(placeholder) || email.body.includes(placeholder)) {
      issues.push({
        severity: 'error',
        issue: `Contains unfilled placeholder: "${placeholder}"`,
      });
    }
  });

  return {
    isValid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    score: calculateEmailScore(email, issues),
  };
}

/**
 * Calculate email quality score (0-100)
 */
function calculateEmailScore(email, issues) {
  let score = 100;

  // Deduct points for issues
  issues.forEach(issue => {
    if (issue.severity === 'error') {
      score -= 20;
    } else if (issue.severity === 'warning') {
      score -= 5;
    }
  });

  // Bonus for optimal length
  if (email.subject.length >= 50 && email.subject.length <= 70) {
    score += 5;
  }
  if (email.body.length >= 400 && email.body.length <= 1000) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

export { STRATEGIES };
