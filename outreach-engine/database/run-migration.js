/**
 * Run database migration
 * Executes SQL migration files against Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration(migrationFile) {
  console.log(`\n📦 Running migration: ${migrationFile}\n`);

  try {
    // Read SQL file
    const sqlPath = join(__dirname, 'migrations', migrationFile);
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('SQL to execute:');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
    console.log('');

    // Execute SQL via Supabase
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      throw new Error(`Migration failed: ${error.message}`);
    }

    console.log('✅ Migration completed successfully!');
    console.log('');

    return { success: true };

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Get migration file from command line args
const migrationFile = process.argv[2] || '001-add-missing-columns.sql';

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🗄️  DATABASE MIGRATION RUNNER');
console.log('═══════════════════════════════════════════════════════════════════');

runMigration(migrationFile)
  .then(() => {
    console.log('✅ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
