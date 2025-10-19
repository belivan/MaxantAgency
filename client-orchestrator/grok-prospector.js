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
export async function findCompaniesWithGrok({ brief, count = 20, city }) {
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

**Task:** Find ${count} REAL companies that match this ICP:

**Target Industries:** ${niches}
**Buying Triggers:** ${triggers}
**Location:** ${location || 'United States'}

**What I'm offering:**
${studio.intro || 'Web design and development services'}

**For each company, provide:**
1. Company name (real, verified to exist)
2. Website URL (actual working URL)
3. Industry/niche
4. Why now (specific trigger - outdated site, slow loading, missing mobile, etc.)
5. Teaser (one-sentence opener)

**IMPORTANT:**
- Use web search to find REAL companies with websites
- Prioritize companies that show signs of triggers (outdated sites, poor mobile, etc.)
- Only include companies you can verify exist via web search
- Focus on SMBs (small-medium businesses) not enterprises

Return ONLY valid JSON in this exact format:
{
  "companies": [
    {
      "name": "Company Name",
      "website": "https://example.com",
      "industry": "Restaurant",
      "why_now": "Their website is not mobile-friendly",
      "teaser": "I noticed your site doesn't work well on mobile"
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
      model: 'grok-beta',
      messages: [
        {
          role: 'system',
          content: 'You are a business prospecting assistant. Use web search to find real companies. Always respond with valid JSON.'
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
    console.log(`✅ Found ${result.companies?.length || 0} real companies via Grok`);
    return result;
  } catch (e) {
    console.error('Failed to parse Grok response:', content);
    throw new Error('Grok did not return valid JSON');
  }
}
