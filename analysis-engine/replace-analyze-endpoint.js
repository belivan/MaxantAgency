import fs from 'fs';

const serverFile = 'server.js';
const content = fs.readFileSync(serverFile, 'utf8');

// Find the start and end of the /api/analyze endpoint
const startMarker = "app.post('/api/analyze', async (req, res) => {";
const endMarker = "});\n\n/**\n * GET /api/leads";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find endpoint markers');
  process.exit(1);
}

// New simplified endpoint
const newEndpoint = `app.post('/api/analyze', async (req, res) => {
  try {
    const { prospect_ids, project_id, custom_prompts } = req.body;

    if (!prospect_ids || prospect_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'prospect_ids is required'
      });
    }

    console.log(\`[Intelligent Analysis] Starting batch analysis for \${prospect_ids.length} prospects\`);

    // Fetch prospects
    const { data: prospects, error: fetchError } = await supabase
      .from('prospects')
      .select('id, company_name, website, industry')
      .in('id', prospect_ids)
      .not('website', 'is', null);

    if (fetchError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch prospects',
        details: fetchError.message
      });
    }

    if (!prospects || prospects.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No prospects found'
      });
    }

    console.log(\`[Intelligent Analysis] Found \${prospects.length} prospects to analyze\`);

    // Analyze each prospect with intelligent multi-page analysis
    const results = [];
    for (const prospect of prospects) {
      try {
        console.log(\`[Intelligent Analysis] Analyzing \${prospect.company_name || prospect.website}...\`);

        const result = await analyzeWebsiteIntelligent(prospect.website, {
          company_name: prospect.company_name || 'Unknown Company',
          industry: prospect.industry || 'unknown',
          project_id: project_id || null
        });

        if (result.success) {
          // Save to database
          const leadData = {
            url: result.url,
            company_name: result.company_name,
            industry: result.industry,
            project_id: project_id || null,

            // Scores
            overall_score: Math.round(result.overall_score),
            grade: result.grade,
            design_score: Math.round(result.design_score),
            seo_score: Math.round(result.seo_score),
            content_score: Math.round(result.content_score),
            social_score: Math.round(result.social_score),
            accessibility_score: Math.round(result.accessibility_score),

            // Issues and wins
            design_issues: result.design_issues || [],
            seo_issues: result.seo_issues || [],
            content_issues: result.content_issues || [],
            social_issues: result.social_issues || [],
            accessibility_issues: result.accessibility_issues || [],
            quick_wins: result.quick_wins || [],

            // Top issue and one-liner
            top_issue: result.top_issue || null,
            one_liner: result.one_liner || null,

            // Model tracking
            seo_analysis_model: result.seo_analysis_model || null,
            content_analysis_model: result.content_analysis_model || null,
            desktop_visual_model: result.desktop_visual_model || null,
            mobile_visual_model: result.mobile_visual_model || null,
            social_analysis_model: result.social_analysis_model || null,
            accessibility_analysis_model: result.accessibility_analysis_model || null,

            // Intelligent analysis metadata
            pages_discovered: result.pages_discovered || 0,
            pages_analyzed: result.pages_analyzed || 0,
            analysis_cost: result.cost || 0,
            analysis_time_seconds: result.time_seconds || 0,

            // Timestamps
            analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: saveError } = await supabase
            .from('leads')
            .upsert(leadData, { onConflict: 'url' });

          if (saveError) {
            console.error(\`[Intelligent Analysis] Failed to save lead \${prospect.website}:\`, saveError);
          } else {
            console.log(\`[Intelligent Analysis] ✓ \${prospect.company_name}: Grade \${result.grade} (\${result.overall_score}/100)\`);
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
          console.error(\`[Intelligent Analysis] ✗ \${prospect.company_name}: \${result.error}\`);
          results.push({
            success: false,
            prospect_id: prospect.id,
            url: prospect.website,
            company_name: prospect.company_name,
            error: result.error
          });
        }
      } catch (error) {
        console.error(\`[Intelligent Analysis] ✗ \${prospect.company_name}: \${error.message}\`);
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
    console.log(\`[Intelligent Analysis] Completed: \${successCount}/\${prospects.length} successful\`);

    res.json({
      success: true,
      data: {
        total: prospects.length,
        successful: successCount,
        failed: prospects.length - successCount,
        results
      }
    });

  } catch (error) {
    console.error('[Intelligent Analysis] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * GET /api/leads`;

// Replace
const before = content.substring(0, startIndex);
const after = content.substring(endIndex);
const newContent = before + newEndpoint + after;

fs.writeFileSync(serverFile, newContent);
console.log('✅ Successfully replaced /api/analyze endpoint');
