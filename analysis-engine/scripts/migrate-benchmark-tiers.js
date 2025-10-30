/**
 * Migrate Benchmark Tiers
 *
 * Converts UI-friendly tier labels to database tier values:
 * - aspirational → national
 * - competitive → regional
 * - baseline → local
 */

import { supabase } from '../database/supabase-client.js';

const TIER_MIGRATION = {
  'aspirational': 'national',
  'competitive': 'regional',
  'baseline': 'local'
};

async function migrateBenchmarkTiers() {
  console.log('\n🔄 Migrating benchmark tiers...\n');

  try {
    // Step 1: Check what tiers exist
    console.log('📊 Checking existing benchmark tiers...');
    const { data: benchmarks, error: fetchError } = await supabase
      .from('benchmarks')
      .select('id, company_name, benchmark_tier');

    if (fetchError) {
      throw new Error(`Failed to fetch benchmarks: ${fetchError.message}`);
    }

    if (!benchmarks || benchmarks.length === 0) {
      console.log('⚠️  No benchmarks found in database');
      return;
    }

    console.log(`✅ Found ${benchmarks.length} benchmarks\n`);

    // Group by tier
    const tierCounts = {};
    benchmarks.forEach(b => {
      tierCounts[b.benchmark_tier] = (tierCounts[b.benchmark_tier] || 0) + 1;
    });

    console.log('Current tier distribution:');
    Object.entries(tierCounts).forEach(([tier, count]) => {
      const needsMigration = TIER_MIGRATION[tier] ? '❌ INVALID' : '✅ VALID';
      console.log(`  ${tier}: ${count} benchmarks ${needsMigration}`);
    });

    // Step 2: Identify benchmarks that need migration
    const invalidTiers = Object.keys(TIER_MIGRATION);
    const benchmarksToMigrate = benchmarks.filter(b =>
      invalidTiers.includes(b.benchmark_tier)
    );

    if (benchmarksToMigrate.length === 0) {
      console.log('\n✅ All benchmarks already have valid tiers. No migration needed.');
      return;
    }

    console.log(`\n🔄 Migrating ${benchmarksToMigrate.length} benchmarks...\n`);

    // Step 3: Migrate each invalid tier
    let successCount = 0;
    let errorCount = 0;

    for (const benchmark of benchmarksToMigrate) {
      const oldTier = benchmark.benchmark_tier;
      const newTier = TIER_MIGRATION[oldTier];

      console.log(`  ${benchmark.company_name}: ${oldTier} → ${newTier}`);

      const { error: updateError } = await supabase
        .from('benchmarks')
        .update({ benchmark_tier: newTier })
        .eq('id', benchmark.id);

      if (updateError) {
        console.error(`    ❌ Failed: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`    ✅ Updated`);
        successCount++;
      }
    }

    // Step 4: Verify migration
    console.log('\n📊 Migration Results:');
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);

    if (successCount > 0) {
      console.log('\n🔍 Verifying migration...');
      const { data: afterMigration, error: verifyError } = await supabase
        .from('benchmarks')
        .select('benchmark_tier');

      if (!verifyError && afterMigration) {
        const newTierCounts = {};
        afterMigration.forEach(b => {
          newTierCounts[b.benchmark_tier] = (newTierCounts[b.benchmark_tier] || 0) + 1;
        });

        console.log('\nFinal tier distribution:');
        Object.entries(newTierCounts).forEach(([tier, count]) => {
          const validTiers = ['national', 'regional', 'local', 'manual'];
          const status = validTiers.includes(tier) ? '✅ VALID' : '❌ INVALID';
          console.log(`  ${tier}: ${count} benchmarks ${status}`);
        });
      }
    }

    console.log('\n✅ Migration complete!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateBenchmarkTiers();
