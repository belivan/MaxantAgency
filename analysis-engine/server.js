/**
 * Analysis Engine Server
 *
 * Express server with API endpoints for website analysis
 *
 * Endpoints:
 * - POST /api/analyze - Intelligent multi-page batch analysis
 * - POST /api/analyze-url - Single-page analysis (testing/demo)
 * - GET /api/leads - Get analyzed leads with filters
 * - GET /api/stats - Get analysis statistics
 * - GET /health - Health check
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { analyzeWebsiteIntelligent } from './orchestrator.js';
import { collectAnalysisPrompts } from './shared/prompt-loader.js';
import { saveLocalBackup, markAsUploaded, markAsFailed } from './utils/local-backup.js';

// Load environment variables from root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

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
 * GET /api/prompts/default
 * Get default analysis prompts configuration
 */
app.get('/api/prompts/default', async (req, res) => {
  try {
    const prompts = await collectAnalysisPrompts();

    res.json({
      success: true,
      data: prompts
    });
  } catch (error) {
    console.error('Error loading default prompts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to load default prompts'
    });
  }
});

/**
 * POST /api/analyze-url
 * Analyze a single URL with intelligent multi-page analysis (for testing/demo)
 *
 * Body:
 * {
 *   "url": "https://example.com",
 *   "company_name": "Example Company",
 *   "industry": "restaurant",
 *   "project_id": "uuid" (REQUIRED)
 * }
 */
