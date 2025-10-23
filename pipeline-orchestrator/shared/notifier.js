import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { log } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// Create email transporter
let transporter = null;

function getTransporter() {
  if (!transporter) {
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

    // Check if SMTP credentials are configured
    if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
      log.warn('SMTP credentials not configured - email notifications disabled');
      return null;
    }

    transporter = nodemailer.createTransport(smtpConfig);

    log.info('Email transporter initialized', {
      host: smtpConfig.host,
      port: smtpConfig.port
    });
  }

  return transporter;
}

/**
 * Send email notification
 *
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.body - Email body (plain text)
 * @param {string} options.html - Email body (HTML)
 * @returns {Promise<boolean>} True if sent successfully
 */
export async function sendEmail({ to, subject, body, html }) {
  const transport = getTransporter();

  if (!transport) {
    log.warn('Email not sent - transporter not available', { to, subject });
    return false;
  }

  try {
    const mailOptions = {
      from: process.env.NOTIFICATION_FROM || 'noreply@maksant.agency',
      to,
      subject,
      text: body,
      html: html || body
    };

    const info = await transport.sendMail(mailOptions);

    log.info('Email sent successfully', {
      to,
      subject,
      messageId: info.messageId
    });

    return true;

  } catch (error) {
    log.error('Failed to send email', {
      to,
      subject,
      error: error.message
    });

    return false;
  }
}

/**
 * Send campaign completion notification
 *
 * @param {Object} campaign - Campaign object
 * @param {Object} results - Campaign run results
 * @returns {Promise<boolean>}
 */
export async function sendCampaignCompletionNotification(campaign, results) {
  const notificationEmail = campaign.config?.notifications?.onComplete?.email;

  if (!notificationEmail) {
    log.debug('No completion notification email configured', {
      campaign: campaign.name
    });
    return false;
  }

  const subject = `✅ Campaign "${campaign.name}" Completed`;

  const body = `
Campaign Run Summary
====================

Campaign: ${campaign.name}
Status: ${results.status}
Started: ${new Date(results.started_at).toLocaleString()}
Completed: ${new Date(results.completed_at).toLocaleString()}
Duration: ${Math.round(results.duration_ms / 1000)}s

Results:
--------
Steps Completed: ${results.steps_completed}
Steps Failed: ${results.steps_failed}
Total Cost: $${results.total_cost.toFixed(2)}

${results.step_results ? Object.entries(results.step_results).map(([name, result]) => `
${name}:
  ${Object.entries(result).filter(([k]) => k !== 'raw_result').map(([k, v]) => `${k}: ${v}`).join('\n  ')}
`).join('\n') : ''}

${results.errors.length > 0 ? `
Errors:
-------
${results.errors.map(e => `- ${e.step}: ${e.error}`).join('\n')}
` : ''}

---
Pipeline Orchestrator - Maksant Agency
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .summary { background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .metric { margin: 10px 0; }
    .metric-label { font-weight: bold; color: #555; }
    .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="header">
    <h1>✅ Campaign Completed</h1>
  </div>
  <div class="content">
    <h2>${campaign.name}</h2>
    <div class="summary">
      <div class="metric"><span class="metric-label">Status:</span> ${results.status}</div>
      <div class="metric"><span class="metric-label">Duration:</span> ${Math.round(results.duration_ms / 1000)}s</div>
      <div class="metric"><span class="metric-label">Steps Completed:</span> ${results.steps_completed}</div>
      <div class="metric"><span class="metric-label">Total Cost:</span> $${results.total_cost.toFixed(2)}</div>
    </div>
    ${results.errors.length > 0 ? `
    <h3>Errors:</h3>
    <ul>
      ${results.errors.map(e => `<li><strong>${e.step}:</strong> ${e.error}</li>`).join('')}
    </ul>
    ` : ''}
  </div>
  <div class="footer">
    Pipeline Orchestrator - Maksant Agency
  </div>
</body>
</html>
  `;

  return await sendEmail({
    to: notificationEmail,
    subject,
    body,
    html
  });
}

/**
 * Send campaign failure notification
 *
 * @param {Object} campaign - Campaign object
 * @param {Error} error - Error that caused failure
 * @param {Object} partialResults - Partial results if available
 * @returns {Promise<boolean>}
 */
export async function sendCampaignFailureNotification(campaign, error, partialResults = {}) {
  const notificationEmail = campaign.config?.notifications?.onFailure?.email;

  if (!notificationEmail) {
    log.debug('No failure notification email configured', {
      campaign: campaign.name
    });
    return false;
  }

  const subject = `❌ Campaign "${campaign.name}" Failed`;

  const body = `
Campaign Failure Alert
======================

Campaign: ${campaign.name}
Status: FAILED
Time: ${new Date().toLocaleString()}

Error:
------
${error.message}

${error.budgetExceeded ? `
Budget Status:
--------------
Campaign paused due to budget limits being exceeded.
` : ''}

${partialResults.steps_completed ? `
Partial Results:
----------------
Steps Completed: ${partialResults.steps_completed}
Steps Failed: ${partialResults.steps_failed}
Total Cost: $${(partialResults.total_cost || 0).toFixed(2)}
` : ''}

Action Required:
----------------
Please review the campaign configuration and logs.

---
Pipeline Orchestrator - Maksant Agency
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .error-box { background-color: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; }
    .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="header">
    <h1>❌ Campaign Failed</h1>
  </div>
  <div class="content">
    <h2>${campaign.name}</h2>
    <div class="error-box">
      <strong>Error:</strong><br>
      ${error.message}
    </div>
    ${error.budgetExceeded ? `
    <p><strong>⚠️ Campaign paused due to budget limits.</strong></p>
    ` : ''}
    <p>Please review the campaign configuration and check the logs for more details.</p>
  </div>
  <div class="footer">
    Pipeline Orchestrator - Maksant Agency
  </div>
</body>
</html>
  `;

  return await sendEmail({
    to: notificationEmail,
    subject,
    body,
    html
  });
}

/**
 * Send test notification
 *
 * @param {string} to - Recipient email
 * @returns {Promise<boolean>}
 */
export async function sendTestNotification(to) {
  return await sendEmail({
    to,
    subject: 'Pipeline Orchestrator - Test Notification',
    body: 'This is a test notification from the Pipeline Orchestrator. If you received this, email notifications are working correctly!',
    html: '<h2>✅ Test Notification</h2><p>Email notifications are working correctly!</p>'
  });
}

export default {
  sendEmail,
  sendCampaignCompletionNotification,
  sendCampaignFailureNotification,
  sendTestNotification
};
