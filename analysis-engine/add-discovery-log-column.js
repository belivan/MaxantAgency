/**
 * Add discovery_log column to leads table
 *
 * This script adds the comprehensive discovery_log JSONB column
 * to capture all analysis data, errors, and findings.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addDiscoveryLogColumn() {
  console.log('🔧 Adding discovery_log column to leads table...\n');

  try {
    // Check if column already exists
    const { data: columns, error: checkError } = await supabase
      .rpc('get_table_columns', {
        table_name: 'leads',
        schema_name: 'public'
      })
      .select('*');

    if (checkError && !checkError.message.includes('does not exist')) {
      // Try alternate approach - query information schema
      const checkSQL = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'leads'
        AND column_name = 'discovery_log'
        AND table_schema = 'public';
      `;

      const { data: existingColumn, error: altCheckError } = await supabase
        .rpc('sql_query', { query: checkSQL });

      if (!altCheckError && existingColumn && existingColumn.length > 0) {
        console.log('✅ Column discovery_log already exists');
        return;
      }
    } else if (!checkError && columns) {
      const hasColumn = columns.some(col => col.column_name === 'discovery_log');
      if (hasColumn) {
        console.log('✅ Column discovery_log already exists');
        return;
      }
    }

    // Add the column
    const alterSQL = `
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS discovery_log JSONB;
    `;

    // Execute the ALTER TABLE command
    const { error: alterError } = await supabase.rpc('sql_exec', {
      query: alterSQL
    }).single();

    // If RPC doesn't exist, try direct approach
    if (alterError && alterError.message.includes('does not exist')) {
      // Try using Supabase SQL Editor approach
      console.log('Note: Direct SQL execution not available via RPC.');
      console.log('Please run the following SQL in your Supabase SQL Editor:\n');
      console.log('----------------------------------------');
      console.log(alterSQL);
      console.log('----------------------------------------\n');
      console.log('Or use the Supabase CLI:\n');
      console.log('supabase db push --include-all\n');
      return;
    }

    if (alterError) {
      throw alterError;
    }

    console.log('✅ Successfully added discovery_log column to leads table');

    // Add comment to describe the column
    const commentSQL = `
      COMMENT ON COLUMN leads.discovery_log IS
      'Complete discovery and analysis log with all pages found, AI reasoning, errors, and critical findings';
    `;

    await supabase.rpc('sql_exec', { query: commentSQL }).single().catch(() => {
      // Ignore comment errors
    });

    console.log('✅ Column description added');
    console.log('\n📊 The discovery_log column structure:');
    console.log('----------------------------------------');
    console.log(JSON.stringify({
      summary: {
        total_discovered: 'number of pages found',
        discovery_method: 'sitemap/robots/navigation',
        discovery_time_ms: 'time taken'
      },
      all_pages: ['array of all discovered URLs (up to 10,000)'],
      ai_selection: {
        reasoning: 'AI reasoning for page selection',
        selected_pages: 'pages chosen for each analyzer'
      },
      discovery_issues: {
        sitemap_missing: 'boolean',
        robots_missing: 'boolean',
        crawl_failures: 'array of failed pages'
      },
      critical_findings: {
        grade: 'A-F',
        lead_priority: '0-100',
        critical_issues: 'top issues found',
        quick_wins: 'easy fixes available'
      },
      technical_details: {
        tech_stack: 'detected CMS/framework',
        is_mobile_friendly: 'boolean',
        years_in_business: 'estimated age'
      },
      analysis_metrics: {
        total_time_ms: 'analysis duration',
        analysis_cost: 'AI API costs',
        ai_models_used: 'which models were used'
      }
    }, null, 2));

  } catch (error) {
    console.error('❌ Error adding column:', error.message);

    // Provide manual fallback
    console.log('\n📝 Manual Solution:');
    console.log('----------------------------------------');
    console.log('Run this SQL in your Supabase Dashboard SQL Editor:\n');
    console.log(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS discovery_log JSONB;`);
    console.log('\nThen add the description:');
    console.log(`COMMENT ON COLUMN leads.discovery_log IS 'Complete discovery and analysis log with all pages found, AI reasoning, errors, and critical findings';`);
    console.log('----------------------------------------');
  }
}

// Run the migration
addDiscoveryLogColumn()
  .then(() => {
    console.log('\n✅ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });