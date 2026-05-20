import { useState, useEffect, useCallback } from 'react';
import { fetchDemands, createDemand as apiCreateDemand, updateDemand as apiUpdateDemand, deleteDemand as apiDeleteDemand, cancelDemand as apiCancelDemand, approveDemand as apiApproveDemand, rejectDemand as apiRejectDemand, bulkApproveDemands as apiBulkApprove, bulkRejectDemands as apiBulkReject } from '../api/apiService';
import { useRefresh } from '../contexts/RefreshContext';
import type { Demand } from '../types/domain';
import type { PaginationParams, DemandFilterParams, CreateDemandPayload, UpdateDemandPayload, ApproveDemandPayload, RejectDemandPayload, BulkApproveDemandPayload, BulkRejectDemandPayload } from '../api/types';

interface UseDemandsResult {
  demands: Demand[];
  isLoading: boolean;
  error: string | null;
  total: number;
  totalPending: number;
  totalPages: number;
  totalValue: number;
  totalApprovedValue: number;
  createDemand: (payload: CreateDemandPayload) => Promise<void>;
  updateDemand: (id: number, payload: UpdateDemandPayload) => Promise<void>;
  deleteDemand: (id: number) => Promise<void>;
  cancelDemand: (id: number) => Promise<void>;
  approveDemand: (id: number, payload: ApproveDemandPayload) => Promise<void>;
  rejectDemand: (id: number, payload: RejectDemandPayload) => Promise<void>;
  bulkApproveDemands: (payload: BulkApproveDemandPayload) => Promise<number>;
  bulkRejectDemands: (payload: BulkRejectDemandPayload) => Promise<number>;
}

export function useDemands(
  filters: DemandFilterParams,
  pagination: PaginationParams
): UseDemandsResult {
  const { demandsRefreshTrigger, triggerRefreshDemands } = useRefresh();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [totalApprovedValue, setTotalApprovedValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const params = { ...filters, ...pagination };
        const { data, meta } = await fetchDemands(params, controller.signal);

        setDemands(data);
        setTotal(meta.total);
        setTotalPending(meta.totalPending ?? 0);
        setTotalPages(meta.totalPages);
        setTotalValue(meta.totalValue ?? 0);
        setTotalApprovedValue(meta.totalApprovedValue ?? 0);
      } catch (err: any) {
        if (err.name !== 'CanceledError' && err.message !== 'canceled') {
          setError(err.message ?? 'Failed to load demands');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { controller.abort(); };
  }, [JSON.stringify(filters), pagination.page, pagination.limit, pagination.sortBy, pagination.sortDir, demandsRefreshTrigger]);

  const createDemand = useCallback(async (payload: CreateDemandPayload) => {
    await apiCreateDemand(payload);
    triggerRefreshDemands();
  }, [triggerRefreshDemands]);

  const updateDemand = useCallback(async (id: number, payload: UpdateDemandPayload) => {
    await apiUpdateDemand(id, payload);
    triggerRefreshDemands();
  }, [triggerRefreshDemands]);

  const deleteDemand = useCallback(async (id: number) => {
    await apiDeleteDemand(id);
    triggerRefreshDemands();
  }, [triggerRefreshDemands]);

  const cancelDemand = useCallback(async (id: number) => {
    await apiCancelDemand(id);
    triggerRefreshDemands();
  }, [triggerRefreshDemands]);

  const approveDemand = useCallback(async (id: number, payload: ApproveDemandPayload) => {
    await apiApproveDemand(id, payload);
    triggerRefreshDemands();
  }, [triggerRefreshDemands]);

  const rejectDemand = useCallback(async (id: number, payload: RejectDemandPayload) => {
    await apiRejectDemand(id, payload);
    triggerRefreshDemands();
  }, [triggerRefreshDemands]);

  const bulkApproveDemands = useCallback(async (payload: BulkApproveDemandPayload): Promise<number> => {
    const result = await apiBulkApprove(payload);
    triggerRefreshDemands();
    return result.count;
  }, [triggerRefreshDemands]);

  const bulkRejectDemands = useCallback(async (payload: BulkRejectDemandPayload): Promise<number> => {
    const result = await apiBulkReject(payload);
    triggerRefreshDemands();
    return result.count;
  }, [triggerRefreshDemands]);

  return { demands, isLoading, error, total, totalPending, totalPages, totalValue, totalApprovedValue, createDemand, updateDemand, deleteDemand, cancelDemand, approveDemand, rejectDemand, bulkApproveDemands, bulkRejectDemands };
}
