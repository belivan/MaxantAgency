#!/usr/bin/env node

/**
 * Auto-complete Pittsburgh Dental 11_24 project
 * Monitors prospecting/analysis progress and auto-queues next steps
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

const PROJECT_ID = 'a4bba02c-9a9b-459c-972d-d98016f34d94';
const PROSPECTING_JOB_ID = 'f242017e-e8c8-44a8-82d6-1536a7517a87';

async function checkProspectingStatus() {
  const response = await fetch(`http://localhost:3010/api/prospect-status?job_ids=${PROSPECTING_JOB_ID}`);
  const data = await response.json();
  return data.jobs[0];
}

async function checkAnalysisProgress() {
  const response = await fetch('http://localhost:3001/api/queue-status');
  const data = await response.json();
  return data.types.analysis;
}

async function getUnanalyzedProspects() {
  // Get all prospects for this project
  const { data: projectProspects } = await supabase
    .from('project_prospects')
    .select('prospect_id')
    .eq('project_id', PROJECT_ID);

  if (!projectProspects || projectProspects.length === 0) return [];

  const prospectIds = projectProspects.map(pp => pp.prospect_id);

  // Get prospects with valid websites AND email addresses
  const { data: prospects } = await supabase
    .from('prospects')
    .select('id, company_name, website_status, contact_email')
    .in('id', prospectIds)
    .not('website_status', 'in', '("no_website","bot_protected","timeout","ssl_error","not_found")')
    .not('contact_email', 'is', null);

  if (!prospects || prospects.length === 0) return [];

  // Check which ones don't have leads yet
  const { data: leads } = await supabase
    .from('leads')
    .select('prospect_id')
    .eq('project_id', PROJECT_ID);

  const analyzedIds = new Set((leads || []).map(l => l.prospect_id));
  return prospects.filter(p => !analyzedIds.has(p.id));
}

async function queueAnalysis(prospectIds) {
  const response = await fetch('http://localhost:3001/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prospect_ids: prospectIds,
      project_id: PROJECT_ID
    })
  });
  return response.json();
}

async function getLeadsNeedingReports() {
  const { data: leads } = await supabase
    .from('leads')
    .select('id, company_name, website_grade')
    .eq('project_id', PROJECT_ID);

  if (!leads || leads.length === 0) return [];

  const leadIds = leads.map(l => l.id);
  const { data: reports } = await supabase
    .from('reports')
    .select('lead_id')
    .in('lead_id', leadIds);

  const reportLeadIds = new Set((reports || []).map(r => r.lead_id));
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
  console.log('\n🔄 Monitoring Pittsburgh Dental 11_24 project...\n');

  let attempts = 0;
  const maxAttempts = 200; // ~10 minutes max wait
  let prospectingComplete = false;
  let analysisQueued = false;

  while (attempts < maxAttempts) {
    // Phase 1: Wait for prospecting to complete
    if (!prospectingComplete) {
      const prospectingJob = await checkProspectingStatus();

      console.log(`[${new Date().toLocaleTimeString()}] Prospecting: ${prospectingJob.state}`);

      if (prospectingJob.state === 'completed') {
        prospectingComplete = true;
        console.log('\n✅ Prospecting complete!');
        console.log(`   Found: ${prospectingJob.result.found} prospects`);
        console.log(`   Saved: ${prospectingJob.result.saved} prospects\n`);
      } else if (prospectingJob.state === 'failed') {
        console.log('\n❌ Prospecting failed:', prospectingJob.error);
        break;
      }
    }

    // Phase 2: Queue analysis when prospecting is done
    if (prospectingComplete && !analysisQueued) {
      const unanalyzedProspects = await getUnanalyzedProspects();

      if (unanalyzedProspects.length > 0) {
        console.log(`\n📊 Found ${unanalyzedProspects.length} prospects ready for analysis`);
        console.log('🚀 Queueing analysis...\n');

        const prospectIds = unanalyzedProspects.map(p => p.id);
        const result = await queueAnalysis(prospectIds);

        if (result.success) {
          analysisQueued = true;
          console.log(`✅ Queued ${result.queued_count} prospects for analysis`);
          console.log(`   Job ID: ${result.job_id}\n`);
        }
      }
    }

    // Phase 3: Monitor analysis and queue reports
    if (analysisQueued) {
      const analysisStatus = await checkAnalysisProgress();

      console.log(`[${new Date().toLocaleTimeString()}] Analysis: ${analysisStatus.completed}/${analysisStatus.queued + analysisStatus.completed} completed, ${analysisStatus.running} running, ${analysisStatus.pending} pending`);

      // Check if analyses are done and queue reports
      if (analysisStatus.active === 0 && analysisStatus.pending === 0 && analysisStatus.queued === 0) {
        console.log('\n✅ All analyses complete! Checking for reports...\n');

        const leadsNeedingReports = await getLeadsNeedingReports();

        if (leadsNeedingReports.length === 0) {
          console.log('✅ All leads have reports! Project complete!\n');

          // Final stats
          const { count: totalLeads } = await supabase
            .from('leads')
            .select('id', { count: 'exact' })
            .eq('project_id', PROJECT_ID);

          const leadIds = (await supabase
            .from('leads')
            .select('id')
            .eq('project_id', PROJECT_ID)).data.map(l => l.id);

          const { count: totalReports } = await supabase
            .from('reports')
            .select('id', { count: 'exact' })
            .in('lead_id', leadIds);

          console.log('📊 Final Stats:');
          console.log(`   Leads Analyzed: ${totalLeads}`);
          console.log(`   Reports Generated: ${totalReports}`);
          console.log('   Status: 100% Complete!\n');

          break;
        }

        console.log(`📄 Found ${leadsNeedingReports.length} leads needing reports`);
        console.log('🚀 Queueing reports...\n');

        let successCount = 0;
        for (const lead of leadsNeedingReports) {
          const result = await queueReport(lead.id);
          if (result.success) {
            successCount++;
            console.log(`✅ [${successCount}/${leadsNeedingReports.length}] Queued: ${lead.company_name}`);
          } else {
            console.log(`❌ Failed: ${lead.company_name}`);
          }
        }

        console.log(`\n✅ Queued ${successCount}/${leadsNeedingReports.length} reports!`);
        console.log('📊 Reports will complete in ~2-3 minutes.\n');
      }
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  if (attempts >= maxAttempts) {
    console.log('\n⏰ Max wait time reached.');
    console.log('   Run this script again to continue monitoring.\n');
  }
}

main().catch(console.error);
