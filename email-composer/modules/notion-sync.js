/**
 * MAKSANT EMAIL COMPOSER - Notion Sync Module
 *
 * Syncs composed emails to Notion database for beautiful review interface.
 */

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Notion client
let notion = null;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (process.env.NOTION_API_KEY) {
  notion = new Client({ auth: process.env.NOTION_API_KEY });
  console.log(' Notion client initialized');
} else {
  console.log('�  Notion not configured - skipping sync');
}

/**
 * Sync composed email to Notion database
 * @param {Object} emailData - Composed email data from Supabase
 * @returns {Promise<string>} Notion page ID
 */
export async function syncToNotion(emailData) {
  if (!notion || !NOTION_DATABASE_ID) {
    console.log('�  Notion not configured - skipping sync');
    return null;
  }

  console.log(`=� Syncing to Notion: ${emailData.company_name}`);

  try {
    // Create page in Notion database
    const response = await notion.pages.create({
      parent: { database_id: NOTION_DATABASE_ID },
      icon: {
        type: 'emoji',
        emoji: '💌',
      },
      properties: {
        // Title (required)
        'Name': {
          title: [
            {
              text: {
                content: `${emailData.company_name || emailData.url} - ${emailData.email_strategy || 'Email'}`,
              },
            },
          ],
        },

        // Status (select) - Map our statuses to Anton's database
        'Status': {
          select: {
            name: mapStatusToNotion(emailData.status),
          },
        },

        // Company (text)
        'Company': {
          rich_text: [
            {
              text: {
                content: emailData.company_name || '',
              },
            },
          ],
        },

        // Contact (text)
        'Contact': {
          rich_text: [
            {
              text: {
                content: emailData.contact_name || '',
              },
            },
          ],
        },

        // Email (email)
        'Email': {
          email: emailData.contact_email || null,
        },

        // Quality Score (number)
        'Quality': {
          number: emailData.quality_score || 0,
        },

        // URL (url)
        'Website': {
          url: emailData.url || null,
        },

        // Strategy (select)
        'Strategy': {
          select: {
            name: emailData.email_strategy || 'compliment-sandwich',
          },
        },

        // Industry (text)
        'Industry': {
          rich_text: [
            {
              text: {
                content: emailData.industry || '',
              },
            },
          ],
        },

        // Composed At (date)
        'Composed': {
          date: {
            start: emailData.composed_at || new Date().toISOString(),
          },
        },

        // Sent Date (date) - only if sent
        'Sent Date': emailData.sent_at ? {
          date: {
            start: emailData.sent_at,
          },
        } : undefined,

        // Response Date (date) - only if replied
        'Response Date': emailData.replied_at ? {
          date: {
            start: emailData.replied_at,
          },
        } : undefined,

        // Follow-up Needed (select)
        'Follow-up Needed': {
          select: {
            name: emailData.status === 'sent' && !emailData.replied ? 'Yes' : 'No',
          },
        },
      },
      children: buildNotionPageContent(emailData),
    });

    console.log(` Synced to Notion: ${response.id}`);
    return response.id;

  } catch (error) {
    console.error('L Error syncing to Notion:', error.message);
    throw error;
  }
}

/**
 * Map our internal status to Anton's Notion database statuses
 * @param {string} status - Our internal status
 * @returns {string} Notion status value
 */
function mapStatusToNotion(status) {
  const statusMap = {
    'pending': 'Pending',
    'approved': 'Draft', // Anton uses "Draft" for approved emails
    'rejected': 'Rejected',
    'sent': 'Sent',
    'failed': 'Failed',
  };

  return statusMap[status?.toLowerCase()] || 'Pending';
}

/**
 * Build Notion page content blocks
 * @param {Object} emailData - Email data
 * @returns {Array} Array of Notion blocks
 */
