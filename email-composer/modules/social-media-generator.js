/**
 * MAKSANT SOCIAL MEDIA OUTREACH GENERATOR
 *
 * Generates personalized outreach DMs for LinkedIn, Facebook Messenger, and Instagram.
 * Uses Claude Haiku 3.5 or GPT-4o-mini to keep costs low (95% cheaper than Sonnet).
 *
 * Outreach Strategies:
 * - LinkedIn: Professional InMails/connection messages
 * - Facebook: Friendly Messenger outreach
 * - Instagram: Casual, authentic DMs
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Platform-specific constraints for outreach DMs
const PLATFORM_SPECS = {
  linkedin: {
    max_length: 300, // First message limit if not connected
    connected_max_length: 8000, // If already connected
    optimal_length: 200, // Keep it short and scannable
    tone: 'professional but personable',
    emoji_usage: 'minimal',
    best_practices: [
      'Reference their profile or recent activity',
      'Be specific about value proposition',
      'Keep it conversational, not salesy',
      'End with clear but low-pressure CTA',
    ],
  },
  facebook: {
    max_length: 20000, // Messenger limit
    optimal_length: 150, // Short messages get better response
    tone: 'friendly, conversational',
    emoji_usage: 'light',
    best_practices: [
      'Start with a friendly greeting',
      'Find common ground quickly',
      'Keep it casual and brief',
      'Ask a question to encourage response',
    ],
  },
  instagram: {
    max_length: 1000, // DM character limit
    optimal_length: 100, // Very short = better response rate
    tone: 'casual, authentic',
    emoji_usage: 'moderate',
    best_practices: [
      'Comment on their recent post/story',
      'Be genuine and specific',
      'Keep it super brief',
      'Low-pressure approach',
    ],
  },
};

// Outreach message types/strategies
const OUTREACH_STRATEGIES = {
  VALUE_FIRST: 'value-first', // Lead with specific value/insight
  COMMON_GROUND: 'common-ground', // Connect over shared interest/connection
  COMPLIMENT_QUESTION: 'compliment-question', // Compliment + question
  QUICK_WIN: 'quick-win', // Offer a quick actionable tip
};

/**
 * Build outreach message prompt with ALL available rich data
 */
