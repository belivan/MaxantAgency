# Quick Notion Setup - See a Test Entry in 2 Minutes

Your Notion database is empty (no properties/columns). Let's add just the minimum properties to see a test entry!

## Step 1: Add Properties in Notion (2 minutes)

Go to your Notion database "Cold Email Tracker" and add these **4 basic properties**:

1. **Name** - (Already exists as default title) - Keep it as Title type

2. **Company** - Click "+" → Select "Text" → Name it "Company"

3. **Subject** - Click "+" → Select "Text" → Name it "Subject"

4. **Body** - Click "+" → Select "Text" → Name it "Body"

That's it! Just these 4 properties are enough to start.

## Step 2: Run the Test

After adding those 4 properties in Notion, run:

```bash
cd outreach-engine
node test-notion-sync.js
```

You should see:
```
✅ SUCCESS! Email synced to Notion
   Look for: "Test Company - Notion Sync Demo"
```

## Step 3: Check Your Notion Database

Refresh your Notion page - you'll see a new entry:
- **Name:** Test Company - Notion Sync Demo
- **Company:** Test Company - Notion Sync Demo
- **Subject:** 🧪 Test Email from Outreach Engine
- **Body:** This is a test email to verify...

## Optional: Add More Properties Later

Once the basic test works, you can add more properties for richer data:

### Useful Properties:
- **Status** - Select (Options: Ready, Approved, Sent, Rejected)
- **Platform** - Select (Options: Email, Instagram, Facebook, LinkedIn)
- **Strategy** - Select (Options: Compliment Sandwich, Problem First, Value First)
- **Cost** - Number (Currency format)
- **Website** - URL
- **Grade** - Select (Options: A, B, C, D, F)
- **Score** - Number
- **Created At** - Date

See [NOTION-SETUP-GUIDE.md](NOTION-SETUP-GUIDE.md) for the complete list.

## Troubleshooting

**If you get "Company is expected to be rich_text":**
- Your "Company" property is set as Title instead of Text
- Change it to Text, or rename your default "Name" column to "Company"

**If you get "No matching properties exist":**
- Make sure you added the properties in Notion UI
- Property names must match exactly (case-sensitive)
- Refresh Notion page after adding properties

**If the script still says "skipped":**
- Try running: `node check-notion-columns.js` to see what Notion sees
- Make sure you're in the correct database
