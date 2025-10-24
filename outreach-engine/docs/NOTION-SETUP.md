# Notion Database Setup Guide

Complete guide for setting up your "Cold Email Tracker" Notion database for the Outreach Engine.

---

## 🚀 Quick Start (Recommended)

### Option A: Automated Setup (2 minutes)

The fastest way to set up your Notion database is using the auto-setup script:

```bash
cd outreach-engine

# Preview what will be added (dry run)
node integrations/notion-schema-setup.js

# Actually add the properties
node integrations/notion-schema-setup.js --live
```

**This will automatically create all 30+ properties** including proper types, select options, and formatting.

✅ **Then verify setup:**
```bash
node scripts/check-notion-columns.js
```

---

### Option B: Manual Quick Setup (5 minutes)

If you prefer manual setup or want to start with just the essentials, add these **4 basic properties** in Notion:

1. **Company** - Title (default column, already exists)
2. **Subject** - Text
3. **Body** - Text
4. **Status** - Select (Options: Pending, Ready, Approved, Sent)

**Test it works:**
```bash
node tests/test-notion-sync.js
```

You should see a test entry appear in your Notion database!

---

## 📋 Complete Property Reference

Here are all properties that can be configured (auto-setup adds all of these):

### Core Email Fields
| Property | Type | Purpose |
|----------|------|---------|
| Company | Title | Company name (required by Notion) |
| Subject | Rich Text | Email subject line |
| Body | Rich Text | Email body content |
| Website | URL | Lead's website (clickable) |
| Contact Email | Email | Recipient email address |
| Contact Name | Rich Text | Contact person name |

### Status & Classification
| Property | Type | Options |
|----------|------|---------|
| Status | Select | Pending, Ready, Approved, Sent, Rejected, Failed |
| Type | Select | Email, Social DM |
| Platform | Select | Email, Instagram, Facebook, LinkedIn, Twitter |
| Strategy | Select | Compliment Sandwich, Problem First, Value First, etc. |
| Sent Via | Select | Manual, Automated, Pending |

### Lead Quality Metrics
| Property | Type | Options/Purpose |
|----------|------|------------------|
| Grade | Select | A, B, C, D, F (lead quality) |
| Website Grade | Select | A, B, C, D, F (website quality) |
| Score | Number | Quality score 0-100 |
| Industry | Multi-Select | Restaurant, Legal, Dentistry, Healthcare, etc. |
| Top Issue | Rich Text | Main website problem identified |
| City | Rich Text | Geographic location |

### AI Metadata
| Property | Type | Purpose |
|----------|------|---------|
| AI Model | Select | claude-haiku-4-5, claude-sonnet-4-5 |
| Cost | Number | Generation cost (format: Dollar/Currency) |
| Generation Time (ms) | Number | How long AI took to generate |
| Created At | Date | When email was generated |
| Email ID | Rich Text | Database reference ID |

### A/B Testing Variants (Optional)
| Property | Type | Purpose |
|----------|------|---------|
| Has Variants | Checkbox | Whether variants were generated |
| Subject Variant 1 | Text | First subject alternative |
| Subject Variant 2 | Text | Second subject alternative |
| Subject Variant 3 | Text | Third subject alternative |
| Body Variant 1 | Text | First body alternative |
| Body Variant 2 | Text | Second body alternative |
| Body Variant 3 | Text | Third body alternative |
| AI Recommendation | Text | Which variant combo AI recommends |
| Variant Reasoning | Text | Why AI chose that combo |

### Social DM Specific (Optional)
| Property | Type | Purpose |
|----------|------|---------|
| Character Count | Number | Message length |
| Platform Limit | Number | Platform's character limit |
| Social Profile | URL | Target profile URL |

---

## 🔧 Manual Setup Instructions

If you're setting up manually (not using auto-setup script):

### Step 1: Create the Database
1. Create a new database in Notion
2. Name it "Cold Email Tracker"
3. Get the database ID from the URL (needed for `.env`)

### Step 2: Add Properties
Click the "+" button at the top of the database to add columns:

