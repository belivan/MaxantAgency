/**
 * Check what columns exist in the leads table
 */

import { supabase } from './database/supabase-client.js';

console.log('Checking leads table structure in Supabase...\n');

try {
  // Try to get one row to see the structure
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying leads table:', error);

    // Try to get table info using pg_catalog
    const { data: columns, error: colError } = await supabase
      .rpc('get_table_columns', { table_name: 'leads' });

    if (colError) {
      console.error('Could not get column info:', colError);
    }
  } else {
    console.log('✅ Successfully queried leads table');
    console.log('Number of existing leads:', data.length);

    if (data.length > 0) {
      console.log('\nColumns in the table:');
      console.log(Object.keys(data[0]).sort());
      console.log('\nSample lead:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('\nTable exists but has no rows yet.');
      console.log('Attempting to get column structure...');

      // Try inserting an empty object to see what's required
      const { error: insertError } = await supabase
        .from('leads')
        .insert({});

      if (insertError) {
        console.log('\nRequired/Available columns (from error):');
        console.log(insertError);
      }
    }
  }

  // Count total leads
  const { count, error: countError } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`\nTotal leads in table: ${count}`);
  }

} catch (err) {
  console.error('Error:', err);
}
