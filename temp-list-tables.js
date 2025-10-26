import { initSupabase } from './database-tools/runners/supabase-runner.js';

async function showTables() {
  try {
    const supabase = initSupabase();

    // Try direct query to list tables
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) {
      console.log('❌ Error with information_schema query:', error.message);
      console.log('\nTrying alternative method...\n');

      // Alternative: Try to get table names by checking what tables exist
      const knownTables = [
        'prospects',
        'leads',
        'composed_emails',
        'social_outreach',
        'campaigns',
        'campaign_runs',
        'projects',
        'reports',
        'benchmarks'
      ];

      console.log('📊 Checking known tables:\n');
      console.log('=========================\n');

      const existingTables = [];
      for (const table of knownTables) {
        const { data, error } = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true });

        if (!error) {
          const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          existingTables.push(table);
          console.log(`✅ ${table} (${count || 0} rows)`);
        }
      }

      console.log(`\nTotal: ${existingTables.length} tables found\n`);
      return;
    }

    console.log('\n📊 Your Supabase Tables:');
    console.log('=========================\n');

    if (data && data.length > 0) {
      data.forEach((row, i) => {
        console.log(`${i + 1}. ${row.table_name}`);
      });
      console.log(`\nTotal: ${data.length} tables\n`);
    } else {
      console.log('No tables found\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

showTables();