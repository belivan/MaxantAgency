/**
 * Check for Social Profile Mismatches
 *
 * Validates that:
 * - Facebook URLs are in facebook field (not instagram, etc.)
 * - Instagram URLs are in instagram field (not facebook, etc.)
 * - etc.
 */

import { supabase } from '../database/supabase-client.js';
import { detectSocialMediaUrl } from '../shared/url-validator.js';

async function checkSocialProfileMismatch() {
  console.log('\n🔍 CROSS-VALIDATION: Social Profile Fields\n');
  console.log('='  .repeat(60) + '\n');

  // Get all prospects with social profiles
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('*')
    .not('social_profiles', 'is', null);

  if (error) {
    console.error('Error fetching prospects:', error);
    process.exit(1);
  }

  console.log(`Checking ${prospects.length} prospects with social profiles...\n`);

  const mismatches = [];
  let totalChecks = 0;
  let totalCorrect = 0;

  for (const prospect of prospects) {
    if (!prospect.social_profiles || typeof prospect.social_profiles !== 'object') {
      continue;
    }

    const platforms = Object.keys(prospect.social_profiles);
    if (platforms.length === 0) continue;

    console.log(`📋 ${prospect.company_name}`);

    for (const declaredPlatform of platforms) {
      const url = prospect.social_profiles[declaredPlatform];

      if (!url) continue;

      totalChecks++;

      // Detect what platform this URL actually is
      const detected = detectSocialMediaUrl(url);

      if (!detected) {
        console.log(`   ⚠️  ${declaredPlatform}: ${url}`);
        console.log(`      (Could not detect platform - might be invalid URL)`);
        mismatches.push({
          company: prospect.company_name,
          id: prospect.id,
          declaredPlatform,
          url,
          detectedPlatform: 'unknown',
          issue: 'unrecognized_url'
        });
        continue;
      }

      // Check if declared platform matches detected platform
      if (detected.platform !== declaredPlatform) {
        console.log(`   🚨 MISMATCH: ${declaredPlatform} field contains ${detected.platform} URL!`);
        console.log(`      URL: ${url}`);
        console.log(`      Should be in: social_profiles.${detected.platform}`);

        mismatches.push({
          company: prospect.company_name,
          id: prospect.id,
          declaredPlatform,
          url,
          detectedPlatform: detected.platform,
          issue: 'platform_mismatch'
        });
      } else {
        console.log(`   ✅ ${declaredPlatform}: ${url}`);
        totalCorrect++;
      }
    }

    console.log('');
  }

  // Summary
  console.log('='  .repeat(60));
  console.log('\n📊 CROSS-VALIDATION SUMMARY\n');

  console.log(`Total Social Profile URLs Checked: ${totalChecks}`);
  console.log(`✅ Correctly Placed: ${totalCorrect}`);
  console.log(`🚨 Mismatches Found: ${mismatches.length}\n`);

  if (mismatches.length > 0) {
    console.log('🚨 ISSUES FOUND:\n');

    // Group by issue type
    const platformMismatches = mismatches.filter(m => m.issue === 'platform_mismatch');
    const unrecognizedUrls = mismatches.filter(m => m.issue === 'unrecognized_url');

    if (platformMismatches.length > 0) {
      console.log(`Platform Mismatches (${platformMismatches.length}):\n`);
      platformMismatches.forEach(m => {
        console.log(`   Company: ${m.company}`);
        console.log(`   Current: social_profiles.${m.declaredPlatform}`);
        console.log(`   Detected: ${m.detectedPlatform}`);
        console.log(`   URL: ${m.url}\n`);
      });
    }

    if (unrecognizedUrls.length > 0) {
      console.log(`Unrecognized URLs (${unrecognizedUrls.length}):\n`);
      unrecognizedUrls.forEach(m => {
        console.log(`   Company: ${m.company}`);
        console.log(`   Field: social_profiles.${m.declaredPlatform}`);
        console.log(`   URL: ${m.url}\n`);
      });
    }

    console.log('❌ CROSS-VALIDATION FAILED!');
    console.log('   Some social profile URLs are in the wrong fields.\n');
  } else {
    console.log('✅ CROSS-VALIDATION PASSED!');
    console.log('   All social profile URLs are correctly placed.\n');
  }

  return {
    totalChecks,
    totalCorrect,
    mismatches
  };
}

checkSocialProfileMismatch()
  .then((result) => {
    process.exit(result.mismatches.length > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
