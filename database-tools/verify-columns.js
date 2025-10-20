/**
 * Verify that config columns exist in projects table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyColumns() {
  console.log('\n🔍 Verifying columns in projects table...\n');

  // Try to query information_schema
  let data = null;
  let error = null;

  try {
    const result = await supabase.rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'projects'
        ORDER BY ordinal_position;
      `
    });
    data = result.data;
    error = result.error;
  } catch (e) {
    error = e;
  }

  if (error || !data) {
    console.log('⚠️  Cannot query information_schema via RPC\n');
    console.log('Attempting alternative method: Direct table query with SELECT *\n');

    // Try to select all columns to see what's available
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (projectError) {
      console.error('❌ Error:', projectError.message);
      return;
    }

    if (projectData && projectData.length > 0) {
      console.log('✅ Successfully queried projects table');
      console.log('\n📋 Columns in first project record:');
      console.log(Object.keys(projectData[0]).join(', '));

      // Check for our target columns
      const hasIcpBrief = 'icp_brief' in projectData[0];
      const hasAnalysisConfig = 'analysis_config' in projectData[0];
      const hasOutreachConfig = 'outreach_config' in projectData[0];

      console.log('\n📊 Configuration columns:');
      console.log(`  icp_brief: ${hasIcpBrief ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`  analysis_config: ${hasAnalysisConfig ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`  outreach_config: ${hasOutreachConfig ? '✅ EXISTS' : '❌ MISSING'}\n`);

      if (hasIcpBrief && hasAnalysisConfig && hasOutreachConfig) {
        console.log('🎉 All configuration columns are present!\n');
      } else {
        console.log('⚠️  Some columns are missing. Migration may not have completed.\n');
      }
    } else {
      console.log('⚠️  No projects in database yet');
      console.log('Creating a test project to verify columns...\n');

      const { data: newProject, error: insertError } = await supabase
        .from('projects')
        .insert({
          name: 'Column Verification Test',
          status: 'active',
          icp_brief: { test: true },
          analysis_config: { test: true },
          outreach_config: { test: true }
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert failed:', insertError.message);
        console.log('\nThis suggests columns do not exist or Supabase schema cache needs refresh.\n');
      } else {
        console.log('✅ Test project created successfully!');
        console.log('📋 Columns:', Object.keys(newProject).join(', '));

        // Clean up
        await supabase.from('projects').delete().eq('id', newProject.id);
        console.log('✓ Test project deleted\n');
        console.log('🎉 All configuration columns are working!\n');
      }
    }
  } else {
    console.log('✅ Retrieved column information from information_schema\n');
    console.log(data);
  }
}

verifyColumns().catch(console.error);
