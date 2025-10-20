'use client';

/**
 * Email Preview Card
 * Display email variant with subject, body, and actions
 */

import { useState } from 'react';
import { Copy, Check, Send, Eye, EyeOff } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { EmailVariant } from '@/lib/types';

interface EmailPreviewCardProps {
  variant: EmailVariant;
  variantIndex: number;
  leadName: string;
  onCopy?: (variant: EmailVariant) => void;
  onSend?: (variant: EmailVariant) => void;
  showActions?: boolean;
}

export function EmailPreviewCard({
  variant,
  variantIndex,
  leadName,
  onCopy,
  onSend,
  showActions = true
}: EmailPreviewCardProps) {
  const [copied, setCopied] = useState(false);
  const [showFullBody, setShowFullBody] = useState(false);

  const handleCopy = () => {
    const emailText = `Subject: ${variant.subject}\n\n${variant.body}`;
    navigator.clipboard.writeText(emailText);
    setCopied(true);
    onCopy?.(variant);
    setTimeout(() => setCopied(false), 2000);
  };

  // Truncate body for preview
  const bodyLines = variant.body.split('\n');
  const truncatedBody = showFullBody
    ? variant.body
    : bodyLines.slice(0, 5).join('\n') + (bodyLines.length > 5 ? '\n...' : '');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              Variant {variantIndex + 1}
              {variant.variant_name && (
                <Badge variant="outline">{variant.variant_name}</Badge>
              )}
            </CardTitle>
            <CardDescription>For: {leadName}</CardDescription>
          </div>
          {showActions && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              {onSend && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSend(variant)}
                  title="Send email"
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Subject Line */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase">
            Subject
          </label>
          <div className="p-3 border rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{variant.subject}</p>
          </div>
        </div>

        {/* Email Body */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground uppercase">
              Body
            </label>
            {bodyLines.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullBody(!showFullBody)}
                className="h-auto py-1"
              >
                {showFullBody ? (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    Show Full
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="p-4 border rounded-lg bg-background">
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
              {truncatedBody}
            </pre>
          </div>
        </div>

        {/* Metadata */}
        {(variant.tone || variant.length || variant.cta) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {variant.tone && (
              <Badge variant="outline" className="text-xs">
                Tone: {variant.tone}
              </Badge>
            )}
            {variant.length && (
              <Badge variant="outline" className="text-xs">
                Length: {variant.length}
              </Badge>
            )}
            {variant.cta && (
              <Badge variant="outline" className="text-xs">
                CTA: {variant.cta}
              </Badge>
            )}
          </div>
        )}

        {/* Character Count */}
        <div className="text-xs text-muted-foreground">
          {variant.subject.length} chars in subject · {variant.body.length} chars in body
        </div>
      </CardContent>
    </Card>
  );
}

export default EmailPreviewCard;
