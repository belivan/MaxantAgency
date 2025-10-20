/**
 * SMTP SENDER - Send emails via Gmail SMTP
 *
 * Handles:
 * - Sending emails via Gmail SMTP
 * - Retry logic with exponential backoff
 * - Rate limiting to avoid Gmail limits
 * - Tracking sent emails
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Gmail rate limits (per day)
const GMAIL_DAILY_LIMIT = 500;
const GMAIL_HOURLY_LIMIT = 100;

// Rate limiting state
let sentToday = 0;
let sentThisHour = 0;
let lastResetDate = new Date().getDate();
let lastResetHour = new Date().getHours();

/**
 * Create .eml file for archiving (ALWAYS created per spec)
 * @param {object} email - Email data
 * @param {string} messageId - SMTP message ID
 * @returns {string} Path to .eml file
 */
function createEmlFile(email, messageId = null) {
  // Validate inputs
  if (!email || typeof email !== 'object') {
    throw new Error('Email object is required for .eml file creation');
  }

  const { to, subject, body } = email;

  if (!to || !subject || !body) {
    throw new Error('Email must have to, subject, and body for .eml file creation');
  }

  try {
    // Create emails/sent directory if it doesn't exist
    const emailsDir = join(__dirname, '..', 'emails', 'sent');
    if (!existsSync(emailsDir)) {
      mkdirSync(emailsDir, { recursive: true });
    }

    // Generate filename: YYYY-MM-DD_HHmmss_recipient.eml
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const recipient = to.replace('@', '_at_').replace(/[^a-zA-Z0-9_]/g, '');
    const filename = `${timestamp}_${recipient}.eml`;
    const emlPath = join(emailsDir, filename);

    // Create .eml file content (RFC 822 format)
    const emlContent = `From: ${process.env.FROM_NAME || process.env.SENDER_NAME} <${process.env.GMAIL_USER}>
To: ${to}
Subject: ${subject}
Date: ${new Date().toUTCString()}
Message-ID: ${messageId || `<${Date.now()}@${process.env.GMAIL_USER}>`}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8

${body}
`;

    // Write .eml file
    writeFileSync(emlPath, emlContent, 'utf-8');

    return emlPath;
  } catch (error) {
    throw new Error(`Failed to create .eml file: ${error.message}`);
  }
}

/**
 * Create SMTP transporter
 * @returns {object} Nodemailer transporter
 */
function createTransporter() {
  // Check if we have App Password
  if (!process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD === 'your-app-password-here') {
    throw new Error('GMAIL_APP_PASSWORD not configured. Get it from: https://myaccount.google.com/apppasswords');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
}

/**
 * Send email via Gmail SMTP
 * @param {object} email - Email data
 * @param {object} options - Send options
 * @returns {Promise<object>} Send result
 */
export async function sendEmail(email, options = {}) {
  const {
    to,
    subject,
    body,
    replyTo = null,
    trackingId = null
  } = email;

  const {
    retries = 3,
    retryDelay = 1000
  } = options;

  // Validate required fields
  if (!to) {
    throw new Error('Recipient email (to) is required');
  }
  if (!subject) {
    throw new Error('Subject is required');
  }
  if (!body) {
    throw new Error('Body is required');
  }

  // Check rate limits
  checkRateLimits();

  // Create transporter
  const transporter = createTransporter();

  // Build email
  const mailOptions = {
    from: `${process.env.FROM_NAME || process.env.SENDER_NAME} <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text: body,
    html: convertToHTML(body),
    replyTo: replyTo || process.env.GMAIL_USER,
    headers: trackingId ? {
      'X-Tracking-ID': trackingId
    } : undefined
  };

  // Send with retry logic
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`   📤 Sending email to ${to} (attempt ${attempt}/${retries})...`);

      const info = await transporter.sendMail(mailOptions);

      // Update rate limiting counters
      incrementCounters();

      // Create .eml file (ALWAYS, per spec)
      const emlPath = createEmlFile(email, info.messageId);

      console.log(`   ✅ Email sent successfully (ID: ${info.messageId})`);
      console.log(`   💾 .eml file: ${emlPath}`);

      return {
        success: true,
        messageId: info.messageId,
        emlPath,
        to,
        subject,
        sentAt: new Date().toISOString(),
        attempt
      };

    } catch (error) {
      lastError = error;
      console.error(`   ⚠️  Send attempt ${attempt} failed: ${error.message}`);

      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`   ⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(`Failed to send email after ${retries} attempts: ${lastError.message}`);
}

/**
 * Send bulk emails (with rate limiting)
 * @param {Array} emails - Array of email objects
 * @param {object} options - Options
 * @returns {Promise<object>} Results
 */
export async function sendBulkEmails(emails, options = {}) {
  const {
    delayBetween = 2000, // 2 seconds between emails
    stopOnError = false
  } = options;

  console.log(`\n📧 Sending ${emails.length} emails...`);

  const results = {
    sent: [],
    failed: [],
    skipped: []
  };

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];

    try {
      // Check if we can send
      if (!canSendMore()) {
        console.log(`   ⚠️  Rate limit reached. Skipping remaining emails.`);
        results.skipped.push(...emails.slice(i));
        break;
      }

      const result = await sendEmail(email);
      results.sent.push({ ...email, result });

      // Delay between emails
      if (i < emails.length - 1) {
        await sleep(delayBetween);
      }

    } catch (error) {
      console.error(`   ❌ Failed to send email to ${email.to}: ${error.message}`);
      results.failed.push({ ...email, error: error.message });

      if (stopOnError) {
        console.log(`   🛑 Stopping bulk send due to error`);
        results.skipped.push(...emails.slice(i + 1));
        break;
      }
    }
  }

  console.log(`\n📊 Bulk send complete:`);
  console.log(`   ✅ Sent: ${results.sent.length}`);
  console.log(`   ❌ Failed: ${results.failed.length}`);
  console.log(`   ⏭️  Skipped: ${results.skipped.length}`);

  return results;
}

