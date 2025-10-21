import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'command-center-ui/.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🔍 Checking project_prospects table...\n');

const { data, error } = await supabase
  .from('project_prospects')
  .select('*')
  .limit(10);

if (error) {
  console.log('❌ Error:', error.message);
  process.exit(1);
}

console.log('📊 project_prospects table:', data.length, 'rows\n');
data.forEach((row, i) => {
  console.log(`  [${i+1}] Project: ${row.project_id}`);
  console.log(`       Prospect: ${row.prospect_id}\n`);
});

// Also check if prospects exist
console.log('\n🔍 Checking prospects table...\n');

const { data: prospects, error: prospectError } = await supabase
  .from('prospects')
  .select('id, company_name')
  .limit(3);

if (!prospectError && prospects) {
  console.log('📊 Sample prospects:', prospects.length, 'rows\n');
  prospects.forEach((p, i) => {
    console.log(`  [${i+1}] ${p.company_name}`);
    console.log(`       ID: ${p.id}\n`);
  });
}

process.exit(0);
