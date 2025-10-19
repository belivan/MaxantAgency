/**
 * MAKSANT EMAIL SENDER
 *
 * Universal SMTP email sending module (RFC 2822 compliant).
 * Supports Gmail, custom SMTP servers, and any email provider.
 * Also saves .eml files locally as backup/archive.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EMAILS_DIR = path.join(__dirname, '..', 'emails');
const DRAFTS_DIR = path.join(EMAILS_DIR, 'drafts');
const SENT_DIR = path.join(EMAILS_DIR, 'sent');
const FAILED_DIR = path.join(EMAILS_DIR, 'failed');

// Create directories if they don't exist
[EMAILS_DIR, DRAFTS_DIR, SENT_DIR, FAILED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Create SMTP transporter based on provider configuration
 * @param {string|Object} provider - 'gmail', 'gmail-test', or custom SMTP config object
 * @returns {Object} Nodemailer transporter
 */
function createTransporter(provider = 'gmail') {
  // Gmail with App Password
  if (provider === 'gmail' || provider === 'gmail-test') {
    if (!process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD === 'your-app-password-here') {
      throw new Error('GMAIL_APP_PASSWORD not configured in .env file. Get it from https://myaccount.google.com/apppasswords');
    }

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // Custom SMTP server
  if (typeof provider === 'object') {
    const { host, port = 587, secure = false, user, password } = provider;

    if (!host || !user || !password) {
      throw new Error('Custom SMTP config requires: host, user, password');
    }

    return nodemailer.createTransport({
      host,
      port,
      secure, // true for 465, false for other ports (uses STARTTLS)
      auth: { user, pass: password },
    });
  }

  throw new Error(`Unknown email provider: ${provider}. Use 'gmail' or custom SMTP config object.`);
}

/**
 * Validate SMTP configuration
 * @param {string|Object} provider - Email provider config
 * @returns {Promise<boolean>} True if valid
 */
export async function validateSMTPConfig(provider = 'gmail') {
  try {
    console.log(`\n🔍 Validating SMTP configuration...`);
    const transporter = createTransporter(provider);
    await transporter.verify();
    console.log(`   ✅ SMTP configuration is valid!`);
    return true;
  } catch (error) {
    console.error(`   ❌ SMTP configuration invalid:`, error.message);
    throw error;
  }
}

/**
 * Send an email via SMTP and save .eml file locally
 * @param {Object} emailData - Email data from composed_emails table
 * @param {Object} options - Sending options
 * @param {string|Object} options.provider - Email provider ('gmail' or custom SMTP config)
 * @param {boolean} options.actualSend - Whether to actually send via SMTP (default: false for safety)
 * @returns {Promise<Object>} Send result
 */
export async function sendEmail(emailData, options = {}) {
  const { provider = 'gmail', actualSend = false } = options;
  if (!emailData.contact_email) {
    throw new Error(`No contact email for ${emailData.company_name}`);
  }

  console.log(`\n📧 ${actualSend ? 'Sending' : 'Preparing'} email to ${emailData.contact_email}...`);
  console.log(`   Provider: ${typeof provider === 'object' ? 'Custom SMTP' : provider}`);
  console.log(`   Actual send: ${actualSend ? 'YES (will send via SMTP)' : 'NO (will only save .eml file)'}`);

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}_${emailData.company_name.replace(/[^a-zA-Z0-9]/g, '_')}.eml`;
    const fromName = process.env.FROM_NAME || process.env.SENDER_NAME || 'Anton Yanovich';
    const fromEmail = process.env.GMAIL_USER || 'maksantagency@gmail.com';

    // Create email content in RFC 2822 .eml format
    const emailContent = createEmailFile({
      from: `${fromName} <${fromEmail}>`,
      to: emailData.contact_email,
      subject: emailData.email_subject,
      date: new Date().toISOString(),
      body: emailData.email_body,
      html: convertToHTML(emailData.email_body),
    });

    let smtpResult = null;

    // Step 1: Actually send via SMTP if requested
    if (actualSend) {
      try {
        console.log(`   📤 Sending via SMTP...`);
        const transporter = createTransporter(provider);

        const mailOptions = {
          from: `"${fromName}" <${fromEmail}>`,
          to: emailData.contact_email,
          subject: emailData.email_subject,
          text: emailData.email_body,
          html: convertToHTML(emailData.email_body),
        };

        const info = await transporter.sendMail(mailOptions);
        smtpResult = {
          messageId: info.messageId,
          response: info.response,
        };

        console.log(`   ✅ Email sent via SMTP!`);
        console.log(`   Message ID: ${info.messageId}`);
      } catch (smtpError) {
        console.error(`   ❌ SMTP sending failed:`, smtpError.message);
        // Save to failed folder
        const failedPath = path.join(FAILED_DIR, filename);
        fs.writeFileSync(failedPath, emailContent, 'utf8');
        throw new Error(`SMTP sending failed: ${smtpError.message}`);
      }
    }

    // Step 2: Save .eml file as backup/archive (always done)
    const filepath = path.join(SENT_DIR, filename);
    fs.writeFileSync(filepath, emailContent, 'utf8');

    console.log(`   💾 .eml file saved to: ${filepath}`);
    console.log(`   📬 To: ${emailData.contact_email}`);
    console.log(`   📝 Subject: ${emailData.email_subject}`);

    return {
      success: true,
      messageId: smtpResult ? smtpResult.messageId : filename,
      sentTo: emailData.contact_email,
      sentAt: new Date().toISOString(),
      filepath: filepath,
      smtpSent: actualSend,
      smtpResponse: smtpResult ? smtpResult.response : null,
    };

  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    throw error;
  }
}

/**
 * Create .eml file content
 * @param {Object} options - Email options
 * @returns {string} Email file content
 */
function createEmailFile({ from, to, subject, date, body, html }) {
  const boundary = '----=_Part_0_' + Date.now();

  return `From: ${from}
To: ${to}
Subject: ${subject}
Date: ${new Date(date).toUTCString()}
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="${boundary}"

--${boundary}
Content-Type: text/plain; charset=UTF-8

${body}

--${boundary}
Content-Type: text/html; charset=UTF-8

${html}

--${boundary}--
`;
}

/**
 * Convert plain text email to simple HTML
 * @param {string} text - Plain text email body
 * @returns {string} HTML version
 */
function convertToHTML(text) {
  const htmlBody = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('<br>\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;
}

/**
 * Save email to drafts folder
 * @param {Object} emailData - Email data
 * @returns {Promise<Object>} Save result
 */
export async function saveToDrafts(emailData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}_${emailData.company_name.replace(/[^a-zA-Z0-9]/g, '_')}.eml`;
  const filepath = path.join(DRAFTS_DIR, filename);

  const emailContent = createEmailFile({
    from: `${process.env.FROM_NAME || 'Anton Yanovich'} <noreply@maksant.com>`,
    to: emailData.contact_email,
    subject: emailData.email_subject,
    date: new Date().toISOString(),
    body: emailData.email_body,
    html: convertToHTML(emailData.email_body),
  });

  fs.writeFileSync(filepath, emailContent, 'utf8');
  console.log(`   📝 Draft saved to: ${filepath}`);

  return {
    success: true,
    filepath: filepath,
  };
}

