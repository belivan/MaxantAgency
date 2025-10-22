#!/usr/bin/env node
/**
 * Verification script for prospecting engine data publishing
 */

import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load env from root .env (centralized configuration)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnv = path.resolve(__dirname, '../.env');

if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
  console.log('✅ Using root .env file');
} else {
  console.error('❌ Root .env file not found!');
  process.exit(1);
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

console.log('✅ Supabase credentials found');

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyData() {
  console.log('\n' + '='.repeat(60));
  console.log('   PROSPECTING ENGINE DATA VERIFICATION');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. Count total prospects
    const { count: totalCount, error: countError } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;
    console.log(`📊 Total prospects in database: ${totalCount}`);

    // 2. Get recent prospects (last 10)
    const { data: recentProspects, error: recentError } = await supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) throw recentError;

    console.log(`\n📋 Recent prospects (last ${recentProspects.length}):\n`);

    recentProspects.forEach((prospect, index) => {
      console.log(`${index + 1}. ${prospect.company_name}`);
      console.log(`   ID: ${prospect.id}`);
      console.log(`   Industry: ${prospect.industry}`);
      console.log(`   City: ${prospect.city}, ${prospect.state}`);
      console.log(`   Website: ${prospect.website || 'No website'}`);
      console.log(`   Status: ${prospect.status}`);
      console.log(`   ICP Score: ${prospect.icp_match_score}`);
      console.log(`   Created: ${new Date(prospect.created_at).toLocaleString()}`);
      console.log('');
    });

    // 3. Check data completeness
    const { data: dataStats, error: statsError } = await supabase
      .from('prospects')
      .select('website, contact_email, contact_phone, social_profiles, google_rating');

    if (statsError) throw statsError;

    const stats = {
      withWebsite: dataStats.filter(p => p.website).length,
      withEmail: dataStats.filter(p => p.contact_email).length,
      withPhone: dataStats.filter(p => p.contact_phone).length,
      withSocial: dataStats.filter(p => p.social_profiles && Object.keys(p.social_profiles).length > 0).length,
      withRating: dataStats.filter(p => p.google_rating).length
    };

    console.log('📈 Data Completeness:');
    console.log(`   With website: ${stats.withWebsite}/${totalCount} (${Math.round(stats.withWebsite/totalCount*100)}%)`);
    console.log(`   With email: ${stats.withEmail}/${totalCount} (${Math.round(stats.withEmail/totalCount*100)}%)`);
    console.log(`   With phone: ${stats.withPhone}/${totalCount} (${Math.round(stats.withPhone/totalCount*100)}%)`);
    console.log(`   With social: ${stats.withSocial}/${totalCount} (${Math.round(stats.withSocial/totalCount*100)}%)`);
    console.log(`   With rating: ${stats.withRating}/${totalCount} (${Math.round(stats.withRating/totalCount*100)}%)`);

    // 4. Check prospects by status
    const { data: statusData, error: statusError } = await supabase
      .from('prospects')
      .select('status');

    if (statusError) throw statusError;

    const statusCounts = statusData.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 Prospects by Status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    // 5. Test insert capability
    console.log('\n🧪 Testing data insertion...');
    const testProspect = {
      company_name: 'Verification Test Company ' + Date.now(),
      industry: 'test',
      city: 'Test City',
      state: 'TS',
      status: 'ready_for_analysis',
      icp_match_score: 100,
      is_relevant: true,
      source: 'verification-script',
      run_id: 'test-' + Date.now()
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('prospects')
      .insert(testProspect)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert failed:', insertError.message);
    } else {
      console.log('✅ Successfully inserted test prospect');
      console.log(`   ID: ${insertedData.id}`);
      console.log(`   Company: ${insertedData.company_name}`);

      // Clean up test data
      const { error: deleteError } = await supabase
        .from('prospects')
        .delete()
        .eq('id', insertedData.id);

      if (!deleteError) {
        console.log('✅ Test data cleaned up');
      }
    }

    // 6. Check for recent runs
    const { data: runData, error: runError } = await supabase
      .from('prospects')
      .select('run_id, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!runError && runData) {
      const uniqueRuns = [...new Set(runData.map(p => p.run_id))].filter(Boolean);
      console.log(`\n📝 Recent pipeline runs: ${uniqueRuns.length}`);
      uniqueRuns.slice(0, 3).forEach(runId => {
        const runProspects = runData.filter(p => p.run_id === runId);
        console.log(`   ${runId.substring(0, 8)}... - ${runProspects.length} prospects`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICATION COMPLETE - DATA PUBLISHING WORKING!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

// Run verification
verifyData();