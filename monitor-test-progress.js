import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './analysis-engine/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🔍 Monitoring test progress - checking database every 30 seconds...\n');
console.log('Expected: 10 prospects to be analyzed\n');

let lastCount = 0;

async function checkProgress() {
  const { data, error, count } = await supabase
    .from('leads')
    .select('company_name, website_grade, overall_score, pages_discovered, pages_crawled, analyzed_at', { count: 'exact' })
    .order('analyzed_at', { ascending: false });

  if (error) {
    console.log(`[${new Date().toLocaleTimeString()}] ❌ Error:`, error.message);
    return;
  }

  const currentCount = count || 0;
  const timestamp = new Date().toLocaleTimeString();

  if (currentCount > lastCount) {
    console.log(`\n[${timestamp}] 🎉 NEW LEAD SAVED! Total: ${currentCount}/10`);

    // Show the most recent lead
    const latest = data[0];
    console.log(`   Company: ${latest.company_name}`);
    console.log(`   Grade: ${latest.website_grade} (${latest.overall_score}/100)`);
    console.log(`   Pages: ${latest.pages_discovered} discovered, ${latest.pages_crawled} crawled`);

    lastCount = currentCount;
  } else {
    console.log(`[${timestamp}] ⏳ Still processing... (${currentCount}/10 complete)`);
  }

  if (currentCount >= 10) {
    console.log(`\n✅ ALL 10 PROSPECTS COMPLETED!`);
    console.log(`\nFinal Results:`);
    data.forEach((lead, i) => {
      console.log(`  ${i+1}. ${lead.company_name} - Grade ${lead.website_grade} (${lead.overall_score}/100)`);
    });
    process.exit(0);
  }
}

// Check immediately, then every 30 seconds
checkProgress();
setInterval(checkProgress, 30000);