/**
 * Get email storage stats
 * @returns {Object} Stats object
 */
export function getEmailStats() {
  const drafts = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.eml'));
  const sent = fs.readdirSync(SENT_DIR).filter(f => f.endsWith('.eml'));
  const failed = fs.readdirSync(FAILED_DIR).filter(f => f.endsWith('.eml'));

  return {
    drafts: drafts.length,
    sent: sent.length,
    failed: failed.length,
    total: drafts.length + sent.length + failed.length,
    directories: {
      drafts: DRAFTS_DIR,
      sent: SENT_DIR,
      failed: FAILED_DIR,
    },
  };
}

/**
 * Send a test email to verify SMTP configuration
 * @param {Object} options - Test options
 * @param {string|Object} options.provider - Email provider config
 * @param {boolean} options.actualSend - Whether to actually send via SMTP (default: false)
 * @returns {Promise<Object>} Test result
 */
export async function sendTestEmail(options = {}) {
  const { provider = 'gmail', actualSend = false } = options;
  const testRecipient = process.env.GMAIL_USER || 'maksantagency@gmail.com';

  console.log(`\n🧪 Sending test email to ${testRecipient}...`);

  const testEmailData = {
    company_name: 'SMTP Test',
    contact_email: testRecipient,
    email_subject: '✅ SMTP Test Email - Maksant Email Composer',
    email_body: `This is a test email from Maksant Email Composer.

If you're reading this, your SMTP configuration is working correctly!

Configuration:
- Provider: ${typeof provider === 'object' ? 'Custom SMTP' : provider}
- Sent at: ${new Date().toISOString()}
- Actual send: ${actualSend ? 'YES (via SMTP)' : 'NO (only .eml file)'}

Next steps:
1. Mark emails as "Approved" in Notion
2. Send emails via POST /api/send-email with actualSend: true

🚀 Generated with Maksant Email Composer`,
  };

  return await sendEmail(testEmailData, { provider, actualSend });
}

