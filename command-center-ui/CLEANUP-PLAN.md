# Command Center UI - Directory Cleanup Plan
**Created**: 2025-10-21
**Status**: Ready for Implementation

---

## Overview

This phased cleanup plan organizes the Command Center UI from high-level architectural improvements down to low-level file organization. Each phase is independent but builds toward a cleaner, more maintainable codebase.

**Goals**:
- Reduce root directory clutter
- Improve discoverability
- Enforce consistent structure
- Separate concerns (docs, tests, code)
- Remove redundancies

---

## PHASE 1: High-Level Directory Reorganization (Architecture)

### 1.1 Create Top-Level Organizational Directories

**Action**: Establish clear separation of concerns

```bash
command-center-ui/
├── docs/                    # All documentation
├── tests/                   # All test files
├── scripts/                 # Build/deployment scripts
├── app/                     # Next.js app (no change)
├── components/              # React components (no change)
└── lib/                     # Utilities (no change)
```

**Benefits**:
- Clear separation between code, tests, and documentation
- Easier onboarding for new developers
- Follows Next.js community best practices

**Commands**:
```bash
mkdir -p command-center-ui/docs
mkdir -p command-center-ui/tests
mkdir -p command-center-ui/scripts
```

---

### 1.2 Move All Documentation to `docs/`

**Files to Move**:
```
✓ README.md → Keep in root (main entry point)
✓ CLIENT-ORCHESTRATOR-INTEGRATION.md → docs/
✓ FORK-WARNING-SYSTEM.md → docs/
✓ LEAD-DETAIL-ENHANCEMENTS.md → docs/
✓ LEAD-DETAIL-REFACTOR.md → docs/
✓ PHASES-6-8-IMPLEMENTATION.md → docs/
✓ SECURITY.md → docs/
✓ TEST-PROJECT-TABS.md → docs/
✓ UI-AUDIT.md → docs/
```

**New Documentation Structure**:
```
docs/
├── README.md                           # Index of all docs
├── integration/
│   └── client-orchestrator.md          # Integration guides
├── features/
│   ├── fork-warning-system.md
│   ├── lead-detail-enhancements.md
│   └── lead-detail-refactor.md
├── implementation/
│   └── phases-6-8.md                   # Implementation plans
├── testing/
│   └── project-tabs.md                 # Testing guides
├── security/
│   └── security.md                     # Security documentation
└── audits/
    └── ui-audit.md                     # Audit reports
```

**Commands**:
```bash
# Phase 1.2 execution
mv command-center-ui/CLIENT-ORCHESTRATOR-INTEGRATION.md command-center-ui/docs/integration/client-orchestrator.md
mv command-center-ui/FORK-WARNING-SYSTEM.md command-center-ui/docs/features/fork-warning-system.md
mv command-center-ui/LEAD-DETAIL-ENHANCEMENTS.md command-center-ui/docs/features/lead-detail-enhancements.md
mv command-center-ui/LEAD-DETAIL-REFACTOR.md command-center-ui/docs/features/lead-detail-refactor.md
mv command-center-ui/PHASES-6-8-IMPLEMENTATION.md command-center-ui/docs/implementation/phases-6-8.md
mv command-center-ui/SECURITY.md command-center-ui/docs/security/security.md
mv command-center-ui/TEST-PROJECT-TABS.md command-center-ui/docs/testing/project-tabs.md
mv command-center-ui/UI-AUDIT.md command-center-ui/docs/audits/ui-audit.md
```

**Update Root README.md**:
Add a "Documentation" section pointing to `docs/README.md`.

---

### 1.3 Move All Tests to `tests/`

**Files to Move**:
```
✓ test-activity-feed.js → tests/integration/
✓ test-db.js → tests/database/
✓ test-project-prospects.js → tests/integration/
✓ test-prospecting-project.js → tests/integration/
✓ test-ui-comprehensive.js → tests/e2e/
✓ test-ui-manual.js → tests/manual/
```

