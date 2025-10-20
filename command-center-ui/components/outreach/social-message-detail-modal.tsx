'use client';

/**
 * Social Message Detail Modal
 * Shows full social DM content and lead details
 */

import { useState } from 'react';
import {
  MessageSquare,
  Copy,
  Send,
  ExternalLink,
  User,
  Instagram,
  Facebook,
  Linkedin
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeTime } from '@/lib/utils/format';
import type { SocialMessage } from '@/lib/types';

interface SocialMessageDetailModalProps {
  message: SocialMessage | null;
  open: boolean;
  onClose: () => void;
  onSendMessage?: (messageId: string) => void;
}

const PLATFORM_CONFIG = {
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400 border-pink-600'
  },
  facebook: {
    label: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-blue-600'
  },
  linkedin: {
    label: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400 border-sky-600'
  },
  twitter: {
    label: 'Twitter',
    icon: MessageSquare,
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400 border-cyan-600'
  }
};

export function SocialMessageDetailModal({
  message,
  open,
  onClose,
  onSendMessage
}: SocialMessageDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!message) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const platformConfig = PLATFORM_CONFIG[message.platform as keyof typeof PLATFORM_CONFIG] || PLATFORM_CONFIG.instagram;
  const PlatformIcon = platformConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* Message Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl flex items-center gap-3">
                <MessageSquare className="w-6 h-6" />
                {message.company_name || 'Unknown Company'}
              </DialogTitle>
              <DialogDescription className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={platformConfig.color}>
                    <PlatformIcon className="w-3 h-3 mr-1" />
                    {platformConfig.label}
                  </Badge>
                  <Badge className={message.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {message.status === 'sent' ? 'Sent' : 'Draft'}
                  </Badge>
                  {message.strategy && (
                    <Badge variant="outline">
                      {message.strategy.replace(/-/g, ' ')}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Created {formatDateTime(message.created_at)}
                </div>
              </DialogDescription>
            </div>

            {/* Action Buttons */}
            {message.status !== 'sent' && (
              <div className="flex flex-col gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    onSendMessage?.(message.id);
                    onClose();
                  }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Now
                </Button>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="flex flex-wrap gap-3 pt-4">
            {message.contact_name && (
              <Badge variant="outline">
                <User className="w-3 h-3 mr-1" />
                {message.contact_name}
              </Badge>
            )}
            {message.url && (
              <Badge variant="outline">
                <a
                  href={message.url.startsWith('http') ? message.url : `https://${message.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Website
                </a>
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Message Content Tabs */}
        <Tabs defaultValue="message" className="mt-6">
          <TabsList>
            <TabsTrigger value="message">Message Content</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Main Message Tab */}
          <TabsContent value="message" className="space-y-4">
            {/* Message Body */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Direct Message</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(message.message_body, 'message')}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {copiedField === 'message' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm border rounded-lg p-4 bg-muted/50">
                  {message.message_body}
                </div>
              </CardContent>
            </Card>

            {/* Opening Line (if available) */}
            {message.opening_line && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Opening Line</CardTitle>
                  <CardDescription>Icebreaker to start the conversation</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium italic">{message.opening_line}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Message Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Platform:</dt>
                    <dd className="font-medium capitalize">{message.platform}</dd>
                  </div>
                  {message.strategy && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Strategy:</dt>
                      <dd className="font-medium">{message.strategy.replace(/-/g, ' ')}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Status:</dt>
                    <dd className="font-medium capitalize">{message.status}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Created:</dt>
                    <dd className="font-medium">{formatDateTime(message.created_at)}</dd>
                  </div>
                  {message.sent_at && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Sent:</dt>
                      <dd className="font-medium">{formatDateTime(message.sent_at)}</dd>
                    </div>
                  )}
                  {message.generation_cost && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Generation Cost:</dt>
                      <dd className="font-medium">${message.generation_cost.toFixed(5)}</dd>
                    </div>
                  )}
                  {message.ai_model && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">AI Model:</dt>
                      <dd className="font-medium">{message.ai_model}</dd>
                    </div>
                  )}
                  {message.quality_score && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Quality Score:</dt>
                      <dd className="font-medium">{message.quality_score}/100</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {message.leads && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lead Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Company:</dt>
                      <dd className="font-medium">{message.leads.company_name}</dd>
                    </div>
                    {message.leads.industry && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Industry:</dt>
                        <dd className="font-medium">{message.leads.industry}</dd>
                      </div>
                    )}
                    {message.leads.contact_name && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Contact:</dt>
                        <dd className="font-medium">{message.leads.contact_name}</dd>
                      </div>
                    )}
                    {message.leads.url && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Website:</dt>
                        <dd className="font-medium">
                          <a
                            href={message.leads.url.startsWith('http') ? message.leads.url : `https://${message.leads.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {message.leads.url}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default SocialMessageDetailModal;
