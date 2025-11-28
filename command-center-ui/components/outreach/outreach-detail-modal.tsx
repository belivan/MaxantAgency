'use client';

/**
 * Outreach Detail Modal
 * Shows all email and social message variations for a company
 */

import { useState } from 'react';
import {
  Mail,
  MessageCircle,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { OutreachCompany } from './outreach-table';

interface OutreachDetailModalProps {
  company: OutreachCompany | null;
  open: boolean;
  onClose: () => void;
}

// Platform icons mapping
const PLATFORM_CONFIG: Record<string, { icon: string; color: string }> = {
  instagram: { icon: '📸', color: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-400' },
  facebook: { icon: '📘', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400' },
  linkedin: { icon: '💼', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-400' },
  twitter: { icon: '🐦', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-400' }
};

export function OutreachDetailModal({
  company,
  open,
  onClose
}: OutreachDetailModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('emails');

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyAll = async (subject: string, body: string, id: string) => {
    const fullEmail = `Subject: ${subject}\n\n${body}`;
    await handleCopy(fullEmail, `all-${id}`);
  };

  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[80vh] flex flex-col p-0 !top-[5rem] !translate-y-0">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-xl truncate">
                {company.company_name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                {company.website && (
                  <a
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
                  >
                    {company.website}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                )}
                {company.industry && (
                  <Badge variant="outline" className="text-xs">
                    {company.industry}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="px-4 sm:px-6 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-blue-500" />
              <span className="font-medium">{company.emails.length}</span>
              <span className="text-muted-foreground">email{company.emails.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-purple-500" />
              <span className="font-medium">{company.socialMessages.length}</span>
              <span className="text-muted-foreground">social</span>
            </div>
            {company.contact_email && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs ml-auto"
                onClick={() => handleCopy(company.contact_email!, 'contact-email')}
              >
                {copiedId === 'contact-email' ? (
                  <Check className="w-3 h-3 text-green-500 mr-1" />
                ) : (
                  <Copy className="w-3 h-3 mr-1" />
                )}
                {company.contact_email}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="px-4 sm:px-6 pt-2 flex-shrink-0">
            <TabsList className="h-8">
              <TabsTrigger value="emails" className="text-xs h-7 px-3">
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                Emails ({company.emails.length})
              </TabsTrigger>
              <TabsTrigger value="social" className="text-xs h-7 px-3">
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                Social ({company.socialMessages.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4">
            {/* Emails Tab */}
            <TabsContent value="emails" className="mt-3 space-y-3">
              {company.emails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No email variations generated</p>
                </div>
              ) : (
                company.emails.map((email, index) => (
                  <Card key={email.id} className="overflow-hidden">
                    <CardHeader className="py-2 px-3 bg-muted/30">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-[10px] flex-shrink-0">
                            {email.email_strategy?.replace(/-/g, ' ') || 'Email'}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => handleCopy(email.email_subject, `subj-${email.id}`)}
                          >
                            {copiedId === `subj-${email.id}` ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span className="ml-1">Subj</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => handleCopy(email.email_body, `body-${email.id}`)}
                          >
                            {copiedId === `body-${email.id}` ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span className="ml-1">Body</span>
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleCopyAll(email.email_subject, email.email_body, email.id)}
                          >
                            {copiedId === `all-${email.id}` ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span className="ml-1">All</span>
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="py-3 px-3 space-y-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Subject</p>
                        <p className="text-sm font-medium">{email.email_subject}</p>
                      </div>
                      <div className="border-t my-2" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Body</p>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{email.email_body}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Social Messages Tab */}
            <TabsContent value="social" className="mt-3 space-y-3">
              {company.socialMessages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No social messages generated</p>
                </div>
              ) : (
                company.socialMessages.map((msg, index) => {
                  const platformConfig = PLATFORM_CONFIG[msg.platform] || { icon: '💬', color: 'bg-gray-100 text-gray-800' };

                  return (
                    <Card key={msg.id} className="overflow-hidden">
                      <CardHeader className="py-2 px-3 bg-muted/30">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge className={`text-[10px] ${platformConfig.color}`}>
                              <span className="mr-1">{platformConfig.icon}</span>
                              {msg.platform}
                            </Badge>
                            {msg.strategy && (
                              <Badge variant="outline" className="text-[10px]">
                                {msg.strategy.replace(/-/g, ' ')}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              #{index + 1}
                            </span>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-6 px-2 text-[10px] bg-purple-600 hover:bg-purple-700"
                            onClick={() => handleCopy(msg.message_body, `social-${msg.id}`)}
                          >
                            {copiedId === `social-${msg.id}` ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span className="ml-1">Copy</span>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="py-3 px-3">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message_body}</p>
                        {msg.character_count && (
                          <p className="text-[10px] text-muted-foreground mt-2">
                            {msg.character_count} characters
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default OutreachDetailModal;
