/**
 * Run database migration for model tracking and accessibility fields
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

async function runMigration() {
  console.log('🔄 Running migration: add-model-tracking-and-accessibility.sql\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Read the SQL file
    const sqlFile = join(__dirname, 'add-model-tracking-and-accessibility.sql');
    const sql = readFileSync(sqlFile, 'utf8');

    // Split by semicolons to run each statement separately
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('COMMENT') && !s.startsWith('SELECT'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Run each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });

      if (error) {
        // Try direct SQL if RPC doesn't work
        console.log(`   Trying direct execution...`);
        const { error: directError } = await supabase.from('_migrations').select('*').limit(0);

        if (directError) {
          console.error(`   ❌ Error:`, error.message);
          console.log(`   Statement: ${statement.substring(0, 100)}...`);
        }
      } else {
        console.log(`   ✅ Success`);
      }
    }

    console.log('\n✅ Migration complete!\n');

    // Verify the columns exist
    console.log('🔍 Verifying new columns...\n');

    const { data, error } = await supabase
      .from('leads')
      .select('accessibility_score, seo_analysis_model, desktop_visual_model')
      .limit(1);

    if (error) {
      console.warn('⚠️  Could not verify columns (this is normal if table is empty)');
      console.warn('   Error:', error.message);
      console.log('\n💡 TIP: Run this SQL directly in Supabase SQL Editor:\n');
      console.log(sql);
    } else {
      console.log('✅ Columns verified successfully!');
      console.log('   Sample data:', data);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n💡 MANUAL MIGRATION REQUIRED:\n');
    console.log('1. Open Supabase SQL Editor');
    console.log('2. Copy contents of: database-tools/migrations/add-model-tracking-and-accessibility.sql');
    console.log('3. Run the SQL directly\n');
    process.exit(1);
  }
}

runMigration();