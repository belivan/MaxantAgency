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
  children?: React.ReactNode; // Model selector and prompt editor content
}

export function ProspectConfigForm({ onSubmit, isLoading, disabled, locked = false, prospectCount = 0, isLoadingProject = false, children }: ProspectConfigFormProps) {
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
  const verify = watch('verify');

  // Calculate estimated cost
  const estimatedCost = calculateProspectingCost(
    count || 0,
    'grok-4-fast', // Default model for cost estimation
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

          {/* Model Selection & Prompt Editor (if provided) */}
          {children}

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
