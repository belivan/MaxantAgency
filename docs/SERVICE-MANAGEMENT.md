# MaxantAgency - Service Management Guide

## Quick Commands

```powershell
# Start all services
npm run start

# Stop all services
npm run stop

# Check service status
npm run status

# Clean up duplicate "- Copy" files
npm run cleanup

# Reinstall all dependencies
npm run reinstall
```

## Service Architecture

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Command Center UI | 3000 | http://localhost:3000 | Main dashboard |
| Analysis Engine | 3001 | http://localhost:3001/health | Website analysis |
| Outreach Engine | 3002 | http://localhost:3002/health | Email generation |
| Prospecting Engine | 3010 | http://localhost:3010/health | Lead discovery |
| Pipeline Orchestrator | 3020 | http://localhost:3020/health | Campaign management |

## Common Issues & Solutions

### 🔴 Issue: Services Not Starting

**Symptoms:**
```
✗ Prospecting Engine (port 3010): Not running
✗ Analysis Engine (port 3001): Not running
```

**Cause:** "- Copy" files in node_modules (Windows file conflict issue)

**Solution:**
```powershell
npm run cleanup   # Remove duplicate files
npm run reinstall # Clean reinstall
npm run start     # Start services
```

---

### 🔴 Issue: Port Already in Use

**Symptoms:**
```
Error: Port 3001 is already in use
```

**Solution:**
```powershell
# Option 1: Use built-in stop script
npm run stop

# Option 2: Find and kill process manually
netstat -ano | findstr :3001
taskkill /F /PID <pid>

# Then start again
npm run start
```

---

### 🔴 Issue: Module Not Found Errors

**Symptoms:**
```
Error: Cannot find module '@anthropic-ai/sdk'
Error: Cannot resolve module './ethereum - Copy.js'
```

**Solution:**
```powershell
# Full cleanup and reinstall
npm run cleanup
npm run reinstall
```

---

### 🔴 Issue: Environment Variables Missing

**Symptoms:**
```
Error: SUPABASE_URL is not defined
Error: OPENAI_API_KEY is not defined
```

**Solution:**
```powershell
# Check if .env files exist in each engine
ls *-engine/.env

# Copy from .env.example if missing
cp prospecting-engine/.env.example prospecting-engine/.env
cp analysis-engine/.env.example analysis-engine/.env
cp outreach-engine/.env.example outreach-engine/.env

# Edit each .env file with your API keys
```

---

## Detailed Service Management

### Starting Services

```powershell
# Start all services (recommended)
npm run start

# Or start individual services
cd prospecting-engine && node server.js
cd analysis-engine && node server.js
cd outreach-engine && node server.js
cd pipeline-orchestrator && node server.js
cd command-center-ui && npm run dev
```

### Stopping Services

```powershell
# Stop all services (recommended)
npm run stop

# Or manually kill by port
$ports = @(3000, 3001, 3002, 3010, 3020)
foreach ($port in $ports) {
  $pid = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
  if ($pid) { Stop-Process -Id $pid -Force }
}
```

### Checking Status

```powershell
# Check all services
npm run status

# Check specific port
netstat -ano | findstr :3001
```

---

## Maintenance

### Weekly Maintenance

```powershell
# 1. Check for "- Copy" files
npm run cleanup

# 2. Update dependencies
npm update
cd prospecting-engine && npm update && cd ..
cd analysis-engine && npm update && cd ..
cd outreach-engine && npm update && cd ..
cd command-center-ui && npm update && cd ..

# 3. Restart services
npm run stop
npm run start
```

### After Git Pull

```powershell
# 1. Stop services
npm run stop

# 2. Update dependencies
npm run install:all

# 3. Cleanup any issues
npm run cleanup

# 4. Start services
npm run start
```

### Full Reset (Nuclear Option)

```powershell
# 1. Stop everything
npm run stop

# 2. Delete all node_modules
Get-ChildItem -Recurse -Directory -Filter "node_modules" | Remove-Item -Recurse -Force

# 3. Delete all package-lock files
Get-ChildItem -Recurse -File -Filter "package-lock.json" | Remove-Item -Force

# 4. Reinstall everything
npm install
npm run install:all

# 5. Start services
npm run start
```

---

## Logs & Debugging

### View Service Logs

```powershell
# Analysis Engine logs
Get-Content analysis-engine/logs/analysis-engine.log -Tail 50 -Wait

# Prospecting Engine logs
Get-Content prospecting-engine/logs/prospecting-engine.log -Tail 50 -Wait

# All logs
Get-ChildItem -Recurse -Filter "*.log" -File | ForEach-Object { Write-Host $_.FullName }
```

### Debug Mode

```powershell
# Start with debug logging
$env:DEBUG = "*"
npm run start
```

---

## Performance Optimization

### Free Up Memory

```powershell
# Find node processes using lots of memory
Get-Process node | Sort-Object WS -Descending | Select-Object -First 10

# Restart services to clear memory
npm run stop
npm run start
```

### Clear Caches

```powershell
# Clear npm cache
npm cache clean --force

# Clear browser cache for UI
# Ctrl + Shift + R in browser
```

---

## Docker Alternative (Optional)

If you prefer containerized deployment:

```powershell
# Build all containers
npm run docker:build

# Start all services in Docker
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

---

## Health Checks

### Verify All Services Are Healthy

```powershell
# Manual health check
Invoke-WebRequest -Uri http://localhost:3001/health
Invoke-WebRequest -Uri http://localhost:3002/health
Invoke-WebRequest -Uri http://localhost:3010/health
Invoke-WebRequest -Uri http://localhost:3020/health
```

### Expected Responses

All health endpoints should return:
```json
{
  "status": "ok",
  "service": "analysis-engine",
  "timestamp": "2025-10-23T..."
}
```

---

## Getting Help

1. **Check logs**: Look in `*-engine/logs/*.log`
2. **Run status**: `npm run status`
3. **Check this guide**: Common issues section above
4. **Full reset**: Follow "Full Reset" section
5. **Create GitHub issue**: Include logs and error messages

---

## Script Reference

| Script | Description |
|--------|-------------|
| `npm run start` | Start all services |
| `npm run stop` | Stop all services |
| `npm run status` | Check service status |
| `npm run cleanup` | Remove "- Copy" files |
| `npm run reinstall` | Clean dependency reinstall |
| `npm run install:all` | Install deps in all engines |
| `npm run dev` | Start with live reload (concurrently) |
| `npm run build` | Build UI for production |
| `npm run docker:up` | Start with Docker |
| `npm run pm2:start` | Start with PM2 (production) |

---

**Last Updated:** October 23, 2025
