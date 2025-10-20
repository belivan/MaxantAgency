/**
 * Direct test of icp_brief column
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testIcpBrief() {
  console.log('\n🧪 Testing icp_brief column directly...\n');

  // Try to insert a project WITH icp_brief
  console.log('📝 Attempting to insert project with icp_brief...');

  const testData = {
    name: 'ICP Brief Test Project',
    status: 'active',
    icp_brief: {
      industry: 'restaurant',
      location: 'Austin, TX',
      targetRevenue: '$500K-$2M'
    },
    analysis_config: { test: true },
    outreach_config: { test: true }
  };

  const { data, error } = await supabase
    .from('projects')
    .insert(testData)
    .select()
    .single();

  if (error) {
    console.error('❌ Insert FAILED:', error.message);
    console.error('   Code:', error.code);
    console.error('   Details:', error.details);

    if (error.message.includes('icp_brief')) {
      console.log('\n⚠️  Column icp_brief does not exist in the database.');
      console.log('The migration may have failed silently.\n');
    }

    return false;
  }

  console.log('✅ Insert SUCCESS!');
  console.log('   Project ID:', data.id);
  console.log('   Has icp_brief:', 'icp_brief' in data);
  console.log('   Has analysis_config:', 'analysis_config' in data);
  console.log('   Has outreach_config:', 'outreach_config' in data);

  if (data.icp_brief) {
    console.log('   icp_brief value:', JSON.stringify(data.icp_brief));
  }

  // Clean up
  console.log('\n🧹 Cleaning up...');
  await supabase.from('projects').delete().eq('id', data.id);
  console.log('✓ Test project deleted\n');

  console.log('🎉 All three configuration columns are working!\n');

  return true;
}

testIcpBrief().catch(console.error);
