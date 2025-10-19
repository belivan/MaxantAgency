# Email Sending via SMTP - Universal Standard (RFC 2822)

## Overview

The email composer now supports **actual SMTP sending** via any email provider while maintaining RFC 2822 compliance. Emails are sent using standard SMTP protocol and also archived as `.eml` files locally.

## What is RFC 2822?

**RFC 2822** is the universal email standard that defines the format of email messages. Think of it as the "language" all email systems speak.

Our system creates emails in **RFC 2822 format** (.eml files), which means:
- ✅ Can be sent via **any** SMTP server (Gmail, Outlook, SendGrid, custom domain, etc.)
- ✅ Can be imported into **any** email client (Outlook, Thunderbird, Apple Mail, etc.)
- ✅ Fully compatible with all email services
- ✅ Standard internet email format

**In short:** Your friend is right! We prepare emails in a standard way that works with ANY email service.

## Two Modes of Operation

### Mode 1: Archive Only (Default - Safe)
```javascript
POST /api/send-email
{
  "email_id": "uuid",
  "actualSend": false  // Default - just creates .eml file
}
```
- Creates RFC 2822 .eml file
- Saved in `emails/sent/` folder
- NO actual SMTP sending
- Safe for testing

### Mode 2: Actually Send via SMTP
```javascript
POST /api/send-email
{
  "email_id": "uuid",
  "actualSend": true  // Actually sends via SMTP!
}
```
- Sends email via SMTP
- ALSO saves .eml file as backup
- Updates database (marks as "sent")
- Real email delivery

## Setup: Gmail SMTP (Recommended)

### Step 1: Get Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Security → 2-Step Verification (enable if not already)
3. App Passwords: https://myaccount.google.com/apppasswords
4. Generate new app password:
   - App: Mail
   - Device: Other (custom name)
   - Name it: "Maksant Email Composer"
5. Copy the 16-character password (like: `abcd efgh ijkl mnop`)

### Step 2: Update .env

```bash
# Gmail account
GMAIL_USER=maksantagency@gmail.com

# Gmail App Password (16 characters from Google)
GMAIL_APP_PASSWORD=abcdefghijklmnop

# Sender name (appears in "From" field)
FROM_NAME=Anton Yanovich
```

### Step 3: Validate SMTP Configuration

```bash
curl -X POST http://localhost:3001/api/validate-smtp \
  -H "Content-Type: application/json" \
  -d '{"provider": "gmail"}'
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "message": "SMTP configuration is valid!"
}
```

### Step 4: Send Test Email

```bash
# Test without actually sending (just creates .eml file)
curl -X POST http://localhost:3001/api/send-test-email \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gmail",
    "actualSend": false
  }'

# Actually send test email via SMTP
curl -X POST http://localhost:3001/api/send-test-email \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gmail",
    "actualSend": true
  }'
```

## Using Custom SMTP Server (Any Email Provider)

You can use **any SMTP server** - your own domain, SendGrid, Mailgun, etc.

### Example: Custom Domain SMTP

```bash
curl -X POST http://localhost:3001/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email_id": "your-email-id",
    "provider": {
      "host": "smtp.yourdomain.com",
      "port": 587,
      "secure": false,
      "user": "noreply@yourdomain.com",
      "password": "your-smtp-password"
    },
    "actualSend": true
  }'
```

### Example: SendGrid SMTP

```bash
curl -X POST http://localhost:3001/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email_id": "your-email-id",
    "provider": {
      "host": "smtp.sendgrid.net",
      "port": 587,
      "secure": false,
      "user": "apikey",
      "password": "your-sendgrid-api-key"
    },
    "actualSend": true
  }'
```

## API Endpoints

### POST /api/send-test-email

Send a test email to verify SMTP configuration.

