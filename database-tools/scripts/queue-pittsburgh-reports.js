#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PROJECT_ID = 'a4bba02c-9a9b-459c-972d-d98016f34d94';

async function queueReports() {
  const { data: leads } = await supabase
    .from('leads')
    .select('id, company_name, website_grade')
    .eq('project_id', PROJECT_ID);

  if (!leads || leads.length === 0) {
    console.log('No leads found');
    return;
  }

  console.log(`\nQueuing reports for ${leads.length} Pittsburgh leads...\n`);

  let successCount = 0;
  for (const lead of leads) {
    try {
      const response = await fetch('http://localhost:3003/api/generate-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id })
      });

      const result = await response.json();

      if (result.success) {
        successCount++;
        console.log(`✅ [${successCount}/${leads.length}] ${lead.company_name} (Grade ${lead.website_grade})`);
      } else {
        console.log(`❌ Failed: ${lead.company_name} - ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Failed: ${lead.company_name} - ${error.message}`);
    }
  }

  console.log(`\n✅ Queued ${successCount}/${leads.length} reports!`);
  console.log('📊 Reports will complete in ~2-3 minutes per report.\n');
}

queueReports().catch(console.error);
