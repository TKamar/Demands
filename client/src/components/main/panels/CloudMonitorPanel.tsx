import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { isModeratorOrAdmin } from '../../../utils/roleUtils';
import { getCloudMonitor, updateCloudMonitorStatus } from '../../../api/apiService';
import type { CloudMonitorData, CloudResourceStatusEntry, CloudStatus, CloudTag } from '../../../types/domain';

const SERVICES = ['ECK', 'VM', 'OCP', 'Mongo', 'NiFi', 'Redis', 'Kafka', 'Harbor'] as const;
const STATUS_RANK: Record<string, number> = { red: 2, yellow: 1, green: 0 };

function worstOf(statuses: string[]): string {
  return statuses.reduce(
    (worst, s) => (STATUS_RANK[s] ?? 0) > (STATUS_RANK[worst] ?? 0) ? s : worst,
    'green'
  );
}

function siteWorstSvc(data: CloudMonitorData, site: string, svc: string): string {
  return worstOf(
    Object.values(data[site]?.networks ?? {}).flatMap((net) =>
      Object.values(net.clusters).map((cl) => cl[svc]?.status ?? 'green')
    )
  );
}

function netWorstSvc(data: CloudMonitorData, site: string, net: string, svc: string): string {
  return worstOf(
    Object.values(data[site]?.networks[net]?.clusters ?? {}).map((cl) => cl[svc]?.status ?? 'green')
  );
}

function chipClasses(status: string): string {
  switch (status) {
    case 'red':    return 'bg-red-500/10 text-red-600 border border-red-500/25';
    case 'yellow': return 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/25';
    default:       return 'bg-green-500/10 text-green-600 border border-green-500/25';
  }
}

function dotClass(status: string): string {
  switch (status) {
    case 'red':    return 'bg-red-500';
    case 'yellow': return 'bg-yellow-500';
    default:       return 'bg-green-500';
  }
}

function StatBadges({ statuses }: { statuses: string[] }) {
  const g = statuses.filter((s) => s === 'green').length;
  const y = statuses.filter((s) => s === 'yellow').length;
  const r = statuses.filter((s) => s === 'red').length;
  return (
    <span className="flex gap-1 text-xs ms-auto shrink-0">
      {g > 0 && <span className="px-1.5 py-0.5 rounded bg-green-500/10  text-green-600">{g}</span>}
      {y > 0 && <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600">{y}</span>}
      {r > 0 && <span className="px-1.5 py-0.5 rounded bg-red-500/10    text-red-600">{r}</span>}
    </span>
  );
}

interface ChipProps {
  svc:      string;
  status:   string;
  entry?:   CloudResourceStatusEntry;
  editMode: boolean;
  onEdit?:  (entry: CloudResourceStatusEntry, anchor: HTMLElement) => void;
}

function StatusChip({ svc, status, entry, editMode, onEdit }: ChipProps) {
  const cls = `inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${chipClasses(status)}`;
  if (editMode && entry && onEdit) {
    return (
      <button className={`${cls} cursor-pointer hover:opacity-75 transition-opacity`}
        onClick={(e) => onEdit(entry, e.currentTarget)}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass(status)}`} />
        {svc}
      </button>
    );
  }
  return (
    <span className={cls}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass(status)}`} />
      {svc}
    </span>
  );
}

interface ViewProps {
  data:     CloudMonitorData;
  editMode: boolean;
  onEdit:   (entry: CloudResourceStatusEntry, anchor: HTMLElement) => void;
  t:        (key: string) => string;
}

