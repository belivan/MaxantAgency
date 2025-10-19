/**
 * MAKSANT EMAIL COMPOSER - Local Email Storage
 *
 * Saves approved emails to local folders instead of sending via Gmail.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
 * Send an email (save to local sent folder)
 * @param {Object} emailData - Email data from composed_emails table
 * @returns {Promise<Object>} Send result
 */
export async function sendEmail(emailData) {
  if (!emailData.contact_email) {
    throw new Error(`No contact email for ${emailData.company_name}`);
  }

  console.log(`\n📧 Saving email for ${emailData.contact_email}...`);

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}_${emailData.company_name.replace(/[^a-zA-Z0-9]/g, '_')}.eml`;
    const filepath = path.join(SENT_DIR, filename);

    // Create email content in .eml format
    const emailContent = createEmailFile({
      from: `${process.env.FROM_NAME || 'Anton Yanovich'} <${process.env.GMAIL_USER || 'noreply@maksant.com'}>`,
      to: emailData.contact_email,
      subject: emailData.email_subject,
      date: new Date().toISOString(),
      body: emailData.email_body,
      html: convertToHTML(emailData.email_body),
    });

    // Save to file
    fs.writeFileSync(filepath, emailContent, 'utf8');

    console.log(`   ✅ Email saved to: ${filepath}`);
    console.log(`   📬 To: ${emailData.contact_email}`);
    console.log(`   📝 Subject: ${emailData.email_subject}`);

    return {
      success: true,
      messageId: filename,
      sentTo: emailData.contact_email,
      sentAt: new Date().toISOString(),
      filepath: filepath,
    };

  } catch (error) {
    console.error(`   ❌ Error saving email:`, error.message);
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
 * Test email configuration
 * @returns {Promise<boolean>} Always returns true for local storage
 */
export async function testEmailConfig() {
  console.log('✅ Local email storage configured');
  console.log(`   📁 Drafts: ${DRAFTS_DIR}`);
  console.log(`   📁 Sent: ${SENT_DIR}`);
  console.log(`   📁 Failed: ${FAILED_DIR}`);

  const stats = getEmailStats();
  console.log(`   📊 Stats: ${stats.sent} sent, ${stats.drafts} drafts, ${stats.failed} failed`);

  return true;
}

// Placeholder functions for compatibility
export function isAuthorized() {
  return true; // Always authorized for local storage
}

export function getAuthUrl() {
  return null; // No auth needed
}

export async function getTokensFromCode(code) {
  return null; // No tokens needed
}

export async function getUserEmail() {
  return process.env.GMAIL_USER || 'noreply@maksant.com';
}
