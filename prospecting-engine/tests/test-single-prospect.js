/**
 * Test Single Prospect Analysis
 * Quick test with just 1 prospect
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './analysis-engine/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSingleProspect() {
  console.log('🧪 Testing Single Prospect Analysis\n');

  // Fetch 1 prospect
  const { data: prospects } = await supabase
    .from('prospects')
    .select('id, company_name, website')
    .not('website', 'is', null)
    .limit(1);

  const prospect = prospects[0];
  console.log(`📊 Testing: ${prospect.company_name} (${prospect.website})\n`);

  console.log('🚀 Calling /api/analyze...\n');
  const startTime = Date.now();

  try {
    const response = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prospect_ids: [prospect.id]
      })
    });

    console.log(`Response status: ${response.status}`);

    const result = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Completed in ${duration}s\n`);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSingleProspect();
