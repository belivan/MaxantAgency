# Notion Database Setup - Complete Checklist

## ✅ Quick Setup (Add These Columns to Your Existing Database)

Open your "Cold Email Tracker" database in Notion, then click the **"+"** button at the end of your columns to add each property below.

### Required Core Columns (if not already present):

- [ ] **Name** (Title) - Rename to "Company"
- [ ] **Status** (Select) → Add options: Pending, Ready, Approved, Sent, Rejected, Failed
- [ ] **Subject** (Text)
- [ ] **Body** (Text)
- [ ] **Contact** (Text)
- [ ] **Email** (Email)

### Essential Tracking Columns:

- [ ] **Type** (Select) → Options: Email, Social DM
- [ ] **Platform** (Select) → Options: Email, Instagram, Facebook, LinkedIn, Twitter
- [ ] **Strategy** (Select) → Options: Problem First, Compliment Sandwich, Value First, etc.
- [ ] **Website** (URL)
- [ ] **Industry** (Multi-select) → Options: Restaurant, Legal, Dentistry, Healthcare, etc.
- [ ] **Quality** (Select) → Options: A, B, C, D, F
- [ ] **Website Grade** (Select) → Options: A, B, C, D, F

### Performance Metrics:

- [ ] **Score** (Number) - Quality score 0-100
- [ ] **Cost** (Number → format as $)
- [ ] **Generation Time (ms)** (Number)
- [ ] **AI Model** (Select) → Options: claude-haiku-4-5, claude-sonnet-4-5

### Contact Info:

- [ ] **Contact Email** (Email)
- [ ] **Contact Name** (Text)
- [ ] **City** (Text)
- [ ] **Top Issue** (Text)

### Timestamps:

- [ ] **Composed** (Date) - Rename "Created At"
- [ ] **Sent Date** (Date)
- [ ] **Response Date** (Date)

### A/B Testing Variants (IMPORTANT!):

- [ ] **Has Variants** (Checkbox)
- [ ] **Subject Variant 1** (Text)
- [ ] **Subject Variant 2** (Text)
- [ ] **Subject Variant 3** (Text)
- [ ] **Body Variant 1** (Text)
- [ ] **Body Variant 2** (Text)
- [ ] **Body Variant 3** (Text)
- [ ] **AI Recommendation** (Text) - Shows which combo AI picked
- [ ] **Variant Reasoning** (Text) - Why AI picked that combo

### Social DM Specific:

- [ ] **Character Count** (Number)
- [ ] **Platform Limit** (Number)
- [ ] **Social Profile** (URL)
- [ ] **Sent Via** (Select) → Options: Manual, Automated, Pending

### Optional but Useful:

- [ ] **Technical Reasoning** (Text)
- [ ] **Business Summary** (Text)
- [ ] **Checklist** (Text)
- [ ] **Follow-up Needed** (Checkbox)
- [ ] **Email ID** (Text) - Database reference

---

## 📊 Total Columns Needed: ~35

**Core:** 6 columns
**Tracking:** 7 columns
**Metrics:** 4 columns
**Contact:** 4 columns
**Timestamps:** 3 columns
**A/B Testing:** 9 columns  ⭐ **This is the key for variants!**
**Social DM:** 4 columns
**Optional:** ~4 columns

---

## 🎨 Recommended Column Order

For best viewing experience, arrange columns in this order:

1. Company (Title)
2. Status (Select)
3. Has Variants (Checkbox) ⭐
4. Subject (Text)
5. Subject Variant 1, 2, 3 (Text) ⭐
6. Body (Text)
7. Body Variant 1, 2, 3 (Text) ⭐
8. AI Recommendation (Text) ⭐
9. Platform (Select)
10. Strategy (Select)
11. Quality (Select)
12. Contact Email (Email)
13. Contact Name (Text)
14. Score (Number)
15. Cost (Number)
16. Composed (Date)
17. Sent Date (Date)

Then hide less-used columns:
- Technical Reasoning
- Business Summary
- Generation Time
- AI Model
- City
- Website Grade
- etc.

---

## 🚀 After Setup

Once you've added all columns:

**Test it:**
```bash
cd outreach-engine
node test-variants.js
```

This will generate an email with 3 subject variants + 2 body variants and automatically push it to your Notion database!

**Check Notion:**
- Open your "Cold Email Tracker" database
- You should see a new row with all variant options filled in
- The "AI Recommendation" column will tell you which combo to use
- Pick your favorite subject + body combo!

---

## 💡 Pro Tips

### View Variants Side-by-Side

Create a "Variants View" in Notion:
1. Click "..." → Add a view → Table
2. Name it "A/B Test View"
3. Show only these columns:
   - Company
   - Has Variants
   - Subject Variant 1, 2, 3
   - Body Variant 1, 2
   - AI Recommendation
4. Filter: Has Variants = Checked

### Quick Approve Workflow

Create an "Approval Queue" view:
1. Add view → Board (grouped by Status)
2. Drag cards from "Pending" → "Approved"
3. Run `POST /api/sync-from-notion` to pull approvals
4. Emails get sent automatically!

### Track Performance

Create "Sent Emails" view:
1. Filter: Status = Sent
2. Sort: Sent Date (newest first)
3. Track which variants got replies

---

## ❌ Common Issues

**"Column not found" error when syncing**
→ Make sure you typed the column name EXACTLY as shown (case-sensitive!)

**Variants not showing up**
→ Make sure you enable variants: `generateVariants: true` in API call

**AI Recommendation is empty**
→ Only appears when generateVariants = true

**Cost showing as huge number**
→ Change Cost column format to "Dollar" (Number settings)

---

## ✅ Verification Checklist

After adding all columns:

- [ ] Run `node test-variants.js`
- [ ] Check Notion database
- [ ] Verify all 3 subject variants appear
- [ ] Verify all body variants appear
- [ ] AI Recommendation shows "Subject X + Body Y"
- [ ] Variant Reasoning explains why
- [ ] Status is set to "Pending"
- [ ] All other fields populated correctly

If all ✅, you're ready to start generating real outreach emails!

---

## 🎯 Next Steps

1. ✅ Finish adding columns to Notion (use checklist above)
2. ✅ Test with `node test-variants.js`
3. ✅ Generate emails for real leads from database
4. ✅ Review & approve in Notion
5. ✅ Send approved emails via SMTP

**Full workflow guide:** See `INTEGRATION-GUIDE.md`
