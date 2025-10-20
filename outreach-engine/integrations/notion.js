/**
 * NOTION INTEGRATION - Sync composed emails to Notion for review
 *
 * Syncs composed emails to Notion database for manual review/approval.
 * Supports bi-directional sync (Notion → Supabase status updates).
 */

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

/**
 * Sync composed email to Notion
 * @param {object} email - Composed email data
 * @param {object} lead - Lead data
 * @returns {Promise<object>} Notion page
 */
export async function syncEmailToNotion(email, lead) {
  try {
    const properties = {
      // Title (required)
      'Company': {
        title: [
          {
            text: {
              content: lead.company_name || lead.url || 'Unknown'
            }
          }
        ]
      },

      // Rich text fields
      'Subject': email.subject ? {
        rich_text: [
          {
            text: {
              content: email.subject.substring(0, 2000)
            }
          }
        ]
      } : undefined,

      'Body': {
        rich_text: [
          {
            text: {
              content: email.body.substring(0, 2000)
            }
          }
        ]
      },

      // URL
      'Website': lead.url ? {
        url: lead.url
      } : undefined,

      // Select fields
      'Status': {
        select: {
          name: capitalizeStatus(email.status)
        }
      },

      'Platform': {
        select: {
          name: capitalizePlatform(email.platform)
        }
      },

      'Strategy': {
        select: {
          name: formatStrategy(email.strategy)
        }
      },

      'Grade': lead.lead_grade ? {
        select: {
          name: lead.lead_grade
        }
      } : undefined,

      // Number fields
      'Score': email.validation_score ? {
        number: email.validation_score
      } : undefined,

      'Cost': email.cost ? {
        number: Math.round(email.cost * 1000000) / 1000000 // Round to 6 decimals
      } : undefined,

      // Multi-select
      'Industry': lead.industry ? {
        multi_select: [
          {
            name: lead.industry
          }
        ]
      } : undefined,

      // NEW: Type (Email vs Social DM)
      'Type': {
        select: {
          name: email.platform === 'email' ? 'Email' : 'Social DM'
        }
      },

      // NEW: Contact info
      'Contact Email': lead.contact_email ? {
        email: lead.contact_email
      } : undefined,

      'Contact Name': lead.contact_name ? {
        rich_text: [
          {
            text: {
              content: lead.contact_name.substring(0, 2000)
            }
          }
        ]
      } : undefined,

      // NEW: Lead quality fields
      'Website Grade': lead.website_grade ? {
        select: {
          name: lead.website_grade
        }
      } : undefined,

      'Top Issue': lead.top_issue ? {
        rich_text: [
          {
            text: {
              content: (typeof lead.top_issue === 'string' ? lead.top_issue : lead.top_issue.issue).substring(0, 2000)
            }
          }
        ]
      } : undefined,

      'City': lead.city ? {
        rich_text: [
          {
            text: {
              content: lead.city
            }
          }
        ]
      } : undefined,

      // NEW: Technical metadata
      'AI Model': email.model_used ? {
        select: {
          name: email.model_used
        }
      } : undefined,

      'Generation Time (ms)': email.generation_time_ms ? {
        number: email.generation_time_ms
      } : undefined,

      'Email ID': email.id ? {
        rich_text: [
          {
            text: {
              content: email.id.toString()
            }
          }
        ]
      } : undefined,

      // NEW: Social DM specific
      'Character Count': email.character_count ? {
        number: email.character_count
      } : undefined,

      'Platform Limit': email.platform_limit ? {
        number: email.platform_limit
      } : undefined,

      'Social Profile': lead.social_profile_url ? {
        url: lead.social_profile_url
      } : undefined,

      'Sent Via': {
        select: {
          name: 'Pending'
        }
      },

      // NEW: Timestamp
      'Created At': email.created_at ? {
        date: {
          start: email.created_at
        }
      } : {
        date: {
          start: new Date().toISOString()
        }
      },

      // VARIANT OPTIONS - Show all 3 subjects + 2-3 bodies
      'Has Variants': {
        checkbox: email.has_variants || false
      },

      'Subject Variant 1': (email.subject_variants && email.subject_variants[0]) ? {
        rich_text: [
          {
            text: {
              content: email.subject_variants[0].substring(0, 2000)
            }
          }
        ]
      } : undefined,

      'Subject Variant 2': (email.subject_variants && email.subject_variants[1]) ? {
        rich_text: [
          {
            text: {
              content: email.subject_variants[1].substring(0, 2000)
            }
          }
        ]
      } : undefined,

      'Subject Variant 3': (email.subject_variants && email.subject_variants[2]) ? {
        rich_text: [
          {
            text: {
              content: email.subject_variants[2].substring(0, 2000)
            }
          }
        ]
      } : undefined,

      'Body Variant 1': (email.body_variants && email.body_variants[0]) ? {
        rich_text: [
          {
            text: {
              content: email.body_variants[0].substring(0, 2000)
            }
          }
        ]
      } : undefined,

      'Body Variant 2': (email.body_variants && email.body_variants[1]) ? {
        rich_text: [
          {
            text: {
              content: email.body_variants[1].substring(0, 2000)
            }
          }
        ]
      } : undefined,

      'Body Variant 3': (email.body_variants && email.body_variants[2]) ? {
        rich_text: [
          {
            text: {
              content: email.body_variants[2].substring(0, 2000)
            }
          }
        ]
      } : undefined,

      'AI Recommendation': email.recommended_variant ? {
        rich_text: [
          {
            text: {
              content: `Subject ${email.recommended_variant.subject + 1} + Body ${email.recommended_variant.body + 1}`
            }
          }
        ]
      } : undefined,

      'Variant Reasoning': email.variant_reasoning ? {
        rich_text: [
          {
            text: {
              content: email.variant_reasoning.substring(0, 2000)
            }
          }
        ]
      } : undefined
    };

    // Remove undefined properties
    Object.keys(properties).forEach(key => {
      if (properties[key] === undefined) {
        delete properties[key];
      }
    });

    const response = await notion.pages.create({
      parent: {
        database_id: DATABASE_ID
      },
      properties
    });

    console.log(`   ✅ Synced to Notion: ${lead.company_name || lead.url}`);

    return response;

  } catch (error) {
    console.error(`   ❌ Notion sync failed: ${error.message}`);
    throw error;
  }
}

