/**
 * Test SSE Integration between Analysis Engine and UI
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const ANALYSIS_API = 'http://localhost:3001';

async function testSSE() {
  console.log(chalk.cyan.bold('\n🚀 TESTING SSE INTEGRATION\n'));

  // Test prospects
  const testProspects = [
    { url: 'https://example.com', company_name: 'Example', industry: 'demo' },
    { url: 'https://httpbin.org', company_name: 'HTTPBin', industry: 'api' }
  ];

  console.log(chalk.yellow('Testing batch analysis with SSE...'));
  console.log(chalk.gray(`Analyzing ${testProspects.length} prospects\n`));

  try {
    const response = await fetch(`${ANALYSIS_API}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospects: testProspects })
    });

    if (!response.ok) {
      console.log(chalk.red('❌ Request failed:'), response.status, response.statusText);
      return;
    }

    const contentType = response.headers.get('content-type');
    console.log(chalk.gray('Content-Type:'), contentType);

    if (contentType && contentType.includes('text/event-stream')) {
      console.log(chalk.green('✅ SSE stream detected\n'));

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        console.log(chalk.red('❌ No response stream'));
        return;
      }

      let buffer = '';
      let eventCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;

          if (line.startsWith('event:')) {
            const eventType = line.slice(6).trim();
            console.log(chalk.blue(`📨 Event: ${eventType}`));
            eventCount++;
          } else if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.slice(5));
              console.log(chalk.gray('   Data:'), data);

              // Display specific event types
              if (data.message) {
                console.log(chalk.white(`   → ${data.message}`));
              }
              if (data.grade) {
                console.log(chalk.green(`   ✓ ${data.company}: Grade ${data.grade} (${data.score}/100)`));
              }
              if (data.error) {
                console.log(chalk.red(`   ✗ ${data.company || 'Unknown'}: ${data.error}`));
              }
              if (data.successful !== undefined) {
                console.log(chalk.cyan(`\n📊 Complete: ${data.successful}/${data.total} successful, ${data.failed} failed`));
              }
            } catch (e) {
              console.log(chalk.gray('   Raw:'), line);
            }
          }
        }
      }

      console.log(chalk.green(`\n✅ SSE stream completed successfully`));
      console.log(chalk.cyan(`   Total events received: ${eventCount}`));

    } else {
      console.log(chalk.yellow('⚠️  Response is not SSE, got regular JSON'));
      const result = await response.json();
      console.log(result);
    }

  } catch (error) {
    console.log(chalk.red('❌ Error:'), error.message);
  }
}

testSSE().catch(console.error);