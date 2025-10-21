import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: './analysis-engine/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    db: { schema: 'public' }
  }
);

console.log('🔧 Running migration: add-ai-page-selection');
console.log('');

// Read the migration SQL
const sql = fs.readFileSync('./database-tools/migrations/add-ai-page-selection.sql', 'utf8');

console.log('SQL to execute:');
console.log('---');
console.log(sql);
console.log('---');
console.log('');

console.log('⚙️  Executing migration...');

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.log('❌ Migration failed');
  console.log('Error:', error.message);
  console.log('');
  console.log('Please run this SQL manually in Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/_/sql');
  process.exit(1);
} else {
  console.log('✅ Migration successful!');
  console.log('');

  // Verify the column exists
  console.log('🔍 Verifying column exists...');
  const { error: testError } = await supabase
    .from('leads')
    .select('ai_page_selection')
    .limit(1);

  if (testError) {
    console.log('❌ Verification failed:', testError.message);
  } else {
    console.log('✅ Column verified - ai_page_selection exists!');
  }
}