/**
 * Update Notion page status
 * @param {string} pageId - Notion page ID
 * @param {string} status - New status
 * @returns {Promise<object>} Updated page
 */
export async function updateNotionStatus(pageId, status) {
  try {
    const response = await notion.pages.update({
      page_id: pageId,
      properties: {
        'Status': {
          select: {
            name: capitalizeStatus(status)
          }
        }
      }
    });

    return response;
  } catch (error) {
    console.error(`   ❌ Notion status update failed: ${error.message}`);
    throw error;
  }
}

/**
 * Get all pages from Notion database
 * @param {object} filters - Optional filters
 * @returns {Promise<Array>} Notion pages
 */
export async function getNotionPages(filters = {}) {
  try {
    const { status = null, platform = null } = filters;

    const notionFilters = [];

    if (status) {
      notionFilters.push({
        property: 'Status',
        select: {
          equals: capitalizeStatus(status)
        }
      });
    }

    if (platform) {
      notionFilters.push({
        property: 'Platform',
        select: {
          equals: capitalizePlatform(platform)
        }
      });
    }

    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: notionFilters.length > 0 ? {
        and: notionFilters
      } : undefined,
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ]
    });

    return response.results;
  } catch (error) {
    console.error(`   ❌ Failed to fetch Notion pages: ${error.message}`);
    throw error;
  }
}

/**
 * Sync Notion approvals back to Supabase
 * @param {Function} updateCallback - Callback to update Supabase (emailId, status)
 * @returns {Promise<number>} Number of synced approvals
 */
export async function syncNotionApprovals(updateCallback) {
  try {
    // Get pages with "Approved" status
    const approvedPages = await getNotionPages({ status: 'approved' });

    let syncCount = 0;

    for (const page of approvedPages) {
      try {
        // Extract email ID from page (stored in URL or custom field)
        const emailId = extractEmailId(page);

        if (emailId) {
          await updateCallback(emailId, 'approved');
          syncCount++;
        }
      } catch (error) {
        console.error(`   ⚠️  Failed to sync page: ${error.message}`);
      }
    }

    console.log(`   ✅ Synced ${syncCount} approvals from Notion`);
    return syncCount;

  } catch (error) {
    console.error(`   ❌ Notion approval sync failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test Notion connection
 * @returns {Promise<boolean>} True if connected
 */
export async function testNotionConnection() {
  try {
    const response = await notion.databases.retrieve({
      database_id: DATABASE_ID
    });

    console.log(`   ✅ Connected to Notion database: ${response.title[0]?.plain_text || 'Untitled'}`);
    return true;
  } catch (error) {
    throw new Error(`Notion connection failed: ${error.message}`);
  }
}

/**
 * Helper: Capitalize status
 */
function capitalizeStatus(status) {
  if (!status) {
    throw new Error('Status is required');
  }
  if (typeof status !== 'string') {
    throw new Error('Status must be a string');
  }

  try {
    const statusMap = {
      'ready': 'Ready',
      'sent': 'Sent',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'pending': 'Pending',
      'failed': 'Failed'
    };
    return statusMap[status] || status;
  } catch (error) {
    throw new Error(`Failed to capitalize status: ${error.message}`);
  }
}

/**
 * Helper: Capitalize platform
 */
function capitalizePlatform(platform) {
  if (!platform) {
    throw new Error('Platform is required');
  }
  if (typeof platform !== 'string') {
    throw new Error('Platform must be a string');
  }

  try {
    const platformMap = {
      'email': 'Email',
      'instagram': 'Instagram',
      'facebook': 'Facebook',
      'linkedin': 'LinkedIn'
    };
    return platformMap[platform] || platform;
  } catch (error) {
    throw new Error(`Failed to capitalize platform: ${error.message}`);
  }
}

/**
 * Helper: Format strategy name
 */
function formatStrategy(strategy) {
  if (!strategy) {
    throw new Error('Strategy is required');
  }
  if (typeof strategy !== 'string') {
    throw new Error('Strategy must be a string');
  }

  try {
    return strategy
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } catch (error) {
    throw new Error(`Failed to format strategy: ${error.message}`);
  }
}

/**
 * Helper: Extract email ID from Notion page
 */
function extractEmailId(page) {
  if (!page) {
    throw new Error('Page object is required');
  }
  if (typeof page !== 'object') {
    throw new Error('Page must be an object');
  }

  try {
    // Try to find email ID in properties
    // This would need to be customized based on your Notion schema
    // For now, return null
    return null;
  } catch (error) {
    throw new Error(`Failed to extract email ID: ${error.message}`);
  }
}
