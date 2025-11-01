import { supabase } from '../database/supabase-client.js';

console.log('Testing Supabase connection...\n');

const timeout = setTimeout(() => {
  console.error('❌ Database query timed out after 15 seconds');
  process.exit(1);
}, 15000);

try {
  const { data, error } = await supabase
    .from('benchmarks')
    .select('id, company_name, industry')
    .limit(3);

  clearTimeout(timeout);

  if (error) {
    console.error('❌ Database error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }

  console.log('✅ Database connected successfully!\n');
  console.log('Sample benchmarks:');
  data.forEach((b, i) => {
    console.log(`  ${i + 1}. ${b.company_name} (${b.industry})`);
  });
  console.log(`\nTotal benchmarks: ${data.length}`);
  process.exit(0);

} catch (err) {
  clearTimeout(timeout);
  console.error('❌ Connection error:', err.message);
  console.error(err);
  process.exit(1);
}