app.post('/api/analyze-url', async (req, res) => {
  try {
    const { url, company_name, industry, project_id } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required - every lead must belong to a project' });
    }

    console.log(`[Intelligent Analysis] Starting intelligent analysis for ${url}`);

    // Use intelligent multi-page analyzer
    const result = await analyzeWebsiteIntelligent(url, {
      company_name: company_name || 'Unknown Company',
      industry: industry || 'Unknown',
      project_id: project_id  // Required, validation above ensures it exists
    }, {
      onProgress: (progress) => {
        console.log(`[Intelligent Analysis] ${progress.step}: ${progress.message}`);
      }
    });

    if (!result.success) {
      return res.status(500).json({
        error: 'Analysis failed',
        details: result.error
      });
    }

    // Save to database - COMPLETE FIELD SET
    const leadData = {
      // Core information
      url: result.url,
      company_name: result.company_name,
      industry: result.industry,
      project_id: project_id,  // Required
      prospect_id: result.prospect_id || null,

      // Grading & Scores
      overall_score: Math.round(result.overall_score),
      website_grade: result.grade,
      grade_label: result.grade_label || null,
      design_score: Math.round(result.design_score),
      design_score_desktop: Math.round(result.design_score_desktop || result.design_score),
      design_score_mobile: Math.round(result.design_score_mobile || result.design_score),
      seo_score: Math.round(result.seo_score),
      content_score: Math.round(result.content_score),
      social_score: Math.round(result.social_score),
      accessibility_score: Math.round(result.accessibility_score || 50),

      // Lead Scoring (AI-driven qualification)
      lead_priority: result.lead_priority || null,
      lead_priority_reasoning: result.lead_priority_reasoning || null,
      priority_tier: result.priority_tier || null,
      budget_likelihood: result.budget_likelihood || null,
      fit_score: result.fit_score || null,
      quality_gap_score: result.quality_gap_score || null,
      budget_score: result.budget_score || null,
      urgency_score: result.urgency_score || null,
      industry_fit_score: result.industry_fit_score || null,
      company_size_score: result.company_size_score || null,
      engagement_score: result.engagement_score || null,

      // Issues & Analysis Results
      design_issues: result.design_issues || [],
      design_issues_desktop: result.design_issues_desktop || [],
      design_issues_mobile: result.design_issues_mobile || [],
      desktop_critical_issues: result.desktop_critical_issues || 0,
      mobile_critical_issues: result.mobile_critical_issues || 0,
      seo_issues: result.seo_issues || [],
      content_issues: result.content_issues || [],
      social_issues: result.social_issues || [],
      accessibility_issues: result.accessibility_issues || [],
      accessibility_compliance: result.accessibility_compliance || {},
      accessibility_wcag_level: result.accessibility_wcag_level || 'AA',
      quick_wins: result.quick_wins || [],

      // Insights & Recommendations
      top_issue: result.top_issue || null,
      one_liner: result.one_liner || null,
      analysis_summary: result.analysis_summary || null,
      call_to_action: result.call_to_action || null,
      outreach_angle: result.outreach_angle || null,

      // AI Models Used
      seo_analysis_model: result.seo_analysis_model || null,
      content_analysis_model: result.content_analysis_model || null,
      desktop_visual_model: result.desktop_visual_model || null,
      mobile_visual_model: result.mobile_visual_model || null,
      social_analysis_model: result.social_analysis_model || null,
      accessibility_analysis_model: result.accessibility_analysis_model || null,

      // Contact Information
      contact_email: result.contact_email || null,
      contact_phone: result.contact_phone || null,
      contact_name: result.contact_name || null,

      // Technical Metadata
      tech_stack: result.tech_stack || null,
      has_blog: result.has_blog || false,
      has_https: result.has_https || false,
      is_mobile_friendly: result.is_mobile_friendly || false,
      page_load_time: result.page_load_time || null,
      page_title: result.page_title || null,
      meta_description: result.meta_description || null,

      // Screenshots
      screenshot_desktop_url: result.screenshot_desktop_url || null,
      screenshot_mobile_url: result.screenshot_mobile_url || null,

      // Social Media
      social_profiles: result.social_profiles || {},
      social_platforms_present: result.social_platforms_present || [],
      social_metadata: result.social_metadata || {},

      // Content Insights
      content_insights: result.content_insights || {},

      // Business Intelligence
      business_intelligence: result.business_intelligence || {},

      // Crawl & Analysis Metadata
      crawl_metadata: result.crawl_metadata || {},
      pages_discovered: result.intelligent_analysis?.pages_discovered || 0,
      pages_crawled: result.intelligent_analysis?.pages_crawled || 0,
      pages_analyzed: result.intelligent_analysis?.pages_crawled || 0,
      ai_page_selection: result.intelligent_analysis?.ai_page_selection || null,

      // Performance
      analysis_cost: result.analysis_cost || 0,
      analysis_time: result.analysis_time || 0,

      // Comprehensive Discovery Log
      discovery_log: result.discovery_log || {},

      // Timestamps
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save local backup
    let backupPath;
    try {
      backupPath = await saveLocalBackup(result, leadData);
      console.log(`[Intelligent Analysis] Backup saved: ${backupPath}`);
    } catch (backupError) {
      console.error(`[Intelligent Analysis] Failed to save backup:`, backupError);
    }

    // Save to database
    const { data: savedLead, error: saveError } = await supabase
      .from('leads')
      .upsert(leadData, { onConflict: 'url' })
      .select()
      .single();

    if (saveError) {
      console.error(`[Intelligent Analysis] Database save failed:`, saveError);

      if (backupPath) {
        await markAsFailed(backupPath, saveError.message || saveError);
      }

      return res.status(500).json({
        error: 'Database save failed',
        details: saveError.message,
        analysis: result
      });
    }

    console.log(`[Intelligent Analysis] Complete - Grade: ${result.grade}, ID: ${savedLead.id}`);

    if (backupPath) {
      await markAsUploaded(backupPath, savedLead.id);
    }

    res.json({
      success: true,
      result: {
        ...result,
        database_saved: true,
        database_id: savedLead.id
      }
    });

  } catch (error) {
    console.error('[Intelligent Analysis] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * POST /api/analyze
 * Analyze prospects with intelligent multi-page analysis
 *
 * Body:
 * {
 *   "prospect_ids": ["id1", "id2"],
 *   "project_id": "uuid" (REQUIRED),
 *   "custom_prompts": {...} (optional)
 * }
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { prospect_ids, prospects: providedProspects, project_id, custom_prompts } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required - every lead must belong to a project' });
    }

    // Accept either prospect_ids OR prospects array directly
    let prospects;

    if (providedProspects && providedProspects.length > 0) {
      // Mode 1: Direct prospect data (no database needed)
      console.log(`[Intelligent Analysis] Using ${providedProspects.length} provided prospects (no database fetch)`);
      prospects = providedProspects;
    } else if (prospect_ids && prospect_ids.length > 0) {
      // Mode 2: Fetch by IDs from database
      console.log(`[Intelligent Analysis] Fetching ${prospect_ids.length} prospects from database...`);

      // IMPORTANT: Fetch prospects and verify they belong to the specified project
      const { data: fetchedProspects, error: fetchError } = await supabase
        .from('prospects')
        .select('id, company_name, website, industry, project_id')
        .in('id', prospect_ids)
        .not('website', 'is', null);

      if (fetchError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch prospects',
          details: fetchError.message
        });
      }

      if (!fetchedProspects || fetchedProspects.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No prospects found'
        });
      }

      // Validate that all prospects belong to the specified project
      const invalidProspects = fetchedProspects.filter(p => p.project_id !== project_id);
      if (invalidProspects.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot analyze prospects from different projects. All prospects must belong to project: ${project_id}`,
          details: `${invalidProspects.length} prospect(s) belong to different projects`
        });
      }

      prospects = fetchedProspects;
      console.log(`[Intelligent Analysis] Found ${prospects.length} prospects to analyze (all verified to belong to project ${project_id})`);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either prospect_ids or prospects array is required'
      });
    }

    console.log(`[Intelligent Analysis] Starting batch analysis for ${prospects.length} prospects`);

    // Set up Server-Sent Events headers to prevent timeout
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Send headers immediately

    // Helper function to send SSE events
    function sendEvent(eventType, data) {
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    // Send start event
    sendEvent('start', {
      total: prospects.length,
      message: `Starting analysis of ${prospects.length} prospects...`
    });

    // Analyze each prospect with intelligent multi-page analysis
    const results = [];
    let currentIndex = 0;
    for (const prospect of prospects) {
      currentIndex++;
      try {
        console.log(`[Intelligent Analysis] Analyzing ${prospect.company_name || prospect.website}...`);

        // Send progress event
        sendEvent('analyzing', {
          current: currentIndex,
          total: prospects.length,
          company_name: prospect.company_name,
          url: prospect.website
        });

        const result = await analyzeWebsiteIntelligent(prospect.website, {
          company_name: prospect.company_name || 'Unknown Company',
          industry: prospect.industry || 'unknown',
          project_id: project_id  // Required, validation above ensures it exists
        });

        if (result.success) {
          // Prepare lead data for database - COMPLETE FIELD SET
          const leadData = {
            // Core information
            url: result.url,
            company_name: result.company_name,
            industry: result.industry,
            project_id: project_id,  // Required
            prospect_id: prospect.id || null,

            // Grading & Scores
            overall_score: Math.round(result.overall_score),
            website_grade: result.grade,
            grade_label: result.grade_label || null,
            design_score: Math.round(result.design_score),
            design_score_desktop: Math.round(result.design_score_desktop || result.design_score),
            design_score_mobile: Math.round(result.design_score_mobile || result.design_score),
            seo_score: Math.round(result.seo_score),
            content_score: Math.round(result.content_score),
            social_score: Math.round(result.social_score),
            accessibility_score: Math.round(result.accessibility_score || 50),

            // Lead Scoring (AI-driven qualification)
            lead_priority: result.lead_priority || null,
            lead_priority_reasoning: result.lead_priority_reasoning || null,
            priority_tier: result.priority_tier || null,
            budget_likelihood: result.budget_likelihood || null,
            fit_score: result.fit_score || null,
            quality_gap_score: result.quality_gap_score || null,
            budget_score: result.budget_score || null,
            urgency_score: result.urgency_score || null,
            industry_fit_score: result.industry_fit_score || null,
            company_size_score: result.company_size_score || null,
            engagement_score: result.engagement_score || null,

            // Issues & Analysis Results
            design_issues: result.design_issues || [],
            design_issues_desktop: result.design_issues_desktop || [],
            design_issues_mobile: result.design_issues_mobile || [],
            desktop_critical_issues: result.desktop_critical_issues || 0,
            mobile_critical_issues: result.mobile_critical_issues || 0,
            seo_issues: result.seo_issues || [],
            content_issues: result.content_issues || [],
            social_issues: result.social_issues || [],
            accessibility_issues: result.accessibility_issues || [],
            accessibility_compliance: result.accessibility_compliance || {},
            accessibility_wcag_level: result.accessibility_wcag_level || 'AA',
            quick_wins: result.quick_wins || [],

            // Insights & Recommendations
            top_issue: result.top_issue || null,
            one_liner: result.one_liner || null,
            analysis_summary: result.analysis_summary || null,
            call_to_action: result.call_to_action || null,
            outreach_angle: result.outreach_angle || null,

            // AI Models Used
            seo_analysis_model: result.seo_analysis_model || null,
            content_analysis_model: result.content_analysis_model || null,
            desktop_visual_model: result.desktop_visual_model || null,
            mobile_visual_model: result.mobile_visual_model || null,
            social_analysis_model: result.social_analysis_model || null,
            accessibility_analysis_model: result.accessibility_analysis_model || null,

            // Contact Information
            contact_email: result.contact_email || null,
            contact_phone: result.contact_phone || null,
            contact_name: result.contact_name || null,

            // Technical Metadata
            tech_stack: result.tech_stack || null,
            has_blog: result.has_blog || false,
            has_https: result.has_https || false,
            is_mobile_friendly: result.is_mobile_friendly || false,
            page_load_time: result.page_load_time || null,
            page_title: result.page_title || null,
            meta_description: result.meta_description || null,

            // Screenshots
            screenshot_desktop_url: result.screenshot_desktop_url || null,
            screenshot_mobile_url: result.screenshot_mobile_url || null,

            // Social Media
            social_profiles: result.social_profiles || {},
            social_platforms_present: result.social_platforms_present || [],
            social_metadata: result.social_metadata || {},

            // Content Insights
            content_insights: result.content_insights || {},

            // Business Intelligence
            business_intelligence: result.business_intelligence || {},

            // Crawl & Analysis Metadata
            crawl_metadata: result.crawl_metadata || {},
            pages_discovered: result.intelligent_analysis?.pages_discovered || 0,
            pages_crawled: result.intelligent_analysis?.pages_crawled || 0,
            pages_analyzed: result.intelligent_analysis?.pages_crawled || 0,
            ai_page_selection: result.intelligent_analysis?.ai_page_selection || null,

            // Performance
            analysis_cost: result.analysis_cost || 0,
            analysis_time: result.analysis_time || 0,

            // Comprehensive Discovery Log
            discovery_log: result.discovery_log || {},

            // Timestamps
            analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // STEP 1: Save local backup BEFORE attempting database upload
          let backupPath;
          try {
            backupPath = await saveLocalBackup(result, leadData);
            console.log(`[Intelligent Analysis] Local backup saved for ${prospect.company_name}`);
          } catch (backupError) {
            console.error(`[Intelligent Analysis] Failed to save local backup for ${prospect.company_name}:`, backupError);
            // Continue anyway - we'll try to save to database
          }

          // STEP 2: Upload to database
          const { data: savedLead, error: saveError } = await supabase
            .from('leads')
            .upsert(leadData, { onConflict: 'url' })
            .select()
            .single();

          if (saveError) {
            console.error(`[Intelligent Analysis] Failed to save lead ${prospect.website}:`, saveError);

            // STEP 3a: Mark backup as failed
            if (backupPath) {
              await markAsFailed(backupPath, saveError.message || saveError);
              console.log(`[Intelligent Analysis] Backup marked as failed for ${prospect.company_name}`);
            }

            // Send error event
            sendEvent('error', {
              current: currentIndex,
              total: prospects.length,
              company_name: prospect.company_name,
              url: prospect.website,
              error: `Database save failed: ${saveError.message}`
            });
          } else {
            console.log(`[Intelligent Analysis] ✓ ${prospect.company_name}: Grade ${result.grade} (${result.overall_score}/100)`);

            // STEP 3b: Mark backup as successfully uploaded
            if (backupPath) {
              await markAsUploaded(backupPath, savedLead.id);
              console.log(`[Intelligent Analysis] Backup marked as uploaded for ${prospect.company_name}`);
            }

            // Send success event
            sendEvent('success', {
              current: currentIndex,
              total: prospects.length,
              company_name: prospect.company_name,
              url: prospect.website,
              grade: result.grade,
              score: result.overall_score
            });
          }

          results.push({
            success: true,
            prospect_id: prospect.id,
            url: prospect.website,
            company_name: prospect.company_name,
            grade: result.grade,
            score: result.overall_score
          });
        } else {
          console.error(`[Intelligent Analysis] ✗ ${prospect.company_name}: ${result.error}`);
          // Send error event
          sendEvent('error', {
            current: currentIndex,
            total: prospects.length,
            company_name: prospect.company_name,
            url: prospect.website,
            error: result.error
          });
          results.push({
            success: false,
            prospect_id: prospect.id,
            url: prospect.website,
            company_name: prospect.company_name,
            error: result.error
          });
        }
      } catch (error) {
        console.error(`[Intelligent Analysis] ✗ ${prospect.company_name}: ${error.message}`);
        // Send error event
        sendEvent('error', {
          current: currentIndex,
          total: prospects.length,
          company_name: prospect.company_name,
          url: prospect.website,
          error: error.message
        });
        results.push({
          success: false,
          prospect_id: prospect.id,
          url: prospect.website,
          company_name: prospect.company_name,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[Intelligent Analysis] Completed: ${successCount}/${prospects.length} successful`);

    // Send complete event
    sendEvent('complete', {
      success: true,
      total: prospects.length,
      successful: successCount,
      failed: prospects.length - successCount,
      results
    });

    // End the SSE stream
    res.end();

  } catch (error) {
    console.error('[Intelligent Analysis] Error:', error);

    // If headers already sent (SSE started), send error event
    if (res.headersSent) {
      sendEvent('fatal', {
        success: false,
        error: 'Internal server error',
        details: error.message
      });
      res.end();
    } else {
      // Otherwise send regular error response
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
});

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
 * POST /api/reports/generate
 * Generate a website audit report for a lead
 *
 * Body:
 * {
 *   "lead_id": "uuid",
 *   "format": "markdown" | "html",  // Default: "markdown"
 *   "sections": ["all"]              // For markdown only
 * }
 */
