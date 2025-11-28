'use client';

/**
 * Leads Page
 * View and manage analyzed leads with detailed analysis
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LeadsTable, LeadDetailModal } from '@/components/leads';
import { useLeads } from '@/lib/hooks';
import { LoadingSection } from '@/components/shared/loading-spinner';
import { LoadingOverlay, PageLayout } from '@/components/shared';
import type { Lead } from '@/lib/types';

export default function LeadsPage() {
  const router = useRouter();

  const { leads, loading, error, refresh } = useLeads();

  // Detail modal state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailModalOpen(true);
  };

  const handleComposeEmails = (leadIds: string[]) => {
    // Navigate to outreach page with pre-selected leads
    router.push(`/outreach?lead_ids=${leadIds.join(',')}`);
  };

  const handleComposeEmail = (leadId: string) => {
    // Navigate to outreach page with single lead
    router.push(`/outreach?lead_ids=${leadId}`);
  };

  return (
    <>
      <LoadingOverlay
        isLoading={loading && !leads.length}
        message="Loading leads..."
      />
      <PageLayout
        title="Leads"
        description="Analyzed leads with detailed insights and recommendations"
      >
        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && !leads.length ? (
          <LoadingSection title="Loading Leads" />
        ) : (
          <LeadsTable
            leads={leads}
            loading={loading}
            onLeadClick={handleLeadClick}
            onComposeEmails={handleComposeEmails}
            onRefresh={refresh}
          />
        )}

        {/* Lead Detail Modal */}
        <LeadDetailModal
          lead={selectedLead}
          open={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedLead(null);
          }}
          onComposeEmail={handleComposeEmail}
        />
      </PageLayout>
    </>
  );
}
