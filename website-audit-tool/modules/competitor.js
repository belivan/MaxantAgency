/**
 * AI Competitor Discovery Module
 * Uses Grok web search to discover competitors and analyze their strengths
 */

import { callAI } from '../ai-providers.js';
import { parseJSONFromText } from './ai-utils.js';
import { chromium } from 'playwright';

/**
 * Discover and analyze competitors
 */
export async function discoverAndAnalyzeCompetitors(websiteData, industry, textModel, depthTier, browser, sendProgress, url) {
  sendProgress({
    type: 'step',
    step: 'competitor_discovery_start',
    message: `⏳ Discovering competitors via web search...`,
    url
  });

  // Step 1: Discover competitors using Grok web search
  const competitors = await discoverCompetitors(websiteData, industry, sendProgress, url);

  if (!competitors || competitors.length === 0) {
    sendProgress({
      type: 'step',
      step: 'competitor_discovery_skipped',
      message: `⚠️ No competitors found - skipping competitive analysis`,
      url
    });
    return null;
  }

  sendProgress({
    type: 'step',
    step: 'competitor_discovery_complete',
    message: `✓ Found ${competitors.length} competitors: ${competitors.map(c => c.name).join(', ')}`,
    url
  });

  // Step 2: Analyze top 3 competitors (Tier II scrape: 3 pages each)
  const competitorsToAnalyze = competitors.slice(0, 3);
  const competitorAnalyses = [];

  for (let i = 0; i < competitorsToAnalyze.length; i++) {
    const competitor = competitorsToAnalyze[i];
    const compNum = i + 1;

    sendProgress({
      type: 'step',
      step: 'competitor_analysis',
      message: `⏳ Analyzing competitor ${compNum}/3: ${competitor.name}...`,
      url
    });

    try {
      const analysis = await analyzeCompetitor(competitor, depthTier, browser, sendProgress, url);
      competitorAnalyses.push({
        name: competitor.name,
        url: competitor.url,
        reason: competitor.reason,
        features: analysis
      });

      sendProgress({
        type: 'step',
        step: 'competitor_analyzed',
        message: `✓ Competitor ${compNum}/3 analyzed`,
        url
      });
    } catch (error) {
      console.error(`Error analyzing competitor ${competitor.name}:`, error);
      sendProgress({
        type: 'step',
        step: 'competitor_analysis_failed',
        message: `⚠️ Failed to analyze ${competitor.name} - continuing...`,
        url
      });
    }
  }

  if (competitorAnalyses.length === 0) {
    return null;
  }

  // Step 3: Generate competitive insights using text model
  sendProgress({
    type: 'step',
    step: 'competitor_comparison_start',
    message: `⏳ Generating competitive insights...`,
    url
  });

  const insights = await generateCompetitorInsights(
    websiteData,
    competitorAnalyses,
    industry,
    textModel,
    sendProgress,
    url
  );

  sendProgress({
    type: 'step',
    step: 'competitor_comparison_complete',
    message: `✓ Generated ${insights.critiques.length} competitive critiques`,
    url
  });

  return {
    competitors: competitorAnalyses,
    critiques: insights.critiques,
    summary: insights.summary
  };
}

/**
 * Step 1: Discover competitors using Grok web search
 */
