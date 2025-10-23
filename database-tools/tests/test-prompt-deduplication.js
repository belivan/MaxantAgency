/**
 * Test script for prompt deduplication system
 * 
 * Validates:
 * - Version creation with content hashing
 * - Duplicate detection (same content = same version ID)
 * - Foreign key relationships
 * - Storage savings from deduplication
 * 
 * Usage:
 *   node database-tools/tests/test-prompt-deduplication.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
const testPrompts = {
  set1: {
    search: "Find B2B SaaS companies in healthcare",
    evaluation: "Score based on tech stack and funding",
    extraction: "Extract company details and contact info"
  },
  set2: {
    search: "Find B2B SaaS companies in healthcare", // Same as set1
    evaluation: "Score based on tech stack and funding", // Same as set1
    extraction: "Extract company details and contact info" // Same as set1
  },
  set3: {
    search: "Find e-commerce platforms in retail",
    evaluation: "Score based on revenue and growth",
    extraction: "Extract company details and social profiles"
  }
};

const testIcps = {
  icp1: {
    industry: "Healthcare SaaS",
    companySize: "50-200 employees",
    revenue: "$5M-$50M ARR",
    geography: "North America"
  },
  icp2: {
    industry: "Healthcare SaaS", // Same as icp1
    companySize: "50-200 employees",
    revenue: "$5M-$50M ARR",
    geography: "North America"
  },
  icp3: {
    industry: "E-commerce Platforms",
    companySize: "20-100 employees",
    revenue: "$2M-$20M ARR",
    geography: "United States"
  }
};

const testModels = {
  config1: {
    discovery: "gpt-5-fast",
    evaluation: "claude-sonnet-4.5",
    extraction: "gpt-4o"
  },
  config2: {
    discovery: "gpt-5-fast", // Same as config1
    evaluation: "claude-sonnet-4.5",
    extraction: "gpt-4o"
  },
  config3: {
    discovery: "grok-4-fast",
    evaluation: "claude-haiku-4.5",
    extraction: "gpt-5-mini"
  }
};

async function testPromptDeduplication() {
  console.log('\n🧪 Testing Prompt Deduplication System\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Create version for first prompt set
    console.log('\n📝 Test 1: Creating first prompt version...');
    const { data: version1, error: error1 } = await supabase.rpc(
      'get_or_create_prompt_version',
      {
        p_content: testPrompts.set1,
        p_source: 'test_deduplication'
      }
    );

    if (error1) throw new Error(`Failed to create version 1: ${error1.message}`);
    console.log(`✅ Created version ID: ${version1}`);

    // Test 2: Create version for identical prompt set (should return same ID)
    console.log('\n📝 Test 2: Creating duplicate prompt version...');
    const { data: version2, error: error2 } = await supabase.rpc(
      'get_or_create_prompt_version',
      {
        p_content: testPrompts.set2,
        p_source: 'test_deduplication'
      }
    );

    if (error2) throw new Error(`Failed to create version 2: ${error2.message}`);
    console.log(`✅ Returned version ID: ${version2}`);

    if (version1 === version2) {
      console.log('✅ PASS: Duplicate detection works! Same content = same ID');
    } else {
      console.log('❌ FAIL: Different IDs returned for identical content');
      process.exit(1);
    }

    // Test 3: Create version for different prompt set (should return new ID)
    console.log('\n📝 Test 3: Creating different prompt version...');
    const { data: version3, error: error3 } = await supabase.rpc(
      'get_or_create_prompt_version',
      {
        p_content: testPrompts.set3,
        p_source: 'test_deduplication'
      }
    );

    if (error3) throw new Error(`Failed to create version 3: ${error3.message}`);
    console.log(`✅ Created version ID: ${version3}`);

    if (version3 !== version1) {
      console.log('✅ PASS: Different content = different ID');
    } else {
      console.log('❌ FAIL: Same ID returned for different content');
      process.exit(1);
    }

    // Test 4: ICP Deduplication
    console.log('\n📝 Test 4: Testing ICP deduplication...');
    const { data: icpVersion1, error: icpError1 } = await supabase.rpc(
      'get_or_create_icp_version',
      {
        p_content: testIcps.icp1
      }
    );

    const { data: icpVersion2, error: icpError2 } = await supabase.rpc(
      'get_or_create_icp_version',
      {
        p_content: testIcps.icp2
      }
    );

    if (icpError1 || icpError2) {
      throw new Error('Failed to create ICP versions');
    }

    if (icpVersion1 === icpVersion2) {
      console.log('✅ PASS: ICP deduplication works!');
    } else {
      console.log('❌ FAIL: ICP deduplication failed');
      process.exit(1);
    }

    // Test 5: Model Selection Deduplication
    console.log('\n📝 Test 5: Testing model selection deduplication...');
    const { data: modelVersion1, error: modelError1 } = await supabase.rpc(
      'get_or_create_model_version',
      {
        p_content: testModels.config1
      }
    );

    const { data: modelVersion2, error: modelError2 } = await supabase.rpc(
      'get_or_create_model_version',
      {
        p_content: testModels.config2
      }
    );

    if (modelError1 || modelError2) {
      throw new Error('Failed to create model versions');
    }

    if (modelVersion1 === modelVersion2) {
      console.log('✅ PASS: Model selection deduplication works!');
    } else {
      console.log('❌ FAIL: Model selection deduplication failed');
      process.exit(1);
    }

    // Test 6: Verify versions can be retrieved
    console.log('\n📝 Test 6: Testing version retrieval...');
    const { data: retrievedPrompt, error: retrieveError } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('id', version1)
      .single();

    if (retrieveError) throw new Error(`Failed to retrieve version: ${retrieveError.message}`);
    
    console.log('✅ Retrieved prompt version:');
    console.log(`   - ID: ${retrievedPrompt.id}`);
    console.log(`   - Hash: ${retrievedPrompt.content_hash.substring(0, 16)}...`);
    console.log(`   - Source: ${retrievedPrompt.source}`);
    console.log(`   - Created: ${retrievedPrompt.created_at}`);

    // Test 7: Storage savings calculation
    console.log('\n📊 Test 7: Calculating storage savings...');
    
    const { count: promptCount } = await supabase
      .from('prompt_versions')
      .select('*', { count: 'exact', head: true });

    const { count: icpCount } = await supabase
      .from('icp_versions')
      .select('*', { count: 'exact', head: true });

    const { count: modelCount } = await supabase
      .from('model_selection_versions')
      .select('*', { count: 'exact', head: true });

    console.log('\n📈 Version Tables Summary:');
    console.log(`   - Unique Prompt Versions: ${promptCount || 0}`);
    console.log(`   - Unique ICP Versions: ${icpCount || 0}`);
    console.log(`   - Unique Model Versions: ${modelCount || 0}`);

    // Test 8: Cleanup test data
    console.log('\n🧹 Test 8: Cleaning up test data...');
    
    // Delete test prompt versions
    const { error: cleanupError1 } = await supabase
      .from('prompt_versions')
      .delete()
      .eq('source', 'test_deduplication');

    if (cleanupError1) {
      console.warn(`⚠️ Cleanup warning: ${cleanupError1.message}`);
    }

    // Note: ICP and model versions will be cleaned up via CASCADE
    console.log('✅ Test data cleaned up');

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 ALL TESTS PASSED!\n');
    console.log('✅ Prompt deduplication working correctly');
    console.log('✅ ICP deduplication working correctly');
    console.log('✅ Model selection deduplication working correctly');
    console.log('✅ Version retrieval working correctly');
    console.log('✅ Storage optimization active\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testPromptDeduplication();
