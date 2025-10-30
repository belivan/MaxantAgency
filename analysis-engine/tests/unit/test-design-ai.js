/**
 * Test design AI call to see what it returns
 */

import { loadPrompt } from './shared/prompt-loader.js';
import { callAI, parseJSONResponse } from '../../../database-tools/shared/ai-client.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('Testing Design AI Call\n');
console.log('═══════════════════════════════════════════════════════════\n');

try {
  // Load the design critique prompt
  const prompt = await loadPrompt('web-design/design-critique', {
    company_name: 'Test Restaurant',
    industry: 'restaurant',
    url: 'https://example.com',
    tech_stack: 'WordPress',
    load_time: 3000
  });

  console.log('✅ Prompt loaded');
  console.log('Model:', prompt.model);
  console.log('Temperature:', prompt.temperature);
  console.log('\n───────────────────────────────────────────────────────────\n');
  console.log('System Prompt (first 200 chars):');
  console.log(prompt.systemPrompt.substring(0, 200) + '...');
  console.log('\n───────────────────────────────────────────────────────────\n');
  console.log('User Prompt (first 300 chars):');
  console.log(prompt.userPrompt.substring(0, 300) + '...');
  console.log('\n───────────────────────────────────────────────────────────\n');

  // Call AI WITHOUT an image (to test JSON response format)
  console.log('Calling AI (text only, no image)...\n');

  const response = await callAI({
    model: prompt.model,
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt + '\n\n[Note: No screenshot available - please return the expected JSON structure with placeholder values]',
    temperature: prompt.temperature,
    jsonMode: true
  });

  console.log('\n✅ AI Response Received\n');
  console.log('───────────────────────────────────────────────────────────\n');
  console.log('Model:', response.model);
  console.log('Provider:', response.provider);
  console.log('Cost:', response.cost);
  console.log('Content type:', typeof response.content);
  console.log('Content length:', response.content ? response.content.length : 0);
  console.log('\n───────────────────────────────────────────────────────────\n');
  console.log('RAW RESPONSE CONTENT:\n');
  console.log(response.content);
  console.log('\n───────────────────────────────────────────────────────────\n');

  // Try to parse it
  console.log('Attempting to parse JSON...\n');
  const parsed = parseJSONResponse(response.content);

  console.log('✅ JSON Parsed Successfully\n');
  console.log('Parsed keys:', Object.keys(parsed));
  console.log('\nFull parsed object:\n');
  console.log(JSON.stringify(parsed, null, 2));

  console.log('\n═══════════════════════════════════════════════════════════\n');
  console.log('Test Complete!');

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
}