**New Test Structure**:
```
tests/
├── README.md                           # Testing guide
├── unit/                               # Unit tests (future)
├── integration/
│   ├── test-activity-feed.js
│   ├── test-project-prospects.js
│   └── test-prospecting-project.js
├── e2e/
│   └── test-ui-comprehensive.js
├── database/
│   └── test-db.js
└── manual/
    └── test-ui-manual.js
```

**Commands**:
```bash
# Phase 1.3 execution
mkdir -p command-center-ui/tests/{unit,integration,e2e,database,manual}
mv command-center-ui/test-activity-feed.js command-center-ui/tests/integration/
mv command-center-ui/test-project-prospects.js command-center-ui/tests/integration/
mv command-center-ui/test-prospecting-project.js command-center-ui/tests/integration/
mv command-center-ui/test-ui-comprehensive.js command-center-ui/tests/e2e/
mv command-center-ui/test-db.js command-center-ui/tests/database/
mv command-center-ui/test-ui-manual.js command-center-ui/tests/manual/
```

**Update package.json**:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "node tests/integration/test-activity-feed.js",
    "test:db": "node tests/database/test-db.js",
    "test:e2e": "node tests/e2e/test-ui-comprehensive.js",
    "test:all": "npm run test && npm run test:db && npm run test:e2e"
  }
}
```

---

### 1.4 Clean Up Configuration Files

**Issue**: Duplicate Next.js config files

**Current**:
```
next.config.js      ❌ Old format
next.config.mjs     ✅ Modern ES modules
```

**Action**: Remove `next.config.js` if `next.config.mjs` is fully functional

**Verification Steps**:
1. Check if `next.config.mjs` has all configuration from `next.config.js`
2. Run `npm run build` to verify
3. If successful, delete `next.config.js`

**Commands**:
```bash
# After verification
rm command-center-ui/next.config.js
```

---

## PHASE 2: App Directory Cleanup (Routing)

### 2.1 Remove Duplicate/Legacy Routes

**Issue**: Inconsistent routing structure

**Current Duplicates**:
```
app/outreachemails/          ❌ Legacy route
app/outreach/emails/         ✅ Correct structure

app/outreachsocial/          ❌ Legacy route
app/outreach/social/         ✅ Correct structure

app/leads[id]/               ❌ Malformed directory name
app/leads/[id]/              ✅ Correct dynamic route
```

**Action**: Verify these are unused and remove

**Verification**:
```bash
# Check for references to old routes
grep -r "outreachemails" command-center-ui/components
grep -r "outreachsocial" command-center-ui/components
grep -r "leads\[id\]" command-center-ui/components
```

**Commands** (after verification):
```bash
# Phase 2.1 execution
rm -rf command-center-ui/app/outreachemails
rm -rf command-center-ui/app/outreachsocial
rm -rf command-center-ui/app/leads[id]
```

---

### 2.2 Standardize Route Structure

**Goal**: Ensure all routes follow Next.js conventions

**Expected Structure**:
```
app/
├── page.tsx                             # Dashboard (/)
├── layout.tsx                           # Root layout
├── loading.tsx                          # Global loading
│
├── about/
│   └── page.tsx                        # Static page
│
├── analytics/
│   ├── page.tsx
│   └── loading.tsx
│
├── analysis/
│   ├── page.tsx
│   └── loading.tsx
│
├── leads/
│   ├── page.tsx                        # List view
│   ├── loading.tsx
│   └── [id]/
│       └── page.tsx                    # Detail view
│
├── outreach/
│   ├── page.tsx                        # Overview
│   ├── loading.tsx
│   ├── emails/
│   │   └── page.tsx
│   └── social/
│       └── page.tsx
│
├── projects/
│   ├── page.tsx                        # List view
│   ├── loading.tsx
│   └── [id]/
│       └── page.tsx                    # Detail view
│
├── prospecting/
│   ├── page.tsx
│   └── loading.tsx
│
└── api/
    ├── activity/route.ts
    ├── analysis/
    │   ├── route.ts
    │   └── prompts/route.ts
    ├── analyze/route.ts
    ├── brief/route.ts
    ├── compose/route.ts
    ├── emails/route.ts
    ├── leads/route.ts
    ├── projects/
    │   ├── route.ts
    │   └── [id]/
    │       ├── prospects/route.ts
    │       └── stats/route.ts
    ├── prospecting/
    │   ├── route.ts
    │   └── prompts/
    │       ├── route.ts
    │       └── default/route.ts
    ├── prospects/route.ts
    └── stats/route.ts
