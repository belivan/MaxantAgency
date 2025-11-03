'use client';

/**
 * Lead Detail Modal
 * Detailed view of lead analysis with tabbed sections
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
  X
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const hasQuickWins = lead.quick_wins && lead.quick_wins.length > 0;

  // Convert social_profiles object to array for rendering
  const socialProfilesArray = lead.social_profiles && typeof lead.social_profiles === 'object'
    ? Object.entries(lead.social_profiles)
        .filter(([_, url]) => url) // Only include platforms with URLs
        .map(([platform, url]) => ({ platform, url: String(url) }))
    : [];
  const hasSocialProfiles = socialProfilesArray.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* Company Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl flex items-center gap-3">
                {lead.company_name}
                <GradeBadge grade={lead.grade} size="md" showLabel />
                {lead.lead_priority !== undefined && (
                  <PriorityBadge priority={lead.lead_priority} size="md" showLabel />
                )}
              </DialogTitle>
              <DialogDescription className="mt-2 flex items-center gap-4">
                <a
                  href={lead.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:underline"
                >
                  {lead.url}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-muted-foreground">
                  Score: <span className="font-mono font-semibold">{lead.overall_score}</span>
                </span>
                <span className="text-muted-foreground">
                  Analyzed {formatDate(lead.created_at)}
                </span>
              </DialogDescription>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 mr-8">
              {lead.url && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="whitespace-nowrap"
                >
                  <a
                    href={lead.url.startsWith('http') ? lead.url : `https://${lead.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Website
                  </a>
                </Button>
              )}
              {onComposeEmail && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onComposeEmail(lead.id)}
                  className="whitespace-nowrap"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Compose Email
                </Button>
              )}
            </div>
          </div>

          {/* Company Info */}
          <div className="flex flex-wrap gap-3 pt-4">
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
                {lead.contact_email}
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

        {/* Analysis Summary */}
        {lead.analysis_summary && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {lead.analysis_summary}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scoring">AI Scoring</TabsTrigger>
            <TabsTrigger value="design">
              Design {hasDesignIssues && `(${lead.design_issues?.length})`}
            </TabsTrigger>
            <TabsTrigger value="seo">
              SEO {hasSeoIssues && `(${lead.seo_issues?.length})`}
            </TabsTrigger>
            <TabsTrigger value="wins">
              Quick Wins {hasQuickWins && `(${lead.quick_wins?.length})`}
            </TabsTrigger>
            <TabsTrigger value="social">
              Social {hasSocialProfiles && `(${socialProfilesArray.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Analysis Scores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {lead.design_score !== undefined && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm font-medium">Design</span>
                      <span className="font-mono font-bold">{lead.design_score}</span>
                    </div>
                  )}
                  {lead.seo_score !== undefined && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm font-medium">SEO</span>
                      <span className="font-mono font-bold">{lead.seo_score}</span>
                    </div>
                  )}
                  {lead.content_score !== undefined && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm font-medium">Content</span>
                      <span className="font-mono font-bold">{lead.content_score}</span>
                    </div>
                  )}
                  {lead.social_score !== undefined && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm font-medium">Social</span>
                      <span className="font-mono font-bold">{lead.social_score}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {lead.analysis_summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{lead.analysis_summary}</p>
                </CardContent>
              </Card>
            )}

            {(lead.page_title || lead.meta_description || lead.tech_stack) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Website Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    {lead.page_title && (
                      <div className="text-sm">
                        <dt className="text-muted-foreground">Page Title:</dt>
                        <dd className="font-medium mt-1">{lead.page_title}</dd>
                      </div>
                    )}
                    {lead.meta_description && (
                      <div className="text-sm">
                        <dt className="text-muted-foreground">Meta Description:</dt>
                        <dd className="font-medium mt-1">{lead.meta_description}</dd>
                      </div>
                    )}
                    {lead.tech_stack && (
                      <div className="text-sm">
                        <dt className="text-muted-foreground">Tech Stack:</dt>
                        <dd className="font-medium mt-1">{lead.tech_stack}</dd>
                      </div>
                    )}
                    {lead.page_load_time && (
                      <div className="text-sm">
                        <dt className="text-muted-foreground">Page Load Time:</dt>
                        <dd className="font-medium mt-1">{lead.page_load_time}ms</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AI Scoring Tab */}
          <TabsContent value="scoring">
            <LeadDetailsCard lead={lead} />
          </TabsContent>

          {/* Design Issues Tab */}
          <TabsContent value="design">
            {hasDesignIssues ? (
              <div className="space-y-3">
                {lead.design_issues!.map((issue, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-500" />
                          {issue.title || `Design Issue ${idx + 1}`}
                        </CardTitle>
                        <div className="flex gap-2">
                          {issue.category && (
                            <Badge variant="outline" className="text-xs">
                              {issue.category}
                            </Badge>
                          )}
                          {issue.severity && (
                            <Badge
                              variant={
                                issue.severity === 'high' ? 'destructive' :
                                issue.severity === 'medium' ? 'default' : 'outline'
                              }
                              className="text-xs"
                            >
                              {issue.severity}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {issue.description && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">{issue.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No design issues found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SEO Issues Tab */}
          <TabsContent value="seo">
            {hasSeoIssues ? (
              <div className="space-y-3">
                {lead.seo_issues!.map((issue, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Search className="w-4 h-4 text-blue-500" />
                          {issue.title || `SEO Issue ${idx + 1}`}
                        </CardTitle>
                        <div className="flex gap-2">
                          {issue.category && (
                            <Badge variant="outline" className="text-xs">
                              {issue.category}
                            </Badge>
                          )}
                          {issue.severity && (
                            <Badge
                              variant={
                                issue.severity === 'high' ? 'destructive' :
                                issue.severity === 'medium' ? 'default' : 'outline'
                              }
                              className="text-xs"
                            >
                              {issue.severity}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {issue.description && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">{issue.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No SEO issues found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Quick Wins Tab */}
          <TabsContent value="wins">
            {hasQuickWins ? (
              <div className="space-y-3">
                {lead.quick_wins!.map((win, idx) => {
                  const winData: { title: string; source?: string; description?: string } =
                    typeof win === 'string' ? { title: win } : win;
                  return (
                    <Card key={idx}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            {winData.title}
                          </CardTitle>
                          {winData.source && (
                            <Badge variant="outline" className="text-xs">
                              {winData.source}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      {winData.description && (
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground">{winData.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No quick wins identified
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Social Profiles Tab */}
          <TabsContent value="social">
            {hasSocialProfiles ? (
              <div className="space-y-3">
                {socialProfilesArray.map((profile, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base flex items-center gap-2 capitalize">
                          <Share2 className="w-4 h-4 text-purple-500" />
                          {profile.platform}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {profile.url && (
                        <a
                          href={profile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {profile.url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {profile.handle && (
                        <p className="text-sm text-muted-foreground">
                          Handle: @{profile.handle}
                        </p>
                      )}
                      {profile.verified !== undefined && profile.verified && (
                        <Badge variant="outline" className="text-blue-600 dark:text-blue-400">
                          Verified
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No social profiles found
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