**Request:**
```json
{
  "provider": "gmail",      // or custom SMTP config object
  "actualSend": false       // true to actually send via SMTP
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test email sent via SMTP!",
  "result": {
    "messageId": "<unique-message-id>",
    "sentTo": "maksantagency@gmail.com",
    "sentAt": "2025-10-19T12:00:00.000Z",
    "smtpSent": true,
    "smtpResponse": "250 Message accepted"
  }
}
```

### POST /api/validate-smtp

Validate SMTP configuration without sending email.

**Request:**
```json
{
  "provider": "gmail"       // or custom SMTP config
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "message": "SMTP configuration is valid!"
}
```

### POST /api/send-email

Send a composed email via SMTP.

**Request (using email_id from database):**
```json
{
  "email_id": "uuid-from-composed-emails-table",
  "provider": "gmail",      // optional, default: "gmail"
  "actualSend": true        // optional, default: false for safety
}
```

**Request (using custom email data):**
```json
{
  "email_data": {
    "company_name": "Example Inc",
    "contact_email": "contact@example.com",
    "email_subject": "Quick win for your website",
    "email_body": "Hi,\n\nI noticed..."
  },
  "provider": "gmail",
  "actualSend": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent via SMTP!",
  "result": {
    "messageId": "<smtp-message-id>",
    "sentTo": "contact@example.com",
    "sentAt": "2025-10-19T12:00:00.000Z",
    "filepath": "c:\\...\\emails\\sent\\2025-10-19_Example_Inc.eml",
    "smtpSent": true,
    "smtpResponse": "250 Message accepted"
  }
}
```

### POST /api/send-batch

Batch send multiple approved emails via SMTP with rate limiting.

**Request:**
```json
{
  "email_ids": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ],
  "provider": "gmail",      // optional
  "actualSend": true,       // optional, default: false
  "delayMs": 1000          // optional, delay between emails (default: 1000ms)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch complete: 3 sent, 0 failed",
  "results": {
    "total": 3,
    "sent": [
      {
        "company_name": "Example Inc",
        "recipient_email": "contact@example.com",
        "messageId": "<id-1>",
        "sentAt": "2025-10-19T12:00:00.000Z",
        "smtpSent": true
      },
      ...
    ],
    "failed": []
  }
}
```

## Usage Examples

### Example 1: Test SMTP Configuration (Dry Run)

```bash
# Step 1: Validate SMTP config
curl -X POST http://localhost:3001/api/validate-smtp \
  -H "Content-Type: application/json" \
  -d '{"provider": "gmail"}'

# Step 2: Send test email (just .eml file, no SMTP)
curl -X POST http://localhost:3001/api/send-test-email \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gmail",
    "actualSend": false
  }'

# Step 3: Check .eml file was created
dir "c:\Users\anton\Desktop\MaxantAgency\email-composer\emails\sent" /O-D
```

### Example 2: Actually Send Test Email via SMTP

```bash
curl -X POST http://localhost:3001/api/send-test-email \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gmail",
    "actualSend": true
  }'
```

Check your Gmail inbox for the test email!

### Example 3: Send Single Approved Email

```bash
# Get approved emails
curl http://localhost:3001/api/emails?status=approved&limit=1

# Copy the "id" from response, then send:
curl -X POST http://localhost:3001/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email_id": "your-email-uuid-here",
    "actualSend": true
  }'
```

### Example 4: Batch Send All Approved Emails

```javascript
// 1. Get all approved emails
const approvedEmails = await fetch('http://localhost:3001/api/emails?status=approved')
  .then(r => r.json());

// 2. Extract email IDs
const emailIds = approvedEmails.emails.map(e => e.id);

// 3. Batch send with rate limiting
const result = await fetch('http://localhost:3001/api/send-batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email_ids: emailIds,
    actualSend: true,
    delayMs: 2000  // 2 seconds between emails (Gmail limit: ~30/min)
  })
}).then(r => r.json());

console.log(`Sent: ${result.results.sent.length}, Failed: ${result.results.failed.length}`);
```

### Example 5: Use Custom SMTP Server

