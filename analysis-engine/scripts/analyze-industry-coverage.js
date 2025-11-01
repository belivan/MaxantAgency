import { supabase } from '../database/supabase-client.js';

async function analyzeIndustries() {
  // Get all leads with their industries
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('industry, fit_score, quality_gap_score')
    .order('analyzed_at', { ascending: false })
    .limit(50);

  if (leadsError) {
    console.error('Error fetching leads:', leadsError);
    return;
  }

  // Get all benchmarks
  const { data: benchmarks, error: benchmarksError } = await supabase
    .from('benchmarks')
    .select('industry, company_name');

  if (benchmarksError) {
    console.error('Error fetching benchmarks:', benchmarksError);
    return;
  }

  const benchmarkIndustries = new Set(benchmarks.map(b => b.industry));

  // Analyze industry coverage
  const industryStats = {};

  leads.forEach(lead => {
    const industry = lead.industry || 'unknown';
    if (!industryStats[industry]) {
      industryStats[industry] = {
        total: 0,
        withAIGrading: 0,
        withoutAIGrading: 0,
        hasBenchmark: benchmarkIndustries.has(industry)
      };
    }
    industryStats[industry].total++;

    if (lead.fit_score !== null && lead.quality_gap_score !== null) {
      industryStats[industry].withAIGrading++;
    } else {
      industryStats[industry].withoutAIGrading++;
    }
  });

  console.log('\n📊 Industry Coverage Analysis (Last 50 Leads)');
  console.log('='.repeat(80));
  console.log('\n✅ Industries WITH Benchmarks:');
  Object.entries(industryStats)
    .filter(([_, stats]) => stats.hasBenchmark)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([industry, stats]) => {
      const aiSuccessRate = ((stats.withAIGrading / stats.total) * 100).toFixed(0);
      console.log(`  ${industry.padEnd(30)} ${stats.total} leads, ${aiSuccessRate}% AI grading success`);
    });

  console.log('\n❌ Industries MISSING Benchmarks:');
  Object.entries(industryStats)
    .filter(([_, stats]) => !stats.hasBenchmark)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([industry, stats]) => {
      console.log(`  ${industry.padEnd(30)} ${stats.total} leads (ALL failing AI grading)`);
    });

  console.log('\n📋 Existing Benchmarks:');
  benchmarks.forEach(b => {
    console.log(`  ✓ ${b.industry}: ${b.company_name}`);
  });

  console.log('\n💡 Recommendation:');
  const missingIndustries = Object.entries(industryStats)
    .filter(([_, stats]) => !stats.hasBenchmark && stats.total > 0)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  console.log('\n  Add benchmarks for these industries (highest volume first):');
  missingIndustries.forEach(([industry, stats], i) => {
    console.log(`  ${i + 1}. ${industry} (${stats.total} leads waiting)`);
  });

  return missingIndustries.map(([industry]) => industry);
}

analyzeIndustries().then((industries) => {
  console.log('\n✅ Analysis complete');
  if (industries && industries.length > 0) {
    console.log(`\n🎯 Priority industries for benchmark population: ${industries.join(', ')}`);
  }
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
