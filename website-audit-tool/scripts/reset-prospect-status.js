import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function resetProspectStatus() {
  console.log('Resetting prospect status for re-testing...\n');

  // Update the 5 test prospects back to pending_analysis
  const { data, error } = await supabase
    .from('prospects')
    .update({ status: 'pending_analysis' })
    .in('website', [
      'https://apexplumbingservices.com',
      'https://swifthvac.com',
      'https://localmoversinc.com',
      'https://procleanwindows.com',
      'https://backinactionchiro.com'
    ])
    .select();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`✅ Reset ${data.length} prospects to pending_analysis`);

  // Also delete the existing leads so we get fresh ones
  const { data: deleted, error: deleteError } = await supabase
    .from('leads')
    .delete()
    .in('url', [
      'https://apexplumbingservices.com',
      'https://swifthvac.com',
      'https://localmoversinc.com',
      'https://procleanwindows.com',
      'https://backinactionchiro.com'
    ])
    .select();

  if (deleteError) {
    console.error('❌ Error deleting leads:', deleteError.message);
    return;
  }

  console.log(`✅ Deleted ${deleted.length} existing leads for clean re-test\n`);
  console.log('Ready to re-run test!');
}

resetProspectStatus();
