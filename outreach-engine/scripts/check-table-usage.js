/**
 * Check which tables are being used
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('\n📊 Checking table usage...\n');

// Check composed_outreach
const { data: emails, error: emailsError } = await supabase
  .from('composed_outreach')
  .select('id, email_subject, email_body, platform')
  .limit(10);

if (!emailsError) {
  console.log(`composed_outreach table: ${emails.length} records`);
  if (emails.length > 0) {
    const platforms = emails.map(e => e.platform).filter(Boolean);
    console.log(`  Sample platforms: ${[...new Set(platforms)].join(', ') || 'none set'}`);

    // Check if any have email subjects (emails) vs just body (could be social)
    const hasSubjects = emails.filter(e => e.email_subject).length;
    const noSubjects = emails.filter(e => !e.email_subject && e.email_body).length;
    console.log(`  With subject (emails): ${hasSubjects}`);
    console.log(`  No subject (social?): ${noSubjects}`);
  }
} else {
  console.log('composed_outreach: ERROR -', emailsError.message);
}

// Check social_outreach
const { data: social, error: socialError } = await supabase
  .from('social_outreach')
  .select('id, platform, message_body')
  .limit(10);

if (!socialError) {
  console.log(`\nsocial_outreach table: ${social.length} records`);
  if (social.length > 0) {
    const platforms = social.map(s => s.platform).filter(Boolean);
    console.log(`  Platforms: ${[...new Set(platforms)].join(', ')}`);
  } else {
    console.log('  ⚠️  Table exists but is EMPTY (not being used)');
  }
} else {
  console.log(`\nsocial_outreach: ERROR - ${socialError.message}`);
  if (socialError.message.includes('does not exist')) {
    console.log('  ⚠️  Table does NOT exist in database');
  }
}

console.log('\n');
