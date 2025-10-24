/**
 * Add fallback synthesis when USE_AI_SYNTHESIS=false
 */

import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function addFallback() {
  const filePath = join(__dirname, 'auto-report-generator.js');
  let content = await readFile(filePath, 'utf-8');

  // Check if fallback is already there
  if (content.includes('} else {') && content.includes('AI synthesis disabled') && content.includes('generateFallbackSynthesis(reportData)')) {
    console.log('✅ Fallback for disabled synthesis already exists!');
    return;
  }

  const oldCode = `    } else {
      console.log('ℹ️  AI synthesis disabled (USE_AI_SYNTHESIS=false)');
    }

    // Generate the report`;

  const newCode = `    } else {
      console.log('ℹ️  AI synthesis disabled (USE_AI_SYNTHESIS=false)');
      // Generate basic fallback summary even when synthesis is disabled
      synthesisData = generateFallbackSynthesis(reportData);
      console.log('✅ Using fallback synthesis (non-AI generated)');
    }

    // Generate the report`;

  if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    await writeFile(filePath, content, 'utf-8');
    console.log('✅ Added fallback synthesis for disabled case!');
  } else {
    console.log('⚠️  Could not find exact match. Checking if already applied...');
    if (content.includes('generateFallbackSynthesis(reportData)') && content.includes('AI synthesis disabled')) {
      console.log('✅ Fallback appears to already be in place!');
    } else {
      console.log('❌ Manual intervention needed');
    }
  }
}

addFallback().catch(console.error);
