/**
 * Grok-based AI extraction module
 * Uses xAI's Grok to extract ALL relevant data from website HTML in one call
 * Falls back to traditional scraping for email/phone if Grok misses them
 */

import { callAI } from '../ai-providers.js';
import { extractFromPage } from './contact.js';
import { validateJSON, formatValidationResult } from './json-validator.js';

/**
 * Extract all relevant information from a website using Grok AI
 * @param {string} html - Full HTML content of the page
 * @param {string} url - URL of the page
 * @param {string} model - Grok model to use (default: 'grok-4-fast')
 * @param {Object} page - Optional Playwright page instance for fallback extraction
 * @returns {Promise<Object>} Structured extraction results
 */
export async function extractWithGrok(html, url, model = 'grok-4-fast', page = null) {
  // Limit HTML size to avoid token limits (keep first 150k chars)
  const truncatedHtml = html.length > 150000 ? html.substring(0, 150000) + '\n...[HTML truncated]' : html;

  const systemPrompt = `You are a data extraction specialist. Your job is to analyze website HTML and extract structured information in JSON format.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no explanations, no extra text
2. If you cannot find data, use null (not empty strings)
3. Extract actual content, not SEO spam or marketing fluff
4. For company name: ignore phrases like "Top", "Best", "Leading", "#1", "Award-winning"
5. For emails: Extract ALL emails found, even generic ones (info@, contact@, etc.)
6. Be conservative - only extract data you're confident about

OUTPUT FORMAT (strict JSON):
{
  "companyInfo": {
    "name": "Company Name Here (no SEO keywords)",
    "foundingYear": 2020,
    "location": "City, State",
    "description": "Brief description of what they do",
    "industry": "Industry category (e.g., Web Design, Restaurant, E-commerce)"
  },
  "contactInfo": {
    "email": "contact@example.com (extract ALL emails, including info@, contact@, support@)",
    "phone": "+1-234-567-8900",
    "address": "Full address if found"
  },
  "socialProfiles": {
    "linkedIn": {
      "company": "https://linkedin.com/company/...",
      "personal": ["https://linkedin.com/in/founder-name"]
    },
    "instagram": {
      "handle": "@username",
      "url": "https://instagram.com/username"
    },
    "twitter": {
      "handle": "@username",
      "url": "https://twitter.com/username"
    },
    "facebook": "https://facebook.com/...",
    "youtube": "https://youtube.com/..."
  },
  "teamInfo": {
    "founder": {
      "name": "Founder Name",
      "title": "Founder & CEO",
      "bio": "Brief bio if available",
      "linkedIn": "https://linkedin.com/in/..."
    },
    "keyPeople": [
      {
        "name": "Person Name",
        "title": "Job Title",
        "linkedIn": "https://linkedin.com/in/..."
      }
    ]
  },
  "contentInfo": {
    "recentPosts": [
      {
        "title": "Blog post title",
        "date": "2025-01-15",
        "url": "https://example.com/blog/post",
        "summary": "Brief summary"
      }
    ],
    "hasActiveBlog": true,
    "lastContentUpdate": "2025-01-15"
  },
  "businessIntel": {
    "services": ["Service 1", "Service 2"],
    "targetAudience": "Who they serve",
    "valueProposition": "What makes them unique",
    "offeringsDetail": "Detailed description of products/services offered",
    "recentNews": ["Recent achievement or news if found"]
  },
  "achievements": {
    "awards": ["Award Name - Year"],
    "certifications": ["Certification Name"],
    "yearsInBusiness": 10,
    "notableAccomplishments": ["Major project", "Industry recognition"]
  },
  "socialProof": {
    "testimonials": [
      {
        "quote": "Customer quote here",
        "author": "Customer Name",
        "company": "Company Name (optional)"
      }
    ],
    "communityInvolvement": ["Charity work", "Community events", "Sponsorships"],
    "brandVoice": "professional | casual | friendly | authoritative | technical | creative"
  },
  "techStack": {
    "platform": "WordPress | Shopify | Webflow | Wix | Squarespace | ProcessWire | Drupal | Custom | Unknown",
    "platformVersion": "Version number if detectable",
    "framework": "React | Vue | Next.js | Angular | None | Unknown",
    "cssFramework": "Tailwind | Bootstrap | Foundation | None | Unknown",
    "hosting": "Vercel | Netlify | AWS | GCP | Cloudflare | Unknown",
    "tools": ["Google Tag Manager", "Hotjar", "etc."],
    "confidence": 0.8,
    "detectionMethod": "meta-tags | class-conventions | script-urls | html-comments"
  }
}`;

  const userPrompt = `Analyze this website and extract all relevant information in JSON format.

Website URL: ${url}

HTML Content:
${truncatedHtml}

Extract:
1. **Company Info**: Name (NO SEO spam like "Top/Best/Leading"), founding year, location, description, industry
2. **Contact Info**: Email (prefer non-generic like founder@, not info@), phone, address
3. **Social Profiles**: LinkedIn (company + personal), Instagram, Twitter, Facebook, YouTube
4. **Team Info**: Founder name/bio/LinkedIn, key team members with titles and LinkedIn
5. **Content Info**: Recent blog posts (title, date, URL, summary), whether blog is active
6. **Business Intel**: Services offered, target audience, value proposition, detailed offerings description, recent news/achievements
7. **Achievements**: Awards, certifications, years in business (calculate from founding year), notable accomplishments
8. **Social Proof**: Customer testimonials (quote + author + company), community involvement (charity/events/sponsorships), brand voice (professional/casual/friendly/etc)
9. **Tech Stack**: Platform (WordPress, Shopify, Webflow, Wix, ProcessWire, Drupal, Custom, etc.), framework (React, Vue, Next.js), CSS framework (Tailwind, Bootstrap), hosting, tools, confidence (0.0-1.0), and how you detected it

**Tech Stack Detection Tips:**
- Look for meta tags like <meta name="generator" content="WordPress 6.4">
- Check for class naming conventions (.wp-, .shopify-, .wf-)
- Inspect script URLs (cdn.shopify.com, tailwindcss.com, react.js)
- Find HTML comments (<!-- Built with Webflow -->, <!-- ProcessWire -->)
- Detect hosting patterns (vercel, netlify, cloudflare)
- Use confidence score: High (0.8-1.0) if multiple signals, Medium (0.5-0.7) if one signal, Low (0.0-0.4) if guessing
- If unsure, use "Unknown" - don't guess wildly
- ProcessWire often has /processwire/ in URLs or class="pw-"
- Be flexible - many platforms exist beyond the common ones

IMPORTANT:
- Return ONLY the JSON object, no other text
- Use null for missing data
- Filter out SEO keywords in company name
- Be accurate and conservative
- For tech stack, provide your best estimate with confidence score`;

  try {
    const response = await callAI({
      model,
      prompt: userPrompt,
      systemPrompt,
      enableSearch: false // Don't need web search for extraction
    });

    // Validate JSON response
    const validation = validateJSON(response.text, 'grokExtraction');

    // Log validation result if debug mode
    if (process.env.DEBUG_AI === 'true') {
      console.log('\n' + formatValidationResult(validation));
    }

    let extracted;

    if (validation.isValid) {
      // Validation passed
      extracted = validation.data;
      console.log('  ✅ Grok response validated successfully');
    } else {
      // Validation failed - try manual parsing as fallback
      console.warn('  ⚠️ Grok response failed validation, attempting manual parsing...');
      console.warn('  Validation errors:', validation.errors.join(', '));

      try {
        // Try to extract JSON from response (in case there's markdown wrapping)
        const text = response.text.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extracted = JSON.parse(jsonMatch[0]);
        } else {
          extracted = JSON.parse(text);
        }
        console.log('  ✅ Manual parsing succeeded');
      } catch (parseError) {
        console.error('Failed to parse Grok response as JSON:', parseError.message);
        console.error('Response text:', response.text.substring(0, 500));
        throw new Error('Grok returned invalid JSON: ' + parseError.message);
      }
    }

    // Add metadata
    extracted._meta = {
      url,
      model,
      extractedAt: new Date().toISOString(),
      tokensUsed: {
        input: response.usage?.inputTokens || 0,
        output: response.usage?.outputTokens || 0
      },
      usedFallback: false
    };

    // FALLBACK: If Grok missed email/phone, use traditional scraping
    if (page && (!extracted.contactInfo?.email || !extracted.contactInfo?.phone)) {
      try {
        const fallbackContact = await extractFromPage(page, url);

        if (!extracted.contactInfo?.email && fallbackContact.emails && fallbackContact.emails.length > 0) {
          // Use first email found
          extracted.contactInfo.email = fallbackContact.emails[0].value;
          extracted._meta.usedFallback = true;
          extracted._meta.fallbackSource = 'traditional-scraping';
          console.log(`  ℹ️ Fallback: Found email via traditional scraping: ${extracted.contactInfo.email}`);
        }

        if (!extracted.contactInfo?.phone && fallbackContact.phones && fallbackContact.phones.length > 0) {
          // Use first phone found
          extracted.contactInfo.phone = fallbackContact.phones[0].value;
          extracted._meta.usedFallback = true;
          extracted._meta.fallbackSource = 'traditional-scraping';
          console.log(`  ℹ️ Fallback: Found phone via traditional scraping: ${extracted.contactInfo.phone}`);
        }
      } catch (fallbackError) {
        console.warn('  ⚠️ Fallback extraction failed:', fallbackError.message);
      }
    }

    return extracted;

  } catch (error) {
    console.error('Grok extraction failed:', error.message);
    throw error;
  }
}

