/**
 * Check what's actually in the database for a test lead
 */
import { supabase } from './database/supabase-client.js';

const TEST_LEAD_ID = '1748bc04-cd15-4850-9cc6-6fb5c6bea282';

async function checkDatabase() {
  console.log('\n🔍 Checking database for lead:', TEST_LEAD_ID);
  console.log('='.repeat(60));

  try {
    const { data, error } = await supabase
      .from('composed_outreach')
      .select('*')
      .eq('lead_id', TEST_LEAD_ID)
      .single();

    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }

    if (!data) {
      console.log('⚠️  No data found for this lead');
      return;
    }

    console.log('\n✅ Found record:', data.id);
    console.log('Company:', data.company_name);
    console.log('Status:', data.status);
    console.log('Created:', data.created_at);
    console.log('\n📧 Email Variations:');
    console.log('  email_free_value:', data.email_free_value ? 'EXISTS' : 'MISSING');
    console.log('  email_portfolio_building:', data.email_portfolio_building ? 'EXISTS' : 'MISSING');
    console.log('  email_problem_first:', data.email_problem_first ? 'EXISTS' : 'MISSING');

    console.log('\n📱 Social Variations:');
    const platforms = ['instagram', 'facebook', 'linkedin'];
    const strategies = ['free_value', 'portfolio_building', 'problem_first'];

    let foundCount = 0;
    for (const platform of platforms) {
      console.log(`\n  ${platform}:`);
      for (const strategy of strategies) {
        const fieldName = `${platform}_${strategy}`;
        const hasContent = !!data[fieldName];
        foundCount += hasContent ? 1 : 0;
        console.log(`    ${strategy}: ${hasContent ? 'EXISTS' : 'MISSING'}`);
        if (hasContent && typeof data[fieldName] === 'string') {
          console.log(`      "${data[fieldName].substring(0, 60)}..."`);
        }
      }
    }

    console.log(`\n📊 Summary: ${foundCount}/9 social variations exist`);

  } catch (error) {
    console.error('💥 Failed:', error.message);
  }
}

checkDatabase().then(() => {
  console.log('\n✅ Check complete\n');
  process.exit(0);
});
