# Notion Auto-Setup Guide

Automatically create and configure your Notion database for email tracking.

## What This Does

The `notion-schema-setup.js` script will:
- ✅ Connect to your Notion database via API
- ✅ Check what properties currently exist
- ✅ Add any missing properties automatically
- ✅ Configure select/multi-select options with colors
- ✅ Set proper data types (email, url, number, date, etc.)

## Properties That Will Be Added

### Core Email Fields
| Property | Type | Purpose |
|----------|------|---------|
| Company | Title | Company name (required by Notion) |
| Subject | Rich Text | Email subject line |
| Body | Rich Text | Email body content |
| Website | URL | Lead's website (clickable) |
| Contact Email | Email | Recipient email address |
| Contact Name | Rich Text | Contact person name |

### Tracking & Status
| Property | Type | Options |
|----------|------|---------|
| Status | Select | Pending, Ready, Approved, Sent, Rejected, Failed |
| Platform | Select | Email, Instagram, Facebook, LinkedIn |
| Strategy | Select | Compliment Sandwich, Problem First, etc. |

### Lead Quality
| Property | Type | Options |
|----------|------|---------|
| Grade | Select | A, B, C, D, F (lead quality) |
| Website Grade | Select | A, B, C, D, F (website quality) |
| Industry | Multi-Select | Restaurant, Legal, Dentistry, Healthcare, etc. |
| City | Rich Text | Geographic location |
| Top Issue | Rich Text | Main website problem identified |

### Performance Metrics
| Property | Type | Purpose |
|----------|------|---------|
| Score | Number | Quality score 0-100 |
| Cost | Number | Generation cost (formatted as $) |
| Generation Time (ms) | Number | How long AI took to generate |
| AI Model | Select | claude-haiku-3-5 or claude-sonnet-4-5 |

### Metadata
| Property | Type | Purpose |
|----------|------|---------|
| Email ID | Rich Text | Database reference ID |
| Created At | Date | When email was generated |

## Usage

### Step 1: Check What Will Be Added (Dry Run)

```bash
cd outreach-engine
node integrations/notion-schema-setup.js
```

This shows you what properties will be added **without making changes**.

**Example output:**
```
📊 Found 20 missing properties:

   1. Company (title)
   2. Subject (rich_text)
   3. Website (url)
   ...

⚠️  DRY RUN - No changes made
```

### Step 2: Actually Add Properties (Live Mode)

```bash
node integrations/notion-schema-setup.js --live
```

This will **actually modify your Notion database**.

**Example output:**
```
🚀 LIVE MODE - Updating database schema...
🔄 Adding properties to Notion database...
✅ Successfully added 20 properties!
```

### Step 3: Verify in Notion

1. Open your Notion database
2. You should see all 20 columns
3. Select fields will have color-coded options
4. Ready to start syncing emails!

## Customizing Properties

Want to add your own properties? Edit `REQUIRED_PROPERTIES` in the script:

```javascript
const REQUIRED_PROPERTIES = {
  // Add your custom property
  'Follow Up Date': {
    date: {}
  },
  'Priority': {
    select: {
      options: [
        { name: 'High', color: 'red' },
        { name: 'Medium', color: 'yellow' },
        { name: 'Low', color: 'gray' }
      ]
    }
  },
  'Notes': {
    rich_text: {}
  }
  // ... existing properties
};
```

### Available Property Types

```javascript
// Text
'Property Name': { rich_text: {} }

// Number
'Property Name': { number: { format: 'number' } }  // or 'dollar', 'percent'

// Select (single choice)
'Property Name': {
  select: {
    options: [
      { name: 'Option 1', color: 'blue' },
      { name: 'Option 2', color: 'green' }
    ]
  }
}

// Multi-select (multiple choices)
'Property Name': {
  multi_select: {
    options: [
      { name: 'Tag 1', color: 'purple' },
      { name: 'Tag 2', color: 'pink' }
    ]
  }
}

// Date
'Property Name': { date: {} }

// URL
'Property Name': { url: {} }

// Email
'Property Name': { email: {} }

// Checkbox
'Property Name': { checkbox: {} }

// Person (Notion users)
'Property Name': { people: {} }
```

## Syncing Emails to Notion

Once properties are set up, emails will auto-sync when generated:

```javascript
// This happens automatically after email generation
await syncEmailToNotion(email, lead);
```

Or manually via API endpoint:

```bash
POST http://localhost:3002/api/sync-from-notion
```

## Troubleshooting

**"Cannot find module '@notionhq/client'"**
```bash
cd outreach-engine
npm install
```

**"Notion connection failed: Unauthorized"**
- Check `NOTION_API_KEY` in `.env`
- Make sure integration has access to the database
- Verify database ID is correct

**"Properties already exist"**
- That's good! It means your database is set up
- Script is smart enough to only add missing properties
- Safe to run multiple times

**Want to reset?**
1. Manually delete properties in Notion UI
2. Run script again to re-add them

## Advanced: Programmatic Usage

Import and use in your own scripts:

```javascript
import { updateDatabaseSchema, getCurrentSchema } from './integrations/notion-schema-setup.js';

// Check current schema
const properties = await getCurrentSchema();
console.log('Current properties:', Object.keys(properties));

// Add missing properties (dry run)
const dryRun = await updateDatabaseSchema(true);
console.log(`Would add ${dryRun.missing?.length} properties`);

// Add missing properties (live)
const result = await updateDatabaseSchema(false);
console.log(`Added ${result.added} properties`);
```

## What's Next?

After setup:
1. ✅ Properties are added to Notion database
2. ✅ Generate test emails with `node test-with-fake-leads.js`
3. ✅ Check Notion - emails should appear automatically
4. ✅ Approve emails in Notion → sync back with `/api/sync-from-notion`

---

**Need help?** See the main README or check `integrations/notion.js` for sync functions.
