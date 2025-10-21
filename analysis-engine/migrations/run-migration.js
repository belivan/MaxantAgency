/**
 * Run SQL Migration via Supabase HTTP API
 * Attempts to execute SQL migration using REST API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

async function runMigration() {
  console.log('🔧 Running SQL Migration');
  console.log('');

  // Read SQL file
  const sqlFile = path.join(__dirname, '001_add_ai_scoring_columns.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  console.log('📄 SQL Migration File:');
  console.log(sql);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Extract individual ALTER TABLE commands
  const alterCommands = sql
    .split('\n')
    .filter(line => line.trim().startsWith('ALTER TABLE'))
    .map(line => line.trim().replace(/;$/, ''));

  console.log(`Found ${alterCommands.length} ALTER TABLE commands`);
  console.log('');

  // Try to execute using pg library with connection pooler
  // Note: This requires DATABASE_URL or connection credentials
  console.log('⚠️  Cannot execute SQL automatically');
  console.log('');
  console.log('📋 Please run this migration manually:');
  console.log('');
  console.log('1. Go to: https://supabase.com/dashboard/project/_/sql/new');
  console.log('2. Copy and paste the SQL from: analysis-engine/migrations/001_add_ai_scoring_columns.sql');
  console.log('3. Click "Run"');
  console.log('');
  console.log('Or run these commands in Supabase SQL Editor:');
  console.log('');
  alterCommands.forEach(cmd => {
    console.log(cmd + ';');
  });
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
}

runMigration().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
