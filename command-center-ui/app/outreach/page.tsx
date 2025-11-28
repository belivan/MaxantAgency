'use client';

/**
 * Outreach Page - Simplified
 * View and manage generated outreach by company
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OutreachTable, OutreachDetailModal } from '@/components/outreach';
import type { OutreachCompany } from '@/components/outreach/outreach-table';
import { ProjectSelector, PageLayout } from '@/components/shared';
import { useEngineHealth } from '@/lib/hooks';
import { getEmails, getSocialMessages } from '@/lib/api/outreach';
import type { Email, SocialMessage } from '@/lib/types';

export default function OutreachPage() {
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get('project_id');
  const engineStatus = useEngineHealth();

  // Project selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(urlProjectId || null);

  // Data state
  const [emails, setEmails] = useState<Email[]>([]);
  const [socialMessages, setSocialMessages] = useState<SocialMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedCompany, setSelectedCompany] = useState<OutreachCompany | null>(null);

  // Load outreach data
  useEffect(() => {
    const loadOutreach = async () => {
      setLoading(true);
      setError(null);

      try {
        const filters: any = { limit: 500, sort_by: 'created_at', sort_order: 'desc' };
        if (selectedProjectId) {
          filters.project_id = selectedProjectId;
        }

        // Load both emails and social messages in parallel
        const [fetchedEmails, fetchedSocialMessages] = await Promise.all([
          getEmails(filters),
          getSocialMessages(filters)
        ]);

        setEmails(fetchedEmails);
        setSocialMessages(fetchedSocialMessages);
      } catch (err: any) {
        console.error('Failed to load outreach:', err);
        setError(err.message || 'Failed to load outreach data');
      } finally {
        setLoading(false);
      }
    };

    loadOutreach();
  }, [selectedProjectId]);

  // Refresh handler
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const filters: any = { limit: 500, sort_by: 'created_at', sort_order: 'desc' };
      if (selectedProjectId) {
        filters.project_id = selectedProjectId;
      }

      const [fetchedEmails, fetchedSocialMessages] = await Promise.all([
        getEmails(filters),
        getSocialMessages(filters)
      ]);

      setEmails(fetchedEmails);
      setSocialMessages(fetchedSocialMessages);
    } catch (err: any) {
      console.error('Failed to refresh:', err);
    } finally {
      setLoading(false);
    }
  };

  const isOutreachEngineOffline = engineStatus.outreach === 'offline';
  const totalOutreach = emails.length + socialMessages.length;

  return (
    <PageLayout
      title="Outreach"
      description={totalOutreach > 0
        ? `${emails.length} emails · ${socialMessages.length} social messages`
        : 'View and manage generated outreach'}
      headerRight={
        <div className="w-full sm:w-auto sm:min-w-[200px]">
          <ProjectSelector
            value={selectedProjectId}
            onChange={setSelectedProjectId}
            label=""
            placeholder="All Projects"
            showLabel={false}
          />
        </div>
      }
    >

      {/* Engine Offline Warning */}
      {isOutreachEngineOffline && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm">
            Outreach engine offline (port 3002)
          </AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Outreach Table */}
      <OutreachTable
        emails={emails}
        socialMessages={socialMessages}
        loading={loading}
        onCompanyClick={(company) => setSelectedCompany(company)}
        onRefresh={handleRefresh}
      />

      {/* Detail Modal */}
      <OutreachDetailModal
        company={selectedCompany}
        open={selectedCompany !== null}
        onClose={() => setSelectedCompany(null)}
      />
    </PageLayout>
  );
}
