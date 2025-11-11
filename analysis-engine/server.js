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
import { dirname, resolve, join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import { analyzeWebsiteIntelligent } from './orchestrator-refactored.js';
import { collectAnalysisPrompts } from './shared/prompt-loader.js';
import { saveLocalBackup, markAsUploaded, markAsFailed } from './utils/local-backup.js';
import { analyzeBenchmark } from './services/benchmark-analyzer.js';
import { incrementAnalysisCount } from './optimization/services/optimization-scheduler.js';
import { enqueueWork, cancelWork, getJob, getQueueStatus } from '../database-tools/shared/work-queue.js';
import { analyzeProspects, getAnalysisStatus, cancelAnalysis, getOverallQueueStatus } from './routes/analysis-queue-endpoints.js';

// Load environment variables from root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// FIX #5: Request deduplication - prevent concurrent analyses of same URL
const activeAnalyses = new Map(); // URL -> { promise, startTime, type }

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
 * POST /api/analyze-benchmark
 *
 * Analyze a website as a benchmark (extracts SUCCESS PATTERNS, not problems)
 *
 * Body: {
 *   "url": "https://heartland.com",
 *   "company_name": "Heartland Dental",
 *   "industry": "dental",
 *   "benchmark_tier": "national" | "regional" | "local",
 *   "google_rating": 4.7,
 *   "google_review_count": 500,
 *   "location_city": "Effingham",
 *   "location_state": "IL",
 *   "awards": [{award: "Best Dental Support Organization 2024"}],
 *   "notes": "Largest DSO in the US",
 *   "force": false
 * }
 */
// Helper function to extract params from both GET and POST
function getBenchmarkParams(req) {
  if (req.method === 'GET') {
    return {
      url: req.query.url,
      company_name: req.query.company_name,
      industry: req.query.industry,
      benchmark_tier: req.query.benchmark_tier,
      google_rating: req.query.google_rating ? parseFloat(req.query.google_rating) : undefined,
      google_review_count: req.query.google_review_count ? parseInt(req.query.google_review_count) : undefined,
      location_city: req.query.location_city,
      location_state: req.query.location_state,
      awards: req.query.awards ? JSON.parse(req.query.awards) : undefined,
      notes: req.query.notes,
      force: req.query.force === 'true'
    };
  } else {
    return req.body;
  }
}

// Tier mapping: UI labels -> database tiers
const TIER_MAPPING = {
  'aspirational': 'national',    // Top performers, award-winning
  'competitive': 'regional',     // Industry standard, top local
  'baseline': 'local',           // Entry level, direct competitors
  'national': 'national',        // Allow direct database values too
  'regional': 'regional',
  'local': 'local',
  'manual': 'manual'
};

const VALID_TIERS = ['national', 'regional', 'local', 'manual'];

// Support both GET (for SSE with EventSource) and POST (for backward compatibility)
app.all('/api/analyze-benchmark', async (req, res) => {
  try {
    const {
      url,
      company_name,
      industry,
      benchmark_tier,
      google_rating,
      google_review_count,
      location_city,
      location_state,
      awards,
      notes,
      force
    } = getBenchmarkParams(req);

    // Validation
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }
    if (!company_name) {
      return res.status(400).json({ error: 'company_name is required' });
    }
    if (!industry) {
      return res.status(400).json({ error: 'industry is required' });
    }

    // Tier validation and mapping
    const uiTier = benchmark_tier || 'competitive';  // Default to 'competitive' (maps to 'regional')
    const databaseTier = TIER_MAPPING[uiTier];

    if (!databaseTier) {
      return res.status(400).json({
        error: `Invalid benchmark_tier: "${uiTier}". Must be one of: aspirational, competitive, baseline, national, regional, local, manual`
      });
    }

    console.log(`[Benchmark Analysis] Analyzing ${company_name} as benchmark...`);

    // FIX #5: Check if this URL is already being analyzed
    const normalizedUrl = url.toLowerCase().replace(/\/$/, ''); // Normalize for comparison
    if (activeAnalyses.has(normalizedUrl)) {
      const existing = activeAnalyses.get(normalizedUrl);
      const elapsedSeconds = Math.round((Date.now() - existing.startTime) / 1000);
      console.log(`⚠️  [Deduplication] URL already being analyzed (${elapsedSeconds}s elapsed)`);
      console.log(`   Returning 409 Conflict - wait for existing analysis to complete`);
      return res.status(409).json({
        error: 'Analysis already in progress',
        message: `This URL is currently being analyzed. Please wait for completion (${elapsedSeconds}s elapsed).`,
        elapsed_seconds: elapsedSeconds
      });
    }

    // Set up Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Helper function to send SSE events
    function sendEvent(eventType, data) {
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    // Send start event
    sendEvent('start', {
      company_name,
      url,
      message: `Starting benchmark analysis for ${company_name}...`
    });

    // Progress callback for real-time updates
    let progressCount = 10;
    const onProgress = (message, phase, step) => {
      progressCount = Math.min(progressCount + 10, 90);
      sendEvent('analyzing', {
        current: progressCount,
        total: 100,
        phase,
        step,
        message
      });
    };

    // FIX #5: Register this analysis to prevent duplicates
    activeAnalyses.set(normalizedUrl, {
      startTime: Date.now(),
      type: 'benchmark',
      company_name
    });
    console.log(`🔒 [Deduplication] Registered analysis for ${normalizedUrl}`);

    try {
      // Analyze the benchmark with progress callback
      const result = await analyzeBenchmark({
        company_name,
        website_url: url,
        industry,
        benchmark_tier: databaseTier,  // Use mapped and validated database tier
        google_rating,
        google_review_count,
        location_city,
        location_state,
        awards,
        notes,
        source: 'api'
      }, {
        force: force || false,
        onProgress
      });

      // Send final event
      if (result.success) {
        sendEvent('complete', {
          success: true,
          benchmark: result.benchmark
        });
      } else {
        sendEvent('error', {
          message: result.error || 'Analysis failed',
          error: result.error
        });
      }

      // End the SSE stream
      res.end();

    } catch (error) {
      console.error('[Benchmark Analysis] Error:', error);

      // If headers already sent (SSE started), send error event
      if (res.headersSent) {
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ message: 'Internal server error', error: error.message })}\n\n`);
        res.end();
      } else {
        // Otherwise send regular error response
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
    } finally {
      // FIX #5: Always clean up the lock when analysis completes (success or error)
      if (activeAnalyses.has(normalizedUrl)) {
        const elapsed = Date.now() - activeAnalyses.get(normalizedUrl).startTime;
        activeAnalyses.delete(normalizedUrl);
        console.log(`🔓 [Deduplication] Unregistered analysis for ${normalizedUrl} (${Math.round(elapsed / 1000)}s)`);
      }
    }
  } catch (error) {
    console.error('[Benchmark Analysis] Error:', error);

    // If headers already sent (SSE started), send error event
    if (res.headersSent) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: 'Internal server error', error: error.message })}\n\n`);
      res.end();
    } else {
      // Otherwise send regular error response
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
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
 *   "project_id": "uuid" (REQUIRED),
 *   "enable_deduplication": boolean (optional, default: false),
 *   "enable_qa_validation": boolean (optional, default: false),
 *   "enable_ai_grading": boolean (optional, default: false),
 *   "enable_cross_page_context": boolean (optional, default: false),
 *   "enable_cross_analyzer_context": boolean (optional, default: false)
 * }
 */
app.post('/api/analyze-url', async (req, res) => {
  try {
    const {
      url,
      company_name,
      industry,
      project_id,
      custom_prompts,
      max_pages,
      enable_deduplication,
      enable_qa_validation,
      enable_ai_grading,
      enable_cross_page_context,
      enable_cross_analyzer_context
    } = req.body;

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
      customPrompts: custom_prompts || undefined,
      maxPagesPerModule: max_pages,
      // Use environment variables as defaults for A/B testing toggles
      enableDeduplication: enable_deduplication ?? (process.env.ENABLE_ISSUE_DEDUPLICATION === 'true'),
      enableQaValidation: enable_qa_validation ?? (process.env.ENABLE_QA_VALIDATION === 'true'),
      enableAiGrading: enable_ai_grading ?? (process.env.USE_AI_GRADING === 'true'),
      enableCrossPageContext: enable_cross_page_context ?? (process.env.ENABLE_CROSS_PAGE_CONTEXT === 'true'),
      enableCrossAnalyzerContext: enable_cross_analyzer_context ?? (process.env.ENABLE_CROSS_ANALYZER_CONTEXT === 'true'),
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
    // Helper function to safely round scores with NaN validation
    const safeRoundScore = (score, fallback = 50, fieldName = 'score') => {
      if (score == null || isNaN(score) || typeof score !== 'number') {
        console.warn(`[Intelligent Analysis] WARNING: ${fieldName} invalid (${score}, type: ${typeof score}) for ${result.company_name || result.url}, using fallback value of ${fallback}`);
        return fallback;
      }
      return Math.round(score);
    };

    // Helper function to validate screenshot URLs/paths
    const validateScreenshotUrl = (url, fieldName) => {
      if (typeof url === 'string' && url.length > 0) {
        // Check if it's a valid URL or file path
        if (url.startsWith('http://') || url.startsWith('https://') ||
            url.startsWith('/') || url.includes('\\') ||
            url.match(/^[a-zA-Z]:/)) {
          return url;
        }
        console.warn(`[Intelligent Analysis] Invalid ${fieldName} format: ${url}`);
      }
      return null;
    };

    const leadData = {
      // Core information
      url: result.url,
      company_name: result.company_name,
      industry: result.industry,
      project_id: project_id,  // Required
      prospect_id: result.prospect_id || null,

      // Grading & Scores (with NaN validation)
      overall_score: safeRoundScore(result.overall_score, 50, 'overall_score'),
      website_grade: result.grade,
      design_score: safeRoundScore(result.design_score, 50, 'design_score'),
      design_score_desktop: safeRoundScore(result.design_score_desktop || result.design_score, 50, 'design_score_desktop'),
      design_score_mobile: safeRoundScore(result.design_score_mobile || result.design_score, 50, 'design_score_mobile'),
      seo_score: safeRoundScore(result.seo_score, 50, 'seo_score'),
      content_score: safeRoundScore(result.content_score, 50, 'content_score'),
      social_score: safeRoundScore(result.social_score, 50, 'social_score'),
      accessibility_score: safeRoundScore(result.accessibility_score || 50, 50, 'accessibility_score'),

      // Grading weights (from AI grader)
      weights: result.weights || null,
      weight_reasoning: result.weight_reasoning || null,

      // Design tokens (extracted from crawl)
      design_tokens_desktop: result.design_tokens_desktop || null,
      design_tokens_mobile: result.design_tokens_mobile || null,

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

      // Top Issues Selection (AI-powered pyramid filtering)
      top_issues: result.top_issues || [],
      top_issues_summary: result.top_issues_summary || null,
      top_issues_selection_strategy: result.top_issues_selection_strategy || null,
      top_issues_selection_cost: result.top_issues_selection_cost || 0,
      top_issues_selection_model: result.top_issues_selection_model || null,
      total_issues_count: result.total_issues_count || 0,
      high_critical_issues_count: result.high_critical_issues_count || 0,

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

      // Screenshots (validate and ensure we don't save buffers - only valid URLs/paths)
      screenshot_desktop_url: validateScreenshotUrl(result.screenshot_desktop_url, 'screenshot_desktop_url'),
      screenshot_mobile_url: validateScreenshotUrl(result.screenshot_mobile_url, 'screenshot_mobile_url'),
      screenshots_manifest: result.screenshots_manifest || null,

      // Performance Metrics (from PageSpeed Insights & Chrome UX Report)
      performance_metrics_pagespeed: result.performance_metrics_pagespeed || null,
      performance_metrics_crux: result.performance_metrics_crux || null,
      performance_issues: result.performance_issues || [],
      performance_score_mobile: result.performance_score_mobile ? safeRoundScore(result.performance_score_mobile, null, 'performance_score_mobile') : null,
      performance_score_desktop: result.performance_score_desktop ? safeRoundScore(result.performance_score_desktop, null, 'performance_score_desktop') : null,
      performance_api_errors: result.performance_api_errors || [],

      // Social Media
      social_profiles: result.social_profiles || {},
      social_platforms_present: result.social_platforms_present || [],
      social_metadata: result.social_metadata || {},

      // Content Insights
      content_insights: result.content_insights || {},

      // Business Intelligence
      business_intelligence: result.business_intelligence || {},

      // QA Validation Metadata
      validation_metadata: result.validation_metadata || null,

      // Benchmark Comparison Data
      matched_benchmark_id: result.matched_benchmark?.id || null,
      matched_benchmark: result.matched_benchmark || null,

      // Crawl & Analysis Metadata (preserve detailed page data for reports)
      crawl_metadata: result.crawl_metadata
        ? {
            ...result.crawl_metadata,
            failed_pages: result.crawl_metadata.failed_pages || []
          }
        : {},
      pages_discovered: result.crawl_metadata?.pages_discovered || 0,
      pages_crawled: result.crawl_metadata?.pages_crawled || 0,
      pages_analyzed: result.crawl_metadata?.pages_analyzed || 0,
      ai_page_selection: result.ai_page_selection || null,

      // Performance
      analysis_cost: result.analysis_cost || 0,
      cost_breakdown: result.cost_breakdown || null,
      analysis_time: result.analysis_time || 0,

      // Discovery Log (simplified - full data is in backup)
      discovery_log: result.discovery_log ? {
        totalPages: result.discovery_log.totalPages || 0,
        sources: result.discovery_log.sources || []
      } : {},

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

    // Track analysis counts for optimization system (non-blocking)
    Promise.all([
      incrementAnalysisCount('unified-visual-analyzer'),
      incrementAnalysisCount('unified-technical-analyzer'),
      incrementAnalysisCount('social-analyzer'),
      incrementAnalysisCount('accessibility-analyzer')
    ]).catch(error => {
      console.warn('[Optimization] Failed to increment analysis counts:', error.message);
    });

    // NOTE: Auto-report generation has been moved to ReportEngine microservice
    // To generate a report, make a POST request to http://localhost:3003/api/generate
    let reportInfo = null;

    res.json({
      success: true,
      result: {
        ...result,
        database_saved: true,
        database_id: savedLead.id,
        report: reportInfo
      }
    });

  } catch (error) {
    console.error('[Intelligent Analysis] Error:', error);

    // Check if error is due to bot protection
    const isBotProtected = error.message && error.message.toLowerCase().includes('bot protection');

    if (isBotProtected) {
      return res.status(422).json({
        error: 'Website is bot-protected and cannot be analyzed',
        details: error.message,
        bot_protected: true
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * ==================== NEW QUEUE-BASED ENDPOINTS ====================
 * These use the universal work queue for better concurrency management
 * and async processing with job IDs
 * ==================================================================
 */

// POST /api/analyze - Queue prospects for analysis
app.post('/api/analyze', analyzeProspects);

// GET /api/analysis-status - Get status of queued/running/completed analyses
app.get('/api/analysis-status', getAnalysisStatus);

// POST /api/cancel-analysis - Cancel queued analyses
app.post('/api/cancel-analysis', cancelAnalysis);

// GET /api/queue-status - Get overall queue status
app.get('/api/queue-status', getOverallQueueStatus);

/**
 * ==================== LEGACY ENDPOINT ====================
 * POST /api/analyze-legacy
 * OLD SSE-based batch analysis (DEPRECATED - use /api/analyze instead)
 *
 * This endpoint is kept for backward compatibility but should not be used.
 * It uses the old blocking SSE approach with batching logic.
 *
 * MIGRATION: Use /api/analyze (queue-based) instead
 * =======================================================
 */
app.post('/api/analyze-legacy', async (req, res) => {
  try {
    const { prospect_ids, prospects: providedProspects, project_id, custom_prompts } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required - every lead must belong to a project' });
    }

    // Accept either prospect_ids OR prospects array directly
    let prospects;
    let missingIds = []; // Track prospect IDs that weren't found in database

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
        .select('id, company_name, website, industry, city, state, address, contact_email, contact_phone, contact_name, description, services, social_profiles, social_metadata, icp_match_score, google_rating, google_review_count, most_recent_review_date, website_status')
        .in('id', prospect_ids)
        .not('website', 'is', null);

      if (fetchError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch prospects',
          details: fetchError.message
        });
      }

      // Track which prospect IDs were not found
      const foundIds = new Set((fetchedProspects || []).map(p => p.id));
      missingIds = prospect_ids.filter(id => !foundIds.has(id));

      if (missingIds.length > 0) {
        console.warn(`[Intelligent Analysis] ${missingIds.length} prospect(s) not found in database:`, missingIds);
      }

      // Only fail if ALL prospects are missing
      if (!fetchedProspects || fetchedProspects.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No prospects found',
          details: `None of the ${prospect_ids.length} requested prospect(s) were found in the database`,
          missing_prospect_ids: missingIds
        });
      }

      // Look up project assignments via project_prospects join table
      const { data: assignments, error: assignmentError } = await supabase
        .from('project_prospects')
        .select('prospect_id, project_id, status, notes, custom_score, discovery_query, discovery_time_ms, discovery_cost_usd, run_id')
        .in('prospect_id', prospect_ids)
        .eq('project_id', project_id);

      if (assignmentError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to verify prospect project assignments',
          details: assignmentError.message
        });
      }

      const assignmentByProspect = new Map((assignments || []).map(row => [row.prospect_id, row]));
      const assignedProspects = new Set(assignmentByProspect.keys());

      // Ensure every fetched prospect is assigned to the requested project
      const unassignedProspects = fetchedProspects.filter(p => !assignedProspects.has(p.id));
      if (unassignedProspects.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot analyze prospects from different projects. All prospects must belong to project: ${project_id}`,
          details: `${unassignedProspects.length} prospect(s) missing project assignment for this project`
        });
      }

      // Attach verified project assignment before analysis runs
      prospects = fetchedProspects.map(p => ({
        ...p,
        project_id,
        project_assignment: assignmentByProspect.get(p.id) || null
      }));
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
      requested: prospect_ids ? prospect_ids.length : prospects.length,
      missing: missingIds.length,
      message: `Starting analysis of ${prospects.length} prospects...`
    });

    // Send warning events for any missing prospects
    if (missingIds.length > 0) {
      for (const missingId of missingIds) {
        sendEvent('warning', {
          type: 'missing_prospect',
          prospect_id: missingId,
          message: `Prospect ${missingId} not found in database and will be skipped`
        });
      }
    }

    // Analyze prospects with batched concurrent processing
    const results = [];
    let currentIndex = 0;

    // Get concurrency setting from environment (defaults to 3)
    const CONCURRENT_ANALYSES = parseInt(process.env.CONCURRENT_ANALYSES || '3');
    console.log(`[Intelligent Analysis] Processing prospects with concurrency: ${CONCURRENT_ANALYSES}`);

    // Process prospects in batches
    for (let i = 0; i < prospects.length; i += CONCURRENT_ANALYSES) {
      const batch = prospects.slice(i, i + CONCURRENT_ANALYSES);
      console.log(`[Intelligent Analysis] Starting batch ${Math.floor(i / CONCURRENT_ANALYSES) + 1}/${Math.ceil(prospects.length / CONCURRENT_ANALYSES)} (${batch.length} prospects)`);

      // Process batch concurrently using Promise.allSettled for error isolation
      const batchResults = await Promise.allSettled(
        batch.map(async (prospect, batchIndex) => {
          const prospectIndex = i + batchIndex + 1;

          try {
            console.log(`[Intelligent Analysis] Analyzing ${prospect.company_name || prospect.website}...`);

            // Send progress event
            sendEvent('analyzing', {
              current: prospectIndex,
              total: prospects.length,
              company_name: prospect.company_name,
              company: prospect.company_name || prospect.website,
              url: prospect.website
            });

            const assignment = prospect.project_assignment || {};
            const result = await analyzeWebsiteIntelligent(prospect.website, {
          company_name: prospect.company_name || 'Unknown Company',
          industry: prospect.industry || 'unknown',
          project_id: project_id,  // Required, validation above ensures it exists
          prospect_id: prospect.id || null,
          city: prospect.city || null,
          state: prospect.state || null,
          address: prospect.address || null,
          contact_email: prospect.contact_email || null,
          contact_phone: prospect.contact_phone || null,
          contact_name: prospect.contact_name || null,
          project_notes: assignment.notes || null,
          project_status: assignment.status || null,
          custom_score: assignment.custom_score || null,
          discovery_query: assignment.discovery_query || null,

          // Prospect intelligence data (NEW)
          description: prospect.description || null,
          services: prospect.services || null,
          google_rating: prospect.google_rating || null,
          google_review_count: prospect.google_review_count || null,
          icp_match_score: prospect.icp_match_score || null,
          most_recent_review_date: prospect.most_recent_review_date || null,
          website_status: prospect.website_status || null,
          social_profiles_from_prospect: prospect.social_profiles || null,
          social_metadata_from_prospect: prospect.social_metadata || null
        }, {
          customPrompts: custom_prompts || undefined
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
            city: result.city || prospect.city || null,
            state: result.state || prospect.state || null,

            // Grading & Scores
            overall_score: Math.round(result.overall_score),
            website_grade: result.grade,
            design_score: Math.round(result.design_score),
            design_score_desktop: Math.round(result.design_score_desktop || result.design_score),
            design_score_mobile: Math.round(result.design_score_mobile || result.design_score),
            seo_score: Math.round(result.seo_score),
            content_score: Math.round(result.content_score),
            social_score: Math.round(result.social_score),
            accessibility_score: Math.round(result.accessibility_score || 50),

            // Grading weights (from AI grader)
            weights: result.weights || null,
            weight_reasoning: result.weight_reasoning || null,

            // Design tokens (extracted from crawl)
            design_tokens_desktop: result.design_tokens_desktop || null,
            design_tokens_mobile: result.design_tokens_mobile || null,

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

            // Top Issues Selection (AI-powered pyramid filtering)
            top_issues: result.top_issues || [],
            top_issues_summary: result.top_issues_summary || null,
            top_issues_selection_strategy: result.top_issues_selection_strategy || null,
            top_issues_selection_cost: result.top_issues_selection_cost || 0,
            top_issues_selection_model: result.top_issues_selection_model || null,
            total_issues_count: result.total_issues_count || 0,
            high_critical_issues_count: result.high_critical_issues_count || 0,

            // AI Models Used
            seo_analysis_model: result.seo_analysis_model || null,
            content_analysis_model: result.content_analysis_model || null,
            desktop_visual_model: result.desktop_visual_model || null,
            mobile_visual_model: result.mobile_visual_model || null,
            social_analysis_model: result.social_analysis_model || null,
            accessibility_analysis_model: result.accessibility_analysis_model || null,

            // Contact Information
            contact_email: result.contact_email || prospect.contact_email || null,
            contact_phone: result.contact_phone || prospect.contact_phone || null,
            contact_name: result.contact_name || prospect.contact_name || null,

            // Technical Metadata
            tech_stack: result.tech_stack || null,
            has_blog: result.has_blog || false,
            has_https: result.has_https || false,
            is_mobile_friendly: result.is_mobile_friendly || false,
            page_load_time: result.page_load_time || null,
            page_title: result.page_title || null,
            meta_description: result.meta_description || null,

            // Screenshots (ensure we don't save buffers - only URLs/paths)
            screenshot_desktop_url: typeof result.screenshot_desktop_url === 'string' ? result.screenshot_desktop_url : null,
            screenshot_mobile_url: typeof result.screenshot_mobile_url === 'string' ? result.screenshot_mobile_url : null,
            screenshots_manifest: result.screenshots_manifest || null,

            // Performance Metrics (from PageSpeed Insights & Chrome UX Report)
            performance_metrics_pagespeed: result.performance_metrics_pagespeed || null,
            performance_metrics_crux: result.performance_metrics_crux || null,
            performance_issues: result.performance_issues || [],
            performance_score_mobile: result.performance_score_mobile ? Math.round(result.performance_score_mobile) : null,
            performance_score_desktop: result.performance_score_desktop ? Math.round(result.performance_score_desktop) : null,
            performance_api_errors: result.performance_api_errors || [],

            // Social Media
            social_profiles: result.social_profiles || {},
            social_platforms_present: result.social_platforms_present || [],
            social_metadata: result.social_metadata || {},

            // Content Insights
            content_insights: result.content_insights || {},

            // Business Intelligence
            business_intelligence: result.business_intelligence || {},

            // QA Validation Metadata
            validation_metadata: result.validation_metadata || null,

            // Benchmark Comparison Data
            matched_benchmark_id: result.matched_benchmark?.id || null,
            matched_benchmark: result.matched_benchmark || null,

            // Crawl & Analysis Metadata (simplified to avoid timeout)
            crawl_metadata: result.crawl_metadata
              ? {
                  ...result.crawl_metadata,
                  failed_pages: result.crawl_metadata.failed_pages || []
                }
              : {},
            pages_discovered: result.crawl_metadata?.pages_discovered || 0,
            pages_crawled: result.crawl_metadata?.pages_crawled || 0,
            pages_analyzed: result.crawl_metadata?.pages_analyzed || 0,
            ai_page_selection: result.ai_page_selection || null,

            // Performance
            analysis_cost: result.analysis_cost || 0,
            cost_breakdown: result.cost_breakdown || null,
            analysis_time: result.analysis_time || 0,

            // Discovery Log (simplified - full data is in backup)
            discovery_log: result.discovery_log ? {
              totalPages: result.discovery_log.totalPages || 0,
              sources: result.discovery_log.sources || [],
              project_assignment: assignment ? {
                status: assignment.status || null,
                notes: assignment.notes || null,
                custom_score: assignment.custom_score || null,
                discovery_query: assignment.discovery_query || null,
                discovery_time_ms: assignment.discovery_time_ms || null,
                discovery_cost_usd: assignment.discovery_cost_usd || null,
                run_id: assignment.run_id || null
              } : null
            } : {},

            // Timestamps
            analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // VALIDATION: Ensure required fields are present before database save
          if (!leadData.project_id) {
            console.error(`[Intelligent Analysis] CRITICAL: project_id is missing for ${prospect.company_name || prospect.website}`);
            sendEvent('error', {
              current: prospectIndex,
              total: prospects.length,
              company_name: prospect.company_name,
              company: prospect.company_name || prospect.website,
              url: prospect.website,
              error: 'Missing project_id - lead not saved to database'
            });
            return { success: false, prospect_id: prospect.id, url: prospect.website, error: 'Missing project_id' };
          }

          // Fix overall_score if it's NaN, null, or undefined
          if (leadData.overall_score == null || isNaN(leadData.overall_score) || typeof leadData.overall_score !== 'number') {
            console.warn(`[Intelligent Analysis] WARNING: overall_score invalid (${leadData.overall_score}, type: ${typeof leadData.overall_score}) for ${prospect.company_name || prospect.website}, using fallback value of 50`);
            leadData.overall_score = 50; // Fallback to middle score
          }

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
              current: prospectIndex,
              total: prospects.length,
              company_name: prospect.company_name,
              company: prospect.company_name || prospect.website,
              url: prospect.website,
              error: `Database save failed: ${saveError.message}`
            });

            return {
              success: false,
              prospect_id: prospect.id,
              url: prospect.website,
              company_name: prospect.company_name,
              company: prospect.company_name || prospect.website,
              error: `Database save failed: ${saveError.message}`
            };
          } else {
            console.log(`[Intelligent Analysis]  ${prospect.company_name}: Grade ${result.grade} (${result.overall_score}/100)`);

            // STEP 3b: Mark backup as successfully uploaded
            if (backupPath) {
              await markAsUploaded(backupPath, savedLead.id);
              console.log(`[Intelligent Analysis] Backup marked as uploaded for ${prospect.company_name}`);
            }

            // Track analysis counts for optimization system (non-blocking)
            Promise.all([
              incrementAnalysisCount('unified-visual-analyzer'),
              incrementAnalysisCount('unified-technical-analyzer'),
              incrementAnalysisCount('social-analyzer'),
              incrementAnalysisCount('accessibility-analyzer')
            ]).catch(error => {
              console.warn('[Optimization] Failed to increment analysis counts:', error.message);
            });

            // NOTE: Auto-report generation has been moved to ReportEngine microservice
            // To generate reports, call POST http://localhost:3003/api/generate

            // Send success event
            sendEvent('success', {
              current: prospectIndex,
              total: prospects.length,
              company_name: prospect.company_name,
              company: prospect.company_name || prospect.website,
              url: prospect.website,
              grade: result.grade,
              score: result.overall_score
            });

            return {
              success: true,
              prospect_id: prospect.id,
              url: prospect.website,
              company_name: prospect.company_name,
              company: prospect.company_name || prospect.website,
              grade: result.grade,
              score: result.overall_score
            };
          }
        } else {
          console.error(`[Intelligent Analysis]  ${prospect.company_name}: ${result.error}`);
          // Send error event
          sendEvent('error', {
            current: prospectIndex,
            total: prospects.length,
            company_name: prospect.company_name,
            company: prospect.company_name || prospect.website,
            url: prospect.website,
            error: result.error
          });

          return {
            success: false,
            prospect_id: prospect.id,
            url: prospect.website,
            company_name: prospect.company_name,
            company: prospect.company_name || prospect.website,
            error: result.error
          };
        }
      } catch (error) {
        console.error(`[Intelligent Analysis]  ${prospect.company_name}: ${error.message}`);

        // ⚠️ CRITICAL: Check if error is due to bot protection
        const isBotProtected = error.message && error.message.toLowerCase().includes('bot protection');

        if (isBotProtected && prospect.id) {
          // Update prospect record to flag as bot-protected
          console.warn(`[Bot Protection] Flagging prospect ${prospect.company_name} as bot-protected in database...`);

          try {
            const { error: updateError } = await supabase
              .from('prospects')
              .update({
                website_status: 'bot_protected',
                status: 'error',
                updated_at: new Date().toISOString()
              })
              .eq('id', prospect.id);

            if (updateError) {
              console.error(`[Bot Protection] Failed to update prospect ${prospect.id}:`, updateError.message);
            } else {
              console.log(`[Bot Protection] ✅ Prospect ${prospect.company_name} flagged as bot-protected`);
            }
          } catch (updateError) {
            console.error(`[Bot Protection] Exception updating prospect:`, updateError);
          }
        }

        // Send error event
        sendEvent('error', {
          current: prospectIndex,
          total: prospects.length,
          company_name: prospect.company_name,
          company: prospect.company_name || prospect.website,
          url: prospect.website,
          error: error.message,
          bot_protected: isBotProtected || false
        });

        return {
          success: false,
          prospect_id: prospect.id,
          url: prospect.website,
          company_name: prospect.company_name,
          company: prospect.company_name || prospect.website,
          error: error.message,
          bot_protected: isBotProtected || false
        };
      }
    })
  );

  // Process batch results and add to main results array
  batchResults.forEach((promiseResult, batchIndex) => {
    if (promiseResult.status === 'fulfilled' && promiseResult.value) {
      results.push(promiseResult.value);
    } else if (promiseResult.status === 'rejected') {
      const prospect = batch[batchIndex];
      console.error(`[Intelligent Analysis] Promise rejected for ${prospect.company_name}:`, promiseResult.reason);
      results.push({
        success: false,
        prospect_id: prospect.id,
        url: prospect.website,
        company_name: prospect.company_name,
        company: prospect.company_name || prospect.website,
        error: promiseResult.reason?.message || 'Unknown error'
      });
    }
  });

  console.log(`[Intelligent Analysis] Batch complete: ${results.length}/${prospects.length} processed so far`);
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    const requestedCount = prospect_ids ? prospect_ids.length : prospects.length;
    console.log(
      `[Intelligent Analysis] Completed: ${successCount}/${results.length} successful` +
      `${failedCount > 0 ? `, ${failedCount} failed` : ''}` +
      `${missingIds.length > 0 ? ` (${missingIds.length} skipped)` : ''}`
    );

    // Calculate batch cost summary
    const batchCosts = results
      .filter(r => r.success && r.data?.analysis_cost)
      .map(r => r.data.analysis_cost);

    if (batchCosts.length > 0) {
      const totalBatchCost = batchCosts.reduce((sum, cost) => sum + cost, 0);
      const avgCostPerLead = totalBatchCost / batchCosts.length;
      const minCost = Math.min(...batchCosts);
      const maxCost = Math.max(...batchCosts);

      console.log('\n' + '='.repeat(56));
      console.log('[Batch Analysis] COST SUMMARY');
      console.log('='.repeat(56));
      console.log(`Total Leads Analyzed:  ${batchCosts.length}`);
      console.log(`Total Cost:            $${totalBatchCost.toFixed(4)}`);
      console.log(`Average Cost/Lead:     $${avgCostPerLead.toFixed(4)}`);
      console.log(`Min Cost:              $${minCost.toFixed(4)}`);
      console.log(`Max Cost:              $${maxCost.toFixed(4)}`);
      console.log('='.repeat(56) + '\n');
    }

    // Send complete event
    sendEvent('complete', {
      success: true,
      requested: requestedCount,
      total: prospects.length,
      successful: successCount,
      failed: results.length - successCount,
      missing: missingIds.length,
      missing_prospect_ids: missingIds,
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
 * DELETE /api/benchmarks/:id
 * Delete a single benchmark by ID
 */
app.delete('/api/benchmarks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Benchmark ID is required'
      });
    }

    const { error } = await supabase
      .from('benchmarks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Delete Benchmark] Error:', error);
      return res.status(500).json({
        error: 'Failed to delete benchmark',
        details: error.message
      });
    }

    console.log(`[Delete Benchmark] Successfully deleted benchmark ${id}`);

    res.json({
      success: true,
      message: 'Benchmark deleted successfully'
    });

  } catch (error) {
    console.error('[Delete Benchmark] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * POST /api/benchmarks/batch-delete
 * Delete multiple benchmarks in batch
 *
 * Body:
 * {
 *   "ids": ["id1", "id2", "id3"]
 * }
 */
app.post('/api/benchmarks/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'An array of benchmark IDs is required'
      });
    }

    console.log(`[Batch Delete Benchmarks] Deleting ${ids.length} benchmarks`);

    const { error, count } = await supabase
      .from('benchmarks')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('[Batch Delete Benchmarks] Error:', error);
      return res.status(500).json({
        error: 'Failed to delete benchmarks',
        details: error.message
      });
    }

    console.log(`[Batch Delete Benchmarks] Successfully deleted ${ids.length} benchmarks`);

    res.json({
      success: true,
      deleted: ids.length,
      failed: 0,
      message: `${ids.length} benchmark(s) deleted successfully`
    });

  } catch (error) {
    console.error('[Batch Delete Benchmarks] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});


// Start server
app.listen(PORT, () => {
  console.log('');
  console.log(`Analysis Engine Server v2.0`);
  console.log('');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET    /health                          - Health check`);
  console.log(`  ALL    /api/analyze-benchmark           - Analyze website as benchmark (SSE)`);
  console.log(`  POST   /api/analyze-url                 - Analyze single URL`);
  console.log(`  POST   /api/analyze                     - Analyze prospects (SSE)`);
  console.log(`  GET    /api/leads                       - Get analyzed leads`);
  console.log(`  DELETE /api/leads/:id                   - Delete a lead`);
  console.log(`  POST   /api/leads/batch-delete          - Delete multiple leads`);
  console.log(`  DELETE /api/benchmarks/:id              - Delete a benchmark`);
  console.log(`  POST   /api/benchmarks/batch-delete     - Delete multiple benchmarks`);
  console.log(`  GET    /api/stats                       - Get statistics`);
  console.log('');
  console.log('Ready to analyze websites!');
  console.log('');
});

export default app;

