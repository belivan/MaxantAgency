/**
 * END-TO-END TEST - Complete Outreach Engine Workflow
 *
 * Tests the full pipeline:
 * 1. Fetch real lead from database
 * 2. Generate email (subject + body)
 * 3. Validate email quality
 * 4. Save to database
 * 5. Sync to Notion (if configured)
 */

import { getRegularLeads, getSocialLeads, saveComposedEmail } from './integrations/database.js';
import { generateCompleteEmail } from './generators/email-generator.js';
import { generateSocialDM } from './generators/social-generator.js';
import { validateEmail } from './validators/email-validator.js';
import { validateSocialDM } from './validators/social-validator.js';
import { syncEmailToNotion } from './integrations/notion.js';

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🚀 END-TO-END TEST - Outreach Engine');
console.log('═══════════════════════════════════════════════════════════════════\n');

async function testEmailWorkflow() {
  console.log('📧 EMAIL WORKFLOW TEST\n');
  console.log('─'.repeat(60));

  try {
    // Step 1: Fetch a real lead
    console.log('\n1️⃣  Fetching real lead from database...');
    const leads = await getRegularLeads({ limit: 1 });

    if (leads.length === 0) {
      console.log('   ⚠️  No leads found in database');
      return { success: false, reason: 'No leads available' };
    }

    const lead = leads[0];
    console.log(`   ✅ Found lead: ${lead.company_name || lead.url}`);
    console.log(`      URL: ${lead.url}`);
    console.log(`      Grade: ${lead.lead_grade || lead.website_grade || 'N/A'}`);
    console.log(`      Industry: ${lead.industry || 'N/A'}`);

    // Step 2: Generate complete email
    console.log('\n2️⃣  Generating email (subject + body)...');
    const startTime = Date.now();

    const emailResult = await generateCompleteEmail(lead, {
      strategy: 'compliment-sandwich',
      model: 'claude-haiku-4-5'
    });

    const duration = Date.now() - startTime;
    console.log(`   ✅ Email generated in ${duration}ms`);
    console.log(`      Subject: "${emailResult.subject}"`);
    console.log(`      Body length: ${emailResult.body.length} chars`);
    console.log(`      Strategy: ${emailResult.strategy}`);
    console.log(`      Cost: $${emailResult.total_cost.toFixed(6)}`);

    // Step 3: Validate email
    console.log('\n3️⃣  Validating email quality...');
    const validation = validateEmail({
      subject: emailResult.subject,
      body: emailResult.body
    });

    console.log(`   ✅ Validation score: ${validation.score}/100 (${validation.rating})`);
    if (validation.issues.length > 0) {
      console.log(`      Issues: ${validation.issues.length}`);
      validation.issues.slice(0, 3).forEach(issue => {
        console.log(`        - ${issue}`);
      });
    } else {
      console.log(`      No issues found!`);
    }

    // Step 4: Save to database
    console.log('\n4️⃣  Saving to database...');
    const savedEmail = await saveComposedEmail({
      lead_id: lead.id,
      lead: lead,
      subject: emailResult.subject,
      body: emailResult.body,
      strategy: emailResult.strategy,
      platform: 'email',
      model_used: emailResult.model_used,
      generation_time_ms: emailResult.generation_time_ms,
      cost: emailResult.total_cost,
      validation_score: validation.score,
      validation_issues: validation.issues,
      status: 'pending',  // Use 'pending' - emails stay as drafts, never sent
      usage: emailResult.usage.body
    });

    console.log(`   ✅ Saved to database`);
    console.log(`      Email ID: ${savedEmail.id}`);

    // Step 5: Sync to Notion
    console.log('\n5️⃣  Syncing to Notion...');
    try {
      const notionResult = await syncEmailToNotion({
        ...savedEmail,
        subject: emailResult.subject,
        body: emailResult.body,
        validation_score: validation.score,
        cost: emailResult.total_cost,
        platform: 'email'
      }, lead);

      if (notionResult && notionResult.skipped) {
        console.log(`   ⚠️  Notion sync skipped: ${notionResult.reason}`);
      } else if (notionResult && notionResult.id) {
        console.log(`   ✅ Synced to Notion`);
        console.log(`      Page ID: ${notionResult.id}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Notion sync failed: ${error.message}`);
    }

    // Summary
    console.log('\n' + '─'.repeat(60));
    console.log('✅ EMAIL WORKFLOW COMPLETE!\n');
    console.log('📊 Summary:');
    console.log(`   Lead: ${lead.company_name || lead.url}`);
    console.log(`   Subject: "${emailResult.subject}"`);
    console.log(`   Quality: ${validation.score}/100 (${validation.rating})`);
    console.log(`   Cost: $${emailResult.total_cost.toFixed(6)}`);
    console.log(`   Time: ${duration}ms`);
    console.log(`   Database ID: ${savedEmail.id}`);
    console.log('\n📧 Generated Email:\n');
    console.log('─'.repeat(60));
    console.log(`Subject: ${emailResult.subject}\n`);
    console.log(emailResult.body);
    console.log('─'.repeat(60));

    return { success: true, email: savedEmail };

  } catch (error) {
    console.error('\n❌ Email workflow failed:');
    console.error(`   ${error.message}`);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

async function testSocialWorkflow() {
  console.log('\n\n💬 SOCIAL DM WORKFLOW TEST\n');
  console.log('─'.repeat(60));

  try {
    // Step 1: Fetch a social lead
    console.log('\n1️⃣  Fetching social lead from database...');
    const leads = await getSocialLeads({ limit: 1 });

    if (leads.length === 0) {
      console.log('   ⚠️  No social leads found in database');
      return { success: false, reason: 'No social leads available' };
    }

    const lead = leads[0];
    const platform = lead.social_profiles?.instagram ? 'instagram' :
                     lead.social_profiles?.facebook ? 'facebook' :
                     lead.social_profiles?.linkedin ? 'linkedin' : 'instagram';

    console.log(`   ✅ Found social lead: ${lead.company_name || lead.url}`);
    console.log(`      Platform: ${platform}`);
    console.log(`      URL: ${lead.url}`);

    // Step 2: Generate social DM
    console.log('\n2️⃣  Generating social DM...');
    const dmResult = await generateSocialDM(lead, {
      platform: platform,
      strategy: 'value-first',
      model: 'claude-haiku-4-5'
    });

    console.log(`   ✅ DM generated`);
    console.log(`      Platform: ${dmResult.platform}`);
    console.log(`      Length: ${dmResult.character_count} chars`);
    console.log(`      Cost: $${dmResult.cost.toFixed(6)}`);

    // Step 3: Validate DM
    console.log('\n3️⃣  Validating DM...');
    const validation = validateSocialDM({
      message: dmResult.message,
      platform: dmResult.platform
    });

    console.log(`   ✅ Validation score: ${validation.score}/100 (${validation.rating})`);
    if (validation.issues.length > 0) {
      console.log(`      Issues: ${validation.issues.length}`);
      validation.issues.forEach(issue => {
        console.log(`        - ${issue}`);
      });
    }

    // Summary
    console.log('\n' + '─'.repeat(60));
    console.log('✅ SOCIAL DM WORKFLOW COMPLETE!\n');
    console.log('📊 Summary:');
    console.log(`   Lead: ${lead.company_name || lead.url}`);
    console.log(`   Platform: ${dmResult.platform}`);
    console.log(`   Quality: ${validation.score}/100 (${validation.rating})`);
    console.log(`   Cost: $${dmResult.cost.toFixed(6)}`);
    console.log(`   Length: ${dmResult.character_count}/${dmResult.platform_spec.maxChars} chars`);
    console.log('\n💬 Generated DM:\n');
    console.log('─'.repeat(60));
    console.log(dmResult.message);
    console.log('─'.repeat(60));

    return { success: true, dm: dmResult };

  } catch (error) {
    console.error('\n❌ Social workflow failed:');
    console.error(`   ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run both workflows
async function main() {
  const results = {
    email: null,
    social: null
  };

  // Test email workflow
  results.email = await testEmailWorkflow();

  // Test social workflow
  results.social = await testSocialWorkflow();

  // Final summary
  console.log('\n\n═══════════════════════════════════════════════════════════════════');
  console.log('🎯 END-TO-END TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log(`📧 Email Workflow: ${results.email.success ? '✅ PASSED' : '❌ FAILED'}`);
  if (!results.email.success && results.email.reason) {
    console.log(`   Reason: ${results.email.reason}`);
  }

  console.log(`💬 Social Workflow: ${results.social.success ? '✅ PASSED' : '❌ FAILED'}`);
  if (!results.social.success && results.social.reason) {
    console.log(`   Reason: ${results.social.reason}`);
  }

  const allPassed = results.email.success && results.social.success;
  console.log(`\n${allPassed ? '🎉' : '⚠️'}  Overall: ${allPassed ? 'ALL SYSTEMS WORKING!' : 'Some workflows need attention'}\n`);

  console.log('═══════════════════════════════════════════════════════════════════\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
