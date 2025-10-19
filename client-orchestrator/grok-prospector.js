import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const analyzerEnv = path.resolve(__dirname, '../website-audit-tool/.env');
if (fs.existsSync(analyzerEnv)) dotenv.config({ path: analyzerEnv, override: false });

/**
 * Use Grok AI with web search to find REAL companies
 * This is better than GPT because it searches the live web
 */
export async function findCompaniesWithGrok({ brief, count = 20, city, logger = console }) {
  if (logger.info) {
    logger.info('Starting Grok web search for real companies', { count, city: city || 'none' });
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY not set. Add it to website-audit-tool/.env');
  }

  const studio = brief?.studio || {};
  const icp = brief?.icp || {};

  const niches = (icp.niches || []).join(', ');
  const triggers = (icp.triggers || []).join(', ');
  const location = city || icp.geo?.city || '';

  const prompt = `You are a business prospecting assistant with web search capabilities.

**Task:** Find ${count} REAL, VERIFIED companies that match this ICP:

**Target Industries:** ${niches}
**Buying Triggers:** ${triggers}
**Location:** ${location || 'United States'}

**What I'm offering:**
${studio.intro || 'Web design and development services'}

**CRITICAL VERIFICATION REQUIREMENTS:**
Before including ANY company in your results, you MUST:
1. Use web search to VERIFY the company currently exists and is operating
2. VERIFY the website domain is currently active and accessible (not parked, not "coming soon", not expired)
3. VERIFY the URL loads to an actual business website with real content
4. DO NOT include companies if you cannot find and verify their website through web search
5. DO NOT include domains that redirect to GoDaddy, Namecheap, or other parking pages
6. DO NOT hallucinate or guess company names - only include companies you find via web search
7. VERIFY each URL is reachable before including it

**For each VERIFIED company, provide:**
1. Company name (must be real and verified to exist via web search)
2. Website URL (must be currently active and accessible - test it!)
3. Industry/niche
4. Why now (specific trigger - outdated site, slow loading, missing mobile, etc.)
5. Teaser (one-sentence opener)
6. Social media profiles (use web search to find their real profiles):
   - Instagram profile URL
   - Facebook page URL
   - LinkedIn company page URL
   - LinkedIn decision maker profile URL (owner, CEO, marketing director)

**ADDITIONAL REQUIREMENTS:**
- ONLY include companies with working, accessible websites that you verify via web search
- Prioritize companies that show signs of triggers (outdated sites, poor mobile, etc.)
- Focus on SMBs (small-medium businesses) not enterprises
- Use web search to find their actual social media profiles
- If a social profile cannot be found, use null for that field
- Better to return FEWER verified companies than to include unverified ones

Return ONLY valid JSON in this exact format:
{
  "companies": [
    {
      "name": "Company Name",
      "website": "https://example.com",
      "industry": "Restaurant",
      "why_now": "Their website is not mobile-friendly",
      "teaser": "I noticed your site doesn't work well on mobile",
      "social_profiles": {
        "instagram": "https://instagram.com/company",
        "facebook": "https://facebook.com/company",
        "linkedin_company": "https://linkedin.com/company/company-name",
        "linkedin_person": "https://linkedin.com/in/person-name"
      }
    }
  ]
}`;

  console.log('🔍 Using Grok with web search to find real companies...');

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'grok-4-fast',
      messages: [
        {
          role: 'system',
          content: 'You are a business prospecting assistant with web search capabilities. Your primary task is to find REAL, VERIFIED companies with WORKING websites. You MUST use web search to verify each company and website exists and is accessible before including it. DO NOT hallucinate or guess company names. Only include companies you can verify through web search. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      stream: false
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Grok API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';

  try {
    const result = JSON.parse(content);
    const companiesFound = result.companies?.length || 0;

    if (logger.info) {
      logger.info(`Grok found ${companiesFound} companies`, {
        companies: result.companies?.map(c => c.name) || []
      });
    } else {
      console.log(`✅ Found ${companiesFound} real companies via Grok`);
    }

    // Log social profiles found
    result.companies?.forEach(company => {
      const socials = company.social_profiles || {};
      const foundProfiles = [];
      if (socials.instagram) foundProfiles.push(`Instagram: ${socials.instagram}`);
      if (socials.facebook) foundProfiles.push(`Facebook: ${socials.facebook}`);
      if (socials.linkedin_company) foundProfiles.push(`LinkedIn Company: ${socials.linkedin_company}`);
      if (socials.linkedin_person) foundProfiles.push(`LinkedIn Person: ${socials.linkedin_person}`);

      if (foundProfiles.length > 0) {
        console.log(`📱 ${company.name}: ${foundProfiles.join(', ')}`);
      }
    });

    return result;
  } catch (e) {
    if (logger.error) {
      logger.error('Failed to parse Grok response', { error: e.message, content });
    } else {
      console.error('Failed to parse Grok response:', content);
    }
    throw new Error('Grok did not return valid JSON');
  }
}
