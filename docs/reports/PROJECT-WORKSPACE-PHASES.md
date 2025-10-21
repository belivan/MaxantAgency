# Project Workspace Implementation Phases

## Overview
Breaking down the project-scoped UI into independent work packages. Each phase is self-contained and can be worked on in parallel.

---

## 🎯 Phase 1: Prospects Tab (Project-Scoped Prospecting)
**File:** `command-center-ui/app/projects/[id]/page.tsx` → ProspectsTab component
**Dependencies:** None

### Deliverables:
1. Embed prospecting form in Prospects tab
   - Reuse components from `/prospecting` page
   - Lock project_id to current project (no dropdown needed)
   - ICP brief editor
   - Count/config controls

2. Add prospects table below form
   - Query prospects WHERE project_id = current project
   - Show company_name, industry, city, url, contact info
   - "Analyze" button for each row → adds to analysis queue

3. Real-time updates
   - After generating prospects, refresh table automatically
   - Show progress stream during generation

### API Endpoints Needed:
- `GET /api/prospects?project_id=xxx` (already exists via project_prospects join)
- `POST /api/prospects/generate` with project_id in body

### Components to Reuse:
- `components/prospecting/icp-brief-editor.tsx`
- `components/prospecting/prospect-config-form.tsx`
- `components/prospecting/progress-stream.tsx`
- Create new: `components/prospecting/prospect-table.tsx` (project-filtered)

---

## 🎯 Phase 2: Leads Tab (Project-Scoped Analysis)
**File:** `command-center-ui/app/projects/[id]/page.tsx` → LeadsTab component
**Dependencies:** None (but better after Phase 1 for testing)

