/**
 * Export Supabase tables to CSV files
 *
 * Usage:
 *   node scripts/export-tables.js --all
 *   node scripts/export-tables.js --tables prospects,leads
 *   node scripts/export-tables.js --all --output ./exports
 */

import { initSupabase, listTables } from '../runners/supabase-runner.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    all: false,
    tables: [],
    output: path.join(__dirname, '../../exports'),
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--all') {
      options.all = true;
    } else if (arg === '--tables' && args[i + 1]) {
      options.tables = args[i + 1].split(',').map(t => t.trim());
      i++;
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[i + 1];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
CSV Export Tool for Supabase Tables
====================================

Usage:
  node scripts/export-tables.js [options]

Options:
  --all                  Export all tables
  --tables <list>        Export specific tables (comma-separated)
  --output <directory>   Output directory (default: ./exports)
  --help, -h            Show this help message

Examples:
  node scripts/export-tables.js --all
  node scripts/export-tables.js --tables prospects,leads,composed_emails
  node scripts/export-tables.js --all --output ./my-exports
  `);
}

/**
 * Convert JSON array to CSV string
 * @param {Array} data - Array of objects
 * @returns {string} CSV formatted string
 */
function jsonToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  // Get all unique columns from all rows
  const columns = [...new Set(data.flatMap(row => Object.keys(row)))];

  // Create header row
  const header = columns.map(col => `"${col}"`).join(',');

  // Create data rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col];

      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }

      // Handle objects and arrays (stringify them)
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }

      // Handle strings (escape quotes)
      if (typeof value === 'string') {
        return `"${value.replace(/"/g, '""')}"`;
      }

      // Handle numbers, booleans, etc.
      return value;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Export a single table to CSV
 * @param {string} tableName - Name of table to export
 * @param {string} outputDir - Output directory
 * @returns {Promise<object>} Export result
 */
async function exportTable(tableName, outputDir) {
  const supabase = initSupabase();

  console.log(`📊 Exporting table: ${tableName}...`);

  try {
    // Fetch all data from table
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      console.log(`   ⚠️  Table is empty, skipping`);
      return { success: true, rows: 0, skipped: true };
    }

    // Convert to CSV
    const csv = jsonToCSV(data);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write to file
    const filename = path.join(outputDir, `${tableName}.csv`);
    fs.writeFileSync(filename, csv, 'utf8');

    console.log(`   ✅ Exported ${data.length} rows to ${filename}`);

    return {
      success: true,
      rows: data.length,
      filename,
      skipped: false
    };

  } catch (error) {
    console.error(`   ❌ Error exporting ${tableName}: ${error.message}`);
    return {
      success: false,
      error: error.message,
      skipped: false
    };
  }
}

/**
 * Main export function
 */
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🚀 Supabase CSV Export Tool\n');

  // Determine which tables to export
  let tablesToExport = [];

  if (options.all) {
    console.log('📋 Fetching all tables...');

    // Known tables in MaxantAgency system
    const knownTables = [
      'prospects',
      'leads',
      'composed_emails',
      'social_outreach',
      'campaigns',
      'campaign_runs',
      'projects',
      'reports',
      'benchmarks'
    ];

    // Check which tables exist
    const supabase = initSupabase();
    for (const table of knownTables) {
      const { error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

      if (!error) {
        tablesToExport.push(table);
      }
    }

    console.log(`   Found ${tablesToExport.length} tables\n`);
  } else if (options.tables.length > 0) {
    tablesToExport = options.tables;
  } else {
    console.error('❌ Error: You must specify --all or --tables\n');
    showHelp();
    process.exit(1);
  }

  if (tablesToExport.length === 0) {
    console.log('⚠️  No tables to export');
    process.exit(0);
  }

  console.log(`📁 Output directory: ${options.output}\n`);

  // Export each table
  const results = [];
  for (const table of tablesToExport) {
    const result = await exportTable(table, options.output);
    results.push({ table, ...result });
  }

  // Summary
  console.log('\n📊 Export Summary');
  console.log('=================');

  const successful = results.filter(r => r.success && !r.skipped);
  const skipped = results.filter(r => r.skipped);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Exported: ${successful.length} tables`);
  console.log(`⚠️  Skipped: ${skipped.length} tables (empty)`);
  console.log(`❌ Failed: ${failed.length} tables`);

  const totalRows = successful.reduce((sum, r) => sum + r.rows, 0);
  console.log(`📈 Total rows: ${totalRows.toLocaleString()}`);

  if (failed.length > 0) {
    console.log('\n❌ Failed tables:');
    failed.forEach(f => {
      console.log(`   - ${f.table}: ${f.error}`);
    });
  }

  console.log(`\n✨ Done! Files saved to: ${options.output}`);
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});