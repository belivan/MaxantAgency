/**
 * Verify that analysis_prompts column exists in projects table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifySchema() {
  try {
    console.log('🔍 Checking projects table schema...\n');

    // Try to query the table to see its structure
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying projects table:', error.message);
      return;
    }

    console.log('✅ Projects table exists');

    // Try to insert a test record with analysis_prompts
    const testProject = {
      name: 'Schema Test Project',
      status: 'active',
      analysis_prompts: {
        test: 'value'
      }
    };

    const { data: insertData, error: insertError } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting test project:', insertError.message);
      console.error('Full error:', insertError);

      if (insertError.message.includes('analysis_prompts')) {
        console.log('\n⚠️  The analysis_prompts column does NOT exist yet.');
        console.log('We need to manually add it to Supabase.\n');
      }
      return;
    }

    console.log('✅ analysis_prompts column exists and works!');
    console.log('Test project created:', insertData.id);

    // Clean up - delete the test project
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', insertData.id);

    if (!deleteError) {
      console.log('✅ Test project cleaned up');
    }

    console.log('\n🎉 Database schema is ready!');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

verifySchema();