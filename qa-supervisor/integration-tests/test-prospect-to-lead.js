/**
 * Integration Test: Agent 1 → Agent 2
 *
 * Tests that prospects from Agent 1 can be successfully analyzed by Agent 2
 */

import { supabase, waitForSSEComplete, checkEndpointAvailable, isSupabaseConfigured } from './utils.js';
import logger from '../shared/logger.js';

const AGENT1_URL = 'http://localhost:3010';
const AGENT2_URL = 'http://localhost:3000';

/**
 * Test Agent 1 → Agent 2 integration
 */
export async function testProspectToLead() {
  logger.info('Testing: Agent 1 → Agent 2 (Prospect → Lead)');

  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return {
        passed: false,
        skipped: true,
        error: 'Supabase not configured (.env missing)'
      };
    }

    // Check if services are running
    const agent1Available = await checkEndpointAvailable(`${AGENT1_URL}/api/health`);
    const agent2Available = await checkEndpointAvailable(`${AGENT2_URL}/api/health`);

    if (!agent1Available) {
      return {
        passed: false,
        skipped: true,
        error: 'Agent 1 not running (port 3010)'
      };
    }

    if (!agent2Available) {
      return {
        passed: false,
        skipped: true,
        error: 'Agent 2 not running (port 3000)'
      };
    }

    // STEP 1: Generate prospect via Agent 1
    logger.info('  Step 1: Generating prospect via Agent 1...');

    const prospectResponse = await fetch(`${AGENT1_URL}/api/prospect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief: {
          icp: { industry: "TEST_Restaurant" },
          geo: { city: "Philadelphia, PA" }
        },
        count: 1,
        verify: true
      })
    });

    if (!prospectResponse.ok) {
      throw new Error(`Agent 1 request failed: ${prospectResponse.status}`);
    }

    const prospectResult = await waitForSSEComplete(prospectResponse, 60000);

    if (!prospectResult || prospectResult.found === 0) {
      throw new Error('No prospects generated');
    }

    logger.success('  Prospect generated successfully');

    // STEP 2: Verify prospect in database
    logger.info('  Step 2: Verifying prospect in database...');

    const { data: prospects, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('status', 'ready_for_analysis')
      .order('created_at', { ascending: false })
      .limit(1);

    if (prospectError || !prospects || prospects.length === 0) {
      throw new Error('Prospect not found in database');
    }

    const prospect = prospects[0];
    logger.success('  Prospect saved to database');

    // STEP 3: Trigger Agent 2 analysis
    logger.info('  Step 3: Analyzing with Agent 2...');

    const analysisResponse = await fetch(`${AGENT2_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          status: 'ready_for_analysis',
          limit: 1
        }
      })
    });

    if (!analysisResponse.ok) {
      throw new Error(`Agent 2 request failed: ${analysisResponse.status}`);
    }

    const analysisResult = await waitForSSEComplete(analysisResponse, 120000);

    if (!analysisResult || analysisResult.analyzed !== 1) {
      throw new Error('Analysis did not complete');
    }

    logger.success('  Analysis completed');

    // STEP 4: Verify lead created
    logger.info('  Step 4: Verifying lead created...');

    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('prospect_id', prospect.id);

    if (leadError || !leads || leads.length === 0) {
      throw new Error('Lead not created');
    }

    const lead = leads[0];

    // STEP 5: Verify data integrity
    if (lead.company_name !== prospect.company_name) {
      throw new Error('Company name mismatch');
    }

    if (lead.url !== prospect.website) {
      throw new Error('URL mismatch');
    }

    if (!lead.website_grade || !/^[A-F]$/.test(lead.website_grade)) {
      throw new Error('Invalid website grade');
    }

    logger.success('  Lead data verified');
    logger.success('✅ Agent 1 → Agent 2 integration PASSED');

    return {
      passed: true,
      prospect,
      lead
    };

  } catch (error) {
    logger.error(`❌ Agent 1 → Agent 2 integration FAILED: ${error.message}`);
    return {
      passed: false,
      error: error.message
    };
  }
}

export default {
  testProspectToLead
};
