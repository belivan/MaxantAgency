# Command Center UI - Database VIEW Compatibility Guide

## Overview
The Command Center UI will work seamlessly with the new database VIEW structure. The VIEW provides backward compatibility by aliasing fields and pulling in contact/location data from the prospects table.

## What Happens When You Click on a Lead

When clicking on a lead in the UI, the following sequence occurs:

1. **LeadsTable Component** (`components/leads/leads-table.tsx`)
   - User clicks on a lead row
   - Triggers `onLeadClick(lead)` handler
   - Passes the full lead object to parent

2. **LeadsPage Component** (`app/leads/page.tsx`)
   - Receives lead click event
   - Sets `selectedLead` state
   - Opens `LeadDetailModal` with the lead data

3. **LeadDetailModal Component** (`components/leads/lead-detail-modal.tsx`)
   - Displays comprehensive lead information in tabs:
     - **Overview**: Analysis scores, summary, website details
     - **AI Scoring**: Lead priority, budget likelihood, fit scores
     - **Design Issues**: List of design problems
     - **SEO Issues**: SEO optimization problems
     - **Quick Wins**: Easy improvements
     - **Social**: Social media profiles
   - Shows contact information (email, phone, location) if available
   - Provides actions: View Website, Compose Email

## Key Field Mappings

The VIEW ensures compatibility by providing these critical field mappings:

| UI Expects | Database Has | VIEW Provides |
|------------|--------------|---------------|
| `grade` | `website_grade` | Both `grade` (alias) and `website_grade` |
| `contact_email` | Empty in leads | Pulled from prospects table via JOIN |
| `contact_phone` | Empty in leads | Pulled from prospects table via JOIN |
| `contact_name` | Empty in leads | Pulled from prospects table via JOIN |
| `city` | Empty in leads | Pulled from prospects table via JOIN |
| `state` | Empty in leads | Pulled from prospects table via JOIN |

## UI Components That Reference Grade

1. **GradeBadge Component** - Uses `lead.grade`
2. **LeadDetailModal** - Uses `lead.grade` (line 71)
3. **LeadsTable** - Filters by `website_grade`
4. **API Filters** - Filter by grade in queries

## Minor Update Needed

One function needs updating to use the correct field name:

### File: `command-center-ui/lib/api/supabase.ts`

```typescript
// Line 48 - Update from:
.eq('grade', grade)

// To:
.eq('website_grade', grade)
```

## Benefits of the VIEW Approach

1. **No Breaking Changes**: UI continues working without major modifications
2. **Enhanced Data**: Contact info now populated from prospects
3. **Cleaner Database**: Removes redundant fields from leads_core
4. **Performance**: VIEW uses indexed columns for fast queries
5. **Flexibility**: Can update VIEW definition without changing UI code

## Testing After SQL Execution

After running the SQL script, verify:

1. **Leads Table View**: All leads display correctly
2. **Lead Details Modal**: Contact info shows from prospects
3. **Filters**: Grade filtering still works
4. **Sorting**: All sort options function
5. **Bulk Operations**: Email composition with selected leads

## Rollback Plan

If issues occur, the SQL script includes rollback instructions:

```sql
-- Rollback if needed
DROP VIEW IF EXISTS leads;
ALTER TABLE leads_core RENAME TO leads;
```

Or restore from backup:
```sql
DROP TABLE IF EXISTS leads;
ALTER TABLE leads_backup_before_cleanup RENAME TO leads;
```

## Summary

The UI is **largely compatible** with the new VIEW structure. The VIEW provides both `grade` and `website_grade` fields, ensuring existing code continues to work. Contact and location data will now be automatically populated from the prospects table, making the UI more useful without any code changes.

Only one minor update is needed in the Supabase API file to ensure the grade filter works correctly.