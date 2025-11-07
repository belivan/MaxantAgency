/**
 * Review and Approve Optimizations
 *
 * Interactive CLI tool to review pending optimizations and approve/reject them.
 *
 * Usage:
 *   node review-optimizations.js              # Review all pending
 *   node review-optimizations.js --approve <run_id>   # Approve specific run
 *   node review-optimizations.js --reject <run_id>    # Reject specific run
 */

import { supabase } from '../database/supabase-client.js';
import { applyWinningVariant } from './services/ab-test-manager.js';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

/**
 * Save variant to file system
 * Creates folder structure: config/prompts/web-design/{analyzer-name}/v{N}-{type}.json
 */
async function saveVariantToFile(variant) {
  // Map analyzer name to prompt file name
  // e.g., "desktop-visual-analyzer" -> "desktop-visual-analysis"
  const analyzerToPromptName = {
    // UNIFIED ANALYZERS (PRIMARY - in active use)
    'unified-visual-analyzer': 'unified-visual-analysis',
    'unified-technical-analyzer': 'unified-technical-analysis',

    // LEGACY ANALYZERS (FALLBACK - used when unified is disabled)
    'desktop-visual-analyzer': 'desktop-visual-analysis',
    'mobile-visual-analyzer': 'mobile-visual-analysis',
    'seo-analyzer': 'seo-analysis',
    'content-analyzer': 'content-analysis',

    // STANDALONE ANALYZERS (ALWAYS USED)
    'social-analyzer': 'social-analysis',
    'accessibility-analyzer': 'accessibility-analysis'
  };

  const promptName = analyzerToPromptName[variant.analyzer_name] || variant.analyzer_name;
  const promptDir = path.join(process.cwd(), 'config', 'prompts', variant.prompt_category, promptName);

  // Ensure directory exists
  await fs.mkdir(promptDir, { recursive: true });

  // Determine filename based on variant type and version
  let filename;
  if (variant.variant_type === 'base') {
    filename = 'base.json';
  } else {
    filename = `v${variant.version_number}-${variant.variant_type}.json`;
  }

  const filePath = path.join(promptDir, filename);

  // Write the prompt content to file
  await fs.writeFile(
    filePath,
    JSON.stringify(variant.prompt_content, null, 2),
    'utf-8'
  );

  // Return relative path for database storage
  return path.relative(path.join(process.cwd(), 'config', 'prompts'), filePath);
}

/**
 * Get all pending optimization runs
 */