function CustomerView({ data, editMode, onEdit, t }: ViewProps) {
  if (Object.keys(data).length === 0) {
    return <div className="flex items-center justify-center p-12 text-text-secondary text-sm">{t('cloudMonitor.noData')}</div>;
  }
  return (
    <div className="overflow-x-auto" dir="rtl">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-bg-paper border-b border-divider">
            <th className="px-4 py-2 text-right text-text-secondary font-medium min-w-[160px] sticky right-0 bg-bg-paper z-10">
              {t('cloudMonitor.siteNetworkCluster')}
            </th>
            {SERVICES.map((svc) => (
              <th key={svc} className="px-3 py-2 text-center text-text-secondary font-medium whitespace-nowrap">
                {svc}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(data).map(([site, siteData]) => (
            <React.Fragment key={site}>
              <tr className="bg-bg-paper/40 border-b border-divider">
                <td className="px-4 py-2 font-semibold text-text-primary sticky right-0 bg-bg-paper/40">{site}</td>
                {SERVICES.map((svc) => {
                  const s = siteWorstSvc(data, site, svc);
                  return (
                    <td key={svc} className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center justify-center w-3 h-3 rounded-full ${dotClass(s)}`} />
                    </td>
                  );
                })}
              </tr>
              {Object.entries(siteData.networks).map(([net, netData]) => (
                <React.Fragment key={net}>
                  <tr className="border-b border-divider/50">
                    <td className="px-6 py-1.5 text-text-secondary sticky right-0 bg-bg-default">↳ {net}</td>
                    {SERVICES.map((svc) => {
                      const s = netWorstSvc(data, site, net, svc);
                      return (
                        <td key={svc} className="px-3 py-1.5 text-center">
                          <span className={`inline-flex items-center justify-center w-2.5 h-2.5 rounded-full ${dotClass(s)}`} />
                        </td>
                      );
                    })}
                  </tr>
                  {Object.entries(netData.clusters).map(([cluster, clData]) => (
                    <tr key={cluster} className="border-b border-divider/20 hover:bg-bg-paper/20">
                      <td className="px-8 py-1.5 text-text-secondary text-xs sticky right-0 bg-bg-default">{cluster}</td>
                      {SERVICES.map((svc) => {
                        const entry = clData[svc];
                        return (
                          <td key={svc} className="px-3 py-1.5 text-center">
                            {entry ? (
                              <StatusChip svc={svc} status={entry.status} entry={entry}
                                editMode={editMode} onEdit={onEdit} />
                            ) : (
                              <span className="text-text-secondary text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OpsTree({ data, editMode, onEdit, t }: ViewProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (key: string) => open[key] !== false;
  const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !isOpen(key) }));

  if (Object.keys(data).length === 0) {
    return <div className="flex items-center justify-center p-12 text-text-secondary text-sm">{t('cloudMonitor.noData')}</div>;
  }

  return (
    <div className="space-y-2 p-4" dir="rtl">
      {Object.entries(data).map(([site, siteData]) => {
        const siteKey = `s:${site}`;
        const siteStatuses = Object.values(siteData.networks).flatMap((n) =>
          Object.values(n.clusters).flatMap((c) => Object.values(c).map((e) => e.status))
        );
        return (
          <div key={site} className="rounded-xl border border-divider overflow-hidden">
            <button className="w-full flex items-center gap-2 px-4 py-3 bg-bg-paper hover:bg-bg-paper/70 text-right"
              onClick={() => toggle(siteKey)}>
              <span className={`text-text-secondary text-xs transition-transform duration-150 ${isOpen(siteKey) ? 'rotate-90' : ''}`}>▶</span>
              <span className="font-semibold text-text-primary flex-1 text-right">{site}</span>
              <StatBadges statuses={siteStatuses} />
            </button>
            {isOpen(siteKey) && Object.entries(siteData.networks).map(([net, netData]) => {
              const netKey = `n:${site}:${net}`;
              const netStatuses = Object.values(netData.clusters).flatMap((c) =>
                Object.values(c).map((e) => e.status)
              );
              return (
                <div key={net} className="border-t border-divider/50">
                  <button className="w-full flex items-center gap-2 px-6 py-2 bg-bg-default hover:bg-bg-default/70 text-right"
                    onClick={() => toggle(netKey)}>
                    <span className={`text-text-secondary text-xs transition-transform duration-150 ${isOpen(netKey) ? 'rotate-90' : ''}`}>▶</span>
                    <span className="text-text-primary flex-1 text-right">{net}</span>
                    <StatBadges statuses={netStatuses} />
                  </button>
                  {isOpen(netKey) && Object.entries(netData.clusters).map(([cluster, clData]) => {
                    const clKey = `c:${site}:${net}:${cluster}`;
                    const clStatuses = Object.values(clData).map((e) => e.status);
                    return (
                      <div key={cluster} className="border-t border-divider/30">
                        <button className="w-full flex items-center gap-2 px-8 py-1.5 bg-bg-paper/20 hover:bg-bg-paper/40 text-right"
                          onClick={() => toggle(clKey)}>
                          <span className={`text-text-secondary text-xs transition-transform duration-150 ${isOpen(clKey) ? 'rotate-90' : ''}`}>▶</span>
                          <span className="text-text-secondary text-sm flex-1 text-right">{cluster}</span>
                          <StatBadges statuses={clStatuses} />
                        </button>
                        {isOpen(clKey) && (
                          <div className="px-10 py-2.5 flex flex-wrap gap-2 border-t border-divider/20 bg-bg-paper/10">
                            {SERVICES.map((svc) => {
                              const entry = clData[svc];
                              return entry ? (
                                <StatusChip key={svc} svc={svc} status={entry.status}
                                  entry={entry} editMode={editMode} onEdit={onEdit} />
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

interface PopoverState {
  entry:  CloudResourceStatusEntry;
  anchor: HTMLElement;
}

interface EditPopoverProps {
  popover: PopoverState;
  onSave:  (id: number, data: { status: string; reason: string; tag: string }) => Promise<void>;
  onClose: () => void;
  t:       (key: string) => string;
}

function EditPopover({ popover, onSave, onClose, t }: EditPopoverProps) {
  const [status, setStatus] = useState<CloudStatus>(popover.entry.status);
  const [reason, setReason] = useState(popover.entry.reason);
  const [tag,    setTag]    = useState<CloudTag>(popover.entry.tag);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const rect = popover.anchor.getBoundingClientRect();
  const style: React.CSSProperties = {
    position: 'fixed',
    top:  rect.bottom + 6,
    left: Math.max(8, rect.left - 100),
    zIndex: 50,
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && e.target !== popover.anchor)
        onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose, popover.anchor]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(popover.entry.id, { status, reason, tag });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} style={style}
      className="bg-bg-paper border border-divider rounded-xl shadow-xl p-4 w-60 space-y-3" dir="rtl">
      <p className="text-xs font-semibold text-text-primary">{t('cloudMonitor.editStatus')}</p>
      <div className="space-y-1">
        <label className="text-xs text-text-secondary">{t('filters.status')}</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as CloudStatus)}
          className="w-full rounded-lg border border-divider bg-bg-default text-text-primary text-sm px-2 py-1.5">
          <option value="green">{t('cloudMonitor.available')}</option>
          <option value="yellow">{t('cloudMonitor.limited')}</option>
          <option value="red">{t('cloudMonitor.unavailable')}</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-text-secondary">{t('cloudMonitor.reason')}</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder={t('cloudMonitor.reasonPlaceholder')}
          className="w-full rounded-lg border border-divider bg-bg-default text-text-primary text-sm px-2 py-1.5" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-text-secondary">{t('cloudMonitor.tag')}</label>
        <select value={tag} onChange={(e) => setTag(e.target.value as CloudTag)}
          className="w-full rounded-lg border border-divider bg-bg-default text-text-primary text-sm px-2 py-1.5">
          <option value="OK">{t('cloudMonitor.tagOk')}</option>
          <option value="CAPACITY">{t('cloudMonitor.tagCapacity')}</option>
          <option value="CLIENT_PROCESS">{t('cloudMonitor.tagClientProcess')}</option>
          <option value="MAINTENANCE">{t('cloudMonitor.tagMaintenance')}</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saving ? '...' : t('common.save')}
        </button>
        <button onClick={onClose}
          className="flex-1 py-1.5 text-sm border border-divider text-text-secondary rounded-lg hover:bg-bg-default transition-colors">
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

export default function CloudMonitorPanel() {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const canEdit = isModeratorOrAdmin(currentUser?.role ?? 'REGULAR_USER');

  const [data,     setData]     = useState<CloudMonitorData>({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [view,     setView]     = useState<'customer' | 'ops'>('customer');
  const [editMode, setEditMode] = useState(false);
  const [popover,  setPopover]  = useState<PopoverState | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const result = await getCloudMonitor();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch cloud monitor data', err);
      setError(t('cloudMonitor.loadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEdit = (entry: CloudResourceStatusEntry, anchor: HTMLElement) => {
    setPopover({ entry, anchor });
  };

  const handleSave = async (id: number, updates: { status: string; reason: string; tag: string }) => {
    await updateCloudMonitorStatus(id, updates);
    await fetchData();
  };

  const handleToggleEdit = () => {
    setEditMode((e) => !e);
    setPopover(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary text-sm">
        {t('cloudMonitor.loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={fetchData}
            className="px-3 py-1.5 text-xs border border-divider rounded-lg text-text-secondary hover:bg-bg-paper">
            {t('cloudMonitor.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-divider bg-bg-paper shrink-0" dir="rtl">
        <h2 className="text-sm font-semibold text-text-primary">זמינות משאבים</h2>
        <div className="flex items-center gap-2 ms-auto">
          <div className="flex rounded-lg border border-divider overflow-hidden text-xs">
            {(['customer', 'ops'] as const).map((v) => (
              <button key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 transition-colors ${
                  view === v
                    ? 'bg-primary text-white'
                    : 'bg-bg-default text-text-secondary hover:bg-bg-paper'
                }`}>
                {v === 'customer' ? t('cloudMonitor.customerView') : t('cloudMonitor.opsView')}
              </button>
            ))}
          </div>
          {canEdit && (
            <button onClick={handleToggleEdit}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                editMode
                  ? 'bg-primary text-white border-primary'
                  : 'bg-bg-default text-text-secondary border-divider hover:bg-bg-paper'
              }`}>
              {editMode ? t('cloudMonitor.exitEdit') : t('cloudMonitor.editData')}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {view === 'customer' ? (
          <CustomerView data={data} editMode={editMode} onEdit={handleEdit} t={t} />
        ) : (
          <OpsTree data={data} editMode={editMode} onEdit={handleEdit} t={t} />
        )}
      </div>

      {popover && (
        <EditPopover
          popover={popover}
          onSave={handleSave}
          onClose={() => setPopover(null)}
          t={t}
        />
      )}
    </div>
  );
}
