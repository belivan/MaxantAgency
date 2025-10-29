# Fix "- Copy" File Issue

## Problem
Windows creates "- Copy" files in `node_modules` when there are file conflicts during npm installs. These duplicate files (5,780+ found) cause module resolution failures and prevent services from starting.

**Symptoms:**
- ❌ Prospecting Engine (port 3010): Not running
- ❌ Analysis Engine (port 3001): Not running
- Import errors or "Cannot find module" errors
- Services fail to start

## Root Cause
When npm installs packages on Windows, file system conflicts can create duplicate files with "- Copy" suffixes:
```
ethereum.js
ethereum - Copy.js  ← Breaks imports!
```

## Solution

### Option 1: Quick Fix (Recommended)
Run these commands in order:

```powershell
# 1. Clean up all "- Copy" files (deletes 5,780+ files)
npm run cleanup

# 2. Reinstall all dependencies cleanly
npm run reinstall

# 3. Start all services
npm run start

# 4. Check status
npm run status
```

### Option 2: Manual Fix

```powershell
# 1. Stop all services
npm run stop

# 2. Delete all node_modules folders
Get-ChildItem -Path . -Recurse -Directory -Filter "node_modules" | Remove-Item -Recurse -Force

# 3. Delete package-lock files
Get-ChildItem -Path . -Recurse -File -Filter "package-lock.json" | Remove-Item -Force

# 4. Reinstall
npm run install:all

# 5. Start services
npm run start
```

### Option 3: Nuclear Option (If above fails)

```powershell
# Delete entire project and re-clone
cd ..
Remove-Item -Path MaxantAgency -Recurse -Force
git clone <repo-url>
cd MaxantAgency
npm install
npm run install:all
npm run start
```

## Prevention

To prevent "- Copy" files from being created:

1. **Close all terminals/processes** before running `npm install`
2. **Don't interrupt** npm install operations
3. **Use npm ci** instead of `npm install` when possible (uses package-lock)
4. **Run cleanup regularly**: `npm run cleanup` (weekly)

## Scripts Reference

```json
{
  "start": "node start-all.js",        // Start all services
  "stop": "node stop-all.js",          // Stop all services
  "status": "node status.js",          // Check service status
  "cleanup": "node cleanup-copy-files.js",  // Remove "- Copy" files
  "reinstall": "node reinstall-deps.js"     // Clean reinstall all deps
}
```

## Troubleshooting

### If cleanup fails:
```powershell
# Some files may be locked by running processes
npm run stop
npm run cleanup
```

### If reinstall fails:
```powershell
# Delete node_modules manually and try again
Get-ChildItem -Recurse -Directory -Filter "node_modules" | Remove-Item -Recurse -Force
npm run reinstall
```

### If services still won't start:
```powershell
# Check what's using the ports
netstat -ano | findstr :3001
netstat -ano | findstr :3010

# Kill specific process by PID
taskkill /F /PID <pid>

# Then start services
npm run start
```

## Expected Results

After successful cleanup and reinstall:

```
✓ Command Center UI (port 3000): Running
✓ Prospecting Engine (port 3010): Running
✓ Analysis Engine (port 3001): Running
✓ Outreach Engine (port 3002): Running
✓ Pipeline Orchestrator (port 3020): Running
```

All services should start within 5-10 seconds.
