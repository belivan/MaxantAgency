/**
 * Prospects Data Hook
 * Manages prospect data fetching and state
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getProspects, getProspect } from '@/lib/api';
import type { Prospect, ProspectFilters } from '@/lib/types';

export interface UseProspectsReturn {
  prospects: Prospect[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  total: number;
}

export function useProspects(filters?: ProspectFilters): UseProspectsReturn {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Stringify filters to avoid infinite loops from object reference changes
  const filtersKey = useMemo(() => JSON.stringify(filters || {}), [
    filters?.status,
    filters?.industry,
    filters?.city,
    filters?.min_rating,
    filters?.verified,
    filters?.has_email,
    filters?.project_id,
    filters?.limit,
    filters?.offset
  ]);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getProspects(filters);
      setProspects(result.prospects);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch prospects');
      setProspects([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filtersKey]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  return {
    prospects,
    loading,
    error,
    refresh: fetchProspects,
    total
  };
}

export interface UseSingleProspectReturn {
  prospect: Prospect | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSingleProspect(id: string | null): UseSingleProspectReturn {
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProspect = useCallback(async () => {
    if (!id) {
      setProspect(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getProspect(id);
      setProspect(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch prospect');
      setProspect(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProspect();
  }, [fetchProspect]);

  return {
    prospect,
    loading,
    error,
    refresh: fetchProspect
  };
}
