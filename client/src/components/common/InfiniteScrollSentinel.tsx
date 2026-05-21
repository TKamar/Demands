interface InfiniteScrollSentinelProps {
  sentinelRef: (node: HTMLDivElement | null) => void;
  isLoading?: boolean;
  hasMore?: boolean;
}

export function InfiniteScrollSentinel({ sentinelRef, isLoading, hasMore }: InfiniteScrollSentinelProps) {
  return (
    <div ref={sentinelRef} className="flex justify-center items-center py-4 min-h-[40px]">
      {isLoading && hasMore && (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
      )}
      {!hasMore && !isLoading && (
        <span className="text-xs text-text-secondary opacity-50">—</span>
      )}
    </div>
  );
}