```

**Verification**: Run the app and test all routes

---

## PHASE 3: Components Directory Cleanup (Organization)

### 3.1 Audit Root-Level Components

**Current Root Components** (should be categorized):
```
components/
├── prospect-table.tsx        → prospecting/
├── email-composer.tsx        → outreach/
├── stats-overview.tsx        → dashboard/
├── leads-table.tsx           → leads/
├── prospect-form.tsx         → prospecting/
├── analyzer-panel.tsx        → analysis/
├── progress-bar.tsx          → shared/
├── dashboard.tsx             → dashboard/
└── unified-dashboard.tsx     → dashboard/
```

**Action**: Move uncategorized components to proper subdirectories

**Commands**:
```bash
# Phase 3.1 execution
mv command-center-ui/components/prospect-table.tsx command-center-ui/components/prospecting/
mv command-center-ui/components/email-composer.tsx command-center-ui/components/outreach/
mv command-center-ui/components/stats-overview.tsx command-center-ui/components/dashboard/
mv command-center-ui/components/leads-table.tsx command-center-ui/components/leads/
mv command-center-ui/components/prospect-form.tsx command-center-ui/components/prospecting/
mv command-center-ui/components/analyzer-panel.tsx command-center-ui/components/analysis/
mv command-center-ui/components/progress-bar.tsx command-center-ui/components/shared/
mv command-center-ui/components/dashboard.tsx command-center-ui/components/dashboard/
mv command-center-ui/components/unified-dashboard.tsx command-center-ui/components/dashboard/
```

**Update Imports**: After moving, update all import statements

```bash
# Find all files that import moved components
grep -r "from '@/components/prospect-table'" command-center-ui/
# Update to: from '@/components/prospecting/prospect-table'
```

---

### 3.2 Standardize Component Directory Structure

**Target Structure**:
```
components/
├── ui/                      # shadcn/ui primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
│
├── shared/                  # Reusable across features
│   ├── error-boundary.tsx
│   ├── loading-spinner.tsx
│   ├── navbar.tsx
│   ├── project-selector.tsx
│   ├── global-progress-bar.tsx
│   └── floating-task-indicator.tsx
│
├── analysis/                # Analysis feature
│   ├── analysis-config.tsx
│   ├── analysis-progress.tsx
│   ├── analyzer-panel.tsx       # Moved from root
│   ├── model-selector.tsx
│   ├── prompt-editor.tsx
│   └── prospect-selector.tsx
│
├── analytics/               # Analytics feature
│   ├── analytics-stats.tsx
│   ├── cost-tracking-chart.tsx
│   ├── conversion-funnel-chart.tsx
│   └── roi-calculator.tsx
│
├── campaigns/               # Campaigns feature
│   ├── campaign-schedule-dialog.tsx
│   ├── campaign-runs-history.tsx
│   └── scheduled-campaigns-table.tsx
│
├── dashboard/               # Dashboard feature
│   ├── activity-feed.tsx
│   ├── dashboard.tsx            # Moved from root
│   ├── pipeline-health.tsx
│   ├── stats-cards.tsx
│   ├── stats-overview.tsx       # Moved from root
│   └── unified-dashboard.tsx    # Moved from root
│
├── leads/                   # Leads feature
│   ├── business-intel-badges.tsx
│   ├── business-intel-enhanced.tsx
│   ├── crawl-visualization.tsx
│   ├── dimension-radar-chart.tsx
│   ├── formatted-ai-reasoning.tsx
│   ├── grade-badge.tsx
│   ├── lead-detail-modal.tsx
│   ├── lead-details-card.tsx
│   ├── leads-table.tsx          # Moved from root
│   ├── priority-badge.tsx
│   └── reports-section.tsx
│
├── outreach/                # Outreach feature
│   ├── batch-email-composer.tsx
│   ├── email-composer.tsx       # Already here (duplicate in root?)
│   ├── email-detail-modal.tsx
│   ├── email-preview-card.tsx
│   ├── email-strategy-selector.tsx
│   ├── emails-table.tsx
│   ├── social-dm-composer.tsx
│   ├── social-message-detail-modal.tsx
│   ├── social-message-preview.tsx
│   ├── social-messages-table.tsx
│   └── social-platform-selector.tsx
│
├── projects/                # Projects feature
│   ├── create-project-dialog.tsx
│   └── projects-table.tsx
│
└── prospecting/             # Prospecting feature
    ├── enhanced-config-form.tsx
    ├── fork-warning-badge.tsx
    ├── icp-brief-editor.tsx
    ├── model-selector.tsx
    ├── progress-stream.tsx
    ├── prompt-editor.tsx
    ├── prospect-config-form.tsx
    ├── prospect-form.tsx            # Moved from root
    └── prospect-table.tsx           # Moved from root
