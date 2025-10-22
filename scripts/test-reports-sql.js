import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the reports.json schema
const schemaPath = join(__dirname, '..', 'database-tools', 'shared', 'schemas', 'reports.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

// Generate SQL for the config column with default
const configCol = schema.columns.find(c => c.name === 'config');
console.log('Config column definition:', configCol);

// Show how it would be generated
const defaultValue = configCol.default;
console.log('\nDefault value:', defaultValue);

// Check if it needs special handling
if (defaultValue && defaultValue.includes('::')) {
  console.log('This is a PostgreSQL cast expression');
  console.log('Should be rendered as:', defaultValue);
} else {
  console.log('This is a simple string default');
  console.log('Should be rendered as:', `'${defaultValue}'`);
}