#!/usr/bin/env node

/**
 * Simple SQL Migration Runner
 * Executes SQL directly to add columns to projects table
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// Parse Supabase connection string from URL
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Extract database connection info from Supabase URL
// Format: https://PROJECT_REF.supabase.co
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

// Construct PostgreSQL connection string
// Note: You may need to get the direct PostgreSQL connection details from Supabase dashboard
console.log('\n🔧 Adding columns to projects table\n');
console.log('⚠️  Note: This script requires direct PostgreSQL access.');
console.log('   Please use one of these methods:\n');
console.log('   Method 1: Run SQL in Supabase SQL Editor');
console.log('   -----------------------------------------');
console.log('   1. Go to: https://supabase.com/dashboard');
console.log('   2. Select your project');
console.log('   3. Go to SQL Editor');
console.log('   4. Run this SQL:\n');
console.log('   ALTER TABLE projects ADD COLUMN IF NOT EXISTS icp_brief jsonb;');
console.log('   ALTER TABLE projects ADD COLUMN IF NOT EXISTS analysis_config jsonb;');
console.log('   ALTER TABLE projects ADD COLUMN IF NOT EXISTS outreach_config jsonb;\n');

console.log('   Method 2: Use psql command line');
console.log('   --------------------------------');
console.log('   Get connection string from Supabase Dashboard > Project Settings > Database');
console.log('   Then run:');
console.log('   psql "YOUR_CONNECTION_STRING" -c "ALTER TABLE projects ADD COLUMN IF NOT EXISTS icp_brief jsonb;"');
console.log('   psql "YOUR_CONNECTION_STRING" -c "ALTER TABLE projects ADD COLUMN IF NOT EXISTS analysis_config jsonb;"');
console.log('   psql "YOUR_CONNECTION_STRING" -c "ALTER TABLE projects ADD COLUMN IF NOT EXISTS outreach_config jsonb;"\n');

console.log('   Method 3: Continue with test (will attempt using Supabase client)');
console.log('   ------------------------------------------------------------------');
console.log('   The test script will show if columns are missing.\n');
