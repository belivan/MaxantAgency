'use client';

/**
 * Outreach Page
 * Compose and send personalized emails to leads
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  EmailStrategySelector,
  EmailComposer,
  BatchEmailComposer,
  SocialPlatformSelector,
  SocialDMComposer
} from '@/components/outreach';
import type { SocialPlatform } from '@/components/outreach/social-platform-selector';
import { LoadingSection } from '@/components/shared/loading-spinner';
import { LoadingOverlay } from '@/components/shared';
import { useEngineHealth } from '@/lib/hooks';
import { getLeadsByIds } from '@/lib/api/supabase';
import type { Lead, ComposedEmail } from '@/lib/types';

export default function OutreachPage() {
  const searchParams = useSearchParams();
  const leadIdsParam = searchParams.get('lead_ids');
  const engineStatus = useEngineHealth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('instagram');
  const [activeTab, setActiveTab] = useState('email');

  // Load leads from URL params
  useEffect(() => {
    const loadLeads = async () => {
      if (!leadIdsParam) {
        setLeads([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const leadIds = leadIdsParam.split(',');
        const fetchedLeads = await getLeadsByIds(leadIds);
        setLeads(fetchedLeads);
      } catch (err: any) {
        console.error('Failed to load leads:', err);
        setError(err.message || 'Failed to load leads');
      } finally {
        setLoading(false);
      }
    };

    loadLeads();
  }, [leadIdsParam]);

  const isBatchMode = leads.length > 1;
  const isOutreachEngineOffline = engineStatus.outreach === 'offline';

  return (
    <>
      <LoadingOverlay
        isLoading={loading}
        message="Loading leads..."
      />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Outreach Hub</h1>
          <p className="text-muted-foreground">
            Compose personalized emails and social messages for your leads
          </p>
        </div>

        {/* Engine Offline Warning */}
        {isOutreachEngineOffline && leads.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Outreach Engine Offline</AlertTitle>
            <AlertDescription>
              The outreach engine is not responding. Please start the outreach-engine service (port 3001) to compose emails and social messages.
            </AlertDescription>
          </Alert>
        )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="email">Email Outreach</TabsTrigger>
          <TabsTrigger value="social">Social Outreach</TabsTrigger>
        </TabsList>

        {/* Email Outreach Tab */}
        <TabsContent value="email" className="space-y-6 mt-6">
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {loading ? (
            <LoadingSection title="Loading Leads" />
          ) : leads.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <div className="text-muted-foreground">
                <p className="font-medium mb-2">No leads selected</p>
                <p className="text-sm">
                  Navigate to the Leads page and select leads to compose emails
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column - Strategy Selector */}
              <div className="lg:col-span-1">
                <EmailStrategySelector
                  selectedStrategy={selectedStrategy}
                  onStrategyChange={setSelectedStrategy}
                />

                {/* Lead Summary */}
                {leads.length > 0 && (
                  <div className="mt-6 p-4 border rounded-lg bg-card">
                    <h4 className="font-medium mb-3">Selected Leads</h4>
                    <div className="space-y-2">
                      {leads.slice(0, 5).map(lead => (
                        <div
                          key={lead.id}
                          className="text-sm p-2 border rounded bg-muted/50"
                        >
                          <div className="font-medium truncate">{lead.company_name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {lead.contact_email || 'No email'}
                          </div>
                        </div>
                      ))}
                      {leads.length > 5 && (
                        <div className="text-xs text-muted-foreground text-center pt-1">
                          +{leads.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Email Composer */}
              <div className="lg:col-span-2">
                {isBatchMode ? (
                  <BatchEmailComposer
                    leads={leads}
                    strategyId={selectedStrategy}
                    onAllGenerated={(emails) => {
                      console.log('Generated emails for batch:', emails.length);
                    }}
                  />
                ) : (
                  <EmailComposer
                    lead={leads[0]}
                    strategyId={selectedStrategy}
                    onEmailGenerated={(email) => {
                      console.log('Generated email:', email);
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Social Outreach Tab */}
        <TabsContent value="social" className="space-y-6 mt-6">
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {loading ? (
            <LoadingSection title="Loading Leads" />
          ) : leads.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <div className="text-muted-foreground">
                <p className="font-medium mb-2">No leads selected</p>
                <p className="text-sm">
                  Navigate to the Leads page and select leads to compose social messages
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column - Platform Selector */}
              <div className="lg:col-span-1">
                <SocialPlatformSelector
                  selectedPlatform={selectedPlatform}
                  onPlatformChange={setSelectedPlatform}
                />

                {/* Lead Summary */}
                {leads.length > 0 && (
                  <div className="mt-6 p-4 border rounded-lg bg-card">
                    <h4 className="font-medium mb-3">Selected Leads</h4>
                    <div className="space-y-2">
                      {leads.slice(0, 5).map(lead => (
                        <div
                          key={lead.id}
                          className="text-sm p-2 border rounded bg-muted/50"
                        >
                          <div className="font-medium truncate">{lead.company_name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {lead.social_profiles?.length || 0} social profile{lead.social_profiles?.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      ))}
                      {leads.length > 5 && (
                        <div className="text-xs text-muted-foreground text-center pt-1">
                          +{leads.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Social DM Composer */}
              <div className="lg:col-span-2">
                {/* Note: Only single lead mode for social (batch not implemented) */}
                {leads.length === 1 ? (
                  <SocialDMComposer
                    lead={leads[0]}
                    platform={selectedPlatform}
                    onMessageGenerated={(message) => {
                      console.log('Generated social message:', message);
                    }}
                  />
                ) : (
                  <div className="text-center py-12 border rounded-lg">
                    <div className="text-muted-foreground">
                      <p className="font-medium mb-2">Batch Social Messaging</p>
                      <p className="text-sm">
                        Social DMs work best one at a time. Please select a single lead from the Leads page.
                      </p>
                      <p className="text-xs mt-2">
                        {leads.length} leads selected - navigate back to select one
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Stats */}
      {leads.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4 pt-4 border-t">
          <StatCard
            label="Total Leads"
            value={leads.length}
          />
          <StatCard
            label="With Email"
            value={leads.filter(l => l.contact_email && l.contact_email.trim() !== '').length}
          />
          <StatCard
            label="Grade A+B"
            value={leads.filter(l => l.grade === 'A' || l.grade === 'B').length}
          />
          <StatCard
            label="Avg Score"
            value={Math.round(leads.reduce((sum, l) => sum + l.overall_score, 0) / leads.length)}
          />
        </div>
      )}
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
