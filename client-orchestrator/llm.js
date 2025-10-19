import dotenv from 'dotenv';
dotenv.config();

// Also load env from website-audit-tool/.env so analyzer + LLM share keys
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const altPath = path.resolve(__dirname, '../website-audit-tool/.env');
  if (fs.existsSync(altPath)) {
    dotenv.config({ path: altPath, override: false });
  }
} catch {}

import OpenAI from 'openai';

export function getOpenAI(model = 'gpt-4o-mini') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set. Add it to website-audit-tool/.env');
  }
  const client = new OpenAI({ apiKey });
  return { client, model };
}

export async function completeJSON({ prompt, model = 'gpt-4o-mini', maxRetries = 2 }) {
  const { client } = getOpenAI(model);
  const sys = 'You are a helpful assistant. Always respond with valid JSON only.';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    });
    const txt = res.choices?.[0]?.message?.content || '';
    try {
      return JSON.parse(txt);
    } catch (e) {
      if (attempt === maxRetries) throw new Error('LLM did not return valid JSON');
    }
  }
}