```

**Check for Duplicates**:
```bash
# Verify email-composer.tsx isn't duplicated
ls -la command-center-ui/components/email-composer.tsx
ls -la command-center-ui/components/outreach/email-composer.tsx
# If both exist, compare and keep only one
```

---

### 3.3 Identify and Remove Duplicate Components

**Action**: Check for component duplication

**Potential Duplicates**:
1. `prospect-table.tsx` (root vs prospecting/)
2. `email-composer.tsx` (root vs outreach/)
3. `model-selector.tsx` (analysis/ vs prospecting/)
4. `prompt-editor.tsx` (analysis/ vs prospecting/)

**Verification**:
```bash
# Compare files
diff command-center-ui/components/prospect-table.tsx command-center-ui/components/prospecting/prospect-table.tsx
diff command-center-ui/components/email-composer.tsx command-center-ui/components/outreach/email-composer.tsx
```

**Decision Tree**:
- If identical → Delete root version, keep categorized version
- If different → Rename appropriately, keep both
- If root is older → Delete root version

---

## PHASE 4: Lib Directory Cleanup (Utilities)

### 4.1 Organize Utility Files by Domain

**Current Structure**:
```
lib/
├── orchestrator.ts          # Business logic orchestration
├── server-utils.ts          # Server-side utilities
├── supabase-server.ts       # Database client
└── utils.ts                 # General utilities
```

**Improved Structure**:
```
lib/
├── api/
│   └── orchestrator.ts      # API orchestration
├── database/
│   └── supabase-server.ts   # Database operations
├── server/
│   └── server-utils.ts      # Server utilities
└── utils/
    ├── client.ts            # Client-side utilities
    ├── validation.ts        # Validation helpers
    └── formatting.ts        # Formatting helpers
```

**Action**: Break down `utils.ts` if it's > 200 lines

**Commands**:
```bash
# Phase 4.1 execution
mkdir -p command-center-ui/lib/{api,database,server,utils}
mv command-center-ui/lib/orchestrator.ts command-center-ui/lib/api/
mv command-center-ui/lib/supabase-server.ts command-center-ui/lib/database/
mv command-center-ui/lib/server-utils.ts command-center-ui/lib/server/
# Analyze utils.ts before moving
```

---

### 4.2 Create Index Files for Cleaner Imports

**Goal**: Enable `import { func } from '@/lib'` instead of deep imports

**Create `lib/index.ts`**:
```typescript
// Database
export * from './database/supabase-server';

// Server utilities
export * from './server/server-utils';

// API orchestration
export * from './api/orchestrator';

