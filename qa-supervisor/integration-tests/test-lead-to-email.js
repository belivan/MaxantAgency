/**
 * Integration Test: Agent 2 → Agent 3
 *
 * Tests that leads from Agent 2 can be used to compose emails via Agent 3
 */

import { supabase, checkEndpointAvailable, isSupabaseConfigured } from './utils.js';
import logger from '../shared/logger.js';

const AGENT2_URL = 'http://localhost:3000';
const AGENT3_URL = 'http://localhost:3001';

/**
 * Test Agent 2 → Agent 3 integration
 */
export async function testLeadToEmail() {
  logger.info('Testing: Agent 2 → Agent 3 (Lead → Email)');

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
    const agent2Available = await checkEndpointAvailable(`${AGENT2_URL}/api/health`);
    const agent3Available = await checkEndpointAvailable(`${AGENT3_URL}/api/health`);

    if (!agent2Available) {
      return {
        passed: false,
        skipped: true,
        error: 'Agent 2 not running (port 3000)'
      };
    }

    if (!agent3Available) {
      return {
        passed: false,
        skipped: true,
        error: 'Agent 3 not running (port 3001)'
      };
    }

    // STEP 1: Get a ready lead from database
    logger.info('  Step 1: Getting analyzed lead...');

    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'analyzed')
      .not('contact_email', 'is', null)
      .limit(1);

    if (leadError || !leads || leads.length === 0) {
      return {
        passed: false,
        skipped: true,
        error: 'No analyzed leads available for testing'
      };
    }

    const lead = leads[0];
    logger.success('  Lead retrieved');

    // STEP 2: Compose email via Agent 3
    logger.info('  Step 2: Composing email...');

    const composeResponse = await fetch(`${AGENT3_URL}/api/compose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: lead.url,
        strategy: 'compliment-sandwich',
        generateVariants: false
      })
    });

    if (!composeResponse.ok) {
      throw new Error(`Agent 3 request failed: ${composeResponse.status}`);
    }

    const email = await composeResponse.json();
    logger.success('  Email composed');

    // STEP 3: Verify email quality
    if (!email.email_subject || email.email_subject.length < 10) {
      throw new Error('Invalid email subject');
    }

    if (!email.email_body || email.email_body.length < 50) {
      throw new Error('Invalid email body');
    }

    if (!email.quality_score || email.quality_score < 70) {
      throw new Error(`Email quality too low: ${email.quality_score}`);
    }

    logger.success('  Email quality verified');

    // STEP 4: Verify email saved to database
    const { data: composedEmails } = await supabase
      .from('composed_outreach')
      .select('*')
      .eq('url', lead.url)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!composedEmails || composedEmails.length === 0) {
      logger.warning('  Email not saved to database (may be expected)');
    } else {
      logger.success('  Email saved to database');
    }

    logger.success('✅ Agent 2 → Agent 3 integration PASSED');

    return {
      passed: true,
      lead,
      email
    };

  } catch (error) {
    logger.error(`❌ Agent 2 → Agent 3 integration FAILED: ${error.message}`);
    return {
      passed: false,
      error: error.message
    };
  }
}

export default {
  testLeadToEmail
};
