'use client';

/**
 * Analysis Configuration Component
 * Configure analysis depth (tier) and modules
 */

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { analysisOptionsSchema, type AnalysisOptionsFormData } from '@/lib/utils/validation';
import { calculateAnalysisCost } from '@/lib/utils/cost-calculator';
import { formatCurrency } from '@/lib/utils/format';

interface AnalysisConfigProps {
  prospectCount: number;
  onSubmit: (data: AnalysisOptionsFormData) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const TIERS = [
  {
    value: 'tier1',
    label: 'Tier 1 - Basic',
    description: 'Fast analysis, essential metrics',
    cost: 0.04,
    modules: ['design']
  },
  {
    value: 'tier2',
    label: 'Tier 2 - Standard',
    description: 'Balanced depth and speed',
    cost: 0.08,
    modules: ['design', 'seo']
  },
  {
    value: 'tier3',
    label: 'Tier 3 - Deep',
    description: 'Comprehensive analysis',
    cost: 0.15,
    modules: ['design', 'seo', 'content', 'performance']
  }
] as const;

const ALL_MODULES = [
  { value: 'design', label: 'Design Analysis', description: 'UI/UX issues, visual hierarchy' },
  { value: 'seo', label: 'SEO Analysis', description: 'Meta tags, structure, keywords' },
  { value: 'content', label: 'Content Analysis', description: 'Copy quality, messaging' },
  { value: 'performance', label: 'Performance', description: 'Load times, optimization' },
  { value: 'accessibility', label: 'Accessibility', description: 'WCAG compliance, a11y' },
  { value: 'social', label: 'Social Media', description: 'Social profiles, presence' }
] as const;

export function AnalysisConfig({
  prospectCount,
  onSubmit,
  isLoading,
  disabled
}: AnalysisConfigProps) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<AnalysisOptionsFormData>({
    resolver: zodResolver(analysisOptionsSchema),
    defaultValues: {
      tier: 'tier2',
      modules: ['design', 'seo'],
      capture_screenshots: true,
      autoEmail: false,
      autoAnalyze: false
    }
  });

  const tier = watch('tier');
  const modules = watch('modules');
  const captureScreenshots = watch('capture_screenshots');

  // Calculate estimated cost
  const estimatedCost = calculateAnalysisCost(
    prospectCount,
    tier,
    modules,
    { captureScreenshots }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Analysis Configuration</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Analysis Tier */}
          <div className="space-y-3">
            <Label>Analysis Depth</Label>
            <Controller
              name="tier"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled || isLoading}
                >
                  {TIERS.map((t) => (
                    <div
                      key={t.value}
                      className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 cursor-pointer"
                    >
                      <RadioGroupItem value={t.value} id={t.value} className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor={t.value} className="cursor-pointer">
                          <div className="font-medium">{t.label}</div>
                          <div className="text-sm text-muted-foreground">{t.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatCurrency(t.cost)}/lead • Includes: {t.modules.join(', ')}
                          </div>
                        </Label>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
            {errors.tier && (
              <p className="text-sm text-destructive">{errors.tier.message}</p>
            )}
          </div>

          {/* Analysis Modules */}
          <div className="space-y-3">
            <Label>Additional Modules</Label>
            <Controller
              name="modules"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  {ALL_MODULES.map((module) => {
                    const isChecked = field.value?.includes(module.value as any);
                    const isBaselineModule = TIERS.find(t => t.value === tier)?.modules.includes(module.value as any);

                    return (
                      <div
                        key={module.value}
                        className="flex items-start space-x-3 rounded-lg border p-3"
                      >
                        <Checkbox
                          id={module.value}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const newModules = checked
                              ? [...(field.value || []), module.value]
                              : field.value?.filter(m => m !== module.value);
                            field.onChange(newModules);
                          }}
                          disabled={disabled || isLoading || isBaselineModule}
                        />
                        <div className="flex-1">
                          <Label htmlFor={module.value} className="cursor-pointer">
                            <div className="font-medium flex items-center space-x-2">
                              <span>{module.label}</span>
                              {isBaselineModule && (
                                <span className="text-xs text-muted-foreground">(Included)</span>
                              )}
                            </div>
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
            {errors.modules && (
              <p className="text-sm text-destructive">{errors.modules.message}</p>
            )}
          </div>

          {/* Screenshots Toggle */}
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="capture_screenshots" className="cursor-pointer">
                Capture Screenshots
              </Label>
              <p className="text-xs text-muted-foreground">
                Take desktop and mobile screenshots (+$0.005/lead)
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
              <span>{prospectCount} prospects</span>
              <span>{formatCurrency(estimatedCost / (prospectCount || 1))} per lead</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={disabled || isLoading || prospectCount === 0}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Sparkles className="w-4 h-4 mr-2" />
            Run Analysis on {prospectCount} Prospect{prospectCount === 1 ? '' : 's'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default AnalysisConfig;
