import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const LEAD_ID = 'de3c47da-bc6c-4362-84ff-4a2a28f42ae3';

async function saveToBenchmarks() {
  console.log('📊 Fetching Heartland analysis from leads table...\n');

  // Fetch the lead
  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', LEAD_ID)
    .single();

  if (fetchError) {
    console.error('❌ Error fetching lead:', fetchError);
    return;
  }

  console.log('✅ Found lead:', lead.company_name);
  console.log('   URL:', lead.url);
  console.log('   Grade:', lead.website_grade);
  console.log('   Overall Score:', lead.overall_score);
  console.log('   Design Score:', lead.design_score);
  console.log('   SEO Score:', lead.seo_score);
  console.log('   Content Score:', lead.content_score);
  console.log('   Social Score:', lead.social_score);

  // Save to benchmarks table
  console.log('\n📌 Saving to benchmarks table...');

  const benchmarkData = {
    company_name: lead.company_name,
    website_url: lead.url,
    industry: lead.industry,
    benchmark_tier: 'national',
    source: 'manual',

    // Scores
    overall_score: lead.overall_score,
    overall_grade: lead.website_grade,
    design_score: lead.design_score,
    seo_score: lead.seo_score,
    content_score: lead.content_score,
    social_score: lead.social_score,
    accessibility_score: lead.accessibility_score,

    // Screenshots
    desktop_screenshot_url: lead.screenshot_desktop_url,
    mobile_screenshot_url: lead.screenshot_mobile_url,

    // Store full analysis for reference
    analysis_results: {
      design_issues_desktop: lead.design_issues_desktop,
      design_issues_mobile: lead.design_issues_mobile,
      seo_issues: lead.seo_issues,
      content_issues: lead.content_issues,
      social_issues: lead.social_issues,
      accessibility_issues: lead.accessibility_issues,
      quick_wins: lead.quick_wins,
      pages_analyzed: lead.pages_analyzed
    },

    // Metadata
    analyzed_at: lead.analyzed_at,
    quality_flag: 'approved',
    is_active: true,
    notes: 'Industry benchmark - Heartland Dental (national dental service organization)',
    tags: ['dental', 'healthcare', 'enterprise', 'multi-location']
  };

  const { data: benchmark, error: saveError } = await supabase
    .from('benchmarks')
    .insert(benchmarkData)
    .select()
    .single();

  if (saveError) {
    console.error('❌ Error saving benchmark:', saveError);
    return;
  }

  console.log('✅ Benchmark saved!');
  console.log('   Benchmark ID:', benchmark.id);
  console.log('   Match Score:', benchmark.match_score || 'N/A');

  return benchmark;
}

function extractStrengths(issues) {
  if (!issues || !Array.isArray(issues)) return [];

  // Extract positive points or areas with good scores
  // For now, return generic strengths based on score
  return [];
}

saveToBenchmarks();
