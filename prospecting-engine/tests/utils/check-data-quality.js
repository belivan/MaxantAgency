/**
 * Check for data quality issues in recent prospects
 * Specifically looking for:
 * - Social URLs in website field
 * - Missing or incorrect data mapping
 */

import { supabase } from '../database/supabase-client.js';

async function checkDataQuality() {
  console.log('\n🔍 DATA QUALITY CHECK - Recent Prospects\n');
  console.log('='  .repeat(60) + '\n');

  // Get recent prospects
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(15);

  if (error) {
    console.error('Error fetching prospects:', error);
    process.exit(1);
  }

  const issues = {
    socialInWebsite: [],
    missingWebsite: [],
    suspiciousData: [],
    goodData: []
  };

  prospects.forEach((p, i) => {
    let hasIssue = false;

    console.log(`${i + 1}. ${p.company_name}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   Website: ${p.website || 'N/A'}`);

    // Check if website field contains social media URL
    if (p.website && (
      p.website.includes('facebook.com') ||
      p.website.includes('instagram.com') ||
      p.website.includes('twitter.com') ||
      p.website.includes('linkedin.com') ||
      p.website.includes('youtube.com')
    )) {
      console.log(`   🚨 ISSUE: Website field contains social media URL!`);
      issues.socialInWebsite.push({
        company: p.company_name,
        website: p.website
      });
      hasIssue = true;
    }

    // Check social profiles
    if (p.social_profiles && typeof p.social_profiles === 'object') {
      const platforms = Object.keys(p.social_profiles).filter(k => p.social_profiles[k]);
      if (platforms.length > 0) {
        console.log(`   Social Profiles: ${platforms.join(', ')}`);

        // Check if social URL is duplicated in website
        platforms.forEach(platform => {
          const socialUrl = p.social_profiles[platform];
          if (p.website && p.website === socialUrl) {
            console.log(`   🚨 ISSUE: Website field duplicates ${platform} URL!`);
            hasIssue = true;
          }
        });
      }
    }

    // Check for missing website
    if (!p.website || p.website === 'N/A') {
      issues.missingWebsite.push(p.company_name);
    }

    // Check industry
    console.log(`   Industry: ${p.industry || 'N/A'}`);

    // Check contact info
    if (p.contact_email) console.log(`   Email: ${p.contact_email}`);
    if (p.contact_phone) console.log(`   Phone: ${p.contact_phone}`);

    // Check website status
    console.log(`   Website Status: ${p.website_status || 'N/A'}`);

    if (!hasIssue) {
      issues.goodData.push(p.company_name);
    }

    console.log('');
  });

  // Summary
  console.log('=' .repeat(60));
  console.log('\n📊 SUMMARY\n');

  console.log(`Total Prospects Checked: ${prospects.length}`);
  console.log(`✅ Good Data: ${issues.goodData.length}`);
  console.log(`⚠️  Missing Website: ${issues.missingWebsite.length}`);
  console.log(`🚨 Social URL in Website Field: ${issues.socialInWebsite.length}\n`);

  if (issues.socialInWebsite.length > 0) {
    console.log('🚨 CRITICAL ISSUES FOUND:\n');
    issues.socialInWebsite.forEach(issue => {
      console.log(`   Company: ${issue.company}`);
      console.log(`   Wrong Website Field: ${issue.website}`);
      console.log('');
    });
  }

  if (issues.socialInWebsite.length > 0) {
    console.log('❌ DATA QUALITY ISSUE DETECTED!');
    console.log('   Social media URLs should NOT be in the website field.');
    console.log('   They should be in social_profiles object.\n');
  } else {
    console.log('✅ No data quality issues found!\n');
  }
}

checkDataQuality()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
