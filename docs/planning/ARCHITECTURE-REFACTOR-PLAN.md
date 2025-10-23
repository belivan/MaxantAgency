# Architecture Refactor Plan - High Priority Items

**Created:** October 22, 2025  
**Status:** Planning  
**Impact:** High - Reduces database bloat, enables better maintainability

---

## 🎯 Overview

This plan addresses two critical architectural concerns:

1. **Snapshot Bloat** - Deduplicating prompt/ICP configurations stored with every prospect
2. **God Object Anti-Pattern** - Refactoring the Analysis Engine orchestrator

**Timeline:** 2 phases over 3-4 weeks  
**Risk Level:** Medium (requires database migration and careful testing)

**NOTE:** This refactor will NOT touch the Command Center UI - another agent is working on that.

---

## 📋 Phase 1: Prompt Deduplication System (Week 1-2)

### **Goal:** Stop storing duplicate prompt configurations 1000x times

### **Current State**
```javascript
// PROBLEM: Same prompt stored with EVERY prospect
prospects: [
  {
    id: "uuid-1",
    company_name: "Company A",
    prompts_snapshot: { /* 5KB of JSON */ },
    icp_brief_snapshot: { /* 2KB of JSON */ }
  },
  {
    id: "uuid-2", 
    company_name: "Company B",
    prompts_snapshot: { /* SAME 5KB of JSON */ },  // ❌ DUPLICATE
    icp_brief_snapshot: { /* SAME 2KB of JSON */ }  // ❌ DUPLICATE
  }
  // ... x1000 prospects = 7MB wasted storage
]
```

### **Target State**
```javascript
// SOLUTION: Store once, reference by hash
prompt_versions: [
  {
    id: "uuid",
    content_hash: "sha256-abc123...",
    prompt_config: { /* 5KB stored ONCE */ },
    usage_count: 1000
  }
]

prospects: [
  {
    id: "uuid-1",
    company_name: "Company A",
    prompt_version_id: "uuid",  // ✅ Reference
    icp_version_id: "uuid"      // ✅ Reference
  }
]
```

---

### **Step 1.1: Create Database Schema**

**File:** `database-tools/migrations/20251022_prompt_deduplication.sql`