/**
 * Test SMTP connection
 * @returns {Promise<boolean>} True if connected
 */
export async function testSMTPConnection() {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log(`   ✅ SMTP connection verified (${process.env.GMAIL_USER})`);
    return true;
  } catch (error) {
    throw new Error(`SMTP connection failed: ${error.message}`);
  }
}

/**
 * Send test email
 * @param {string} to - Recipient email
 * @returns {Promise<object>} Send result
 */
export async function sendTestEmail(to) {
  if (!to) {
    throw new Error('Recipient email is required for test email');
  }
  if (typeof to !== 'string') {
    throw new Error('Recipient email must be a string');
  }

  try {
    return await sendEmail({
      to,
      subject: 'Test Email from Outreach Engine',
      body: `This is a test email from the Maksant Outreach Engine.\n\nSent at: ${new Date().toISOString()}\n\nIf you received this, the SMTP integration is working correctly!`
    });
  } catch (error) {
    throw new Error(`Failed to send test email: ${error.message}`);
  }
}

/**
 * Get rate limit status
 * @returns {object} Rate limit info
 */
export function getRateLimitStatus() {
  checkResetTimers();

  return {
    daily: {
      sent: sentToday,
      limit: GMAIL_DAILY_LIMIT,
      remaining: GMAIL_DAILY_LIMIT - sentToday,
      percentage: Math.round((sentToday / GMAIL_DAILY_LIMIT) * 100)
    },
    hourly: {
      sent: sentThisHour,
      limit: GMAIL_HOURLY_LIMIT,
      remaining: GMAIL_HOURLY_LIMIT - sentThisHour,
      percentage: Math.round((sentThisHour / GMAIL_HOURLY_LIMIT) * 100)
    },
    canSendMore: canSendMore()
  };
}

/**
 * Check if we can send more emails
 * @returns {boolean} True if we can send
 */
function canSendMore() {
  try {
    checkResetTimers();
    return sentToday < GMAIL_DAILY_LIMIT && sentThisHour < GMAIL_HOURLY_LIMIT;
  } catch (error) {
    throw new Error(`Failed to check send capacity: ${error.message}`);
  }
}

/**
 * Check rate limits and throw if exceeded
 */
function checkRateLimits() {
  checkResetTimers();

  if (sentToday >= GMAIL_DAILY_LIMIT) {
    throw new Error(`Daily Gmail limit reached (${GMAIL_DAILY_LIMIT} emails). Try again tomorrow.`);
  }

  if (sentThisHour >= GMAIL_HOURLY_LIMIT) {
    throw new Error(`Hourly Gmail limit reached (${GMAIL_HOURLY_LIMIT} emails). Try again in ${60 - new Date().getMinutes()} minutes.`);
  }
}

/**
 * Check and reset timers if needed
 */
function checkResetTimers() {
  try {
    const now = new Date();
    const currentDate = now.getDate();
    const currentHour = now.getHours();

    // Reset daily counter
    if (currentDate !== lastResetDate) {
      sentToday = 0;
      lastResetDate = currentDate;
    }

    // Reset hourly counter
    if (currentHour !== lastResetHour) {
      sentThisHour = 0;
      lastResetHour = currentHour;
    }
  } catch (error) {
    throw new Error(`Failed to check reset timers: ${error.message}`);
  }
}

/**
 * Increment counters after successful send
 */
function incrementCounters() {
  sentToday++;
  sentThisHour++;
}

/**
 * Convert plain text to simple HTML
 * @param {string} text - Plain text
 * @returns {string} HTML
 */
function convertToHTML(text) {
  if (!text) {
    throw new Error('Text is required for HTML conversion');
  }
  if (typeof text !== 'string') {
    throw new Error('Text must be a string');
  }

  try {
    // Convert line breaks to <br>
    // Convert double line breaks to <p>
    return text
      .split('\n\n')
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('');
  } catch (error) {
    throw new Error(`Failed to convert text to HTML: ${error.message}`);
  }
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
