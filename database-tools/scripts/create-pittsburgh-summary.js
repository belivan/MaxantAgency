#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PROJECT_ID = 'a4bba02c-9a9b-459c-972d-d98016f34d94';
const OUTPUT_DIR = resolve(__dirname, '../../local-backups/report-engine/reports/Pittsburgh-Dental-11-24');

async function main() {
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', PROJECT_ID)
    .single();

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .order('website_grade', { ascending: true });

  const gradeDistribution = leads.reduce((acc, lead) => {
    const grade = lead.website_grade || 'N/A';
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {});

  const avgDesignScore = Math.round(leads.reduce((sum, l) => sum + (l.design_score || 0), 0) / leads.length);
  const avgSeoScore = Math.round(leads.reduce((sum, l) => sum + (l.seo_score || 0), 0) / leads.length);

  const summary = {
    project: {
      id: PROJECT_ID,
      name: project?.name || 'Pittsburgh Dental 11_24',
      created_at: project?.created_at,
      icp_brief: project?.icp_brief
    },
    stats: {
      total_prospects: 60,
      prospects_with_emails: 22,
      total_leads: leads.length,
      total_reports: leads.length * 2,
      avg_design_score: avgDesignScore,
      avg_seo_score: avgSeoScore
    },
    grade_distribution: gradeDistribution,
    top_performers: leads
      .filter(l => l.website_grade === 'B')
      .map(l => ({
        company_name: l.company_name,
        website: l.website,
        grade: l.website_grade,
        design_score: l.design_score,
        seo_score: l.seo_score
      })),
    needs_improvement: leads
      .filter(l => l.website_grade === 'C' || l.website_grade === 'D' || l.website_grade === 'F')
      .slice(0, 10)
      .map(l => ({
        company_name: l.company_name,
        website: l.website,
        grade: l.website_grade,
        design_score: l.design_score,
        seo_score: l.seo_score,
        top_issue: l.top_issue
      })),
    generated_at: new Date().toISOString()
  };

  const summaryPath = path.join(OUTPUT_DIR, 'PROJECT-SUMMARY.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log('\n✅ Project summary created at:', summaryPath);
  console.log('\nKey Stats:');
  console.log(`  - Total Leads: ${summary.stats.total_leads}`);
  console.log(`  - Avg Design Score: ${summary.stats.avg_design_score}`);
  console.log(`  - Avg SEO Score: ${summary.stats.avg_seo_score}`);
  console.log(`  - Grade B: ${gradeDistribution.B || 0}`);
  console.log(`  - Grade C: ${gradeDistribution.C || 0}\n`);
}

main().catch(console.error);
