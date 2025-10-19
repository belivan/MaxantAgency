/**
 * Visual Design Analysis Module
 * Uses GPT-4o vision to analyze screenshots for design quality
 */

import { promises as fs } from 'fs';
import { callAI } from '../ai-providers.js';
import { parseJSONFromText } from './ai-utils.js';

/**
 * Analyze visual design from multiple screenshots
 */
export async function analyzeVisualDesign(screenshots, visionModel, sendProgress, url) {
  // Screenshots is an array: [{ url, screenshotPath }, ...]
  const pageCount = screenshots.length;

  sendProgress({
    type: 'step',
    step: 'visual_analysis_start',
    message: `⏳ Analyzing visual design (${pageCount} page${pageCount > 1 ? 's' : ''})...`,
    url
  });

  const allCritiques = [];
  const allStrengths = [];
  const allWeaknesses = [];
  const screenshotsAnalyzed = [];

  // Analyze each screenshot
  for (let i = 0; i < screenshots.length; i++) {
    const { url: pageUrl, screenshotPath } = screenshots[i];
    const pageNum = i + 1;

    sendProgress({
      type: 'step',
      step: 'visual_analysis_page',
      message: `⏳ Analyzing visual design of page ${pageNum}/${pageCount}...`,
      url
    });

    try {
      // Read screenshot and convert to base64
      const screenshotBuffer = await fs.readFile(screenshotPath);
      const screenshotBase64 = screenshotBuffer.toString('base64');

      const isHomepage = i === 0;
      const pageName = isHomepage ? 'homepage' : `page ${pageNum}`;

      const prompt = `You are an expert UI/UX designer reviewing this website ${pageName} screenshot. Analyze the visual design and identify 1-2 SPECIFIC design issues.

Focus on:
- **Color & Contrast**: Text readability, color accessibility, brand consistency
- **Typography**: Font choices, hierarchy, readability, line height, spacing
- **Layout & Spacing**: White space usage, alignment, grid system, visual balance
- **Visual Hierarchy**: Element prioritization, call-to-action prominence, flow
- **Mobile Responsiveness**: How elements appear at this viewport (if visible)
- **Brand Consistency**: Professional appearance, cohesive design language

Requirements:
1. Be SPECIFIC - reference actual colors, fonts, spacing issues you see
2. Focus on HIGH-IMPACT issues that affect user experience
3. Provide ACTIONABLE recommendations
4. Each critique should be 1-2 sentences
5. Start critiques with the page context (e.g., "Homepage: ..." or "Services page: ...")

Return ONLY valid JSON (no markdown):
{
  "designCritiques": [
    "First specific design issue with visual reference",
    "Second specific design issue with visual reference (optional)"
  ],
  "overallImpressions": {
    "strengths": ["strength1"],
    "weaknesses": ["weakness1"]
  }
}`;

      const aiResult = await callAI({
        model: visionModel,
        prompt: prompt,
        systemPrompt: 'You are an expert UI/UX designer and visual design consultant. Always return valid JSON.',
        image: screenshotBase64
      });

      // Parse JSON response robustly
      const result = parseJSONFromText(aiResult.text);
      if (!result) throw new Error('Failed to parse visual analysis JSON from AI response');

      // Collect critiques from this page
      if (result.designCritiques && result.designCritiques.length > 0) {
        allCritiques.push(...result.designCritiques);
      }
      if (result.overallImpressions?.strengths) {
        allStrengths.push(...result.overallImpressions.strengths);
      }
      if (result.overallImpressions?.weaknesses) {
        allWeaknesses.push(...result.overallImpressions.weaknesses);
      }
      screenshotsAnalyzed.push(screenshotPath);

      sendProgress({
        type: 'step',
        step: 'visual_analysis_page_complete',
        message: `✓ Page ${pageNum}/${pageCount} visual analysis complete`,
        url
      });

    } catch (error) {
      console.error(`Visual design analysis error for ${pageUrl}:`, error);
      // Continue with other pages even if one fails
    }
  }

  // Deduplicate and limit critiques
  const uniqueCritiques = [...new Set(allCritiques)];
  const finalCritiques = uniqueCritiques.slice(0, 5); // Max 5 critiques

  sendProgress({
    type: 'step',
    step: 'visual_analysis_complete',
    message: `✓ Generated ${finalCritiques.length} design critiques from ${pageCount} pages`,
    url
  });

  return {
    critiques: finalCritiques.length > 0 ? finalCritiques : [
      'Visual design analysis unavailable - manual review recommended',
      'Consider reviewing color contrast for accessibility compliance',
      'Evaluate typography hierarchy and readability on key pages'
    ],
    strengths: [...new Set(allStrengths)],
    weaknesses: [...new Set(allWeaknesses)],
    screenshotsAnalyzed: screenshotsAnalyzed,
    pagesAnalyzed: pageCount
  };
}

/**
 * Format visual design results for AI prompt context
 */
export function formatVisualResultsForAI(visualResults) {
  if (!visualResults || visualResults.critiques.length === 0) {
    return '';
  }

  return `
VISUAL DESIGN ANALYSIS (AI Vision Review):
${visualResults.critiques.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Strengths: ${visualResults.strengths.join(', ') || 'None identified'}
Weaknesses: ${visualResults.weaknesses.join(', ') || 'None identified'}
`.trim();
}