function buildOutreachPrompt(lead, platform, strategy, platformSpec) {
  const {
    company_name,
    industry,
    analysis_summary,
    contact_name,
    url,
    critiques_basic = [],
    critiques_industry = [],
    critiques_seo = [],
    website_grade,
    website_score,

    // RICH DATA from social media scraping
    company_description,
    services = [],
    has_active_blog,
    recent_blog_posts = {},
    tech_stack = {},
    achievements = {},
    testimonials = [],
    team_info = {},
    community_involvement = {},
  } = lead;

  const strategyInstructions = {
    'value-first': `Start by offering a specific, actionable insight about their ${industry} business or website. Make it valuable and non-salesy.`,
    'common-ground': `Find something you genuinely have in common (industry, goals, challenges) and connect on that. Be authentic.`,
    'compliment-question': `Give a genuine, specific compliment about their work/company, then ask a thoughtful question that shows you understand their business.`,
    'quick-win': `Offer a single, specific, actionable tip they could implement today to improve their ${industry} business. Keep it super practical.`,
  };

  // Extract weaknesses from critique arrays
  const weaknesses = [
    ...critiques_basic.slice(0, 2),
    ...critiques_industry.slice(0, 1),
  ].filter(Boolean);

  // Build rich context sections
  let richContext = '';

  // Company description
  if (company_description && company_description.length > 20) {
    richContext += `\n- What they do: ${company_description.substring(0, 150)}`;
  }

  // Services
  if (services && services.length > 0) {
    richContext += `\n- Their services: ${services.slice(0, 3).join(', ')}`;
  }

  // Recent blog/content
  if (has_active_blog && recent_blog_posts?.posts?.length > 0) {
    const recentPost = recent_blog_posts.posts[0];
    const postTitle = recentPost.title || recentPost.heading || 'recent post';
    richContext += `\n- Recent content: "${postTitle}"`;
  }

  // Founder/team
  if (team_info?.founder?.name) {
    richContext += `\n- Founder: ${team_info.founder.name}${team_info.founder.title ? ` (${team_info.founder.title})` : ''}`;
  } else if (team_info?.keyPeople?.length > 0) {
    const person = team_info.keyPeople[0];
    richContext += `\n- Team: ${person.name}${person.title ? ` (${person.title})` : ''}`;
  }

  // Achievements
  const achievementsList = [];
  if (achievements?.awards?.length > 0) achievementsList.push(...achievements.awards.slice(0, 1));
  if (achievements?.certifications?.length > 0) achievementsList.push(...achievements.certifications.slice(0, 1));
  if (achievements?.notableAccomplishments?.length > 0) achievementsList.push(...achievements.notableAccomplishments.slice(0, 1));
  if (achievementsList.length > 0) {
    richContext += `\n- Achievements: ${achievementsList.join(', ')}`;
  }

  // Testimonials (handle both string and object formats)
  if (testimonials && testimonials.length > 0) {
    const testimonial = testimonials[0];
    const testimonialText = typeof testimonial === 'string'
      ? testimonial
      : (testimonial.text || testimonial.quote || testimonial.content || testimonial.review || JSON.stringify(testimonial));

    if (testimonialText && testimonialText.length > 10) {
      richContext += `\n- Customer testimonial: "${testimonialText.substring(0, 100)}..."`;
    }
  }

  // Tech stack (just platform/framework, not exhaustive)
  if (tech_stack?.platform && tech_stack.platform !== 'Unknown') {
    richContext += `\n- Tech: ${tech_stack.platform}`;
  }

  return `You are writing a ${platform} outreach message to ${contact_name || 'a decision maker'} at ${company_name}.

PLATFORM: ${platform} (${platformSpec.tone})
STRATEGY: ${strategy}
${strategyInstructions[strategy]}

ABOUT THEM:
- Company: ${company_name}
- Industry: ${industry}
- Website: ${url}
- Website Grade: ${website_grade} (Score: ${website_score}/100)
${analysis_summary ? `- Overview: ${analysis_summary.substring(0, 150)}` : ''}
${weaknesses.length > 0 ? `- Issues to mention: ${weaknesses.slice(0, 2).join('; ')}` : ''}${richContext}

REQUIREMENTS:
- Maximum ${platformSpec.optimal_length} characters (strict limit: ${platform === 'linkedin' ? 300 : platformSpec.max_length})
- Tone: ${platformSpec.tone}
- ${platformSpec.emoji_usage} emoji usage
- ${platformSpec.best_practices.join('\n- ')}
- DO NOT use salesy language or pushy CTAs
- DO make it personal and specific to ${company_name}
- DO sound like a human, not a marketer
- Reference something specific about their business/website

Write the complete ${platform} message now. Just the message text, no subject line or explanation.`;
}

/**
 * Generate outreach message with Haiku 3.5 (cheap!)
 */
async function generateWithHaiku(prompt, platform) {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 500,
    temperature: 0.9, // Higher temperature for more natural/human-like messages
    messages: [{ role: 'user', content: prompt }],
  });

  const message = response.content[0].text.trim();
  const usage = response.usage;

  // Calculate cost
  const inputCost = (usage.input_tokens / 1_000_000) * 0.25;
  const outputCost = (usage.output_tokens / 1_000_000) * 1.25;
  const totalCost = inputCost + outputCost;

  console.log(`   ✅ Generated ${platform} outreach (${message.length} chars)`);
  console.log(`   💰 Cost: $${totalCost.toFixed(4)} (${usage.input_tokens} in + ${usage.output_tokens} out)`);

  return {
    message,
    character_count: message.length,
    model_used: 'claude-haiku-3.5',
    cost: totalCost,
    usage,
  };
}

/**
 * Generate outreach message with GPT-4o-mini (even cheaper!)
 */
async function generateWithGPT4oMini(prompt, platform) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 500,
    temperature: 0.9,
    messages: [
      { role: 'system', content: 'You are an expert at writing personalized, non-salesy outreach messages for social media.' },
      { role: 'user', content: prompt },
    ],
  });

  const message = response.choices[0].message.content.trim();
  const usage = response.usage;

  // Calculate cost
  const inputCost = (usage.prompt_tokens / 1_000_000) * 0.15;
  const outputCost = (usage.completion_tokens / 1_000_000) * 0.60;
  const totalCost = inputCost + outputCost;

  console.log(`   ✅ Generated ${platform} outreach (${message.length} chars)`);
  console.log(`   💰 Cost: $${totalCost.toFixed(4)} (${usage.prompt_tokens} in + ${usage.completion_tokens} out)`);

  return {
    message,
    character_count: message.length,
    model_used: 'gpt-4o-mini',
    cost: totalCost,
    usage,
  };
}

