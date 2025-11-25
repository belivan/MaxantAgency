#!/usr/bin/env node

/**
 * Auto-complete Dental 11_7 project
 * Monitors analysis progress and auto-queues reports when complete
 */

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

const PROJECT_ID = 'b9c9f0f3-ee36-467a-996e-dd8e684475d0';

async function checkAnalysisProgress() {
  const response = await fetch('http://localhost:3001/api/queue-status');
  const data = await response.json();
  return data.types.analysis;
}

async function getLeadsNeedingReports() {
  // Get all leads for this project
  const { data: leads } = await supabase
    .from('leads')
    .select('id, company_name, website_grade')
    .eq('project_id', PROJECT_ID);

  if (!leads || leads.length === 0) return [];

  // Get all reports for these leads
  const leadIds = leads.map(l => l.id);
  const { data: reports } = await supabase
    .from('reports')
    .select('lead_id')
    .in('lead_id', leadIds);

  const reportLeadIds = new Set((reports || []).map(r => r.lead_id));

  // Find leads without reports
  return leads.filter(l => !reportLeadIds.has(l.id));
}

async function queueReport(leadId) {
  const response = await fetch('http://localhost:3003/api/generate-queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead_id: leadId })
  });
  return response.json();
}

async function main() {
  console.log('\n🔄 Monitoring Dental 11_7 project completion...\n');

  let attempts = 0;
  const maxAttempts = 40; // ~2 minutes max wait

  while (attempts < maxAttempts) {
    const analysisStatus = await checkAnalysisProgress();

    console.log(`[${new Date().toLocaleTimeString()}] Analysis: ${analysisStatus.completed}/${analysisStatus.queued + analysisStatus.completed} completed, ${analysisStatus.running} running, ${analysisStatus.pending} pending`);

    // Check if all analyses are done
    if (analysisStatus.active === 0 && analysisStatus.pending === 0 && analysisStatus.queued === 0) {
      console.log('\n✅ All analyses complete! Checking for reports...\n');

      const leadsNeedingReports = await getLeadsNeedingReports();

      if (leadsNeedingReports.length === 0) {
        console.log('✅ All leads have reports! Project complete!\n');

        // Final stats
        const { data: allLeads, count: totalLeads } = await supabase
          .from('leads')
          .select('id', { count: 'exact' })
          .eq('project_id', PROJECT_ID);

        const { data: allReports, count: totalReports } = await supabase
          .from('reports')
          .select('id', { count: 'exact' })
          .in('lead_id', allLeads.map(l => l.id));

        console.log('📊 Final Stats:');
        console.log(`   Leads Analyzed: ${totalLeads}`);
        console.log(`   Reports Generated: ${totalReports}`);
        console.log('   Status: 100% Complete!\n');

        break;
      }

      console.log(`📄 Found ${leadsNeedingReports.length} leads needing reports:`);
      leadsNeedingReports.forEach((l, i) => {
        console.log(`   ${i + 1}. ${l.company_name} (Grade ${l.website_grade})`);
      });
      console.log('\n🚀 Queueing reports...\n');

      let successCount = 0;
      for (const lead of leadsNeedingReports) {
        const result = await queueReport(lead.id);
        if (result.success) {
          successCount++;
          console.log(`✅ [${successCount}/${leadsNeedingReports.length}] Queued: ${lead.company_name}`);
        } else {
          console.log(`❌ Failed: ${lead.company_name} - ${result.error}`);
        }
      }

      console.log(`\n✅ Queued ${successCount}/${leadsNeedingReports.length} reports!`);
      console.log('📊 Reports will complete in ~2-3 minutes.\n');

      break;
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  if (attempts >= maxAttempts) {
    console.log('\n⏰ Max wait time reached. Some analyses may still be running.');
    console.log('   Run this script again to queue remaining reports.\n');
  }
}

main().catch(console.error);