### Deliverables:
1. Embed analysis config in Leads tab
   - Prospect selector (filtered to THIS project's prospects)
   - Tier selector (tier1/tier2/tier3)
   - Module toggles (design, seo, content, etc.)
   - "Analyze" button

2. Add leads table below form
   - Query leads WHERE project_id = current project
   - Show company_name, grade, scores, url
   - Click row → open lead detail modal
   - "Compose Email" button for each row

3. Real-time updates
   - Show progress during analysis
   - Update table when analysis completes

### API Endpoints Needed:
- `GET /api/leads?project_id=xxx` (already exists)
- `POST /api/analyze` with project_id in body
- Ensure analysis engine saves project_id to leads table

### Components to Reuse:
- `components/analysis/prospect-selector.tsx` (modify to filter by project)
- `components/analysis/analysis-config.tsx`
- `components/leads/leads-table.tsx` (already has project filtering capability)
- `components/leads/lead-detail-modal.tsx`

---

## 🎯 Phase 3: Outreach Tab (Project-Scoped Email/DM Composition)
**File:** `command-center-ui/app/projects/[id]/page.tsx` → OutreachTab component
**Dependencies:** Phase 2 (needs leads to exist)

### Deliverables:
1. Embed outreach forms in tab
   - Lead selector (filtered to THIS project's leads)
   - Email strategy selector
   - Compose options (variants, tone, etc.)
   - "Compose" button

2. Add sub-tabs for Emails vs Social DMs
   - TabsList: Emails | Social DMs
   - Emails table (filtered by project)
   - Social messages table (filtered by project)

3. Email/DM detail modals
   - Click row → view full email with variants
   - "Send" button (if sending is implemented)

### API Endpoints Needed:
- `GET /api/emails?project_id=xxx`
- `GET /api/social-messages?project_id=xxx`
- `POST /api/compose` with project_id in body
- Ensure outreach engine saves project_id to composed_emails table

### Components to Reuse:
- `components/outreach/email-strategy-selector.tsx`
- `components/outreach/email-composer.tsx`
- `components/outreach/emails-table.tsx`
- `components/outreach/social-messages-table.tsx`
- `components/outreach/email-detail-modal.tsx`

---

## 🎯 Phase 4: Campaigns Tab (Project-Scoped Automation)
**File:** `command-center-ui/app/projects/[id]/page.tsx` → CampaignsTab component
**Dependencies:** None

### Deliverables:
1. Show campaigns for THIS project
   - Query campaigns WHERE project_id = current project
   - Table: name, status, schedule, last_run, next_run
   - Actions: Run Now, Pause, Resume, Delete, View Runs

2. "Schedule Campaign" button
   - Opens campaign config dialog
   - Pre-fills project_id
   - Reuse campaign scheduling form from `/projects` page

3. Campaign runs history
   - Click campaign → show runs
   - Run details: status, results, logs

### API Endpoints Needed:
- `GET /api/campaigns?project_id=xxx`
- `POST /api/campaigns` with project_id in body
- `GET /api/campaigns/[id]/runs`

### Components to Reuse:
- `components/campaigns/scheduled-campaigns-table.tsx`
- `components/campaigns/campaign-schedule-dialog.tsx`
- `components/campaigns/campaign-runs-history.tsx`

---

## 🎯 Phase 5: Global Prospecting Page (Project Selector)
**File:** `command-center-ui/app/prospecting/page.tsx`
**Dependencies:** None

### Deliverables:
1. Add project selector dropdown
   - Position: Top of page, below header
   - Options: "Global (All Projects)" + list of active projects
   - Persist selection in state

2. Update prospect generation
   - When generating, include selected project_id in API call
   - If "Global" selected → project_id = null

3. Update prospect table (if exists on this page)
   - Filter by selected project
   - If "Global" → show all

### API Changes:
- Modify `POST /api/prospects/generate` to accept optional project_id
- Prospecting engine saves to project_prospects table if project_id provided

### New Components:
- `components/shared/project-selector.tsx` (reusable dropdown)

---

## 🎯 Phase 6: Global Analysis Page (Project Selector)
**File:** `command-center-ui/app/analysis/page.tsx`
**Dependencies:** Phase 5 (reuse ProjectSelector component)

### Deliverables:
1. Add project selector dropdown
   - Same as Phase 5
   - Position: Top of page

2. Update prospect selector
   - Filter prospects by selected project
   - If "Global" → show all prospects

3. Update analysis submission
   - Include selected project_id in API call
   - Analysis engine saves project_id to leads table

### API Changes:
- Modify `POST /api/analyze` to accept optional project_id
- Analysis engine saves to leads table with project_id

### Components to Reuse:
- `components/shared/project-selector.tsx` (from Phase 5)

---

## 🎯 Phase 7: Global Leads Page (Project Selector)
**File:** `command-center-ui/app/leads/page.tsx`
**Dependencies:** Phase 5 (reuse ProjectSelector component)

### Deliverables:
1. Add project selector dropdown
   - Same as Phase 5
   - Position: Top of page

2. Update leads table filtering
   - Filter leads by selected project
   - If "Global" → show all leads

3. Update stats cards
   - Show stats for selected project only
   - Grade distribution, etc.

### API Changes:
- Modify `GET /api/leads` to accept optional project_id filter
- Already supports this via query params

### Components to Reuse:
- `components/shared/project-selector.tsx` (from Phase 5)
- `components/leads/leads-table.tsx` (already has filtering)

---

## 🎯 Phase 8: Global Outreach Page (Project Selector)
**File:** `command-center-ui/app/outreach/page.tsx`
**Dependencies:** Phase 5 (reuse ProjectSelector component)

### Deliverables:
1. Add project selector dropdown
   - Same as Phase 5
   - Position: Top of page

2. Update lead selector for composition
   - Filter leads by selected project
   - If "Global" → show all leads

3. Update emails/DMs tables
   - Filter by selected project
   - If "Global" → show all

### API Changes:
- Modify `POST /api/compose` to accept optional project_id
- Outreach engine saves project_id to composed_emails table

### Components to Reuse:
- `components/shared/project-selector.tsx` (from Phase 5)

---

## 📊 Phase Dependencies Graph

```
Phase 1 (Prospects Tab) ──┐
                          ├──> Phase 2 (Leads Tab) ──> Phase 3 (Outreach Tab)
Phase 4 (Campaigns Tab) ──┘

Phase 5 (Global Prospecting) ──┐
                               ├──> Phase 6 (Global Analysis)
                               ├──> Phase 7 (Global Leads)
                               └──> Phase 8 (Global Outreach)
```

**Parallel Work:**
- Agent A: Phases 1-4 (Project tabs)
- Agent B: Phases 5-8 (Global pages)

---

## 🎯 Recommended Order

### Sprint 1: Project Workspace (Most Value)
1. **Phase 1** - Prospects Tab
2. **Phase 2** - Leads Tab
3. **Phase 3** - Outreach Tab
4. **Phase 4** - Campaigns Tab

### Sprint 2: Global Flexibility
5. **Phase 5** - Global Prospecting (creates reusable ProjectSelector)
6. **Phase 6** - Global Analysis
7. **Phase 7** - Global Leads
8. **Phase 8** - Global Outreach

---

## 📝 Acceptance Criteria (Per Phase)

Each phase is complete when:
1. ✅ Forms are embedded and functional
2. ✅ Data tables load and display correctly
3. ✅ Filtering by project_id works
4. ✅ Real-time updates work (for generation/analysis)
5. ✅ API endpoints save project_id correctly
6. ✅ No console errors
7. ✅ Manual testing passes

---

## 🔧 Shared Infrastructure (Build First)

Before starting phases, ensure these exist:

1. **Project Selector Component** (for Phases 5-8)
   - `components/shared/project-selector.tsx`
   - Dropdown with all active projects
   - "Global" option
   - Controlled component with onChange handler

2. **API Endpoint Consistency**
   - All POST endpoints accept optional `project_id`
   - All GET endpoints accept optional `?project_id=xxx` filter
   - All engines save `project_id` to their tables

3. **Database Schema Verification**
   - `prospects` has `project_id` column ✅ (via project_prospects join)
   - `leads` has `project_id` column ✅
   - `composed_emails` has `project_id` column ✅
   - `social_outreach` has `project_id` column (verify)
   - `campaigns` has `project_id` column (verify)

---

## 🚀 Quick Start (For Agent Assignment)

### Agent A: "I want to work on Phase 2 (Leads Tab)"
1. Read this file
2. Check dependencies (Phase 1 not required for testing)
3. Focus on `app/projects/[id]/page.tsx` → `LeadsTab` component
4. Reuse components from `components/leads/` and `components/analysis/`
5. Test by manually creating test leads with `project_id`
6. Mark Phase 2 complete when acceptance criteria met

### Agent B: "I want to work on Phase 5 (Global Prospecting Selector)"
1. Read this file
2. Create `components/shared/project-selector.tsx` first
3. Modify `app/prospecting/page.tsx`
4. Test with multiple projects
5. Mark Phase 5 complete when acceptance criteria met

---

## 📞 Questions?

- **Overlap concerns?** Each phase touches different files/components
- **Can I start Phase X before Phase Y?** Check dependencies graph above
- **Need help?** Reference existing implementations in other pages
- **API not ready?** Mock the data and mark as "blocked - waiting for API"

---

**Last Updated:** 2025-10-20
**Status:** Planning Complete - Ready for Implementation
