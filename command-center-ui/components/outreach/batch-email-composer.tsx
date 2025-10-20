'use client';

/**
 * Batch Email Composer
 * Compose emails for multiple leads at once
 */

import { useState } from 'react';
import { Loader2, Mail, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EmailPreviewCard } from './email-preview-card';
import { GradeBadge } from '@/components/leads/grade-badge';
import { composeEmail } from '@/lib/api/outreach';
import type { Lead, ComposedEmail } from '@/lib/types';

interface BatchEmailComposerProps {
  leads: Lead[];
  strategyId: string;
  onAllGenerated?: (emails: ComposedEmail[]) => void;
}

interface EmailGenerationStatus {
  leadId: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  email?: ComposedEmail;
  error?: string;
}

export function BatchEmailComposer({
  leads,
  strategyId,
  onAllGenerated
}: BatchEmailComposerProps) {
  const [statuses, setStatuses] = useState<Record<string, EmailGenerationStatus>>({});
  const [generating, setGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleGenerateBatch = async () => {
    setGenerating(true);
    setCurrentIndex(0);

    // Initialize statuses
    const initialStatuses: Record<string, EmailGenerationStatus> = {};
    leads.forEach(lead => {
      initialStatuses[lead.id] = {
        leadId: lead.id,
        status: 'pending'
      };
    });
    setStatuses(initialStatuses);

    const completedEmails: ComposedEmail[] = [];

    // Generate emails sequentially
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      setCurrentIndex(i);

      // Update to generating
      setStatuses(prev => ({
        ...prev,
        [lead.id]: { ...prev[lead.id], status: 'generating' }
      }));

      try {
        const email = await composeEmail(lead.website, strategyId);

        // Update to completed
        setStatuses(prev => ({
          ...prev,
          [lead.id]: {
            ...prev[lead.id],
            status: 'completed',
            email
          }
        }));

        completedEmails.push(email);
      } catch (error: any) {
        console.error(`Failed to generate email for ${lead.company_name}:`, error);

        // Update to error
        setStatuses(prev => ({
          ...prev,
          [lead.id]: {
            ...prev[lead.id],
            status: 'error',
            error: error.message || 'Failed to generate email'
          }
        }));
      }

      // Small delay between requests
      if (i < leads.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setGenerating(false);
    onAllGenerated?.(completedEmails);
  };

  const completedCount = Object.values(statuses).filter(s => s.status === 'completed').length;
  const errorCount = Object.values(statuses).filter(s => s.status === 'error').length;
  const progress = leads.length > 0 ? (completedCount + errorCount) / leads.length * 100 : 0;

  const hasStarted = Object.keys(statuses).length > 0;
  const isComplete = hasStarted && completedCount + errorCount === leads.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Batch Email Composer
            </CardTitle>
            <CardDescription>
              Generate personalized emails for {leads.length} lead{leads.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          {!hasStarted && (
            <Button
              onClick={handleGenerateBatch}
              disabled={generating || !strategyId || leads.length === 0}
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate All Emails
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        {hasStarted && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {isComplete ? 'Complete' : 'Generating emails...'}
              </span>
              <span className="text-muted-foreground">
                {completedCount} of {leads.length} completed
                {errorCount > 0 && ` (${errorCount} failed)`}
              </span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Lead Status List */}
        {hasStarted ? (
          <div className="space-y-3">
            {leads.map((lead, idx) => {
              const status = statuses[lead.id];
              if (!status) return null;

              return (
                <div key={lead.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className="shrink-0 mt-1">
                      {status.status === 'completed' && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      )}
                      {status.status === 'error' && (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      {status.status === 'generating' && (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      )}
                      {status.status === 'pending' && (
                        <div className="w-5 h-5 rounded-full border-2 border-muted" />
                      )}
                    </div>

                    {/* Lead Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{lead.company_name}</h4>
                        <GradeBadge grade={lead.grade} size="sm" />
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {lead.website}
                      </p>

                      {/* Error Message */}
                      {status.status === 'error' && status.error && (
                        <div className="mt-2 text-sm text-destructive">
                          {status.error}
                        </div>
                      )}

                      {/* Email Preview */}
                      {status.status === 'completed' && status.email && (
                        <div className="mt-4 space-y-3">
                          {status.email.variants.map((variant, vidx) => (
                            <EmailPreviewCard
                              key={vidx}
                              variant={variant}
                              variantIndex={vidx}
                              leadName={lead.company_name}
                              showActions={true}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Ready to generate {leads.length} email{leads.length !== 1 ? 's' : ''}</p>
            <p className="text-sm mt-2">
              {strategyId
                ? 'Click "Generate All Emails" to start batch composition'
                : 'Please select a strategy first'}
            </p>
          </div>
        )}

        {/* Summary */}
        {isComplete && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                <div className="text-xs text-muted-foreground">Successful</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{leads.length}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BatchEmailComposer;
