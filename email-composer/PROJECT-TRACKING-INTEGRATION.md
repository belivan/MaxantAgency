# Project Tracking Integration - Complete

## Overview

The email composer now supports full project tracking, matching the multi-tenant structure from the website-audit-tool. Emails are now categorized by **project_id**, **campaign_id**, **client_name**, and **source_app**.

## What Changed

### 1. Database Migration

**File:** `supabase-migration-add-projects.sql`

Added 4 new columns to `composed_emails` table:
- `project_id` - Project identifier (e.g., "philly-coffee-2025")
- `campaign_id` - Campaign identifier (e.g., "week-1-outreach")
- `client_name` - Client or company name (e.g., "Maksant")
- `source_app` - Source application (e.g., "email-composer", "command-center")

**Run this migration:**
```sql
-- Go to Supabase Dashboard → SQL Editor
-- Paste contents of supabase-migration-add-projects.sql
-- Run the query
```

### 2. Code Updates

#### `modules/composed-emails-client.js`
- Updated `saveComposedEmail()` to accept project fields
- Updated `getComposedEmails()` to filter by project_id, campaign_id, client_name
- Automatically sets `source_app` to 'email-composer' if not provided

#### `server.js`
- Updated `/api/compose` to pull project fields from lead and save to composed_emails
- Added `GET /api/emails` - Get emails with filters (status, project_id, campaign_id, client_name, limit)
- Added `GET /api/emails/project/:project_id` - Get all emails for a specific project

### 3. Workflow

**Email Composition:**
```
1. Lead is fetched from database (includes project_id, campaign_id, client_name)
2. Email is generated
3. Email is saved to composed_emails WITH project tracking fields
4. Email is synced to Notion
```

**Project Tracking Flow:**
```
Lead (has project_id) → Email Composer → composed_emails (inherits project_id)
```

## New API Endpoints

### GET /api/emails

Get composed emails with optional filters.

**Request:**
```bash
GET /api/emails?project_id=philly-coffee-2025&status=sent&limit=50
```

**Query Parameters:**
- `status` - Filter by status (pending|approved|rejected|sent|failed)
- `project_id` - Filter by project ID
- `campaign_id` - Filter by campaign ID
- `client_name` - Filter by client name
- `limit` - Limit results (default: no limit)

**Response:**
```json
{
  "success": true,
  "count": 15,
  "emails": [
    {
      "id": "uuid",
      "company_name": "Example Inc",
      "email_subject": "Quick win for your homepage",
      "status": "sent",
      "project_id": "philly-coffee-2025",
      "campaign_id": "week-1-outreach",
      "client_name": "Maksant",
      "source_app": "email-composer",
      "quality_score": 95,
      "sent_at": "2025-10-19T03:21:00.317Z"
    }
  ]
}
```

### GET /api/emails/project/:project_id

Get all composed emails for a specific project.

**Request:**
```bash
GET /api/emails/project/philly-coffee-2025?limit=100
```

**Response:**
```json
{
  "success": true,
  "project_id": "philly-coffee-2025",
  "count": 45,
  "emails": [...]
}
```

## Usage Examples

### Filter Emails by Project

```javascript
// Get all emails for a specific project
const response = await fetch('http://localhost:3001/api/emails?project_id=philly-coffee-2025');
const data = await response.json();
console.log(`Found ${data.count} emails for project`);
```

### Filter by Campaign

```javascript
// Get pending emails from a specific campaign
const response = await fetch('http://localhost:3001/api/emails?campaign_id=week-1-outreach&status=pending');
const data = await response.json();
console.log(`${data.count} emails pending review`);
```

### Get Project-Specific Emails

```javascript
// Get all emails for a project using dedicated endpoint
const response = await fetch('http://localhost:3001/api/emails/project/philly-coffee-2025');
const data = await response.json();
console.log(`Project has ${data.count} total emails`);
```

### Compose Email with Project Tracking

```javascript
// Email automatically inherits project_id from lead
const response = await fetch('http://localhost:3001/api/compose', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com', // Lead must exist with project_id
    strategy: 'compliment-sandwich',
    generateVariants: false,
    verify: false
  })
});

const data = await response.json();
// Email now has project_id, campaign_id, client_name from the lead
```

## Project Statistics Queries

You can now query Supabase directly for project analytics:

```sql
-- Get project statistics
SELECT
  project_id,
  campaign_id,
  COUNT(*) as total_emails,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  AVG(quality_score) as avg_quality_score,
  COUNT(CASE WHEN replied THEN 1 END) as reply_count
FROM composed_emails
WHERE project_id IS NOT NULL
GROUP BY project_id, campaign_id
ORDER BY total_emails DESC;

-- Get campaign performance
SELECT
  campaign_id,
  COUNT(*) as emails_sent,
  COUNT(CASE WHEN opened THEN 1 END) as opened_count,
  COUNT(CASE WHEN replied THEN 1 END) as replied_count,
  ROUND(100.0 * COUNT(CASE WHEN opened THEN 1 END) / COUNT(*), 2) as open_rate,
  ROUND(100.0 * COUNT(CASE WHEN replied THEN 1 END) / COUNT(*), 2) as reply_rate
FROM composed_emails
WHERE status = 'sent' AND campaign_id IS NOT NULL
GROUP BY campaign_id
ORDER BY reply_rate DESC;
```

## Integration with Command Center UI

The Command Center UI can now:

1. **Filter emails by project:**
   ```javascript
   GET /api/emails?project_id={projectId}
   ```

2. **Display project-specific dashboards:**
   - Total emails per project
   - Sent/pending/approved breakdown
   - Quality scores by project
   - Reply rates by campaign

3. **Create project-based campaigns:**
   - All emails inherit project_id from leads
   - Track campaign performance
   - Compare different projects

## Migration Checklist

- [ ] Run `supabase-migration-add-projects.sql` in Supabase SQL Editor
- [ ] Verify columns added: `SELECT project_id, campaign_id, client_name, source_app FROM composed_emails LIMIT 1;`
- [ ] Restart email-composer server
- [ ] Test new endpoints:
  - [ ] `GET /api/emails?project_id=test`
  - [ ] `GET /api/emails/project/test`
- [ ] Update Command Center UI to use project filtering

## Benefits

1. **Multi-Tenant Support:** Track emails by client/project
2. **Campaign Analytics:** Measure campaign performance
3. **Project Isolation:** Filter emails by specific projects
4. **Better Reporting:** Project-level statistics and dashboards
5. **Scalability:** Support multiple clients/projects simultaneously

## Notes

- Existing emails will have NULL values for project fields (expected)
- New emails automatically inherit project_id from leads
- If lead doesn't have project_id, email will also have NULL (still works fine)
- source_app defaults to 'email-composer' for all emails generated by this app