/**
 * Extract from multiple pages and aggregate results
 * @param {Array} pages - Array of { url, html } objects
 * @param {string} model - Grok model to use
 * @returns {Promise<Object>} Aggregated extraction results
 */
export async function extractFromMultiplePages(pages, model = 'grok-4-fast') {
  if (pages.length === 0) {
    throw new Error('No pages provided for extraction');
  }

  // For now, just extract from the first page (homepage)
  // We can enhance this later to aggregate from multiple pages
  const homepage = pages[0];
  return await extractWithGrok(homepage.html, homepage.url, model);
}

/**
 * Get best contact email from extraction results
 * Prefers personal emails over generic (info@, contact@)
 */
export function getBestContactEmail(extracted) {
  const email = extracted?.contactInfo?.email;
  if (!email) return null;

  const genericPatterns = [/^info@/i, /^contact@/i, /^support@/i, /^hello@/i, /^admin@/i];
  const isGeneric = genericPatterns.some(rx => rx.test(email));

  return {
    email,
    isGeneric,
    confidence: isGeneric ? 0.6 : 0.9
  };
}

/**
 * Get best contact person (founder or first team member)
 */
export function getBestContactPerson(extracted) {
  if (extracted?.teamInfo?.founder?.name) {
    return {
      name: extracted.teamInfo.founder.name,
      title: extracted.teamInfo.founder.title || 'Founder',
      linkedIn: extracted.teamInfo.founder.linkedIn,
      source: 'founder'
    };
  }

  if (extracted?.teamInfo?.keyPeople && extracted.teamInfo.keyPeople.length > 0) {
    const person = extracted.teamInfo.keyPeople[0];
    return {
      name: person.name,
      title: person.title,
      linkedIn: person.linkedIn,
      source: 'team'
    };
  }

  return null;
}

