import { supabase } from '../database/supabase-client.js';

async function checkIndustryNames() {
  // Get unique industry names from leads
  const { data: leads } = await supabase
    .from('leads')
    .select('industry')
    .not('industry', 'is', null);

  const leadIndustries = [...new Set(leads.map(l => l.industry))].sort();

  // Get unique industry names from benchmarks
  const { data: benchmarks } = await supabase
    .from('benchmarks')
    .select('industry, company_name');

  console.log('\n📋 Industry Names in Leads:');
  leadIndustries.forEach(i => console.log(`  - ${i}`));

  console.log('\n📋 Industry Names in Benchmarks:');
  benchmarks.forEach(b => console.log(`  - ${b.industry} (${b.company_name})`));

  console.log('\n🔍 Mismatches:');
  const benchmarkIndustries = new Set(benchmarks.map(b => b.industry));
  const mismatches = [];

  leadIndustries.forEach(leadInd => {
    if (!benchmarkIndustries.has(leadInd)) {
      // Check for similar industry names
      const similar = [...benchmarkIndustries].find(bi =>
        bi.toLowerCase().includes(leadInd.toLowerCase()) ||
        leadInd.toLowerCase().includes(bi.toLowerCase())
      );
      if (similar) {
        console.log(`  ❌ '${leadInd}' (in leads) != '${similar}' (in benchmarks)`);
        mismatches.push({ lead: leadInd, benchmark: similar });
      } else {
        console.log(`  ⚠️  '${leadInd}' has NO similar benchmark`);
      }
    }
  });

  return mismatches;
}

checkIndustryNames()
  .then((mismatches) => {
    if (mismatches.length > 0) {
      console.log('\n💡 Solution: Standardize industry names');
      console.log('   Option 1: Update benchmark industry from "Dentistry" to "Dental Practice"');
      console.log('   Option 2: Update leads industry from "Dental Practice" to "Dentistry"');
      console.log('   Option 3: Add industry alias/fuzzy matching to benchmark-matcher.js');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
