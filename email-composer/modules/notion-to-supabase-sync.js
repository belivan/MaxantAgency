/**
 * MAKSANT EMAIL COMPOSER - Notion to Supabase Sync
 *
 * Syncs status changes from Notion back to Supabase.
 * Run this periodically or on-demand to keep databases in sync.
 */

import { Client } from '@notionhq/client';
import { supabase } from './supabase-client.js';
import { sendEmail } from './email-sender.js';
import dotenv from 'dotenv';

dotenv.config();

let notion = null;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (process.env.NOTION_API_KEY) {
  notion = new Client({ auth: process.env.NOTION_API_KEY });
}

/**
 * Map Notion status to our internal status
 * @param {string} notionStatus - Status from Notion
 * @returns {string} Internal status value
 */
function mapNotionStatusToInternal(notionStatus) {
  const statusMap = {
    'Pending': 'pending',
    'Approved': 'approved',
    'Rejected': 'rejected',
    'Sent': 'sent',
    'Failed': 'failed',
  };

  return statusMap[notionStatus] || 'pending';
}

/**
 * Sync status changes from Notion to Supabase
 * @returns {Promise<Object>} Sync results
 */
export async function syncFromNotion() {
  if (!notion || !NOTION_DATABASE_ID) {
    console.log('⚠️  Notion not configured - skipping sync');
    return { success: false, message: 'Notion not configured' };
  }

  console.log('\n🔄 Syncing status changes from Notion to Supabase...');

  try {
    // Get all composed emails from Supabase that have been synced to Notion
    const { data: composedEmails, error: fetchError } = await supabase
      .from('composed_emails')
      .select('*')
      .not('notion_page_id', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch composed emails: ${fetchError.message}`);
    }

    console.log(`   Found ${composedEmails.length} emails synced to Notion`);

    let updated = 0;
    let errors = 0;
    const updates = [];

    // Process each email - check its status in Notion
    for (const email of composedEmails) {
      try {
        const notionPageId = email.notion_page_id;

        // Fetch the page from Notion to get its current status and content
        const page = await notion.pages.retrieve({ page_id: notionPageId });

        // Extract status from Notion
        const notionStatus = page.properties.Status?.select?.name;
        if (!notionStatus) {
          console.log(`   ⚠️  ${email.company_name} (${notionPageId}) has no status - skipping`);
          continue;
        }

        // Extract Subject and Body from Notion
        const notionSubject = page.properties.Subject?.rich_text?.[0]?.text?.content || '';
        const notionBody = page.properties.Body?.rich_text?.[0]?.text?.content || '';

        // Map to internal status
        const internalStatus = mapNotionStatusToInternal(notionStatus);

        // Check what changed
        const statusChanged = email.status !== internalStatus;
        const subjectChanged = email.email_subject !== notionSubject && notionSubject;
        const bodyChanged = email.email_body !== notionBody && notionBody;

        // If nothing changed, skip
        if (!statusChanged && !subjectChanged && !bodyChanged) {
          continue;
        }

        // Build update data
        const updateData = {};

        if (statusChanged) {
          updateData.status = internalStatus;
        }

        if (subjectChanged) {
          updateData.email_subject = notionSubject;
          console.log(`   ✏️  Subject edited in Notion for ${email.company_name}`);
        }

        if (bodyChanged) {
          updateData.email_body = notionBody;
          console.log(`   ✏️  Body edited in Notion for ${email.company_name}`);
        }

        // Add timestamps for certain status changes
        if (statusChanged) {
          if (internalStatus === 'approved' || internalStatus === 'rejected') {
            updateData.reviewed_at = new Date().toISOString();
          }
          if (internalStatus === 'sent') {
            updateData.sent_at = new Date().toISOString();
          }
        }

        const { error: updateError } = await supabase
          .from('composed_emails')
          .update(updateData)
          .eq('id', email.id);

        if (updateError) {
          console.error(`   ❌ Error updating ${email.company_name}:`, updateError.message);
          errors++;
        } else {
          console.log(`   ✅ Updated ${email.company_name}: ${email.status} → ${internalStatus}`);
          updated++;
          updates.push({
            id: email.id,
            company: email.company_name,
            oldStatus: email.status,
            newStatus: internalStatus,
          });

          // If status changed to 'approved', automatically send the email
          // But only if it hasn't been sent already (prevent duplicates)
          if (internalStatus === 'approved' && email.status !== 'approved' && email.status !== 'sent' && !email.sent_at) {
            console.log(`\n📧 Auto-sending approved email to ${email.company_name}...`);

            try {
              // Send the email
              const sendResult = await sendEmail(email);

              // Update status to 'sent' in Supabase
              await supabase
                .from('composed_emails')
                .update({
                  status: 'sent',
                  sent_at: sendResult.sentAt,
                  email_message_id: sendResult.messageId,
                })
                .eq('id', email.id);

              // Update status in Notion to 'Sent'
              await notion.pages.update({
                page_id: notionPageId,
                properties: {
                  'Status': {
                    select: {
                      name: 'Sent',
                    },
                  },
                },
              });

              console.log(`   ✅ Email sent successfully and marked as Sent`);

              // Update the updates array to reflect final status
              updates[updates.length - 1].newStatus = 'sent';
              updates[updates.length - 1].sentAt = sendResult.sentAt;

            } catch (sendError) {
              console.error(`   ❌ Failed to send email:`, sendError.message);

              // Update status to 'failed' in Supabase
              await supabase
                .from('composed_emails')
                .update({
                  status: 'failed',
                  error_message: sendError.message,
                })
                .eq('id', email.id);

              // Update status in Notion to 'Failed'
              await notion.pages.update({
                page_id: notionPageId,
                properties: {
                  'Status': {
                    select: {
                      name: 'Failed',
                    },
                  },
                },
              });

              console.log(`   ⚠️  Marked as Failed in both Supabase and Notion`);

              // Update the updates array to reflect failure
              updates[updates.length - 1].newStatus = 'failed';
              updates[updates.length - 1].error = sendError.message;
            }
          } else if (internalStatus === 'approved' && (email.status === 'sent' || email.sent_at)) {
            console.log(`   ⏭️  Skipping ${email.company_name} - already sent (preventing duplicate)`);

            // Automatically change status back to "Sent" in Notion
            try {
              await notion.pages.update({
                page_id: notionPageId,
                properties: {
                  'Status': {
                    select: {
                      name: 'Sent',
                    },
                  },
                },
              });
              console.log(`   🔄 Automatically reverted status to "Sent" in Notion`);
            } catch (notionError) {
              console.error(`   ⚠️  Failed to revert status in Notion:`, notionError.message);
            }
          }
        }

      } catch (pageError) {
        console.error(`   ❌ Error processing page:`, pageError.message);
        errors++;
      }
    }

    console.log(`\n✅ Sync complete: ${updated} updated, ${errors} errors`);

    return {
      success: true,
      updated,
      errors,
      updates,
    };

  } catch (error) {
    console.error('❌ Error syncing from Notion:', error.message);
    return {
      success: false,
      message: error.message,
    };
  }
}
