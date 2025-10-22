/**
 * Direct Database Test
 * Tests Supabase operations directly
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root
dotenv.config({ path: resolve(__dirname, '../.env') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testDatabase() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('DIRECT DATABASE TEST');
  console.log('═══════════════════════════════════════════════════════════════');

  // Test 1: Check if we can connect
  console.log('\n1. Testing database connection...');
  try {
    const { data: leads, error, count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Failed to query leads table:', error.message);
      return;
    }
    console.log(`✅ Connected! Found ${count || 0} leads in database`);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return;
  }

  // Test 2: Check if reports table exists
  console.log('\n2. Checking if reports table exists...');
  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Reports table not accessible:', error.message);
      console.log('   This table may need to be created');
    } else {
      console.log('✅ Reports table exists');
    }
  } catch (error) {
    console.error('❌ Error checking reports table:', error.message);
  }

  // Test 3: Get a project to use for testing
  console.log('\n3. Getting a project for testing...');
  let project_id;
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1)
      .single();

    if (error || !projects) {
      console.error('❌ No projects found. Creating test project...');
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({ name: 'Test Project', status: 'active' })
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create project:', createError.message);
        return;
      }
      project_id = newProject.id;
      console.log(`✅ Created project: ${newProject.name}`);
    } else {
      project_id = projects.id;
      console.log(`✅ Found project: ${projects.name}`);
    }
  } catch (error) {
    console.error('❌ Error with projects:', error.message);
    return;
  }

  // Test 4: Save a test lead
  console.log('\n4. Testing lead save operation...');
  const testLead = {
    url: `https://test-${Date.now()}.example.com`,
    company_name: `Test Company ${Date.now()}`,
    industry: 'test',
    project_id: project_id,  // Required field
    overall_score: 75,
    website_grade: 'B',
    // grade_label: 'Good',  // Removed - doesn't exist in schema
    design_score: 80,
    design_score_desktop: 82,
    design_score_mobile: 78,
    seo_score: 70,
    content_score: 75,
    social_score: 60,
    accessibility_score: 65,

    // Issues and insights
    design_issues: ['Issue 1', 'Issue 2'],
    seo_issues: ['SEO issue 1'],
    content_issues: ['Content issue 1'],
    quick_wins: ['Quick win 1', 'Quick win 2'],
    top_issue: 'Main problem with the site',
    one_liner: 'This site needs improvement',
    analysis_summary: 'Detailed analysis summary',

    // Metadata
    has_https: true,
    is_mobile_friendly: true,
    analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    console.log('   Attempting to save lead...');
    const { data: savedLead, error } = await supabase
      .from('leads')
      .upsert(testLead, { onConflict: 'url' })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to save lead:', error.message);
      console.error('   Full error:', error);
      return;
    }

    console.log('✅ Lead saved successfully!');
    console.log(`   Lead ID: ${savedLead.id}`);
    console.log(`   Company: ${savedLead.company_name}`);
    console.log(`   Grade: ${savedLead.website_grade}`);
    console.log(`   Score: ${savedLead.overall_score}`);

    // Test 5: Read back the lead
    console.log('\n5. Reading back the lead...');
    const { data: readLead, error: readError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', savedLead.id)
      .single();

    if (readError) {
      console.error('❌ Failed to read lead:', readError.message);
    } else {
      console.log('✅ Lead read successfully!');
      console.log('   Verified all fields are saved');
    }

    // Test 6: Generate a report (if the endpoint exists)
    console.log('\n6. Testing report generation...');
    console.log('   Checking if analysis engine is running...');

    try {
      const healthResponse = await fetch('http://localhost:3001/health');
      if (!healthResponse.ok) {
        console.log('⚠️  Analysis engine not running');
        console.log('   Skipping report generation test');
      } else {
        console.log('   Analysis engine is running, testing report generation...');

        const reportResponse = await fetch('http://localhost:3001/api/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: savedLead.id,
            format: 'markdown',
            sections: ['all']
          })
        });

        if (reportResponse.ok) {
          const reportData = await reportResponse.json();
          console.log('✅ Report generated successfully!');
          console.log(`   Report ID: ${reportData.report?.id}`);
          console.log(`   Storage path: ${reportData.report?.storage_path}`);
        } else {
          const errorText = await reportResponse.text();
          console.error('❌ Failed to generate report:', reportResponse.status);
          console.error('   Response:', errorText);
        }
      }
    } catch (error) {
      console.log('⚠️  Cannot connect to analysis engine');
      console.log('   Run "npm run dev:analysis" to start it');
    }

    // Cleanup
    console.log('\n7. Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', savedLead.id);

    if (deleteError) {
      console.error('⚠️  Failed to delete test lead:', deleteError.message);
    } else {
      console.log('✅ Test lead deleted');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
}

testDatabase().catch(console.error);