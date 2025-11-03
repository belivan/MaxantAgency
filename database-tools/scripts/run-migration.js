/**
 * Database Migration Runner
 * Run with: node scripts/run-migration.js <migration-file>
 * Example: node scripts/run-migration.js add-rate-limit-fields.sql
 */

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

const migrationName = process.argv[2];

if (!migrationName) {
  console.error('❌ Usage: node scripts/run-migration.js <migration-file>');
  console.error('   Example: node scripts/run-migration.js add-rate-limit-fields.sql');
  process.exit(1);
}

async function runMigration() {
  console.log('🗄️  Database Migration Runner');
  console.log('=' + '='.repeat(79));

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read migration file
  const migrationPath = join(__dirname, '../migrations', migrationName);
  console.log(`\n📄 Reading migration: ${migrationName}`);

  let migrationSQL;
  try {
    migrationSQL = await readFile(migrationPath, 'utf-8');
  } catch (error) {
    console.error(`❌ Failed to read migration file: ${error.message}`);
    process.exit(1);
  }

  // Split SQL into individual statements (by semicolon)
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

  console.log(`\n✅ Found ${statements.length} SQL statements`);

  // Execute each statement
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comments
    if (statement.startsWith('COMMENT')) {
      console.log(`\n${i + 1}. Adding documentation comment...`);
    } else if (statement.startsWith('ALTER TABLE')) {
      console.log(`\n${i + 1}. Altering table schema...`);
    } else if (statement.startsWith('CREATE INDEX')) {
      console.log(`\n${i + 1}. Creating index...`);
    } else if (statement.startsWith('SELECT')) {
      console.log(`\n${i + 1}. Verifying migration...`);
    } else {
      console.log(`\n${i + 1}. Executing SQL statement...`);
    }

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      });

      if (error) {
        // Try direct query if RPC doesn't exist
        const { data: directData, error: directError } = await supabase
          .from('_sql')
          .select('*')
          .limit(0); // Dummy query

        // Fallback: log SQL for manual execution
        console.warn(`⚠️  Could not execute via Supabase client`);
        console.log(`📋 Execute this SQL manually in Supabase SQL Editor:`);
        console.log('─'.repeat(80));
        console.log(statement + ';');
        console.log('─'.repeat(80));
        errorCount++;
      } else {
        console.log(`   ✅ Success`);
        if (data && Array.isArray(data) && data.length > 0) {
          console.log(`   📊 Result:`, JSON.stringify(data, null, 2));
        }
        successCount++;
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      console.log(`   📋 Failed statement:`);
      console.log('   ' + statement.substring(0, 200) + '...');
      errorCount++;
    }
  }

  console.log('\n' + '=' + '='.repeat(79));
  console.log(`📊 Migration Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. You may need to run them manually in Supabase SQL Editor.');
    console.log('   1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
    console.log(`   2. Open: database-tools/migrations/${migrationName}`);
    console.log('   3. Copy and run the SQL statements');
  } else {
    console.log('\n🎉 Migration completed successfully!');
  }

  console.log('=' + '='.repeat(79));
}

runMigration().catch(error => {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
});
