# Project-Aware Deduplication System

## Overview

The prospecting engine now supports **project-scoped deduplication**, allowing you to:
- ✅ Add the same company to different projects
- ✅ Prevent duplicates within the same project
- ✅ Track which prospects belong to which projects
- ✅ Run multiple prospecting campaigns for the same project without creating duplicates

## How It Works

### The Problem (Before)

Previously, the system used a **global deduplication** strategy:
- `google_place_id` was globally unique
- If "Osteria Restaurant" was discovered in **any** project, it would be skipped for all future projects
- Running the same search twice would always skip all previously found prospects

### The Solution (Now)

The system now uses a **many-to-many relationship** via a junction table:

```
┌─────────┐         ┌──────────────────────┐         ┌───────────┐
│Projects │◄───────►│ project_prospects    │◄───────►│ Prospects │
│         │         │ (Junction Table)     │         │           │
└─────────┘         └──────────────────────┘         └───────────┘
```

**Benefits:**
1. One prospect record per company (single source of truth)
2. Same company can be in multiple projects
3. No duplicate searches within the same project
4. Track project-specific data (notes, custom scores, status)

## Usage

### Running Prospecting With a Project

To use project-scoped deduplication, pass a `projectId` in the options:

```javascript
import { runProspectingPipeline } from './orchestrator.js';

const results = await runProspectingPipeline(
  {
    industry: 'Italian Restaurants',
    city: 'Philadelphia',
    // ... other ICP criteria
  },
  {
    maxResults: 20,
    minRating: 4.0,
    projectId: 'abc-123-project-uuid', // 👈 Add this!
    // ... other options
  }
);
```

### Creating a Project First

You'll need to create a project record first (or use an existing one):

```javascript
import { supabase } from './database/supabase-client.js';

// Create a new project
const { data: project, error } = await supabase
  .from('projects')
  .insert({
    name: 'Philadelphia Italian Restaurants Campaign',
    description: 'Q4 2025 outreach campaign',
    status: 'active'
  })
  .select()
  .single();

// Use the project ID
const projectId = project.id;
```

### Deduplication Behavior

#### Scenario 1: Same Search, Same Project
```javascript
// Run 1
await runProspectingPipeline(
  { industry: 'Italian', city: 'Philadelphia' },
  { projectId: 'project-a' }
);
// Result: Finds and saves "Osteria", "Villa di Roma", etc.

// Run 2 (same search, same project)
await runProspectingPipeline(
  { industry: 'Italian', city: 'Philadelphia' },
  { projectId: 'project-a' }
);
// Result: Skips all previously found prospects ✅
```

#### Scenario 2: Different Searches, Same Project
```javascript
// Run 1: Italian restaurants
await runProspectingPipeline(
  { industry: 'Italian', city: 'Philadelphia' },
  { projectId: 'project-a' }
);
// Result: Finds "Osteria", "Villa di Roma"

// Run 2: Pizza restaurants (may overlap with Italian)
await runProspectingPipeline(
  { industry: 'Pizza', city: 'Philadelphia' },
  { projectId: 'project-a' }
);
// Result: Skips "Osteria" if found (already in project-a) ✅
//         Adds new pizza places not yet in project-a
```

#### Scenario 3: Same Search, Different Projects
```javascript
// Project A
await runProspectingPipeline(
  { industry: 'Italian', city: 'Philadelphia' },
  { projectId: 'project-a' }
);
// Result: Finds and saves "Osteria"

// Project B (same search, different project)
await runProspectingPipeline(
  { industry: 'Italian', city: 'Philadelphia' },
  { projectId: 'project-b' }
);
// Result: Links "Osteria" to project-b ✅
//         (reuses existing prospect record, adds to new project)
```

#### Scenario 4: No Project (Backward Compatible)
```javascript
// Without projectId (old behavior)
await runProspectingPipeline(
  { industry: 'Italian', city: 'Philadelphia' },
  { /* no projectId */ }
);
// Result: Uses global deduplication (skips if exists anywhere)
```

## Database Schema

