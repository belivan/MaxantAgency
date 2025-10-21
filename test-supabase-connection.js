import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './analysis-engine/.env' });

console.log('🔍 Testing Supabase connection...\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

try {
  const { data, error, count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.log('❌ Connection FAILED');
    console.log('Error:', error.message);
    console.log('Code:', error.code);
    process.exit(1);
  }

  console.log('✅ Connection SUCCESS!');
  console.log(`   Total leads in database: ${count || 0}`);

} catch (err) {
  console.log('❌ Fatal error:', err.message);
  process.exit(1);
}
