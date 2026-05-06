// client/src/components/main/ResourceSummaryStrip.tsx
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';
import { fetchCapacities, fetchWallets } from '../../api/apiService';
import type { Capacity, Wallet } from '../../api/types';

interface ResourceSummaryStripProps {
  selectedCenters: string[];
  open: boolean;
  onToggle: () => void;
}

interface ResourceSummary {
  resourceKey: string;
  resourceName: string;
  unit: string;
  total: number;
  allocated: number;
  remaining: number;
}

export default function ResourceSummaryStrip({ selectedCenters, open, onToggle }: ResourceSummaryStripProps) {
  const { t } = useTranslation();
  const [capacities, setCapacities] = useState<Capacity[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  useEffect(() => {
    fetchCapacities().then(setCapacities).catch(console.error);
    fetchWallets().then(setWallets).catch(console.error);
  }, []);

  const summaries = useMemo((): ResourceSummary[] => {
    const allCentersSelected = selectedCenters.length === 0;

    if (allCentersSelected) {
      // Global totals from capacities
      const byResource = new Map<string, ResourceSummary>();
      for (const cap of capacities) {
        const key = `${cap.resourceService}/${cap.resourceName}`;
        const existing = byResource.get(key);
        if (existing) {
          existing.total += cap.value;
          existing.allocated += cap.allocated;
          existing.remaining += cap.available;
        } else {
          byResource.set(key, {
            resourceKey: key,
            resourceName: cap.resourceName,
            unit: '',
            total: cap.value,
            allocated: cap.allocated,
            remaining: cap.available,
          });
        }
      }
      return Array.from(byResource.values());
    }

    // Center-specific: use wallet allocations
    const relevantWallets = wallets.filter((w) => selectedCenters.includes(w.centerName));
    const byResource = new Map<string, ResourceSummary>();
    const capacityById = new Map(capacities.map((c) => [c.id, c]));
    // NOTE: cap.allocated is the total across all centers sharing this capacity.
    // Per-wallet demand consumption is not available from the current API.
    // These figures are approximate when a capacity is shared across multiple centers.
    for (const wallet of relevantWallets) {
      const cap = capacityById.get(wallet.capacityId);
      if (!cap) continue;
      const key = `${cap.resourceService}/${cap.resourceName}`;
      const existing = byResource.get(key);
      if (existing) {
        existing.total += wallet.value;
        existing.allocated += cap.allocated;
        existing.remaining += Math.max(0, wallet.value - cap.allocated);
      } else {
        byResource.set(key, {
          resourceKey: key,
          resourceName: cap.resourceName,
          unit: '',
          total: wallet.value,
          allocated: cap.allocated,
          remaining: Math.max(0, wallet.value - cap.allocated),
        });
      }
    }
    return Array.from(byResource.values());
  }, [capacities, wallets, selectedCenters]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer p-0"
        title={open ? t('resourceSummary.collapse', 'Collapse') : t('resourceSummary.expand', 'Expand resources')}
      >
        {open ? <MdExpandLess size={16} /> : <MdExpandMore size={16} />}
        <span>{t('resourceSummary.label', 'Resources')}</span>
      </button>

      {open && summaries.map((s) => (
        <div
          key={s.resourceKey}
          className="flex items-center gap-1.5 px-3 py-1 bg-bg-paper border border-divider rounded-full text-xs whitespace-nowrap"
        >
          <span className="font-semibold text-text-primary">{s.resourceName}</span>
          <span className="text-text-secondary">·</span>
          <span className="text-text-secondary">{s.total.toLocaleString()}</span>
          <span className="text-text-secondary">·</span>
          <span className="text-amber-600 font-medium">{s.allocated.toLocaleString()}</span>
          <span className="text-text-secondary">·</span>
          <span className="text-green-600 font-medium">{s.remaining.toLocaleString()}</span>
        </div>
      ))}

      {open && summaries.length === 0 && (
        <span className="text-xs text-text-secondary italic">
          {t('resourceSummary.empty', 'No capacity data')}
        </span>
      )}
    </div>
  );
}
