/**
 * Team & Leadership Scraper
 * Extracts founder, CEO, team members, and their LinkedIn profiles
 */

/**
 * Common URL patterns for team/about pages
 * Matches various URL formats: /about, /about-us, /aboutus, etc.
 */
const TEAM_PAGE_PATTERNS = [
  /\/about[-_]?us/i,
  /\/about/i,
  /\/team/i,
  /\/our[-_]?team/i,
  /\/meet[-_]?the[-_]?team/i,
  /\/leadership/i,
  /\/founders?/i,
  /\/our[-_]?story/i,
  /\/who[-_]?we[-_]?are/i,
  /\/people/i,
  /\/staff/i,
  /\/company/i,
  /\/our[-_]?people/i
];

/**
 * Detect if current page is likely a team/about page
 * @param {string} url - Page URL
 * @returns {boolean}
 */
export function isTeamPage(url) {
  return TEAM_PAGE_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Find team/about page URLs from a list of discovered pages
 * @param {Array<string>} pageUrls - List of page URLs
 * @returns {Array<string>} Team/about page URLs sorted by priority
 */
export function findTeamPages(pageUrls) {
  const teamPages = pageUrls.filter(url => isTeamPage(url));

  // Sort by priority (team > about > leadership, etc.)
  const priority = {
    team: 1,
    leadership: 2,
    founders: 3,
    about: 4,
    story: 5
  };

  return teamPages.sort((a, b) => {
    const aScore = Math.min(...Object.entries(priority)
      .filter(([key]) => a.toLowerCase().includes(key))
      .map(([, value]) => value));
    const bScore = Math.min(...Object.entries(priority)
      .filter(([key]) => b.toLowerCase().includes(key))
      .map(([, value]) => value));
    return aScore - bScore;
  });
}

/**
 * Extract team information from a page
 * @param {Page} page - Playwright page instance
 * @param {string} url - Current page URL
 * @returns {Object} Team information found
 */
export async function extractTeamInfo(page, url) {
  try {
    const result = await page.evaluate(() => {
      const team = {
        founder: null,
        ceo: null,
        keyPeople: [],
        teamPageUrl: null
      };

      const bodyText = document.body.innerText || '';
      const bodyHTML = document.body.innerHTML || '';

      // === FOUNDER DETECTION ===

      // Pattern 1: "Founded by [Name]" or "Founder: [Name]"
      const founderPatterns = [
        /(?:Founded|Started|Created)\s+(?:by|in\s+\d{4}\s+by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/,
        /Founder[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i,
        /Co-Founder[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i
      ];

      for (const pattern of founderPatterns) {
        const match = bodyText.match(pattern);
        if (match && !team.founder) {
          team.founder = {
            name: match[1].trim(),
            title: 'Founder',
            source: 'text pattern',
            confidence: 0.8
          };
          break;
        }
      }

      // Pattern 2: Look for team member cards with "Founder" title
      const teamCards = document.querySelectorAll([
        '.team-member',
        '.staff-profile',
        '[class*="employee"]',
        '[class*="team-card"]',
        '[class*="person-card"]',
        'article[class*="team"]'
      ].join(','));

      teamCards.forEach(card => {
        const cardText = card.innerText || '';
        const nameEl = card.querySelector('h1, h2, h3, h4, .name, [class*="name"]');
        const titleEl = card.querySelector('.title, .role, .position, [class*="title"], [class*="role"]');

        const name = nameEl ? nameEl.innerText.trim() : null;
        const title = titleEl ? titleEl.innerText.trim() : null;

        if (name && title) {
          const titleLower = title.toLowerCase();

          // Check for founder
          if ((titleLower.includes('founder') || titleLower.includes('co-founder')) && !team.founder) {
            team.founder = {
              name,
              title,
              source: 'team card',
              confidence: 0.95
            };
          }

          // Check for CEO
          if ((titleLower.includes('ceo') || titleLower === 'chief executive officer') && !team.ceo) {
            team.ceo = {
              name,
              title,
              source: 'team card',
              confidence: 0.95
            };
          }

          // Collect other key people (VP, CTO, Director, etc.)
          if (
            titleLower.includes('cto') ||
            titleLower.includes('cfo') ||
            titleLower.includes('cmo') ||
            titleLower.includes('vp ') ||
            titleLower.includes('vice president') ||
            titleLower.includes('director') ||
            titleLower.includes('head of')
          ) {
            team.keyPeople.push({
              name,
              title,
              source: 'team card',
              confidence: 0.9
            });
          }

          // Look for LinkedIn links within card
          const linkedInLink = card.querySelector('a[href*="linkedin.com/in/"]');
          if (linkedInLink) {
            const profile = linkedInLink.getAttribute('href');

            // Attach LinkedIn to the right person
            if (team.founder && team.founder.name === name && !team.founder.linkedIn) {
              team.founder.linkedIn = profile;
            } else if (team.ceo && team.ceo.name === name && !team.ceo.linkedIn) {
              team.ceo.linkedIn = profile;
            } else if (team.keyPeople.length > 0) {
              const person = team.keyPeople.find(p => p.name === name);
              if (person) {
                person.linkedIn = profile;
              }
            }
          }
        }
      });

      // === CEO DETECTION (if not found in team cards) ===

      if (!team.ceo) {
        const ceoPatterns = [
          /CEO[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i,
          /Chief Executive Officer[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i,
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}),\s*CEO/i
        ];

        for (const pattern of ceoPatterns) {
          const match = bodyText.match(pattern);
          if (match) {
            team.ceo = {
              name: match[1].trim(),
              title: 'CEO',
              source: 'text pattern',
              confidence: 0.7
            };
            break;
          }
        }
      }

      // === OWNER/PRESIDENT (small business fallback) ===

      if (!team.founder && !team.ceo) {
        const ownerPatterns = [
          /Owner[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i,
          /President[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/i,
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}),\s*Owner/i
        ];

        for (const pattern of ownerPatterns) {
          const match = bodyText.match(pattern);
          if (match) {
            team.founder = {
              name: match[1].trim(),
              title: 'Owner',
              source: 'text pattern',
              confidence: 0.6
            };
            break;
          }
        }
      }

      // === BIO/BACKGROUND EXTRACTION ===

      // If we found a founder or CEO, try to extract their bio
      if (team.founder) {
        const bio = extractBioForPerson(bodyText, team.founder.name);
        if (bio) team.founder.bio = bio;
      }

      if (team.ceo && team.ceo.name !== team.founder?.name) {
        const bio = extractBioForPerson(bodyText, team.ceo.name);
        if (bio) team.ceo.bio = bio;
      }

      // Helper function to extract bio snippet for a person
      function extractBioForPerson(text, name) {
        const nameIndex = text.indexOf(name);
        if (nameIndex === -1) return null;

        // Get 300 characters after the name
        const bioSnippet = text.substring(nameIndex, nameIndex + 300).trim();

        // Clean it up (remove the name itself and extra whitespace)
        return bioSnippet
          .replace(name, '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 200); // Cap at 200 chars
      }

      return team;
    });

    // Add metadata
    result.url = url;
    result.isTeamPage = isTeamPage(url);
    result.extractedAt = new Date().toISOString();

    // Calculate completeness score
    let completeness = 0;
    if (result.founder) completeness += 40;
    if (result.ceo) completeness += 30;
    if (result.keyPeople && result.keyPeople.length > 0) completeness += 20;
    if (result.founder?.linkedIn || result.ceo?.linkedIn) completeness += 10;

    result.completeness = completeness;

    return result;

  } catch (error) {
    console.error('Team extraction error:', error);
    return {
      url,
      founder: null,
      ceo: null,
      keyPeople: [],
      isTeamPage: false,
      completeness: 0,
      extractedAt: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Aggregate team info from multiple pages
 * @param {Array<Object>} teamResults - Array of results from extractTeamInfo
 * @returns {Object} Best aggregated team info
 */
export function aggregateTeamInfo(teamResults) {
  if (!teamResults || teamResults.length === 0) {
    return {
      founder: null,
      ceo: null,
      keyPeople: [],
      sources: [],
      confidence: 0
    };
  }

  // Find the result with the highest completeness
  const best = teamResults.reduce((prev, current) => {
    return (current.completeness > prev.completeness) ? current : prev;
  });

  // Collect all key people (deduplicate by name)
  const allKeyPeople = [];
  const seenNames = new Set();

  teamResults.forEach(result => {
    if (result.keyPeople) {
      result.keyPeople.forEach(person => {
        if (!seenNames.has(person.name)) {
          allKeyPeople.push(person);
          seenNames.add(person.name);
        }
      });
    }
  });

  return {
    founder: best.founder,
    ceo: best.ceo,
    keyPeople: allKeyPeople.slice(0, 5), // Top 5 key people
    sources: teamResults.map(r => r.url),
    confidence: best.completeness
  };
}

/**
 * Get the best contact person for outreach
 * Priority: Founder > CEO > First key person
 * @param {Object} teamInfo - Aggregated team info
 * @returns {Object|null} Best contact person
 */
export function getBestContactPerson(teamInfo) {
  if (!teamInfo) return null;

  // Prefer founder (most likely decision-maker for small businesses)
  if (teamInfo.founder) {
    return {
      ...teamInfo.founder,
      role: 'founder',
      firstName: teamInfo.founder.name.split(' ')[0]
    };
  }

  // Fallback to CEO
  if (teamInfo.ceo) {
    return {
      ...teamInfo.ceo,
      role: 'ceo',
      firstName: teamInfo.ceo.name.split(' ')[0]
    };
  }

  // Fallback to first key person (likely senior leadership)
  if (teamInfo.keyPeople && teamInfo.keyPeople.length > 0) {
    return {
      ...teamInfo.keyPeople[0],
      role: 'key_person',
      firstName: teamInfo.keyPeople[0].name.split(' ')[0]
    };
  }

  return null;
}

/**
 * Format team info for display
 * @param {Object} teamInfo - Aggregated team info
 * @returns {string} Formatted string
 */
export function formatTeamInfo(teamInfo) {
  if (!teamInfo) return 'No team information found';

  const lines = [];

  if (teamInfo.founder) {
    const linkedin = teamInfo.founder.linkedIn ? ` (${teamInfo.founder.linkedIn})` : '';
    lines.push(`Founder: ${teamInfo.founder.name}${linkedin}`);
    if (teamInfo.founder.bio) {
      lines.push(`  Bio: ${teamInfo.founder.bio}`);
    }
  }

  if (teamInfo.ceo && teamInfo.ceo.name !== teamInfo.founder?.name) {
    const linkedin = teamInfo.ceo.linkedIn ? ` (${teamInfo.ceo.linkedIn})` : '';
    lines.push(`CEO: ${teamInfo.ceo.name}${linkedin}`);
  }

  if (teamInfo.keyPeople && teamInfo.keyPeople.length > 0) {
    lines.push(`\nKey Team Members:`);
    teamInfo.keyPeople.slice(0, 3).forEach(person => {
      lines.push(`  - ${person.name}, ${person.title}`);
    });
  }

  return lines.length > 0 ? lines.join('\n') : 'No team information found';
}