```sql
-- =====================================================
-- Prompt Versions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Deduplication
  content_hash TEXT NOT NULL UNIQUE,
  prompt_type TEXT NOT NULL, -- 'prospecting_prompts' | 'analysis_prompts' | 'outreach_prompts'
  
  -- Content
  prompt_config JSONB NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  
  -- Versioning (optional)
  version_label TEXT, -- e.g., "v1.2.3" or "2025-10-22-baseline"
  git_commit TEXT,
  description TEXT,
  
  -- Indexes
  CONSTRAINT valid_prompt_type CHECK (prompt_type IN ('prospecting_prompts', 'analysis_prompts', 'outreach_prompts'))
);

CREATE INDEX idx_prompt_versions_hash ON prompt_versions(content_hash);
CREATE INDEX idx_prompt_versions_type ON prompt_versions(prompt_type);
CREATE INDEX idx_prompt_versions_created_at ON prompt_versions(created_at DESC);

-- =====================================================
-- ICP Brief Versions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS icp_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Deduplication
  content_hash TEXT NOT NULL UNIQUE,
  
  -- Content
  icp_config JSONB NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  
  -- Industry/category for filtering
  industry TEXT,
  city TEXT
);

CREATE INDEX idx_icp_versions_hash ON icp_versions(content_hash);
CREATE INDEX idx_icp_versions_industry ON icp_versions(industry);
CREATE INDEX idx_icp_versions_created_at ON icp_versions(created_at DESC);

-- =====================================================
-- Model Selection Versions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS model_selection_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Deduplication
  content_hash TEXT NOT NULL UNIQUE,
  
  -- Content
  selection_config JSONB NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP
);

CREATE INDEX idx_model_versions_hash ON model_selection_versions(content_hash);

-- =====================================================
-- Migrate Existing Data: Add Foreign Keys
-- =====================================================
-- Add new columns to prospects table
ALTER TABLE prospects 
  ADD COLUMN IF NOT EXISTS prompt_version_id UUID REFERENCES prompt_versions(id),
  ADD COLUMN IF NOT EXISTS icp_version_id UUID REFERENCES icp_versions(id),
  ADD COLUMN IF NOT EXISTS model_version_id UUID REFERENCES model_selection_versions(id);

-- Add new columns to project_prospects junction table
ALTER TABLE project_prospects
  ADD COLUMN IF NOT EXISTS prompt_version_id UUID REFERENCES prompt_versions(id),
  ADD COLUMN IF NOT EXISTS icp_version_id UUID REFERENCES icp_versions(id),
  ADD COLUMN IF NOT EXISTS model_version_id UUID REFERENCES model_selection_versions(id);

-- Add new columns to analyses table
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS prompt_version_id UUID REFERENCES prompt_versions(id);

CREATE INDEX idx_prospects_prompt_version ON prospects(prompt_version_id);
CREATE INDEX idx_prospects_icp_version ON prospects(icp_version_id);
CREATE INDEX idx_project_prospects_prompt_version ON project_prospects(prompt_version_id);
CREATE INDEX idx_analyses_prompt_version ON analyses(prompt_version_id);

-- =====================================================
-- Helper Functions
-- =====================================================

-- Calculate SHA-256 hash of JSONB content
CREATE OR REPLACE FUNCTION calculate_content_hash(content JSONB)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(content::TEXT, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get or create prompt version (deduplication)
CREATE OR REPLACE FUNCTION get_or_create_prompt_version(
  p_prompt_config JSONB,
  p_prompt_type TEXT,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_hash TEXT;
  v_version_id UUID;
BEGIN
  -- Calculate hash
  v_hash := calculate_content_hash(p_prompt_config);
  
  -- Try to find existing version
  SELECT id INTO v_version_id
  FROM prompt_versions
  WHERE content_hash = v_hash AND prompt_type = p_prompt_type;
  
  -- If exists, increment usage count
  IF FOUND THEN
    UPDATE prompt_versions
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = v_version_id;
    
    RETURN v_version_id;
  END IF;
  
  -- Otherwise, create new version
  INSERT INTO prompt_versions (content_hash, prompt_type, prompt_config, created_by, usage_count, last_used_at)
  VALUES (v_hash, p_prompt_type, p_prompt_config, p_created_by, 1, NOW())
  RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- Similar functions for ICP and model versions
CREATE OR REPLACE FUNCTION get_or_create_icp_version(
  p_icp_config JSONB,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_hash TEXT;
  v_version_id UUID;
  v_industry TEXT;
  v_city TEXT;
BEGIN
  v_hash := calculate_content_hash(p_icp_config);
  v_industry := p_icp_config->>'industry';
  v_city := p_icp_config->>'city';
  
  SELECT id INTO v_version_id FROM icp_versions WHERE content_hash = v_hash;
  
  IF FOUND THEN
    UPDATE icp_versions SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = v_version_id;
    RETURN v_version_id;
  END IF;
  
  INSERT INTO icp_versions (content_hash, icp_config, created_by, usage_count, last_used_at, industry, city)
  VALUES (v_hash, p_icp_config, p_created_by, 1, NOW(), v_industry, v_city)
  RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_or_create_model_version(
  p_selection_config JSONB
)
RETURNS UUID AS $$
DECLARE
  v_hash TEXT;
  v_version_id UUID;
BEGIN
  v_hash := calculate_content_hash(p_selection_config);
  
  SELECT id INTO v_version_id FROM model_selection_versions WHERE content_hash = v_hash;
  
  IF FOUND THEN
    UPDATE model_selection_versions SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = v_version_id;
    RETURN v_version_id;
  END IF;
  
  INSERT INTO model_selection_versions (content_hash, selection_config, usage_count, last_used_at)
  VALUES (v_hash, p_selection_config, 1, NOW())
  RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Data Migration: Deduplicate Existing Data
-- =====================================================

-- Migrate existing prompts_snapshot from prospects
DO $$
DECLARE
  prospect_rec RECORD;
  v_prompt_version_id UUID;
BEGIN
  FOR prospect_rec IN 
    SELECT id, prompts_snapshot 
    FROM prospects 
    WHERE prompts_snapshot IS NOT NULL 
      AND prompt_version_id IS NULL
  LOOP
    v_prompt_version_id := get_or_create_prompt_version(
      prospect_rec.prompts_snapshot,
      'prospecting_prompts'
    );
    
    UPDATE prospects 
    SET prompt_version_id = v_prompt_version_id 
    WHERE id = prospect_rec.id;
  END LOOP;
END $$;

-- Migrate existing icp_brief_snapshot from prospects
DO $$
DECLARE
  prospect_rec RECORD;
  v_icp_version_id UUID;
BEGIN
  FOR prospect_rec IN 
    SELECT id, icp_brief_snapshot 
    FROM prospects 
    WHERE icp_brief_snapshot IS NOT NULL 
      AND icp_version_id IS NULL
  LOOP
    v_icp_version_id := get_or_create_icp_version(prospect_rec.icp_brief_snapshot);
    
    UPDATE prospects 
    SET icp_version_id = v_icp_version_id 
    WHERE id = prospect_rec.id;
  END LOOP;
END $$;

-- Migrate model selections
DO $$
DECLARE
  prospect_rec RECORD;
  v_model_version_id UUID;
BEGIN
  FOR prospect_rec IN 
    SELECT id, models_used 
    FROM prospects 
    WHERE models_used IS NOT NULL 
      AND model_version_id IS NULL
  LOOP
    v_model_version_id := get_or_create_model_version(prospect_rec.models_used);
    
    UPDATE prospects 
    SET model_version_id = v_model_version_id 
    WHERE id = prospect_rec.id;
  END LOOP;
END $$;

-- =====================================================
-- AFTER MIGRATION: Drop Old Columns (Phase 2)
-- =====================================================
-- DO NOT RUN YET - Keep old columns for rollback safety
-- After 2 weeks of testing, run these:

-- ALTER TABLE prospects DROP COLUMN prompts_snapshot;
-- ALTER TABLE prospects DROP COLUMN icp_brief_snapshot;
-- ALTER TABLE prospects DROP COLUMN models_used;
```

