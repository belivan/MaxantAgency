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
  const hasSocialProfiles = lead.social_profiles && lead.social_profiles.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* Company Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl flex items-center gap-3">
                {lead.company_name}
                <GradeBadge grade={lead.grade} size="md" showLabel />
              </DialogTitle>
              <DialogDescription className="mt-2 flex items-center gap-4">
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:underline"
                >
                  {lead.website}
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
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="design">
              Design {hasDesignIssues && `(${lead.design_issues.length})`}
            </TabsTrigger>
            <TabsTrigger value="seo">
              SEO {hasSeoIssues && `(${lead.seo_issues.length})`}
            </TabsTrigger>
            <TabsTrigger value="wins">
              Quick Wins {hasQuickWins && `(${lead.quick_wins.length})`}
            </TabsTrigger>
            <TabsTrigger value="social">
              Social {hasSocialProfiles && `(${lead.social_profiles.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Analysis Scores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.scores && (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(lead.scores).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm font-medium capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono font-bold">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {lead.metadata && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Metadata</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    {Object.entries(lead.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <dt className="text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}:
                        </dt>
                        <dd className="font-medium">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Design Issues Tab */}
          <TabsContent value="design">
            {hasDesignIssues ? (
              <div className="space-y-3">
                {lead.design_issues.map((issue, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-500" />
                          {issue.title || `Design Issue ${idx + 1}`}
                        </CardTitle>
                        {issue.severity && (
                          <Badge
                            variant={
                              issue.severity === 'high' ? 'destructive' :
                              issue.severity === 'medium' ? 'default' : 'outline'
                            }
                          >
                            {issue.severity}
                          </Badge>
                        )}
                      </div>
                      {issue.category && (
                        <CardDescription>{issue.category}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{issue.description}</p>
                      {issue.recommendation && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm">
                            <span className="font-medium">Recommendation: </span>
                            {issue.recommendation}
                          </p>
                        </div>
                      )}
                    </CardContent>
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
                {lead.seo_issues.map((issue, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Search className="w-4 h-4 text-blue-500" />
                          {issue.title || `SEO Issue ${idx + 1}`}
                        </CardTitle>
                        {issue.severity && (
                          <Badge
                            variant={
                              issue.severity === 'high' ? 'destructive' :
                              issue.severity === 'medium' ? 'default' : 'outline'
                            }
                          >
                            {issue.severity}
                          </Badge>
                        )}
                      </div>
                      {issue.category && (
                        <CardDescription>{issue.category}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{issue.description}</p>
                      {issue.recommendation && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm">
                            <span className="font-medium">Recommendation: </span>
                            {issue.recommendation}
                          </p>
                        </div>
                      )}
                    </CardContent>
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Quick Win Opportunities
                  </CardTitle>
                  <CardDescription>
                    Easy improvements that can make an immediate impact
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {lead.quick_wins.map((win, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-3 border rounded-lg">
                        <span className="text-green-600 dark:text-green-400 font-bold">•</span>
                        <span className="text-sm">{win}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
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
                {lead.social_profiles.map((profile, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-purple-500" />
                          {profile.platform}
                        </CardTitle>
                        {profile.followers_count !== undefined && (
                          <Badge variant="outline">
                            {profile.followers_count.toLocaleString()} followers
                          </Badge>
                        )}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <Button
            onClick={() => {
              onComposeEmail?.(lead.id);
              onClose();
            }}
            disabled={!lead.contact_email}
          >
            <Mail className="w-4 h-4 mr-2" />
            Compose Email
          </Button>
          <Button variant="outline" asChild>
            <a href={lead.website} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Website
            </a>
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LeadDetailModal;
