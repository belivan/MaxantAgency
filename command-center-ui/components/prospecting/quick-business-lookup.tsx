'use client';

/**
 * Quick Business Lookup Component
 * Look up a single business by name or website without requiring an ICP
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Loader2, CheckCircle2, MapPin, Star, Globe, Mail, Phone, Users, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { lookupSingleBusiness } from '@/lib/api/prospecting';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import type { Prospect, BusinessLookupOptions } from '@/lib/types';

const lookupSchema = z.object({
  query: z.string().min(3, 'Query must be at least 3 characters').max(200, 'Query too long')
});

type LookupFormData = z.infer<typeof lookupSchema>;

interface QuickBusinessLookupProps {
  selectedProjectId: string | null;
  disabled?: boolean;
  engineOffline?: boolean;
  onSuccess?: (prospect: Prospect) => void;
}

export function QuickBusinessLookup({
  selectedProjectId,
  disabled = false,
  engineOffline = false,
  onSuccess
}: QuickBusinessLookupProps) {
  const [result, setResult] = useState<Prospect | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [costInfo, setCostInfo] = useState<{ cost: number; time: number } | null>(null);

  const { startTask, updateTask, addLog: addTaskLog, completeTask, errorTask } = useTaskProgress();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<LookupFormData>({
    resolver: zodResolver(lookupSchema),
    defaultValues: {
      query: ''
    }
  });

  const onSubmit = async (data: LookupFormData) => {
    if (!selectedProjectId) {
      setError('Please select a project first');
      return;
    }

    setError(null);
    setResult(null);
    setCostInfo(null);

    const taskId = startTask('prospecting', `Looking up: ${data.query}`, 1);
    addTaskLog(taskId, 'Starting business lookup...', 'info');

    try {
      const options: BusinessLookupOptions = {
        projectId: selectedProjectId,
        scrapeWebsite: true,
        findSocial: true,
        scrapeSocial: false,
        fullPageScreenshots: false
      };

      addTaskLog(taskId, 'Searching Google Maps...', 'info');
      const lookupResult = await lookupSingleBusiness(data.query, options);

      if (!lookupResult.success || !lookupResult.prospect) {
        throw new Error('Business not found');
      }

      setResult(lookupResult.prospect);
      setCostInfo({
        cost: lookupResult.metadata.discovery_cost_usd,
        time: lookupResult.metadata.discovery_time_ms
      });

      addTaskLog(taskId, `Found: ${lookupResult.prospect.company_name}`, 'success');
      completeTask(taskId);

      // Call success callback
      if (onSuccess) {
        onSuccess(lookupResult.prospect);
      }

      // Clear form
      reset();

    } catch (err: any) {
      let errorMessage = err.message || 'Failed to lookup business';

      // Enhance "not found" error with helpful suggestions
      if (errorMessage.includes('not found') || errorMessage.includes('Business not found')) {
        errorMessage = 'not_found';
      }

      setError(errorMessage);
      addTaskLog(taskId, errorMessage === 'not_found' ? 'Business not found in Google Maps' : errorMessage, 'error');
      errorTask(taskId, errorMessage === 'not_found' ? 'Business not found in Google Maps' : errorMessage);
    }
  };

  const isDisabled = disabled || engineOffline || isSubmitting || !selectedProjectId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Search className="w-5 h-5" />
          <span>Quick Business Lookup</span>
        </CardTitle>
        <CardDescription>
          Look up a single business by name or website
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Project Warning */}
        {!selectedProjectId && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Project Required</AlertTitle>
            <AlertDescription>
              Please select a project below to continue
            </AlertDescription>
          </Alert>
        )}

        {/* Engine Offline Warning */}
        {engineOffline && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Prospecting Engine Offline</AlertTitle>
            <AlertDescription>
              Please start the prospecting engine (port 3010)
            </AlertDescription>
          </Alert>
        )}

        {/* Lookup Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="query">
              Business Name or URL <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="query"
                placeholder="Business Name + City"
                {...register('query')}
                disabled={isDisabled}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isDisabled}
                size="default"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
            {errors.query && (
              <p className="text-sm text-destructive">{errors.query.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              <strong>Best results:</strong> Include city name (e.g., "Starbucks Philadelphia")
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Also works with URLs if the business has a Google Maps listing
            </p>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            {error === 'not_found' ? (
              <>
                <AlertTitle>Business Not Found in Google Maps</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>This business may not have a Google Maps listing, or we couldn't find it with that query.</p>
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="font-medium">Try these alternatives:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Add the city/location: <code className="text-xs bg-black/10 px-1 py-0.5 rounded">"Business Name City"</code></li>
                      <li>Use the exact business name from Google Maps</li>
                      <li>Try a different variation of the business name</li>
                      <li>Search for a related business at the same location</li>
                    </ul>
                  </div>
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs">
                      <strong>Note:</strong> Quick Lookup only works for businesses with Google Maps listings.
                      If this business doesn't appear on Google Maps, you'll need to add it manually or use bulk prospecting with a broader search.
                    </p>
                  </div>
                </AlertDescription>
              </>
            ) : (
              <AlertDescription>{error}</AlertDescription>
            )}
          </Alert>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            {/* Success Header */}
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold text-lg">{result.company_name}</h3>

                {/* Location & Rating */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {result.city && result.state && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{result.city}, {result.state}</span>
                    </div>
                  )}
                  {result.google_rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{result.google_rating} ({result.google_review_count || 0} reviews)</span>
                    </div>
                  )}
                </div>

                {/* Industry Badge */}
                {result.industry && (
                  <div className="pt-1">
                    <Badge variant="secondary">{result.industry}</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 text-sm">
              {result.website && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <a
                    href={result.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate"
                  >
                    {result.website}
                  </a>
                </div>
              )}

              {result.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{result.contact_email}</span>
                </div>
              )}

              {result.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{result.contact_phone}</span>
                </div>
              )}

              {/* Social Profiles Count */}
              {result.social_profiles && Object.values(result.social_profiles).filter(Boolean).length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">
                    {Object.values(result.social_profiles).filter(Boolean).length} social profiles found
                  </span>
                </div>
              )}
            </div>

            {/* Cost & Time Info */}
            {costInfo && (
              <div className="pt-2 border-t text-xs text-muted-foreground flex justify-between">
                <span>Cost: ${costInfo.cost.toFixed(4)}</span>
                <span>Time: {(costInfo.time / 1000).toFixed(1)}s</span>
              </div>
            )}

            {/* Success Message */}
            <Alert className="bg-green-50 dark:bg-green-950 border-green-600">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>{result.company_name}</strong> has been added to your prospects table below.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