---

### **Step 1.2: Create Migration Runner**

**File:** `database-tools/migrations/deduplicate-prompts.js`

```javascript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  console.log('🚀 Starting Prompt Deduplication Migration...\n');

  try {
    // Read SQL file
    const sqlFile = path.join(__dirname, '20251022_prompt_deduplication.sql');
    const sql = fs.readFileSync(sqlFile, 'utf-8');

    console.log('📄 Executing migration SQL...');
    
    // Execute migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      throw error;
    }

    console.log('✅ Migration completed successfully!\n');

    // Get statistics
    const { data: stats } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          (SELECT COUNT(*) FROM prompt_versions) as prompt_versions,
          (SELECT COUNT(*) FROM icp_versions) as icp_versions,
          (SELECT COUNT(*) FROM model_selection_versions) as model_versions,
          (SELECT COUNT(*) FROM prospects WHERE prompt_version_id IS NOT NULL) as prospects_migrated,
          (SELECT SUM(usage_count) FROM prompt_versions) as total_prompt_usages
      `
    });

    console.log('📊 Migration Statistics:');
    console.log(`   Prompt Versions Created: ${stats?.[0]?.prompt_versions || 0}`);
    console.log(`   ICP Versions Created: ${stats?.[0]?.icp_versions || 0}`);
    console.log(`   Model Versions Created: ${stats?.[0]?.model_versions || 0}`);
    console.log(`   Prospects Migrated: ${stats?.[0]?.prospects_migrated || 0}`);
    console.log(`   Total Prompt Usages: ${stats?.[0]?.total_prompt_usages || 0}`);

    // Calculate savings
    const avgPromptSize = 5; // KB
    const avgIcpSize = 2; // KB
    const totalProspects = stats?.[0]?.prospects_migrated || 0;
    const totalVersions = (stats?.[0]?.prompt_versions || 0) + (stats?.[0]?.icp_versions || 0);
    const savedKB = (totalProspects * (avgPromptSize + avgIcpSize)) - (totalVersions * (avgPromptSize + avgIcpSize));
    
    console.log(`\n💾 Storage Savings: ~${(savedKB / 1024).toFixed(2)} MB`);
    console.log(`   (${totalProspects} prospects × 7KB) - (${totalVersions} versions × 7KB)`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

runMigration();
```

---

### **Step 1.3: Update Prospecting Engine**

**File:** `prospecting-engine/database/supabase-client.js`

Add helper functions:

```javascript
/**
 * Get or create prompt version (with deduplication)
 */
export async function getOrCreatePromptVersion(promptConfig, promptType = 'prospecting_prompts') {
  const { data, error } = await supabase.rpc('get_or_create_prompt_version', {
    p_prompt_config: promptConfig,
    p_prompt_type: promptType
  });

  if (error) throw error;
  return data; // Returns UUID
}

/**
 * Get or create ICP version
 */
export async function getOrCreateIcpVersion(icpConfig) {
  const { data, error } = await supabase.rpc('get_or_create_icp_version', {
    p_icp_config: icpConfig
  });

  if (error) throw error;
  return data;
}

/**
 * Get or create model selection version
 */
export async function getOrCreateModelVersion(modelConfig) {
  const { data, error } = await supabase.rpc('get_or_create_model_version', {
    p_selection_config: modelConfig
  });

  if (error) throw error;
  return data;
}
```

Update `saveOrLinkProspect`:

```javascript
export async function saveOrLinkProspect(prospect, projectId, aiMetadata = {}) {
  try {
    // Deduplicate prompt/ICP snapshots
    let promptVersionId = null;
    let icpVersionId = null;
    let modelVersionId = null;

    if (aiMetadata.promptsSnapshot) {
      promptVersionId = await getOrCreatePromptVersion(aiMetadata.promptsSnapshot);
    }

    if (aiMetadata.icpBriefSnapshot) {
      icpVersionId = await getOrCreateIcpVersion(aiMetadata.icpBriefSnapshot);
    }

    if (aiMetadata.modelSelectionsSnapshot) {
      modelVersionId = await getOrCreateModelVersion(aiMetadata.modelSelectionsSnapshot);
    }

    // Save prospect with version references (not full snapshots)
    const prospectToSave = {
      ...prospect,
      prompt_version_id: promptVersionId,
      icp_version_id: icpVersionId,
      model_version_id: modelVersionId,
      // Remove old snapshot fields (keep for now, will drop in Phase 2)
      // prompts_snapshot: null,
      // icp_brief_snapshot: null,
      // models_used: null
    };

    // ... rest of save logic
  }
}
```

---

### **Step 1.4: Testing**

**File:** `tests/test-prompt-deduplication.js`

```javascript
import { getOrCreatePromptVersion, getOrCreateIcpVersion } from '../prospecting-engine/database/supabase-client.js';

async function testDeduplication() {
  console.log('🧪 Testing Prompt Deduplication\n');

  const testPrompt = {
    queryUnderstanding: {
      model: 'gpt-5',
      temperature: 0.3,
      systemPrompt: 'You are a search expert...'
    }
  };

  const testIcp = {
    industry: 'Restaurants',
    city: 'Philadelphia',
    target: 'Italian restaurants'
  };

  // Create first version
  console.log('Creating first prompt version...');
  const version1 = await getOrCreatePromptVersion(testPrompt);
  console.log(`✓ Version 1: ${version1}`);

  // Try to create duplicate (should return same ID)
  console.log('Attempting to create duplicate...');
  const version2 = await getOrCreatePromptVersion(testPrompt);
  console.log(`✓ Version 2: ${version2}`);

  if (version1 === version2) {
    console.log('✅ Deduplication working! Same ID returned.');
  } else {
    console.log('❌ FAILURE: Different IDs returned for identical content!');
  }

  // Create ICP version
  console.log('\nCreating ICP version...');
  const icpVersion = await getOrCreateIcpVersion(testIcp);
  console.log(`✓ ICP Version: ${icpVersion}`);
}

testDeduplication();
```

---

### **Phase 1 Deliverables**

- ✅ New database tables for version storage
- ✅ Deduplication functions using content hashing
- ✅ Migration script to move existing data
- ✅ Updated `saveOrLinkProspect` to use versions
- ✅ Test suite for deduplication logic
- ✅ Storage savings report

**Estimated Storage Savings:** 60-80% reduction in JSON column size

---

## � Phase 2: Orchestrator Refactoring (Week 3-4)

### **Goal:** Break down Analysis Engine god object into focused services

**NOTE:** This phase only touches `analysis-engine/` - will not modify Command Center UI.

### **Current Problem**
```javascript
// analysis-engine/orchestrator.js
// 700+ lines doing EVERYTHING
analyzeWebsiteIntelligent() {
  // Discovery
  // AI selection
  // Crawling
  // 6 parallel analyzers
  // Business intelligence
  // Lead scoring
  // Screenshots
  // Grading
  // Logging
  // Returns 50+ fields
}
```

### **Target Architecture**

```
analysis-engine/
├── orchestrator.js (SLIM - 150 lines, coordination only)
├── services/
│   ├── discovery-service.js
│   ├── page-selection-service.js
│   ├── crawling-service.js
│   ├── analysis-coordinator.js
│   ├── grading-service.js
│   └── results-aggregator.js
└── analyzers/ (unchanged)
```

---

### **Step 3.1: Create Service Layer**

**File:** `analysis-engine/services/discovery-service.js`

```javascript
/**
 * Discovery Service
 * Handles sitemap discovery and fallback logic
 */
import { discoverAllPages } from '../scrapers/sitemap-discovery.js';

export class DiscoveryService {
  async discover(url, options = {}) {
    const { timeout = 30000 } = options;

    // Discover pages
    const sitemap = await discoverAllPages(url, { timeout });

    // Fallback logic
    if (sitemap.totalPages === 0) {
      return this.getFallbackPages(url, sitemap);
    }

    return {
      pages: sitemap.pages,
      totalPages: sitemap.totalPages,
      sources: sitemap.sources,
      errors: sitemap.errors,
      discoveryTime: sitemap.discoveryTime,
      usedFallback: false
    };
  }

  getFallbackPages(url, sitemap) {
    return {
      pages: ['/', '/about', '/services', '/contact', '/blog'],
      totalPages: 5,
      sources: ['fallback'],
      errors: sitemap.errors || {},
      discoveryTime: sitemap.discoveryTime || 0,
      usedFallback: true
    };
  }
}
```

**File:** `analysis-engine/services/page-selection-service.js`

```javascript
/**
 * Page Selection Service
 * AI-powered page selection for analysis modules
 */
import { selectPagesForAnalysis, getUniquePagesToCrawl } from '../scrapers/intelligent-page-selector.js';

export class PageSelectionService {
  async selectPages(sitemap, context, options = {}) {
    const { maxPagesPerModule = 5 } = options;

    const selection = await selectPagesForAnalysis(sitemap, {
      industry: context.industry,
      companyName: context.company_name,
      maxPagesPerModule
    });

    const uniquePages = getUniquePagesToCrawl(selection);

    return {
      selection,
      uniquePages,
      counts: {
        seo: selection.seo_pages.length,
        content: selection.content_pages.length,
        visual: selection.visual_pages.length,
        social: selection.social_pages.length
      }
    };
  }
}
```

**File:** `analysis-engine/services/crawling-service.js`

```javascript
/**
 * Crawling Service
 * Multi-page screenshot crawling
 */
import { crawlSelectedPagesWithScreenshots } from '../scrapers/multi-page-crawler.js';

export class CrawlingService {
  async crawlPages(url, pages, options = {}) {
    const { timeout = 30000, concurrency = 3, onProgress } = options;

    const crawled = await crawlSelectedPagesWithScreenshots(url, pages, {
      timeout,
      concurrency,
      onProgress
    });

    const successful = crawled.filter(p => p.success);
    const failed = crawled.filter(p => !p.success);

    return {
      pages: successful,
      failed,
      successCount: successful.length,
      failureCount: failed.length,
      totalAttempted: crawled.length
    };
  }
}
```

**File:** `analysis-engine/services/analysis-coordinator.js`

```javascript
/**
 * Analysis Coordinator
 * Orchestrates parallel analyzer execution
 */
export class AnalysisCoordinator {
  async runAnalyzers(pages, context, customPrompts = {}) {
    // Import analyzers
    const { analyzeSEO } = await import('../analyzers/seo-analyzer.js');
    const { analyzeContent } = await import('../analyzers/content-analyzer.js');
    const { analyzeDesktopVisual } = await import('../analyzers/desktop-visual-analyzer.js');
    const { analyzeMobileVisual } = await import('../analyzers/mobile-visual-analyzer.js');
    const { analyzeSocial } = await import('../analyzers/social-analyzer.js');
    const { analyzeAccessibility } = await import('../analyzers/accessibility-analyzer.js');

    // Prepare page sets
    const { seo, content, visual, social, all } = this.preparePageSets(pages);

    // Run in parallel
    const [
      seoResults,
      contentResults,
      desktopVisualResults,
      mobileVisualResults,
      socialResults,
      accessibilityResults
    ] = await Promise.all([
      analyzeSEO(seo, context, customPrompts?.seo),
      analyzeContent(content, context, customPrompts?.content),
      analyzeDesktopVisual(visual, context, customPrompts?.desktopVisual),
      analyzeMobileVisual(visual, context, customPrompts?.mobileVisual),
      analyzeSocial(social, {}, {}, context, customPrompts?.social),
      analyzeAccessibility(all, context, customPrompts?.accessibility)
    ]);

    return {
      seo: seoResults,
      content: contentResults,
      desktopVisual: desktopVisualResults,
      mobileVisual: mobileVisualResults,
      social: socialResults,
      accessibility: accessibilityResults
    };
  }

  preparePageSets(pages) {
    // Logic to categorize pages by analysis type
    return {
      seo: pages.seoPages || pages.all,
      content: pages.contentPages || pages.all,
      visual: pages.visualPages || pages.all,
      social: pages.socialPages || pages.all,
      all: pages.all || []
    };
  }
}
```

**File:** `analysis-engine/services/results-aggregator.js`

```javascript
/**
 * Results Aggregator
 * Compiles final analysis results
 */
import { calculateGrade, extractQuickWins, getTopIssue } from '../grading/grader.js';
import { generateCritique, generateOneLiner } from '../grading/critique-generator.js';
import { scoreLeadPriority } from '../analyzers/lead-scorer.js';

export class ResultsAggregator {
  async aggregate(analysisResults, crawlData, context) {
    // Calculate scores
    const scores = this.calculateScores(analysisResults);

    // Extract metadata
    const quickWins = extractQuickWins(analysisResults);
    const gradeResults = calculateGrade(scores, {
      quickWinCount: quickWins.length,
      isMobileFriendly: !analysisResults.mobileVisual?.issues?.some(i => i.severity === 'critical'),
      hasHTTPS: crawlData.homepage?.fullUrl?.startsWith('https://'),
      siteAccessible: true,
      industry: context.industry
    });

    // Generate critique
    const critique = generateCritique(analysisResults, gradeResults, context);

    // Lead scoring
    const leadScoringData = await this.scoreLead(analysisResults, gradeResults, context, quickWins);

    return {
      grade: gradeResults.grade,
      scores,
      analysisResults,
      quickWins,
      critique,
      leadScoringData,
      metadata: this.buildMetadata(analysisResults, crawlData, context)
    };
  }

  calculateScores(analysisResults) {
    return {
      design: Math.round(
        ((analysisResults.desktopVisual?.visualScore || 50) +
         (analysisResults.mobileVisual?.visualScore || 50)) / 2
      ),
      seo: analysisResults.seo?.seoScore || 50,
      content: analysisResults.content?.contentScore || 50,
      social: analysisResults.social?.socialScore || 50
    };
  }

  async scoreLead(analysisResults, gradeResults, context, quickWins) {
    // Lead scoring logic...
  }

  buildMetadata(analysisResults, crawlData, context) {
    // Metadata building logic...
  }
}
```

---

### **Step 3.2: Refactored Orchestrator**

**File:** `analysis-engine/orchestrator.js` (NEW - 150 lines)

```javascript
/**
 * Analysis Orchestrator (REFACTORED)
 * Lightweight coordinator for analysis services
 */

import { DiscoveryService } from './services/discovery-service.js';
import { PageSelectionService } from './services/page-selection-service.js';
import { CrawlingService } from './services/crawling-service.js';
import { AnalysisCoordinator } from './services/analysis-coordinator.js';
import { ResultsAggregator } from './services/results-aggregator.js';

export async function analyzeWebsiteIntelligent(url, context = {}, options = {}) {
  const { customPrompts, onProgress, maxPagesPerModule = 5 } = options;
  const startTime = Date.now();

  // Initialize services
  const discoveryService = new DiscoveryService();
  const pageSelectionService = new PageSelectionService();
  const crawlingService = new CrawlingService();
  const analysisCoordinator = new AnalysisCoordinator();
  const resultsAggregator = new ResultsAggregator();

  try {
    // PHASE 1: Discovery
    const discoveryResult = await discoveryService.discover(url, { timeout: 30000 });
    onProgress?.({ step: 'discovery', message: `Found ${discoveryResult.totalPages} pages` });

    // PHASE 2: Page Selection
    const selectionResult = await pageSelectionService.selectPages(
      discoveryResult,
      context,
      { maxPagesPerModule }
    );
    onProgress?.({ step: 'selection', message: `Selected ${selectionResult.uniquePages.length} pages` });

    // PHASE 3: Crawling
    const crawlResult = await crawlingService.crawlPages(
      url,
      selectionResult.uniquePages,
      {
        timeout: 30000,
        concurrency: 3,
        onProgress: (p) => onProgress?.({ step: 'crawl', ...p })
      }
    );

    if (crawlResult.successCount === 0) {
      throw new Error('Failed to crawl any pages');
    }

    // PHASE 4: Analysis
    const analysisResults = await analysisCoordinator.runAnalyzers(
      {
        all: crawlResult.pages,
        seoPages: selectionResult.selection.seo_pages,
        contentPages: selectionResult.selection.content_pages,
        visualPages: selectionResult.selection.visual_pages,
        socialPages: selectionResult.selection.social_pages
      },
      context,
      customPrompts
    );

    // PHASE 5: Aggregation
    const results = await resultsAggregator.aggregate(
      analysisResults,
      { homepage: crawlResult.pages[0] },
      context
    );

    return {
      success: true,
      analysis_mode: 'intelligent-multi-page',
      url,
      ...results,
      analysis_time: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      analysis_time: Date.now() - startTime
    };
  }
}
```

---

### **Phase 2 Deliverables**

- ✅ 5 focused service classes (150-200 lines each)
- ✅ Refactored orchestrator (150 lines, down from 700)
- ✅ Unit tests for each service
- ✅ Integration tests for orchestrator
- ✅ Documentation for service architecture
- ✅ Migration guide for existing code

**Code Quality:** 80% reduction in orchestrator complexity

---

## 📊 Success Metrics

### **Phase 1: Storage Savings**
- Reduce database size by 60-80%
- Deduplicate 95%+ of prompt snapshots
- < 100ms overhead for version lookups

### **Phase 2: Maintainability**
- Orchestrator: 700 → 150 lines
- Test coverage: 40% → 80%
- Average service complexity: < 200 lines

---

## 🚧 Rollback Plan

### **Phase 1 Rollback**
- Keep old snapshot columns for 2 weeks
- Can revert by dropping new tables
- Zero data loss risk

### **Phase 2 Rollback**
- Keep old orchestrator as `orchestrator.legacy.js`
- Switch imports back if needed
- Services are additive, safe to rollback

---

## 📝 Testing Strategy

**Unit Tests:**
- `test-prompt-deduplication.js`
- `test-prompt-validation.js`
- `test-discovery-service.js`
- `test-analysis-coordinator.js`

**Integration Tests:**
- `test-full-analysis-refactored.js`
- `test-custom-prompts-with-validation.js`

**Load Tests:**
- 1000 prospects with deduplication
- Custom prompt validation performance

---

## 🎯 Next Steps

1. **Review this plan** with team
2. **Approve database schema** for Phase 1
3. **Schedule migration window** (recommend off-hours)
4. **Assign owners** for each phase
5. **Set up monitoring** for storage metrics

---

**Questions?** See implementation details in each phase section above.
