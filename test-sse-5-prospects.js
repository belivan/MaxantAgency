import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './analysis-engine/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🧪 Testing 5 REAL PROSPECTS via SSE-enabled /api/analyze endpoint\n');

// 1. Get 5 prospect IDs
console.log('📊 Fetching 5 prospect IDs...');
const { data: prospects, error } = await supabase
  .from('prospects')
  .select('id, company_name, website')
  .limit(5);

if (error) {
  console.log('❌ Error:', error.message);
  process.exit(1);
}

console.log(`✅ Found ${prospects.length} prospects\n`);
prospects.forEach((p, i) => {
  console.log(`  ${i+1}. ${p.company_name} - ${p.website}`);
});

const prospectIds = prospects.map(p => p.id);

console.log('\n🚀 Starting SSE analysis...\n');

// 2. Call API with SSE
const url = 'http://localhost:3001/api/analyze';

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ prospect_ids: prospectIds })
});

console.log('Response headers:', response.headers.get('content-type'));

if (response.headers.get('content-type') === 'text/event-stream') {
  console.log('✅ SSE stream connected!\n');
  console.log('═'.repeat(60));

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log('\n═'.repeat(60));
        console.log('🎉 Stream completed!');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('event:')) {
          const eventType = line.substring(7).trim();
          continue;
        }

        if (line.startsWith('data:')) {
          const data = JSON.parse(line.substring(6));

          if (data.message) {
            console.log(`📢 ${data.message}`);
          } else if (data.company_name && data.current) {
            if (data.grade) {
              console.log(`\n✅ [${data.current}/${data.total}] ${data.company_name}`);
              console.log(`   Grade: ${data.grade} (${data.score}/100)`);
              console.log(`   URL: ${data.url}`);
            } else if (data.error) {
              console.log(`\n❌ [${data.current}/${data.total}] ${data.company_name}`);
              console.log(`   Error: ${data.error}`);
            } else {
              console.log(`\n⏳ [${data.current}/${data.total}] Analyzing ${data.company_name}...`);
            }
          } else if (data.success !== undefined) {
            // Complete event
            console.log('\n═'.repeat(60));
            console.log(`🎉 ANALYSIS COMPLETE!`);
            console.log(`   Total: ${data.total}`);
            console.log(`   Successful: ${data.successful}`);
            console.log(`   Failed: ${data.failed}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('\n❌ Stream error:', err.message);
  }

  // 3. Verify in database
  console.log('\n🔍 Verifying database saves...\n');
  const { data: leads } = await supabase
    .from('leads')
    .select('company_name, website_grade, overall_score, screenshot_desktop_url, screenshot_mobile_url, pages_discovered, pages_crawled, outreach_angle, ai_page_selection')
    .order('analyzed_at', { ascending: false })
    .limit(5);

  console.log(`✅ Found ${leads?.length || 0} leads in database:\n`);
  leads?.forEach((lead, i) => {
    console.log(`${i+1}. ${lead.company_name}`);
    console.log(`   Grade: ${lead.website_grade} (${lead.overall_score}/100)`);
    console.log(`   Screenshots: Desktop ${lead.screenshot_desktop_url ? '✅' : '❌'} | Mobile ${lead.screenshot_mobile_url ? '✅' : '❌'}`);
    console.log(`   Pages: ${lead.pages_discovered || 0} discovered, ${lead.pages_crawled || 0} crawled`);
    console.log(`   Outreach Angle: ${lead.outreach_angle ? '✅' : '❌'}`);
    console.log(`   AI Page Selection: ${lead.ai_page_selection ? '✅' : '❌'}`);
    console.log('');
  });

  console.log('🎉 TEST COMPLETE!');
} else {
  console.log('❌ Server did not return SSE stream');
  const text = await response.text();
  console.log('Response:', text);
}
