/**
 * Migration Runner: Execute SQL Migration File
 * Runs add-project-config-columns.sql migration
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('\n🔧 Running Migration: Add Project Config Columns\n');

  // Read SQL file
  const sqlPath = join(__dirname, 'migrations', 'add-project-config-columns.sql');
  console.log('📄 Reading SQL file:', sqlPath);

  let sqlContent;
  try {
    sqlContent = readFileSync(sqlPath, 'utf8');
  } catch (error) {
    console.error('❌ Error reading SQL file:', error.message);
    process.exit(1);
  }

  // Split SQL into individual statements (ignoring comments)
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statement(s)\n`);

  // Execute each statement
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 60) + (statement.length > 60 ? '...' : '');

    console.log(`\n[${i + 1}/${statements.length}] Executing: ${preview}`);

    try {
      // Use Supabase REST API to execute raw SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ query: statement })
      });

      if (response.ok) {
        console.log('✓ Success');
        successCount++;
      } else {
        const errorText = await response.text();
        console.log('⚠️  Response:', response.status, errorText.substring(0, 100));

        // Try alternative: Use pg-meta or direct query
        // Since Supabase might not expose exec directly, we'll note manual steps needed
        if (statement.includes('ALTER TABLE')) {
          console.log('📋 Manual action required - please execute this SQL in Supabase SQL Editor');
          errorCount++;
        }
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      errorCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Migration Summary\n');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📈 Total: ${statements.length}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Manual Steps Required:\n');
    console.log('Supabase client does not support DDL operations directly.');
    console.log('Please execute the following in Supabase SQL Editor:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new');
    console.log('2. Copy the contents of: database-tools/migrations/add-project-config-columns.sql');
    console.log('3. Click "Run"\n');
    console.log('Or run these commands:\n');
    console.log('ALTER TABLE projects ADD COLUMN IF NOT EXISTS icp_brief jsonb;');
    console.log('ALTER TABLE projects ADD COLUMN IF NOT EXISTS analysis_config jsonb;');
    console.log('ALTER TABLE projects ADD COLUMN IF NOT EXISTS outreach_config jsonb;\n');
  } else {
    console.log('\n🎉 Migration completed successfully!\n');
  }
}

runMigration().catch(console.error);
