'use client';

/**
 * Analysis Configuration Component
 * Configure multi-page crawling and analysis options
 *
 * NEW ARCHITECTURE (v2.0):
 * - No more tier selection (always runs full analysis)
 * - Multi-page crawling enabled by default
 * - AI lead scoring always enabled
 * - All core modules: design, SEO, content, performance, social
 * - Per-module AI model selection
 */

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings, Loader2, Sparkles, Zap, TrendingUp, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// Available AI models
const AI_MODELS = [
  // Anthropic Claude
  { value: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5', provider: 'Anthropic', description: 'Best coding model', cost: '$$', speed: 'Fast' },
  { value: 'claude-opus-4.1', label: 'Claude Opus 4.1', provider: 'Anthropic', description: 'Most powerful', cost: '$$$', speed: 'Slow' },
  { value: 'claude-haiku-4.5', label: 'Claude Haiku 4.5', provider: 'Anthropic', description: 'Fast & cheap', cost: '$', speed: 'Very Fast' },

  // xAI Grok
  { value: 'grok-4', label: 'Grok 4', provider: 'xAI', description: '256K context, tools', cost: '$$', speed: 'Fast' },
  { value: 'grok-4-fast', label: 'Grok 4 Fast', provider: 'xAI', description: '98% cost reduction', cost: '$', speed: 'Very Fast' },
  { value: 'grok-3', label: 'Grok 3', provider: 'xAI', description: 'Previous flagship', cost: '$$', speed: 'Fast' },

  // OpenAI GPT
  { value: 'gpt-5', label: 'GPT-5', provider: 'OpenAI', description: 'Newest flagship', cost: '$$$', speed: 'Medium' },
  { value: 'gpt-4.1', label: 'GPT-4.1', provider: 'OpenAI', description: '1M context', cost: '$$', speed: 'Fast' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'OpenAI', description: 'Smaller & faster', cost: '$', speed: 'Very Fast' },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', description: 'Multimodal vision', cost: '$$', speed: 'Fast' }
] as const;

// Core modules always run (cannot be disabled)
const CORE_MODULES = [
  { value: 'design', label: 'Design Analysis', description: 'Vision-based screenshot analysis', defaultModel: 'gpt-4o' },
  { value: 'seo', label: 'SEO Analysis', description: 'Technical SEO + keywords', defaultModel: 'grok-4-fast' },
  { value: 'content', label: 'Content Analysis', description: 'Copy quality + messaging', defaultModel: 'grok-4-fast' },
  { value: 'performance', label: 'Performance', description: 'Page speed + optimization', defaultModel: 'grok-4-fast' },
  { value: 'social', label: 'Social Media', description: 'Social profiles + presence', defaultModel: 'grok-4-fast' }
] as const;

// Optional modules (can be toggled)
const OPTIONAL_MODULES = [
  { value: 'accessibility', label: 'Accessibility', description: 'WCAG compliance (adds +$0.003)', defaultModel: 'grok-4-fast' }
] as const;

// AI Lead Scoring
const LEAD_SCORING_DEFAULT_MODEL = 'claude-sonnet-4.5';

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
    OPTIONAL_MODULES.forEach(m => {
      defaults[m.value] = m.defaultModel;
    });
    return defaults;
  });

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
      modules: ['design', 'seo', 'content', 'performance', 'social'], // Always include core modules
      capture_screenshots: true,
      max_pages: 30,
      level_2_sample_rate: 0.5, // 50% sampling for level-2+ pages
      max_crawl_time: 120, // 2 minutes
      model_selections: modelSelections,
      autoEmail: false,
      autoAnalyze: false
    }
  });

  const modules = watch('modules');
  const captureScreenshots = watch('capture_screenshots');
  const maxPages = watch('max_pages') || 30;
  const sampleRate = watch('level_2_sample_rate') || 0.5;
  const maxCrawlTime = watch('max_crawl_time') || 120;

  const includeAccessibility = modules?.includes('accessibility');

  // Calculate estimated cost
  // New cost: ~$0.014/lead (based on testing)
  const baseCost = 0.014; // Multi-page crawling + 5 modules + AI lead scoring
  const accessibilityCost = includeAccessibility ? 0.003 : 0;
  const costPerLead = baseCost + accessibilityCost;
  const estimatedCost = costPerLead * prospectCount;

  // Handle form submission with model selections and custom prompts
  const handleFormSubmit = (data: AnalysisOptionsFormData) => {
    onSubmit({
      ...data,
      model_selections: modelSelections,
      custom_prompts: customPrompts || {}
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
              Multi-page crawling + AI lead scoring + custom models
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

          {/* Core Modules (Always Enabled) */}
          <div className="space-y-3">
            <Label className="flex items-center space-x-2">
              <span>Core Analysis Modules</span>
              <Badge variant="secondary" className="text-xs">Always On</Badge>
            </Label>
            <div className="space-y-2">
              {CORE_MODULES.map((module) => (
                <div
                  key={module.value}
                  className="flex items-start space-x-3 rounded-lg border p-3 bg-muted/50"
                >
                  <Checkbox
                    id={module.value}
                    checked={true}
                    disabled={true}
                  />
                  <div className="flex-1">
                    <Label htmlFor={module.value} className="cursor-default">
                      <div className="font-medium">{module.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {module.description}
                      </div>
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Modules */}
          <div className="space-y-3">
            <Label>Optional Modules</Label>
            <Controller
              name="modules"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  {OPTIONAL_MODULES.map((module) => {
                    const isChecked = field.value?.includes(module.value as any);

                    return (
                      <div
                        key={module.value}
                        className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 cursor-pointer"
                      >
                        <Checkbox
                          id={module.value}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const coreModules = ['design', 'seo', 'content', 'performance', 'social'];
                            const newModules = checked
                              ? [...coreModules, module.value]
                              : coreModules;
                            field.onChange(newModules);
                          }}
                          disabled={disabled || isLoading}
                        />
                        <div className="flex-1">
                          <Label htmlFor={module.value} className="cursor-pointer">
                            <div className="font-medium">{module.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {module.description}
                            </div>
                          </Label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            />
          </div>

          {/* AI Model Selection */}
          <ModelSelector
            modules={CORE_MODULES}
            models={AI_MODELS}
            selectedModels={modelSelections}
            onChange={setModelSelections}
            disabled={disabled || isLoading}
          />

          {/* Prompt Editor (Expert) */}
          {!isLoadingPrompts && Object.keys(defaultPrompts).length > 0 && (
            <PromptEditor
              prompts={customPrompts}
              defaultPrompts={defaultPrompts}
              onChange={handlePromptsChange}
              locked={promptsLocked}
              leadsCount={leadsCount}
            />
          )}

          {/* Multi-Page Crawling Configuration */}
          <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <Label className="font-semibold">Multi-Page Crawling</Label>
            </div>

            {/* Max Pages */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="max_pages" className="text-sm">Max Pages to Crawl</Label>
                <span className="text-sm font-medium">{maxPages} pages</span>
              </div>
              <Controller
                name="max_pages"
                control={control}
                render={({ field }) => (
                  <Slider
                    id="max_pages"
                    min={5}
                    max={50}
                    step={5}
                    value={[field.value || 30]}
                    onValueChange={(value) => field.onChange(value[0])}
                    disabled={disabled || isLoading}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Crawls all level-1 pages (main nav) + sampled level-2+ pages
              </p>
            </div>

            {/* Sample Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sample_rate" className="text-sm">Level-2+ Sample Rate</Label>
                <span className="text-sm font-medium">{Math.round(sampleRate * 100)}%</span>
              </div>
              <Controller
                name="level_2_sample_rate"
                control={control}
                render={({ field }) => (
                  <Slider
                    id="sample_rate"
                    min={0.25}
                    max={1.0}
                    step={0.05}
                    value={[field.value || 0.5]}
                    onValueChange={(value) => field.onChange(value[0])}
                    disabled={disabled || isLoading}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Percentage of sub-pages to analyze (50% recommended)
              </p>
            </div>

            {/* Max Crawl Time */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="max_crawl_time" className="text-sm">Max Crawl Time</Label>
                <span className="text-sm font-medium">{maxCrawlTime}s</span>
              </div>
              <Controller
                name="max_crawl_time"
                control={control}
                render={({ field }) => (
                  <Slider
                    id="max_crawl_time"
                    min={30}
                    max={300}
                    step={30}
                    value={[field.value || 120]}
                    onValueChange={(value) => field.onChange(value[0])}
                    disabled={disabled || isLoading}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Maximum time to spend crawling each website
              </p>
            </div>
          </div>

          {/* Screenshots Toggle */}
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="capture_screenshots" className="cursor-pointer">
                Capture Screenshots
              </Label>
              <p className="text-xs text-muted-foreground">
                For GPT-4o Vision design analysis (included in price)
              </p>
            </div>
            <Controller
              name="capture_screenshots"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="capture_screenshots"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled || isLoading}
                />
              )}
            />
          </div>

          {/* AI Lead Scoring (Always On) */}
          <div className="rounded-lg border p-4 bg-primary/5">
            <div className="flex items-start space-x-3">
              <Checkbox
                checked={true}
                disabled={true}
              />
              <div className="flex-1">
                <Label className="cursor-default">
                  <div className="font-medium flex items-center space-x-2">
                    <span>AI Lead Scoring</span>
                    <Badge variant="secondary" className="text-xs">Always On</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    6-dimension framework: quality gap, budget, urgency, industry fit, company size, engagement
                  </div>
                </Label>
              </div>
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
            <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
              Includes: Multi-page crawling ({maxPages} pages avg) + 5 core modules + AI lead scoring
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