async function discoverCompetitors(websiteData, industry, sendProgress, url) {
  const { url: targetUrl, data } = websiteData;

  // Extract location from content (simple approach)
  const locationMatch = data.bodyText.match(/(?:located in|based in|serving|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  const location = locationMatch ? locationMatch[1] : 'United States';

  const prompt = `Find 3-5 direct competitors for this business using web search:

Business Information:
- Website: ${targetUrl}
- Industry: ${industry.specific} (${industry.broad})
- Location: ${location}
- Services/Products: ${data.bodyText.slice(0, 500)}

Task: Search the web for top competitors in the ${industry.specific} industry${location !== 'United States' ? ` in ${location}` : ''}. Look for businesses that:
1. Offer similar services/products
2. Target similar customers
3. Have professional websites
4. Are direct competitors (not suppliers or partners)

Return ONLY valid JSON (no markdown):
{
  "competitors": [
    {
      "name": "Company Name",
      "url": "https://example.com",
      "reason": "Brief reason why they're a competitor"
    }
  ]
}

Find 3-5 competitors. Use web search to find real, current competitors.`;

  try {
    const aiResult = await callAI({
      model: 'grok-4-fast',  // Grok with web search
      prompt: prompt,
      systemPrompt: 'You are a business analyst. Use web search to find real competitors. Always return valid JSON.',
      enableSearch: true  // 🔥 ENABLE WEB SEARCH
    });

    // Parse JSON response robustly
    const result = parseJSONFromText(aiResult.text);
    if (!result) throw new Error('Failed to parse competitors JSON from AI response');

    return result.competitors || [];

  } catch (error) {
    console.error('Competitor discovery error:', error);
    return [];
  }
}

/**
 * Step 2: Analyze competitor
 * Tier I: Homepage only
 * Tier II/III: Homepage + Services + Contact (3 pages)
 */
async function analyzeCompetitor(competitor, depthTier, browser, sendProgress, url) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  try {
    // Visit homepage
    await page.goto(competitor.url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Extract homepage features
    const homepageData = await page.evaluate(() => {
      return {
        title: document.title,
        hasPricing: !!(
          document.body.innerText.toLowerCase().includes('pricing') ||
          document.body.innerText.toLowerCase().includes('$') ||
          document.body.innerText.toLowerCase().includes('starting at')
        ),
        hasTestimonials: !!(
          document.querySelector('[class*="testimonial"]') ||
          document.querySelector('[class*="review"]') ||
          document.body.innerText.toLowerCase().includes('testimonial')
        ),
        hasLiveChat: !!(
          document.querySelector('[class*="chat"]') ||
          document.querySelector('[id*="chat"]') ||
          document.querySelector('[class*="intercom"]') ||
          document.querySelector('[class*="drift"]')
        ),
        hasCaseStudies: !!(
          document.body.innerText.toLowerCase().includes('case stud') ||
          document.body.innerText.toLowerCase().includes('portfolio') ||
          document.body.innerText.toLowerCase().includes('our work')
        ),
        hasClientLogos: !!(
          document.querySelector('[class*="client"]') ||
          document.querySelector('[class*="logo"]') ||
          document.body.innerText.toLowerCase().includes('trusted by')
        ),
        ctaText: document.querySelector('button, .btn, a[class*="cta"]')?.innerText || 'Not found',
        services: Array.from(document.querySelectorAll('h2, h3'))
          .map(h => h.innerText)
          .filter(t => t.length > 5 && t.length < 50)
          .slice(0, 5)
      };
    });

    // For Tier I: Only analyze homepage, skip additional pages
    if (depthTier === 'tier1') {
      await context.close();
      return {
        ...homepageData,
        hasDetailedServices: false,
        hasPhoneNumber: false,
        hasEmail: false,
        hasAddress: false
      };
    }

    // For Tier II/III: Analyze Services and Contact pages
    const links = await page.$$eval('a', links =>
      links.map(a => ({ text: a.innerText, href: a.href }))
    );

    const servicesLink = links.find(l =>
      l.text && (
        l.text.toLowerCase().includes('service') ||
        l.text.toLowerCase().includes('what we do')
      )
    );

    let servicesData = { hasDetailedServices: false };
    if (servicesLink && servicesLink.href) {
      try {
        await page.goto(servicesLink.href, { waitUntil: 'networkidle', timeout: 15000 });
        servicesData = await page.evaluate(() => ({
          hasDetailedServices: document.body.innerText.length > 500
        }));
      } catch (e) {
        // Skip if services page fails
      }
    }

    // Try to visit Contact page
    const contactLink = links.find(l =>
      l.text && l.text.toLowerCase().includes('contact')
    );

    let contactData = { hasPhoneNumber: false, hasEmail: false, hasAddress: false };
    if (contactLink && contactLink.href) {
      try {
        await page.goto(contactLink.href, { waitUntil: 'networkidle', timeout: 15000 });
        contactData = await page.evaluate(() => ({
          hasPhoneNumber: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(document.body.innerText),
          hasEmail: /@/.test(document.body.innerText),
          hasAddress: !!(
            document.body.innerText.toLowerCase().includes('address') ||
            document.body.innerText.toLowerCase().includes('location')
          )
        }));
      } catch (e) {
        // Skip if contact page fails
      }
    }

    await context.close();

    // Combine all features
    return {
      ...homepageData,
      ...servicesData,
      ...contactData
    };

  } catch (error) {
    await context.close();
    throw error;
  }
}

/**
 * Step 3: Generate competitive insights using text model
 */
async function generateCompetitorInsights(targetSite, competitors, industry, textModel, sendProgress, url) {
  // Build comparison prompt
  const targetFeatures = {
    hasPricing: targetSite.data.bodyText.toLowerCase().includes('pricing') || targetSite.data.bodyText.includes('$'),
    hasTestimonials: targetSite.data.bodyText.toLowerCase().includes('testimonial'),
    hasLiveChat: targetSite.data.hasChat,
    hasCaseStudies: targetSite.data.bodyText.toLowerCase().includes('case stud'),
    hasClientLogos: false // Simple check
  };

  const prompt = `You are a competitive analyst. Compare this ${industry.specific} business against its competitors.

TARGET WEBSITE (${targetSite.url}):
- Has pricing visible: ${targetFeatures.hasPricing}
- Has testimonials: ${targetFeatures.hasTestimonials}
- Has live chat: ${targetFeatures.hasLiveChat}
- Has case studies: ${targetFeatures.hasCaseStudies}
- Has client logos: ${targetFeatures.hasClientLogos}

COMPETITORS ANALYSIS:
${competitors.map(c => `
${c.name} (${c.url}):
- Has pricing visible: ${c.features.hasPricing}
- Has testimonials: ${c.features.hasTestimonials}
- Has live chat: ${c.features.hasLiveChat}
- Has case studies: ${c.features.hasCaseStudies}
- Has client logos: ${c.features.hasClientLogos}
- Detailed services page: ${c.features.hasDetailedServices}
- Contact info (phone/email/address): ${c.features.hasPhoneNumber}/${c.features.hasEmail}/${c.features.hasAddress}
`).join('\n')}

Task: Identify 2-3 SPECIFIC ways competitors are doing better than the target website. Focus on:
1. Features competitors have that target is missing
2. Common patterns across multiple competitors (e.g., "All 3 competitors have X")
3. High-impact differences that affect trust and conversions

Be SPECIFIC - mention competitor names and exact features.

Return ONLY valid JSON (no markdown):
{
  "critiques": [
    "First competitive gap with specific competitor reference",
    "Second competitive gap with specific competitor reference",
    "Third competitive gap (optional)"
  ],
  "summary": "One sentence summary of competitive position"
}`;

  try {
    const aiResult = await callAI({
      model: textModel,
      prompt: prompt,
      systemPrompt: 'You are a competitive analyst. Always return valid JSON.'
    });

    // Parse JSON response
    const jsonMatch = aiResult.text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResult.text);

    return {
      critiques: result.critiques || [],
      summary: result.summary || 'Competitive analysis complete'
    };

  } catch (error) {
    console.error('Competitor insights generation error:', error);

    // Fallback critiques
    return {
      critiques: [
        `${competitors[0]?.name || 'Top competitor'} displays features your site is missing - review their approach`,
        'Competitive analysis suggests gaps in trust signals and transparency compared to industry leaders'
      ],
      summary: 'Further competitive research recommended'
    };
  }
}