// General utilities
export * from './utils';
```

---

## PHASE 5: Environment & Config Cleanup (Settings)

### 5.1 Consolidate Environment Files

**Current**:
```
.env                  ← Production values?
.env.local            ← Development overrides
.env.local.example    ← Template for developers
```

**Action**: Clarify purpose of each file

**Best Practice**:
```
.env.local            ← Developer's actual keys (gitignored)
.env.example          ← Template with dummy values (committed)
```

**Commands**:
```bash
# Verify .env is not committed (should be in .gitignore)
grep "^\.env$" command-center-ui/.gitignore
# If not present, add it
echo ".env" >> command-center-ui/.gitignore
echo ".env.local" >> command-center-ui/.gitignore

# Rename .env.local.example to .env.example for clarity
mv command-center-ui/.env.local.example command-center-ui/.env.example
```

**Update README.md**:
```markdown
## Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual credentials.
```

---

### 5.2 Verify TypeScript Configuration

**Files**:
```
tsconfig.json            ✅ Main config
tsconfig.tsbuildinfo     ← Build artifact (should be gitignored)
```

**Action**: Ensure build artifacts are gitignored

**Commands**:
```bash
grep "tsbuildinfo" command-center-ui/.gitignore
# If missing, add it
echo "*.tsbuildinfo" >> command-center-ui/.gitignore
```

---

## PHASE 6: Low-Level File Cleanup (Polish)

### 6.1 Verify .gitignore Completeness

**Essential Entries**:
```gitignore
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# IDE
.vscode/
.idea/
*.swp
*.swo
```

**Commands**:
```bash
# Verify current .gitignore
cat command-center-ui/.gitignore
# Add missing entries if needed
```

---

### 6.2 Create README Files for Each Directory

**Purpose**: Document each directory's purpose

**Target Directories**:
```
docs/README.md           → Index of documentation
tests/README.md          → Testing guide
components/README.md     → Component architecture guide
lib/README.md            → Utility functions guide
app/api/README.md        → API routes documentation
```

**Example `tests/README.md`**:
```markdown
# Tests

This directory contains all test files for the Command Center UI.

## Structure

- `unit/` - Unit tests for individual functions/components
- `integration/` - Integration tests for feature workflows
- `e2e/` - End-to-end tests for complete user journeys
- `database/` - Database connection and query tests
- `manual/` - Manual testing checklists

## Running Tests

```bash
npm run test        # Run all tests
npm run test:db     # Database tests only
npm run test:e2e    # End-to-end tests only
```
```

---

### 6.3 Add Component Documentation Headers

**Pattern**: Add JSDoc comments to all major components

**Example**:
```typescript
/**
 * ProspectTable
 *
 * Displays a table of generated prospects with filtering and selection.
 * Used in: Prospecting page (/prospecting)
 *
 * @param prospects - Array of prospect objects
 * @param onSelect - Callback when prospects are selected
 * @param projectId - Optional project filter
 */
export function ProspectTable({ prospects, onSelect, projectId }: ProspectTableProps) {
  // ...
}
```

---

## PHASE 7: Post-Cleanup Validation (Testing)

### 7.1 Verify All Imports Resolve

**Action**: Build the project to catch broken imports

**Commands**:
```bash
cd command-center-ui
npm run build
```

**Fix Import Errors**: Update import paths for moved files

**Common Pattern**:
```typescript
// Before
import { ProspectTable } from '@/components/prospect-table'