app.post('/api/reports/generate', async (req, res) => {
  try {
    const { lead_id, format = 'markdown', sections = ['all'] } = req.body;

    if (!lead_id) {
      return res.status(400).json({
        error: 'lead_id is required'
      });
    }

    // Fetch lead from database
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (fetchError || !lead) {
      return res.status(404).json({
        error: 'Lead not found',
        details: fetchError?.message
      });
    }

    // Generate report
    const { generateReport, generateStoragePath } = await import('./reports/report-generator.js');
    const { uploadReport, saveReportMetadata } = await import('./reports/storage/supabase-storage.js');

    const report = await generateReport(lead, { format, sections });

    // Upload to Supabase Storage
    const storagePath = generateStoragePath(lead, format);

    // Determine content type based on format
    const contentTypeMap = {
      'markdown': 'text/markdown',
      'html': 'text/html',
      'pdf': 'application/pdf',
      'json': 'application/json'
    };
    const contentType = contentTypeMap[format] || 'text/plain';

    const uploadResult = await uploadReport(report.content, storagePath, contentType);

    // Save metadata to database
    const reportRecord = await saveReportMetadata({
      lead_id,
      project_id: lead.project_id,
      report_type: 'website_audit',
      format,
      storage_path: uploadResult.path,
      storage_bucket: 'reports',
      file_size_bytes: Buffer.byteLength(report.content, 'utf8'),
      company_name: lead.company_name,
      website_url: lead.url,
      overall_score: lead.overall_score,
      website_grade: lead.website_grade,
      config: { sections },
      status: 'completed'
    });

    res.json({
      success: true,
      report: {
        id: reportRecord.id,
        storage_path: uploadResult.path,
        metadata: report.metadata
      }
    });

  } catch (error) {
    console.error('[Report Generation] Error:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      details: error.message
    });
  }
});

