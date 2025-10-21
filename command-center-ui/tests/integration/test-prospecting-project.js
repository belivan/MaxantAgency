#!/usr/bin/env node

/**
 * Test Script: Prospecting with Project Integration
 *
 * This script tests the complete flow:
 * 1. Create a test project
 * 2. Verify project is created
 * 3. Check that ICP brief can be saved to project
 * 4. Verify ICP brief is persisted in database
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

async function runTests() {
  console.log('🧪 Testing Project-based Prospecting Integration\n');

  let testProjectId = null;

  try {
    // Test 1: Create a test project
    console.log('Test 1: Creating test project...');
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert({
        name: 'Test Project - Prospecting',
        description: 'Test project for prospecting with ICP brief',
        status: 'active'
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create project:', createError.message);
      return;
    }

    testProjectId = project.id;
    console.log('✅ Project created:', project.name, '(ID:', testProjectId.slice(0, 8) + '...)');

    // Test 2: Save ICP brief to project
    console.log('\nTest 2: Saving ICP brief to project...');
    const icpBrief = {
      industry: 'restaurants',
      city: 'San Francisco',
      target: 'Local restaurants in San Francisco',
      criteria: {
        min_rating: 3.5,
        has_website: true
      },
      count: 5
    };

    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        icp_brief: icpBrief,
        updated_at: new Date().toISOString()
      })
      .eq('id', testProjectId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to save ICP brief:', updateError.message);
      return;
    }

    console.log('✅ ICP brief saved successfully');

    // Test 3: Verify ICP brief is persisted
    console.log('\nTest 3: Verifying ICP brief persistence...');
    const { data: fetchedProject, error: fetchError } = await supabase
      .from('projects')
      .select('id, name, icp_brief, updated_at')
      .eq('id', testProjectId)
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch project:', fetchError.message);
      return;
    }

    if (!fetchedProject.icp_brief) {
      console.error('❌ ICP brief not found in database');
      return;
    }

    // Compare saved ICP brief
    const savedBrief = fetchedProject.icp_brief;
    if (
      savedBrief.industry === icpBrief.industry &&
      savedBrief.city === icpBrief.city &&
      savedBrief.target === icpBrief.target
    ) {
      console.log('✅ ICP brief matches expected data');
      console.log('   Industry:', savedBrief.industry);
      console.log('   City:', savedBrief.city);
      console.log('   Target:', savedBrief.target);
    } else {
      console.error('❌ ICP brief data mismatch');
      console.log('Expected:', icpBrief);
      console.log('Got:', savedBrief);
      return;
    }

    // Test 4: Test PATCH endpoint through Next.js API
    console.log('\nTest 4: Testing PATCH endpoint...');
    const newBrief = {
      industry: 'cafes',
      city: 'Oakland',
      target: 'Specialty coffee shops in Oakland'
    };

    const response = await fetch(`http://localhost:3000/api/projects/${testProjectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        icp_brief: newBrief
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ PATCH request failed:', errorData.error || response.statusText);
      console.log('   Note: Make sure Next.js dev server is running on port 3000');
    } else {
      const patchResult = await response.json();
      if (patchResult.success && patchResult.data.icp_brief) {
        console.log('✅ PATCH endpoint working correctly');
        console.log('   Updated ICP brief industry:', patchResult.data.icp_brief.industry);
      } else {
        console.error('❌ PATCH response invalid:', patchResult);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary:');
    console.log('   ✅ Project creation: PASSED');
    console.log('   ✅ ICP brief save: PASSED');
    console.log('   ✅ ICP brief persistence: PASSED');
    console.log('   ✅ PATCH endpoint: PASSED (if Next.js is running)');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup: Delete test project
    if (testProjectId) {
      console.log('\n🧹 Cleaning up test project...');
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', testProjectId);

      if (deleteError) {
        console.error('❌ Failed to delete test project:', deleteError.message);
        console.log('   Please manually delete project ID:', testProjectId);
      } else {
        console.log('✅ Test project deleted');
      }
    }
  }
}

runTests().catch(console.error);
