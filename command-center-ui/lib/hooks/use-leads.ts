/**
 * Leads Data Hook
 * Manages lead data fetching and state
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getLeads, getLead, getLeadsReadyForEmail } from '@/lib/api';
import type { Lead, LeadFilters } from '@/lib/types';

export interface UseLeadsReturn {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  total: number;
}

export function useLeads(filters?: LeadFilters): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Stringify filters to avoid infinite loops from object reference changes
  const filtersKey = useMemo(() => JSON.stringify(filters || {}), [
    filters?.project_id, 
    filters?.grade, 
    filters?.priority_tier,
    filters?.min_score,
    filters?.max_score,
    filters?.has_email,
    filters?.has_phone,
    filters?.industry,
    filters?.location,
    filters?.analysis_tier,
    filters?.sort_by,
    filters?.sort_order,
    filters?.limit, 
    filters?.offset
  ]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getLeads(filters);
      setLeads(data);
      setTotal(data.length);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leads');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [filtersKey]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return {
    leads,
    loading,
    error,
    refresh: fetchLeads,
    total
  };
}

export interface UseSingleLeadReturn {
  lead: Lead | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSingleLead(id: string | null): UseSingleLeadReturn {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLead = useCallback(async () => {
    if (!id) {
      setLead(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getLead(id);
      setLead(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch lead');
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  return {
    lead,
    loading,
    error,
    refresh: fetchLead
  };
}

/**
 * Hook for fetching leads ready for email composition
 * (Grade A/B with email addresses)
 */
export function useLeadsReadyForEmail(projectId?: string): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getLeadsReadyForEmail(projectId);
      setLeads(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leads');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]); // projectId is a string, safe to use directly

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return {
    leads,
    loading,
    error,
    refresh: fetchLeads,
    total: leads.length
  };
}
