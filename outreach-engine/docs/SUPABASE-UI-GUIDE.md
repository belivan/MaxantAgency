# Supabase UI Guide - Your Database Dashboard

## 🚀 Accessing Supabase

**URL:** https://njejsagzeebvsupzffpd.supabase.co

**Login:** Use your Supabase credentials

---

## 📊 Table Editor (Main View)

### How to Open:

1. Go to https://supabase.com/dashboard
2. Click on your project
3. Click **"Table Editor"** in left sidebar
4. You'll see all your tables

### Tables You Have:

- **prospects** - Raw companies from prospecting
- **leads** - Analyzed companies ready for outreach
- **composed_emails** - Generated emails & social DMs

---

## 🔍 Viewing Data

### Open a Table:

Click on any table name (e.g., "leads") to see all rows.

**You'll see:**
```
┌──────────────┬──────────────┬──────────┬───────────┬─────────┐
│ company_name │ url          │ industry │ city      │ grade   │
├──────────────┼──────────────┼──────────┼───────────┼─────────┤
│ Bella Vista  │ bella.com    │ Rest...  │ Philly    │ A       │
│ Smith Law    │ smithlaw.com │ Legal    │ Boston    │ B       │
└──────────────┴──────────────┴──────────┴───────────┴─────────┘
```

### Column Features:

- **Click column header** → Sort ascending/descending
- **Right-click column** → Hide/show columns
- **Drag columns** → Reorder

---

## 🎯 Filtering Data

### Quick Filters:

**Click the filter icon** (funnel) at top of table

**Examples:**

**Filter by Grade:**
```
Column: lead_grade
Operator: equals
Value: A
```
→ Shows only A-grade leads

**Filter by Status:**
```
Column: status
Operator: equals
Value: ready_for_outreach
```
→ Shows leads ready to contact

**Filter by Industry:**
```
Column: industry
Operator: contains
Value: Restaurant
```
→ Shows all restaurant leads

**Multiple Filters:**
- Click "+ Add filter"
- Combine with AND/OR logic
- Example: Grade = A AND Industry = Restaurant

---

## 🔎 Searching Data

### Text Search:

**Search box at top-right** of table

**Searches across all visible columns:**
- Type "Bella" → Finds "Bella Vista Bistro"
- Type "boston" → Finds all Boston leads
- Type "@gmail" → Finds all Gmail contacts

### Advanced Search (SQL):

Click **"SQL Editor"** in sidebar

**Example: Find all A-grade restaurants:**
```sql
SELECT *
FROM leads
WHERE lead_grade = 'A'
  AND industry = 'Restaurant'
ORDER BY overall_score DESC;
```

**Example: Find emails ready to send:**
```sql
SELECT
  email_subject,
  company_name,
  status,
  validation_score
FROM composed_emails
WHERE status = 'approved'
ORDER BY created_at DESC;
```

---

## ✏️ Editing Data

### Edit a Cell:

1. **Double-click** any cell
2. Type new value
3. Press **Enter** to save
4. Changes save automatically ✅

### Edit Multiple Rows:

1. Select rows (click checkbox on left)
2. Right-click → "Edit selected"
3. Change values
4. Apply to all selected rows

### Bulk Update (SQL):

```sql
UPDATE leads
SET status = 'contacted'
WHERE lead_grade IN ('A', 'B')
  AND status = 'ready_for_outreach';
```

---

## 📈 Useful Views to Create

### View 1: Top Quality Leads

**Filter:**
- lead_grade = A OR B
- status = ready_for_outreach

**Sort:** overall_score DESC

**Columns to show:**
- company_name
- contact_email
- lead_grade
- overall_score
- top_issue
- city

---

### View 2: Emails Ready to Send

**Table:** composed_emails

**Filter:**
- status = approved

**Sort:** created_at DESC

**Columns:**
- company_name
- email_subject
- contact_email
- validation_score
- created_at

---

### View 3: Performance Dashboard

**SQL Query:**
```sql
SELECT
  status,
  COUNT(*) as count,
  AVG(validation_score) as avg_score,
  SUM(generation_cost) as total_cost
FROM composed_emails
GROUP BY status;
```

**Shows:**
- How many emails in each status
- Average quality score
- Total AI costs

---

## 🎨 Customizing Your View

### Show/Hide Columns:

1. Click "..." menu at top-right
2. Select "Customize columns"
3. Check/uncheck columns to show/hide

### Recommended Setup for `leads` table:

**Always show:**
- ✅ company_name
- ✅ contact_email
- ✅ lead_grade
- ✅ status
- ✅ overall_score

**Hide by default:**
- ❌ design_score, seo_score, etc. (too detailed)
- ❌ created_at, updated_at (unless needed)
- ❌ Long text fields (analysis_summary)

### Recommended Setup for `composed_emails` table:

**Always show:**
- ✅ company_name
- ✅ email_subject
- ✅ status
- ✅ validation_score
- ✅ has_variants

**Hide:**
- ❌ email_body (too long - click row to see)
- ❌ technical details
- ❌ timestamps

---

## 📤 Exporting Data

### Download as CSV:

1. Apply filters (optional)
2. Click "..." menu
3. Select "Download CSV"
4. Opens in Excel/Google Sheets

**Use cases:**
- Backup your data
- Analyze in Excel
- Import to other tools
- Share with team

---

