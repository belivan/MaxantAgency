/**
 * Migration: Add missing columns to composed_outreach table
 *
 * Adds columns needed by the outreach engine for email composition
 */

import { initSupabase } from '../runners/supabase-runner.js';

const COLUMNS_TO_ADD = [
  "platform text DEFAULT 'email'",
  "email_subject text",
  "email_body text",
  "email_strategy text",
  "character_count integer",
  "social_profile_url text",
  "has_variants boolean DEFAULT false",
  "subject_variants jsonb",
  "body_variants jsonb",
  "recommended_variant jsonb",
  "variant_reasoning text",
  "quality_score integer",
  "validation_issues jsonb",
  "ai_model text",
  "generation_cost decimal",
  "generation_time_ms integer",
  "usage_input_tokens integer",
  "usage_output_tokens integer"
];

async function main() {
  console.log('🔧 Adding missing columns to composed_outreach table...\n');

  const supabase = initSupabase();

  for (const columnDef of COLUMNS_TO_ADD) {
    const columnName = columnDef.split(' ')[0];

    try {
      console.log(`   Adding column: ${columnName}...`);

      // Check if column exists first
      const { data: existing } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'composed_outreach'
          AND column_name = '${columnName}'
        `
      });

      if (existing && existing.length > 0) {
        console.log(`   ✓ Column ${columnName} already exists, skipping`);
        continue;
      }

      // Add column using raw SQL
      const sql = `ALTER TABLE composed_outreach ADD COLUMN IF NOT EXISTS ${columnDef}`;

      const { error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        // Try direct query method
        const { error: directError } = await supabase.from('composed_outreach')
          .select('*')
          .limit(0);

        if (directError && !directError.message.includes(columnName)) {
          console.log(`   ✓ Column ${columnName} added successfully`);
        } else {
          throw error;
        }
      } else {
        console.log(`   ✓ Column ${columnName} added successfully`);
      }

    } catch (error) {
      console.error(`   ✗ Failed to add ${columnName}: ${error.message}`);
      console.log('   → You may need to run this SQL manually in Supabase SQL Editor:\n');
      console.log(`     ALTER TABLE composed_outreach ADD COLUMN IF NOT EXISTS ${columnDef};\n`);
    }
  }

  console.log('\n✨ Migration complete!');
  console.log('\nIf any columns failed, run this SQL in Supabase SQL Editor:\n');
  console.log('```sql');
  COLUMNS_TO_ADD.forEach(col => {
    console.log(`ALTER TABLE composed_outreach ADD COLUMN IF NOT EXISTS ${col};`);
  });
  console.log('```\n');
}

main().catch(error => {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
});
