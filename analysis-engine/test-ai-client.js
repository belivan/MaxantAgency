/**
 * Quick test of AI client to debug null responses
 */

import { callAI } from './shared/ai-client.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('Testing AI Client...\n');
console.log('API Keys present:');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ SET' : '❌ MISSING');
console.log('- XAI_API_KEY:', process.env.XAI_API_KEY ? '✅ SET' : '❌ MISSING');
console.log('');

// Test 1: Simple GPT-4o call
console.log('Test 1: GPT-4o Vision (no image, text only)');
console.log('─────────────────────────────────────────────');
try {
  const response = await callAI({
    model: 'gpt-4o',
    systemPrompt: 'You are a helpful assistant. Respond in valid JSON only.',
    userPrompt: 'Return this JSON: {"test": "success", "score": 85}',
    jsonMode: true
  });

  console.log('✅ Call succeeded');
  console.log('Response content:', response.content);
  console.log('Content type:', typeof response.content);
  console.log('Content length:', response.content ? response.content.length : 0);
  console.log('Cost:', response.cost);
  console.log('');
} catch (error) {
  console.error('❌ Call failed:', error.message);
  console.error(error.stack);
  console.log('');
}

// Test 2: Grok-4-fast call
console.log('Test 2: Grok-4-fast');
console.log('─────────────────────────────────────────────');
try {
  const response = await callAI({
    model: 'grok-4-fast',
    systemPrompt: 'You are a helpful assistant. Respond in valid JSON only.',
    userPrompt: 'Return this JSON: {"test": "success", "score": 75}',
    jsonMode: true
  });

  console.log('✅ Call succeeded');
  console.log('Response content:', response.content);
  console.log('Content type:', typeof response.content);
  console.log('Content length:', response.content ? response.content.length : 0);
  console.log('Cost:', response.cost);
  console.log('');
} catch (error) {
  console.error('❌ Call failed:', error.message);
  console.error(error.stack);
  console.log('');
}

console.log('Done!');
