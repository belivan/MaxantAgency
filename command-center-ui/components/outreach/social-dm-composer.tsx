'use client';

/**
 * Social DM Composer
 * Compose social media direct messages for leads
 */

import { useState } from 'react';
import { Loader2, MessageSquare, Sparkles } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SocialMessagePreview } from './social-message-preview';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { composeSocialMessage } from '@/lib/api/outreach';
import { useTaskProgress } from '@/lib/contexts/task-progress-context';
import type { Lead, SocialMessage } from '@/lib/types';
import type { SocialPlatform } from './social-platform-selector';

interface SocialDMComposerProps {
  lead: Lead;
  platform: SocialPlatform;
  onMessageGenerated?: (message: SocialMessage) => void;
}

export function SocialDMComposer({
  lead,
  platform,
  onMessageGenerated
}: SocialDMComposerProps) {
  const [message, setMessage] = useState<SocialMessage | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { startTask, updateTask, completeTask, errorTask } = useTaskProgress();

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    const taskId = startTask('outreach', `Composing ${platform} DM for ${lead.company_name}`, 1);

    try {
      updateTask(taskId, 0, `Generating ${platform} message...`);
      const generatedMessage = await composeSocialMessage(lead.url, platform);
      setMessage(generatedMessage);
      updateTask(taskId, 1, 'Social message generated!');
      onMessageGenerated?.(generatedMessage);
      completeTask(taskId);
    } catch (err: any) {
      console.error('Failed to generate social message:', err);
      setError(err.message || 'Failed to generate message');
      errorTask(taskId, err.message || 'Failed to generate message');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Social DM Composer
            </CardTitle>
            <CardDescription>
              Generate personalized {platform} message for {lead.company_name}
            </CardDescription>
          </div>
          {!message && (
            <Button
              onClick={handleGenerate}
              disabled={generating || !platform}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Message
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
              <p className="font-medium">Generating personalized message...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crafting {platform} DM for {lead.company_name}
              </p>
            </div>
          </div>
        ) : message ? (
          <div className="space-y-4">
            {/* Lead Info */}
            <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{lead.company_name}</h4>
                  <p className="text-sm text-muted-foreground">{lead.website}</p>
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
              {lead.social_profiles && lead.social_profiles.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {lead.social_profiles.length} social profile{lead.social_profiles.length !== 1 ? 's' : ''} found
                </div>
              )}
            </div>

            {/* Message Preview */}
            <SocialMessagePreview
              message={message}
              platform={platform}
              leadName={lead.company_name}
              onCopy={() => {
                console.log('Copied message for:', lead.company_name);
              }}
            />
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Click "Generate Message" to create a personalized DM</p>
            <p className="text-sm mt-2">
              {platform ? 'Ready to compose' : 'Please select a platform first'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SocialDMComposer;