// After Phase 3.1
import { ProspectTable } from '@/components/prospecting/prospect-table'
```

---

### 7.2 Run All Tests

**Commands**:
```bash
npm run test:all
```

**Verify**:
- All tests pass
- No broken references
- Database connections work

---

### 7.3 Manual Smoke Testing

**Test Each Route**:
1. ✓ Dashboard (/)
2. ✓ Prospecting (/prospecting)
3. ✓ Analysis (/analysis)
4. ✓ Leads (/leads)
5. ✓ Lead Detail (/leads/[id])
6. ✓ Outreach (/outreach)
7. ✓ Outreach Emails (/outreach/emails)
8. ✓ Outreach Social (/outreach/social)
9. ✓ Projects (/projects)
10. ✓ Project Detail (/projects/[id])
11. ✓ Analytics (/analytics)

**Checklist**:
- [ ] All pages load without errors
- [ ] No 404s for assets/components
- [ ] Forms submit correctly
- [ ] Tables render data
- [ ] Modals open and close

---

## PHASE 8: Documentation Updates (Communication)

### 8.1 Update Root README.md

**Add Section**:
```markdown
## Project Structure

```
command-center-ui/
├── app/              # Next.js pages and API routes
├── components/       # React components (organized by feature)
├── lib/              # Utility functions and business logic
├── docs/             # All project documentation
├── tests/            # Test suites (unit, integration, e2e)
└── public/           # Static assets
```

See [ARCHITECTURE.md](docs/architecture.md) for detailed structure.
```

---

### 8.2 Create docs/README.md (Documentation Index)

**Content**:
```markdown
# Command Center UI Documentation

## Getting Started
- [README.md](../README.md) - Main project documentation

## Architecture
- [Architecture Overview](architecture.md) - System design
- [Component Structure](components.md) - Component organization

## Features
- [Fork Warning System](features/fork-warning-system.md)
- [Lead Detail Enhancements](features/lead-detail-enhancements.md)
- [Lead Detail Refactor](features/lead-detail-refactor.md)

## Integration
- [Client Orchestrator Integration](integration/client-orchestrator.md)

## Implementation
- [Phases 6-8 Implementation](implementation/phases-6-8.md)

## Testing
- [Project Tabs Testing](testing/project-tabs.md)
- [Testing Guide](../tests/README.md)

## Security
- [Security Guidelines](security/security.md)

## Audits
- [UI Audit](audits/ui-audit.md)
```

---

### 8.3 Create ARCHITECTURE.md

**Content**: Detailed system architecture diagram and explanations

**Include**:
- Directory structure with explanations
- Data flow diagrams
- Component hierarchy
- API route organization
- State management patterns
- Database schema references

---

### 8.4 Update CLAUDE.md (if exists)

**Add Section**:
```markdown
## Command Center UI Structure

### Directory Organization

After Phase 1-8 cleanup (completed 2025-10-21), the UI follows this structure:

- `app/` - Next.js App Router (pages + API routes)
- `components/` - Feature-organized React components
- `lib/` - Utilities, database clients, orchestration logic
- `docs/` - All documentation (features, integration, security)
- `tests/` - Test suites (unit, integration, e2e, database)

### Running Tests

```bash
cd command-center-ui
npm run test:all      # Run all test suites
npm run test:db       # Database tests only
npm run test:e2e      # End-to-end tests
```

### Important Conventions

1. **Component Organization**: All components are feature-categorized
2. **No Root-Level Test Files**: All tests live in `tests/` subdirectories
3. **Documentation**: Check `docs/README.md` for complete documentation index
```

---

## PHASE 9: Git Commit Strategy (Version Control)

### 9.1 Create Cleanup Branch

**Commands**:
```bash
git checkout -b feature/ui-cleanup-phases-1-8
```

---

### 9.2 Commit Each Phase Separately

**Strategy**: One commit per phase for easy rollback

**Phase 1**:
```bash
git add docs/ tests/
git commit -m "chore(ui): Phase 1 - reorganize docs and tests directories

- Move all .md files to docs/ with categorization
- Move all test-*.js files to tests/ with categorization
- Remove duplicate next.config.js
- Update package.json test scripts"
```

**Phase 2**:
```bash
git add app/
git commit -m "chore(ui): Phase 2 - clean up app directory routing

- Remove legacy outreachemails/ and outreachsocial/ routes
- Remove malformed leads[id]/ directory
- Standardize dynamic route structure"
```

**Phase 3**:
```bash
git add components/
git commit -m "chore(ui): Phase 3 - organize components by feature

