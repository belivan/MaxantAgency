import fs from 'fs';
import path from 'path';

const dirs = ['config/prompts/email-strategies', 'config/prompts/social-strategies'];
let errors = [];

dirs.forEach(dir => {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  files.forEach(file => {
    const filepath = path.join(dir, file);
    try {
      JSON.parse(fs.readFileSync(filepath, 'utf8'));
      console.log('✓', file);
    } catch(e) {
      console.log('✗', file);
      errors.push(file);
    }
  });
});

console.log('\n' + (errors.length === 0 ? '✅ All files valid!' : `⚠️  ${errors.length} errors`));
process.exit(errors.length);