/**
 * Test email configuration
 * @param {Object} options - Test options
 * @returns {Promise<boolean>} True if valid
 */
export async function testEmailConfig(options = {}) {
  console.log('✅ Email system configured');
  console.log(`   📁 Drafts: ${DRAFTS_DIR}`);
  console.log(`   📁 Sent: ${SENT_DIR}`);
  console.log(`   📁 Failed: ${FAILED_DIR}`);

  const stats = getEmailStats();
  console.log(`   📊 Stats: ${stats.sent} sent, ${stats.drafts} drafts, ${stats.failed} failed`);

  // Test SMTP connection if provider specified
  if (options.provider) {
    await validateSMTPConfig(options.provider);
  }

  return true;
}

/**
 * Batch send emails with rate limiting
 * @param {Array} emailsData - Array of email data objects
 * @param {Object} options - Sending options
 * @param {string|Object} options.provider - Email provider config
 * @param {boolean} options.actualSend - Whether to actually send via SMTP
 * @param {number} options.delayMs - Delay between emails in milliseconds (default: 1000)
 * @returns {Promise<Object>} Batch sending results
 */
export async function batchSendEmails(emailsData, options = {}) {
  const { provider = 'gmail', actualSend = false, delayMs = 1000 } = options;

  console.log(`\n📬 Batch ${actualSend ? 'sending' : 'preparing'} ${emailsData.length} emails...`);
  console.log(`   Provider: ${typeof provider === 'object' ? 'Custom SMTP' : provider}`);
  console.log(`   Rate limit: 1 email per ${delayMs}ms`);

  const results = {
    sent: [],
    failed: [],
    total: emailsData.length,
  };

  for (let i = 0; i < emailsData.length; i++) {
    const email = emailsData[i];

    try {
      console.log(`\n[${i + 1}/${emailsData.length}] ${email.company_name}...`);

      const result = await sendEmail(email, { provider, actualSend });

      results.sent.push({
        company_name: email.company_name,
        recipient_email: email.contact_email,
        messageId: result.messageId,
        sentAt: result.sentAt,
        smtpSent: result.smtpSent,
      });

      // Rate limiting: wait before sending next email
      if (i < emailsData.length - 1) {
        console.log(`   ⏳ Waiting ${delayMs}ms before next email...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`   ❌ Failed to send to ${email.company_name}:`, error.message);

      results.failed.push({
        company_name: email.company_name,
        recipient_email: email.contact_email,
        error: error.message,
      });
    }
  }

  console.log(`\n📊 Batch complete:`);
  console.log(`   ✅ Sent: ${results.sent.length}`);
  console.log(`   ❌ Failed: ${results.failed.length}`);

  return results;
}

// Placeholder functions for compatibility
export function isAuthorized() {
  return true; // SMTP auth handled per-transporter
}

export function getAuthUrl() {
  return null; // No OAuth flow needed (using App Password)
}

export async function getTokensFromCode(code) {
  return null; // No OAuth tokens needed
}

export async function getUserEmail() {
  return process.env.GMAIL_USER || 'maksantagency@gmail.com';
}
