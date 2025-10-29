/**
 * Add new columns to existing reports table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumns() {
  console.log('🔧 Adding new columns to reports table...\n');

  const columns = [
    { name: 'synthesis_used', type: 'boolean', default: 'false' },
    { name: 'synthesis_cost', type: 'decimal', default: null },
    { name: 'synthesis_tokens', type: 'integer', default: null },
    { name: 'synthesis_duration_ms', type: 'integer', default: null },
    { name: 'synthesis_errors', type: 'integer', default: '0' },
    { name: 'consolidated_issues_count', type: 'integer', default: null },
    { name: 'original_issues_count', type: 'integer', default: null },
    { name: 'issue_reduction_percentage', type: 'integer', default: null },
    { name: 'report_version', type: 'text', default: null },
    { name: 'report_subtype', type: 'text', default: null },
    { name: 'sections_included', type: 'jsonb', default: null },
    { name: 'generation_time_ms', type: 'integer', default: null },
    { name: 'word_count', type: 'integer', default: null },
    { name: 'synthesis_data', type: 'jsonb', default: null }
  ];

  for (const col of columns) {
    const sql = `
      ALTER TABLE reports
      ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}${col.default !== null ? ` DEFAULT ${col.default}` : ''};
    `;

    console.log(`Adding column: ${col.name} (${col.type})...`);

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => {
      // If RPC doesn't exist, try direct query
      return supabase.from('_sql').insert({ query: sql });
    });

    if (error) {
      console.log(`  ⚠️  Could not add via Supabase client: ${error.message}`);
      console.log(`  Please run this SQL manually in Supabase SQL Editor:`);
      console.log(sql);
    } else {
      console.log(`  ✅ Column added`);
    }
  }

  console.log('\n✅ Column addition complete!');
  console.log('If you saw warnings, please run the SQL commands manually in Supabase SQL Editor.\n');
}

addColumns().catch(console.error);