/**
 * GET /api/reports/:id/download
 * Get download URL for a report
 */
app.get('/api/reports/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    const { getReportById, getSignedUrl, incrementDownloadCount } = await import('./reports/storage/supabase-storage.js');

    // Get report metadata
    const report = await getReportById(id);

    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    // Get signed URL (valid for 1 hour)
    const signedUrl = await getSignedUrl(report.storage_path, 3600);

    // Increment download count
    await incrementDownloadCount(id);

    res.json({
      success: true,
      download_url: signedUrl,
      report: {
        id: report.id,
        company_name: report.company_name,
        format: report.format,
        generated_at: report.generated_at
      }
    });

  } catch (error) {
    console.error('[Report Download] Error:', error);
    res.status(500).json({
      error: 'Failed to get download URL',
      details: error.message
    });
  }
});

/**
 * GET /api/reports/lead/:lead_id
 * Get all reports for a lead
 */
app.get('/api/reports/lead/:lead_id', async (req, res) => {
  try {
    const { lead_id } = req.params;

    const { getReportsByLeadId } = await import('./reports/storage/supabase-storage.js');

    const reports = await getReportsByLeadId(lead_id);

    res.json({
      success: true,
      reports,
      count: reports.length
    });

  } catch (error) {
    console.error('[Get Reports] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch reports',
      details: error.message
    });
  }
});

