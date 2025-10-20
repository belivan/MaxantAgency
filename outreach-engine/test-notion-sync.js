/**
 * TEST: Sync a sample email to Notion
 * This will create a test entry in your Notion database
 */

import { syncEmailToNotion } from './integrations/notion.js';

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🧪 NOTION SYNC TEST - Creating Test Entry');
console.log('═══════════════════════════════════════════════════════════════════\n');

// Sample email data
const testEmail = {
  subject: '🧪 Test Email from Outreach Engine',
  body: 'This is a test email to verify Notion integration is working correctly. You can delete this entry after verifying it appears in your Notion database.',
  strategy: 'compliment-sandwich',
  platform: 'email',
  status: 'ready',
  validation_score: 95,
  cost: 0.0001,
  model_used: 'claude-haiku-3-5',
  generation_time_ms: 1234,
  id: 'test-12345'
};

// Sample lead data
const testLead = {
  company_name: 'Test Company - Notion Sync Demo',
  url: 'https://example.com',
  industry: 'Software',
  lead_grade: 'A',
  website_grade: 'B',
  contact_email: 'test@example.com',
  contact_name: 'John Doe',
  city: 'Philadelphia',
  top_issue: 'Mobile menu not responsive'
};

console.log('📧 Test Email Details:');
console.log(`   Company: ${testLead.company_name}`);
console.log(`   Subject: ${testEmail.subject}`);
console.log(`   Strategy: ${testEmail.strategy}`);
console.log(`   Status: ${testEmail.status}`);
console.log(`   Score: ${testEmail.validation_score}/100\n`);

console.log('🔄 Syncing to Notion...\n');

try {
  const result = await syncEmailToNotion(testEmail, testLead);

  if (result && result.skipped) {
    console.log('\n⚠️  Sync was skipped:');
    console.log(`   Reason: ${result.reason}`);
    console.log('\n💡 To fix this:');
    console.log('   1. Go to your Notion database');
    console.log('   2. Add properties manually (see NOTION-SETUP-GUIDE.md)');
    console.log('   3. Or run: node integrations/notion-schema-setup.js --live\n');
  } else if (result && result.id) {
    console.log('\n✅ SUCCESS! Email synced to Notion');
    console.log(`   Page ID: ${result.id}`);
    console.log(`   URL: https://notion.so/${result.id.replace(/-/g, '')}`);
    console.log('\n📋 Go check your Notion database!');
    console.log('   Look for: "Test Company - Notion Sync Demo"\n');
  } else {
    console.log('\n⚠️  Unexpected result:', result);
  }

  console.log('═══════════════════════════════════════════════════════════════════\n');

} catch (error) {
  console.error('\n❌ Error syncing to Notion:');
  console.error(`   ${error.message}\n`);

  if (error.message.includes('property')) {
    console.log('💡 This usually means your Notion database properties need to be set up.');
    console.log('   See: NOTION-SETUP-GUIDE.md for instructions\n');
  }

  console.log('═══════════════════════════════════════════════════════════════════\n');
  process.exit(1);
}
