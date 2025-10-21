/**
 * Migration: Add AI Lead Scoring Columns to Leads Table
 * Adds new columns for GPT-5 lead priority scoring and business intelligence
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

async function addColumns() {
  console.log('🔧 Starting migration: Add AI Scoring Columns');
  console.log('');

  // Check if we can access the table
  const { data: testData, error: testError } = await supabase
    .from('leads')
    .select('id')
    .limit(1);

  if (testError) {
    console.error('❌ Cannot access leads table:', testError.message);
    process.exit(1);
  }

  console.log('✅ Leads table accessible');
  console.log('');

  // List of columns to add
  const columnsToAdd = [
    { name: 'lead_priority', type: 'INTEGER', description: 'Overall lead priority score (0-100)' },
    { name: 'lead_priority_reasoning', type: 'TEXT', description: 'AI explanation of priority score' },
    { name: 'priority_tier', type: 'TEXT', description: 'Priority tier: hot, warm, or cold' },
    { name: 'budget_likelihood', type: 'TEXT', description: 'Budget likelihood: high, medium, or low' },
    { name: 'fit_score', type: 'INTEGER', description: 'ICP fit score (0-100)' },
    { name: 'quality_gap_score', type: 'INTEGER', description: 'Quality gap dimension (0-25)' },
    { name: 'budget_score', type: 'INTEGER', description: 'Budget dimension (0-25)' },
    { name: 'urgency_score', type: 'INTEGER', description: 'Urgency dimension (0-20)' },
    { name: 'industry_fit_score', type: 'INTEGER', description: 'Industry fit dimension (0-15)' },
    { name: 'company_size_score', type: 'INTEGER', description: 'Company size dimension (0-10)' },
    { name: 'engagement_score', type: 'INTEGER', description: 'Engagement dimension (0-5)' },
    { name: 'business_intelligence', type: 'JSONB', description: 'Business intelligence data' },
    { name: 'crawl_metadata', type: 'JSONB', description: 'Multi-page crawl metadata' }
  ];

  console.log(`📋 Attempting to add ${columnsToAdd.length} columns...`);
  console.log('');

  // Try to add each column by attempting an insert with the column
  // If column doesn't exist, we'll get an error
  for (const column of columnsToAdd) {
    console.log(`Checking column: ${column.name}`);

    try {
      // Try to select this column
      const { error } = await supabase
        .from('leads')
        .select(column.name)
        .limit(1);

      if (error && error.message.includes('does not exist')) {
        console.log(`  ❌ Column ${column.name} does not exist`);
        console.log(`  ℹ️  Cannot add columns via Supabase JS client`);
        console.log(`  ℹ️  Please run this SQL in Supabase SQL Editor:`);
        console.log(`  ALTER TABLE leads ADD COLUMN ${column.name} ${column.type};`);
      } else if (error) {
        console.log(`  ❌ Error checking ${column.name}:`, error.message);
      } else {
        console.log(`  ✅ Column ${column.name} already exists`);
      }
    } catch (err) {
      console.log(`  ❌ Error:`, err.message);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('🔧 MANUAL MIGRATION REQUIRED');
  console.log('');
  console.log('Please run these SQL commands in your Supabase SQL Editor:');
  console.log('');
  console.log('-- Add AI Lead Scoring Columns');
  columnsToAdd.forEach(col => {
    console.log(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
  });
  console.log('');
  console.log('Then verify with:');
  console.log('SELECT lead_priority, priority_tier, budget_likelihood FROM leads LIMIT 1;');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
}

addColumns().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
