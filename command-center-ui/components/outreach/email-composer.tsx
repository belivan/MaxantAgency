'use client';

/**
 * Email Composer
 * Compose and generate personalized emails for leads
 */

import { useState } from 'react';
import { Loader2, Mail, Sparkles } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmailPreviewCard } from './email-preview-card';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { composeEmail } from '@/lib/api/outreach';
import type { Lead, ComposedEmail, EmailVariant } from '@/lib/types';

interface EmailComposerProps {
  lead: Lead;
  strategyId: string;
  onEmailGenerated?: (email: ComposedEmail) => void;
}

export function EmailComposer({ lead, strategyId, onEmailGenerated }: EmailComposerProps) {
  const [composedEmail, setComposedEmail] = useState<ComposedEmail | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const email = await composeEmail(lead.website, strategyId);
      setComposedEmail(email);
      onEmailGenerated?.(email);
    } catch (err: any) {
      console.error('Failed to generate email:', err);
      setError(err.message || 'Failed to generate email');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyVariant = (variant: EmailVariant) => {
    console.log('Copied variant:', variant.variant_name);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Composer
            </CardTitle>
            <CardDescription>
              Generate personalized email for {lead.company_name}
            </CardDescription>
          </div>
          {!composedEmail && (
            <Button
              onClick={handleGenerate}
              disabled={generating || !strategyId}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Email
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3 mb-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {generating ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <LoadingSpinner size="lg" />
            <div className="text-center">
              <p className="font-medium">Generating personalized email...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Analyzing {lead.company_name} and crafting variants
              </p>
            </div>
          </div>
        ) : composedEmail ? (
          <div className="space-y-4">
            {/* Email Metadata */}
            <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{composedEmail.company_name}</h4>
                  <p className="text-sm text-muted-foreground">{composedEmail.website}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              </div>

              {composedEmail.strategy_used && (
                <p className="text-xs text-muted-foreground">
                  Strategy: {composedEmail.strategy_used}
                </p>
              )}
            </div>

            {/* Email Variants */}
            {composedEmail.variants && composedEmail.variants.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">
                  {composedEmail.variants.length} Email Variant{composedEmail.variants.length !== 1 ? 's' : ''}
                </h4>
                <div className="space-y-4">
                  {composedEmail.variants.map((variant, idx) => (
                    <EmailPreviewCard
                      key={idx}
                      variant={variant}
                      variantIndex={idx}
                      leadName={composedEmail.company_name}
                      onCopy={handleCopyVariant}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No variants generated
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Click "Generate Email" to create personalized variants</p>
            <p className="text-sm mt-2">
              {strategyId ? 'Ready to compose' : 'Please select a strategy first'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default EmailComposer;
