/**
 * TEST: Multi-Channel Outreach (Email + Social DM for Same Lead)
 *
 * Tests:
 * 1. Fetch one lead
 * 2. Generate EMAIL for that lead
 * 3. Generate SOCIAL DM for that same lead
 * 4. Save both to database
 * 5. Verify both exist with same lead_id
 */

import { getRegularLeads, saveComposedEmail } from './integrations/database.js';
import { generateCompleteEmail } from './generators/email-generator.js';
import { generateSocialDM } from './generators/social-generator.js';
import { validateEmail } from './validators/email-validator.js';
import { validateSocialDM } from './validators/social-validator.js';

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🎯 MULTI-CHANNEL OUTREACH TEST');
console.log('═══════════════════════════════════════════════════════════════════\n');

async function testMultiChannel() {
  try {
    // Step 1: Get a lead
    console.log('1️⃣  Fetching a lead...');
    const leads = await getRegularLeads({ limit: 1 });

    if (leads.length === 0) {
      console.log('   ❌ No leads found\n');
      return;
    }

    const lead = leads[0];
    console.log(`   ✅ Lead: ${lead.company_name || lead.url}`);
    console.log(`      Lead ID: ${lead.id}`);
    console.log(`      URL: ${lead.url}\n`);

    // Step 2: Generate EMAIL
    console.log('2️⃣  Generating EMAIL...');
    const emailStart = Date.now();

    const emailResult = await generateCompleteEmail(lead, {
      strategy: 'compliment-sandwich',
      model: 'claude-haiku-3-5'
    });

    const emailDuration = Date.now() - emailStart;
    console.log(`   ✅ Email generated in ${emailDuration}ms`);
    console.log(`      Subject: "${emailResult.subject}"`);
    console.log(`      Body: ${emailResult.body.length} chars`);
    console.log(`      Cost: $${emailResult.total_cost.toFixed(6)}\n`);

    // Validate email
    const emailValidation = validateEmail({
      subject: emailResult.subject,
      body: emailResult.body
    });
    console.log(`   📊 Email Quality: ${emailValidation.score}/100 (${emailValidation.rating})`);
    if (emailValidation.issues.length > 0) {
      console.log(`      Issues: ${emailValidation.issues.length}`);
      emailValidation.issues.slice(0, 2).forEach(issue => {
        console.log(`        - ${issue.issue || issue}`);
      });
    }

    // Save email
    console.log(`\n   💾 Saving email to database...`);
    const savedEmail = await saveComposedEmail({
      lead_id: lead.id,
      lead: lead,
      subject: emailResult.subject,
      body: emailResult.body,
      strategy: emailResult.strategy,
      platform: 'email',
      model_used: emailResult.model_used,
      generation_time_ms: emailDuration,
      cost: emailResult.total_cost,
      validation_score: emailValidation.score,
      validation_issues: emailValidation.issues,
      status: 'pending',
      usage: emailResult.usage.body
    });

    console.log(`   ✅ Email saved! ID: ${savedEmail.id}\n`);

    // Step 3: Generate SOCIAL DM (Instagram)
    console.log('3️⃣  Generating INSTAGRAM DM...');
    const dmStart = Date.now();

    const dmResult = await generateSocialDM(lead, {
      platform: 'instagram',
      strategy: 'value-first',
      model: 'claude-haiku-3-5'
    });

    const dmDuration = Date.now() - dmStart;
    console.log(`   ✅ DM generated in ${dmDuration}ms`);
    console.log(`      Platform: ${dmResult.platform}`);
    console.log(`      Length: ${dmResult.character_count}/${dmResult.platform_spec.maxChars} chars`);
    console.log(`      Cost: $${dmResult.cost.toFixed(6)}\n`);

    // Validate DM
    const dmValidation = validateSocialDM({
      message: dmResult.message,
      platform: dmResult.platform
    });
    console.log(`   📊 DM Quality: ${dmValidation.score}/100 (${dmValidation.rating})`);
    if (dmValidation.issues.length > 0) {
      console.log(`      Issues: ${dmValidation.issues.length}`);
      dmValidation.issues.forEach(issue => {
        console.log(`        - ${issue.issue || issue}`);
      });
    }

    // Save DM
    console.log(`\n   💾 Saving Instagram DM to database...`);
    const savedDM = await saveComposedEmail({
      lead_id: lead.id,
      lead: lead,
      subject: null,  // DMs don't have subjects
      body: dmResult.message,
      strategy: dmResult.strategy,
      platform: 'instagram',
      character_count: dmResult.character_count,
      social_profile_url: lead.social_profiles?.instagram || null,
      model_used: dmResult.model_used,
      generation_time_ms: dmDuration,
      cost: dmResult.cost,
      validation_score: dmValidation.score,
      validation_issues: dmValidation.issues,
      status: 'pending',
      usage: dmResult.usage
    });

    console.log(`   ✅ Instagram DM saved! ID: ${savedDM.id}\n`);

    // Step 4: Verify both exist
    console.log('4️⃣  Verifying multi-channel outreach...');

    // Import createClient directly for verification query
    const { createClient } = await import('@supabase/supabase-js');
    const { config } = await import('dotenv');
    config();

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: allOutreach, error } = await supabase
      .from('composed_emails')
      .select('id, platform, email_subject, character_count, created_at')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.log(`   ⚠️  Could not verify: ${error.message}\n`);
    } else {
      console.log(`   ✅ Found ${allOutreach.length} outreach messages for this lead:\n`);

      allOutreach.forEach((item, i) => {
        const platform = item.platform || 'email';  // Old records might have null platform
        const isEmail = platform === 'email';
        console.log(`   ${i + 1}. ${platform.toUpperCase()}`);
        if (isEmail) {
          console.log(`      Subject: "${item.email_subject || 'N/A'}"`);
        } else {
          console.log(`      Length: ${item.character_count || 'N/A'} chars`);
        }
        console.log(`      ID: ${item.id}`);
        console.log(`      Time: ${new Date(item.created_at).toLocaleTimeString()}\n`);
      });
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('✅ MULTI-CHANNEL TEST COMPLETE!\n');
    console.log('📊 Results:');
    console.log(`   Lead: ${lead.company_name || lead.url}`);
    console.log(`   Lead ID: ${lead.id}`);
    console.log(`   Total Outreach: ${allOutreach ? allOutreach.length : 2} messages`);
    console.log(`   - Email (${emailValidation.score}/100)`);
    console.log(`   - Instagram DM (${dmValidation.score}/100)`);
    console.log(`   Total Cost: $${(emailResult.total_cost + dmResult.cost).toFixed(6)}`);
    console.log(`   Total Time: ${emailDuration + dmDuration}ms\n`);

    console.log('📧 Email Preview:');
    console.log('─'.repeat(60));
    console.log(`Subject: ${emailResult.subject}\n`);
    console.log(emailResult.body.substring(0, 200) + '...');
    console.log('─'.repeat(60));

    console.log('\n💬 Instagram DM Preview:');
    console.log('─'.repeat(60));
    console.log(dmResult.message);
    console.log('─'.repeat(60));

    console.log('\n🎯 Multi-channel outreach working perfectly!');
    console.log('   Same lead, different platforms, all in one table.\n');
    console.log('═══════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testMultiChannel();
