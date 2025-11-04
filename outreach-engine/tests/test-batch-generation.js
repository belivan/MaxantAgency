/**
 * BATCH END-TO-END TEST
 * Generate emails and DMs for multiple leads
 */

import { getRegularLeads, saveComposedEmail } from './integrations/database.js';
import { generateCompleteEmail } from './generators/email-generator.js';
import { generateSocialDM } from './generators/social-generator.js';
import { validateEmail } from './validators/email-validator.js';
import { validateSocialDM } from './validators/social-validator.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🚀 BATCH GENERATION - End-to-End Test');
console.log('═══════════════════════════════════════════════════════════════════\n');

const results = {
  emails: [],
  socialDMs: [],
  totalCost: 0,
  totalTime: 0,
  errors: []
};

async function generateEmail(lead, index) {
  const startTime = Date.now();

  try {
    console.log(`\n📧 [${index}] Generating EMAIL for: ${lead.company_name || lead.url}`);

    const emailResult = await generateCompleteEmail(lead, {
      strategy: 'compliment-sandwich',
      model: 'claude-haiku-4-5'
    });

    const validation = validateEmail({
      subject: emailResult.subject,
      body: emailResult.body
    });

    const duration = Date.now() - startTime;

    console.log(`   ✅ Generated in ${duration}ms`);
    console.log(`   Subject: "${emailResult.subject}"`);
    console.log(`   Quality: ${validation.score}/100 (${validation.rating})`);
    console.log(`   Cost: $${emailResult.total_cost.toFixed(6)}`);

    // Save to database
    const saved = await saveComposedEmail({
      lead_id: lead.id,
      lead: lead,
      subject: emailResult.subject,
      body: emailResult.body,
      strategy: emailResult.strategy,
      platform: 'email',
      model_used: emailResult.model_used,
      generation_time_ms: duration,
      cost: emailResult.total_cost,
      validation_score: validation.score,
      validation_issues: validation.issues,
      status: 'pending',
      usage: emailResult.usage.body
    });

    results.emails.push({
      lead: lead.company_name || lead.url,
      subject: emailResult.subject,
      quality: validation.score,
      cost: emailResult.total_cost,
      time: duration,
      id: saved.id
    });

    results.totalCost += emailResult.total_cost;
    results.totalTime += duration;

  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    results.errors.push({ lead: lead.company_name || lead.url, type: 'email', error: error.message });
  }
}

async function generateDM(lead, platform, index) {
  const startTime = Date.now();

  try {
    console.log(`\n💬 [${index}] Generating ${platform.toUpperCase()} DM for: ${lead.company_name || lead.url}`);

    const dmResult = await generateSocialDM(lead, {
      platform: platform,
      strategy: 'value-first',
      model: 'claude-haiku-4-5'
    });

    const validation = validateSocialDM({
      message: dmResult.message,
      platform: dmResult.platform
    });

    const duration = Date.now() - startTime;

    console.log(`   ✅ Generated in ${duration}ms`);
    console.log(`   Length: ${dmResult.character_count}/${dmResult.platform_spec.maxChars} chars`);
    console.log(`   Quality: ${validation.score}/100 (${validation.rating})`);
    console.log(`   Cost: $${dmResult.cost.toFixed(6)}`);

    // Save to database
    const saved = await saveComposedEmail({
      lead_id: lead.id,
      lead: lead,
      subject: null,
      body: dmResult.message,
      strategy: dmResult.strategy,
      platform: platform,
      character_count: dmResult.character_count,
      social_profile_url: lead.social_profiles?.[platform] || null,
      model_used: dmResult.model_used,
      generation_time_ms: duration,
      cost: dmResult.cost,
      validation_score: validation.score,
      validation_issues: validation.issues,
      status: 'pending',
      usage: dmResult.usage
    });

    results.socialDMs.push({
      lead: lead.company_name || lead.url,
      platform: platform,
      length: dmResult.character_count,
      quality: validation.score,
      cost: dmResult.cost,
      time: duration,
      id: saved.id
    });

    results.totalCost += dmResult.cost;
    results.totalTime += duration;

  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    results.errors.push({ lead: lead.company_name || lead.url, type: platform, error: error.message });
  }
}

