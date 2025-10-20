#!/usr/bin/env node

/**
 * Database Tools CLI
 * Main entrypoint for all database setup commands
 */

import { Command } from 'commander';
import { runSetup } from './setup.js';
import { runValidate } from './validate.js';
import { runMigrate } from './migrate.js';
import { runSeed } from './seed.js';

const program = new Command();

program
  .name('db')
  .description('Database setup and migration tool for MaxantAgency')
  .version('1.0.0');

// Setup command
program
  .command('setup')
  .description('Set up database from schema files')
  .option('--dry-run', 'Preview SQL without executing')
  .option('--verbose', 'Show detailed logs')
  .option('--skip-constraints', 'Skip creating foreign key constraints')
  .option('--force', 'Drop existing tables and recreate')
  .action(async (options) => {
    try {
      await runSetup(options);
    } catch (error) {
      console.error('Error:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate all schema files')
  .option('--verbose', 'Show detailed logs')
  .action(async (options) => {
    try {
      await runValidate(options);
    } catch (error) {
      console.error('Error:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Migrate command
program
  .command('migrate')
  .description('Run database migrations')
  .option('--version <version>', 'Migrate to specific version')
  .option('--rollback', 'Rollback last migration')
  .option('--verbose', 'Show detailed logs')
  .action(async (options) => {
    try {
      await runMigrate(options);
    } catch (error) {
      console.error('Error:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Seed command
program
  .command('seed')
  .description('Insert seed data into database')
  .option('--reset', 'Clear existing data first')
  .option('--verbose', 'Show detailed logs')
  .action(async (options) => {
    try {
      await runSeed(options);
    } catch (error) {
      console.error('Error:', error.message);
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
