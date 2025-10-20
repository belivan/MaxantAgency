# Notion Database Setup Guide

Your Notion database "Cold Email Tracker" needs properties to be created manually.

## Required Properties

Go to your Notion database and add these columns:

### Basic Info
1. **Company** - Title (this should already exist as the default title column)
2. **Subject** - Text
3. **Body** - Text
4. **Website** - URL
5. **Contact Email** - Email
6. **Contact Name** - Text

### Status & Classification
7. **Status** - Select
   - Options: Pending, Ready, Approved, Sent, Rejected, Failed
8. **Type** - Select
   - Options: Email, Social DM
9. **Platform** - Select
   - Options: Email, Instagram, Facebook, LinkedIn, Twitter
10. **Strategy** - Select
    - Options: Compliment Sandwich, Problem First, Value First, etc.

### Quality Metrics
11. **Grade** - Select (A, B, C, D, F)
12. **Website Grade** - Select (A, B, C, D, F)
13. **Score** - Number
14. **Industry** - Multi-select

### AI Metadata
15. **AI Model** - Select (claude-haiku-3-5, claude-sonnet-4-5)
16. **Cost** - Number (format: Currency/Dollar)
17. **Generation Time (ms)** - Number
18. **Created At** - Date

### A/B Testing Variants (Optional)
19. **Has Variants** - Checkbox
20. **Subject Variant 1** - Text
21. **Subject Variant 2** - Text
22. **Subject Variant 3** - Text
23. **Body Variant 1** - Text
24. **Body Variant 2** - Text
25. **Body Variant 3** - Text
26. **AI Recommendation** - Text
27. **Variant Reasoning** - Text

### Additional Fields (Optional)
28. **Top Issue** - Text
29. **City** - Text
30. **Email ID** - Text
31. **Character Count** - Number (for social DMs)
32. **Platform Limit** - Number (for social DMs)
33. **Social Profile** - URL
34. **Sent Via** - Select (Manual, Automated, Pending)

## Quick Setup (Minimum Required)

For a quick start, you only need these 8 properties:
1. Company (Title) - auto-created
2. Subject (Text)
3. Body (Text)
4. Website (URL)
5. Status (Select: Pending, Ready, Approved, Sent)
6. Platform (Select: Email, Instagram, Facebook, LinkedIn)
7. Strategy (Select: Compliment Sandwich, Problem First, Value First)
8. Cost (Number)

## After Setup

Once you've created the properties, run:
```bash
node check-notion-columns.js
```

This will verify all properties exist and show you what's configured.

## Note

The Notion API integration doesn't have permissions to automatically create properties, so this must be done manually in the Notion UI.
