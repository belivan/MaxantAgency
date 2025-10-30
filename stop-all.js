#!/usr/bin/env node
/**
 * MaxantAgency Service Stopper
 * Cleanly stops all running microservices
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SERVICES = [
  { name: 'Command Center UI', port: 3000, color: '\x1b[36m' },
  { name: 'Prospecting Engine', port: 3010, color: '\x1b[32m' },
  { name: 'Analysis Engine', port: 3001, color: '\x1b[33m' },
  { name: 'Report Engine', port: 3003, color: '\x1b[37m' },
  { name: 'Outreach Engine', port: 3002, color: '\x1b[35m' },
  { name: 'Pipeline Orchestrator', port: 3020, color: '\x1b[34m' }
];

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';

console.log(`\n${BOLD}🛑 MaxantAgency Service Stopper${RESET}\n`);
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
 * Kill a process by PID
 */
async function killProcess(pid) {
  try {
    await execAsync(`taskkill /F /PID ${pid}`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Stop all services
 */
async function stopAllServices() {
  console.log(`\n${BOLD}Stopping services...${RESET}\n`);

  let stoppedCount = 0;
  let notRunningCount = 0;

  for (const service of SERVICES) {
    const pid = await findProcessOnPort(service.port);

    process.stdout.write(`${service.color}${service.name}${RESET} (port ${service.port}): `);

    if (pid) {
      const killed = await killProcess(pid);

      if (killed) {
        console.log(`${GREEN}✓ Stopped (PID ${pid})${RESET}`);
        stoppedCount++;
      } else {
        console.log(`${RED}✗ Failed to stop (PID ${pid})${RESET}`);
      }
    } else {
      console.log(`${YELLOW}Not running${RESET}`);
      notRunningCount++;
    }
  }

  console.log('\n' + '='.repeat(70));

  if (stoppedCount > 0) {
    console.log(`\n${GREEN}${BOLD}✓ Stopped ${stoppedCount} service(s)${RESET}`);
  }

  if (notRunningCount === SERVICES.length) {
    console.log(`\n${YELLOW}No services were running${RESET}`);
  }

  console.log('');
}

stopAllServices().catch(error => {
  console.error(`\n${RED}${BOLD}✗ Error:${RESET}`, error.message);
  process.exit(1);
});
