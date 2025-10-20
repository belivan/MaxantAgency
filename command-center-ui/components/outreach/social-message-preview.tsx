'use client';

/**
 * Social Message Preview
 * Display social DM with copy-to-clipboard functionality
 */

import { useState } from 'react';
import { Copy, Check, Instagram, Facebook, Linkedin } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SocialMessage } from '@/lib/types';
import type { SocialPlatform } from './social-platform-selector';

interface SocialMessagePreviewProps {
  message: SocialMessage;
  platform: SocialPlatform;
  leadName: string;
  onCopy?: () => void;
}

const PLATFORM_CONFIG = {
  instagram: {
    icon: Instagram,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-950/20',
    name: 'Instagram'
  },
  facebook: {
    icon: Facebook,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-950/20',
    name: 'Facebook'
  },
  linkedin: {
    icon: Linkedin,
    color: 'text-blue-700 dark:text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-950/20',
    name: 'LinkedIn'
  }
};

export function SocialMessagePreview({
  message,
  platform,
  leadName,
  onCopy
}: SocialMessagePreviewProps) {
  const [copied, setCopied] = useState(false);

  const config = PLATFORM_CONFIG[platform];
  const Icon = config.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.message);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <div className={`p-1.5 rounded ${config.bgColor}`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              {config.name} Message
            </CardTitle>
            <CardDescription>For: {leadName}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Message Body */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase">
            Message
          </label>
          <div className="p-4 border rounded-lg bg-background">
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
              {message.message}
            </pre>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex gap-2">
            {message.tone && (
              <Badge variant="outline" className="text-xs">
                {message.tone}
              </Badge>
            )}
            {message.variant_name && (
              <Badge variant="outline" className="text-xs">
                {message.variant_name}
              </Badge>
            )}
          </div>
          <span>{message.message.length} characters</span>
        </div>

        {/* Copy Instructions */}
        <div className="p-3 border rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Next steps:</span>
            {' '}Copy this message and send it through {config.name} Messenger to engage with this lead.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default SocialMessagePreview;
