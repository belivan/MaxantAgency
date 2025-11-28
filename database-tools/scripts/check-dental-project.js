#!/usr/bin/env node

/**
 * Check status of Dental 11_7 project
 * Finds unanalyzed prospects and leads without reports
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

console.log('\n' + '='.repeat(80));
console.log('DENTAL 11_7 PROJECT STATUS REPORT');
console.log('='.repeat(80) + '\n');

async function checkProjectStatus() {
  // Step 1: Find the project
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, name')
    .ilike('name', '%dental%11%7%');

  if (projectError || !projects || projects.length === 0) {
    console.log('❌ Project not found. Searching all projects...\n');

    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, name')
      .order('created_at', { ascending: false })
      .limit(20);

    console.log('Recent projects:');
    allProjects?.forEach(p => console.log(`  - ${p.name} (${p.id})`));
    return;
  }

  const project = projects[0];
  console.log(`✅ Project Found: ${project.name}`);
  console.log(`   ID: ${project.id}\n`);

  // Step 2: Get all prospects linked to this project
  const { data: projectProspects, error: ppError, count: prospectCount } = await supabase
    .from('project_prospects')
    .select('prospect_id', { count: 'exact' })
    .eq('project_id', project.id);

  if (ppError) {
    console.log('❌ Error fetching project prospects:', ppError.message);
    return;
  }

  console.log(`📊 Total Prospects: ${prospectCount || 0}\n`);

  if (!prospectCount || prospectCount === 0) {
    console.log('⚠️  No prospects found for this project');
    return;
  }

  const prospectIds = projectProspects.map(pp => pp.prospect_id);

  // Step 3: Get prospect details
  const { data: prospects, error: prospectError } = await supabase
    .from('prospects')
    .select('id, company_name, website, website_status')
    .in('id', prospectIds);

  if (prospectError) {
    console.log('❌ Error fetching prospects:', prospectError.message);
    return;
  }

  // Step 4: Get all leads for this project
  const { data: leads, error: leadError, count: leadCount } = await supabase
    .from('leads')
    .select('id, url, company_name, website_grade, prospect_id', { count: 'exact' })
    .eq('project_id', project.id);

  if (leadError) {
    console.log('❌ Error fetching leads:', leadError.message);
    return;
  }

  console.log(`📈 Total Leads Analyzed: ${leadCount || 0}\n`);

  // Step 5: Get reports for these leads
  let reports = [];
  if (leads && leads.length > 0) {
    const leadIds = leads.map(l => l.id);
    const { data: reportsData, count: reportCount } = await supabase
      .from('reports')
      .select('id, lead_id, company_name', { count: 'exact' })
      .in('lead_id', leadIds);

    reports = reportsData || [];
    console.log(`📄 Total Reports Generated: ${reportCount || 0}\n`);
  } else {
    console.log(`📄 Total Reports Generated: 0\n`);
  }

  // Step 6: Match prospects to leads
  const leadByProspectId = new Map();
  leads?.forEach(lead => {
    if (lead.prospect_id) {
      leadByProspectId.set(lead.prospect_id, lead);
    }
  });

  const reportLeadIds = new Set(reports.map(r => r.lead_id));

  const unanalyzedProspects = [];
  const leadsWithoutReports = [];
  const problematicProspects = [];

  prospects.forEach(prospect => {
    // Check for problematic statuses
    if (['no_website', 'bot_protected', 'timeout', 'ssl_error', 'not_found'].includes(prospect.website_status)) {
      problematicProspects.push(prospect);
      return;
    }

    // Check if analyzed
    const lead = leadByProspectId.get(prospect.id);
    if (!lead) {
      unanalyzedProspects.push(prospect);
    } else if (!reportLeadIds.has(lead.id)) {
      leadsWithoutReports.push({ ...lead, prospect_id: prospect.id });
    }
  });

  // Step 7: Display summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');
  console.log(`Total Prospects:          ${prospectCount}`);
  console.log(`Unanalyzed Prospects:     ${unanalyzedProspects.length}`);
  console.log(`Leads Without Reports:    ${leadsWithoutReports.length}`);
  console.log(`Problematic Prospects:    ${problematicProspects.length}\n`);

  // Step 8: Display unanalyzed prospects
  if (unanalyzedProspects.length > 0) {
    console.log('='.repeat(80));
    console.log('UNANALYZED PROSPECTS (Need Analysis)');
    console.log('='.repeat(80) + '\n');

    unanalyzedProspects.forEach((p, i) => {
      console.log(`${i + 1}. ${p.company_name}`);
      console.log(`   ID:     ${p.id}`);
      console.log(`   URL:    ${p.website || 'N/A'}`);
      console.log(`   Status: ${p.website_status}\n`);
    });

    console.log('Prospect IDs for Analysis Engine:');
    console.log(JSON.stringify(unanalyzedProspects.map(p => p.id), null, 2));
    console.log('\n');
  }

  // Step 9: Display leads without reports
  if (leadsWithoutReports.length > 0) {
    console.log('='.repeat(80));
    console.log('LEADS WITHOUT REPORTS (Need Report Generation)');
    console.log('='.repeat(80) + '\n');

    leadsWithoutReports.forEach((l, i) => {
      console.log(`${i + 1}. ${l.company_name}`);
      console.log(`   Lead ID:     ${l.id}`);
      console.log(`   Prospect ID: ${l.prospect_id}`);
      console.log(`   Grade:       ${l.website_grade}`);
      console.log(`   URL:         ${l.url}\n`);
    });

    console.log('Lead IDs for Report Engine:');
    console.log(JSON.stringify(leadsWithoutReports.map(l => l.id), null, 2));
    console.log('\n');
  }

  // Step 10: Display problematic prospects
  if (problematicProspects.length > 0) {
    console.log('='.repeat(80));
    console.log('PROBLEMATIC PROSPECTS (Cannot Process)');
    console.log('='.repeat(80) + '\n');

    problematicProspects.forEach((p, i) => {
      console.log(`${i + 1}. ${p.company_name}`);
      console.log(`   ID:     ${p.id}`);
      console.log(`   Status: ${p.website_status}`);
      console.log(`   URL:    ${p.website || 'N/A'}\n`);
    });
  }

  console.log('='.repeat(80) + '\n');

  // Step 11: Return data for programmatic use
  return {
    projectId: project.id,
    projectName: project.name,
    totalProspects: prospectCount,
    unanalyzedProspectIds: unanalyzedProspects.map(p => p.id),
    leadsWithoutReportIds: leadsWithoutReports.map(l => l.id),
    problematicProspectIds: problematicProspects.map(p => p.id)
  };
}

checkProjectStatus().catch(console.error);
