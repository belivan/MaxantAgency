import fs from 'fs';
const dirs = ['config/prompts/email-strategies', 'config/prompts/social-strategies'];
let total = 0, valid = 0;
dirs.forEach(dir => {
  fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_')).forEach(file => {
    total++;
    try {
      JSON.parse(fs.readFileSync(dir + '/' + file, 'utf8'));
      valid++;
    } catch(e) {
      console.log('✗', file, e.message.substring(0, 60));
    }
  });
});
console.log(valid === total ? `✅ All ${total} templates valid!` : `⚠️  ${valid}/${total} valid`);
process.exit(valid === total ? 0 : 1);
