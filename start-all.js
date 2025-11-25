#!/usr/bin/env node
/**
 * MaxantAgency Service Launcher
 * Starts all microservices cleanly with port conflict detection
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SERVICES = [
  { name: 'Command Center UI', port: 3000, dir: 'command-center-ui', cmd: 'npm run dev', color: '\x1b[36m' },
  { name: 'Prospecting Engine', port: 3010, dir: 'prospecting-engine', cmd: 'node server.js', color: '\x1b[32m' },
  { name: 'Analysis Engine', port: 3001, dir: 'analysis-engine', cmd: 'node server.js', color: '\x1b[33m' },
  { name: 'Report Engine', port: 3003, dir: 'report-engine', cmd: 'node server.js', color: '\x1b[37m' },
  { name: 'Outreach Engine', port: 3002, dir: 'outreach-engine', cmd: 'node server.js', color: '\x1b[35m' },
  { name: 'Pipeline Orchestrator', port: 3020, dir: 'pipeline-orchestrator', cmd: 'node server.js', color: '\x1b[34m' }
];

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';

console.log(`\n${BOLD}🚀 MaxantAgency Service Launcher${RESET}\n`);
console.log('='.repeat(70));

/**
 * Find process using a specific port (cross-platform)
 */
async function findProcessOnPort(port) {
  try {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          return parseInt(pid);
        }
      }
    } else {
      // macOS/Linux: use lsof
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      const pid = stdout.trim().split('\n')[0];
      return pid ? parseInt(pid) : null;
    }
    return null;
  } catch (error) {
    return null; // No process found
  }
}

/**
 * Kill a process by PID (cross-platform)
 */
async function killProcess(pid) {
  try {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      await execAsync(`taskkill /F /PID ${pid}`);
    } else {
      // macOS/Linux: use kill
      await execAsync(`kill -9 ${pid}`);
    }
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check and clear ports
 */
async function clearPorts() {
  console.log(`\n${BOLD}Step 1: Checking for existing processes${RESET}\n`);

  let killedAny = false;

  for (const service of SERVICES) {
    const pid = await findProcessOnPort(service.port);

    if (pid) {
      process.stdout.write(`${service.color}${service.name}${RESET} (port ${service.port}): `);
      const killed = await killProcess(pid);

      if (killed) {
        console.log(`${RED}✓ Killed PID ${pid}${RESET}`);
        killedAny = true;
      } else {
        console.log(`${YELLOW}⚠ Failed to kill PID ${pid}${RESET}`);
      }
    }
  }

  if (!killedAny) {
    console.log(`${GREEN}✓ No existing processes found${RESET}`);
  }

  // Wait a moment for ports to be released
  if (killedAny) {
    console.log(`\n${YELLOW}Waiting 2 seconds for ports to be released...${RESET}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

/**
 * Start a service
 */
async function startService(service) {
  return new Promise((resolve) => {
    console.log(`${service.color}${service.name}${RESET} (port ${service.port}): Starting...`);

    // Use shell to execute the full command
    const child = spawn(service.cmd, {
      cwd: service.dir,
      detached: true,
      stdio: 'ignore',
      shell: true
    });

    child.unref(); // Allow parent to exit

    // Wait a moment then check if it started
    setTimeout(async () => {
      const pid = await findProcessOnPort(service.port);

      if (pid) {
        console.log(`${service.color}${service.name}${RESET}: ${GREEN}✓ Running (PID ${pid})${RESET}`);
        resolve(true);
      } else {
        console.log(`${service.color}${service.name}${RESET}: ${RED}✗ Failed to start${RESET}`);
        resolve(false);
      }
    }, 3000);
  });
}

/**
 * Start all services
 */
async function startAllServices() {
  console.log(`\n${BOLD}Step 2: Starting services${RESET}\n`);

  const results = [];

  // Start UI first (takes longest to compile)
  results.push(await startService(SERVICES[0]));

  // Start engines in parallel
  console.log(''); // Blank line
  const enginePromises = SERVICES.slice(1).map(service => startService(service));
  const engineResults = await Promise.all(enginePromises);
  results.push(...engineResults);

  return results;
}

/**
 * Show final status
 */
async function showStatus() {
  console.log(`\n${BOLD}Step 3: Final Status${RESET}\n`);

  for (const service of SERVICES) {
    const pid = await findProcessOnPort(service.port);

    process.stdout.write(`${service.color}${service.name}${RESET} `);
    process.stdout.write(`(port ${service.port}): `);

    if (pid) {
      console.log(`${GREEN}✓ Running${RESET} (PID ${pid})`);
    } else {
      console.log(`${RED}✗ Not running${RESET}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n${GREEN}${BOLD}✓ Launch complete!${RESET}`);
  console.log(`\nTo stop all services, run: ${BOLD}node stop-all.js${RESET}\n`);
}

/**
 * Main
 */
async function main() {
  try {
    await clearPorts();
    await startAllServices();
    await showStatus();
  } catch (error) {
    console.error(`\n${RED}${BOLD}✗ Launch failed:${RESET}`, error.message);
    process.exit(1);
  }
}

main();
