import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import Select from '../common/Select';
import { useToast } from '../common/Toast';
import { useReferenceData } from '../../hooks/useReferenceData';
import { fetchDemands } from '../../api/apiService';
import type { Project, Demand, ProjectType, Median } from '../../types/domain';
import type { DuplicateProjectPayload, Priority } from '../../api/types';

interface DuplicateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceProject: Project;
  onSubmit: (sourceName: string, payload: DuplicateProjectPayload) => Promise<void>;
}

const inputClass =
  'w-full px-4 py-2.5 border border-divider rounded-xl text-sm bg-bg-paper text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors';

function getNextHalf(median: 'H1' | 'H2', year: number): { median: 'H1' | 'H2'; year: number } {
  return median === 'H1' ? { median: 'H2', year } : { median: 'H1', year: year + 1 };
}

const APPROVED_STATUSES = new Set(['Approved', 'PartiallyApproved', 'ApprovedWithCondition']);

export default function DuplicateProjectModal({
  isOpen,
  onClose,
  sourceProject,
  onSubmit,
}: DuplicateProjectModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const referenceData = useReferenceData();

  const [demands, setDemands] = useState<Demand[]>([]);
  const [isLoadingDemands, setIsLoadingDemands] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [demandValues, setDemandValues] = useState<Record<number, string>>({});

  const [form, setForm] = useState(buildInitialForm(sourceProject));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildInitialForm(p: Project) {
    const isSemiannual = p.type === 'Semiannual' && p.median && p.year;
    const next = isSemiannual ? getNextHalf(p.median as 'H1' | 'H2', p.year!) : null;
    const suggestedName = next
      ? `${p.name} - ${next.median} ${next.year}`
      : `${p.name} - copy`;

    return {
      name: suggestedName,
      trackOrApp: p.relatedTo || '',
      center: p.centerName || '',
      branch: p.branchName || '',
      section: p.sectionName || '',
      requestType: p.type,
      priority: p.priority || '',
      projectKind: p.kind || '',
      network: p.location.network,
      base: p.location.base,
      environment: p.location.environment,
      cluster: p.location.cluster,
      purpose: p.purpose,
      median: next ? next.median : p.median || '',
      year: next ? String(next.year) : p.year ? String(p.year) : '',
      emergencyOption: p.emergencyOption || '',
    };
  }

  useEffect(() => {
    if (!isOpen) return;

    setForm(buildInitialForm(sourceProject));
    setError(null);
    setIsSubmitting(false);

    setIsLoadingDemands(true);
    fetchDemands({ projectName: sourceProject.name, page: 1, limit: 1000 })
      .then(({ data }) => {
        setDemands(data);

        const approvedIds = new Set(
          data.filter((d) => APPROVED_STATUSES.has(d.status)).map((d) => d.id)
        );
        setSelectedIds(approvedIds);

        const values: Record<number, string> = {};
        data.forEach((d) => {
          const isApproved = APPROVED_STATUSES.has(d.status);
          values[d.id] = String(isApproved ? (d.approvedValue ?? d.value) : d.value);
        });
        setDemandValues(values);
      })
      .catch(() => {
        showToast(t('projects.duplicateProject.failedToLoadDemands'), 'error');
      })
      .finally(() => setIsLoadingDemands(false));
  }, [isOpen, sourceProject.name]);

  const networkOptions = referenceData.networks
    .filter((v) => v.isActive !== false || v.name === form.network)
    .map((v) => ({ value: v.name, label: v.displayName || v.name }));

  const baseOptions = useMemo(() => {
    if (!form.network) return [];
    const names = new Set(
      referenceData.locations.filter((l) => l.networkName === form.network).map((l) => l.baseName)
    );
    return referenceData.bases
      .filter((b) => names.has(b.name) && (b.isActive !== false || b.name === form.base))
      .map((v) => ({ value: v.name, label: v.displayName || v.name }));
  }, [referenceData.locations, referenceData.bases, form.network, form.base]);

  const environmentOptions = useMemo(() => {
    if (!form.network || !form.base) return [];
    const names = new Set(
      referenceData.locations
        .filter((l) => l.networkName === form.network && l.baseName === form.base)
        .map((l) => l.environmentName)
    );
    return referenceData.environments
      .filter((e) => names.has(e.name) && (e.isActive !== false || e.name === form.environment))
      .map((v) => ({ value: v.name, label: v.displayName || v.name }));
  }, [referenceData.locations, referenceData.environments, form.network, form.base, form.environment]);

  const clusterOptions = useMemo(() => {
    if (!form.network || !form.base || !form.environment) return [];
    const names = new Set(
      referenceData.locations
        .filter(
          (l) =>
            l.networkName === form.network &&
            l.baseName === form.base &&
            l.environmentName === form.environment
        )
        .map((l) => l.clusterName)
    );
    return referenceData.clusters
      .filter((c) => names.has(c.name) && (c.isActive !== false || c.name === form.cluster))
      .map((v) => ({ value: v.name, label: v.displayName || v.name }));
  }, [referenceData.locations, referenceData.clusters, form.network, form.base, form.environment, form.cluster]);

  const centerOptions = referenceData.centers
    .filter((v) => v.isActive !== false || v.name === form.center)
    .map((v) => ({ value: v.name, label: v.displayName || v.name }));

  const branchOptions = useMemo(() => {
    if (!form.center) return [];
    return referenceData.branches
      .filter((b) => b.centerName === form.center && (b.isActive !== false || b.name === form.branch))
      .map((v) => ({ value: v.name, label: v.displayName || v.name }));
  }, [referenceData.branches, form.center, form.branch]);

  const sectionOptions = useMemo(() => {
    if (!form.branch) return [];
    return referenceData.sections
      .filter(
        (s) =>
          s.branchName === form.branch &&
          s.branchCenter === form.center &&
          (s.isActive !== false || s.name === form.section)
      )
      .map((v) => ({ value: v.name, label: v.displayName || v.name }));
  }, [referenceData.sections, form.branch, form.center, form.section]);

  const requestTypeOptions = (['Semiannual', 'Emergency'] as ProjectType[]).map((v) => ({
    value: v,
    label: t(`projects.type.${v}`),
  }));

  const priorityOptions = (['P1', 'P2', 'P3'] as Priority[]).map((p) => ({
    value: p,
    label: t(`projects.createProject.priorityOptions.${p}`),
  }));

  const projectKindOptions = referenceData.projectKinds
    .filter((v) => v.isActive !== false || v.name === form.projectKind)
    .map((v) => ({ value: v.name, label: v.displayName || v.name }));

  const medianOptions = (['H1', 'H2'] as Median[]).map((m) => ({ value: m, label: m }));

  const emergencyOptionOptions = referenceData.emergencyOptions
    .filter((v) => v.isActive !== false || v.name === form.emergencyOption)
    .map((v) => ({ value: v.name, label: v.name }));

  function setField(name: keyof ReturnType<typeof buildInitialForm>, value: string) {
    setForm((prev) => {
      const updates: any = { [name]: value };
      if (name === 'center') { updates.branch = ''; updates.section = ''; }
      else if (name === 'branch') { updates.section = ''; }
      else if (name === 'network') { updates.base = ''; updates.environment = ''; updates.cluster = ''; }
      else if (name === 'base') { updates.environment = ''; updates.cluster = ''; }
      else if (name === 'environment') { updates.cluster = ''; }
      return { ...prev, ...updates };
    });
  }

  function toggleDemand(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function setDemandValue(id: number, value: string) {
    setDemandValues((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const location = referenceData.locations.find(
      (l) =>
        l.baseName === form.base &&
        l.environmentName === form.environment &&
        l.networkName === form.network &&
        l.clusterName === form.cluster
    );
    if (!location) {
      setError('Please select a valid location combination.');
      return;
    }

    const selectedDemands = Array.from(selectedIds).map((id) => ({
      id,
      value: Number(demandValues[id] ?? 0),
    }));

    const payload: DuplicateProjectPayload = {
      name: form.name.trim(),
      purpose: form.purpose.trim(),
      relatedTo: form.trackOrApp.trim() || undefined,
      type: form.requestType as ProjectType,
      kind: form.projectKind as any,
      locationId: location.id,
      centerName: form.center,
      branchName: form.branch,
      sectionName: form.section,
      priority: (form.priority as Priority) || undefined,
      demands: selectedDemands,
    };

    if (form.requestType === 'Semiannual') {
      if (form.year) payload.year = Number(form.year);
      if (form.median) payload.median = form.median as Median;
    }
    if (form.requestType === 'Emergency' && form.emergencyOption) {
      payload.emergencyOption = form.emergencyOption;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(sourceProject.name, payload);
      showToast(t('projects.duplicateSuccess'), 'success');
      handleClose();
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || t('common.errors.unknown');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (isSubmitting) return;
    setDemands([]);
    setSelectedIds(new Set());
    setDemandValues({});
    setError(null);
    onClose();
  }

  const placeholder = t('projects.createProject.selectOption');
  const isSemiannual = form.requestType === 'Semiannual';
  const isEmergency = form.requestType === 'Emergency';

  const approvedDemands = demands.filter((d) => APPROVED_STATUSES.has(d.status));
  const optionalDemands = demands.filter((d) => !APPROVED_STATUSES.has(d.status));

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('projects.duplicateProject.title')}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.name')} <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder={t('projects.createProject.namePlaceholder')}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.trackOrApp')}
            </label>
            <input
              type="text"
              value={form.trackOrApp}
              onChange={(e) => setField('trackOrApp', e.target.value)}
              placeholder={t('projects.createProject.trackOrAppPlaceholder')}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.center')} <span className="text-danger">*</span>
            </label>
            <Select options={centerOptions} value={form.center} onChange={(v) => setField('center', v)} placeholder={placeholder} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.branch')} <span className="text-danger">*</span>
            </label>
            <Select options={branchOptions} value={form.branch} onChange={(v) => setField('branch', v)} placeholder={placeholder} disabled={!form.center} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.section')} <span className="text-danger">*</span>
            </label>
            <Select options={sectionOptions} value={form.section} onChange={(v) => setField('section', v)} placeholder={placeholder} disabled={!form.branch} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.requestType')} <span className="text-danger">*</span>
            </label>
            <Select options={requestTypeOptions} value={form.requestType} onChange={(v) => setField('requestType', v)} placeholder={placeholder} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.priority')} <span className="text-danger">*</span>
            </label>
            <Select options={priorityOptions} value={form.priority} onChange={(v) => setField('priority', v)} placeholder={placeholder} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.projectType')}
            </label>
            <Select options={projectKindOptions} value={form.projectKind} onChange={(v) => setField('projectKind', v)} placeholder={placeholder} />
          </div>

          {isSemiannual && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  {t('projects.createProject.year')} <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) => setField('year', e.target.value)}
                  placeholder="202X"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  {t('projects.createProject.median')} <span className="text-danger">*</span>
                </label>
                <Select options={medianOptions} value={form.median} onChange={(v) => setField('median', v)} placeholder={placeholder} />
              </div>
            </>
          )}

          {isEmergency && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                {t('projects.createProject.emergencyOption')} <span className="text-danger">*</span>
              </label>
              <Select options={emergencyOptionOptions} value={form.emergencyOption} onChange={(v) => setField('emergencyOption', v)} placeholder={placeholder} />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.network')} <span className="text-danger">*</span>
            </label>
            <Select options={networkOptions} value={form.network} onChange={(v) => setField('network', v)} placeholder={placeholder} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.base')} <span className="text-danger">*</span>
            </label>
            <Select options={baseOptions} value={form.base} onChange={(v) => setField('base', v)} placeholder={placeholder} disabled={!form.network} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.environment')} <span className="text-danger">*</span>
            </label>
            <Select options={environmentOptions} value={form.environment} onChange={(v) => setField('environment', v)} placeholder={placeholder} disabled={!form.base} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.cluster')} <span className="text-danger">*</span>
            </label>
            <Select options={clusterOptions} value={form.cluster} onChange={(v) => setField('cluster', v)} placeholder={placeholder} disabled={!form.environment} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.purpose')}
            </label>
            <textarea
              value={form.purpose}
              onChange={(e) => setField('purpose', e.target.value)}
              placeholder={t('projects.createProject.purposePlaceholder')}
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-divider">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            {t('projects.duplicateProject.demandsTitle')}
          </h3>

          {isLoadingDemands ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : demands.length === 0 ? (
            <p className="text-sm text-text-secondary py-4 text-center">
              {t('projects.duplicateProject.noDemands')}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-divider">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-divider bg-bg-default">
                    <th className="px-3 py-2 text-start font-semibold text-text-secondary w-8"></th>
                    <th className="px-3 py-2 text-start font-semibold text-text-secondary">{t('demands.columns.service')}</th>
                    <th className="px-3 py-2 text-start font-semibold text-text-secondary">{t('demands.columns.resource')}</th>
                    <th className="px-3 py-2 text-start font-semibold text-text-secondary">{t('demands.columns.location')}</th>
                    <th className="px-3 py-2 text-start font-semibold text-text-secondary">{t('demands.columns.type')}</th>
                    <th className="px-3 py-2 text-start font-semibold text-text-secondary">{t('demands.columns.status')}</th>
                    <th className="px-3 py-2 text-start font-semibold text-text-secondary">{t('demands.columns.value')}</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedDemands.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={7} className="px-3 py-1.5 text-xs font-semibold text-text-secondary bg-gray-50">
                          {t('projects.duplicateProject.approvedDemands')}
                        </td>
                      </tr>
                      {approvedDemands.map((d) => (
                        <DemandRow
                          key={d.id}
                          demand={d}
                          checked={selectedIds.has(d.id)}
                          value={demandValues[d.id] ?? ''}
                          onToggle={() => toggleDemand(d.id)}
                          onValueChange={(v) => setDemandValue(d.id, v)}
                        />
                      ))}
                    </>
                  )}
                  {optionalDemands.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={7} className="px-3 py-1.5 text-xs font-semibold text-text-secondary bg-gray-50">
                          {t('projects.duplicateProject.optionalDemands')}
                        </td>
                      </tr>
                      {optionalDemands.map((d) => (
                        <DemandRow
                          key={d.id}
                          demand={d}
                          checked={selectedIds.has(d.id)}
                          value={demandValues[d.id] ?? ''}
                          onToggle={() => toggleDemand(d.id)}
                          onValueChange={(v) => setDemandValue(d.id, v)}
                        />
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-text-primary text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('common.submitting') : t('projects.duplicateProject.submit')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface DemandRowProps {
  demand: Demand;
  checked: boolean;
  value: string;
  onToggle: () => void;
  onValueChange: (v: string) => void;
}

function DemandRow({ demand, checked, value, onToggle, onValueChange }: DemandRowProps) {
  const location = [demand.location.base, demand.location.environment, demand.location.network]
    .filter(Boolean)
    .join(' / ');

  return (
    <tr className={`border-b border-divider last:border-b-0 ${checked ? '' : 'opacity-50'}`}>
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="w-4 h-4 accent-primary cursor-pointer"
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">{demand.serviceName}</td>
      <td className="px-3 py-2 whitespace-nowrap">{demand.resourceName}</td>
      <td className="px-3 py-2 whitespace-nowrap text-text-secondary">{location}</td>
      <td className="px-3 py-2 whitespace-nowrap">{demand.type}</td>
      <td className="px-3 py-2 whitespace-nowrap">
        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs">{demand.status}</span>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={!checked}
          className="w-24 px-2 py-1 border border-divider rounded-lg text-xs bg-bg-paper focus:outline-none focus:border-primary disabled:bg-gray-50 disabled:text-text-secondary"
        />
      </td>
    </tr>
  );
}
