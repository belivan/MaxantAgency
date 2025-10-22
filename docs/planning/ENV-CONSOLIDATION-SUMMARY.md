# Environment Variable Consolidation Summary

## What Changed

All environment variables have been consolidated into a **single root `.env` file** for the entire MaxantAgency project.

## Files Modified

### 1. **Root .env** (Created)
- **Location**: `/.env`
- **Purpose**: Single source of truth for all environment variables
- **Sections**:
  1. Database Configuration (Supabase)
  2. AI Provider API Keys (Anthropic, OpenAI, xAI)
  3. Google APIs (Maps, Custom Search)
  4. Service Ports
  5. Microservice API Endpoints
  6. AI Model Configuration
  7. Sender Contact Information
  8. Gmail Integration
  9. Email Sanitization & Humanization
  10. Notion Integration
  11. Pipeline Orchestrator Configuration
  12. Prospecting Engine Configuration

### 2. **Service Files Updated** (13 Total Files)

#### Main Server Files (5 files)
1. **analysis-engine/server.js** - Added path resolution to load `../.env`
2. **prospecting-engine/server.js** - Updated to load root `.env` instead of `database-tools/.env`
3. **outreach-engine/server.js** - Added path resolution to load `../.env`
4. **pipeline-orchestrator/server.js** - Added path resolution to load `../.env`
5. **command-center-ui/next.config.mjs** - Added dotenv loader to load `../.env` before Next.js starts

#### Database Client Files (4 files)
6. **analysis-engine/database/supabase-client.js** - Added path resolution to load `../../.env`
7. **prospecting-engine/database/supabase-client.js** - Updated to load root `.env` instead of `database-tools/.env`
8. **outreach-engine/database/supabase-client.js** - Added path resolution to load `../../.env`
9. **pipeline-orchestrator/database/supabase-client.js** - Added path resolution to load `../../.env`

#### Orchestrator Files (2 files)
10. **analysis-engine/orchestrator.js** - Already used root `.env` ✓
11. **pipeline-orchestrator/orchestrator.js** - Added path resolution to load `../.env`

#### Database Tools (1 file)
12. **database-tools/runners/supabase-runner.js** - Updated to load `../../.env`

#### QA Supervisor (1 file)
13. **qa-supervisor/integration-tests/utils.js** - Already used root `.env`, fixed env var name from `SUPABASE_SERVICE_ROLE_KEY` to `SUPABASE_SERVICE_KEY`

### 3. **Files Removed**
- ❌ `analysis-engine/.env`
- ❌ `prospecting-engine/.env`
- ❌ `outreach-engine/.env`
- ❌ `pipeline-orchestrator/.env`
- ❌ `database-tools/.env`
- ❌ `command-center-ui/.env`
- ❌ `command-center-ui/.env.local` (was using different Supabase instance)

### 4. **Documentation Created**
- **File**: `/.env.example`
- **Purpose**: Template for new developers
- **Contents**: All environment variables with placeholders and setup instructions

## Important Resolved Issues

### ⚠️ Supabase Instance Discrepancy (RESOLVED)
- **Issue**: `command-center-ui/.env.local` was using a different Supabase instance
  - Most services: `https://yaqcfufvivxbapanlkxz.supabase.co`
  - UI was using: `https://njejsagzeebvsupzffpd.supabase.co`
- **Resolution**: Removed `.env.local`, all services now use the primary instance

## How It Works

### Node.js Services (Express servers)
Each service's `server.js` loads the root `.env` using:
```javascript
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });
```

### Next.js UI
The `next.config.mjs` loads the root `.env` at the top:
```javascript
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });
```

This ensures environment variables are loaded **before** Next.js starts, making them available both at build time and runtime.

## Benefits

1. **Single Source of Truth**: All credentials and configuration in one place
2. **Easier Management**: Update API keys once instead of in 7+ files
3. **Consistency**: All services use the same database and API keys
4. **Better Security**: Only one file to secure and exclude from git
5. **Simplified Onboarding**: New developers only need to copy `.env.example` to `.env`

## Verification Steps

To verify everything is working:

1. **Test Database Connection**:
   ```bash
   cd database-tools
   npm run db:validate
   ```

2. **Test Individual Services**:
   ```bash
   # Analysis Engine
   cd analysis-engine && node server.js
   # Should see: "✅ Supabase connected successfully"

   # Prospecting Engine
   cd prospecting-engine && node server.js
   # Should see: "Server running on port 3010"

   # Outreach Engine
   cd outreach-engine && node server.js
   # Should see: "Outreach Engine running on port 3002"

   # Pipeline Orchestrator
   cd pipeline-orchestrator && node server.js
   # Should see: "Pipeline Orchestrator running on port 3020"

   # Command Center UI
   cd command-center-ui && npm run dev
   # Should see: "Ready on http://localhost:3000"
   ```

3. **Test All Services Together**:
   ```bash
   npm run dev
   # Starts all services in parallel
   ```

## Migration Checklist

- [x] Create centralized root `.env` file
- [x] Update analysis-engine to use root `.env`
- [x] Update prospecting-engine to use root `.env`
- [x] Update outreach-engine to use root `.env`
- [x] Update pipeline-orchestrator to use root `.env`
- [x] Update database-tools to use root `.env`
- [x] Update command-center-ui to use root `.env`
- [x] Remove redundant `.env` files from subdirectories
- [x] Create `.env.example` template
- [x] Resolve Supabase instance discrepancy
- [x] Document changes

## Notes

- The root `.env` is already in `.gitignore` - it will NOT be committed
- `.env.example` is tracked in git for documentation purposes
- All template files (`.env.template`, `.env.example`) in subdirectories remain for reference
- If running services individually (not via npm scripts), they will still work because they load from the root `.env`

## Troubleshooting

### "Missing environment variables" error

**Cause**: Root `.env` file doesn't exist or is missing required variables

**Solution**:
```bash
# Copy the template
cp .env.example .env

# Edit and add your actual API keys
# Edit .env and fill in the values
```

### "Cannot connect to Supabase" error

**Cause**: Incorrect Supabase credentials in root `.env`

**Solution**:
1. Verify credentials in Supabase dashboard
2. Update `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in root `.env`
3. Restart services

### Next.js "env variable is undefined" error

**Cause**: Next.js might need a restart after `.env` changes

**Solution**:
```bash
cd command-center-ui
# Kill the dev server (Ctrl+C)
npm run dev
# Rebuild if necessary
npm run build
```

---

**Last Updated**: 2025-10-21
**Status**: ✅ Complete
