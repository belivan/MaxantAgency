import { initSupabase, executeSQL } from './runners/supabase-runner.js';

async function checkConstraints() {
  const supabase = initSupabase();

  console.log('Checking database constraints...\n');

  // Query to list all constraints
  const query = `
    SELECT
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
    AND tc.table_name IN ('prospects', 'leads', 'campaigns', 'campaign_runs', 'project_prospects', 'composed_emails', 'projects')
    ORDER BY tc.table_name, tc.constraint_type;
  `;

  try {
    const { data, error } = await supabase.rpc('query', { query });

    if (error) {
      console.error('Error querying constraints:', error);

      // Try alternative approach - just check if tables exist
      console.log('\nTrying to list tables...');
      const { data: tables, error: tableError } = await supabase
        .from('prospects')
        .select('count')
        .limit(0);

      if (tableError) {
        console.log('prospects table:', tableError.message);
      } else {
        console.log('✅ prospects table exists');
      }

    } else {
      console.log('Constraints found:', data);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }

  process.exit(0);
}

checkConstraints();
