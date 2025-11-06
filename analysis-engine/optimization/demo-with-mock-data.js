/**
 * Demo the optimization system with mock data
 * Creates fake analysis data then runs optimization
 */

import { supabase } from '../database/supabase-client.js';
import { optimizeAnalyzer } from './services/prompt-optimizer.js';
import { getAnalyzerMetrics } from './services/metrics-aggregator.js';

async function createMockData() {
  console.log('\n📝 Creating mock analysis data...\n');

  // Create 25 mock AI calls
  const mockCalls = [];
  for (let i = 0; i < 25; i++) {
    mockCalls.push({
      engine: 'analysis',
      module: 'desktop-visual-analyzer',
      model: 'gpt-5-mini',
      provider: 'openai',
      prompt_tokens: 800 + Math.floor(Math.random() * 200),
      completion_tokens: 400 + Math.floor(Math.random() * 100),
      total_tokens: 1200 + Math.floor(Math.random() * 300),
      cost: 0.012 + (Math.random() * 0.006 - 0.003),
      duration_ms: 3000 + Math.floor(Math.random() * 1000),
      cached: false,
      created_at: new Date(Date.now() - (25 - i) * 3600000).toISOString()
    });
  }

  const { error } = await supabase
    .from('ai_calls')
    .insert(mockCalls);

  if (error) {
    console.error('Error inserting mock data:', error);
    return false;
  }

  console.log(`✅ Created 25 mock AI call records\n`);
  return true;
}

async function demo() {
  console.log('\n' + '='.repeat(70));
  console.log('🎬 DEMO: Self-Tuning Optimization System');
  console.log('='.repeat(70) + '\n');

  console.log('This demo will:');
  console.log('1. Create mock analysis data');
  console.log('2. Aggregate metrics');
  console.log('3. Run AI optimization');
  console.log('4. Show the recommendations');
  console.log('5. Mark for your review\n');

  // Check if we already have data
  const { data: existing } = await supabase
    .from('ai_calls')
    .select('id')
    .eq('module', 'desktop-visual-analyzer')
    .limit(1);

  if (existing && existing.length > 0) {
    console.log('ℹ️  Found existing data, using that instead of creating mock data\n');
  } else {
    const created = await createMockData();
    if (!created) {
      console.log('❌ Failed to create mock data\n');
      return;
    }
  }

  // Step 1: Show metrics
  console.log('📊 Step 1: Current Performance Metrics\n');

  const metrics = await getAnalyzerMetrics('desktop-visual-analyzer', { limit: 25 });

  console.log(`Data points: ${metrics.dataPoints}`);

  if (metrics.aiCalls) {
    console.log(`\nAI Call Metrics:`);
    console.log(`   Avg cost: $${metrics.aiCalls.avgCost.toFixed(6)}`);
    console.log(`   Avg duration: ${Math.round(metrics.aiCalls.avgDuration)}ms`);
    console.log(`   Total cost: $${metrics.aiCalls.totalCost.toFixed(4)}`);
  }

  console.log(`\nComposite Score: ${(metrics.composite.score * 100).toFixed(1)}%`);
  console.log(`   Accuracy: ${(metrics.composite.components.accuracy * 100).toFixed(1)}%`);
  console.log(`   Cost: ${(metrics.composite.components.cost * 100).toFixed(1)}%`);
  console.log(`   Speed: ${(metrics.composite.components.speed * 100).toFixed(1)}%`);

  // Step 2: Run optimization
  console.log('\n🤖 Step 2: Running AI Optimization\n');
  console.log('Calling GPT-5 to analyze performance and suggest improvements...');
  console.log('(This will cost ~$0.02 and take 10-30 seconds)\n');

  try {
    const result = await optimizeAnalyzer('desktop-visual-analyzer', {
      limit: 25,
      humanFeedback: 'Demo run - suggest improvements based on mock data patterns'
    });

    if (!result.success) {
      console.log(`\n⚠️  Optimization did not run: ${result.message}\n`);
      return;
    }

    console.log(`\n✅ Optimization completed!\n`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`Run ID: ${result.runId}`);
    console.log(`Decision: ${result.decision.action}`);
    console.log(`Cost: $${result.cost.toFixed(6)}`);
    console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
    console.log(`═══════════════════════════════════════════════════════════════`);

    // Show AI analysis
    if (result.suggestions?.analysis) {
      const analysis = result.suggestions.analysis;

      console.log(`\n📋 AI Analysis:`);

      if (analysis.patternsIdentified && analysis.patternsIdentified.length > 0) {
        console.log(`\n   Patterns Identified:`);
        analysis.patternsIdentified.forEach((pattern, i) => {
          console.log(`   ${i + 1}. ${pattern}`);
        });
      }

      if (analysis.weaknesses && analysis.weaknesses.length > 0) {
        console.log(`\n   Weaknesses:`);
        analysis.weaknesses.forEach((weakness, i) => {
          console.log(`   ${i + 1}. ${weakness}`);
        });
      }

      if (analysis.strengths && analysis.strengths.length > 0) {
        console.log(`\n   Strengths:`);
        analysis.strengths.forEach((strength, i) => {
          console.log(`   ${i + 1}. ${strength}`);
        });
      }
    }

    // Show recommendations
    if (result.suggestions?.recommendations) {
      console.log(`\n💡 Recommendations (${result.suggestions.recommendations.length}):`);

      result.suggestions.recommendations.forEach((rec, i) => {
        console.log(`\n   ${i + 1}. ${rec.changeType} (${rec.classification})`);
        console.log(`      Reasoning: ${rec.reasoning}`);

        if (rec.currentValue !== undefined) {
          console.log(`      Change: ${rec.currentValue} → ${rec.proposedValue}`);
        }

        if (rec.expectedImpact) {
          console.log(`      Expected Impact:`);
          console.log(`         Accuracy: ${rec.expectedImpact.accuracy}`);
          console.log(`         Cost: ${rec.expectedImpact.cost}`);
          console.log(`         Speed: ${rec.expectedImpact.speed}`);
        }
      });
    }

    // Show expected outcome
    if (result.suggestions?.expectedOutcome) {
      const outcome = result.suggestions.expectedOutcome;

      console.log(`\n🎯 Expected Outcome:`);
      if (outcome.accuracyImprovement) {
        console.log(`   Accuracy: ${outcome.accuracyImprovement}`);
      }
      if (outcome.costReduction) {
        console.log(`   Cost: ${outcome.costReduction}`);
      }
      if (outcome.speedImprovement) {
        console.log(`   Speed: ${outcome.speedImprovement}`);
      }
      console.log(`   New composite score: ${(outcome.newCompositeScore * 100).toFixed(1)}%`);
      console.log(`   Confidence: ${outcome.confidence}`);
    }

    console.log(`\n📋 Next Steps:\n`);
    console.log(`✅ The optimization is marked as "pending_review" (auto-approval is disabled)`);
    console.log(`\n🔍 To review and approve/reject:`);
    console.log(`   cd optimization`);
    console.log(`   node review-optimizations.js`);
    console.log(`\n📊 To view in database:`);
    console.log(`   SELECT * FROM optimization_runs ORDER BY created_at DESC LIMIT 1;`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ DEMO COMPLETE - Your optimization is ready for review!');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    console.error(error.stack);
  }
}

// Run demo
demo()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