async function getPendingOptimizations() {
  const { data, error } = await supabase
    .from('optimization_runs')
    .select('*')
    .eq('decision', 'pending_review')
    .is('reviewed_by', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Display optimization details
 */
function displayOptimization(run, index = null) {
  const prefix = index !== null ? `[${index + 1}] ` : '';

  console.log('\n' + '═'.repeat(70));
  console.log(`${prefix}Optimization Run: ${run.id}`);
  console.log('═'.repeat(70));

  console.log(`\n📊 Basic Info:`);
  console.log(`   Run #${run.run_number} for ${run.analyzer_name}`);
  console.log(`   Created: ${new Date(run.created_at).toLocaleString()}`);
  console.log(`   Data points analyzed: ${run.data_points_analyzed}`);
  console.log(`   Optimization cost: $${run.cost_of_optimization?.toFixed(6) || 'N/A'}`);
  console.log(`   Duration: ${(run.duration_ms / 1000).toFixed(1)}s`);

  console.log(`\n📈 Current Performance:`);
  if (run.metrics_before?.composite) {
    const composite = run.metrics_before.composite;
    console.log(`   Composite Score: ${(composite.score * 100).toFixed(1)}%`);
    console.log(`   Accuracy: ${(composite.components.accuracy * 100).toFixed(1)}%`);
    console.log(`   Cost Efficiency: ${(composite.components.cost * 100).toFixed(1)}%`);
    console.log(`   Speed: ${(composite.components.speed * 100).toFixed(1)}%`);
  }

  if (run.metrics_before?.aiCalls) {
    const ai = run.metrics_before.aiCalls;
    console.log(`\n   AI Metrics:`);
    console.log(`     Avg Cost: $${ai.avgCost?.toFixed(6)}`);
    console.log(`     Avg Duration: ${ai.avgDuration?.toFixed(0)}ms`);
    console.log(`     Avg Tokens: ${ai.avgTotalTokens?.toFixed(0)}`);
  }

  console.log(`\n🤖 AI Analysis:`);
  if (run.optimization_insights?.patternsIdentified) {
    console.log(`\n   Patterns Identified:`);
    run.optimization_insights.patternsIdentified.forEach((pattern, i) => {
      console.log(`   ${i + 1}. ${pattern}`);
    });
  }

  if (run.optimization_insights?.weaknesses) {
    console.log(`\n   Weaknesses:`);
    run.optimization_insights.weaknesses.forEach((weakness, i) => {
      console.log(`   ${i + 1}. ${weakness}`);
    });
  }

  console.log(`\n💡 Proposed Changes (${run.changes_proposed?.length || 0}):`);
  if (run.changes_proposed) {
    run.changes_proposed.forEach((change, i) => {
      console.log(`\n   ${i + 1}. ${change.changeType} (${change.classification})`);
      console.log(`      ${change.reasoning}`);

      if (change.currentValue !== undefined) {
        console.log(`      Change: ${change.currentValue} → ${change.proposedValue}`);
      }

      if (change.expectedImpact) {
        console.log(`      Expected Impact: Accuracy ${change.expectedImpact.accuracy}, Cost ${change.expectedImpact.cost}, Speed ${change.expectedImpact.speed}`);
      }
    });
  }

  console.log(`\n🎯 Expected Outcome:`);
  if (run.improvement_summary) {
    Object.entries(run.improvement_summary).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
  }

  console.log(`\n📝 Decision Reasoning:`);
  console.log(`   ${run.decision_reasoning || 'N/A'}`);

  console.log(`\n🔍 Full AI Reasoning:`);
  console.log(`   ${run.change_reasoning || 'N/A'}`);
}

/**
 * Approve an optimization
 */
async function approveOptimization(runId, reviewerEmail = 'human-reviewer') {
  console.log(`\n✅ Approving optimization ${runId}...`);

  // Get the run
  const { data: run, error: fetchError } = await supabase
    .from('optimization_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (fetchError) throw fetchError;

  if (!run.suggested_variant_id) {
    throw new Error('No suggested variant to apply');
  }

  // Get the variant
  const { data: variant, error: variantError } = await supabase
    .from('prompt_variants')
    .select('*')
    .eq('id', run.suggested_variant_id)
    .single();

  if (variantError) throw variantError;

  // Apply the variant (sets is_active=true in database)
  try {
    await applyWinningVariant(run.suggested_variant_id);

    // Save variant to file system
    const filePath = await saveVariantToFile(variant);
    console.log(`   📁 Saved variant to: ${filePath}`);

    // Update variant record with file path
    await supabase
      .from('prompt_variants')
      .update({ file_path: filePath })
      .eq('id', run.suggested_variant_id);

    // Update optimization run
    await supabase
      .from('optimization_runs')
      .update({
        decision: 'approved',
        reviewed_by: reviewerEmail,
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', runId);

    console.log(`✅ Optimization approved and applied!`);
    console.log(`   Variant ${run.suggested_variant_id} is now active for ${run.analyzer_name}`);

  } catch (error) {
    console.error(`❌ Failed to apply optimization:`, error);
    throw error;
  }
}

/**
 * Reject an optimization
 */
async function rejectOptimization(runId, reason, reviewerEmail = 'human-reviewer') {
  console.log(`\n❌ Rejecting optimization ${runId}...`);

  await supabase
    .from('optimization_runs')
    .update({
      decision: 'rejected',
      reviewed_by: reviewerEmail,
      decision_reasoning: `${reason} (Rejected by human reviewer)`,
      updated_at: new Date().toISOString()
    })
    .eq('id', runId);

  // Archive the variant
  const { data: run } = await supabase
    .from('optimization_runs')
    .select('suggested_variant_id')
    .eq('id', runId)
    .single();

  if (run?.suggested_variant_id) {
    await supabase
      .from('prompt_variants')
      .update({
        variant_type: 'archived',
        archived_at: new Date().toISOString()
      })
      .eq('id', run.suggested_variant_id);
  }

  console.log(`✅ Optimization rejected and archived.`);
}

/**
 * Interactive review mode
 */
async function interactiveReview() {
  console.log('\n' + '═'.repeat(70));
  console.log('🔍 OPTIMIZATION REVIEW TOOL');
  console.log('═'.repeat(70));

  const pending = await getPendingOptimizations();

  if (pending.length === 0) {
    console.log('\n✨ No pending optimizations to review!');
    console.log('\nAll optimizations have been reviewed or auto-applied.\n');
    return;
  }

  console.log(`\nFound ${pending.length} pending optimization(s) to review:\n`);

  // Display summary
  pending.forEach((run, i) => {
    console.log(`${i + 1}. ${run.analyzer_name} - Run #${run.run_number} (${new Date(run.created_at).toLocaleDateString()})`);
  });

  // Review each one
  for (let i = 0; i < pending.length; i++) {
    const run = pending[i];

    displayOptimization(run, i);

    console.log('\n' + '─'.repeat(70));
    console.log('What would you like to do?');
    console.log('  [a] Approve and apply this optimization');
    console.log('  [r] Reject this optimization');
    console.log('  [s] Skip to next');
    console.log('  [v] View full variant details');
    console.log('  [q] Quit');
    console.log('─'.repeat(70));

    const choice = await question('\nYour choice: ');

    switch (choice.toLowerCase().trim()) {
      case 'a':
        const confirmApprove = await question('Are you sure you want to approve? (yes/no): ');
        if (confirmApprove.toLowerCase() === 'yes') {
          try {
            await approveOptimization(run.id);
            console.log('\n✅ Approved successfully!\n');
          } catch (error) {
            console.error('\n❌ Approval failed:', error.message);
          }
        } else {
          console.log('\nApproval cancelled.');
        }
        break;

      case 'r':
        const reason = await question('Reason for rejection: ');
        const confirmReject = await question('Are you sure you want to reject? (yes/no): ');
        if (confirmReject.toLowerCase() === 'yes') {
          try {
            await rejectOptimization(run.id, reason);
            console.log('\n✅ Rejected successfully!\n');
          } catch (error) {
            console.error('\n❌ Rejection failed:', error.message);
          }
        } else {
          console.log('\nRejection cancelled.');
        }
        break;

      case 's':
        console.log('\nSkipping to next...\n');
        break;

      case 'v':
        // Show full variant
        const { data: variant } = await supabase
          .from('prompt_variants')
          .select('*')
          .eq('id', run.suggested_variant_id)
          .single();

        if (variant) {
          console.log('\n📄 Full Variant Details:');
          console.log(JSON.stringify(variant.prompt_content, null, 2));
        }
        i--; // Review same optimization again
        break;

      case 'q':
        console.log('\nExiting review tool...\n');
        rl.close();
        return;

      default:
        console.log('\nInvalid choice. Please try again.');
        i--; // Review same optimization again
    }

    if (i < pending.length - 1) {
      await question('\nPress Enter to continue to next optimization...');
    }
  }

  console.log('\n✨ All pending optimizations have been reviewed!\n');
  rl.close();
}

/**
 * Command-line mode
 */
async function commandLineMode() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // No arguments - run interactive mode
    return interactiveReview();
  }

  const command = args[0];
  const runId = args[1];

  // --list doesn't need a run ID
  if (!runId && command !== '--list') {
    console.error('Error: Missing run ID');
    console.log('\nUsage:');
    console.log('  node review-optimizations.js                    # Interactive mode');
    console.log('  node review-optimizations.js --approve <run_id> # Approve specific');
    console.log('  node review-optimizations.js --reject <run_id>  # Reject specific');
    console.log('  node review-optimizations.js --list             # List pending');
    process.exit(1);
  }

  switch (command) {
    case '--approve':
      const { data: approveRun } = await supabase
        .from('optimization_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (!approveRun) {
        console.error(`Error: Optimization run ${runId} not found`);
        process.exit(1);
      }

      displayOptimization(approveRun);
      await approveOptimization(runId);
      break;

    case '--reject':
      const { data: rejectRun } = await supabase
        .from('optimization_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (!rejectRun) {
        console.error(`Error: Optimization run ${runId} not found`);
        process.exit(1);
      }

      displayOptimization(rejectRun);
      const reason = args[2] || 'Rejected via command line';
      await rejectOptimization(runId, reason);
      break;

    case '--list':
      const pending = await getPendingOptimizations();
      console.log(`\nPending Optimizations (${pending.length}):\n`);
      pending.forEach((run, i) => {
        console.log(`${i + 1}. ID: ${run.id}`);
        console.log(`   Analyzer: ${run.analyzer_name}`);
        console.log(`   Created: ${new Date(run.created_at).toLocaleString()}`);
        console.log(`   Run: #${run.run_number}`);
        console.log('');
      });
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

// Run the tool
commandLineMode()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
