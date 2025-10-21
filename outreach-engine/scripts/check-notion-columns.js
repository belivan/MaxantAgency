import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

console.log('\n📋 CHECKING YOUR ACTUAL NOTION COLUMNS...\n');

try {
  const db = await notion.databases.retrieve({ database_id: DATABASE_ID });

  console.log('Database Name:', db.title[0]?.plain_text || 'Untitled');
  console.log('Database ID:', DATABASE_ID);
  console.log('\n');

  const properties = db.properties || {};
  const propNames = Object.keys(properties);

  if (propNames.length === 0) {
    console.log('⚠️  Your Notion database has NO COLUMNS yet!');
    console.log('   This is a fresh/empty database.');
    console.log('   You need to add columns manually in Notion UI.\n');
  } else {
    console.log(`Total columns: ${propNames.length}\n`);
    console.log('Your current columns:\n');

    propNames.forEach((name, i) => {
      const prop = properties[name];
      const type = prop.type;
      console.log(`  ${i + 1}. "${name}" (${type})`);

      // Show options for select/multi-select
      if (type === 'select' && prop.select?.options) {
        const options = prop.select.options.map(o => o.name).join(', ');
        console.log(`     Options: ${options}`);
      }
      if (type === 'multi_select' && prop.multi_select?.options) {
        const options = prop.multi_select.options.map(o => o.name).join(', ');
        console.log(`     Options: ${options}`);
      }
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════════════\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\nFull error:', error);
}