**Minimum Required (8 properties):**
1. Company (Title) - already exists
2. Subject (Text)
3. Body (Text)
4. Website (URL)
5. Status (Select: Pending, Ready, Approved, Sent)
6. Platform (Select: Email, Instagram, Facebook, LinkedIn)
7. Strategy (Select: Compliment Sandwich, Problem First, Value First)
8. Cost (Number - format as Currency/Dollar)

**For Full Features (add all 30+ properties from table above)**

### Step 3: Configure Select Options

For each Select/Multi-Select property, add the options listed in the tables above.

**Tip:** Use colors to make them easier to scan:
- Status "Approved" → Green
- Status "Sent" → Blue
- Status "Rejected" → Red
- Grade "A" → Green, "B" → Blue, "C" → Yellow, "D" → Orange, "F" → Red

---

## 🔌 Connect to Outreach Engine

### 1. Create Notion Integration
1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Name it "Outreach Engine"
4. Select your workspace
5. Copy the "Internal Integration Token"

### 2. Share Database with Integration
1. Open your "Cold Email Tracker" database
2. Click "..." (top right) → "Add connections"
3. Select "Outreach Engine" integration

### 3. Configure Environment Variables
Add to `outreach-engine/.env`:
```bash
NOTION_API_KEY=secret_xxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxx
```

### 4. Test Connection
```bash
cd outreach-engine
node integrations/notion.js
```

Should output: `✅ Notion connection successful`

---

## 🧪 Testing & Verification

### Check What Properties Exist
```bash
node scripts/check-notion-columns.js
```

### Send a Test Email to Notion
```bash
node tests/test-notion-sync.js
```

### Sync Approved Emails Back
```bash
# Mark an email as "Approved" in Notion, then:
curl -X POST http://localhost:3002/api/sync-from-notion \
  -H "Content-Type: application/json" \
  -d '{"autoSend": false, "dryRun": true}'
```

---

## 🎯 Workflow After Setup

1. **Generate emails** → Outreach Engine creates email
2. **Auto-sync to Notion** → Email appears in database with "Pending" status
3. **Review in Notion** → Change status to "Approved" or "Rejected"
4. **Sync back** → `/api/sync-from-notion` sends approved emails
5. **Status updates** → "Sent" or "Failed" syncs back to Notion

---

## 🛠️ Customizing Properties

Want to add custom properties? Edit `integrations/notion-schema-setup.js`:

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
  }
  // ... existing properties
};
```

**Available property types:**
- `rich_text: {}` - Text
- `number: { format: 'number' }` - Number (or 'dollar', 'percent')
- `select: { options: [...] }` - Single choice dropdown
- `multi_select: { options: [...] }` - Multiple choice tags
- `date: {}` - Date picker
- `url: {}` - URL field
- `email: {}` - Email field
- `checkbox: {}` - Checkbox
- `people: {}` - Notion user selector

---

## 🐛 Troubleshooting

**"Notion connection failed: Unauthorized"**
- Check `NOTION_API_KEY` in `.env`
- Make sure integration has access to the database
- Verify database ID is correct

**"Company is expected to be rich_text"**
- Your "Company" property is set as Title instead of Text
- Either: Change it to Text, OR rename default "Name" column to "Company"

**"No matching properties exist"**
- Properties must match exactly (case-sensitive)
- Run `node scripts/check-notion-columns.js` to see what exists
- Refresh Notion page after adding properties

**"Cannot find module '@notionhq/client'"**
```bash
cd outreach-engine
npm install
```

**Properties already exist**
- That's good! Auto-setup script is idempotent
- Safe to run multiple times
- Only adds missing properties

---

## 📚 Related Documentation

- [API.md](../API.md) - API endpoints for email composition
- [INTEGRATION-GUIDE.md](./INTEGRATION-GUIDE.md) - Command Center integration
- [SUPABASE-UI-GUIDE.md](./SUPABASE-UI-GUIDE.md) - Database UI access

---

**Setup complete?** Start generating emails with `POST /api/compose` or run batch processing!