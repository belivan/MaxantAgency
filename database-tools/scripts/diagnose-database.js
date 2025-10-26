/**
 * Database Diagnostic Script
 * Checks current state of Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('\n' + '='.repeat(70));
console.log('🔍 DATABASE DIAGNOSTIC REPORT');
console.log('='.repeat(70));
console.log(`\nSupabase URL: ${process.env.SUPABASE_URL}`);
console.log('Service Key: ' + (process.env.SUPABASE_SERVICE_KEY ? '***' + process.env.SUPABASE_SERVICE_KEY.slice(-10) : 'MISSING'));
console.log('\n');

// Test 1: Check exec_sql function
console.log('1️⃣  Checking exec_sql() function...');
try {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1 as test;' });
  if (error) {
    console.log('   ❌ exec_sql() function does NOT exist or failed');
    console.log(`   Error: ${error.message}`);
  } else {
    console.log('   ✅ exec_sql() function exists and works');
  }
} catch (err) {
  console.log('   ❌ exec_sql() function does NOT exist');
  console.log(`   Error: ${err.message}`);
}

console.log('\n');

// Test 2: Check projects table
console.log('2️⃣  Checking "projects" table...');
try {
  const { data: allProjects, error: allError, count } = await supabase
    .from('projects')
    .select('*', { count: 'exact' })
    .limit(10);

  if (allError) {
    if (allError.code === '42P01') {
      console.log('   ❌ Table "projects" does NOT exist in database');
    } else {
      console.log(`   ❌ Error: ${allError.message}`);
    }
  } else {
    console.log(`   ✅ Table exists with ${count || 0} row(s)`);

    // Check for our specific project
    const { data: ourProject, error: projectError } = await supabase
      .from('projects')
      .select('id, name, created_at')
      .eq('id', '6024ee94-aeab-48a6-ad2e-3b814d23f798')
      .single();

    if (projectError || !ourProject) {
      console.log('   ⚠️  Project "6024ee94-aeab-48a6-ad2e-3b814d23f798" NOT FOUND');
    } else {
      console.log('   ✅ Test project found:');
      console.log(`      Name: ${ourProject.name}`);
      console.log(`      Created: ${ourProject.created_at}`);
    }

    if (allProjects && allProjects.length > 0) {
      console.log(`\n   All projects:`);
      allProjects.forEach(p => {
        console.log(`      - ${p.name} (${p.id})`);
      });
    }
  }
} catch (err) {
  console.log(`   ❌ Unexpected error: ${err.message}`);
}

console.log('\n');

// Test 3: Check project_prospects table
console.log('3️⃣  Checking "project_prospects" table...');
try {
  const { data, error, count } = await supabase
    .from('project_prospects')
    .select('*', { count: 'exact' })
    .limit(10);

  if (error) {
    if (error.code === '42P01') {
      console.log('   ❌ Table "project_prospects" does NOT exist in database');
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
  } else {
    console.log(`   ✅ Table exists with ${count || 0} row(s)`);

    if (count > 0) {
      console.log(`\n   Sample links:`);
      data.forEach(link => {
        console.log(`      - Project: ${link.project_id}, Prospect: ${link.prospect_id}`);
      });
    }
  }
} catch (err) {
  console.log(`   ❌ Unexpected error: ${err.message}`);
}

console.log('\n');

// Test 4: Check prospects table
console.log('4️⃣  Checking "prospects" table...');
try {
  const { data, error, count } = await supabase
    .from('prospects')
    .select('id, company_name, industry, website, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) {
    if (error.code === '42P01') {
      console.log('   ❌ Table "prospects" does NOT exist in database');
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
  } else {
    console.log(`   ✅ Table exists with ${count || 0} row(s)`);

    // Check for our run_id
    const { data: ourProspects, error: runError, count: runCount } = await supabase
      .from('prospects')
      .select('*', { count: 'exact' })
      .eq('run_id', '403059c0-18fe-4db6-b585-459288f47da3');

    if (!runError && runCount > 0) {
      console.log(`   ✅ Found ${runCount} prospects from our test run`);
    } else {
      console.log(`   ⚠️  No prospects found from run_id: 403059c0-18fe-4db6-b585-459288f47da3`);
    }

    if (data && data.length > 0) {
      console.log(`\n   Recent prospects:`);
      data.slice(0, 10).forEach((p, i) => {
        const date = new Date(p.created_at).toLocaleString();
        console.log(`      ${i + 1}. ${p.company_name || 'Unknown'} - ${date}`);
      });
    }
  }
} catch (err) {
  console.log(`   ❌ Unexpected error: ${err.message}`);
}

console.log('\n');

// Test 5: Check leads table
console.log('5️⃣  Checking "leads" table...');
try {
  const { data, error, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .limit(5);

  if (error) {
    if (error.code === '42P01') {
      console.log('   ❌ Table "leads" does NOT exist in database');
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
  } else {
    console.log(`   ✅ Table exists with ${count || 0} row(s)`);
  }
} catch (err) {
  console.log(`   ❌ Unexpected error: ${err.message}`);
}

console.log('\n');

// Summary
console.log('='.repeat(70));
console.log('📊 DIAGNOSTIC SUMMARY');
console.log('='.repeat(70));
console.log('\nWhat we found:');
console.log('- exec_sql() function: Check output above');
console.log('- projects table: Check output above');
console.log('- project_prospects table: Check output above');
console.log('- prospects table: Check output above');
console.log('- leads table: Check output above');
console.log('\n' + '='.repeat(70) + '\n');