import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createBenchmarkProject() {
  // Check if Benchmarks project exists
  const { data: existing } = await supabase
    .from('projects')
    .select('id, name')
    .eq('name', 'Industry Benchmarks')
    .single();

  if (existing) {
    console.log('✅ Using existing Benchmarks project:', existing.id);
    return existing.id;
  }

  // Create new Benchmarks project
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      name: 'Industry Benchmarks',
      client_name: 'Internal',
      description: 'Collection of industry benchmark analyses for competitive comparison',
      status: 'active'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating project:', error);
    throw error;
  }

  console.log('✅ Created Benchmarks project:', project.id);
  return project.id;
}

createBenchmarkProject();
