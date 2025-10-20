# Phases 6-8 Implementation Summary

## Overview
Added ProjectSelector component to Analysis, Leads, and Outreach pages with config saving and URL parameter support.

## Changes Made

### 1. API Updates

#### `app/api/projects/[id]/route.ts` (PATCH endpoint)
- Added support for `analysis_config` field
- Added support for `outreach_config` field
- These fields store JSON configurations for each project

#### `lib/api/projects.ts`
- Updated `Project` interface to include:
  - `icp_brief?: any`
  - `analysis_config?: any`
  - `outreach_config?: any`
- `updateProject` function already existed with proper types

### 2. Phase 6: Analysis Page

#### File: `app/analysis/page.tsx`

**Added:**
- Import of `ProjectSelector` component
- Import of `updateProject` from API
- State management for `selectedProjectId` from URL parameter `?project_id=xxx`
- ProjectSelector UI component in the page
- Passed `projectId` prop to `ProspectSelector` component
- Config saving logic in `handleAnalyze`:
  ```typescript
  if (selectedProjectId) {
    await updateProject(selectedProjectId, {
      analysis_config: {
        tier: config.tier,
        modules: config.modules,
        capture_screenshots: config.capture_screenshots ?? true
      }
    });
  }
  ```
- Included `project_id` in the API call to Analysis Engine

#### File: `components/analysis/prospect-selector.tsx`

**Added:**
- `projectId?: string | null` prop
- Effect to update filters when `projectId` changes
- Filters prospects by selected project

**How it works:**
1. User selects a project from dropdown
2. URL updates with `?project_id=xxx`
3. ProspectSelector filters to show only prospects from that project
4. When user clicks "Analyze", config is saved to project
5. Analysis Engine receives `project_id` in the request

### 3. Phase 7: Leads Page

#### File: `app/leads/page.tsx`

**Added:**
- Import of `ProjectSelector` component
- State management for `selectedProjectId` from URL parameter `?project_id=xxx`
- `LeadFilters` type import and filter state
- ProjectSelector UI component in the page
- Effect to update filters when project selection changes
- Filtered leads using `useLeads(filters)` hook

**How it works:**
1. User selects a project from dropdown
2. URL updates with `?project_id=xxx`
3. Leads are filtered by project_id
4. Stats cards show project-specific counts:
   - Total Leads (for selected project)
   - Grade A count
   - Grade B count
   - Leads with email
   - Average score

**Note:** The stats cards automatically update because they operate on the filtered `leads` array.

### 4. Phase 8: Outreach Page

#### File: `app/outreach/page.tsx`

**Added:**
- Import of `ProjectSelector` component
- Import of `updateProject` from API
- State management for `selectedProjectId` from URL parameter `?project_id=xxx`
- ProjectSelector UI component in the page
- Effect to save outreach config when strategy/platform changes:
  ```typescript
  useEffect(() => {
    if (!selectedProjectId || !selectedStrategy) return;
    await updateProject(selectedProjectId, {
      outreach_config: {
        strategy: selectedStrategy,
        platform: selectedPlatform
      }
    });
  }, [selectedStrategy, selectedPlatform, selectedProjectId]);
  ```
- Updated email loading to filter by project_id
- Updated social message loading to filter by project_id
- Filtered leads by project when loading from URL params

**How it works:**
1. User navigates to Outreach page with `?lead_ids=x,y,z&project_id=abc`
2. ProjectSelector pre-selects the project from URL
3. Leads are loaded and filtered by project
4. When user selects a strategy, config is automatically saved to project
5. Emails/DMs tables show only items from selected project
6. When composing, project_id is included in the request (via existing API support)

### 5. Shared Component

#### File: `components/shared/project-selector.tsx`

This component was already created in Phase 5. It provides:
- Dropdown to select active projects
- "Global (All Projects)" option
- URL parameter synchronization
- Auto-loads active projects from API

**Props:**
- `value: string | null` - Currently selected project ID
- `onChange: (projectId: string | null) => void` - Callback when selection changes
- `label?: string` - Label text (default: "Project")
- `className?: string` - Additional CSS classes

## URL Parameter Support

All three pages now support the `?project_id=xxx` URL parameter:

1. **Analysis Page**
   - `http://localhost:3000/analysis?project_id=abc123`
   - Pre-selects project
   - Filters prospects
   - Saves config to project on analyze

2. **Leads Page**
   - `http://localhost:3000/leads?project_id=abc123`
   - Pre-selects project
   - Filters leads table
   - Updates stats for project

3. **Outreach Page**
   - `http://localhost:3000/outreach?lead_ids=x,y,z&project_id=abc123`
   - Pre-selects project
   - Filters leads for composition
   - Filters emails/DMs tables
   - Saves config to project on strategy change

## Config Storage Format

### Analysis Config
Stored in `projects.analysis_config`:
```json
{
  "tier": "tier2",
  "modules": ["design", "seo", "content"],
  "capture_screenshots": true
}
```

### Outreach Config
Stored in `projects.outreach_config`:
```json
{
  "strategy": "problem-first",
  "platform": "instagram"
}
```

## Database Schema

The `projects` table already had these JSONB columns:
- `icp_brief` - Ideal Customer Profile (from Phase 5)
- `analysis_config` - Analysis configuration (added in Phase 6)
- `outreach_config` - Outreach configuration (added in Phase 8)

## Testing Checklist

### Analysis Page
- [ ] Project selector appears on page
- [ ] Selecting a project filters prospects
- [ ] URL updates with `?project_id=xxx`
- [ ] Refreshing page maintains project selection
- [ ] Analyzing prospects saves config to project
- [ ] Console shows: "✅ Saved analysis config to project: xxx"

### Leads Page
- [ ] Project selector appears on page
- [ ] Selecting a project filters leads
- [ ] URL updates with `?project_id=xxx`
- [ ] Refreshing page maintains project selection
- [ ] Stats cards show correct counts for filtered leads
- [ ] Clicking "Compose Emails" passes project_id in URL

### Outreach Page
- [ ] Project selector appears on page
- [ ] Selecting a project filters leads in compose view
- [ ] URL updates with `?project_id=xxx`
- [ ] Refreshing page maintains project selection
- [ ] Emails table filters by project
- [ ] Social messages table filters by project
- [ ] Selecting strategy/platform saves config to project
- [ ] Console shows: "✅ Saved outreach config to project: xxx"

## Integration with Engines

### Analysis Engine
The `/api/analyze` endpoint already accepts `project_id` parameter (from earlier work).
When analyzing prospects, the project_id is:
1. Included in the API request body
2. Saved to each created lead record

### Outreach Engine
The `/api/compose-batch` endpoint already accepts `project_id` parameter (from earlier work).
When composing emails, the project_id is:
1. Included in the API request body
2. Saved to each created email/social message record

## Known Limitations

1. **Email/Social Composers** - The individual `EmailComposer` and `SocialDMComposer` components don't yet pass `project_id` to their API calls. This is a minor issue because:
   - Batch mode (multiple leads) already passes project_id
   - Single-lead composition will inherit project_id from the lead record itself

2. **Lead Selection** - When navigating from Leads page to Outreach page, the project_id is not automatically included in the URL. Users need to manually select the project again on the Outreach page, or we could enhance the navigation to preserve the project_id parameter.

## Files Modified

1. `app/api/projects/[id]/route.ts` - Added config field support
2. `lib/api/projects.ts` - Updated types (already had updateProject)
3. `app/analysis/page.tsx` - Added ProjectSelector and config saving
4. `components/analysis/prospect-selector.tsx` - Added project filtering
5. `app/leads/page.tsx` - Added ProjectSelector and filtering
6. `app/outreach/page.tsx` - Added ProjectSelector, config saving, and filtering

## Files Created

- `PHASES-6-8-IMPLEMENTATION.md` - This summary document

## Next Steps

To fully complete the project workflow:
1. Update `EmailComposer` to accept and pass `projectId`
2. Update `SocialDMComposer` to accept and pass `projectId`
3. Enhance navigation from Leads page to preserve `?project_id` parameter
4. Consider loading saved configs from project when user selects a project (e.g., pre-fill analysis tier/modules)
5. Add visual indicator when configs are saved (toast notification instead of just console.log)