- Move root-level components to feature directories
- Remove duplicate components
- Standardize component directory structure"
```

**Phase 4**:
```bash
git add lib/
git commit -m "chore(ui): Phase 4 - organize lib utilities by domain

- Create lib/api, lib/database, lib/server subdirectories
- Add lib/index.ts for cleaner imports
- Break down large utils.ts file"
```

**Phase 5**:
```bash
git add .env.example .gitignore
git commit -m "chore(ui): Phase 5 - consolidate environment and config

- Rename .env.local.example to .env.example
- Update .gitignore for build artifacts
- Add tsconfig.tsbuildinfo to .gitignore"
```

**Phase 6**:
```bash
git add docs/README.md tests/README.md components/README.md
git commit -m "chore(ui): Phase 6 - add directory documentation

- Create README.md for docs/, tests/, components/
- Add JSDoc headers to major components
- Update .gitignore completeness"
```

**Phase 7**:
```bash
# No commit - validation phase
```

**Phase 8**:
```bash
git add README.md docs/ ARCHITECTURE.md
git commit -m "docs(ui): Phase 8 - update project documentation

- Update root README.md with new structure
- Create docs/README.md as documentation index
- Add ARCHITECTURE.md with detailed diagrams
- Update CLAUDE.md with new conventions"
```

---

### 9.3 Create Pull Request

**Title**: `[Cleanup] Command Center UI - Directory Reorganization (Phases 1-8)`

**Description Template**:
```markdown
## Summary
Complete directory reorganization of Command Center UI following 8-phase cleanup plan.

## Changes
- ✅ Phase 1: Reorganized docs and tests into dedicated directories
- ✅ Phase 2: Removed duplicate/legacy routes
- ✅ Phase 3: Organized components by feature
- ✅ Phase 4: Structured lib utilities by domain
- ✅ Phase 5: Consolidated environment files
- ✅ Phase 6: Added directory documentation
- ✅ Phase 7: Validated all imports and tests
- ✅ Phase 8: Updated project documentation

## Testing
- [x] All tests pass (`npm run test:all`)
- [x] Build succeeds (`npm run build`)
- [x] Manual smoke testing of all routes
- [x] No broken imports

## Breaking Changes
- Import paths updated for moved components (see migration guide below)

## Migration Guide
```typescript
// Update imports for moved components:

// OLD
import { ProspectTable } from '@/components/prospect-table'
import { EmailComposer } from '@/components/email-composer'

// NEW
import { ProspectTable } from '@/components/prospecting/prospect-table'
import { EmailComposer } from '@/components/outreach/email-composer'
```

