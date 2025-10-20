/**
 * Test Script: Project Configuration Storage
 * Tests the new icp_brief, analysis_config, and outreach_config columns
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

// Test data
const testProjectData = {
  name: 'Test Project - Config Storage',
  client_name: 'Test Client',
  description: 'Testing configuration storage capabilities',
  status: 'active',
  icp_brief: {
    industry: 'restaurant',
    location: 'Austin, TX',
    businessType: 'family-owned',
    targetRevenue: '$500K-$2M',
    painPoints: ['outdated website', 'no online ordering', 'poor mobile experience']
  },
  analysis_config: {
    analyzers: ['design', 'seo', 'content', 'social'],
    weights: {
      design: 30,
      seo: 30,
      content: 20,
      social: 20
    },
    strictMode: false,
    captureScreenshots: true
  },
  outreach_config: {
    strategy: 'problem-first',
    tone: 'professional-friendly',
    maxLength: 150,
    includeCallToAction: true,
    platforms: ['email', 'instagram']
  }
};

async function runTests() {
  console.log('\n🧪 Testing Project Configuration Storage\n');
  console.log('=' .repeat(60));

  let testProjectId = null;
  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Insert project with configs
    console.log('\n📝 Test 1: Insert project with icp_brief, analysis_config, and outreach_config');
    const { data: insertedProject, error: insertError } = await supabase
      .from('projects')
      .insert(testProjectData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ FAILED: Could not insert project');
      console.error('   Error:', insertError.message);
      failed++;
    } else {
      testProjectId = insertedProject.id;
      console.log('✅ PASSED: Project inserted successfully');
      console.log('   Project ID:', testProjectId);
      passed++;
    }

    // Test 2: Read project and verify configs
    if (testProjectId) {
      console.log('\n📖 Test 2: Read project and verify configuration data');
      const { data: readProject, error: readError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', testProjectId)
        .single();

      if (readError) {
        console.error('❌ FAILED: Could not read project');
        console.error('   Error:', readError.message);
        failed++;
      } else {
        // Verify icp_brief
        const icpMatch = JSON.stringify(readProject.icp_brief) === JSON.stringify(testProjectData.icp_brief);
        const analysisMatch = JSON.stringify(readProject.analysis_config) === JSON.stringify(testProjectData.analysis_config);
        const outreachMatch = JSON.stringify(readProject.outreach_config) === JSON.stringify(testProjectData.outreach_config);

        if (icpMatch && analysisMatch && outreachMatch) {
          console.log('✅ PASSED: All configurations retrieved correctly');
          console.log('   ICP Brief:', readProject.icp_brief ? '✓' : '✗');
          console.log('   Analysis Config:', readProject.analysis_config ? '✓' : '✗');
          console.log('   Outreach Config:', readProject.outreach_config ? '✓' : '✗');
          passed++;
        } else {
          console.error('❌ FAILED: Configuration data mismatch');
          if (!icpMatch) console.error('   ICP Brief does not match');
          if (!analysisMatch) console.error('   Analysis Config does not match');
          if (!outreachMatch) console.error('   Outreach Config does not match');
          failed++;
        }
      }
    }

    // Test 3: Update configs
    if (testProjectId) {
      console.log('\n🔄 Test 3: Update project configurations');
      const updatedAnalysisConfig = {
        ...testProjectData.analysis_config,
        strictMode: true,
        newField: 'test-value'
      };

      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update({ analysis_config: updatedAnalysisConfig })
        .eq('id', testProjectId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ FAILED: Could not update project');
        console.error('   Error:', updateError.message);
        failed++;
      } else {
        const configMatch = JSON.stringify(updatedProject.analysis_config) === JSON.stringify(updatedAnalysisConfig);
        if (configMatch) {
          console.log('✅ PASSED: Configuration updated successfully');
          console.log('   strictMode changed to:', updatedProject.analysis_config.strictMode);
          console.log('   newField added:', updatedProject.analysis_config.newField);
          passed++;
        } else {
          console.error('❌ FAILED: Updated configuration does not match');
          failed++;
        }
      }
    }

    // Test 4: Query by JSONB fields
    console.log('\n🔍 Test 4: Query projects using JSONB field values');
    const { data: queryResults, error: queryError } = await supabase
      .from('projects')
      .select('*')
      .contains('icp_brief', { industry: 'restaurant' });

    if (queryError) {
      console.error('❌ FAILED: Could not query by JSONB field');
      console.error('   Error:', queryError.message);
      failed++;
    } else {
      const foundTestProject = queryResults.some(p => p.id === testProjectId);
      if (foundTestProject) {
        console.log('✅ PASSED: JSONB query successful');
        console.log('   Found', queryResults.length, 'project(s) with industry=restaurant');
        passed++;
      } else {
        console.error('❌ FAILED: Test project not found in query results');
        failed++;
      }
    }

    // Test 5: Insert project with null configs (should work)
    console.log('\n📝 Test 5: Insert project with null configurations (should be allowed)');
    const { data: nullProject, error: nullError } = await supabase
      .from('projects')
      .insert({
        name: 'Test Project - No Configs',
        status: 'active'
      })
      .select()
      .single();

    if (nullError) {
      console.error('❌ FAILED: Could not insert project with null configs');
      console.error('   Error:', nullError.message);
      failed++;
    } else {
      console.log('✅ PASSED: Project with null configs inserted successfully');
      console.log('   icp_brief is null:', nullProject.icp_brief === null);
      console.log('   analysis_config is null:', nullProject.analysis_config === null);
      console.log('   outreach_config is null:', nullProject.outreach_config === null);
      passed++;

      // Clean up null project
      await supabase.from('projects').delete().eq('id', nullProject.id);
    }

  } catch (error) {
    console.error('\n💥 Unexpected error:', error.message);
    failed++;
  } finally {
    // Cleanup: Delete test project
    if (testProjectId) {
      console.log('\n🧹 Cleaning up test data...');
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', testProjectId);

      if (deleteError) {
        console.error('⚠️  Warning: Could not delete test project', testProjectId);
      } else {
        console.log('✓ Test project deleted');
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary\n');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total:  ${passed + failed}`);
  console.log(`\n${failed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed'}\n`);

  process.exit(failed === 0 ? 0 : 1);
}

runTests();
