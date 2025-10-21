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
import { Settings, Loader2, Sparkles, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  { value: 'gpt-5-mini', label: 'GPT-5 Mini', provider: 'OpenAI', description: 'Latest cheap - $0.25/$2 per 1M tokens', cost: '$', speed: 'Very Fast' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI', description: 'Budget vision - $0.15/$0.60 per 1M tokens', cost: '$', speed: 'Very Fast' },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', description: 'Multimodal vision - $5/$15 per 1M tokens', cost: '$$', speed: 'Fast' },
  { value: 'gpt-5', label: 'GPT-5', provider: 'OpenAI', description: 'Latest OpenAI - $1.25/$10 per 1M tokens', cost: '$$', speed: 'Fast' },

  // Anthropic Claude 4.x models
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'Anthropic', description: 'Fast & cheap - $0.80/$4 per 1M tokens', cost: '$', speed: 'Very Fast' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'Anthropic', description: 'Best coding model - $3/$15 per 1M tokens', cost: '$$', speed: 'Fast' }
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
              6 core analysis modules + custom AI model selection
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

          {/* Screenshots Toggle */}
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="capture_screenshots" className="cursor-pointer">
                Capture Screenshots
              </Label>
              <p className="text-xs text-muted-foreground">
                For GPT-4o Vision design analysis (desktop + mobile)
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
              Includes: 6 core analysis modules (desktop design, mobile design, SEO, content, social, accessibility)
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
