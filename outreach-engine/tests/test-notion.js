import { testNotionConnection } from './integrations/notion.js';

console.log('🔗 Testing Notion connection...\n');

try {
  await testNotionConnection();
  console.log('\n✅ Notion integration is working!');
} catch (error) {
  console.error('\n❌ Notion connection failed:', error.message);
  process.exit(1);
}
