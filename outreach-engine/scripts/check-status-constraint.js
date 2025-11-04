/**
 * Check what the actual database constraint is for composed_outreach.status
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('\n🔍 Checking composed_outreach status constraint...\n');

// Query to get the check constraint definition
const { data, error } = await supabase
  .rpc('exec_sql', {
    sql_query: `
      SELECT
        con.conname AS constraint_name,
        pg_get_constraintdef(con.oid) AS constraint_definition
      FROM pg_constraint con
      INNER JOIN pg_class rel ON rel.oid = con.conrelid
      INNER JOIN pg_namespace nsp ON nsp.oid = connamespace
      WHERE rel.relname = 'composed_outreach'
        AND con.contype = 'c'
        AND con.conname LIKE '%status%';
    `
  });

if (error) {
  console.error('❌ Error:', error.message);

  // Fallback: Try inserting with different status values to see which works
  console.log('\n📝 Testing different status values...\n');

  const testStatuses = ['pending', 'ready', 'approved', 'sent', 'draft', 'test'];

  for (const status of testStatuses) {
    try {
      const { error: insertError } = await supabase
        .from('composed_outreach')
        .insert([{
          lead_id: null,
          url: 'https://test.com',
          company_name: 'Test Company',
          email_body: 'Test body',
          email_strategy: 'test',
          status: status
        }])
        .select()
        .single();

      if (insertError) {
        console.log(`   ❌ "${status}" - REJECTED: ${insertError.message.substring(0, 50)}...`);
      } else {
        console.log(`   ✅ "${status}" - ACCEPTED`);

        // Clean up test row
        await supabase
          .from('composed_outreach')
          .delete()
          .eq('company_name', 'Test Company')
          .eq('url', 'https://test.com');
      }
    } catch (e) {
      console.log(`   ❌ "${status}" - ERROR: ${e.message.substring(0, 50)}...`);
    }
  }
} else {
  console.log('✅ Found constraint definition:\n');
  console.log(data);
}

console.log('\n');
