/**
 * Run SQL Migration for Benchmark Columns
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  console.log('🔧 Running SQL migration...\n');

  try {
    // Read the SQL file
    const sql = readFileSync('./add-benchmark-columns.sql', 'utf-8');

    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      if (!statement) continue;

      console.log(`[${i + 1}/${statements.length}] Executing...`);
      console.log(`   ${statement.substring(0, 60).replace(/\n/g, ' ')}...`);

      const { data, error } = await supabase.rpc('exec_sql', {
        query: statement
      });

      if (error) {
        // Try alternative method using raw SQL
        try {
          const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({ query: statement })
          });

          if (!response.ok) {
            console.log(`   ⚠️  Could not execute via RPC: ${error.message}`);
            console.log('      You may need to run this SQL manually in Supabase SQL Editor');
          } else {
            console.log('   ✅ Executed');
          }
        } catch (fetchError) {
          console.log(`   ⚠️  Error: ${error.message}`);
        }
      } else {
        console.log('   ✅ Executed');
      }
    }

    console.log('\n📋 Manual execution instructions:');
    console.log('   1. Open Supabase Dashboard > SQL Editor');
    console.log('   2. Copy contents of add-benchmark-columns.sql');
    console.log('   3. Paste and run');
    console.log('\n   File location: add-benchmark-columns.sql');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runMigration();
