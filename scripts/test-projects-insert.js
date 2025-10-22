import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProjectsTable() {
  console.log('🧪 Testing projects table...\n');

  try {
    // Insert a test project
    const testProject = {
      name: 'Test Project',
      client_name: 'Test Client',
      description: 'This is a test project to verify the database setup',
      status: 'active',
      icp_brief: {
        industry: 'Technology',
        company_size: 'Small',
        target_audience: 'B2B SaaS companies'
      }
    };

    console.log('📝 Inserting test project...');
    const { data, error } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single();

    if (error) {
      console.error('❌ Error inserting project:', error);
      return false;
    }

    console.log('✅ Successfully inserted project!');
    console.log('   ID:', data.id);
    console.log('   Name:', data.name);
    console.log('   Client:', data.client_name);
    console.log('   Status:', data.status);

    // Clean up - delete the test project
    console.log('\n🧹 Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', data.id);

    if (deleteError) {
      console.error('⚠️ Warning: Could not delete test project:', deleteError);
    } else {
      console.log('✅ Test project deleted');
    }

    return true;
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return false;
  }
}

// Run the test
testProjectsTable().then(success => {
  if (success) {
    console.log('\n✅ Projects table is fully functional!');
  } else {
    console.log('\n❌ Projects table test failed');
  }
  process.exit(success ? 0 : 1);
});