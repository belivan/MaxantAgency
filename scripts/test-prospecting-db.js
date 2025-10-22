#!/usr/bin/env node
/**
 * Test script for prospecting engine database operations
 */

import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load env from root .env (centralized configuration)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnv = path.resolve(__dirname, '../.env');

if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  console.error('⚠️  Root .env file not found!');
  process.exit(1);
}

// Import prospecting database functions
import {
  saveProspect,
  getProspects,
  updateProspect,
  deleteProspect,
  getProspectStats,
  supabase
} from '../prospecting-engine/database/supabase-client.js';

console.log('\n🧪 Testing Prospecting Engine Database Operations\n');
console.log('='.repeat(50));

// Test data
const testProspect = {
  company_name: 'Test Company ' + Date.now(),
  industry: 'restaurant',
  website: 'https://test-company.com',
  website_status: 'active',
  city: 'Austin',
  state: 'TX',
  address: '123 Test St, Austin, TX 78701',
  contact_email: 'test@example.com',
  contact_phone: '(512) 555-0123',
  description: 'A test restaurant for audit purposes',
  services: ['dine-in', 'takeout', 'delivery'],
  google_rating: 4.5,
  google_review_count: 125,
  icp_match_score: 85,
  is_relevant: true,
  status: 'ready_for_analysis',
  run_id: 'test-run-' + Date.now(),
  source: 'test-audit',
  discovery_cost: 0.05,
  discovery_time_ms: 1500
};

async function runTests() {
  let createdId = null;
  let passCount = 0;
  let failCount = 0;

  // Test 1: Check database connection
  console.log('\n📌 Test 1: Database Connection');
  try {
    const { data, error } = await supabase
      .from('prospects')
      .select('count', { count: 'exact', head: true });

    if (error) throw error;
    console.log(`✅ Connected to database (${data} existing prospects)`);
    passCount++;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    failCount++;
    return { passCount, failCount };
  }

  // Test 2: Save a prospect
  console.log('\n📌 Test 2: Save Prospect');
  try {
    const saved = await saveProspect(testProspect);
    createdId = saved.id;
    console.log('✅ Prospect saved successfully');
    console.log('   ID:', saved.id);
    console.log('   Company:', saved.company_name);
    console.log('   Status:', saved.status);
    passCount++;
  } catch (error) {
    console.error('❌ Failed to save prospect:', error.message);
    failCount++;
  }

  // Test 3: Get prospects with filters
  console.log('\n📌 Test 3: Get Prospects with Filters');
  try {
    const result = await getProspects({
      city: 'Austin',
      limit: 5
    });
    console.log('✅ Retrieved prospects:', result.data.length);
    console.log('   Total in Austin:', result.total);
    passCount++;
  } catch (error) {
    console.error('❌ Failed to get prospects:', error.message);
    failCount++;
  }

  // Test 4: Update a prospect
  if (createdId) {
    console.log('\n📌 Test 4: Update Prospect');
    try {
      const updated = await updateProspect(createdId, {
        status: 'analyzing',
        google_rating: 4.8
      });
      console.log('✅ Prospect updated successfully');
      console.log('   New status:', updated.status);
      console.log('   New rating:', updated.google_rating);
      passCount++;
    } catch (error) {
      console.error('❌ Failed to update prospect:', error.message);
      failCount++;
    }
  }

  // Test 5: Get prospect stats
  console.log('\n📌 Test 5: Get Prospect Stats');
  try {
    const stats = await getProspectStats();
    console.log('✅ Retrieved prospect stats');
    console.log('   Total prospects:', stats.total);
    console.log('   By status:', JSON.stringify(stats.byStatus, null, 2));
    console.log('   By city:', Object.keys(stats.byCity).slice(0, 3).join(', '), '...');
    passCount++;
  } catch (error) {
    console.error('❌ Failed to get stats:', error.message);
    failCount++;
  }

  // Test 6: Check required fields validation
  console.log('\n📌 Test 6: Required Fields Validation');
  try {
    await saveProspect({
      // Missing required fields: company_name, industry
      website: 'https://invalid.com'
    });
    console.error('❌ Should have failed with missing required fields');
    failCount++;
  } catch (error) {
    console.log('✅ Correctly rejected prospect with missing required fields');
    passCount++;
  }

  // Test 7: Clean up test data
  if (createdId) {
    console.log('\n📌 Test 7: Delete Test Prospect');
    try {
      await deleteProspect(createdId);
      console.log('✅ Test prospect deleted successfully');
      passCount++;
    } catch (error) {
      console.error('❌ Failed to delete test prospect:', error.message);
      failCount++;
    }
  }

  // Test 8: Verify prospects table structure
  console.log('\n📌 Test 8: Verify Table Structure');
  try {
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .limit(1);

    if (error) throw error;

    const expectedColumns = [
      'id', 'company_name', 'industry', 'website', 'website_status',
      'city', 'state', 'address', 'contact_email', 'contact_phone',
      'description', 'services', 'google_place_id', 'google_rating',
      'social_profiles', 'icp_match_score', 'is_relevant', 'status',
      'run_id', 'created_at', 'updated_at'
    ];

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      const missingColumns = expectedColumns.filter(col => !columns.includes(col));

      if (missingColumns.length === 0) {
        console.log('✅ All expected columns present in prospects table');
        passCount++;
      } else {
        console.log('⚠️  Missing columns:', missingColumns.join(', '));
        failCount++;
      }
    } else {
      console.log('ℹ️  No data to verify columns (table might be empty)');
      passCount++;
    }
  } catch (error) {
    console.error('❌ Failed to verify table structure:', error.message);
    failCount++;
  }

  return { passCount, failCount };
}

// Run tests
runTests().then(({ passCount, failCount }) => {
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  console.log(`   ✅ Passed: ${passCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('='.repeat(50) + '\n');

  process.exit(failCount > 0 ? 1 : 0);
}).catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});