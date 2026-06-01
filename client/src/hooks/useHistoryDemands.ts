import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDemandHistory } from '../api/apiService';
import type { Demand } from '../types/domain';

const PAGE_SIZE = 20;

export function useHistoryDemands(filters?: { centerName?: string }) {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const stateRef = useRef({ page: 0, fetching: false });
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fetchPage = useCallback(async (pageNum: number) => {
    if (stateRef.current.fetching) return;
    stateRef.current.fetching = true;
    const isFresh = pageNum === 1;
    if (isFresh) setIsLoading(true);
    else setIsFetchingMore(true);
    try {
      const result = await fetchDemandHistory({
        page: pageNum,
        limit: PAGE_SIZE,
        centerName: filters?.centerName,
      });
      setDemands(prev => isFresh ? result.data : [...prev, ...result.data]);
      setHasMore(result.meta.page < result.meta.totalPages);
      stateRef.current.page = pageNum;
    } finally {
      stateRef.current.fetching = false;
      if (isFresh) setIsLoading(false);
      else setIsFetchingMore(false);
    }
  }, [filters?.centerName]);

  useEffect(() => {
    stateRef.current = { page: 0, fetching: false };
    setDemands([]);
    setHasMore(true);
    fetchPage(1);
  }, [fetchPage]);

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !stateRef.current.fetching) {
          fetchPage(stateRef.current.page + 1);
        }
      },
      { threshold: 0.1 }
    );
    observerRef.current.observe(node);
  }, [fetchPage]);

  useEffect(() => {
    return () => { observerRef.current?.disconnect(); };
  }, []);

  return { demands, isLoading, isFetchingMore, hasMore, sentinelRef };
}
