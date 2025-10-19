/**
 * MAKSANT EMAIL COMPOSER - Website Verifier Module
 *
 * Quick re-verification of website data before composing emails.
 * Uses Playwright to check if the website is still live and verify key facts.
 */

import { chromium } from 'playwright';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

/**
 * Re-verify website data before composing email
 * @param {string} url - Website URL to verify
 * @param {Object} existingData - Existing lead data from Supabase
 * @returns {Promise<Object>} Verification result
 */
export async function verifyWebsite(url, existingData = {}) {
  console.log(`= Verifying website: ${url}`);

  const startTime = Date.now();
  let browser = null;

  try {
    // Launch browser
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
    const page = await context.newPage();

    // Navigate to URL with timeout
    console.log('  œ Loading page...');
    const loadStart = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const loadTime = (Date.now() - loadStart) / 1000;

    // Wait for page to settle
    await page.waitForTimeout(2000);

    // Extract page content
    const html = await page.content();
    const title = await page.title();

    console.log(`   Page loaded in ${loadTime.toFixed(2)}s`);

    // Use Grok to quickly verify key facts
    const verificationResult = await verifyWithGrok(url, html, title, existingData);

    // Close browser
    await browser.close();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`   Verification complete in ${totalTime}s`);

    return {
      success: true,
      url,
      verified: true,
      loadTime,
      verification: verificationResult,
      verifiedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error(`  L Verification failed: ${error.message}`);

    if (browser) {
      await browser.close();
    }

    return {
      success: false,
      url,
      verified: false,
      error: error.message,
      verifiedAt: new Date().toISOString(),
    };
  }
}

/**
 * Use Grok AI to verify key facts from HTML
 */
async function verifyWithGrok(url, html, title, existingData) {
  console.log('  œ Verifying with Grok AI...');

  // Truncate HTML to reasonable size (Grok has context limits)
  const truncatedHtml = html.substring(0, 50000);

  const prompt = `You are verifying website data for ${url}.

EXISTING DATA (from previous analysis):
${JSON.stringify({
    companyName: existingData.company_name,
    industry: existingData.industry,
    location: existingData.location,
    contactEmail: existingData.contact_email,
    contactPhone: existingData.contact_phone,
    companyDescription: existingData.company_description,
  }, null, 2)}

HTML (truncated):
${truncatedHtml}

TASK: Quickly verify the following:
1. Is the company name still correct?
2. Is the industry still accurate?
3. Is the location still correct?
4. Are there any NEW recent updates or blog posts (last 30 days)?
5. Are there any NEW achievements or milestones mentioned?
6. Any major website changes since last analysis?

Return ONLY valid JSON in this format:
{
  "companyNameVerified": true/false,
  "industryVerified": true/false,
  "locationVerified": true/false,
  "recentUpdates": ["update 1", "update 2"] or [],
  "newAchievements": ["achievement 1"] or [],
  "majorChanges": ["change 1"] or [],
  "freshPersonalizationHooks": ["hook 1", "hook 2"] or [],
  "notes": "Any additional notes"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'grok-2-latest',
      messages: [{
        role: 'user',
        content: prompt,
      }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const result = response.choices[0].message.content;

    // Parse JSON response
    const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/) ||
                      result.match(/```\n([\s\S]*?)\n```/) ||
                      result.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    }

    throw new Error('Could not parse JSON from Grok response');

  } catch (error) {
    console.error('    Grok verification failed:', error.message);
    return {
      companyNameVerified: true, // Assume existing data is still valid
      industryVerified: true,
      locationVerified: true,
      recentUpdates: [],
      newAchievements: [],
      majorChanges: [],
      freshPersonalizationHooks: [],
      notes: `Verification failed: ${error.message}`,
    };
  }
}

/**
 * Quick check if website is still accessible (no browser needed)
 */
export async function quickAccessibilityCheck(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    return {
      accessible: response.ok,
      status: response.status,
      url,
    };
  } catch (error) {
    return {
      accessible: false,
      error: error.message,
      url,
    };
  }
}
