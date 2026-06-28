import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_CHUNK = 20;

export function useClientInfiniteScroll<T>(
  items: T[],
  chunkSize: number = DEFAULT_CHUNK,
  root?: Element | null,
) {
  const [displayCount, setDisplayCount] = useState(chunkSize);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset when source items change (filter/sort changed)
  useEffect(() => {
    setDisplayCount(chunkSize);
  }, [items, chunkSize]);

  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDisplayCount((prev) => prev + chunkSize);
        }
      },
      { threshold: 0.1, root: root ?? null }
    );
    observerRef.current.observe(node);
  }, [chunkSize, root]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { observerRef.current?.disconnect(); };
  }, []);

  return {
    displayedItems: items.slice(0, displayCount),
    sentinelRef,
    hasMore: displayCount < items.length,
    total: items.length,
  };
}
