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
}

const MODELS = [
  {
    value: 'grok-4-fast',
    label: 'Grok 4 Fast',
    description: 'Recommended - Real companies via web search'
  },
  {
    value: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    description: 'Fast but may generate fake companies'
  },
  {
    value: 'gpt-5-mini',
    label: 'GPT-5 Mini',
    description: 'Newer model, experimental'
  },
  {
    value: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    description: 'High quality, slower'
  }
] as const;

export function ProspectConfigForm({ onSubmit, isLoading, disabled }: ProspectConfigFormProps) {
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
      city: '',
      model: 'grok-4-fast',
      verify: true
    }
  });

  const count = watch('count');
  const model = watch('model');
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

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">City (Optional)</Label>
            <Input
              id="city"
              placeholder="e.g., Philadelphia, PA"
              {...register('city')}
              disabled={disabled || isLoading}
            />
            {errors.city && (
              <p className="text-sm text-destructive">{errors.city.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Leave empty to search nationwide
            </p>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model">
              AI Model <span className="text-destructive">*</span>
            </Label>
            <Select
              value={model}
              onValueChange={(value) => setValue('model', value as any)}
              disabled={disabled || isLoading}
            >
              <SelectTrigger id="model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
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