function buildNotionPageContent(emailData) {
  const blocks = [];

  // Header
  blocks.push({
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [{
        type: 'text',
        text: { content: '=� EMAIL REVIEW' },
      }],
    },
  });

  blocks.push({
    object: 'block',
    type: 'divider',
    divider: {},
  });

  // THE EMAIL (Ready to Send)
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{
        type: 'text',
        text: { content: 'THE EMAIL (Ready to Send)' },
      }],
      color: 'green',
    },
  });

  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{
        type: 'text',
        text: { content: 'Subject: ', annotations: { bold: true } },
      }, {
        type: 'text',
        text: { content: emailData.email_subject },
      }],
    },
  });

  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{
        type: 'text',
        text: { content: emailData.email_body },
      }],
      
      color: 'gray_background',
    },
  });

  // Variants (if any)
  if (emailData.has_variants && emailData.subject_variants) {
    blocks.push({
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{
          type: 'text',
          text: { content: 'Subject Line Variants' },
        }],
      },
    });

    emailData.subject_variants.forEach((subject, index) => {
      const isRecommended = emailData.recommended_variant?.subject === index;
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{
            type: 'text',
            text: {
              content: `${isRecommended ? 'P ' : ''}${subject}`,
            },
            annotations: isRecommended ? { bold: true } : {},
          }],
        },
      });
    });

    if (emailData.body_variants) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{
            type: 'text',
            text: { content: 'Body Variants' },
          }],
        },
      });

      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: `${emailData.body_variants.length} body variants generated. See Supabase for full details.` },
          }],
        },
      });
    }
  }

  blocks.push({
    object: 'block',
    type: 'divider',
    divider: {},
  });

  // WHY I WROTE THIS (Technical Breakdown)
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{
        type: 'text',
        text: { content: 'WHY I WROTE THIS (Technical Breakdown)' },
      }],
      color: 'blue',
    },
  });

  if (emailData.business_reasoning) {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: { content: emailData.business_reasoning },
          annotations: { italic: true },
        }],
      },
    });
  }

  if (emailData.technical_reasoning && Array.isArray(emailData.technical_reasoning)) {
    emailData.technical_reasoning.forEach((issue, index) => {
      blocks.push({
        object: 'block',
        type: 'toggle',
        toggle: {
          rich_text: [{
            type: 'text',
            text: { content: `Issue #${index + 1}: ${issue.technical || 'Unknown'}` },
            annotations: { bold: true },
          }],
          children: [
            {
              object: 'block',
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: [{
                  type: 'text',
                  text: { content: `Why it matters: ${issue.why_it_matters || 'N/A'}` },
                }],
              },
            },
            {
              object: 'block',
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: [{
                  type: 'text',
                  text: { content: `What I wrote: "${issue.what_i_wrote || 'N/A'}"` },
                }],
              },
            },
            {
              object: 'block',
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: [{
                  type: 'text',
                  text: { content: `Translation: ${issue.translation || 'N/A'}` },
                }],
              },
            },
          ],
        },
      });
    });
  }

  blocks.push({
    object: 'block',
    type: 'divider',
    divider: {},
  });

  // VERIFY YOURSELF (Checklist)
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{
        type: 'text',
        text: { content: 'VERIFY YOURSELF (Checklist)' },
      }],
      color: 'orange',
    },
  });

  if (emailData.verification_checklist?.steps) {
    emailData.verification_checklist.steps.forEach((step) => {
      blocks.push({
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: [{
            type: 'text',
            text: { content: `${step.step} - ${step.what_to_look_for}` },
          }],
          checked: false,
        },
      });
    });
  }

  if (emailData.url) {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: { content: 'Open website: ' },
        }, {
          type: 'text',
          text: { content: emailData.url },
          annotations: { code: true },
          href: emailData.url,
        }],
      },
    });
  }

  blocks.push({
    object: 'block',
    type: 'divider',
    divider: {},
  });

  // METADATA
  blocks.push({
    object: 'block',
    type: 'heading_3',
    heading_3: {
      rich_text: [{
        type: 'text',
        text: { content: 'Metadata' },
      }],
    },
  });

  const metadata = [
    `Strategy: ${emailData.email_strategy || 'Unknown'}`,
    `AI Model: ${emailData.ai_model || 'Unknown'}`,
    `Quality Score: ${emailData.quality_score || 0}/100`,
    `Website Verified: ${emailData.website_verified ? 'Yes' : 'No'}`,
  ];

  metadata.forEach((line) => {
    blocks.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{
          type: 'text',
          text: { content: line },
        }],
      },
    });
  });

  return blocks;
}

/**
 * Update Notion page status when it changes in Supabase
 * @param {string} notionPageId - Notion page ID
 * @param {string} status - New status
 * @returns {Promise<void>}
 */
export async function updateNotionStatus(notionPageId, status) {
  if (!notion) {
    return;
  }

  try {
    await notion.pages.update({
      page_id: notionPageId,
      properties: {
        'Status': {
          select: {
            name: status,
          },
        },
      },
    });

    console.log(` Updated Notion page ${notionPageId} status to: ${status}`);
  } catch (error) {
    console.error('L Error updating Notion status:', error.message);
  }
}
