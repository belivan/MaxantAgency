'use client';

/**
 * Lead Detail Modal
 * Detailed view of lead analysis with tabbed sections
 * Consolidated to 4 tabs: Overview, Issues, Intelligence, Opportunities
 */

import { useState } from 'react';
import {
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Building2,
  AlertCircle,
  TrendingUp,
  Search,
  Share2,
  Lightbulb
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GradeBadge } from './grade-badge';
import { PriorityBadge } from './priority-badge';
import { LeadDetailsCard } from './lead-details-card';
import { formatDate } from '@/lib/utils/format';
import type { Lead } from '@/lib/types';

interface LeadDetailModalProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onComposeEmail?: (leadId: string) => void;
}

export function LeadDetailModal({ lead, open, onClose, onComposeEmail }: LeadDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!lead) return null;

  const hasDesignIssues = lead.design_issues && lead.design_issues.length > 0;
  const hasSeoIssues = lead.seo_issues && lead.seo_issues.length > 0;
  const hasIssues = hasDesignIssues || hasSeoIssues;
  const totalIssues = (lead.design_issues?.length || 0) + (lead.seo_issues?.length || 0);
  const hasQuickWins = lead.quick_wins && lead.quick_wins.length > 0;

  // Convert social_profiles object to array for rendering
  const socialProfilesArray = lead.social_profiles && typeof lead.social_profiles === 'object'
    ? Object.entries(lead.social_profiles)
        .filter(([_, url]) => url)
        .map(([platform, url]) => ({ platform, url: String(url) }))
    : [];
  const hasSocialProfiles = socialProfilesArray.length > 0;
  const hasOpportunities = hasQuickWins || hasSocialProfiles;
  const totalOpportunities = (lead.quick_wins?.length || 0) + socialProfilesArray.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-xl lg:max-w-2xl max-h-[75vh] overflow-y-auto overflow-x-hidden !top-[5rem] !translate-y-0">
        <DialogHeader>
          {/* Company Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl sm:text-2xl flex flex-wrap items-center gap-2">
                <span className="truncate">{lead.company_name}</span>
                <div className="flex items-center gap-2">
                  <GradeBadge grade={lead.grade} size="sm" showLabel />
                  {lead.lead_priority !== undefined && (
                    <PriorityBadge priority={lead.lead_priority} size="sm" showLabel />
                  )}
                </div>
              </DialogTitle>
              <DialogDescription className="mt-2 flex flex-wrap items-center gap-2 sm:gap-4">
                <a
                  href={lead.url || lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:underline truncate max-w-[200px] sm:max-w-none"
                >
                  {lead.url || lead.website}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
                <span className="text-muted-foreground">
                  Score: <span className="font-mono font-semibold">{lead.overall_score}</span>
                </span>
                <span className="text-muted-foreground hidden sm:inline">
                  Analyzed {formatDate(lead.created_at)}
                </span>
              </DialogDescription>
            </div>

            {/* Action Buttons */}
            <div className="flex sm:flex-col gap-2">
              {(lead.url || lead.website) && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="flex-1 sm:flex-none"
                >
                  <a
                    href={(lead.url || lead.website || '').startsWith('http') ? (lead.url || lead.website) : `https://${lead.url || lead.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">View Site</span>
                  </a>
                </Button>
              )}
              {onComposeEmail && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onComposeEmail(lead.id)}
                  className="flex-1 sm:flex-none"
                >
                  <Mail className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Compose</span>
                </Button>
              )}
            </div>
          </div>

          {/* Company Info Badges */}
          <div className="flex flex-wrap gap-2 pt-4">
            {lead.industry && (
              <Badge variant="outline">
                <Building2 className="w-3 h-3 mr-1" />
                {lead.industry}
              </Badge>
            )}
            {(lead.city || lead.state) && (
              <Badge variant="outline">
                <MapPin className="w-3 h-3 mr-1" />
                {lead.city && lead.state ? `${lead.city}, ${lead.state}` : lead.city || lead.state}
              </Badge>
            )}
            {lead.contact_email && (
              <Badge variant="outline" className="text-green-700 dark:text-green-400">
                <Mail className="w-3 h-3 mr-1" />
                <span className="truncate max-w-[150px]">{lead.contact_email}</span>
              </Badge>
            )}
            {lead.contact_phone && (
              <Badge variant="outline">
                <Phone className="w-3 h-3 mr-1" />
                {lead.contact_phone}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Tabbed Content - 4 Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 w-full overflow-hidden">
          <TabsList className="grid grid-cols-4 h-auto p-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm px-2">
              Overview
            </TabsTrigger>
            <TabsTrigger value="issues" className="text-xs sm:text-sm px-2">
              Issues
              {totalIssues > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">{totalIssues}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="intel" className="text-xs sm:text-sm px-2">
              Intel
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="text-xs sm:text-sm px-2">
              <span className="hidden sm:inline">Opps</span>
              <span className="sm:hidden">Opps</span>
              {totalOpportunities > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">{totalOpportunities}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 min-w-0 overflow-hidden mt-4">
            {/* Analysis Summary */}
            {lead.analysis_summary && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed break-words">
                    {lead.analysis_summary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Analysis Scores */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {lead.design_score !== undefined && (
                    <div className="flex items-center justify-between p-2 border rounded-lg">
                      <span className="text-xs font-medium">Design</span>
                      <span className="font-mono font-bold text-sm">{lead.design_score}</span>
                    </div>
                  )}
                  {lead.seo_score !== undefined && (
                    <div className="flex items-center justify-between p-2 border rounded-lg">
                      <span className="text-xs font-medium">SEO</span>
                      <span className="font-mono font-bold text-sm">{lead.seo_score}</span>
                    </div>
                  )}
                  {lead.content_score !== undefined && (
                    <div className="flex items-center justify-between p-2 border rounded-lg">
                      <span className="text-xs font-medium">Content</span>
                      <span className="font-mono font-bold text-sm">{lead.content_score}</span>
                    </div>
                  )}
                  {lead.social_score !== undefined && (
                    <div className="flex items-center justify-between p-2 border rounded-lg">
                      <span className="text-xs font-medium">Social</span>
                      <span className="font-mono font-bold text-sm">{lead.social_score}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Website Details */}
            {(lead.page_title || lead.meta_description || lead.tech_stack) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Website Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    {lead.page_title && (
                      <div className="min-w-0">
                        <dt className="text-muted-foreground text-xs uppercase">Title</dt>
                        <dd className="font-medium break-words">{lead.page_title}</dd>
                      </div>
                    )}
                    {lead.meta_description && (
                      <div className="min-w-0">
                        <dt className="text-muted-foreground text-xs uppercase">Description</dt>
                        <dd className="font-medium break-words">{lead.meta_description}</dd>
                      </div>
                    )}
                    {lead.tech_stack && (
                      <div className="min-w-0">
                        <dt className="text-muted-foreground text-xs uppercase">Tech</dt>
                        <dd className="font-medium break-words">{lead.tech_stack}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Issues Tab - Combined Design + SEO */}
          <TabsContent value="issues" className="overflow-hidden mt-4">
            {hasIssues ? (
              <div className="space-y-4">
                {/* Design Issues */}
                {hasDesignIssues && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                      <AlertCircle className="w-4 h-4" />
                      Design Issues ({lead.design_issues?.length})
                    </div>
                    <div className="space-y-2">
                      {lead.design_issues!.slice(0, 5).map((issue, idx) => (
                        <Card key={`design-${idx}`} className="border-orange-200 dark:border-orange-900/50">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium break-words flex-1">
                                {issue.title || `Issue ${idx + 1}`}
                              </p>
                              {issue.severity && (
                                <Badge
                                  variant={issue.severity === 'high' ? 'destructive' : 'outline'}
                                  className="text-xs flex-shrink-0"
                                >
                                  {issue.severity}
                                </Badge>
                              )}
                            </div>
                            {issue.description && (
                              <p className="text-xs text-muted-foreground mt-1 break-words">{issue.description}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      {(lead.design_issues?.length || 0) > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{(lead.design_issues?.length || 0) - 5} more design issues
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* SEO Issues */}
                {hasSeoIssues && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                      <Search className="w-4 h-4" />
                      SEO Issues ({lead.seo_issues?.length})
                    </div>
                    <div className="space-y-2">
                      {lead.seo_issues!.slice(0, 5).map((issue, idx) => (
                        <Card key={`seo-${idx}`} className="border-blue-200 dark:border-blue-900/50">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium break-words flex-1">
                                {issue.title || `Issue ${idx + 1}`}
                              </p>
                              {issue.severity && (
                                <Badge
                                  variant={issue.severity === 'high' ? 'destructive' : 'outline'}
                                  className="text-xs flex-shrink-0"
                                >
                                  {issue.severity}
                                </Badge>
                              )}
                            </div>
                            {issue.description && (
                              <p className="text-xs text-muted-foreground mt-1 break-words">{issue.description}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      {(lead.seo_issues?.length || 0) > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{(lead.seo_issues?.length || 0) - 5} more SEO issues
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No issues found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Intelligence Tab - AI Scoring */}
          <TabsContent value="intel" className="overflow-hidden mt-4">
            <LeadDetailsCard lead={lead} />
          </TabsContent>

          {/* Opportunities Tab - Quick Wins + Social */}
          <TabsContent value="opportunities" className="overflow-hidden mt-4">
            {hasOpportunities ? (
              <div className="space-y-4">
                {/* Quick Wins */}
                {hasQuickWins && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                      <Lightbulb className="w-4 h-4" />
                      Quick Wins ({lead.quick_wins?.length})
                    </div>
                    <div className="space-y-2">
                      {lead.quick_wins!.map((win, idx) => {
                        const winData = typeof win === 'string' ? { title: win } : (win as { title: string; description?: string });
                        return (
                          <Card key={`win-${idx}`} className="border-green-200 dark:border-green-900/50">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <p className="text-sm font-medium break-words">{winData.title}</p>
                              </div>
                              {winData.description && (
                                <p className="text-xs text-muted-foreground mt-1 ml-6 break-words">
                                  {winData.description}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Social Profiles */}
                {hasSocialProfiles && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                      <Share2 className="w-4 h-4" />
                      Social Profiles ({socialProfilesArray.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {socialProfilesArray.map((profile, idx) => (
                        <a
                          key={idx}
                          href={profile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Share2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          <span className="text-sm font-medium capitalize">{profile.platform}</span>
                          <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No opportunities found
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default LeadDetailModal;
