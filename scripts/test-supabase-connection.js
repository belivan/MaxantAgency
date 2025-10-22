import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { join } from 'path';

// Load from root .env
dotenv.config({ path: join(process.cwd(), '.env') });

console.log('Testing Supabase connection...\n');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

console.log('URL:', url ? `${url.substring(0, 30)}...` : 'MISSING');
console.log('Key:', key ? `starts with: ${key.substring(0, 20)}...` : 'MISSING');
console.log('');

if (!url || !key) {
  console.log('❌ Missing credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

console.log('Attempting to query prospects table...');

supabase
  .from('prospects')
  .select('id', { count: 'exact', head: true })
  .then(({ count, error }) => {
    if (error) {
      console.log('❌ Error:', error.message);
      console.log('   Hint:', error.hint);
      console.log('   Details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ SUCCESS! Connected to Supabase');
      console.log('   Prospects count:', count);
    }
  });
