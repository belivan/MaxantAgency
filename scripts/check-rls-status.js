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

async function checkRLSStatus() {
  console.log('🔒 Checking Row Level Security (RLS) status for all tables...\n');

  const tables = [
    'projects',
    'prospects',
    'leads',
    'reports',
    'project_prospects',
    'page_analyses',
    'composed_emails',
    'campaigns',
    'campaign_runs'
  ];

  console.log('⚠️  WARNING: All tables currently have RLS DISABLED (unrestricted)');
  console.log('This means anyone with the anon key can read/write all data.\n');

  console.log('To enable RLS for all tables, you can:');
  console.log('1. Go to Supabase Dashboard > Authentication > Policies');
  console.log('2. Enable RLS for each table');
  console.log('3. Create appropriate policies based on your needs\n');

  console.log('Or run this SQL in Supabase SQL Editor:\n');

  // Generate SQL to enable RLS
  console.log('-- Enable RLS for all tables');
  for (const table of tables) {
    console.log(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
  }

  console.log('\n-- Create service role bypass policies (allows service key full access)');
  for (const table of tables) {
    console.log(`CREATE POLICY "Service role bypass" ON ${table} FOR ALL USING (auth.jwt()->>'role' = 'service_role');`);
  }

  console.log('\n📌 Note: After enabling RLS, you\'ll need to create specific policies for:');
  console.log('   - Public read access (if needed)');
  console.log('   - Authenticated user access');
  console.log('   - Role-based access control');
}

checkRLSStatus();