```bash
curl -X POST http://localhost:3001/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email_id": "your-email-uuid",
    "provider": {
      "host": "mail.privateemail.com",
      "port": 587,
      "secure": false,
      "user": "noreply@maksant.com",
      "password": "your-email-password"
    },
    "actualSend": true
  }'
```

## Safety Features

### 1. Default to Safe Mode
- `actualSend` defaults to `false`
- Prevents accidental sending
- Always creates .eml backup first

### 2. Rate Limiting
- Batch sending has configurable delay
- Default: 1000ms between emails
- Prevents SMTP rate limit violations
- Gmail free limit: ~30 emails/minute

### 3. Error Handling
- Failed emails saved to `emails/failed/` folder
- Database not updated on failure
- Detailed error messages
- Retry-friendly

### 4. Database Tracking
- Only updates status to "sent" if SMTP succeeds
- Tracks `sent_at` timestamp
- Keeps history of all sends

## Email File Structure

All emails are archived as RFC 2822 .eml files:

```
emails/
├── sent/           # Successfully sent emails (.eml files)
├── drafts/         # Draft emails (not sent yet)
└── failed/         # Failed sending attempts
```

**File naming convention:**
```
2025-10-19T12-00-00-123Z_Company_Name.eml
```

**Can be opened in:**
- Outlook
- Thunderbird
- Apple Mail
- Gmail (drag & drop)
- Any email client

## Gmail Rate Limits

**Free Gmail account:**
- 500 emails/day
- ~30 emails/minute (rate limit)

**Google Workspace (paid):**
- 2000 emails/day
- ~30 emails/minute (rate limit)

**Recommendation:**
- Use `delayMs: 2000` (2 seconds) for batch sending
- ~30 emails/minute = safe rate
- Monitor bounce rate

## Troubleshooting

### Error: "GMAIL_APP_PASSWORD not configured"

**Solution:**
1. Get App Password from https://myaccount.google.com/apppasswords
2. Update `.env`:
   ```
   GMAIL_APP_PASSWORD=your-16-char-password-here
   ```
3. Restart server

### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Causes:**
1. Wrong App Password
2. 2-Step Verification not enabled
3. Using regular Gmail password instead of App Password

**Solution:**
1. Enable 2-Step Verification
2. Generate new App Password
3. Use the 16-character App Password (no spaces)

### Error: "Connection timeout"

**Causes:**
1. Firewall blocking port 587
2. Network issues
3. Wrong SMTP host

**Solution:**
1. Check firewall allows outbound port 587
2. Try port 465 with `secure: true`
3. Verify SMTP host is correct

### Error: "Daily sending quota exceeded"

**Cause:**
Gmail daily limit reached (500 emails for free accounts)

**Solution:**
1. Wait until next day
2. Upgrade to Google Workspace
3. Use alternative SMTP provider (SendGrid, Mailgun)

## Integration with Notion Workflow

The auto-send workflow now supports SMTP:

1. Compose email → Status: "Pending"
2. Review in Notion → Mark as "Approved"
3. Notion sync updates Supabase
4. Call `/api/send-batch` with approved email IDs
5. Emails sent via SMTP
6. Database updated to "Sent"
7. Notion synced back

**Fully automated pipeline!**

## Summary

✅ **RFC 2822 Compliant** - Standard email format
✅ **Universal** - Works with ANY SMTP provider
✅ **Gmail Support** - Easy setup with App Password
✅ **Custom SMTP** - Use your own domain/server
✅ **Safe by Default** - `actualSend: false` prevents accidents
✅ **Rate Limited** - Batch sending with delays
✅ **Archived** - All emails saved as .eml files
✅ **Tracked** - Database updates on successful send
✅ **Error Handling** - Failed sends saved separately

**Your friend was absolutely right!** We now prepare emails in the standard RFC 2822 format and can send them via any SMTP service. Perfect for hooking up to Gmail, custom domains, or any email provider!