### project_prospects Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Unique link ID |
| project_id | uuid | References projects.id |
| prospect_id | uuid | References prospects.id |
| run_id | text | Which prospecting run added this |
| added_at | timestamptz | When added to project |
| notes | text | Project-specific notes |
| custom_score | integer | Project-specific score (0-100) |
| status | text | active, contacted, qualified, disqualified, archived |

**Unique Constraint:** `(project_id, prospect_id)` - Prevents duplicate prospects in same project

## Querying Prospects by Project

### Get All Prospects for a Project

```javascript
import { getProspectsByProject } from './database/supabase-client.js';

const prospects = await getProspectsByProject('project-a', {
  status: 'active',
  limit: 50
});

console.log(prospects);
// [
//   {
//     id: 'prospect-uuid',
//     company_name: 'Osteria',
//     website: 'https://osteria.com',
//     // ... all prospect fields ...
//     project_link_id: 'link-uuid',
//     project_status: 'active',
//     project_notes: null,
//     added_to_project_at: '2025-10-20T...'
//   }
// ]
```

### Get All Projects for a Prospect

```javascript
const { data: projects } = await supabase
  .from('project_prospects')
  .select('project_id, projects(*)')
  .eq('prospect_id', 'prospect-uuid');
```

## Migration

To enable this feature, run the migration:

```bash
# Using database-tools
cd database-tools
npm run db:setup

# Or manually via Supabase SQL editor
# Run: prospecting-engine/database/migrations/002_add_project_prospects.sql
```

## API Functions

### Core Functions

```javascript
// Check if prospect exists in a specific project
const exists = await prospectExistsInProject(googlePlaceId, projectId);

// Save new prospect OR link existing prospect to project
const prospect = await saveOrLinkProspect(prospectData, projectId, metadata);

// Link existing prospect to a project
await linkProspectToProject(prospectId, projectId, { run_id, notes });

// Get all prospects for a project
const prospects = await getProspectsByProject(projectId, filters);
```

## Best Practices

1. **Always use projectId for organized campaigns**
   - Create a project per campaign
   - Track prospects per project for better organization

2. **Run multiple searches per project**
   - Search "Italian restaurants"
   - Search "Pizza restaurants"
   - Search "Pasta delivery"
   - System will automatically deduplicate within the project

3. **Use project-specific status tracking**
   - Mark prospects as "contacted", "qualified", etc. per project
   - Same prospect can have different status in different projects

4. **Check project stats**
   ```javascript
   const stats = await getProspectStats({ projectId: 'project-a' });
   ```

## Backward Compatibility

The system is **fully backward compatible**:
- Old code without `projectId` still works (uses global deduplication)
- Existing prospects keep working (can be linked to projects later)
- The `project_id` column still exists in prospects table for compatibility

## Example: Multi-City Campaign

```javascript
// Create a project for Q4 restaurant campaign
const { data: project } = await supabase
  .from('projects')
  .insert({ name: 'Q4 Restaurant Outreach' })
  .select()
  .single();

const projectId = project.id;

// Search multiple cities, all under same project
const cities = ['Philadelphia', 'New York', 'Boston'];

for (const city of cities) {
  await runProspectingPipeline(
    { industry: 'Italian Restaurants', city },
    { projectId, maxResults: 50 }
  );
}

// Get all prospects for this project (across all cities)
const allProspects = await getProspectsByProject(projectId);
console.log(`Found ${allProspects.length} unique restaurants across all cities`);
```

## Troubleshooting

### "Prospect already exists in this project"
This is normal - the system is preventing duplicates. The prospect was already added in a previous run.

### Want to re-add a prospect to a project?
Delete the link first:
```javascript
await supabase
  .from('project_prospects')
  .delete()
  .eq('project_id', projectId)
  .eq('prospect_id', prospectId);
```

### Check what's in a project
```javascript
const { data, count } = await supabase
  .from('project_prospects')
  .select('*, prospects(*)', { count: 'exact' })
  .eq('project_id', projectId);

console.log(`Project has ${count} prospects`);
```
