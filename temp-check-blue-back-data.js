import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const LEAD_ID = 'c019ff7a-c524-4510-ad57-29899449486a';

const { data: lead, error } = await supabase
  .from('leads')
  .select('*')
  .eq('id', LEAD_ID)
  .single();

if (error) {
  console.error('Error:', error);
} else {
  console.log('Blue Back Dental Data:\n');
  console.log('Company:', lead.company_name);
  console.log('Grade:', lead.website_grade, '(' + Math.round(lead.overall_score) + '/100)');
  console.log('\n📸 Screenshots:');
  console.log('Desktop URL:', lead.screenshot_desktop_url || 'MISSING');
  console.log('Mobile URL:', lead.screenshot_mobile_url || 'MISSING');
  console.log('\n🎯 Benchmark Data:');
  console.log('Industry:', lead.industry);

  // Check if there's a benchmark for dental industry
  const { data: benchmarks } = await supabase
    .from('benchmarks')
    .select('id, company_name, overall_grade, overall_score')
    .eq('industry', 'dental')
    .eq('is_active', true);

  console.log('\nAvailable Benchmarks:');
  if (benchmarks && benchmarks.length > 0) {
    benchmarks.forEach(b => {
      console.log(`  - ${b.company_name}: ${b.overall_grade} (${Math.round(b.overall_score)}/100)`);
    });
  } else {
    console.log('  ⚠️  No benchmarks found!');
  }
}
