import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const { data, error } = await supabase
  .from('projects')
  .select('id, name, client_name, description, status')
  .order('created_at', { ascending: false });

if (error) {
  console.error('Error:', error);
} else {
  console.log(`Found ${data.length} projects:\n`);
  data.forEach((p, i) => {
    console.log(`${i+1}. ${p.name}`);
    console.log(`   Client: ${p.client_name || 'N/A'}`);
    console.log(`   Description: ${p.description || 'N/A'}`);
    console.log(`   Status: ${p.status}`);
    console.log(`   ID: ${p.id}\n`);
  });

  console.log(`\nI'll use: "${data[0].name}" (ID: ${data[0].id})`);
}
