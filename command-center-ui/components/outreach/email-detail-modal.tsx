'use client';

/**
 * Email Detail Modal
 * Shows full email content, variants, and lead details
 */

import { useState } from 'react';
import {
  Mail,
  Copy,
  ExternalLink,
  Sparkles
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
import { formatDateTime } from '@/lib/utils/format';
import type { Email } from '@/lib/types';

interface EmailDetailModalProps {
  email: Email | null;
  open: boolean;
  onClose: () => void;
  onSendEmail?: (emailId: string) => void;
  onScheduleEmail?: (emailId: string) => void;
}

export function EmailDetailModal({
  email,
  open,
  onClose,
  onSendEmail,
  onScheduleEmail
}: EmailDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!email) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const hasVariants = email.has_variants && (email.subject_variants || email.body_variants);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* Email Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl flex items-center gap-3">
                <Mail className="w-6 h-6" />
                {email.company_name || 'Unknown Company'}
              </DialogTitle>
              <DialogDescription className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {email.email_strategy?.replace(/-/g, ' ')}
                  </Badge>
                  <Badge className={email.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {email.status === 'sent' ? 'Sent' : 'Draft'}
                  </Badge>
                  {hasVariants && (
                    <Badge variant="outline">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Has Variants
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Created {formatDateTime(email.created_at)}
                </div>
              </DialogDescription>
            </div>

          </div>

          {/* Contact Info */}
          <div className="flex flex-wrap gap-3 pt-4">
            {email.contact_email && (
              <Badge variant="outline">
                <Mail className="w-3 h-3 mr-1" />
                {email.contact_email}
              </Badge>
            )}
            {email.url && (
              <Badge variant="outline">
                <a
                  href={email.url.startsWith('http') ? email.url : `https://${email.url}`}
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

        {/* Email Content Tabs */}
        <Tabs defaultValue="email" className="mt-6">
          <TabsList>
            <TabsTrigger value="email">Email Content</TabsTrigger>
            {hasVariants && <TabsTrigger value="variants">Variants</TabsTrigger>}
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Main Email Tab */}
          <TabsContent value="email" className="space-y-4">
            {/* Subject Line */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Subject Line</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(email.email_subject, 'subject')}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {copiedField === 'subject' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{email.email_subject}</p>
              </CardContent>
            </Card>

            {/* Email Body */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Email Body</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(email.email_body, 'body')}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {copiedField === 'body' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm border rounded-lg p-4 bg-muted/50">
                  {email.email_body}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Variants Tab */}
          {hasVariants && (
            <TabsContent value="variants" className="space-y-4">
              {email.subject_variants && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Subject Line Variants</CardTitle>
                    <CardDescription>Different subject line options to test</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {email.subject_variants.map((variant, idx) => (
                      <div key={idx} className="p-3 border rounded-lg bg-background">
                        <p className="text-sm font-medium">{variant}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {email.body_variants && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Body Variants</CardTitle>
                    <CardDescription>Different body variations to test</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {email.body_variants.map((variant, idx) => (
                      <div key={idx} className="p-4 border rounded-lg bg-muted/50">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          Variant {idx + 1}
                        </div>
                        <div className="whitespace-pre-wrap text-sm">{variant}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Strategy:</dt>
                    <dd className="font-medium">{email.email_strategy?.replace(/-/g, ' ')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Status:</dt>
                    <dd className="font-medium capitalize">{email.status}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Created:</dt>
                    <dd className="font-medium">{formatDateTime(email.created_at)}</dd>
                  </div>
                  {email.sent_at && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Sent:</dt>
                      <dd className="font-medium">{formatDateTime(email.sent_at)}</dd>
                    </div>
                  )}
                  {email.generation_cost && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Generation Cost:</dt>
                      <dd className="font-medium">${email.generation_cost.toFixed(5)}</dd>
                    </div>
                  )}
                  {email.ai_model && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">AI Model:</dt>
                      <dd className="font-medium">{email.ai_model}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>

            {email.leads && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lead Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Company:</dt>
                      <dd className="font-medium">{email.leads.company_name}</dd>
                    </div>
                    {email.leads.industry && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Industry:</dt>
                        <dd className="font-medium">{email.leads.industry}</dd>
                      </div>
                    )}
                    {email.leads.contact_email && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Email:</dt>
                        <dd className="font-medium">{email.leads.contact_email}</dd>
                      </div>
                    )}
                    {email.leads.url && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Website:</dt>
                        <dd className="font-medium">
                          <a
                            href={email.leads.url.startsWith('http') ? email.leads.url : `https://${email.leads.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {email.leads.url}
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

export default EmailDetailModal;
