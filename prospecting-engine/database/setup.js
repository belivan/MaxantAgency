#!/usr/bin/env node

/**
 * Database Setup Script
 *
 * Reads JSON schema files and generates/executes SQL to create tables in Supabase.
 *
 * Usage:
 *   npm run db:setup           - Execute SQL on Supabase
 *   npm run db:setup --dry-run - Preview SQL without executing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCHEMAS_DIR = path.join(__dirname, 'schemas');

/**
 * Map JSON types to PostgreSQL types
 */
function mapType(jsonType) {
  const typeMap = {
    'text': 'TEXT',
    'integer': 'INTEGER',
    'decimal': 'DECIMAL',
    'boolean': 'BOOLEAN',
    'uuid': 'UUID',
    'jsonb': 'JSONB',
    'timestamptz': 'TIMESTAMPTZ'
  };

  return typeMap[jsonType] || 'TEXT';
}

/**
 * Generate CREATE TABLE SQL from JSON schema
 */
function generateCreateTableSQL(schema) {
  const tableName = schema.table;
  const columns = schema.columns || [];

  let sql = `-- ═══════════════════════════════════════════════════════\n`;
  sql += `-- Table: ${tableName}\n`;
  sql += `-- ${schema.description || ''}\n`;
  sql += `-- ═══════════════════════════════════════════════════════\n\n`;

  sql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;

  const columnDefs = columns.map(col => {
    let def = `  ${col.name} ${mapType(col.type)}`;

    if (col.primaryKey) {
      def += ' PRIMARY KEY';
    }

    if (col.default) {
      if (col.default === 'gen_random_uuid()' || col.default === 'now()') {
        def += ` DEFAULT ${col.default}`;
      } else if (typeof col.default === 'string') {
        def += ` DEFAULT '${col.default}'`;
      } else {
        def += ` DEFAULT ${col.default}`;
      }
    }

    if (col.required && !col.primaryKey) {
      def += ' NOT NULL';
    }

    if (col.unique) {
      def += ' UNIQUE';
    }

    return def;
  });

  sql += columnDefs.join(',\n');
  sql += '\n);\n\n';

  // Add comments on columns
  sql += `-- Column comments\n`;
  columns.forEach(col => {
    if (col.description) {
      sql += `COMMENT ON COLUMN ${tableName}.${col.name} IS '${col.description.replace(/'/g, "''")}';\n`;
    }
  });

  sql += '\n';

  return sql;
}

/**
 * Generate CREATE INDEX SQL
 */
function generateIndexSQL(schema) {
  const tableName = schema.table;
  const indexes = schema.indexes || [];

  if (indexes.length === 0) return '';

  let sql = `-- Indexes\n`;

  indexes.forEach(idx => {
    const indexName = idx.name || `idx_${tableName}_${idx.columns.join('_')}`;
    const columns = idx.columns.join(', ');

    sql += `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columns});\n`;
  });

  sql += '\n';

  return sql;
}

/**
 * Generate CHECK constraints SQL
 */
function generateConstraintsSQL(schema) {
  const tableName = schema.table;
  const constraints = schema.constraints || [];

  if (constraints.length === 0) return '';

  let sql = `-- Constraints\n`;

  constraints.forEach(constraint => {
    if (constraint.type === 'check') {
      sql += `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraint.name} CHECK (${constraint.expression});\n`;
    }
  });

  sql += '\n';

  return sql;
}

/**
 * Generate complete SQL from schema file
 */
function generateSQL(schemaPath) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

  let sql = '';
  sql += generateCreateTableSQL(schema);
  sql += generateIndexSQL(schema);
  sql += generateConstraintsSQL(schema);

  return sql;
}

/**
 * Execute SQL on Supabase
 */
async function executeSQL(sql) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('\n🔄 Connecting to Supabase...');

  // Note: Supabase JS client doesn't support raw SQL execution
  // We need to use the REST API directly
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    // Since exec_sql might not be available, we'll use a different approach
    // We'll manually execute each statement using the Supabase client
    console.log('⚠️  Note: Direct SQL execution may not be supported.');
    console.log('📋 Please run the SQL manually in your Supabase SQL Editor:');
    console.log('   https://app.supabase.com/project/_/sql\n');
    return false;
  }

  return true;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('          PROSPECTING ENGINE - Database Setup          ');
  console.log('═══════════════════════════════════════════════════════\n');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - SQL will be printed but not executed\n');
  }

  // Find all schema files
  const schemaFiles = fs.readdirSync(SCHEMAS_DIR)
    .filter(file => file.endsWith('.json'));

  if (schemaFiles.length === 0) {
    console.log('❌ No schema files found in database/schemas/');
    process.exit(1);
  }

  console.log(`📁 Found ${schemaFiles.length} schema file(s):\n`);

  let allSQL = '';

  // Generate SQL for each schema
  for (const schemaFile of schemaFiles) {
    const schemaPath = path.join(SCHEMAS_DIR, schemaFile);
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    console.log(`   ✓ ${schema.table} (${schemaFile})`);

    const sql = generateSQL(schemaPath);
    allSQL += sql + '\n';
  }

  console.log('\n───────────────────────────────────────────────────────\n');

  if (isDryRun) {
    console.log('Generated SQL:\n');
    console.log(allSQL);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('✅ Dry run complete. No changes made to database.\n');
    return;
  }

  // Execute SQL
  console.log('📋 Generated SQL:\n');
  console.log(allSQL);
  console.log('───────────────────────────────────────────────────────\n');

  // For now, we'll just save the SQL to a file and ask user to run it manually
  const sqlFile = path.join(__dirname, 'generated-schema.sql');
  fs.writeFileSync(sqlFile, allSQL, 'utf-8');

  console.log(`✅ SQL saved to: ${sqlFile}\n`);
  console.log('📝 Next steps:');
  console.log('   1. Go to https://app.supabase.com/project/_/sql');
  console.log('   2. Copy and paste the SQL from generated-schema.sql');
  console.log('   3. Click "Run" to create the tables\n');
  console.log('   Or run this SQL in your preferred PostgreSQL client.\n');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Run main function
main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
