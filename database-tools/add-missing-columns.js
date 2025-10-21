import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingColumns() {
  console.log('Adding missing columns to projects table...');

  // Add budget_alert_threshold
  const { error: error1 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_alert_threshold NUMERIC(10,2);'
  });

  if (error1 && !error1.message.includes('already exists')) {
    console.error('Error adding budget_alert_threshold:', error1.message);
  } else {
    console.log('✅ Added budget_alert_threshold column');
  }

  // Add analysis_prompts
  const { error: error2 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS analysis_prompts JSONB;'
  });

  if (error2 && !error2.message.includes('already exists')) {
    console.error('Error adding analysis_prompts:', error2.message);
  } else {
    console.log('✅ Added analysis_prompts column');
  }

  // Add prospecting_prompts
  const { error: error3 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS prospecting_prompts JSONB;'
  });

  if (error3 && !error3.message.includes('already exists')) {
    console.error('Error adding prospecting_prompts:', error3.message);
  } else {
    console.log('✅ Added prospecting_prompts column');
  }

  // Add prospecting_model_selections
  const { error: error4 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS prospecting_model_selections JSONB;'
  });

  if (error4 && !error4.message.includes('already exists')) {
    console.error('Error adding prospecting_model_selections:', error4.message);
  } else {
    console.log('✅ Added prospecting_model_selections column');
  }

  // Add analysis_model_selections
  const { error: error5 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS analysis_model_selections JSONB;'
  });

  if (error5 && !error5.message.includes('already exists')) {
    console.error('Error adding analysis_model_selections:', error5.message);
  } else {
    console.log('✅ Added analysis_model_selections column');
  }

  // Verify columns were added
  const { data, error } = await supabase.from('projects').select('*').limit(1);

  if (error) {
    console.error('Error verifying columns:', error.message);
  } else {
    console.log('\n✅ Current projects table columns:', Object.keys(data?.[0] || {}).join(', '));
  }
}

addMissingColumns().catch(console.error);