/**
 * Get most recent blog post
 */
export function getMostRecentPost(extracted) {
  const posts = extracted?.contentInfo?.recentPosts;
  if (!posts || posts.length === 0) return null;

  // Posts should already be sorted by date from Grok
  return posts[0];
}

/**
 * Check if company has strong social media presence
 */
export function hasStrongSocialPresence(extracted) {
  const social = extracted?.socialProfiles;
  if (!social) return false;

  let count = 0;
  if (social.linkedIn?.company) count++;
  if (social.instagram?.url) count++;
  if (social.twitter?.url) count++;
  if (social.facebook) count++;
  if (social.youtube) count++;

  return count >= 2; // At least 2 platforms
}

/**
 * Format extraction results for display/logging
 */
export function formatExtractionSummary(extracted) {
  const lines = [];

  lines.push('=== GROK EXTRACTION RESULTS ===\n');

  // Company Info
  if (extracted?.companyInfo) {
    lines.push('COMPANY INFO:');
    lines.push(`  Name: ${extracted.companyInfo.name || 'Not found'}`);
    lines.push(`  Industry: ${extracted.companyInfo.industry || 'Not found'}`);
    lines.push(`  Location: ${extracted.companyInfo.location || 'Not found'}`);
    if (extracted.companyInfo.foundingYear) {
      lines.push(`  Founded: ${extracted.companyInfo.foundingYear}`);
    }
    lines.push('');
  }

  // Contact Info
  if (extracted?.contactInfo) {
    lines.push('CONTACT INFO:');
    lines.push(`  Email: ${extracted.contactInfo.email || 'Not found'}`);
    lines.push(`  Phone: ${extracted.contactInfo.phone || 'Not found'}`);
    if (extracted.contactInfo.address) {
      lines.push(`  Address: ${extracted.contactInfo.address}`);
    }
    lines.push('');
  }

  // Social Profiles
  const social = extracted?.socialProfiles;
  if (social) {
    lines.push('SOCIAL PROFILES:');
    if (social.linkedIn?.company) lines.push(`  LinkedIn (Company): ${social.linkedIn.company}`);
    if (social.linkedIn?.personal?.length > 0) lines.push(`  LinkedIn (Personal): ${social.linkedIn.personal.length} profiles`);
    if (social.instagram?.handle) lines.push(`  Instagram: ${social.instagram.handle}`);
    if (social.twitter?.handle) lines.push(`  Twitter: ${social.twitter.handle}`);
    if (social.facebook) lines.push(`  Facebook: Found`);
    if (social.youtube) lines.push(`  YouTube: Found`);
    lines.push('');
  }

  // Team Info
  const team = extracted?.teamInfo;
  if (team) {
    lines.push('TEAM INFO:');
    if (team.founder?.name) {
      lines.push(`  Founder: ${team.founder.name} (${team.founder.title || 'Founder'})`);
    }
    if (team.keyPeople?.length > 0) {
      lines.push(`  Team Members: ${team.keyPeople.length} found`);
    }
    lines.push('');
  }

  // Content Info
  const content = extracted?.contentInfo;
  if (content) {
    lines.push('CONTENT INFO:');
    lines.push(`  Active Blog: ${content.hasActiveBlog ? 'Yes' : 'No'}`);
    if (content.recentPosts?.length > 0) {
      lines.push(`  Recent Posts: ${content.recentPosts.length} found`);
      const recent = content.recentPosts[0];
      lines.push(`    Latest: "${recent.title}" (${recent.date})`);
    }
    lines.push('');
  }

  // Business Intel
  const business = extracted?.businessIntel;
  if (business) {
    lines.push('BUSINESS INTEL:');
    if (business.services?.length > 0) {
      lines.push(`  Services: ${business.services.join(', ')}`);
    }
    if (business.valueProposition) {
      lines.push(`  Value Prop: ${business.valueProposition}`);
    }
    if (business.recentNews?.length > 0) {
      lines.push(`  Recent News: ${business.recentNews.length} items`);
    }
    lines.push('');
  }

  // Metadata
  if (extracted?._meta) {
    lines.push('METADATA:');
    lines.push(`  Model: ${extracted._meta.model}`);
    lines.push(`  Tokens: ${extracted._meta.tokensUsed.input} in / ${extracted._meta.tokensUsed.output} out`);
    lines.push(`  Extracted: ${extracted._meta.extractedAt}`);
  }

  return lines.join('\n');
}
