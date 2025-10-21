import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🔄 Killing old Analysis Engine server (PID 17816)...\n');

try {
  const { stdout, stderr } = await execAsync('taskkill /F /PID 17816');
  console.log('✅ Server killed successfully');
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
} catch (error) {
  if (error.message.includes('not found')) {
    console.log('✅ Process already stopped');
  } else {
    console.error('⚠️  Error killing process:', error.message);
  }
}

console.log('\n⏳ Waiting 2 seconds...\n');
await new Promise(resolve => setTimeout(resolve, 2000));

console.log('🚀 Starting new Analysis Engine server with SSE support...\n');
console.log('Run this command manually in a new terminal:');
console.log('   cd analysis-engine');
console.log('   node server.js');
console.log('\nThen run:');
console.log('   node test-sse-5-prospects.js');
console.log('\n(The server needs to run in a separate terminal so you can see its output)');
