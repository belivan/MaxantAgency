'use client';

/**
 * Analysis Configuration Component
 * Configure analysis modules and AI model selection
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings, Loader2, Sparkles, Zap, Globe, Search, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { analysisOptionsSchema, type AnalysisOptionsFormData } from '@/lib/utils/validation';
import { formatCurrency } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { type ModuleModelSelection, type AIModel } from './model-selector';
import { type AnalysisPrompts, type PromptConfig } from './prompt-editor';

interface AnalysisConfigProps {
  prospectCount: number;
  onSubmit: (data: AnalysisOptionsFormData) => void;
  isLoading?: boolean;
  disabled?: boolean;
  customPrompts?: AnalysisPrompts;
  defaultPrompts?: AnalysisPrompts;
  onPromptsChange?: (prompts: AnalysisPrompts) => void;
  promptsLocked?: boolean;
  leadsCount?: number;
  modelSelections?: ModuleModelSelection;
  defaultModelSelections?: ModuleModelSelection;
  onModelSelectionsChange?: (selection: ModuleModelSelection) => void;
}

const CORE_MODULES = [
  { value: 'unifiedVisual', label: 'Visual Analysis', description: 'Desktop + Mobile design (unified)', defaultModel: 'claude-haiku-4-5', unified: true },
  { value: 'unifiedTechnical', label: 'Technical Analysis', description: 'SEO + Content quality (unified)', defaultModel: 'claude-haiku-4-5', unified: true },
  { value: 'social', label: 'Social Media', description: 'Social profiles + presence', defaultModel: 'claude-haiku-4-5' },
  { value: 'accessibility', label: 'Accessibility', description: 'WCAG 2.1 Level AA compliance', defaultModel: 'claude-haiku-4-5' },
  { value: 'leadScorer', label: 'Lead Priority Scorer', description: 'AI qualification scoring', defaultModel: 'claude-haiku-4-5' }
] as const;

const AI_MODELS: readonly AIModel[] = [
  {
    value: 'gpt-5',
    label: 'GPT-5 (Flagship)',
    provider: 'OpenAI',
    description: 'Best quality reasoning + vision (recommended)',
    cost: '$$$',
    speed: 'Medium'
  },
  {
    value: 'gpt-5-mini',
    label: 'GPT-5 Mini (Vision)',
    provider: 'OpenAI',
    description: 'Balanced quality, supports screenshots',
    cost: '$$',
    speed: 'Fast'
  },
  {
    value: 'gpt-5-nano',
    label: 'GPT-5 Nano',
    provider: 'OpenAI',
    description: 'Ultra budget - $0.10/$0.80 per 1M tokens',
    cost: '$',
    speed: 'Very Fast'
  },
  {
    value: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    description: 'Strong writing + structured output',
    cost: '$$',
    speed: 'Fast'
  },
  {
    value: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    description: 'Fast Claude 4.5 - Best value',
    cost: '$',
    speed: 'Very Fast'
  },
  {
    value: 'grok-4-fast',
    label: 'Grok-4 Fast',
    provider: 'xAI',
    description: 'Fast analysis, good for SEO modules',
    cost: '$',
    speed: 'Very Fast'
  },
  {
    value: 'grok-4',
    label: 'Grok-4 Large',
    provider: 'xAI',
    description: 'Higher quality xAI option',
    cost: '$$',
    speed: 'Fast'
  }
] as const;
const deriveSelectionsFromPrompts = (prompts: AnalysisPrompts | null): ModuleModelSelection => {
  const defaults: ModuleModelSelection = {};
  CORE_MODULES.forEach(module => {
    defaults[module.value] = module.defaultModel;
  });
  if (!prompts) {
    return defaults;
  }
  CORE_MODULES.forEach(module => {
    const prompt = prompts[module.value] as PromptConfig | undefined;
    if (prompt?.model) {
      defaults[module.value] = prompt.model;
    }
  });
  return defaults;
};

export function AnalysisConfig({
  prospectCount,
  onSubmit,
  isLoading,
  disabled,
  customPrompts: customPromptsFromPage,
  defaultPrompts: defaultPromptsFromPage,
  onPromptsChange,
  promptsLocked = false,
  leadsCount = 0,
  modelSelections: externalModelSelections,
  defaultModelSelections: externalDefaultSelections,
  onModelSelectionsChange
}: AnalysisConfigProps) {
  const baselineDefaultSelections = useMemo(() => deriveSelectionsFromPrompts(null), []);

  const [internalModelSelections, setInternalModelSelections] = useState<ModuleModelSelection>(
    externalModelSelections ?? (externalDefaultSelections ?? baselineDefaultSelections)
  );

  useEffect(() => {
    if (externalModelSelections) {
      setInternalModelSelections(externalModelSelections);
    }
  }, [externalModelSelections]);

  const [maxPages, setMaxPages] = useState([5]);
  const [internalCustomPrompts, setInternalCustomPrompts] = useState<AnalysisPrompts>({});
  const [internalDefaultPrompts, setInternalDefaultPrompts] = useState<AnalysisPrompts>({});
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);

  const customPrompts = customPromptsFromPage || internalCustomPrompts;
  const defaultPrompts = defaultPromptsFromPage || internalDefaultPrompts;
  const handlePromptsChange = onPromptsChange || setInternalCustomPrompts;

  // Use ref to store the callback to avoid it being in dependencies
  const onModelSelectionsChangeRef = useRef(onModelSelectionsChange);
  useEffect(() => {
    onModelSelectionsChangeRef.current = onModelSelectionsChange;
  }, [onModelSelectionsChange]);

  useEffect(() => {
    if (customPrompts) {
      const derived = deriveSelectionsFromPrompts(customPrompts);
      if (externalModelSelections) {
        onModelSelectionsChangeRef.current?.(derived);
      } else {
        setInternalModelSelections(derived);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customPrompts]);

  // Track if prompts have been loaded to prevent infinite loops
  const promptsLoadedRef = useRef(false);

  useEffect(() => {
    if (defaultPromptsFromPage) {
      setInternalDefaultPrompts(defaultPromptsFromPage);
      setInternalCustomPrompts(defaultPromptsFromPage);
      setIsLoadingPrompts(false);
      
      // Only call onModelSelectionsChange if we haven't already loaded
      if (!promptsLoadedRef.current) {
        const derived = deriveSelectionsFromPrompts(defaultPromptsFromPage);
        if (externalModelSelections) {
          onModelSelectionsChangeRef.current?.(derived);
        } else {
          setInternalModelSelections(derived);
        }
        promptsLoadedRef.current = true;
      }
      return;
    }

    async function loadDefaultPrompts() {
      try {
        setIsLoadingPrompts(true);
        const response = await fetch('/api/analysis/prompts');
        const result = await response.json();

        if (result.success) {
          setInternalDefaultPrompts(result.data);
          setInternalCustomPrompts(result.data);
          const derived = deriveSelectionsFromPrompts(result.data as AnalysisPrompts);
          if (externalModelSelections) {
            onModelSelectionsChangeRef.current?.(derived);
          } else {
            setInternalModelSelections(derived);
          }
          promptsLoadedRef.current = true;
        }
      } catch (error) {
        console.error('Failed to load default prompts:', error);
      } finally {
        setIsLoadingPrompts(false);
      }
    }

    if (!promptsLoadedRef.current) {
      loadDefaultPrompts();
    }
  }, [defaultPromptsFromPage, externalModelSelections]); // Removed onModelSelectionsChange from dependencies

  const activeModelSelections = externalModelSelections ?? internalModelSelections;
  const defaultSelectionsForReset = externalDefaultSelections ?? baselineDefaultSelections;

  const handleModelSelectionChange = (selection: ModuleModelSelection) => {
    onModelSelectionsChange?.(selection);
    if (!externalModelSelections) {
      setInternalModelSelections(selection);
    }

    const updatedPrompts: AnalysisPrompts = { ...(customPrompts || {}) };
    let changed = false;

    CORE_MODULES.forEach(module => {
      const existing = updatedPrompts[module.value];
      if (existing && typeof existing === 'object') {
        const prompt = existing as PromptConfig;
        if (prompt.model !== selection[module.value]) {
          updatedPrompts[module.value] = {
            ...prompt,
            model: selection[module.value]
          };
          changed = true;
        }
      }
    });

    if (changed) {
      handlePromptsChange(updatedPrompts);
    }
  };

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(analysisOptionsSchema),
    defaultValues: {
      tier: 'tier3',
      modules: ['desktopVisual', 'mobileVisual', 'seo', 'content', 'social', 'accessibility'],
      capture_screenshots: true,
      multi_page_analysis: true,
      lead_scoring: true,
      page_analysis: true,
      discovery_log: true,
      use_sitemap: true,
      use_robots: true,
      use_navigation: true,
      model_selections: activeModelSelections,
      autoEmail: false,
      autoAnalyze: false
      // max_pages, level_2_sample_rate, max_crawl_time use Zod schema defaults
    }
  });

  const captureScreenshots = watch('capture_screenshots');

  const costPerLead = 0.017;
  const estimatedCost = costPerLead * prospectCount;

  const handleFormSubmit = (data: AnalysisOptionsFormData) => {
    const mergedPrompts: AnalysisPrompts = { ...(customPrompts || {}) };

    Object.entries(activeModelSelections).forEach(([module, modelId]) => {
      if (mergedPrompts[module]) {
        mergedPrompts[module] = {
          ...(mergedPrompts[module] as PromptConfig),
          model: modelId
        };
      }
    });

    onSubmit({
      ...data,
      model_selections: activeModelSelections,
      custom_prompts: mergedPrompts,
      max_pages: maxPages[0]
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Analysis Config</span>
          </CardTitle>
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <Zap className="w-3 h-3" />
            <span>v2.0</span>
          </Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm mt-1 hidden sm:block">
          6 AI modules · Multi-page discovery · Lead scoring
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 sm:space-y-6">
          <div className="space-y-3 sm:space-y-4">
            <Label className="flex items-center gap-2 text-sm">
              <span>AI Features</span>
              <Badge variant="secondary" className="text-xs">On</Badge>
            </Label>

            <div className="flex items-center justify-between gap-2 rounded-lg border p-3 sm:p-4 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <Label htmlFor="multi_page_analysis" className="cursor-pointer font-medium text-sm">
                    Multi-Page Analysis
                  </Label>
                  <Badge className="text-[10px] sm:text-xs">AI</Badge>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Auto-discover key pages (About, Services, Pricing, Contact)
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
                    className="flex-shrink-0"
                  />
                )}
              />
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg border p-3 sm:p-4">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <Label htmlFor="lead_scoring" className="cursor-pointer font-medium text-sm">
                    Lead Scoring
                  </Label>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Hot/Warm/Cold prioritization based on quality signals
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
                    className="flex-shrink-0"
                  />
                )}
              />
            </div>

            <div className="space-y-3 sm:space-y-4">
              <Label className="flex items-center gap-2 text-sm">
                <span>Discovery</span>
                <Badge variant="secondary" className="text-xs">On</Badge>
              </Label>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="flex items-center justify-between rounded-lg border p-2.5 sm:p-3">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    <Label htmlFor="use_sitemap" className="text-xs sm:text-sm cursor-pointer">Sitemap</Label>
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

                <div className="flex items-center justify-between rounded-lg border p-2.5 sm:p-3">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    <Label htmlFor="use_navigation" className="text-xs sm:text-sm cursor-pointer">Navigation</Label>
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

              <div className="rounded-lg border p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <Label className="text-xs sm:text-sm font-medium">Pages to Analyze</Label>
                  <span className="text-xs sm:text-sm font-mono bg-muted px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">{maxPages[0]}</span>
                </div>
                <Slider
                  value={maxPages}
                  onValueChange={setMaxPages}
                  min={1}
                  max={15}
                  step={1}
                  className="w-full"
                  disabled={disabled || isLoading}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3 sm:p-4 space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-medium">Est. Cost</span>
              <span className="text-lg sm:text-2xl font-bold">{formatCurrency(estimatedCost)}</span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
              <span>{prospectCount} prospect{prospectCount === 1 ? '' : 's'}</span>
              <span>{formatCurrency(costPerLead)}/lead</span>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="default"
            disabled={disabled || prospectCount === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="text-sm">Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                <span className="text-sm">Analyze {prospectCount}</span>
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default AnalysisConfig;
