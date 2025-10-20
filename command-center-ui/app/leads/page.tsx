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
import { LoadingOverlay } from '@/components/shared';
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
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Analyzed leads with detailed insights and recommendations
          </p>
        </div>

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
        /* Leads Table */
        <LeadsTable
          leads={leads}
          loading={loading}
          onLeadClick={handleLeadClick}
          onComposeEmails={handleComposeEmails}
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

      {/* Stats Summary */}
      {leads.length > 0 && (
        <div className="grid gap-4 md:grid-cols-5 pt-4">
          <StatCard
            label="Total Leads"
            value={leads.length}
          />
          <StatCard
            label="Grade A"
            value={leads.filter(l => l.grade === 'A').length}
            highlight="green"
          />
          <StatCard
            label="Grade B"
            value={leads.filter(l => l.grade === 'B').length}
            highlight="blue"
          />
          <StatCard
            label="With Email"
            value={leads.filter(l => l.contact_email && l.contact_email.trim() !== '').length}
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

function StatCard({
  label,
  value,
  highlight
}: {
  label: string;
  value: string | number;
  highlight?: 'green' | 'blue';
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight === 'green'
          ? 'bg-green-50 dark:bg-green-950/20 border-green-600'
          : highlight === 'blue'
          ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-600'
          : 'bg-card border-border'
      }`}
    >
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
