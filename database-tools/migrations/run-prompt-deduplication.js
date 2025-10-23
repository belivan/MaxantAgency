/**
 * Prompt Deduplication Migration Runner
 * 
 * Executes the prompt deduplication migration and reports statistics
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory (2 levels up from migrations/)
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

/**
 * Execute SQL migration
 */
async function runMigration() {
  console.log('🚀 Starting Prompt Deduplication Migration...\n');
  console.log('⚠️  This will:');
  console.log('   - Create 3 new version tables (prompt_versions, icp_versions, model_selection_versions)');
  console.log('   - Add foreign key columns to existing tables');
  console.log('   - Migrate existing snapshots to deduplicated storage');
  console.log('   - Keep old columns for rollback safety\n');

  const startTime = Date.now();

  try {
    // Read SQL file
    const sqlFile = path.join(__dirname, '20251022_prompt_deduplication.sql');
    
    if (!fs.existsSync(sqlFile)) {
      throw new Error(`Migration file not found: ${sqlFile}`);
    }

    const sql = fs.readFileSync(sqlFile, 'utf-8');

    console.log('📄 Executing migration SQL...');
    console.log('   (This may take several minutes for large datasets)\n');
    
    console.log('⚠️  IMPORTANT: This migration must be run directly in Supabase SQL Editor');
    console.log('   due to the complexity of the migration (DO blocks, functions, etc.).\n');
    console.log('   Please follow these steps:\n');
    console.log('   1. Open your Supabase project dashboard');
    console.log('   2. Navigate to: SQL Editor');
    console.log('   3. Create a new query');
    console.log('   4. Copy the contents of: database-tools/migrations/20251022_prompt_deduplication.sql');
    console.log('   5. Paste into the SQL Editor');
    console.log('   6. Click "Run" to execute the migration\n');
    console.log('   The migration SQL file is located at:');
    console.log(`   ${sqlFile}\n`);
    console.log('   After running the migration, you can verify it succeeded by running:');
    console.log('   node test-prompt-deduplication.js\n');
    
    console.log('✅ Migration file ready for manual execution');
    console.log('📊 Once executed, run the test suite to verify deduplication is working\n');

    return;

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n🔄 ROLLBACK INSTRUCTIONS:');
    console.error('   DROP TABLE IF EXISTS prompt_versions CASCADE;');
    console.error('   DROP TABLE IF EXISTS icp_versions CASCADE;');
    console.error('   DROP TABLE IF EXISTS model_selection_versions CASCADE;');
    console.error('   ALTER TABLE prospects DROP COLUMN IF EXISTS prompt_version_id;');
    console.error('   ALTER TABLE prospects DROP COLUMN IF EXISTS icp_version_id;');
    console.error('   ALTER TABLE prospects DROP COLUMN IF EXISTS model_version_id;');
    throw error;
  }
}

/**
 * Print migration statistics
 */
async function printStatistics() {
  try {
    // Query statistics
    const queries = [
      'SELECT COUNT(*) as count FROM prompt_versions',
      'SELECT COUNT(*) as count FROM icp_versions',
      'SELECT COUNT(*) as count FROM model_selection_versions',
      'SELECT COUNT(*) as count FROM prospects WHERE prompt_version_id IS NOT NULL',
      'SELECT COUNT(*) as count FROM prospects WHERE icp_version_id IS NOT NULL',
      'SELECT COUNT(*) as count FROM prospects WHERE model_version_id IS NOT NULL',
      'SELECT COALESCE(SUM(usage_count), 0) as count FROM prompt_versions',
      'SELECT COALESCE(SUM(usage_count), 0) as count FROM icp_versions'
    ];

    const results = await Promise.all(
      queries.map(async (query) => {
        const { data, error } = await supabase.rpc('exec', { query });
        if (error) return { count: 0 };
        return data?.[0] || { count: 0 };
      })
    );

    const [
      promptVersions,
      icpVersions,
      modelVersions,
      prospectsWithPrompts,
      prospectsWithIcp,
      prospectsWithModels,
      totalPromptUsages,
      totalIcpUsages
    ] = results.map(r => parseInt(r.count) || 0);

    console.log('📊 Migration Statistics:');
    console.log('========================================');
    console.log(`   Prompt Versions Created: ${promptVersions.toLocaleString()}`);
    console.log(`   ICP Versions Created: ${icpVersions.toLocaleString()}`);
    console.log(`   Model Versions Created: ${modelVersions.toLocaleString()}`);
    console.log('----------------------------------------');
    console.log(`   Prospects with Prompts: ${prospectsWithPrompts.toLocaleString()}`);
    console.log(`   Prospects with ICP: ${prospectsWithIcp.toLocaleString()}`);
    console.log(`   Prospects with Models: ${prospectsWithModels.toLocaleString()}`);
    console.log('----------------------------------------');
    console.log(`   Total Prompt Usages: ${totalPromptUsages.toLocaleString()}`);
    console.log(`   Total ICP Usages: ${totalIcpUsages.toLocaleString()}`);

    // Calculate deduplication ratio
    if (totalPromptUsages > 0 && promptVersions > 0) {
      const promptReduction = ((1 - (promptVersions / totalPromptUsages)) * 100).toFixed(1);
      console.log('========================================');
      console.log(`   Prompt Deduplication: ${promptVersions} configs stored instead of ${totalPromptUsages}`);
      console.log(`   ✅ Storage Reduction: ${promptReduction}%`);
    }

    if (totalIcpUsages > 0 && icpVersions > 0) {
      const icpReduction = ((1 - (icpVersions / totalIcpUsages)) * 100).toFixed(1);
      console.log(`   ICP Deduplication: ${icpVersions} configs stored instead of ${totalIcpUsages}`);
      console.log(`   ✅ Storage Reduction: ${icpReduction}%`);
    }

    // Calculate estimated storage savings
    const avgPromptSize = 5; // KB
    const avgIcpSize = 2; // KB
    const totalSavedKB = 
      ((totalPromptUsages - promptVersions) * avgPromptSize) +
      ((totalIcpUsages - icpVersions) * avgIcpSize);
    
    if (totalSavedKB > 0) {
      console.log('========================================');
      console.log(`   💾 Estimated Storage Savings: ~${(totalSavedKB / 1024).toFixed(2)} MB`);
      console.log(`      (Based on ~${avgPromptSize}KB per prompt, ~${avgIcpSize}KB per ICP)`);
    }

    console.log('========================================');

  } catch (error) {
    console.warn('⚠️  Could not fetch statistics:', error.message);
  }
}

// Run migration
runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
