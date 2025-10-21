#!/usr/bin/env node
/**
 * MaxantAgency Service Status
 * Shows the current status of all services
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SERVICES = [
  { name: 'Command Center UI', port: 3000, url: 'http://localhost:3000', color: '\x1b[36m' },
  { name: 'Prospecting Engine', port: 3010, url: 'http://localhost:3010/health', color: '\x1b[32m' },
  { name: 'Analysis Engine', port: 3001, url: 'http://localhost:3001/health', color: '\x1b[33m' },
  { name: 'Outreach Engine', port: 3002, url: 'http://localhost:3002/health', color: '\x1b[35m' },
  { name: 'Pipeline Orchestrator', port: 3020, url: 'http://localhost:3020/health', color: '\x1b[34m' }
];

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';

console.log(`\n${BOLD}📊 MaxantAgency Service Status${RESET}\n`);
console.log('='.repeat(70));

/**
 * Find process using a specific port
 */
async function findProcessOnPort(port) {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    const lines = stdout.trim().split('\n');

    for (const line of lines) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        return parseInt(pid);
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check service status
 */
async function checkStatus() {
  console.log('');

  let runningCount = 0;

  for (const service of SERVICES) {
    const pid = await findProcessOnPort(service.port);

    process.stdout.write(`${service.color}${service.name}${RESET}\n`);
    process.stdout.write(`  Port: ${service.port}\n`);
    process.stdout.write(`  Status: `);

    if (pid) {
      console.log(`${GREEN}✓ Running${RESET} (PID ${pid})`);
      console.log(`  URL: ${service.url}`);
      runningCount++;
    } else {
      console.log(`${RED}✗ Not running${RESET}`);
    }

    console.log('');
  }

  console.log('='.repeat(70));
  console.log(`\n${runningCount}/${SERVICES.length} services running\n`);

  if (runningCount === 0) {
    console.log(`To start all services: ${BOLD}node start-all.js${RESET}\n`);
  } else if (runningCount < SERVICES.length) {
    console.log(`Some services are not running. Run: ${BOLD}node start-all.js${RESET}\n`);
  } else {
    console.log(`${GREEN}All services running!${RESET}\n`);
  }
}

checkStatus().catch(error => {
  console.error(`\n${RED}${BOLD}✗ Error:${RESET}`, error.message);
  process.exit(1);
});
