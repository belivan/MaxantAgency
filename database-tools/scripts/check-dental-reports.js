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

const PROJECT_ID = 'b9c9f0f3-ee36-467a-996e-dd8e684475d0'; // Dental 11_7

async function checkReports() {
  const { data: leads } = await supabase
    .from('leads')
    .select('id, company_name')
    .eq('project_id', PROJECT_ID);

  console.log('Dental 11_7 leads:', leads?.length || 0);

  if (leads && leads.length > 0) {
    const leadIds = leads.map(l => l.id);
    const { data: reports } = await supabase
      .from('reports')
      .select('lead_id')
      .in('lead_id', leadIds);

    const reportedLeadIds = new Set(reports?.map(r => r.lead_id) || []);
    const needReports = leads.filter(l => !reportedLeadIds.has(l.id));

    console.log('Leads with reports:', reports?.length || 0);
    console.log('Leads needing reports:', needReports.length);

    if (needReports.length > 0) {
      console.log('\nLeads needing reports:');
      needReports.forEach(l => console.log('  -', l.company_name));
    }
  }
}

checkReports().catch(console.error);
