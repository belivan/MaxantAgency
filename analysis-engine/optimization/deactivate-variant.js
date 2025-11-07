/**
 * Deactivate a specific variant or all variants for an analyzer
 *
 * Usage:
 *   node deactivate-variant.js <analyzer-name>
 *   node deactivate-variant.js desktop-visual-analyzer
 */

import { supabase } from '../database/supabase-client.js';

async function deactivateVariants(analyzerName) {
  console.log(`\n🔄 Deactivating all variants for ${analyzerName}...\n`);

  try {
    // Get all active variants for this analyzer
    const { data: activeVariants, error: fetchError } = await supabase
      .from('prompt_variants')
      .select('*')
      .eq('analyzer_name', analyzerName)
      .eq('is_active', true);

    if (fetchError) throw fetchError;

    if (!activeVariants || activeVariants.length === 0) {
      console.log(`✅ No active variants found for ${analyzerName}`);
      return;
    }

    console.log(`Found ${activeVariants.length} active variant(s):\n`);
    activeVariants.forEach(v => {
      console.log(`  - v${v.version_number} (${v.variant_type}) - ${v.file_path || 'no file'}`);
    });

    // Deactivate all variants
    const { error: updateError } = await supabase
      .from('prompt_variants')
      .update({ is_active: false })
      .eq('analyzer_name', analyzerName);

    if (updateError) throw updateError;

    console.log(`\n✅ Deactivated all variants for ${analyzerName}`);
    console.log(`   Analyzer will now use base prompt: config/prompts/web-design/${analyzerName.replace('-analyzer', '-analysis')}/base.json\n`);

  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    process.exit(1);
  }
}

// Main
const analyzerName = process.argv[2];

if (!analyzerName) {
  console.error('\n❌ Error: Missing analyzer name\n');
  console.log('Usage:');
  console.log('  node deactivate-variant.js <analyzer-name>\n');
  console.log('Examples:');
  console.log('  node deactivate-variant.js desktop-visual-analyzer');
  console.log('  node deactivate-variant.js unified-visual-analyzer\n');
  process.exit(1);
}

deactivateVariants(analyzerName)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