## 🔧 Advanced Features

### 1. Row Details

**Click any row** → Opens detailed view

**Shows:**
- All columns (including hidden ones)
- Full text content
- Edit individual fields
- View timestamps

### 2. Duplicate Detection

**Find duplicates:**
```sql
SELECT url, COUNT(*) as count
FROM leads
GROUP BY url
HAVING COUNT(*) > 1;
```

### 3. Bulk Operations

**Delete multiple rows:**
1. Select rows (checkboxes)
2. Right-click → Delete
3. Confirm

**⚠️ Warning:** Can't undo! Be careful.

### 4. Real-Time Updates

**Supabase auto-refreshes** when data changes

- Generate email in app → See it appear in Supabase instantly
- Edit in Supabase → App sees changes immediately

---

## 🎯 Common Tasks

### Task 1: Find Leads Ready for Outreach

**Filter:**
```
lead_grade: equals: A
status: equals: ready_for_outreach
contact_email: is not null
```

**Result:** All top-quality leads with email addresses

---

### Task 2: See Today's Generated Emails

**Table:** composed_emails

**SQL:**
```sql
SELECT *
FROM composed_emails
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;
```

---

### Task 3: Check Email Quality Distribution

**SQL:**
```sql
SELECT
  CASE
    WHEN validation_score >= 90 THEN 'Excellent (90-100)'
    WHEN validation_score >= 80 THEN 'Good (80-89)'
    WHEN validation_score >= 70 THEN 'OK (70-79)'
    ELSE 'Poor (<70)'
  END as quality,
  COUNT(*) as count
FROM composed_emails
GROUP BY quality
ORDER BY quality DESC;
```

---

### Task 4: Find Unanswered Leads

**SQL:**
```sql
SELECT
  l.company_name,
  l.contact_email,
  ce.email_subject,
  ce.sent_at
FROM leads l
JOIN composed_emails ce ON ce.lead_id = l.id
WHERE ce.status = 'sent'
  AND ce.sent_at < NOW() - INTERVAL '7 days'
  AND l.status != 'replied'
ORDER BY ce.sent_at ASC;
```

**Shows:** Leads contacted 7+ days ago with no reply yet

---

## 💡 Pro Tips

### Tip 1: Save Frequent Queries

Use Supabase **"SQL Editor"** → Save queries with names

Example names:
- "Top A-Grade Leads"
- "Emails Sent This Week"
- "Performance Dashboard"

### Tip 2: Use Bookmarks

Bookmark filtered views in your browser:
- `https://supabase.com/dashboard/project/YOUR-ID/editor/leads?filter=grade:A`

### Tip 3: Keyboard Shortcuts

- **Ctrl+F** - Search table
- **Ctrl+K** - Quick command menu
- **Arrow keys** - Navigate cells (like Excel)
- **Enter** - Edit cell

### Tip 4: Mobile Access

Supabase works on mobile browsers!
- View data on phone
- Quick edits on the go
- Check stats anywhere

---

## 🆚 Supabase vs Notion

| Feature | Supabase | Notion |
|---------|----------|--------|
| **Speed** | ⚡ Fast (direct DB) | 🐌 Slower (synced) |
| **Filtering** | ✅ Powerful SQL | ✅ UI filters |
| **Search** | ✅ Full-text search | ✅ Text search |
| **Editing** | ✅ Direct | ✅ But needs sync |
| **Export** | ✅ CSV instant | ✅ CSV/PDF |
| **Real-time** | ✅ Instant updates | ⏱️ Synced |
| **UI Beauty** | 😐 Functional | 🎨 Beautiful |
| **Collaboration** | ❌ Single user | ✅ Team-friendly |

**When to use each:**

**Use Supabase for:**
- ✅ Quick data lookup
- ✅ Advanced filtering/search
- ✅ Bulk operations
- ✅ SQL queries
- ✅ Real-time accuracy

**Use Notion for:**
- ✅ Team collaboration
- ✅ Visual review workflow
- ✅ Adding notes/comments
- ✅ Beautiful presentation
- ✅ Sharing with clients

**Best approach:** Use BOTH!
- Supabase = source of truth (fast, accurate)
- Notion = review & collaboration (beautiful, shareable)

---

## 🚨 Safety Tips

### Don't Do This:

❌ Delete entire tables
❌ Drop columns with data
❌ Run UPDATE without WHERE clause
❌ Share admin credentials

### Do This:

✅ Test queries on small datasets first
✅ Use transactions for bulk updates
✅ Export backups before major changes
✅ Use row-level security for team access

---

## ✅ Quick Reference

**View all leads:**
→ Table Editor → leads

**Find A-grade leads:**
→ Filter: lead_grade = A

**Search by company:**
→ Type name in search box

**Edit lead status:**
→ Double-click cell → Change value

**Export to CSV:**
→ "..." menu → Download CSV

**Run custom query:**
→ SQL Editor → Write query → Run

**See email variants:**
→ composed_emails table → Click row → See subject_variants field

---

## 🎯 Next Steps

1. ✅ Login to Supabase dashboard
2. ✅ Open Table Editor
3. ✅ Browse your leads table
4. ✅ Try filtering by grade
5. ✅ Open composed_emails table
6. ✅ See generated emails
7. ✅ Export to CSV
8. ✅ Try a SQL query

**You have full access to all your data in a powerful UI!** 🎉
