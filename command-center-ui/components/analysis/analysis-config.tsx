'use client';

/**
 * Analysis Configuration Component
 * Configure analysis modules and AI model selection
 *
 * ARCHITECTURE:
 * - All 6 core modules always enabled: desktopVisual, mobileVisual, SEO, content, social, accessibility
 * - Per-module AI model selection (GPT, Claude, Grok)
 * - Expert prompt editing with project-level persistence
 * - Dual screenshot capture for vision-based design analysis
 */

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings, Loader2, Sparkles, Zap, Globe, Search, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { analysisOptionsSchema, type AnalysisOptionsFormData } from '@/lib/utils/validation';
import { calculateAnalysisCost } from '@/lib/utils/cost-calculator';
import { formatCurrency } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { ModelSelector, type ModuleModelSelection } from './model-selector';
import { PromptEditor, type AnalysisPrompts } from './prompt-editor';

interface AnalysisConfigProps {
  prospectCount: number;
  onSubmit: (data: AnalysisOptionsFormData) => void;
  isLoading?: boolean;
  disabled?: boolean;
  // Prompt editor props
  customPrompts?: AnalysisPrompts;
  defaultPrompts?: AnalysisPrompts;
  onPromptsChange?: (prompts: AnalysisPrompts) => void;
  promptsLocked?: boolean;
  leadsCount?: number;
}

// Available AI models (VERIFIED REAL - Jan 2025)
const AI_MODELS = [
  // xAI Grok models
  { value: 'grok-4-fast', label: 'Grok 4 Fast', provider: 'xAI', description: 'Fast & cheap - $0.20/$0.50 per 1M tokens', cost: '$', speed: 'Very Fast' },
  { value: 'grok-4', label: 'Grok 4', provider: 'xAI', description: 'Full Grok - $3/$15 per 1M tokens', cost: '$$', speed: 'Fast' },

  // OpenAI GPT models
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI', description: 'Budget model - $0.15/$0.60 per 1M tokens', cost: '$', speed: 'Very Fast' },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', description: 'Latest OpenAI with vision - $5/$15 per 1M tokens', cost: '$$', speed: 'Fast' },

  // Anthropic Claude 3.5 models
  { value: 'claude-3.5-haiku', label: 'Claude 3.5 Haiku', provider: 'Anthropic', description: 'Fast & cheap - $0.80/$4 per 1M tokens', cost: '$', speed: 'Very Fast' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Best coding model - $3/$15 per 1M tokens', cost: '$$', speed: 'Fast' }
] as const;

// Core modules (6 analyzers - matching backend exactly)
const CORE_MODULES = [
  { value: 'desktopVisual', label: 'Desktop Design', description: 'Vision analysis of desktop screenshots', defaultModel: 'gpt-4o' },
  { value: 'mobileVisual', label: 'Mobile Design', description: 'Vision analysis of mobile screenshots', defaultModel: 'gpt-4o' },
  { value: 'seo', label: 'SEO Analysis', description: 'Technical SEO + keywords', defaultModel: 'grok-4-fast' },
  { value: 'content', label: 'Content Analysis', description: 'Copy quality + messaging', defaultModel: 'grok-4-fast' },
  { value: 'social', label: 'Social Media', description: 'Social profiles + presence', defaultModel: 'grok-4-fast' },
  { value: 'accessibility', label: 'Accessibility', description: 'WCAG 2.1 Level AA compliance', defaultModel: 'grok-4-fast' }
] as const;

