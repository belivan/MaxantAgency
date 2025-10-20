'use client';

/**
 * Outreach Page
 * Compose and manage personalized emails and social messages
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
import { EmailsTable } from '@/components/outreach/emails-table';
import { EmailDetailModal } from '@/components/outreach/email-detail-modal';
import { SocialMessagesTable } from '@/components/outreach/social-messages-table';
import { SocialMessageDetailModal } from '@/components/outreach/social-message-detail-modal';
import { ProjectSelector } from '@/components/shared/project-selector';
import type { SocialPlatform } from '@/components/outreach/social-platform-selector';
import { LoadingSection } from '@/components/shared/loading-spinner';
import { LoadingOverlay } from '@/components/shared';
import { useEngineHealth } from '@/lib/hooks';
import { getLeadsByIds } from '@/lib/api/supabase';
import { getEmails, getSocialMessages } from '@/lib/api/outreach';
import { updateProject } from '@/lib/api';
import type { Lead, Email, SocialMessage } from '@/lib/types';

export default function OutreachPage() {
  const searchParams = useSearchParams();
  const leadIdsParam = searchParams.get('lead_ids');
  const urlProjectId = searchParams.get('project_id');
  const engineStatus = useEngineHealth();

  // Project selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(urlProjectId || null);

  // Leads for composition
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compose tab state
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('instagram');
  const [composeTab, setComposeTab] = useState('email');

  // Emails and social messages state
  const [emails, setEmails] = useState<Email[]>([]);
  const [socialMessages, setSocialMessages] = useState<SocialMessage[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [socialMessagesLoading, setSocialMessagesLoading] = useState(false);

  // Modal state
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedSocialMessage, setSelectedSocialMessage] = useState<SocialMessage | null>(null);

  // Main tab state
  const [activeTab, setActiveTab] = useState('compose');

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
        let fetchedLeads = await getLeadsByIds(leadIds);

        // Filter by project if one is selected
        if (selectedProjectId) {
          fetchedLeads = fetchedLeads.filter(lead => lead.project_id === selectedProjectId);
        }

        setLeads(fetchedLeads);
      } catch (err: any) {
        console.error('Failed to load leads:', err);
        setError(err.message || 'Failed to load leads');
      } finally {
        setLoading(false);
      }
    };

    loadLeads();
  }, [leadIdsParam, selectedProjectId]);

  // Save outreach config when strategy changes
  useEffect(() => {
    if (!selectedProjectId || !selectedStrategy) return;

    const saveConfig = async () => {
      try {
        await updateProject(selectedProjectId, {
          outreach_config: {
            strategy: selectedStrategy,
            platform: selectedPlatform
          }
        });
        console.log('✅ Saved outreach config to project:', selectedProjectId);
      } catch (error: any) {
        console.error('Failed to save outreach config:', error);
      }
    };

    saveConfig();
  }, [selectedStrategy, selectedPlatform, selectedProjectId]);

  // Load emails when on "My Emails" tab
  useEffect(() => {
    if (activeTab !== 'emails') return;

    const loadEmails = async () => {
      setEmailsLoading(true);
      try {
        const filters: any = { limit: 100, sort_by: 'created_at', sort_order: 'desc' };
        if (selectedProjectId) {
          filters.project_id = selectedProjectId;
        }
        const fetchedEmails = await getEmails(filters);
        setEmails(fetchedEmails);
      } catch (err: any) {
        console.error('Failed to load emails:', err);
      } finally {
        setEmailsLoading(false);
      }
    };

    loadEmails();
  }, [activeTab, selectedProjectId]);

  // Load social messages when on "Social Messages" tab
  useEffect(() => {
    if (activeTab !== 'social') return;

    const loadSocialMessages = async () => {
      setSocialMessagesLoading(true);
      try {
        const filters: any = { limit: 100, sort_by: 'created_at', sort_order: 'desc' };
        if (selectedProjectId) {
          filters.project_id = selectedProjectId;
        }
        const fetchedMessages = await getSocialMessages(filters);
        setSocialMessages(fetchedMessages);
      } catch (err: any) {
        console.error('Failed to load social messages:', err);
      } finally {
        setSocialMessagesLoading(false);
      }
    };

    loadSocialMessages();
  }, [activeTab, selectedProjectId]);

  // Refresh data after composition
  const refreshEmails = async () => {
    try {
      const fetchedEmails = await getEmails({ limit: 100, sort_by: 'created_at', sort_order: 'desc' });
      setEmails(fetchedEmails);
    } catch (err: any) {
      console.error('Failed to refresh emails:', err);
    }
  };

  const refreshSocialMessages = async () => {
    try {
      const fetchedMessages = await getSocialMessages({ limit: 100, sort_by: 'created_at', sort_order: 'desc' });
      setSocialMessages(fetchedMessages);
    } catch (err: any) {
      console.error('Failed to refresh social messages:', err);
    }
  };

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

        {/* Project Selector */}
        <div className="max-w-xs">
          <ProjectSelector
            value={selectedProjectId}
            onChange={setSelectedProjectId}
            label="Filter by Project"
          />
        </div>

        {/* Engine Offline Warning */}
        {isOutreachEngineOffline && leads.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Outreach Engine Offline</AlertTitle>
            <AlertDescription>
              The outreach engine is not responding. Please start the outreach-engine service (port 3002) to compose emails and social messages.
            </AlertDescription>
          </Alert>
        )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="emails">My Emails</TabsTrigger>
          <TabsTrigger value="social">Social Messages</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-6 mt-6">
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Nested tabs for Email vs Social */}
          <Tabs value={composeTab} onValueChange={setComposeTab}>
            <TabsList>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="social-compose">Social DM</TabsTrigger>
            </TabsList>

            {/* Email Composition */}
            <TabsContent value="email" className="space-y-6 mt-6">

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
                      refreshEmails();
                    }}
                  />
                ) : (
                  <EmailComposer
                    lead={leads[0]}
                    strategyId={selectedStrategy}
                    onEmailGenerated={(email) => {
                      console.log('Generated email:', email);
                      refreshEmails();
                    }}
                  />
                )}
              </div>
            </div>
          )}
            </TabsContent>

            {/* Social DM Composition */}
            <TabsContent value="social-compose" className="space-y-6 mt-6">
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
                      refreshSocialMessages();
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
        </TabsContent>

        {/* My Emails Tab */}
        <TabsContent value="emails" className="space-y-6 mt-6">
          <EmailsTable
            emails={emails}
            loading={emailsLoading}
            onEmailClick={(email) => setSelectedEmail(email)}
            onSendEmail={(emailId) => {
              console.log('Send email:', emailId);
              // TODO: Implement send email functionality
            }}
            onScheduleEmail={(emailId) => {
              console.log('Schedule email:', emailId);
              // TODO: Implement schedule email functionality
            }}
          />
        </TabsContent>

        {/* Social Messages Tab */}
        <TabsContent value="social" className="space-y-6 mt-6">
          <SocialMessagesTable
            messages={socialMessages}
            loading={socialMessagesLoading}
            onMessageClick={(message) => setSelectedSocialMessage(message)}
            onSendMessage={(messageId) => {
              console.log('Send social message:', messageId);
              // TODO: Implement send social message functionality
            }}
          />
        </TabsContent>

        {/* Sent Tab */}
        <TabsContent value="sent" className="space-y-6 mt-6">
          <div className="space-y-6">
            {/* Sent Emails */}
            <EmailsTable
              emails={emails.filter(e => e.status === 'sent')}
              loading={emailsLoading}
              onEmailClick={(email) => setSelectedEmail(email)}
            />

            {/* Sent Social Messages */}
            <SocialMessagesTable
              messages={socialMessages.filter(m => m.status === 'sent')}
              loading={socialMessagesLoading}
              onMessageClick={(message) => setSelectedSocialMessage(message)}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Email Detail Modal */}
      <EmailDetailModal
        email={selectedEmail}
        open={selectedEmail !== null}
        onClose={() => setSelectedEmail(null)}
        onSendEmail={(emailId) => {
          console.log('Send email:', emailId);
          // TODO: Implement send email functionality
          setSelectedEmail(null);
        }}
        onScheduleEmail={(emailId) => {
          console.log('Schedule email:', emailId);
          // TODO: Implement schedule email functionality
          setSelectedEmail(null);
        }}
      />

      {/* Social Message Detail Modal */}
      <SocialMessageDetailModal
        message={selectedSocialMessage}
        open={selectedSocialMessage !== null}
        onClose={() => setSelectedSocialMessage(null)}
        onSendMessage={(messageId) => {
          console.log('Send social message:', messageId);
          // TODO: Implement send social message functionality
          setSelectedSocialMessage(null);
        }}
      />

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
