/**
 * Migration Script: Add Configuration Columns to Projects Table
 * Adds icp_brief, analysis_config, and outreach_config columns
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addConfigColumns() {
  console.log('\n🔧 Adding configuration columns to projects table...\n');

  const columns = [
    { name: 'icp_brief', type: 'jsonb', description: 'Ideal Customer Profile brief' },
    { name: 'analysis_config', type: 'jsonb', description: 'Website analysis configuration' },
    { name: 'outreach_config', type: 'jsonb', description: 'Outreach generation configuration' }
  ];

  for (const column of columns) {
    console.log(`Adding column: ${column.name} (${column.type})`);
    console.log(`Description: ${column.description}`);

    // Use raw SQL query
    const { data, error } = await supabase
      .rpc('exec_sql', {
        query: `ALTER TABLE projects ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}`
      })
      .catch(async () => {
        // If exec_sql doesn't exist, try using a workaround with schema introspection
        // First check if column exists
        const { data: checkData, error: checkError } = await supabase
          .from('projects')
          .select(column.name)
          .limit(0);

        if (checkError && checkError.message.includes('does not exist')) {
          return { needsCreation: true };
        }

        return { alreadyExists: true };
      });

    if (error) {
      console.error(`❌ Error adding ${column.name}:`, error.message);

      // Try alternative approach: Create a temporary record to force schema refresh
      console.log('Attempting alternative approach...');

      // Note: Supabase client doesn't support DDL directly, we need to use SQL editor or API
      console.log('\n⚠️  Direct column addition not supported via Supabase client.');
      console.log('Please run the following SQL in Supabase SQL Editor:\n');
      console.log(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`);
      console.log('');
    } else if (data?.needsCreation) {
      console.log(`⚠️  Column ${column.name} needs to be created via SQL editor`);
    } else if (data?.alreadyExists) {
      console.log(`✓ Column ${column.name} already exists\n`);
    } else {
      console.log(`✓ Column ${column.name} added successfully\n`);
    }
  }

  console.log('\n📝 Manual SQL Commands (if needed):\n');
  console.log('-- Run these in Supabase SQL Editor --\n');
  for (const column of columns) {
    console.log(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`);
  }
  console.log('\n');
}

addConfigColumns().catch(console.error);
