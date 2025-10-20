/**
 * Analysis Engine Server
 *
 * Express server with API endpoints for website analysis
 *
 * Endpoints:
 * - POST /api/analyze - Analyze prospects from database
 * - POST /api/analyze-url - Analyze single URL (testing/demo)
 * - GET /api/leads - Get analyzed leads with filters
 * - GET /api/stats - Get analysis statistics
 * - GET /health - Health check
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { analyzeWebsite, analyzeMultiple, getBatchSummary } from './orchestrator.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'analysis-engine',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/analyze-url
 * Analyze a single URL (for testing/demo)
 *
 * Body:
 * {
 *   "url": "https://example.com",
 *   "company_name": "Example Company",
 *   "industry": "restaurant"
 * }
 */
app.post('/api/analyze-url', async (req, res) => {
  try {
    const { url, company_name, industry } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`[Analysis] Starting analysis for ${url}`);

    const result = await analyzeWebsite(url, {
      company_name: company_name || 'Unknown Company',
      industry: industry || 'Unknown'
    }, {
      onProgress: (progress) => {
        console.log(`[Analysis] ${progress.step}: ${progress.message}`);
      }
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'Analysis failed',
        details: result.error
      });
    }

    console.log(`[Analysis] Completed for ${url} - Grade: ${result.grade}`);

    // Save to database
    try {
      const leadData = extractLeadData(result);
      const { error: saveError } = await supabase
        .from('leads')
        .upsert(leadData, { onConflict: 'url' });

      if (saveError) {
        console.error(`[Analysis] Failed to save lead to database:`, saveError);
      } else {
        console.log(`[Analysis] Lead saved to database`);
      }
    } catch (dbError) {
      // Don't fail the whole request if database save fails
      console.error(`[Analysis] Database error:`, dbError);
    }

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('[Analysis] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * POST /api/analyze
 * Analyze prospects from database using Server-Sent Events for progress
 *
 * Body:
 * {
 *   "filters": {
 *     "industry": "restaurant",
 *     "city": "Philadelphia",
 *     "limit": 10
 *   }
 * }
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { prospect_ids, filters = {} } = req.body;

    // DEBUG: Log what we received
    console.log('📥 Analysis Request Received:', {
      prospect_ids,
      prospect_count: prospect_ids?.length,
      filters,
      body: req.body
    });

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Fetch prospects from database
    sendEvent('status', { message: 'Fetching prospects from database...' });

    let query;
    let prospects;

    // If specific prospect_ids are provided, fetch those prospects directly
    if (prospect_ids && prospect_ids.length > 0) {
      console.log('🔍 Querying prospects with IDs:', prospect_ids);

      query = supabase
        .from('prospects')
        .select('id, company_name, website, industry, city, state')
        .in('id', prospect_ids)
        .not('website', 'is', null);

      const { data: prospectData, error: fetchError } = await query;

      if (fetchError) {
        console.error('❌ Query failed:', fetchError);
        sendEvent('error', { error: 'Failed to fetch prospects', details: fetchError.message });
        res.end();
        return;
      }

      prospects = prospectData || [];
      console.log('✅ Found prospects:', prospects.map(p => ({ id: p.id, name: p.company_name, website: p.website })));
    }
    // If projectId is provided, JOIN with project_prospects to filter by project
    else if (filters.projectId) {
      query = supabase
        .from('project_prospects')
        .select('prospect_id, prospects(id, company_name, website, industry, city, state)')
        .eq('project_id', filters.projectId)
        .not('prospects.website', 'is', null);

      // Apply filters (using Supabase nested syntax)
      if (filters.industry) {
        query = query.eq('prospects.industry', filters.industry);
      }
      if (filters.city) {
        query = query.ilike('prospects.city', `%${filters.city}%`);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(10); // Default limit
      }

      const { data: projectProspects, error: fetchError } = await query;

      if (fetchError) {
        sendEvent('error', { error: 'Failed to fetch prospects', details: fetchError.message });
        res.end();
        return;
      }

      // Extract nested prospect data
      prospects = projectProspects?.map(pp => ({
        id: pp.prospects.id,
        company_name: pp.prospects.company_name,
        website: pp.prospects.website,
        industry: pp.prospects.industry,
        city: pp.prospects.city,
        state: pp.prospects.state
      })) || [];

    } else {
      // Query prospects globally if no projectId
      query = supabase
        .from('prospects')
        .select('id, company_name, website, industry, city, state')
        .not('website', 'is', null);

      // Apply filters
      if (filters.industry) {
        query = query.eq('industry', filters.industry);
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(10); // Default limit
      }

      const { data: prospectData, error: fetchError } = await query;

      if (fetchError) {
        sendEvent('error', { error: 'Failed to fetch prospects', details: fetchError.message });
        res.end();
        return;
      }

      prospects = prospectData || [];
    }

    // Check if we found any prospects
    if (!prospects || prospects.length === 0) {
      sendEvent('error', { error: 'No prospects found matching filters' });
      res.end();
      return;
    }

    sendEvent('status', { message: `Found ${prospects.length} prospects to analyze` });

    // Prepare targets for analysis
    const targets = prospects.map(p => ({
      url: p.website,
      context: {
        prospect_id: p.id,
        company_name: p.company_name,
        industry: p.industry,
        city: p.city,
        project_id: filters.projectId || null  // Pass projectId through context
      }
    }));

    console.log('🎯 Targets prepared for analysis:', targets.map(t => ({ url: t.url, company: t.context.company_name })));

    // Analyze with progress updates
    const results = await analyzeMultiple(targets, {
      concurrency: 2,
      onProgress: (progress) => {
        sendEvent('progress', {
          url: progress.url,
          step: progress.step,
          message: progress.message,
          completed: progress.completed,
          total: progress.total
        });
      },
      onComplete: async (result, completed, total) => {
        console.log('💾 onComplete called:', { url: result.url, success: result.success });

        if (result.success) {
          // Save to leads table
          const leadData = extractLeadData(result);
          console.log('📝 Lead data prepared:', {
            url: leadData.url,
            company: leadData.company_name,
            grade: leadData.website_grade,
            score: leadData.website_score
          });

          const { data: savedData, error: insertError } = await supabase
            .from('leads')
            .upsert(leadData, { onConflict: 'url' });

          if (insertError) {
            console.error('❌ Database save failed:', insertError);
            sendEvent('warning', {
              message: `Failed to save lead ${result.url}`,
              error: insertError.message
            });
          } else {
            console.log('✅ Lead saved successfully:', leadData.url);
            sendEvent('complete', {
              url: result.url,
              grade: result.grade,
              score: result.overall_score,
              completed,
              total
            });
          }
        } else {
          sendEvent('failed', {
            url: result.url,
            error: result.error,
            completed,
            total
          });
        }
      }
    });

    // Send summary
    const summary = getBatchSummary(results);
    sendEvent('summary', summary);

    sendEvent('done', { message: 'Analysis complete' });
    res.end();

  } catch (error) {
    console.error('[Analysis] Error:', error);
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/leads
 * Get analyzed leads with filters
 *
 * Query params:
 * - grade: Filter by letter grade (A, B, C, D, F)
 * - industry: Filter by industry
 * - hasEmail: Filter by has contact email (true/false)
 * - minScore: Minimum overall score
 * - status: Filter by status
 * - limit: Max results (default 50)
 * - offset: Pagination offset (default 0)
 */
app.get('/api/leads', async (req, res) => {
  try {
    const {
      grade,
      industry,
      hasEmail,
      minScore,
      status = 'ready_for_outreach',
      limit = 50,
      offset = 0
    } = req.query;

    let query = supabase
      .from('leads')
      .select('*')
      .order('overall_score', { ascending: false });

    // Apply filters
    if (grade) {
      query = query.eq('website_grade', grade);
    }
    if (industry) {
      query = query.eq('industry', industry);
    }
    if (hasEmail === 'true') {
      query = query.not('contact_email', 'is', null);
    }
    if (minScore) {
      query = query.gte('overall_score', parseFloat(minScore));
    }
    if (status) {
      query = query.eq('status', status);
    }

    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data: leads, error, count } = await query;

    if (error) {
      return res.status(500).json({
        error: 'Failed to fetch leads',
        details: error.message
      });
    }

    res.json({
      success: true,
      leads,
      count: leads.length,
      offset: parseInt(offset),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('[Leads] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * GET /api/stats
 * Get analysis statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    // Get total leads count
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    // Get grade distribution
    const { data: gradeData } = await supabase
      .from('leads')
      .select('website_grade');

    const gradeDistribution = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0
    };

    if (gradeData) {
      for (const row of gradeData) {
        if (row.website_grade in gradeDistribution) {
          gradeDistribution[row.website_grade]++;
        }
      }
    }

    // Get average scores
    const { data: scoreData } = await supabase
      .from('leads')
      .select('overall_score, design_score, seo_score, content_score, social_score');

    let avgScores = {
      overall: 0,
      design: 0,
      seo: 0,
      content: 0,
      social: 0
    };

    if (scoreData && scoreData.length > 0) {
      const sum = scoreData.reduce((acc, row) => ({
        overall: acc.overall + row.overall_score,
        design: acc.design + row.design_score,
        seo: acc.seo + row.seo_score,
        content: acc.content + row.content_score,
        social: acc.social + row.social_score
      }), avgScores);

      avgScores = {
        overall: Math.round((sum.overall / scoreData.length) * 10) / 10,
        design: Math.round((sum.design / scoreData.length) * 10) / 10,
        seo: Math.round((sum.seo / scoreData.length) * 10) / 10,
        content: Math.round((sum.content / scoreData.length) * 10) / 10,
        social: Math.round((sum.social / scoreData.length) * 10) / 10
      };
    }

    // Get leads ready for outreach
    const { count: readyForOutreach } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ready_for_outreach');

    res.json({
      success: true,
      stats: {
        totalLeads: totalLeads || 0,
        gradeDistribution,
        averageScores: avgScores,
        readyForOutreach: readyForOutreach || 0
      }
    });

  } catch (error) {
    console.error('[Stats] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * DELETE /api/leads/:id
 * Delete a single lead by ID
 */
app.delete('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Lead ID is required'
      });
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Delete Lead] Error:', error);
      return res.status(500).json({
        error: 'Failed to delete lead',
        details: error.message
      });
    }

    console.log(`[Delete Lead] Successfully deleted lead ${id}`);

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });

  } catch (error) {
    console.error('[Delete Lead] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * POST /api/leads/batch-delete
 * Delete multiple leads in batch
 *
 * Body:
 * {
 *   "ids": ["id1", "id2", "id3"]
 * }
 */
app.post('/api/leads/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'An array of lead IDs is required'
      });
    }

    console.log(`[Batch Delete] Deleting ${ids.length} leads`);

    const { error, count } = await supabase
      .from('leads')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('[Batch Delete] Error:', error);
      return res.status(500).json({
        error: 'Failed to delete leads',
        details: error.message
      });
    }

    console.log(`[Batch Delete] Successfully deleted ${ids.length} leads`);

    res.json({
      success: true,
      deleted: ids.length,
      failed: 0,
      message: `${ids.length} lead(s) deleted successfully`
    });

  } catch (error) {
    console.error('[Batch Delete] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * Extract lead data from analysis result for database insertion
 * Adapted to match existing leads table schema from website-audit-tool
 */
function extractLeadData(result) {
  // Convert design issues to critiques_visual
  const critiques_visual = result.design_issues
    ?.filter(i => i.category !== 'error')
    ?.map(i => i.description || i.title)
    ?.slice(0, 5) || [];

  // Convert SEO issues to critiques_seo
  const critiques_seo = result.seo_issues
    ?.filter(i => i.category !== 'error')
    ?.map(i => i.description || i.title)
    ?.slice(0, 5) || [];

  // Convert content issues to critiques_basic
  const critiques_basic = result.content_issues
    ?.filter(i => i.category !== 'error')
    ?.map(i => i.description || i.title)
    ?.slice(0, 3) || [];

  // Add social issues to basic critiques
  if (result.social_issues && result.social_issues.length > 0) {
    result.social_issues
      .filter(i => i.category !== 'error')
      .slice(0, 2)
      .forEach(i => critiques_basic.push(i.description || i.title));
  }

  return {
    // Basic info
    url: result.url,
    company_name: result.company_name,
    industry: result.industry,
    city: result.city || null,
    state: result.state || null,

    // Contact info
    contact_email: result.contact_email || null,
    contact_phone: result.contact_phone || null,

    // Scores (round to integers for database)
    overall_score: Math.round(result.overall_score),
    website_grade: result.grade,
    design_score: Math.round(result.design_score),
    seo_score: Math.round(result.seo_score),
    content_score: Math.round(result.content_score),
    social_score: Math.round(result.social_score),

    // Analysis summary
    analysis_summary: result.analysis_summary,

    // Detailed issues (jsonb arrays)
    design_issues: result.design_issues || [],
    seo_issues: result.seo_issues || [],
    content_issues: result.content_issues || [],
    social_issues: result.social_issues || [],

    // Quick wins and outreach
    quick_wins: result.quick_wins || [],
    top_issue: result.top_issue || null,
    one_liner: result.one_liner || null,
    call_to_action: result.call_to_action || null,

    // Tech and performance
    tech_stack: result.tech_stack || null,
    page_load_time: result.page_load_time || null,
    is_mobile_friendly: result.is_mobile_friendly || false,
    has_https: result.has_https || false,

    // Social profiles and metadata
    social_profiles: result.social_profiles || {},
    social_metadata: result.social_metadata || null,
    social_platforms_present: result.social_platforms_present || [],

    // Content insights
    has_blog: result.has_blog || false,
    content_insights: result.content_insights || null,

    // Website metadata
    page_title: result.page_title || null,
    meta_description: result.meta_description || null,

    // Screenshot
    screenshot_url: result.screenshot_url || null,

    // Prospect and project references
    prospect_id: result.prospect_id || null,
    project_id: result.project_id || null,

    // Status
    status: 'ready_for_outreach',

    // Timestamps and costs
    analyzed_at: result.analyzed_at || new Date().toISOString(),
    analysis_cost: result.analysis_cost || null,
    analysis_time: result.analysis_time || null
  };
}

// Start server
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Analysis Engine Server v2.0`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET    /health                  - Health check`);
  console.log(`  POST   /api/analyze-url         - Analyze single URL`);
  console.log(`  POST   /api/analyze             - Analyze prospects (SSE)`);
  console.log(`  GET    /api/leads               - Get analyzed leads`);
  console.log(`  DELETE /api/leads/:id           - Delete a lead`);
  console.log(`  POST   /api/leads/batch-delete  - Delete multiple leads`);
  console.log(`  GET    /api/stats               - Get statistics`);
  console.log('');
  console.log('Ready to analyze websites!');
  console.log('═══════════════════════════════════════════════════════════════');
});

export default app;
