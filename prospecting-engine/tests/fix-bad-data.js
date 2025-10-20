/**
 * Fix Data Quality Issues
 *
 * Finds prospects with social URLs in website field and fixes them
 */

import { supabase } from '../database/supabase-client.js';
import { validateWebsiteUrl } from '../shared/url-validator.js';

async function fixBadData() {
  console.log('\n🔧 FIXING DATA QUALITY ISSUES\n');
  console.log('='  .repeat(60) + '\n');

  // Get all prospects
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('*')
    .not('website', 'is', null);

  if (error) {
    console.error('Error fetching prospects:', error);
    process.exit(1);
  }

  console.log(`Checking ${prospects.length} prospects with websites...\n`);

  const fixes = [];

  for (const prospect of prospects) {
    const validation = validateWebsiteUrl(prospect.website);

    if (validation.socialProfile) {
      // Found a social URL in website field
      console.log(`❌ ISSUE FOUND: ${prospect.company_name}`);
      console.log(`   Current Website: ${prospect.website}`);
      console.log(`   Detected Platform: ${validation.socialProfile.platform}\n`);

      // Prepare fix
      const updatedSocialProfiles = prospect.social_profiles || {};
      updatedSocialProfiles[validation.socialProfile.platform] = validation.socialProfile.url;

      fixes.push({
        id: prospect.id,
        company: prospect.company_name,
        oldWebsite: prospect.website,
        newWebsite: null,
        newSocialProfiles: updatedSocialProfiles,
        platform: validation.socialProfile.platform
      });
    }
  }

  if (fixes.length === 0) {
    console.log('✅ No data quality issues found!\n');
    return;
  }

  console.log(`\n📋 FOUND ${fixes.length} ISSUES TO FIX:\n`);

  fixes.forEach((fix, i) => {
    console.log(`${i + 1}. ${fix.company}`);
    console.log(`   Move: ${fix.oldWebsite}`);
    console.log(`   To: social_profiles.${fix.platform}\n`);
  });

  console.log('\n🔄 Applying fixes...\n');

  for (const fix of fixes) {
    const { error } = await supabase
      .from('prospects')
      .update({
        website: null,
        social_profiles: fix.newSocialProfiles
      })
      .eq('id', fix.id);

    if (error) {
      console.error(`❌ Failed to fix ${fix.company}:`, error);
    } else {
      console.log(`✅ Fixed: ${fix.company}`);
    }
  }

  console.log(`\n✅ Fixed ${fixes.length} data quality issues!\n`);

  // Verify
  console.log('🔍 Verifying fixes...\n');

  for (const fix of fixes) {
    const { data, error } = await supabase
      .from('prospects')
      .select('company_name, website, social_profiles')
      .eq('id', fix.id)
      .single();

    if (!error && data) {
      console.log(`   ${data.company_name}:`);
      console.log(`   - Website: ${data.website || 'null ✅'}`);
      console.log(`   - ${fix.platform}: ${data.social_profiles[fix.platform]} ✅\n`);
    }
  }

  console.log('='  .repeat(60));
  console.log('✅ DATA QUALITY FIXES COMPLETE!\n');
}

fixBadData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
