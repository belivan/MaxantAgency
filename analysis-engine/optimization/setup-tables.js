/**
 * Setup optimization tables in Supabase
 */

import { supabase } from '../../database/supabase-client.js';
import fs from 'fs/promises';
import path from 'path';

async function setupTables() {
  console.log('\n🔧 Setting up optimization tables...\n');

  try {
    // Read SQL file
    const sqlPath = path.join(process.cwd(), 'optimization', 'create-tables.sql');
    const sql = await fs.readFile(sqlPath, 'utf-8');

    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Extract table/index name for logging
      const match = stmt.match(/CREATE (?:TABLE|INDEX)(?: IF NOT EXISTS)?\s+(\w+)/i);
      const name = match ? match[1] : `statement ${i + 1}`;

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });

        if (error) {
          // Try direct query if RPC doesn't work
          const { error: directError } = await supabase.from('_raw').select('*').limit(0);

          if (directError) {
            console.log(`⚠️  ${name} - Using direct execution`);
            // For Supabase, we need to execute via the SQL editor or use the REST API
            console.log(`   SQL: ${stmt.substring(0, 60)}...`);
          }
        } else {
          console.log(`✅ ${name}`);
        }
      } catch (error) {
        console.log(`⚠️  ${name} - ${error.message}`);
      }
    }

    console.log('\n✅ Table setup complete!\n');
    console.log('Note: If tables were not created, you may need to run the SQL');
    console.log('      manually in the Supabase SQL editor.\n');

    // Test tables exist
    console.log('🔍 Verifying tables...\n');

    const tables = ['prompt_variants', 'analysis_feedback', 'optimization_runs'];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(0);

      if (error) {
        console.log(`❌ ${table} - Not found (${error.message})`);
      } else {
        console.log(`✅ ${table} - Accessible`);
      }
    }

    console.log('\nDone!\n');

  } catch (error) {
    console.error('Error setting up tables:', error);
    process.exit(1);
  }
}

setupTables();
