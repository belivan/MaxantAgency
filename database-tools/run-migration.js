import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function runMigration() {
  try {
    // Read the migration SQL
    const sql = fs.readFileSync('./migrations/add-ai-metadata-columns.sql', 'utf8');

    console.log('🚀 Running migration to add AI metadata columns...\n');

    // Use Supabase SQL editor - execute entire migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('Hint:', error.hint);
      console.error('\n💡 You may need to run this SQL manually in Supabase SQL Editor');
      console.error('📄 SQL file:', './migrations/add-ai-metadata-columns.sql\n');
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!\n');

    // Verify columns were added
    const { data: testData, error: testError } = await supabase
      .from('project_prospects')
      .select('*')
      .limit(1);

    if (testData && testData.length > 0) {
      console.log('✅ Verified columns in project_prospects:');
      const columns = Object.keys(testData[0]).sort();
      columns.forEach(col => console.log(`   - ${col}`));
    } else if (testData && testData.length === 0) {
      console.log('⚠️  Table is empty, cannot verify columns');
      console.log('   Run a query in Supabase to check: SELECT * FROM project_prospects LIMIT 1;');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runMigration();