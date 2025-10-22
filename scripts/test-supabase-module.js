import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Replicate exact logic from supabase-client.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname; // We're already at root
const dbToolsEnv = path.join(projectRoot, 'database-tools', '.env');

console.log('DB Tools env path:', dbToolsEnv);
console.log('File exists:', fs.existsSync(dbToolsEnv));

// Load env
if (fs.existsSync(dbToolsEnv)) {
  const result = dotenv.config({ path: dbToolsEnv });
  console.log('Dotenv result:', result.error ? result.error.message : 'Success');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('\nLoaded values:');
console.log('URL:', supabaseUrl);
console.log('Key (first 30):', supabaseKey?.substring(0, 30) + '...');
console.log('Key length:', supabaseKey?.length);

// Create client
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\nTesting connection...');

supabase
  .from('prospects')
  .select('id', { count: 'exact', head: true })
  .then(({ count, error }) => {
    if (error) {
      console.log('❌ Error:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ SUCCESS!');
      console.log('   Prospects count:', count);
    }
  });
