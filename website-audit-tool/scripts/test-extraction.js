/**
 * Test Script for Enhanced Extraction Modules
 * Tests social-finder, team-scraper, and content-scraper on sample websites
 */

import { chromium } from 'playwright';
import { extractSocialProfiles, getBestLinkedInProfile, formatSocialProfiles } from './modules/social-finder.js';
import { extractTeamInfo, getBestContactPerson, formatTeamInfo } from './modules/team-scraper.js';
import { extractContentInfo, getMostRecentPost, formatContentInfo } from './modules/content-scraper.js';

/**
 * Test extraction on a single website
 */
async function testWebsite(url) {
  console.log('\n' + '='.repeat(80));
  console.log(`Testing: ${url}`);
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to the website
    console.log(`\n⏳ Loading ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✓ Page loaded');

    // Get domain for filtering
    const currentDomain = new URL(url).hostname;

    // Test 0: Company Name Extraction
    console.log('\n🏢 COMPANY INFORMATION');
    console.log('-'.repeat(80));
    const { extractCompanyInfo, formatCompanyInfo } = await import('./modules/company-intel.js');
    const companyInfo = await extractCompanyInfo(page, url);

    console.log(`Company Name: ${companyInfo.name}`);
    console.log(`Confidence: ${companyInfo.confidence}%`);
    if (companyInfo.foundingYear) {
      console.log(`Founded: ${companyInfo.foundingYear}`);
    }
    if (companyInfo.location) {
      console.log(`Location: ${companyInfo.location}`);
    }
    if (companyInfo.description) {
      console.log(`Description: ${companyInfo.description.substring(0, 100)}...`);
    }

    // Test 1: Contact/Email Extraction (from existing contact module)
    console.log('\n📧 CONTACT & EMAIL EXTRACTION');
    console.log('-'.repeat(80));
    const { extractFromPage } = await import('./modules/contact.js');
    const contactResult = await extractFromPage(page, url);

    console.log(`Emails found: ${contactResult.emails.length}`);
    if (contactResult.emails.length > 0) {
      contactResult.emails.forEach((email, i) => {
        console.log(`  ${i + 1}. ${email.value} (source: ${email.source})`);
      });
    } else {
      console.log('❌ No emails found');
    }

    console.log(`Phone numbers found: ${contactResult.phones.length}`);
    if (contactResult.phones.length > 0) {
      contactResult.phones.forEach((phone, i) => {
        console.log(`  ${i + 1}. ${phone.value}`);
      });
    }

    console.log(`Contact pages found: ${contactResult.contactPages.length}`);

    // Also check contact page for emails
    if (contactResult.contactPages.length > 0) {
      const contactPageUrl = contactResult.contactPages[0];
      if (contactPageUrl && contactPageUrl.includes(currentDomain.replace('www.', ''))) {
        try {
          console.log(`\n⏳ Checking contact page: ${contactPageUrl}...`);
          await page.goto(contactPageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          const contactPageResult = await extractFromPage(page, contactPageUrl);

          if (contactPageResult.emails.length > 0) {
            console.log(`✓ Found ${contactPageResult.emails.length} additional emails on contact page:`);
            contactPageResult.emails.forEach((email, i) => {
              console.log(`  ${i + 1}. ${email.value} (source: ${email.source})`);
            });
          }
          if (contactPageResult.phones.length > 0) {
            console.log(`✓ Found ${contactPageResult.phones.length} phone numbers on contact page:`);
            contactPageResult.phones.forEach((phone, i) => {
              console.log(`  ${i + 1}. ${phone.value}`);
            });
          }

          // Go back to homepage for next tests
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (e) {
          console.log(`⚠️  Could not check contact page: ${e.message}`);
        }
      }
    }

    // Test 1: Social Media Extraction
    console.log('\n📱 SOCIAL MEDIA EXTRACTION');
    console.log('-'.repeat(80));
    const socialResult = await extractSocialProfiles(page, url);

    console.log(`Total platforms found: ${socialResult.profiles.summary.totalFound}`);
    console.log(`Platforms: ${socialResult.profiles.summary.platforms.join(', ') || 'None'}`);

    if (socialResult.profiles.linkedIn.hasCompany) {
      console.log(`✓ LinkedIn Company: ${socialResult.profiles.linkedIn.company}`);
    }
    if (socialResult.profiles.linkedIn.hasPersonal) {
      console.log(`✓ LinkedIn Personal: ${socialResult.profiles.linkedIn.personal.length} profiles found`);
      socialResult.profiles.linkedIn.personal.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p}`);
      });
    }
    if (socialResult.profiles.instagram.found) {
      console.log(`✓ Instagram: ${socialResult.profiles.instagram.handle} - ${socialResult.profiles.instagram.url}`);
    }
    if (socialResult.profiles.twitter.found) {
      console.log(`✓ Twitter: ${socialResult.profiles.twitter.handle} - ${socialResult.profiles.twitter.url}`);
    }
    if (socialResult.profiles.facebook.found) {
      console.log(`✓ Facebook: ${socialResult.profiles.facebook.url}`);
    }
    if (socialResult.profiles.youtube.found) {
      console.log(`✓ YouTube: ${socialResult.profiles.youtube.url}`);
    }

    if (socialResult.profiles.summary.totalFound === 0) {
      console.log('❌ No social media profiles found');
    }

    // Test 2: Team/Leadership Extraction
    console.log('\n👥 TEAM & LEADERSHIP EXTRACTION');
    console.log('-'.repeat(80));

    // First, try to find team/about pages
    const pageLinks = await page.evaluate((domain) => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const teamPatterns = [
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

      return links.map(link => link.href).filter(href => {
        if (!href) return false;

        // Only include links from the same domain
        try {
          const linkDomain = new URL(href).hostname;
          if (!linkDomain.includes(domain.replace('www.', ''))) return false;
        } catch (e) {
          return false;
        }

        return teamPatterns.some(pattern => pattern.test(href));
      });
    }, currentDomain);

    const uniquePages = [...new Set(pageLinks)].slice(0, 3); // Check up to 3 team pages

    console.log(`Found ${uniquePages.length} potential team/about pages`);
    if (uniquePages.length > 0) {
      uniquePages.forEach((pageUrl, i) => {
        console.log(`  ${i + 1}. ${pageUrl}`);
      });
    }

    // Extract from homepage first
    let teamResult = await extractTeamInfo(page, url);
    const teamResults = [teamResult];

    // Then check team/about pages
    for (const teamPageUrl of uniquePages) {
      try {
        console.log(`\n⏳ Checking ${teamPageUrl}...`);
        await page.goto(teamPageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // Debug: Check what team cards exist on the page
        const teamCardDebug = await page.evaluate(() => {
          const selectors = [
            '.team-member',
            '.staff-profile',
            '[class*="employee"]',
            '[class*="team-card"]',
            '[class*="person-card"]',
            'article[class*="team"]'
          ];

          let totalCards = 0;
          const samples = [];

          selectors.forEach(selector => {
            const cards = document.querySelectorAll(selector);
            if (cards.length > 0) {
              totalCards += cards.length;
              const firstCard = cards[0];
              samples.push({
                selector,
                count: cards.length,
                sampleHTML: firstCard.outerHTML.substring(0, 300)
              });
            }
          });

          return { totalCards, samples };
        });

        console.log(`   DEBUG: Found ${teamCardDebug.totalCards} team card elements`);
        if (teamCardDebug.samples.length > 0) {
          console.log(`   Sample HTML structures found:`);
          teamCardDebug.samples.forEach(s => {
            console.log(`     - ${s.selector}: ${s.count} cards`);
          });
        }

        const teamPageResult = await extractTeamInfo(page, teamPageUrl);
        teamResults.push(teamPageResult);
        console.log(`✓ Extracted from ${teamPageUrl} (completeness: ${teamPageResult.completeness}/100)`);

        // Debug: Show what was found
        if (teamPageResult.founder) {
          console.log(`   Found founder: ${teamPageResult.founder.name}`);
        }
        if (teamPageResult.ceo) {
          console.log(`   Found CEO: ${teamPageResult.ceo.name}`);
        }
        if (teamPageResult.keyPeople && teamPageResult.keyPeople.length > 0) {
          console.log(`   Found ${teamPageResult.keyPeople.length} team members`);
          teamPageResult.keyPeople.slice(0, 3).forEach(p => {
            console.log(`     - ${p.name}: ${p.title}`);
          });
        }
      } catch (e) {
        console.log(`⚠️  Could not check ${teamPageUrl}: ${e.message}`);
      }
    }

    // Import aggregation function
    const { aggregateTeamInfo } = await import('./modules/team-scraper.js');
    const aggregatedTeam = aggregateTeamInfo(teamResults);

    // Merge aggregated data back
    teamResult = {
      ...aggregatedTeam,
      isTeamPage: teamResults.some(r => r.isTeamPage),
      completeness: aggregatedTeam.confidence || 0
    };

    console.log(`Team pages checked: ${teamResults.length}`);
    console.log(`Completeness Score: ${teamResult.completeness}/100`);

    if (teamResult.founder) {
      console.log(`✓ Founder: ${teamResult.founder.name}`);
      console.log(`  Title: ${teamResult.founder.title}`);
      console.log(`  Source: ${teamResult.founder.source}`);
      console.log(`  Confidence: ${teamResult.founder.confidence}`);
      if (teamResult.founder.linkedIn) {
        console.log(`  LinkedIn: ${teamResult.founder.linkedIn}`);
      }
      if (teamResult.founder.bio) {
        console.log(`  Bio: ${teamResult.founder.bio.substring(0, 150)}...`);
      }
    } else {
      console.log('⚠️  Founder not found');
    }

    if (teamResult.ceo && teamResult.ceo.name !== teamResult.founder?.name) {
      console.log(`✓ CEO: ${teamResult.ceo.name}`);
      console.log(`  Title: ${teamResult.ceo.title}`);
      if (teamResult.ceo.linkedIn) {
        console.log(`  LinkedIn: ${teamResult.ceo.linkedIn}`);
      }
    }

    if (teamResult.keyPeople && teamResult.keyPeople.length > 0) {
      console.log(`✓ Key People: ${teamResult.keyPeople.length} found`);
      teamResult.keyPeople.forEach((person, i) => {
        console.log(`  ${i + 1}. ${person.name} - ${person.title}`);
        if (person.linkedIn) {
          console.log(`     LinkedIn: ${person.linkedIn}`);
        }
      });
    }

    const bestContact = getBestContactPerson(teamResult);
    if (bestContact) {
      console.log(`\n🎯 Best Contact for Outreach:`);
      console.log(`   Name: ${bestContact.name}`);
      console.log(`   First Name: ${bestContact.firstName}`);
      console.log(`   Title: ${bestContact.title}`);
      console.log(`   Role: ${bestContact.role}`);
      if (bestContact.linkedIn) {
        console.log(`   LinkedIn: ${bestContact.linkedIn}`);
      }
    } else {
      console.log('❌ No contact person identified');
    }

    // Test 3: Content/Blog Extraction
    console.log('\n📝 CONTENT & BLOG EXTRACTION');
    console.log('-'.repeat(80));
    const contentResult = await extractContentInfo(page, url);

    console.log(`Has Content: ${contentResult.hasContentSection ? 'Yes' : 'No'}`);
    console.log(`Content Type: ${contentResult.contentType || 'N/A'}`);
    console.log(`Posts Found: ${contentResult.recentPosts.length}`);
    console.log(`Freshness Score: ${contentResult.freshness}/100`);
    if (contentResult.lastUpdate) {
      console.log(`Last Update: ${contentResult.lastUpdate}`);
    }

    if (contentResult.recentPosts.length > 0) {
      console.log(`\n📰 Recent Posts (showing first 5):`);
      contentResult.recentPosts.slice(0, 5).forEach((post, i) => {
        console.log(`\n  ${i + 1}. ${post.title}`);
        if (post.date) {
          console.log(`     Date: ${post.date}`);
        }
        if (post.url) {
          console.log(`     URL: ${post.url}`);
        }
        if (post.summary) {
          console.log(`     Summary: ${post.summary.substring(0, 100)}...`);
        }
        console.log(`     Source: ${post.source}`);
      });

      const mostRecent = getMostRecentPost(contentResult);
      if (mostRecent) {
        console.log(`\n🎯 Most Recent Post (for conversation hook):`);
        console.log(`   "${mostRecent.title}"`);
        if (mostRecent.date) {
          console.log(`   Published: ${mostRecent.date}`);
        }
      }
    } else {
      console.log('❌ No blog/news content found');
    }

    // Summary Report
    console.log('\n' + '='.repeat(80));
    console.log('EXTRACTION SUMMARY');
    console.log('='.repeat(80));

    const scores = {
      social: socialResult.profiles.summary.totalFound * 20, // Max 100 if 5+ platforms
      team: teamResult.completeness,
      content: contentResult.freshness
    };

    const overallScore = Math.round((scores.social + scores.team + scores.content) / 3);

    console.log(`Social Media: ${scores.social}/100 (${socialResult.profiles.summary.totalFound} platforms)`);
    console.log(`Team Info: ${scores.team}/100`);
    console.log(`Content: ${scores.content}/100 (${contentResult.recentPosts.length} posts)`);
    console.log(`\n🎯 OVERALL EXTRACTION SCORE: ${overallScore}/100`);

    // Personalization readiness
    if (overallScore >= 70) {
      console.log('✅ EXCELLENT - Ready for highly personalized outreach');
    } else if (overallScore >= 50) {
      console.log('✓ GOOD - Decent personalization data available');
    } else if (overallScore >= 30) {
      console.log('⚠️  FAIR - Some personalization possible');
    } else {
      console.log('❌ POOR - Limited personalization data');
    }

    // What we can personalize
    console.log('\n📧 Personalization Opportunities:');
    const opportunities = [];

    if (bestContact?.firstName) {
      opportunities.push(`✓ Address by name: "Hi ${bestContact.firstName}"`);
    }
    if (bestContact?.title) {
      opportunities.push(`✓ Reference role: "${bestContact.title}"`);
    }
    if (teamResult.founder?.bio) {
      opportunities.push(`✓ Mention founder background`);
    }
    const mostRecent = getMostRecentPost(contentResult);
    if (mostRecent) {
      opportunities.push(`✓ Reference recent post: "${mostRecent.title}"`);
    }
    if (socialResult.profiles.linkedIn.hasCompany) {
      opportunities.push(`✓ LinkedIn connection request possible`);
    }
    if (socialResult.profiles.instagram.found) {
      opportunities.push(`✓ Instagram follow/DM possible`);
    }

    if (opportunities.length > 0) {
      opportunities.forEach(opp => console.log(`  ${opp}`));
    } else {
      console.log('  ⚠️  Limited personalization opportunities found');
    }

  } catch (error) {
    console.error('❌ Error testing website:', error.message);
  } finally {
    await browser.close();
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('\n🧪 TESTING ENHANCED EXTRACTION MODULES');
  console.log('Testing social-finder.js, team-scraper.js, content-scraper.js\n');

  // Get URLs from command line or use defaults
  const testUrls = process.argv.slice(2);

  if (testUrls.length === 0) {
    console.log('Usage: node test-extraction.js <url1> <url2> ...');
    console.log('\nExample: node test-extraction.js https://example.com https://another.com');
    console.log('\nNo URLs provided. Using sample sites:');

    // Default test sites
    testUrls.push(
      'https://maksant.com',
      'https://anthropic.com',
      'https://openai.com'
    );
  }

  console.log(`Testing ${testUrls.length} website(s):\n`);
  testUrls.forEach((url, i) => {
    console.log(`${i + 1}. ${url}`);
  });

  // Test each website
  for (const url of testUrls) {
    await testWebsite(url);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ ALL TESTS COMPLETE');
  console.log('='.repeat(80) + '\n');
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
