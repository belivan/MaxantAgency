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

  const [maxPages, setMaxPages] = useState([10]);
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
              Complete website analysis with all 6 AI modules · Multi-page discovery · Lead scoring
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
          <div className="space-y-4">
            <Label className="flex items-center space-x-2">
              <span>Intelligent Analysis Features</span>
              <Badge variant="secondary" className="text-xs">Enabled</Badge>
            </Label>

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
                  ✓ Homepage ✓ About/Services ✓ Pricing ✓ Contact ✓ Blog
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

            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <Label htmlFor="lead_scoring" className="cursor-pointer font-medium">
                    AI Lead Scoring & Prioritization
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically prioritize leads: Hot (75+) · Warm (50-74) · Cold (0-49)
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

            <div className="space-y-4">
              <Label className="flex items-center space-x-2">
                <span>Page Discovery Methods</span>
                <Badge variant="secondary" className="text-xs">Enabled</Badge>
              </Label>

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
          </div>

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