/**
 * Generate single outreach message
 *
 * @param {Object} params - Generation parameters
 * @param {Object} params.lead - Lead data from database
 * @param {string} params.platform - 'linkedin', 'facebook', or 'instagram'
 * @param {string} params.strategy - Outreach strategy (default: 'value-first')
 * @param {string} params.model - 'haiku' or 'gpt-4o-mini' (default: 'haiku')
 * @returns {Promise<Object>} Generated outreach message
 */
export async function generateOutreachMessage(params) {
  const {
    lead,
    platform = 'linkedin',
    strategy = OUTREACH_STRATEGIES.VALUE_FIRST,
    model = 'haiku',
  } = params;

  console.log(`\n📱 Generating ${platform} outreach for ${lead.company_name}...`);
  console.log(`   Strategy: ${strategy}`);
  console.log(`   Model: ${model === 'haiku' ? 'Claude Haiku 3.5' : 'GPT-4o-mini'} (cost-effective)`);

  const platformSpec = PLATFORM_SPECS[platform];
  if (!platformSpec) {
    throw new Error(`Invalid platform: ${platform}. Use 'linkedin', 'facebook', or 'instagram'.`);
  }

  const prompt = buildOutreachPrompt(lead, platform, strategy, platformSpec);

  let result;
  if (model === 'haiku') {
    result = await generateWithHaiku(prompt, platform);
  } else if (model === 'gpt-4o-mini') {
    result = await generateWithGPT4oMini(prompt, platform);
  } else {
    throw new Error(`Invalid model: ${model}. Use 'haiku' or 'gpt-4o-mini'.`);
  }

  return {
    platform,
    strategy,
    company_name: lead.company_name,
    ...result,
    platform_spec: platformSpec,
  };
}

/**
 * Generate multiple message variants for A/B testing
 *
 * @param {Object} params - Generation parameters
 * @param {Object} params.lead - Lead data
 * @param {string} params.platform - Platform
 * @param {number} params.variants - Number of variants (default: 3)
 * @param {string} params.model - AI model
 * @returns {Promise<Object>} Array of message variants
 */
export async function generateOutreachVariants(params) {
  const {
    lead,
    platform = 'linkedin',
    variants = 3,
    model = 'haiku',
  } = params;

  console.log(`\n📱 Generating ${variants} ${platform} outreach variants for ${lead.company_name}...`);

  const strategies = Object.values(OUTREACH_STRATEGIES);
  const results = [];
  let totalCost = 0;

  for (let i = 0; i < Math.min(variants, strategies.length); i++) {
    const strategy = strategies[i];

    const result = await generateOutreachMessage({
      lead,
      platform,
      strategy,
      model,
    });

    results.push(result);
    totalCost += result.cost;
  }

  console.log(`\n💰 Total cost for ${variants} variants: $${totalCost.toFixed(4)}`);

  return {
    platform,
    company_name: lead.company_name,
    variants: results,
    total_cost: totalCost,
  };
}

/**
 * Validate outreach message quality
 */
export function validateOutreachMessage(messageData) {
  const { message, platform, platform_spec } = messageData;

  const issues = [];
  let score = 100;

  // Check length
  if (message.length > platform_spec.max_length) {
    issues.push(`Message too long (${message.length} chars, max: ${platform_spec.max_length})`);
    score -= 30;
  }

  // Check for salesy language
  const salesyWords = ['buy', 'purchase', 'discount', 'offer', 'deal', 'limited time', 'act now'];
  const foundSalesyWords = salesyWords.filter(word => message.toLowerCase().includes(word));
  if (foundSalesyWords.length > 0) {
    issues.push(`Salesy language detected: ${foundSalesyWords.join(', ')}`);
    score -= 20;
  }

  // Check for personalization
  if (!message.includes(messageData.company_name)) {
    issues.push('Message not personalized (company name not mentioned)');
    score -= 15;
  }

  // Check for CTA spam
  const ctaWords = ['book a call', 'schedule', 'sign up', 'register', 'click here'];
  const foundCTAs = ctaWords.filter(phrase => message.toLowerCase().includes(phrase));
  if (foundCTAs.length > 1) {
    issues.push('Too many CTAs detected');
    score -= 10;
  }

  return {
    valid: score >= 70,
    score,
    issues,
  };
}

// Export strategies for external use
export { OUTREACH_STRATEGIES, PLATFORM_SPECS };

// Legacy exports for backwards compatibility
export const generateSocialPost = generateOutreachMessage;
export const generateSocialVariants = generateOutreachVariants;
export const validateSocialPost = validateOutreachMessage;
