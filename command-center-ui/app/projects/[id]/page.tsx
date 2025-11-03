'use client';

/**
 * Project Detail Page
 * Project workspace with tabs for Prospects, Leads, Outreach, and Campaigns
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, DollarSign, Users, Mail, TrendingUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LoadingOverlay } from '@/components/shared';
import { getProject } from '@/lib/api/projects';
import { getProspects } from '@/lib/api/prospecting';
import { getLeads } from '@/lib/api/analysis';
import { ProspectTable } from '@/components/prospecting/prospect-table';
import { LeadsTable } from '@/components/leads/leads-table';
import { LeadDetailModal } from '@/components/leads/lead-detail-modal';
import type { Project } from '@/lib/types';
import type { Prospect, Lead } from '@/lib/types';
import { EmailsTable } from '@/components/outreach/emails-table';
import { SocialMessagesTable } from '@/components/outreach/social-messages-table';
import { EmailDetailModal } from '@/components/outreach/email-detail-modal';
import { SocialMessageDetailModal } from '@/components/outreach/social-message-detail-modal';
import { ScheduledCampaignsTable } from '@/components/campaigns/scheduled-campaigns-table';
import { CampaignRunsHistory } from '@/components/campaigns/campaign-runs-history';
import { CampaignScheduleDialog } from '@/components/campaigns/campaign-schedule-dialog';
import { formatDateTime } from '@/lib/utils/format';

interface ProjectStats {
  prospects_count: number;
  leads_count: number;
  emails_count: number;
  campaigns_count: number;
  grade_distribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats>({
    prospects_count: 0,
    leads_count: 0,
    emails_count: 0,
    campaigns_count: 0,
    grade_distribution: { A: 0, B: 0, C: 0, D: 0, F: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Load project data and stats
  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        const [projectData, statsResponse] = await Promise.all([
          getProject(projectId),
          fetch(`/api/projects/${projectId}/stats`).then(r => r.json())
        ]);

        setProject(projectData);

        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data);
        } else {
          console.error('Stats API returned error:', statsResponse.error);
          // Keep default stats values (zeros)
        }
      } catch (err: any) {
        console.error('Failed to load project:', err);
        setError(err.message || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
        <Button onClick={() => router.push('/projects')} className="mt-4">
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <>
      <LoadingOverlay isLoading={loading} message="Loading project..." />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/projects')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {project?.name || 'Loading...'}
                </h1>
                {project?.status && (
                  <Badge variant={getStatusVariant(project.status)}>
                    {project.status}
                  </Badge>
                )}
              </div>
              {project?.description && (
                <p className="text-muted-foreground">{project.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert('Edit project modal coming soon!')}
            >
              Edit Project
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveTab('campaigns')}
            >
              Run Campaign
            </Button>
          </div>
        </div>

        {/* Project Stats Summary */}
        {project && (
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              icon={<DollarSign className="w-4 h-4" />}
              label="Budget"
              value={formatCurrency(Number(project.budget) || 0)}
              subtitle={`${formatCurrency(Number(project.total_spent) || 0)} spent`}
            />
            <StatCard
              icon={<Users className="w-4 h-4" />}
              label="Prospects"
              value={stats.prospects_count || 0}
              subtitle="Generated"
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Leads"
              value={stats.leads_count || 0}
              subtitle={`${stats.grade_distribution?.A || 0} Grade A`}
            />
            <StatCard
              icon={<Mail className="w-4 h-4" />}
              label="Outreach"
              value={stats.emails_count || 0}
              subtitle="Emails composed"
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="prospects">Prospects</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="outreach">Outreach</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <OverviewTab project={project} stats={stats} onNavigateToTab={setActiveTab} />
          </TabsContent>

          {/* Prospects Tab */}
          <TabsContent value="prospects" className="space-y-6">
            <ProspectsTab projectId={projectId} />
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-6">
            <LeadsTab projectId={projectId} />
          </TabsContent>

          {/* Outreach Tab */}
          <TabsContent value="outreach" className="space-y-6">
            <OutreachTab projectId={projectId} />
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <CampaignsTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// ============================================================================
// Tab Components
// ============================================================================

function OverviewTab({
  project,
  stats,
  onNavigateToTab
}: {
  project: Project | null;
  stats: ProjectStats;
  onNavigateToTab: (tab: string) => void;
}) {
  if (!project) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Project Overview</h2>
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <InfoRow label="Status" value={project.status} />
            <InfoRow label="Budget" value={formatCurrency(Number(project.budget) || 0)} />
            <InfoRow label="Total Spent" value={formatCurrency(Number(project.total_spent) || 0)} />
            <InfoRow label="Created" value={formatDateTime(project.created_at)} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Performance Metrics</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Prospects Generated"
            value={stats.prospects_count}
          />
          <MetricCard
            label="Leads Analyzed"
            value={stats.leads_count}
            breakdown={`${stats.grade_distribution.A}A / ${stats.grade_distribution.B}B / ${stats.grade_distribution.C}C`}
          />
          <MetricCard
            label="Outreach Sent"
            value={stats.emails_count}
          />
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <ActionCard
            title="Generate Prospects"
            description="Run prospecting for this project"
            action="Prospect"
            onClick={() => onNavigateToTab('prospects')}
          />
          <ActionCard
            title="Analyze Leads"
            description="Analyze websites for this project"
            action="Analyze"
            onClick={() => onNavigateToTab('leads')}
          />
          <ActionCard
            title="Compose Outreach"
            description="Create personalized emails"
            action="Compose"
            onClick={() => onNavigateToTab('outreach')}
          />
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-muted-foreground text-center py-8">
            No activity yet. Start by generating prospects.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProspectsTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [icpBriefOpen, setIcpBriefOpen] = useState(false);
  const [analysisPromptsOpen, setAnalysisPromptsOpen] = useState(false);

  // Load prospects and project data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [prospectsData, projectData] = await Promise.all([
          getProspects({ project_id: projectId }),
          getProject(projectId)
        ]);

        setProspects(prospectsData.prospects || []);
        setProject(projectData);
      } catch (err) {
        console.error('Failed to load prospects:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  const hasIcpBrief = project?.icp_brief && Object.keys(project.icp_brief).length > 0;
  const hasAnalysisPrompts = project?.analysis_config?.prompts && Object.keys(project.analysis_config.prompts).length > 0;
  const hasProspects = prospects.length > 0;

  const handleDeleteComplete = () => {
    // Reload prospects after deletion
    getProspects({ project_id: projectId })
      .then(data => setProspects(data.prospects || []))
      .catch(err => console.error('Failed to reload prospects:', err));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Prospects</h2>
        <Button onClick={() => router.push(`/prospecting?project_id=${projectId}`)}>
          Generate More Prospects
        </Button>
      </div>

      {/* ICP Brief Section */}
      {hasIcpBrief && (
        <Collapsible open={icpBriefOpen} onOpenChange={setIcpBriefOpen}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div>
                    <CardTitle className="text-lg">Ideal Customer Profile (ICP)</CardTitle>
                    <CardDescription>Targeting criteria for this project</CardDescription>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${icpBriefOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid gap-3 md:grid-cols-2">
                  {project?.icp_brief?.industry && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Industry</p>
                      <p className="mt-1">{project.icp_brief.industry}</p>
                    </div>
                  )}
                  {project?.icp_brief?.city && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <p className="mt-1">{project.icp_brief.city}</p>
                    </div>
                  )}
                  {project?.icp_brief?.target_description && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Description</p>
                      <p className="mt-1">{project.icp_brief.target_description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Analysis Prompts Section */}
      {hasAnalysisPrompts && (
        <Collapsible open={analysisPromptsOpen} onOpenChange={setAnalysisPromptsOpen}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div>
                    <CardTitle className="text-lg">Analysis Configuration</CardTitle>
                    <CardDescription>AI prompts used for website analysis</CardDescription>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${analysisPromptsOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {project?.analysis_config?.prompts?.design && (
                    <div className="border-b pb-3">
                      <p className="text-sm font-medium mb-1">Design Analysis</p>
                      <p className="text-xs text-muted-foreground">
                        Model: {project.analysis_config.prompts.design.model || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {project.analysis_config.prompts.design.description}
                      </p>
                    </div>
                  )}
                  {project?.analysis_config?.prompts?.seo && (
                    <div className="border-b pb-3">
                      <p className="text-sm font-medium mb-1">SEO Analysis</p>
                      <p className="text-xs text-muted-foreground">
                        Model: {project.analysis_config.prompts.seo.model || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {project.analysis_config.prompts.seo.description}
                      </p>
                    </div>
                  )}
                  {project?.analysis_config?.prompts?.content && (
                    <div className="border-b pb-3">
                      <p className="text-sm font-medium mb-1">Content Analysis</p>
                      <p className="text-xs text-muted-foreground">
                        Model: {project.analysis_config.prompts.content.model || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {project.analysis_config.prompts.content.description}
                      </p>
                    </div>
                  )}
                  {project?.analysis_config?.prompts?.social && (
                    <div className="pb-3">
                      <p className="text-sm font-medium mb-1">Social Media Analysis</p>
                      <p className="text-xs text-muted-foreground">
                        Model: {project.analysis_config.prompts.social.model || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {project.analysis_config.prompts.social.description}
                      </p>
                    </div>
                  )}
                  {project?.analysis_config?.prompts_updated_at && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Last updated: {new Date(project.analysis_config.prompts_updated_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Prospects Table or Empty State */}
      {!hasProspects && !loading ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-muted-foreground text-center py-8">
            No prospects generated for this project yet.
          </p>
          <div className="text-center mt-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/prospecting?project_id=${projectId}`)}
            >
              Start Prospecting
            </Button>
          </div>
        </div>
      ) : (
        <ProspectTable
          prospects={prospects}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onDeleteComplete={handleDeleteComplete}
          loading={loading}
        />
      )}

      {/* Action Buttons */}
      {hasProspects && selectedIds.length > 0 && (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push(`/analysis?project_id=${projectId}&prospect_ids=${selectedIds.join(',')}`)}
          >
            Analyze Selected ({selectedIds.length})
          </Button>
        </div>
      )}
    </div>
  );
}

function LeadsTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [analysisConfigOpen, setAnalysisConfigOpen] = useState(false);

  // Load leads and project data
  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsData, projectData] = await Promise.all([
        getLeads({ project_id: projectId }),
        getProject(projectId)
      ]);

      setLeads(leadsData || []);
      setProject(projectData);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Refresh function
  const refreshLeads = () => {
    loadData();
  };

  const hasAnalysisConfig = project?.analysis_config && Object.keys(project.analysis_config).length > 0;
  const hasLeads = leads.length > 0;

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setLeadModalOpen(true);
  };

  const handleComposeEmails = (leadIds: string[]) => {
    router.push(`/outreach?project_id=${projectId}&lead_ids=${leadIds.join(',')}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Leads</h2>
        <Button onClick={() => router.push(`/analysis?project_id=${projectId}`)}>
          Analyze More Prospects
        </Button>
      </div>

      {/* Analysis Config Section */}
      {hasAnalysisConfig && (
        <Collapsible open={analysisConfigOpen} onOpenChange={setAnalysisConfigOpen}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div>
                    <CardTitle className="text-lg">Analysis Configuration</CardTitle>
                    <CardDescription>Settings used for analyzing websites</CardDescription>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${analysisConfigOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid gap-3 md:grid-cols-2">
                  {project?.analysis_config?.tier && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Analysis Tier</p>
                      <p className="mt-1 capitalize">{project.analysis_config.tier}</p>
                    </div>
                  )}
                  {project?.analysis_config?.modules && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Modules Enabled</p>
                      <p className="mt-1">{project.analysis_config.modules.join(', ')}</p>
                    </div>
                  )}
                  {project?.analysis_config?.capture_screenshots !== undefined && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Screenshots</p>
                      <p className="mt-1">{project.analysis_config.capture_screenshots ? 'Enabled' : 'Disabled'}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Leads Table or Empty State */}
      {!hasLeads && !loading ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-muted-foreground text-center py-8">
            No leads analyzed for this project yet.
          </p>
          <div className="text-center mt-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/analysis?project_id=${projectId}`)}
            >
              Start Analysis
            </Button>
          </div>
        </div>
      ) : (
        <LeadsTable
          leads={leads}
          loading={loading}
          onLeadClick={handleLeadClick}
          onComposeEmails={handleComposeEmails}
          onRefresh={refreshLeads}
        />
      )}

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        open={leadModalOpen}
        onClose={() => {
          setLeadModalOpen(false);
          setSelectedLead(null);
        }}
      />
    </div>
  );
}

function OutreachTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [emails, setEmails] = useState<any[]>([]);
  const [socialMessages, setSocialMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'emails' | 'social'>('emails');
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  // Load emails and social messages
  useEffect(() => {
    const loadOutreach = async () => {
      try {
        setLoading(true);
        const [emailsData, messagesData] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_OUTREACH_API || 'http://localhost:3002'}/api/emails?project_id=${projectId}`).then(r => r.json()),
          fetch(`${process.env.NEXT_PUBLIC_OUTREACH_API || 'http://localhost:3002'}/api/social-messages?project_id=${projectId}`).then(r => r.json())
        ]);

        setEmails(emailsData.emails || []);
        setSocialMessages(messagesData.messages || []);
      } catch (err) {
        console.error('Failed to load outreach:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOutreach();
  }, [projectId]);

  const handleEmailClick = (email: any) => {
    setSelectedEmail(email);
    setEmailModalOpen(true);
  };

  const handleMessageClick = (message: any) => {
    setSelectedMessage(message);
    setMessageModalOpen(true);
  };

  const hasEmails = emails.length > 0;
  const hasMessages = socialMessages.length > 0;
  const hasOutreach = hasEmails || hasMessages;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Outreach</h2>
        <Button onClick={() => router.push(`/outreach?project_id=${projectId}`)}>
          Compose More
        </Button>
      </div>

      {!hasOutreach && !loading ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-muted-foreground text-center py-8">
            No outreach messages created for this project yet.
          </p>
          <div className="text-center mt-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/outreach?project_id=${projectId}`)}
            >
              Start Composing
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs for Emails and Social Messages */}
          <Tabs value={activeView} onValueChange={(v: any) => setActiveView(v)}>
            <TabsList>
              <TabsTrigger value="emails">
                Emails ({emails.length})
              </TabsTrigger>
              <TabsTrigger value="social">
                Social DMs ({socialMessages.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="emails" className="mt-6">
              <EmailsTable
                emails={emails}
                loading={loading}
                onEmailClick={handleEmailClick}
              />
            </TabsContent>

            <TabsContent value="social" className="mt-6">
              <SocialMessagesTable
                messages={socialMessages}
                loading={loading}
                onMessageClick={handleMessageClick}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Email Detail Modal */}
      <EmailDetailModal
        email={selectedEmail}
        open={emailModalOpen}
        onClose={() => {
          setEmailModalOpen(false);
          setSelectedEmail(null);
        }}
      />

      {/* Social Message Detail Modal */}
      <SocialMessageDetailModal
        message={selectedMessage}
        open={messageModalOpen}
        onClose={() => {
          setMessageModalOpen(false);
          setSelectedMessage(null);
        }}
      />
    </div>
  );
}

function CampaignsTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignRuns, setCampaignRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Load campaigns
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_ORCHESTRATOR_API || 'http://localhost:3020'}/api/campaigns?project_id=${projectId}`
        );
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } catch (err) {
        console.error('Failed to load campaigns:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, [projectId]);

  // Load runs for selected campaign
  const handleViewRuns = async (campaignId: string) => {
    try {
      setSelectedCampaignId(campaignId);
      setRunsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_ORCHESTRATOR_API || 'http://localhost:3020'}/api/campaigns/${campaignId}/runs`
      );
      const data = await response.json();
      setCampaignRuns(data.runs || []);
    } catch (err) {
      console.error('Failed to load campaign runs:', err);
    } finally {
      setRunsLoading(false);
    }
  };

  const handleRunNow = async (campaignId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_ORCHESTRATOR_API || 'http://localhost:3020'}/api/campaigns/${campaignId}/run`,
        { method: 'POST' }
      );
      if (response.ok) {
        alert('Campaign run started successfully!');
        // Refresh campaigns
        const refreshResponse = await fetch(
          `${process.env.NEXT_PUBLIC_ORCHESTRATOR_API || 'http://localhost:3020'}/api/campaigns?project_id=${projectId}`
        );
        const data = await refreshResponse.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Failed to run campaign:', err);
      alert('Failed to run campaign');
    }
  };

  const handlePause = async (campaignId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_ORCHESTRATOR_API || 'http://localhost:3020'}/api/campaigns/${campaignId}/pause`,
        { method: 'PUT' }
      );
      if (response.ok) {
        // Refresh campaigns
        const refreshResponse = await fetch(
          `${process.env.NEXT_PUBLIC_ORCHESTRATOR_API || 'http://localhost:3020'}/api/campaigns?project_id=${projectId}`
        );
        const data = await refreshResponse.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Failed to pause campaign:', err);
    }
  };

  const handleResume = async (campaignId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_ORCHESTRATOR_API || 'http://localhost:3020'}/api/campaigns/${campaignId}/resume`,
        { method: 'PUT' }
      );
      if (response.ok) {
        // Refresh campaigns
        const refreshResponse = await fetch(
          `${process.env.NEXT_PUBLIC_ORCHESTRATOR_API || 'http://localhost:3020'}/api/campaigns?project_id=${projectId}`
        );
        const data = await refreshResponse.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Failed to resume campaign:', err);
    }
  };

  const handleDelete = async (campaignId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_ORCHESTRATOR_API || 'http://localhost:3020'}/api/campaigns/${campaignId}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        // Refresh campaigns
        const refreshResponse = await fetch(
          `${process.env.NEXT_PUBLIC_ORCHESTRATOR_API || 'http://localhost:3020'}/api/campaigns?project_id=${projectId}`
        );
        const data = await refreshResponse.json();
        setCampaigns(data.campaigns || []);

        // Clear selected campaign if it was deleted
        if (selectedCampaignId === campaignId) {
          setSelectedCampaignId(null);
          setCampaignRuns([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete campaign:', err);
    }
  };

  const handleCreateCampaign = async (config: any) => {
    try {
      setCreateLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_ORCHESTRATOR_API || 'http://localhost:3020'}/api/campaigns`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        }
      );

      if (response.ok) {
        // Refresh campaigns
        const refreshResponse = await fetch(
          `${process.env.NEXT_PUBLIC_ORCHESTRATOR_API || 'http://localhost:3020'}/api/campaigns?project_id=${projectId}`
        );
        const data = await refreshResponse.json();
        setCampaigns(data.campaigns || []);
        setScheduleDialogOpen(false);
      } else {
        const error = await response.json();
        alert(`Failed to create campaign: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to create campaign:', err);
      alert('Failed to create campaign');
    } finally {
      setCreateLoading(false);
    }
  };

  const hasCampaigns = campaigns.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Automated Campaigns</h2>
        <Button onClick={() => setScheduleDialogOpen(true)}>
          Schedule Campaign
        </Button>
      </div>

      {!hasCampaigns && !loading ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-muted-foreground text-center py-8">
            No campaigns scheduled for this project yet.
          </p>
          <div className="text-center mt-4">
            <Button
              variant="outline"
              onClick={() => setScheduleDialogOpen(true)}
            >
              Create Campaign
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ScheduledCampaignsTable
            campaigns={campaigns}
            onRunNow={handleRunNow}
            onPause={handlePause}
            onResume={handleResume}
            onDelete={handleDelete}
            onViewRuns={handleViewRuns}
            loading={loading}
          />

          {/* Campaign Runs Section */}
          {selectedCampaignId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Campaign Run History</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCampaignId(null);
                    setCampaignRuns([]);
                  }}
                >
                  Close
                </Button>
              </div>
              <CampaignRunsHistory runs={campaignRuns} loading={runsLoading} />
            </div>
          )}
        </>
      )}

      {/* Campaign Schedule Dialog */}
      <CampaignScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSubmit={handleCreateCampaign}
        projectId={projectId}
        isLoading={createLoading}
      />
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function StatCard({
  icon,
  label,
  value,
  subtitle
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}

function ActionCard({
  title,
  description,
  action,
  onClick
}: {
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-3">
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button variant="outline" className="w-full" onClick={onClick}>
        {action}
      </Button>
    </div>
  );
}

function MetricCard({
  label,
  value,
  breakdown
}: {
  label: string;
  value: number;
  breakdown?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {breakdown && (
        <p className="text-xs text-muted-foreground mt-2">{breakdown}</p>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'active':
      return 'default';
    case 'paused':
      return 'secondary';
    case 'completed':
      return 'outline';
    case 'archived':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