export function AnalysisConfig({
  prospectCount,
  onSubmit,
  isLoading,
  disabled,
  customPrompts: customPromptsFromPage,
  defaultPrompts: defaultPromptsFromPage,
  onPromptsChange,
  promptsLocked = false,
  leadsCount = 0
}: AnalysisConfigProps) {
  // Initialize default model selections
  const [modelSelections, setModelSelections] = useState<ModuleModelSelection>(() => {
    const defaults: ModuleModelSelection = {};
    CORE_MODULES.forEach(m => {
      defaults[m.value] = m.defaultModel;
    });
    return defaults;
  });

  // UI state
  const [maxPages, setMaxPages] = useState([10]);

  // Internal prompt state (used if page doesn't provide prompts)
  const [internalCustomPrompts, setInternalCustomPrompts] = useState<AnalysisPrompts>({});
  const [internalDefaultPrompts, setInternalDefaultPrompts] = useState<AnalysisPrompts>({});
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);

  // Load default prompts internally if not provided by page
  useEffect(() => {
    if (defaultPromptsFromPage) {
      setIsLoadingPrompts(false);
      return;
    }

    async function loadDefaultPrompts() {
      try {
        const response = await fetch('/api/analysis/prompts/default');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setInternalDefaultPrompts(data.data);
            setInternalCustomPrompts(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to load default prompts:', error);
      } finally {
        setIsLoadingPrompts(false);
      }
    }

    loadDefaultPrompts();
  }, [defaultPromptsFromPage]);

  // Use page prompts if provided, otherwise use internal prompts
  const customPrompts = customPromptsFromPage || internalCustomPrompts;
  const defaultPrompts = defaultPromptsFromPage || internalDefaultPrompts;
  const handlePromptsChange = onPromptsChange || setInternalCustomPrompts;

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<AnalysisOptionsFormData>({
    resolver: zodResolver(analysisOptionsSchema),
    defaultValues: {
      tier: 'tier3', // Deprecated but kept for backward compatibility
      modules: ['desktopVisual', 'mobileVisual', 'seo', 'content', 'social', 'accessibility'], // All 6 core modules
      capture_screenshots: true,
      multi_page_analysis: true,
      lead_scoring: true,
      page_analysis: true,
      discovery_log: true,
      use_sitemap: true,
      use_robots: true,
      use_navigation: true,
      model_selections: modelSelections,
      autoEmail: false,
      autoAnalyze: false
    }
  });

  const captureScreenshots = watch('capture_screenshots');

  // Calculate estimated cost
  // ~$0.017 per lead based on actual usage
  const costPerLead = 0.017;
  const estimatedCost = costPerLead * prospectCount;

  // Handle form submission - IMPORTANT: Merge model selections into custom prompts
  const handleFormSubmit = (data: AnalysisOptionsFormData) => {
    // Merge model selections into prompt configurations
    const mergedPrompts: any = { ...customPrompts };

    Object.entries(modelSelections).forEach(([module, modelId]) => {
      if (mergedPrompts[module]) {
        // Update the model field in the prompt config for this module
        mergedPrompts[module] = {
          ...mergedPrompts[module],
          model: modelId
        };
      }
    });

    onSubmit({
      ...data,
      custom_prompts: mergedPrompts
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Analysis Configuration</span>
            </CardTitle>
            <CardDescription className="mt-1">
              Complete website analysis with all 6 AI modules • Multi-page discovery • Lead scoring
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Zap className="w-3 h-3" />
            <span>v2.0</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">

          {/* AI Model Selection - TOP */}
          <ModelSelector
            modules={CORE_MODULES}
            models={AI_MODELS}
            selectedModels={modelSelections}
            onChange={setModelSelections}
            disabled={disabled || isLoading}
          />

          {/* Prompt Editor (Expert) - SECOND */}
          {!isLoadingPrompts && Object.keys(defaultPrompts).length > 0 && (
            <PromptEditor
              prompts={customPrompts}
              defaultPrompts={defaultPrompts}
              onChange={handlePromptsChange}
              locked={promptsLocked}
              leadsCount={leadsCount}
            />
          )}

          {/* Advanced Analysis Settings */}
          <div className="space-y-4">
            <Label className="flex items-center space-x-2">
              <span>Intelligent Analysis Features</span>
              <Badge variant="secondary" className="text-xs">Enabled</Badge>
            </Label>

            {/* Intelligent Multi-Page Analysis */}
            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <Label htmlFor="multi_page_analysis" className="cursor-pointer font-medium">
                    Intelligent Multi-Page Analysis
                  </Label>
                  <Badge className="text-xs">AI-Powered</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically discover & analyze key business pages
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  • Homepage • About/Services • Pricing • Contact • Blog
                </p>
              </div>
              <Controller
                name="multi_page_analysis"
                control={control}
                defaultValue={true}
                render={({ field }) => (
                  <Checkbox
                    id="multi_page_analysis"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    disabled={disabled || isLoading}
                  />
                )}
              />
            </div>

            {/* Lead Scoring */}
            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <Label htmlFor="lead_scoring" className="cursor-pointer font-medium">
                    AI Lead Scoring & Prioritization
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically prioritize leads: Hot (75+) • Warm (50-74) • Cold (0-49)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on website quality, budget signals, urgency indicators
                </p>
              </div>
              <Controller
                name="lead_scoring"
                control={control}
                defaultValue={true}
                render={({ field }) => (
                  <Checkbox
                    id="lead_scoring"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    disabled={disabled || isLoading}
                  />
                )}
              />
            </div>

            {/* Screenshots Toggle */}
            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <Label htmlFor="capture_screenshots" className="cursor-pointer font-medium">
                    Capture Screenshots
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Full-page screenshots for AI vision analysis
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  • Desktop view • Mobile responsive view
                </p>
              </div>
              <Controller
                name="capture_screenshots"
                control={control}
                defaultValue={true}
                render={({ field }) => (
                  <Checkbox
                    id="capture_screenshots"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    disabled={disabled || isLoading}
                  />
                )}
              />
            </div>

            {/* Page Analysis Depth */}
            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <Label htmlFor="page_analysis" className="cursor-pointer font-medium">
                    Deep Page Analysis
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Extract business intelligence from discovered pages
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  • Services offered • Pricing models • Team size • Location
                </p>
              </div>
              <Controller
                name="page_analysis"
                control={control}
                defaultValue={true}
                render={({ field }) => (
                  <Checkbox
                    id="page_analysis"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    disabled={disabled || isLoading}
                  />
                )}
              />
            </div>
          </div>

          {/* Discovery Configuration */}
          <div className="space-y-4">
            <Label className="flex items-center space-x-2">
              <span>Page Discovery Methods</span>
              <Badge variant="secondary" className="text-xs">Enabled</Badge>
            </Label>

            {/* Discovery Methods Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="use_sitemap" className="text-sm cursor-pointer">Sitemap</Label>
                    <p className="text-xs text-muted-foreground">sitemap.xml</p>
                  </div>
                </div>
                <Controller
                  name="use_sitemap"
                  control={control}
                  defaultValue={true}
                  render={({ field }) => (
                    <Checkbox
                      id="use_sitemap"
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      disabled={disabled || isLoading}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="use_navigation" className="text-sm cursor-pointer">Navigation</Label>
                    <p className="text-xs text-muted-foreground">Menu links</p>
                  </div>
                </div>
                <Controller
                  name="use_navigation"
                  control={control}
                  defaultValue={true}
                  render={({ field }) => (
                    <Checkbox
                      id="use_navigation"
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      disabled={disabled || isLoading}
                    />
                  )}
                />
              </div>
            </div>

            {/* Max Pages Setting */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">Pages to Analyze</Label>
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{maxPages[0]} pages</span>
              </div>
              <Slider
                value={maxPages}
                onValueChange={setMaxPages}
                min={5}
                max={25}
                step={5}
                className="w-full mb-2"
                disabled={disabled || isLoading}
              />
              <p className="text-xs text-muted-foreground">
                AI selects most important pages: Homepage, About, Services, Pricing, Contact
              </p>
            </div>
          </div>

          {/* Cost Estimate */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estimated Total Cost</span>
              <span className="text-2xl font-bold">{formatCurrency(estimatedCost)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{prospectCount} prospect{prospectCount === 1 ? '' : 's'}</span>
              <span>{formatCurrency(costPerLead)} per lead</span>
            </div>
            <div className="text-xs text-muted-foreground border-t pt-2 mt-2 space-y-1">
              <div>✓ Intelligent multi-page discovery & analysis (homepage, about, pricing, contact, etc.)</div>
              <div>✓ 6 AI modules: Desktop/Mobile Design, SEO, Content, Social, Accessibility</div>
              <div>✓ Lead scoring & prioritization (Hot/Warm/Cold)</div>
              <div>✓ Business intelligence extraction</div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={disabled || prospectCount === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze {prospectCount} Prospect{prospectCount === 1 ? '' : 's'}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default AnalysisConfig;