/**
 * DELETE /api/reports/:id
 * Delete a report
 */
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { getReportById, deleteReport } = await import('./reports/storage/supabase-storage.js');

    // Get report metadata
    const report = await getReportById(id);

    if (!report) {
      return res.status(404).json({
        error: 'Report not found'
      });
    }

    // Delete from storage
    await deleteReport(report.storage_path);

    // Delete metadata from database
    const { error: deleteError } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error(`Failed to delete report metadata: ${deleteError.message}`);
    }

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('[Delete Report] Error:', error);
    res.status(500).json({
      error: 'Failed to delete report',
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Analysis Engine Server v2.0`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET    /health                      - Health check`);
  console.log(`  POST   /api/analyze-url             - Analyze single URL`);
  console.log(`  POST   /api/analyze                 - Analyze prospects (SSE)`);
  console.log(`  GET    /api/leads                   - Get analyzed leads`);
  console.log(`  DELETE /api/leads/:id               - Delete a lead`);
  console.log(`  POST   /api/leads/batch-delete      - Delete multiple leads`);
  console.log(`  GET    /api/stats                   - Get statistics`);
  console.log(`  POST   /api/reports/generate        - Generate website audit report`);
  console.log(`  GET    /api/reports/:id/download    - Get report download URL`);
  console.log(`  GET    /api/reports/lead/:lead_id   - Get all reports for a lead`);
  console.log(`  DELETE /api/reports/:id             - Delete a report`);
  console.log('');
  console.log('Ready to analyze websites!');
  console.log('═══════════════════════════════════════════════════════════════');
});

export default app;
