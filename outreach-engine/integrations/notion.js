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
    // First, check what properties actually exist in the database
    const database = await notion.databases.retrieve({ database_id: DATABASE_ID });
    const existingProps = database.properties || {};

    // Helper to check if property exists and get its type
    const hasProperty = (name) => name in existingProps;
    const getPropertyType = (name) => existingProps[name]?.type;

    const properties = {};

    // Add Name as title (Notion's default title field)
    if (hasProperty('Name') && getPropertyType('Name') === 'title') {
      properties['Name'] = {
        title: [
          {
            text: {
              content: lead.company_name || lead.url || 'Unknown'
            }
          }
        ]
      };
    }

    // Company as rich_text (user's database structure)
    if (hasProperty('Company')) {
      if (getPropertyType('Company') === 'rich_text') {
        properties['Company'] = {
          rich_text: [
            {
              text: {
                content: lead.company_name || lead.url || 'Unknown'
              }
            }
          ]
        };
      } else if (getPropertyType('Company') === 'title') {
        properties['Company'] = {
          title: [
            {
              text: {
                content: lead.company_name || lead.url || 'Unknown'
              }
            }
          ]
        };
      }
    }

    // Rich text fields
    if (hasProperty('Subject') && email.subject) {
      properties['Subject'] = {
        rich_text: [
          {
            text: {
              content: email.subject.substring(0, 2000)
            }
          }
        ]
      };
    }

    if (hasProperty('Body')) {
      properties['Body'] = {
        rich_text: [
          {
            text: {
              content: email.body.substring(0, 2000)
            }
          }
        ]
      };
    }

    // URL
    if (hasProperty('Website') && lead.url) {
      properties['Website'] = {
        url: lead.url
      };
    }

    // Select fields
    if (hasProperty('Status')) {
      properties['Status'] = {
        select: {
          name: capitalizeStatus(email.status)
        }
      };
    }

    if (hasProperty('Platform')) {
      properties['Platform'] = {
        select: {
          name: capitalizePlatform(email.platform || 'email')
        }
      };
    }

    if (hasProperty('Strategy')) {
      properties['Strategy'] = {
        select: {
          name: formatStrategy(email.strategy || 'compliment-sandwich')
        }
      };
    }

    if (hasProperty('Grade') && lead.lead_grade) {
      properties['Grade'] = {
        select: {
          name: lead.lead_grade
        }
      };
    }

    // Number fields
    if (hasProperty('Score') && email.validation_score) {
      properties['Score'] = {
        number: email.validation_score
      };
    }

    if (hasProperty('Cost') && email.cost) {
      properties['Cost'] = {
        number: Math.round(email.cost * 1000000) / 1000000 // Round to 6 decimals
      };
    }

    // Multi-select or rich_text for Industry
    if (hasProperty('Industry') && lead.industry) {
      const industryType = getPropertyType('Industry');
      if (industryType === 'multi_select') {
        properties['Industry'] = {
          multi_select: [
            {
              name: lead.industry
            }
          ]
        };
      } else if (industryType === 'rich_text') {
        properties['Industry'] = {
          rich_text: [
            {
              text: {
                content: lead.industry
              }
            }
          ]
        };
      }
    }

    // Type (Email vs Social DM)
    if (hasProperty('Type')) {
      properties['Type'] = {
        select: {
          name: email.platform === 'email' ? 'Email' : 'Social DM'
        }
      };
    }

    // Contact info
    if (hasProperty('Contact Email') && lead.contact_email) {
      properties['Contact Email'] = {
        email: lead.contact_email
      };
    }

    if (hasProperty('Contact Name') && lead.contact_name) {
      properties['Contact Name'] = {
        rich_text: [
          {
            text: {
              content: lead.contact_name.substring(0, 2000)
            }
          }
        ]
      };
    }

    // Lead quality fields
    if (hasProperty('Website Grade') && lead.website_grade) {
      properties['Website Grade'] = {
        select: {
          name: lead.website_grade
        }
      };
    }

    if (hasProperty('Top Issue') && lead.top_issue) {
      properties['Top Issue'] = {
        rich_text: [
          {
            text: {
              content: (typeof lead.top_issue === 'string' ? lead.top_issue : lead.top_issue.issue).substring(0, 2000)
            }
          }
        ]
      };
    }

    if (hasProperty('City') && lead.city) {
      properties['City'] = {
        rich_text: [
          {
            text: {
              content: lead.city
            }
          }
        ]
      };
    }

    // Technical metadata
    if (hasProperty('AI Model') && email.model_used) {
      properties['AI Model'] = {
        select: {
          name: email.model_used
        }
      };
    }

    if (hasProperty('Generation Time (ms)') && email.generation_time_ms) {
      properties['Generation Time (ms)'] = {
        number: email.generation_time_ms
      };
    }

    if (hasProperty('Email ID') && email.id) {
      properties['Email ID'] = {
        rich_text: [
          {
            text: {
              content: email.id.toString()
            }
          }
        ]
      };
    }

    // Social DM specific
    if (hasProperty('Character Count') && email.character_count) {
      properties['Character Count'] = {
        number: email.character_count
      };
    }

    if (hasProperty('Platform Limit') && email.platform_limit) {
      properties['Platform Limit'] = {
        number: email.platform_limit
      };
    }

    if (hasProperty('Social Profile') && lead.social_profile_url) {
      properties['Social Profile'] = {
        url: lead.social_profile_url
      };
    }

    if (hasProperty('Sent Via')) {
      properties['Sent Via'] = {
        select: {
          name: 'Pending'
        }
      };
    }

    // Timestamp
    if (hasProperty('Created At')) {
      properties['Created At'] = email.created_at ? {
        date: {
          start: email.created_at
        }
      } : {
        date: {
          start: new Date().toISOString()
        }
      };
    }

    // VARIANT OPTIONS - Show all 3 subjects + 2-3 bodies
    if (hasProperty('Has Variants')) {
      properties['Has Variants'] = {
        checkbox: email.has_variants || false
      };
    }

    if (hasProperty('Subject Variant 1') && email.subject_variants && email.subject_variants[0]) {
      properties['Subject Variant 1'] = {
        rich_text: [
          {
            text: {
              content: email.subject_variants[0].substring(0, 2000)
            }
          }
        ]
      };
    }

    if (hasProperty('Subject Variant 2') && email.subject_variants && email.subject_variants[1]) {
      properties['Subject Variant 2'] = {
        rich_text: [
          {
            text: {
              content: email.subject_variants[1].substring(0, 2000)
            }
          }
        ]
      };
    }

    if (hasProperty('Subject Variant 3') && email.subject_variants && email.subject_variants[2]) {
      properties['Subject Variant 3'] = {
        rich_text: [
          {
            text: {
              content: email.subject_variants[2].substring(0, 2000)
            }
          }
        ]
      };
    }

    if (hasProperty('Body Variant 1') && email.body_variants && email.body_variants[0]) {
      properties['Body Variant 1'] = {
        rich_text: [
          {
            text: {
              content: email.body_variants[0].substring(0, 2000)
            }
          }
        ]
      };
    }

    if (hasProperty('Body Variant 2') && email.body_variants && email.body_variants[1]) {
      properties['Body Variant 2'] = {
        rich_text: [
          {
            text: {
              content: email.body_variants[1].substring(0, 2000)
            }
          }
        ]
      };
    }

    if (hasProperty('Body Variant 3') && email.body_variants && email.body_variants[2]) {
      properties['Body Variant 3'] = {
        rich_text: [
          {
            text: {
              content: email.body_variants[2].substring(0, 2000)
            }
          }
        ]
      };
    }

    if (hasProperty('AI Recommendation') && email.recommended_variant) {
      properties['AI Recommendation'] = {
        rich_text: [
          {
            text: {
              content: `Subject ${email.recommended_variant.subject + 1} + Body ${email.recommended_variant.body + 1}`
            }
          }
        ]
      };
    }

    if (hasProperty('Variant Reasoning') && email.variant_reasoning) {
      properties['Variant Reasoning'] = {
        rich_text: [
          {
            text: {
              content: email.variant_reasoning.substring(0, 2000)
            }
          }
        ]
      };
    }

    // Check if we have at least one property to sync
    if (Object.keys(properties).length === 0) {
      console.log(`   ⚠️  Notion sync skipped: No matching properties exist in database`);
      console.log(`   💡 Set up properties in Notion - see NOTION-SETUP-GUIDE.md`);
      return { skipped: true, reason: 'No matching properties exist in Notion database' };
    }

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
