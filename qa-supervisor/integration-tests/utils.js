/**
 * Integration Test Utilities
 *
 * Helper functions for cross-agent integration testing
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
const projectRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(projectRoot, '.env') });

// Initialize Supabase client (with fallback for when not configured)
let supabase = null;

if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  );
}

export { supabase };

/**
 * Wait for SSE stream to complete and return final result
 */
export async function waitForSSEComplete(response, timeout = 120000) {
  const results = [];
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const startTime = Date.now();

  try {
    while (true) {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new Error('SSE stream timeout');
      }

      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            results.push(data);
          } catch {
            // Skip invalid JSON
            continue;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Return the final result (usually the last message)
  return results.length > 0 ? results[results.length - 1] : null;
}

/**
 * Clean test data from database
 */
export async function cleanTestData() {
  try {
    // Delete test emails (with TEST_ prefix)
    await supabase
      .from('composed_emails')
      .delete()
      .like('email_subject', '%TEST_%');

    // Delete test leads
    await supabase
      .from('leads')
      .delete()
      .like('company_name', '%TEST_%');

    // Delete test prospects
    await supabase
      .from('prospects')
      .delete()
      .like('company_name', '%TEST_%');

    return { success: true };
  } catch (error) {
    console.warn('Failed to clean test data:', error.message);
    return { success: false, error };
  }
}

/**
 * Wait for a specific condition to be true
 */
export async function waitForCondition(conditionFn, timeout = 10000, interval = 500) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await conditionFn()) {
      return true;
    }
    await sleep(interval);
  }

  return false;
}

/**
 * Sleep helper
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make API request with timeout
 */
export async function apiRequest(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Check if API endpoint is available
 */
export async function checkEndpointAvailable(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.status < 500;
  } catch {
    return false;
  }
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured() {
  return supabase !== null;
}

export default {
  supabase,
  waitForSSEComplete,
  cleanTestData,
  waitForCondition,
  sleep,
  apiRequest,
  checkEndpointAvailable,
  isSupabaseConfigured
};
