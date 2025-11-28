'use client';

import { useState, useEffect } from 'react';
import { Calendar, FolderKanban, Users, BarChart3, DollarSign, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectsTable, CreateProjectDialog } from '@/components/projects';
import {
  CampaignScheduleDialog,
  ScheduledCampaignsTable,
  CampaignRunsHistory
} from '@/components/campaigns';
import { useProjects } from '@/lib/hooks';
import { LoadingSection } from '@/components/shared/loading-spinner';
import { LoadingOverlay, PageLayout } from '@/components/shared';
import {
  getCampaigns,
  createCampaign,
  runCampaign,
  pauseCampaign,
  resumeCampaign,
  deleteCampaign,
  getCampaignRuns
} from '@/lib/api';
import type { Campaign, CampaignConfig, CampaignRun } from '@/lib/types';

export default function ProjectsPage() {
  const { projects, loading, error, refresh } = useProjects();

  // Campaign state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // Campaign runs state
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignRuns, setCampaignRuns] = useState<CampaignRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  // Load campaigns
  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setCampaignsLoading(true);
      const data = await getCampaigns();
      setCampaigns(data);
    } catch (error: any) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setCampaignsLoading(false);
    }
  };

  const loadCampaignRuns = async (campaignId: string) => {
    try {
      setRunsLoading(true);
      const runs = await getCampaignRuns(campaignId);
      setCampaignRuns(runs);
    } catch (error: any) {
      console.error('Failed to load campaign runs:', error);
    } finally {
      setRunsLoading(false);
    }
  };

  const handleCreateCampaign = async (config: CampaignConfig) => {
    try {
      setCreatingCampaign(true);
      await createCampaign(config);
      await loadCampaigns();
      setScheduleDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      alert(`Failed to create campaign: ${error.message}`);
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      await runCampaign(id);
      alert('Campaign started! Check the runs history to see progress.');
      setTimeout(() => {
        if (selectedCampaignId === id) {
          loadCampaignRuns(id);
        }
      }, 2000);
    } catch (error: any) {
      alert(`Failed to run campaign: ${error.message}`);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await pauseCampaign(id);
      await loadCampaigns();
    } catch (error: any) {
      alert(`Failed to pause campaign: ${error.message}`);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await resumeCampaign(id);
      await loadCampaigns();
    } catch (error: any) {
      alert(`Failed to resume campaign: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign(id);
      await loadCampaigns();
      if (selectedCampaignId === id) {
        setSelectedCampaignId(null);
        setCampaignRuns([]);
      }
    } catch (error: any) {
      alert(`Failed to delete campaign: ${error.message}`);
    }
  };

  const handleViewRuns = (id: string) => {
    setSelectedCampaignId(id);
    loadCampaignRuns(id);
  };

  // Calculate stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const totalProspects = projects.reduce((sum, p) => sum + p.prospects_count, 0);
  const totalCost = projects.reduce((sum, p) => sum + p.total_cost, 0);

  return (
    <>
      <LoadingOverlay
        isLoading={loading || campaignsLoading || creatingCampaign}
        message={creatingCampaign ? "Creating campaign..." : "Loading..."}
      />
      <PageLayout
        title="Projects"
        description="Manage campaigns and workflows"
        headerRight={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setScheduleDialogOpen(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Automate</span>
            </Button>
            <CreateProjectDialog onProjectCreated={refresh} />
          </div>
        }
      >

        {/* Compact Stats Bar */}
        {projects.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg overflow-x-auto">
            <StatChip
              icon={<FolderKanban className="w-3.5 h-3.5" />}
              value={totalProjects}
              label="Projects"
              color="text-slate-600"
            />
            <div className="w-px h-4 bg-border" />
            <StatChip
              icon={<Zap className="w-3.5 h-3.5" />}
              value={activeProjects}
              label="Active"
              color="text-emerald-600"
            />
            <div className="w-px h-4 bg-border" />
            <StatChip
              icon={<Users className="w-3.5 h-3.5" />}
              value={totalProspects}
              label="Prospects"
              color="text-blue-600"
            />
            <div className="w-px h-4 bg-border" />
            <StatChip
              icon={<DollarSign className="w-3.5 h-3.5" />}
              value={`${totalCost.toFixed(2)}`}
              label="Cost"
              color="text-amber-600"
            />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
            <TabsTrigger value="projects" className="text-sm">
              <FolderKanban className="w-4 h-4 mr-1.5" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="text-sm">
              <Calendar className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Campaigns</span>
              <span className="sm:hidden">Auto</span>
              {campaigns.length > 0 && (
                <span className="ml-1.5 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                  {campaigns.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4 mt-4">
            {loading && !projects.length ? (
              <LoadingSection title="Loading Projects" />
            ) : (
              <ProjectsTable
                projects={projects}
                loading={loading}
                onProjectClick={(project) => {
                  window.location.href = `/projects/${project.id}`;
                }}
                onDeleteComplete={refresh}
              />
            )}
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Scheduled Campaigns</h2>
                  <p className="text-xs text-muted-foreground">
                    Automated prospecting, analysis, and outreach
                  </p>
                </div>
                <Button
                  onClick={() => setScheduleDialogOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New
                </Button>
              </div>

              <ScheduledCampaignsTable
                campaigns={campaigns}
                onRunNow={handleRunNow}
                onPause={handlePause}
                onResume={handleResume}
                onDelete={handleDelete}
                onViewRuns={handleViewRuns}
                loading={campaignsLoading}
              />
            </div>

            {/* Campaign Runs History */}
            {selectedCampaignId && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Run History</h2>
                    <p className="text-xs text-muted-foreground">
                      {campaigns.find(c => c.id === selectedCampaignId)?.name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
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
          </TabsContent>
        </Tabs>

        {/* Campaign Schedule Dialog */}
        <CampaignScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          onSubmit={handleCreateCampaign}
          isLoading={creatingCampaign}
        />
      </PageLayout>
    </>
  );
}

// Compact stat chip for inline display
function StatChip({
  icon,
  value,
  label,
  color
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 whitespace-nowrap">
      <span className={color}>{icon}</span>
      <span className="font-semibold text-sm">{value}</span>
      <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>
    </div>
  );
}
