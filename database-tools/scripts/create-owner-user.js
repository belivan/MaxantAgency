#!/usr/bin/env node
/**
 * Create Owner User Record
 *
 * Creates the initial owner user record in the users table.
 * Run this once to set up the owner account before running backfill.
 *
 * Usage: node database-tools/scripts/create-owner-user.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Owner configuration
const OWNER_EMAIL = 'anton.yanovich@hotmail.com';
const OWNER_TIER = 'full'; // Owner gets full access

async function createOwnerUser() {
  console.log('🔧 Creating owner user record...\n');

  // Check if user already exists
  const { data: existing, error: checkError } = await supabase
    .from('users')
    .select('id, email, tier')
    .eq('email', OWNER_EMAIL)
    .single();

  if (existing) {
    console.log(`✅ Owner user already exists:`);
    console.log(`   ID: ${existing.id}`);
    console.log(`   Email: ${existing.email}`);
    console.log(`   Tier: ${existing.tier}`);
    return existing;
  }

  // Create user record
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      email: OWNER_EMAIL,
      clerk_id: 'owner_placeholder', // Will be updated by webhook on next sign-in
      tier: OWNER_TIER,
      usage_prospects: 0,
      usage_analyses: 0,
      usage_reports: 0,
      usage_outreach: 0
    })
    .select()
    .single();

  if (createError) {
    console.error('❌ Failed to create owner user:', createError.message);
    process.exit(1);
  }

  console.log(`✅ Owner user created:`);
  console.log(`   ID: ${newUser.id}`);
  console.log(`   Email: ${newUser.email}`);
  console.log(`   Tier: ${newUser.tier}`);
  console.log(`\n📝 Note: clerk_id will be updated on next sign-in via webhook`);

  return newUser;
}

createOwnerUser()
  .then(() => {
    console.log('\n✅ Done! You can now run the backfill script.');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
