'use client';

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
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
import { LoadingOverlay } from '@/components/shared';
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
      // Refresh after a delay to show the new run
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

  return (
    <>
      <LoadingOverlay
        isLoading={loading || campaignsLoading || creatingCampaign}
        message={creatingCampaign ? "Creating campaign..." : "Loading..."}
      />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage your prospecting campaigns and automated workflows
            </p>
          </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setScheduleDialogOpen(true)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule Campaign</span>
          </Button>
          <CreateProjectDialog onProjectCreated={refresh} />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="projects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="campaigns">
            <Calendar className="w-4 h-4 mr-2" />
            Automated Campaigns ({campaigns.length})
          </TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          {loading && !projects.length ? (
            <LoadingSection title="Loading Projects" />
          ) : (
            <ProjectsTable
              projects={projects}
              loading={loading}
              onProjectClick={(project) => {
                window.location.href = `/projects/${project.id}`;
              }}
            />
          )}

          {/* Stats Summary */}
          {projects.length > 0 && (
            <div className="grid gap-4 md:grid-cols-4 pt-4">
              <StatCard
                label="Total Projects"
                value={projects.length}
              />
              <StatCard
                label="Active Projects"
                value={projects.filter(p => p.status === 'active').length}
              />
              <StatCard
                label="Total Prospects"
                value={projects.reduce((sum, p) => sum + p.prospects_count, 0)}
              />
              <StatCard
                label="Total Cost"
                value={`$${projects.reduce((sum, p) => sum + p.total_cost, 0).toFixed(2)}`}
              />
            </div>
          )}
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Scheduled Campaigns</h2>
              <p className="text-muted-foreground">
                Automated campaigns run on a schedule, executing prospecting, analysis, and outreach automatically
              </p>
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Run History</h2>
                  <p className="text-muted-foreground">
                    {campaigns.find(c => c.id === selectedCampaignId)?.name}
                  </p>
                </div>
                <Button
                  variant="outline"
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
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