async function main() {
  try {
    // Fetch leads
    console.log('1️⃣  Fetching leads...\n');
    const leads = await getRegularLeads({ limit: 3 });

    if (leads.length === 0) {
      console.log('❌ No leads found in database\n');
      return;
    }

    console.log(`✅ Found ${leads.length} leads\n`);
    leads.forEach((lead, i) => {
      console.log(`   ${i + 1}. ${lead.company_name || lead.url}`);
    });

    console.log('\n2️⃣  Generating outreach messages...\n');
    console.log('═'.repeat(60));

    // Lead 1: Email only
    if (leads[0]) {
      await generateEmail(leads[0], 1);
    }

    // Lead 2: Instagram DM only
    if (leads[1]) {
      await generateDM(leads[1], 'instagram', 2);
    }

    // Lead 3: Both email AND LinkedIn DM (multi-channel)
    if (leads[2]) {
      await generateEmail(leads[2], 3);
      await generateDM(leads[2], 'linkedin', 4);
    }

    console.log('\n═'.repeat(60));

    // Summary
    console.log('\n3️⃣  Verifying database...\n');

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: allOutreach, error } = await supabase
      .from('composed_outreach')
      .select('id, platform, email_subject, character_count, quality_score, created_at')
      .in('lead_id', leads.map(l => l.id))
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && allOutreach) {
      console.log(`✅ Found ${allOutreach.length} recent outreach messages in database:\n`);

      const grouped = {};
      allOutreach.forEach(item => {
        const platform = item.platform || 'email';
        grouped[platform] = (grouped[platform] || 0) + 1;
      });

      Object.entries(grouped).forEach(([platform, count]) => {
        console.log(`   ${platform.toUpperCase()}: ${count} messages`);
      });
    }

    // Final Summary
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('✅ BATCH GENERATION COMPLETE!\n');

    console.log('📊 Summary:');
    console.log(`   Emails generated: ${results.emails.length}`);
    console.log(`   Social DMs generated: ${results.socialDMs.length}`);
    console.log(`   Total messages: ${results.emails.length + results.socialDMs.length}`);
    console.log(`   Errors: ${results.errors.length}`);
    console.log(`   Total cost: $${results.totalCost.toFixed(6)}`);
    console.log(`   Total time: ${(results.totalTime / 1000).toFixed(1)}s\n`);

    if (results.emails.length > 0) {
      console.log('📧 Emails:');
      results.emails.forEach((email, i) => {
        console.log(`   ${i + 1}. ${email.lead}`);
        console.log(`      Subject: "${email.subject}"`);
        console.log(`      Quality: ${email.quality}/100 | Cost: $${email.cost.toFixed(6)}`);
        console.log(`      ID: ${email.id}\n`);
      });
    }

    if (results.socialDMs.length > 0) {
      console.log('💬 Social DMs:');
      results.socialDMs.forEach((dm, i) => {
        console.log(`   ${i + 1}. ${dm.lead} (${dm.platform.toUpperCase()})`);
        console.log(`      Length: ${dm.length} chars`);
        console.log(`      Quality: ${dm.quality}/100 | Cost: $${dm.cost.toFixed(6)}`);
        console.log(`      ID: ${dm.id}\n`);
      });
    }

    if (results.errors.length > 0) {
      console.log('⚠️  Errors:');
      results.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.lead} (${err.type}): ${err.error}`);
      });
      console.log('');
    }

    console.log('🎯 All outreach saved to composed_outreach table!');
    console.log('   Query by platform: WHERE platform = \'email\' or \'instagram\'');
    console.log('   Multi-channel leads have multiple rows with same lead_id\n');

    console.log('═══════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

main();
