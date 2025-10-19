/**
 * MAKSANT EMAIL COMPOSER - Reasoning Generator Module
 *
 * Generates technical reasoning and verification checklists for human review.
 * This helps Anton understand WHY the AI wrote what it wrote and HOW to verify it.
 */

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Generate technical reasoning for why we wrote the email
 * @param {Object} lead - Lead data from Supabase
 * @param {Object} email - Generated email (subject + body)
 * @param {Object} context - Personalization context used
 * @returns {Promise<Object>} Technical reasoning breakdown
 */
export async function generateTechnicalReasoning(lead, email, context) {
  console.log('  œ Generating technical reasoning...');

  const prompt = `You are explaining to a human reviewer (Anton) why you wrote this cold outreach email.

THE EMAIL YOU WROTE:
Subject: ${email.subject}

${email.body}

LEAD DATA YOU HAD:
- Company: ${lead.company_name}
- Industry: ${lead.industry}
- URL: ${lead.url}
- Contact: ${lead.contact_name} (${lead.contact_title || 'Unknown title'})
- Location: ${lead.location}
- Website Score: ${lead.website_score}/100 (Grade: ${lead.website_grade})
- Lead Grade: ${lead.lead_grade}

CRITIQUES YOU HAD ACCESS TO:
${JSON.stringify({
  basic: lead.critiques_basic || [],
  industry: lead.critiques_industry || [],
  seo: lead.critiques_seo || [],
  visual: lead.critiques_visual || [],
  competitor: lead.critiques_competitor || []
}, null, 2)}

YOUR TASK:
Generate a technical breakdown explaining:
1. What specific issues you identified
2. Why each issue matters (with data/stats if possible)
3. What you wrote in the email (non-technical version)
4. Why you chose to mention this particular issue

Return ONLY valid JSON in this format:
\`\`\`json
{
  "issues": [
    {
      "technical": "The H1 element contains generic text",
      "source": "critiques_basic[0]",
      "why_it_matters": "Comparison shoppers evaluate 3-4 platforms. Without clear differentiation in the H1, they continue to competitors. Studies show 68% of SaaS buyers compare 3+ options.",
      "what_i_wrote": "the main headline doesn't tell visitors why they should choose Squarespace",
      "translation": "H1 element ’ main headline",
      "impact": "Could increase bounce rate by 15-20% for comparison traffic"
    }
  ],
  "business_summary": "2-3 sentence summary of why you wrote this email and what you're trying to help them with"
}
\`\`\`

Be specific. Include stats/data when possible. Help Anton understand your reasoning.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      temperature: 0.3, // Lower temp for factual reasoning
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const result = response.content[0].text;

    // Parse JSON response
    const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/) ||
                      result.match(/```\n([\s\S]*?)\n```/) ||
                      result.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    }

    throw new Error('Could not parse JSON from reasoning response');

  } catch (error) {
    console.error('    Error generating technical reasoning:', error.message);

    // Return fallback
    return {
      issues: [{
        technical: 'Unable to generate technical reasoning',
        source: 'N/A',
        why_it_matters: 'Error occurred',
        what_i_wrote: 'See email body',
        translation: 'N/A',
        impact: 'Unknown'
      }],
      business_summary: 'Technical reasoning generation failed. Please review email manually.'
    };
  }
}

/**
 * Generate verification checklist for Anton to verify manually
 * @param {Object} lead - Lead data
 * @param {Object} reasoning - Technical reasoning
 * @returns {Object} Verification checklist
 */
export function generateVerificationChecklist(lead, reasoning) {
  console.log('  œ Generating verification checklist...');

  const checklist = {
    url: lead.url,
    steps: [],
    comparison_urls: [],
  };

  // Add verification steps based on issues mentioned
  reasoning.issues.forEach((issue, index) => {
    // Generic first step
    if (index === 0) {
      checklist.steps.push({
        step: `Go to ${lead.url}`,
        what_to_look_for: 'Overall homepage layout',
        expected: 'Page loads and displays correctly',
      });
    }

    // Specific verification for this issue
    if (issue.technical.toLowerCase().includes('h1') || issue.technical.toLowerCase().includes('headline')) {
      checklist.steps.push({
        step: 'Look at the main headline at the top of the page',
        what_to_look_for: 'The big headline/title text',
        expected: `Should say something generic or unclear (per the email critique)`,
        technical_detail: issue.technical,
      });
    }

    if (issue.technical.toLowerCase().includes('pricing') || issue.technical.toLowerCase().includes('price')) {
      checklist.steps.push({
        step: 'Scroll through the homepage',
        what_to_look_for: 'Any mention of pricing or "See plans" link',
        expected: 'Pricing should be hard to find or not visible',
        technical_detail: issue.technical,
      });
    }

    if (issue.technical.toLowerCase().includes('mobile') || issue.technical.toLowerCase().includes('responsive')) {
      checklist.steps.push({
        step: 'Resize browser to mobile width (or open on phone)',
        what_to_look_for: 'Mobile layout and functionality',
        expected: 'Should have issues mentioned in email',
        technical_detail: issue.technical,
      });
    }

    if (issue.technical.toLowerCase().includes('load') || issue.technical.toLowerCase().includes('speed')) {
      checklist.steps.push({
        step: 'Reload the page and observe load time',
        what_to_look_for: 'How long it takes for page to fully load',
        expected: 'Should feel slow (3+ seconds)',
        technical_detail: issue.technical,
      });
    }
  });

  // Add competitor comparison if industry is competitive
  if (lead.industry && (
    lead.industry.toLowerCase().includes('website builder') ||
    lead.industry.toLowerCase().includes('saas') ||
    lead.industry.toLowerCase().includes('e-commerce')
  )) {
    checklist.comparison_urls = getCompetitorUrls(lead.industry);
  }

  // Add final verification step
  checklist.steps.push({
    step: 'Compare with your email',
    what_to_look_for: 'Does the email accurately describe what you see?',
    expected: 'Email should match reality',
  });

  return checklist;
}

/**
 * Get competitor URLs for comparison
 */
function getCompetitorUrls(industry) {
  const competitors = {
    'website builder': [
      { name: 'Wix', url: 'https://www.wix.com' },
      { name: 'Webflow', url: 'https://webflow.com' },
      { name: 'WordPress', url: 'https://wordpress.com' },
    ],
    'saas': [
      { name: 'HubSpot', url: 'https://www.hubspot.com' },
      { name: 'Salesforce', url: 'https://www.salesforce.com' },
    ],
    'e-commerce': [
      { name: 'Shopify', url: 'https://www.shopify.com' },
      { name: 'BigCommerce', url: 'https://www.bigcommerce.com' },
    ],
  };

  for (const [key, urls] of Object.entries(competitors)) {
    if (industry.toLowerCase().includes(key)) {
      return urls;
    }
  }

  return [];
}

/**
 * Generate complete reasoning package (technical + checklist)
 * @param {Object} lead - Lead data
 * @param {Object} email - Generated email
 * @param {Object} context - Personalization context
 * @returns {Promise<Object>} Complete reasoning package
 */
export async function generateCompleteReasoning(lead, email, context) {
  console.log('>à Generating reasoning package...');

  const technical = await generateTechnicalReasoning(lead, email, context);
  const checklist = generateVerificationChecklist(lead, technical);

  console.log('   Reasoning package complete');

  return {
    technical_reasoning: technical.issues,
    business_summary: technical.business_summary,
    verification_checklist: checklist,
  };
}