## Documentation
See [CLEANUP-PLAN.md](CLEANUP-PLAN.md) for complete implementation details.
```

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review entire cleanup plan
- [ ] Create backup branch: `git checkout -b backup/pre-cleanup`
- [ ] Verify all tests pass before starting: `npm run test:all`
- [ ] Create feature branch: `git checkout -b feature/ui-cleanup-phases-1-8`

### Phase 1: High-Level Reorganization
- [ ] Create `docs/` directory with subdirectories
- [ ] Move all .md files to `docs/` (keep README.md in root)
- [ ] Create `tests/` directory with subdirectories
- [ ] Move all test-*.js files to `tests/`
- [ ] Update package.json test scripts
- [ ] Remove duplicate next.config.js
- [ ] Commit Phase 1

### Phase 2: App Directory Cleanup
- [ ] Verify outreachemails/ and outreachsocial/ are unused
- [ ] Remove legacy route directories
- [ ] Remove malformed leads[id]/ directory
- [ ] Test all routes load correctly
- [ ] Commit Phase 2

### Phase 3: Components Organization
- [ ] Move root-level components to feature directories
- [ ] Check for and resolve duplicate components
- [ ] Update all import statements
- [ ] Verify no broken imports: `npm run build`
- [ ] Commit Phase 3

### Phase 4: Lib Organization
- [ ] Create lib subdirectories
- [ ] Move files to appropriate subdirectories
- [ ] Create lib/index.ts
- [ ] Update import statements
- [ ] Verify build: `npm run build`
- [ ] Commit Phase 4

### Phase 5: Environment & Config
- [ ] Rename .env.local.example to .env.example
- [ ] Update .gitignore
- [ ] Verify sensitive files are gitignored
- [ ] Update README.md with env setup instructions
- [ ] Commit Phase 5

### Phase 6: Low-Level Polish
- [ ] Verify .gitignore completeness
- [ ] Create README.md for docs/, tests/, components/, lib/
- [ ] Add JSDoc headers to major components
- [ ] Commit Phase 6

### Phase 7: Validation
- [ ] Run `npm run build` - verify success
- [ ] Run `npm run test:all` - verify all pass
- [ ] Manual test all routes
- [ ] Fix any broken imports
- [ ] Re-test after fixes

### Phase 8: Documentation
- [ ] Update root README.md
- [ ] Create docs/README.md
- [ ] Create ARCHITECTURE.md
- [ ] Update CLAUDE.md
- [ ] Commit Phase 8

### Post-Implementation
- [ ] Final full test suite: `npm run test:all`
- [ ] Final build verification: `npm run build`
- [ ] Create pull request
- [ ] Request code review
- [ ] Merge to main

---

## Rollback Plan

If issues arise during cleanup:

### Rollback Single Phase
```bash
# Identify problematic commit
git log --oneline

# Revert specific commit
git revert <commit-hash>
```

### Rollback All Changes
```bash
# Return to backup branch
git checkout backup/pre-cleanup

# Create new branch from backup
git checkout -b feature/ui-cleanup-retry
```

---

## Estimated Timeline

**Phase 1**: 30 minutes
**Phase 2**: 15 minutes
**Phase 3**: 1 hour (many import updates)
**Phase 4**: 30 minutes
**Phase 5**: 15 minutes
**Phase 6**: 45 minutes
**Phase 7**: 30 minutes (validation)
**Phase 8**: 45 minutes (documentation)

**Total**: ~4.5 hours

---

## Success Criteria

- ✅ All tests pass
- ✅ Build completes without errors
- ✅ All routes load correctly
- ✅ No files in root except config/env/docs
- ✅ All components categorized by feature
- ✅ All tests in `tests/` directory
- ✅ All docs in `docs/` directory
- ✅ README files in all major directories
- ✅ Clear documentation index

---

## Maintenance Guidelines

### After Cleanup

1. **New Components**: Always create in feature-specific subdirectory
   ```
   components/{feature}/{component-name}.tsx
   ```

2. **New Tests**: Always create in appropriate test subdirectory
   ```
   tests/{type}/{test-name}.js
   ```

3. **New Documentation**: Always create in docs/ with proper categorization
   ```
   docs/{category}/{doc-name}.md
   ```

4. **New Utilities**: Place in domain-specific lib subdirectory
   ```
   lib/{domain}/{util-name}.ts
   ```

---

## Questions & Considerations

### Q: Should we keep any components in root `components/`?
**A**: Only if they're truly cross-cutting and don't fit any feature. Consider `shared/` instead.

### Q: What about API routes - should they follow same pattern?
**A**: Yes, but app/api structure is already good. Just ensure route.ts naming is consistent.

### Q: Should tests be .js or .ts?
**A**: Gradually migrate to .ts for type safety, but not required for this cleanup.

### Q: How to handle third-party component examples (shadcn/ui)?
**A**: Keep in `components/ui/` - they're infrastructure, not features.

---

## Related Documentation

- [Next.js Project Structure Best Practices](https://nextjs.org/docs/app/building-your-application/routing/colocation)
- [Component Organization Patterns](https://react.dev/learn/thinking-in-react#step-1-break-the-ui-into-a-component-hierarchy)
- [Testing Directory Conventions](https://jestjs.io/docs/configuration#testmatch-arraystring)

---

**End of Cleanup Plan**