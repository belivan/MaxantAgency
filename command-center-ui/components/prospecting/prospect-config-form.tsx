'use client';

/**
 * Prospect Configuration Form
 * Form for configuring prospect generation settings
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { prospectGenerationSchema, type ProspectGenerationFormData } from '@/lib/utils/validation';
import { calculateProspectingCost } from '@/lib/utils/cost-calculator';
import { formatCurrency } from '@/lib/utils/format';

interface ProspectConfigFormProps {
  onSubmit: (data: ProspectGenerationFormData) => void;
  isLoading?: boolean;
  disabled?: boolean;
  locked?: boolean; // ICP is locked - can't generate with different ICP
  prospectCount?: number; // Number of existing prospects for locked project
  isLoadingProject?: boolean; // Whether project data is being loaded
}

const TEXT_MODELS = [
  {
    value: 'grok-4-fast',
    label: 'Grok 4 Fast',
    description: 'Fast & cheap - $0.20/$0.50 per 1M tokens'
  },
  {
    value: 'gpt-4o',
    label: 'GPT-4o',
    description: 'Balanced - $5/$15 per 1M tokens'
  },
  {
    value: 'gpt-5',
    label: 'GPT-5',
    description: 'Latest OpenAI - $1.25/$10 per 1M tokens'
  },
  {
    value: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    description: 'Best coding model - $3/$15 per 1M tokens'
  },
  {
    value: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    description: 'Fast & cheap - $0.80/$4 per 1M tokens'
  }
] as const;

const VISION_MODELS = [
  {
    value: 'gpt-4o',
    label: 'GPT-4o Vision',
    description: 'Best vision model - $5/$15 per 1M tokens'
  },
  {
    value: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    description: 'High quality vision - $3/$15 per 1M tokens'
  },
  {
    value: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    description: 'Fast vision - $0.80/$4 per 1M tokens'
  }
] as const;

export function ProspectConfigForm({ onSubmit, isLoading, disabled, locked = false, prospectCount = 0, isLoadingProject = false }: ProspectConfigFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ProspectGenerationFormData>({
    resolver: zodResolver(prospectGenerationSchema),
    defaultValues: {
      count: 20,
      model: 'grok-4-fast',
      visionModel: 'gpt-4o',
      verify: true
    }
  });

  const count = watch('count');
  const model = watch('model');
  const visionModel = watch('visionModel');
  const verify = watch('verify');

  // Calculate estimated cost
  const estimatedCost = calculateProspectingCost(
    count || 0,
    model as any,
    { verify }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings2 className="w-5 h-5" />
          <span>Prospect Settings</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Count */}
          <div className="space-y-2">
            <Label htmlFor="count">
              Number of Prospects <span className="text-destructive">*</span>
            </Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={50}
              {...register('count', { valueAsNumber: true })}
              disabled={disabled || isLoading}
            />
            {errors.count && (
              <p className="text-sm text-destructive">{errors.count.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Maximum 50 prospects per run
            </p>
          </div>

          {/* Text Model */}
          <div className="space-y-2">
            <Label htmlFor="model">
              Text AI Model <span className="text-destructive">*</span>
            </Label>
            <Select
              value={model}
              onValueChange={(value) => setValue('model', value as any)}
              disabled={disabled || isLoading}
            >
              <SelectTrigger id="model">
                <SelectValue placeholder="Select text model" />
              </SelectTrigger>
              <SelectContent>
                {TEXT_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{m.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.model && (
              <p className="text-sm text-destructive">{errors.model.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              For query understanding & relevance check
            </p>
          </div>

          {/* Vision Model */}
          <div className="space-y-2">
            <Label htmlFor="visionModel">
              Vision AI Model <span className="text-destructive">*</span>
            </Label>
            <Select
              value={visionModel}
              onValueChange={(value) => setValue('visionModel', value as any)}
              disabled={disabled || isLoading}
            >
              <SelectTrigger id="visionModel">
                <SelectValue placeholder="Select vision model" />
              </SelectTrigger>
              <SelectContent>
                {VISION_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{m.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.visionModel && (
              <p className="text-sm text-destructive">{errors.visionModel.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              For website screenshot extraction
            </p>
          </div>

          {/* Verify URLs */}
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="verify" className="cursor-pointer">
                Verify URLs
              </Label>
              <p className="text-xs text-muted-foreground">
                Check if websites are accessible before adding
              </p>
            </div>
            <Switch
              id="verify"
              checked={verify}
              onCheckedChange={(checked) => setValue('verify', checked)}
              disabled={disabled || isLoading}
            />
          </div>

          {/* Cost Estimate */}
          <div className="rounded-lg bg-muted p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estimated Cost</span>
              <span className="text-lg font-bold">{formatCurrency(estimatedCost)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              ~{formatCurrency(estimatedCost / (count || 1))} per prospect
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={disabled || isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Generate Prospects
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default ProspectConfigForm;
