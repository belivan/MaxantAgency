'use client';

/**
 * Project Detail Page
 * Compact, mobile-friendly design with visual hierarchy
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, DollarSign, Users, Mail, TrendingUp, ChevronDown,
  ChevronRight, Play, Settings, BarChart3, Zap, Calendar, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  grade_distribution: { A: number; B: number; C: number; D: number; F: number; };
}

// Status colors with visual distinction
const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  paused: { bg: 'bg-amber-500/10', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { bg: 'bg-blue-500/10', text: 'text-blue-700', dot: 'bg-blue-500' },
  archived: { bg: 'bg-slate-500/10', text: 'text-slate-600', dot: 'bg-slate-400' },
};

// Grade colors
const gradeColors: Record<string, string> = {
  A: 'text-emerald-600 bg-emerald-500/10',
  B: 'text-blue-600 bg-blue-500/10',
  C: 'text-amber-600 bg-amber-500/10',
  D: 'text-orange-600 bg-orange-500/10',
  F: 'text-red-600 bg-red-500/10',
};

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
      <div className="container mx-auto p-4">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
        <Button onClick={() => router.push('/projects')} className="mt-4" size="sm">
          Back to Projects
        </Button>
      </div>
    );
  }

  const statusStyle = statusColors[project?.status || 'paused'];

  return (
    <>
      <LoadingOverlay isLoading={loading} message="Loading project..." />
      <div className="container mx-auto px-4 py-4 md:p-6 space-y-4">
        {/* Compact Header */}
        <div className="space-y-3">
          {/* Back + Title Row */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/projects')}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold truncate">
                  {project?.name || 'Loading...'}
                </h1>
                {project?.status && (
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                    {project.status}
                  </span>
                )}
              </div>
              {project?.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {project.description}
                </p>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setActiveTab('campaigns')}>
                <Play className="w-3.5 h-3.5 mr-1" />
                Run
              </Button>
            </div>
          </div>

          {/* Inline Stats Bar */}
          {project && (
            <div className="flex items-center gap-1 p-2 bg-muted/30 rounded-lg overflow-x-auto text-sm">
              <StatChip
                icon={<DollarSign className="w-3.5 h-3.5" />}
                value={formatCurrency(Number(project.budget) || 0)}
                subValue={`${formatCurrency(Number(project.total_spent) || 0)} used`}
                color="text-amber-600"
              />
              <div className="w-px h-6 bg-border mx-1" />
              <StatChip
                icon={<Users className="w-3.5 h-3.5" />}
                value={stats.prospects_count}
                label="Prospects"
                color="text-slate-600"
              />
              <div className="w-px h-6 bg-border mx-1" />
              <StatChip
                icon={<BarChart3 className="w-3.5 h-3.5" />}
                value={stats.leads_count}
                label="Leads"
                color="text-blue-600"
              />
              <div className="w-px h-6 bg-border mx-1" />
              <StatChip
                icon={<Mail className="w-3.5 h-3.5" />}
                value={stats.emails_count}
                label="Emails"
                color="text-emerald-600"
              />
              {/* Grade Pills */}
              {stats.leads_count > 0 && (
                <>
                  <div className="w-px h-6 bg-border mx-1" />
                  <div className="flex items-center gap-1">
                    {stats.grade_distribution.A > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${gradeColors.A}`}>
                        {stats.grade_distribution.A}A
                      </span>
                    )}
                    {stats.grade_distribution.B > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${gradeColors.B}`}>
                        {stats.grade_distribution.B}B
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tabs - Full width on mobile */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full grid grid-cols-5 sm:inline-flex sm:w-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <TrendingUp className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="prospects" className="text-xs sm:text-sm">
              <Users className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Prospects</span>
            </TabsTrigger>
            <TabsTrigger value="leads" className="text-xs sm:text-sm">
              <BarChart3 className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Leads</span>
            </TabsTrigger>
            <TabsTrigger value="outreach" className="text-xs sm:text-sm">
              <Mail className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Outreach</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="text-xs sm:text-sm">
              <Zap className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Auto</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <OverviewTab project={project} stats={stats} />
          </TabsContent>

          <TabsContent value="prospects" className="space-y-4 mt-4">
            <ProspectsTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="leads" className="space-y-4 mt-4">
            <LeadsTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="outreach" className="space-y-4 mt-4">
            <OutreachTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4 mt-4">
            <CampaignsTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// ============================================================================
// Tab Components (Compact versions)
// ============================================================================

function OverviewTab({
  project,
  stats,
}: {
  project: Project | null;
  stats: ProjectStats;
}) {
  if (!project) return null;

  const analysisRate = stats.prospects_count > 0
    ? ((stats.leads_count / stats.prospects_count) * 100).toFixed(0)
    : '0';
  const emailRate = stats.leads_count > 0
    ? ((stats.emails_count / stats.leads_count) * 100).toFixed(0)
    : '0';

  return (
    <div className="space-y-4">
      {/* Pipeline Conversion Rates - Only show if there's data */}
      {stats.prospects_count > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-blue-600">{analysisRate}%</p>
                <p className="text-xs text-muted-foreground">Analysis Rate</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-emerald-600">{emailRate}%</p>
                <p className="text-xs text-muted-foreground">Outreach Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grade Distribution */}
      {stats.leads_count > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lead Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {(['A', 'B', 'C', 'D', 'F'] as const).map(grade => {
                const count = stats.grade_distribution[grade];
                const pct = stats.leads_count > 0 ? (count / stats.leads_count) * 100 : 0;
                return (
                  <div key={grade} className="flex-1 text-center">
                    <div
                      className={`h-16 rounded-t flex items-end justify-center ${gradeColors[grade].replace('text-', 'bg-').replace('bg-', 'bg-')}`}
                      style={{ opacity: pct > 0 ? 0.2 + (pct / 100) * 0.8 : 0.1 }}
                    >
                      <span className="text-lg font-bold pb-1">{count}</span>
                    </div>
                    <span className={`text-xs font-medium ${gradeColors[grade].split(' ')[0]}`}>
                      {grade}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Info - Compact */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="font-medium">{formatCurrency(Number(project.budget) || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Spent</p>
            <p className="font-medium">{formatCurrency(Number(project.total_spent) || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="font-medium">{formatDateTime(project.created_at, { relative: true })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{project.status}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProspectsTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [configOpen, setConfigOpen] = useState(false);

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

  const hasConfig = project?.icp_brief && Object.keys(project.icp_brief).length > 0;

  const handleDeleteComplete = () => {
    getProspects({ project_id: projectId })
      .then(data => setProspects(data.prospects || []))
      .catch(err => console.error('Failed to reload prospects:', err));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Prospects ({prospects.length})</h2>
        <Button size="sm" onClick={() => router.push(`/prospecting?project_id=${projectId}`)}>
          Generate More
        </Button>
      </div>

      {/* ICP Config - Collapsible */}
      {hasConfig && (
        <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Settings className="w-3.5 h-3.5" />
                ICP Configuration
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${configOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <Card>
              <CardContent className="pt-4 grid grid-cols-2 gap-3 text-sm">
                {project?.icp_brief?.industry && (
                  <div>
                    <p className="text-xs text-muted-foreground">Industry</p>
                    <p className="font-medium">{project.icp_brief.industry}</p>
                  </div>
                )}
                {project?.icp_brief?.city && (
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">{project.icp_brief.city}</p>
                  </div>
                )}
                {project?.icp_brief?.target_description && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Target</p>
                    <p className="font-medium">{project.icp_brief.target_description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Prospects Table or Empty */}
      {prospects.length === 0 && !loading ? (
        <EmptyState
          message="No prospects yet"
          action="Start Prospecting"
          onClick={() => router.push(`/prospecting?project_id=${projectId}`)}
        />
      ) : (
        <ProspectTable
          prospects={prospects}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onDeleteComplete={handleDeleteComplete}
          loading={loading}
        />
      )}

      {/* Analyze Selected */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
          <Button
            size="sm"
            onClick={() => router.push(`/analysis?project_id=${projectId}&prospect_ids=${selectedIds.join(',')}`)}
          >
            Analyze Selected
          </Button>
        </div>
      )}
    </div>
  );
}

function LeadsTab({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const leadsData = await getLeads({ project_id: projectId });
      setLeads(leadsData || []);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Leads ({leads.length})</h2>
        <Button size="sm" onClick={() => router.push(`/analysis?project_id=${projectId}`)}>
          Analyze More
        </Button>
      </div>

      {leads.length === 0 && !loading ? (
        <EmptyState
          message="No leads analyzed yet"
          action="Start Analysis"
          onClick={() => router.push(`/analysis?project_id=${projectId}`)}
        />
      ) : (
        <LeadsTable
          leads={leads}
          loading={loading}
          onLeadClick={(lead) => {
            setSelectedLead(lead);
            setLeadModalOpen(true);
          }}
          onComposeEmails={(leadIds) => {
            router.push(`/outreach?project_id=${projectId}&lead_ids=${leadIds.join(',')}`);
          }}
          onRefresh={loadData}
        />
      )}

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

  const hasOutreach = emails.length > 0 || socialMessages.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Outreach</h2>
        <Button size="sm" onClick={() => router.push(`/outreach?project_id=${projectId}`)}>
          Compose More
        </Button>
      </div>

      {!hasOutreach && !loading ? (
        <EmptyState
          message="No outreach created yet"
          action="Start Composing"
          onClick={() => router.push(`/outreach?project_id=${projectId}`)}
        />
      ) : (
        <Tabs value={activeView} onValueChange={(v: any) => setActiveView(v)}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="emails">Emails ({emails.length})</TabsTrigger>
            <TabsTrigger value="social">Social ({socialMessages.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="emails" className="mt-4">
            <EmailsTable emails={emails} loading={loading} onEmailClick={(e) => {
              setSelectedEmail(e);
              setEmailModalOpen(true);
            }} />
          </TabsContent>
          <TabsContent value="social" className="mt-4">
            <SocialMessagesTable messages={socialMessages} loading={loading} onMessageClick={(m) => {
              setSelectedMessage(m);
              setMessageModalOpen(true);
            }} />
          </TabsContent>
        </Tabs>
      )}

      <EmailDetailModal email={selectedEmail} open={emailModalOpen} onClose={() => {
        setEmailModalOpen(false);
        setSelectedEmail(null);
      }} />
      <SocialMessageDetailModal message={selectedMessage} open={messageModalOpen} onClose={() => {
        setMessageModalOpen(false);
        setSelectedMessage(null);
      }} />
    </div>
  );
}

function CampaignsTab({ projectId }: { projectId: string }) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignRuns, setCampaignRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_API || 'http://localhost:3020';

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${baseUrl}/api/campaigns?project_id=${projectId}`);
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [projectId]);

  const handleViewRuns = async (campaignId: string) => {
    try {
      setSelectedCampaignId(campaignId);
      setRunsLoading(true);
      const response = await fetch(`${baseUrl}/api/campaigns/${campaignId}/runs`);
      const data = await response.json();
      setCampaignRuns(data.runs || []);
    } catch (err) {
      console.error('Failed to load runs:', err);
    } finally {
      setRunsLoading(false);
    }
  };

  const handleAction = async (action: string, campaignId: string) => {
    const endpoints: Record<string, { method: string; path: string }> = {
      run: { method: 'POST', path: `/api/campaigns/${campaignId}/run` },
      pause: { method: 'PUT', path: `/api/campaigns/${campaignId}/pause` },
      resume: { method: 'PUT', path: `/api/campaigns/${campaignId}/resume` },
      delete: { method: 'DELETE', path: `/api/campaigns/${campaignId}` },
    };
    const { method, path } = endpoints[action];
    try {
      await fetch(`${baseUrl}${path}`, { method });
      if (action === 'delete' && selectedCampaignId === campaignId) {
        setSelectedCampaignId(null);
        setCampaignRuns([]);
      }
      loadCampaigns();
    } catch (err) {
      console.error(`Failed to ${action} campaign:`, err);
    }
  };

  const handleCreateCampaign = async (config: any) => {
    try {
      setCreateLoading(true);
      const response = await fetch(`${baseUrl}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (response.ok) {
        loadCampaigns();
        setScheduleDialogOpen(false);
      }
    } catch (err) {
      console.error('Failed to create campaign:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Automation ({campaigns.length})</h2>
        <Button size="sm" onClick={() => setScheduleDialogOpen(true)}>
          <Calendar className="w-3.5 h-3.5 mr-1" />
          Schedule
        </Button>
      </div>

      {campaigns.length === 0 && !loading ? (
        <EmptyState
          message="No campaigns scheduled"
          action="Create Campaign"
          onClick={() => setScheduleDialogOpen(true)}
        />
      ) : (
        <>
          <ScheduledCampaignsTable
            campaigns={campaigns}
            onRunNow={(id) => handleAction('run', id)}
            onPause={(id) => handleAction('pause', id)}
            onResume={(id) => handleAction('resume', id)}
            onDelete={(id) => handleAction('delete', id)}
            onViewRuns={handleViewRuns}
            loading={loading}
          />
          {selectedCampaignId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Run History</h3>
                <Button variant="ghost" size="sm" onClick={() => {
                  setSelectedCampaignId(null);
                  setCampaignRuns([]);
                }}>
                  Close
                </Button>
              </div>
              <CampaignRunsHistory runs={campaignRuns} loading={runsLoading} />
            </div>
          )}
        </>
      )}

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

function StatChip({
  icon,
  value,
  label,
  subValue,
  color
}: {
  icon: React.ReactNode;
  value: string | number;
  label?: string;
  subValue?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 whitespace-nowrap">
      <span className={color}>{icon}</span>
      <span className="font-semibold text-sm">{value}</span>
      {label && <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>}
      {subValue && <span className="text-xs text-muted-foreground hidden md:inline">({subValue})</span>}
    </div>
  );
}

function EmptyState({
  message,
  action,
  onClick
}: {
  message: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="text-center py-8 border border-dashed rounded-lg">
      <p className="text-muted-foreground mb-3">{message}</p>
      <Button variant="outline" size="sm" onClick={onClick}>
        {action}
      </Button>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}
