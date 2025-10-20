import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

console.log('URL:', url);
console.log('Has Key:', !!key);

const supabase = createClient(url, key);

const { data, error, count } = await supabase
  .from('leads')
  .select('*', { count: 'exact' });

console.log('Total leads:', count);
console.log('Data:', data?.length, 'records');
if (data && data.length > 0) {
  console.log('First lead:', data[0].company_name, '-', data[0].website_grade);
}
if (error) {
  console.error('Error:', error);
}
