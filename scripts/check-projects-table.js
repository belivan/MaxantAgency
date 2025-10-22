import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProjectsTable() {
  console.log('🔍 Checking if projects table exists...\n');

  try {
    // Try to query the projects table
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('relation "public.projects" does not exist')) {
        console.log('❌ Projects table does NOT exist in the database');
        return false;
      } else {
        console.log('⚠️ Error querying projects table:', error.message);
        return false;
      }
    } else {
      console.log('✅ Projects table EXISTS in the database');

      // Get count of records
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      console.log(`📊 Table contains ${count || 0} record(s)`);
      return true;
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return false;
  }
}

// Run the check
checkProjectsTable().then(exists => {
  process.exit(exists ? 0 : 1);
});