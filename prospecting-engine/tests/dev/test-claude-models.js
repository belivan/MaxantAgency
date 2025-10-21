import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const models = [
  // Claude 4.x models (dots)
  'claude-sonnet-4.5',
  'claude-haiku-4.5',
  'claude-opus-4.1',
  // Claude 4.x models (hyphens)
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
  'claude-opus-4-1',
  // Claude 3.x models
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307'
];

async function testModels() {
  console.log('Testing Claude models...\n');

  for (const model of models) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      });
      console.log(`✓ ${model} - WORKS`);
    } catch (e) {
      const error = e.error?.message || e.message;
      console.log(`✗ ${model} - ${error}`);
    }
  }
}

testModels();
