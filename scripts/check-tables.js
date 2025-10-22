// Check what tables actually exist
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTables() {
  console.log('🔍 Checking database tables...\n');

  // Try to query leads VIEW
  console.log('1️⃣ Testing leads VIEW:');
  const { data: viewData, error: viewError } = await supabase
    .from('leads')
    .select('id, company_name')
    .limit(1);

  if (viewError) {
    console.log('❌ VIEW error:', viewError.message);
  } else {
    console.log(`✅ VIEW works, returned ${viewData?.length || 0} rows`);
  }

  // Try to query leads_core table directly
  console.log('\n2️⃣ Testing leads_core table:');
  const { data: coreData, error: coreError } = await supabase
    .from('leads_core')
    .select('id, company_name')
    .limit(1);

  if (coreError) {
    console.log('❌ leads_core error:', coreError.message);
  } else {
    console.log(`✅ leads_core exists, returned ${coreData?.length || 0} rows`);
  }

  // Try to query original leads table
  console.log('\n3️⃣ Testing original leads table:');
  const { data: origData, error: origError } = await supabase
    .from('leads_backup_before_cleanup')
    .select('id, company_name')
    .limit(1);

  if (origError) {
    console.log('❌ leads_backup_before_cleanup error:', origError.message);
  } else {
    console.log(`✅ Backup exists, returned ${origData?.length || 0} rows`);
  }
}

checkTables().catch(console.error);