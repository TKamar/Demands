import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdDelete, MdLocationOn } from 'react-icons/md';
import Modal from '../common/Modal';
import CreateDemandModal from './CreateDemandModal';
import ConfirmDialog from '../common/ConfirmDialog';
import Select from '../common/Select';
import { useToast } from '../common/Toast';
import { useReferenceData } from '../../hooks/useReferenceData';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { createDemand, fetchDemands, updateDemand as apiUpdateDemand, cancelDemand as apiCancelDemand } from '../../api/apiService';
import type { Project, ProjectType, Median, Demand } from '../../types/domain';
import type { CreateProjectPayload, UpdateProjectPayload, Priority, UpdateDemandPayload } from '../../api/types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateProjectPayload | UpdateProjectPayload, projectName?: string) => Promise<void>;
  editingProject?: Project | null;
}

const TERMINAL_DEMAND_STATUSES = new Set([
  'Approved', 'PartiallyApproved', 'ApprovedWithCondition',
  'Rejected', 'CenterManagerRejected', 'Cancelled',
]);

const initialForm = {
  name: '',
  trackOrApp: '',
  center: '',
  branch: '',
  section: '',
  requestType: '',
  priority: '',
  projectKind: '',
  environment: '',
  network: '',
  base: '',
  cluster: '',
  purpose: '',
  emergencyOption: '',
};

const inputClass =
  'w-full px-4 py-2.5 border border-divider rounded-xl text-sm bg-bg-paper text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors';

export default function CreateProjectModal({
  isOpen,
  onClose,
  onSubmit,
  editingProject,
}: CreateProjectModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const referenceData = useReferenceData();
  const { currentUser } = useCurrentUser();
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit-mode demands section state
  const [projectDemands, setProjectDemands] = useState<Demand[]>([]);
  const [isDemandSectionLoading, setIsDemandSectionLoading] = useState(false);
  const [isAddingDemand, setIsAddingDemand] = useState(false);
  const [editingDemandInProject, setEditingDemandInProject] = useState<Demand | null>(null);
  const [demandToCancel, setDemandToCancel] = useState<Demand | null>(null);

  const refreshControllerRef = useRef<AbortController | null>(null);

  const isEditMode = !!editingProject;

  const refreshProjectDemands = useCallback(async () => {
    if (!editingProject) return;
    refreshControllerRef.current?.abort();
    const controller = new AbortController();
    refreshControllerRef.current = controller;
    setIsDemandSectionLoading(true);
    try {
      const res = await fetchDemands(
        { projectName: editingProject.name, page: 1, limit: 200 },
        controller.signal
      );
      if (!controller.signal.aborted) setProjectDemands(res.data);
    } finally {
      if (!controller.signal.aborted) setIsDemandSectionLoading(false);
    }
  }, [editingProject?.name]);

  const confirmCancelProjectDemand = useCallback(async () => {
    if (!demandToCancel) return;
    const target = demandToCancel;
    setDemandToCancel(null);
    try {
      await apiCancelDemand(target.id);
      await refreshProjectDemands();
      showToast(t('demands.cancelSuccess', 'הדרישה בוטלה'), 'success');
    } catch {
      showToast(t('demands.cancelError', 'שגיאה בביטול'), 'error');
    }
  }, [demandToCancel, refreshProjectDemands, showToast, t]);

  // --- Inline Requirements ---
  interface InlineRequirement {
    serviceName: string;
    resourceName: string;
    value: number;
    type: 'New' | 'Extension';
    overrideLocation: boolean;
    network: string;
    base: string;
    environment: string;
    cluster: string;
    standaloneCluster: string;
  }
  const [inlineRequirements, setInlineRequirements] = useState<InlineRequirement[]>([]);

  const addRequirementRow = () =>
    setInlineRequirements(prev => [
      ...prev,
      { serviceName: '', resourceName: '', value: 0, type: 'New',
        overrideLocation: false, network: '', base: '', environment: '', cluster: '', standaloneCluster: '' },
    ]);
  const removeRequirementRow = (idx: number) =>
    setInlineRequirements(prev => prev.filter((_, i) => i !== idx));
  const updateRequirementRow = (idx: number, field: keyof InlineRequirement, value: string | number | boolean) =>
    setInlineRequirements(prev =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const updated = { ...r, [field]: value };
        if (field === 'serviceName') updated.resourceName = '';
        if (field === 'overrideLocation' && !value) {
          updated.network = '';
          updated.base = '';
          updated.environment = '';
          updated.cluster = '';
        }
        if (field === 'network') { updated.base = ''; updated.environment = ''; updated.cluster = ''; }
        if (field === 'base') { updated.environment = ''; updated.cluster = ''; }
        if (field === 'environment') { updated.cluster = ''; }
        return updated;
      })
    );

  // Populate form when editing
  useEffect(() => {
    if (editingProject && isOpen) {
      setForm({
        name: editingProject.name,
        trackOrApp: editingProject.relatedTo || '',
        center: editingProject.centerName || '',
        branch: editingProject.branchName || '',
        section: editingProject.sectionName || '',
        requestType: editingProject.type,
        priority: editingProject.priority || '',
        projectKind: editingProject.kind || '',
        environment: editingProject.location.environment,
        network: editingProject.location.network,
        base: editingProject.location.base,
        cluster: editingProject.location.cluster,
        purpose: editingProject.purpose,
        median: editingProject.median || '',
        year: editingProject.year || '' as unknown as number,
        emergencyOption: editingProject.emergencyOption || '',
      });
    } else if (!editingProject && isOpen) {
      setForm(initialForm);
    }
  }, [editingProject, isOpen]);

  useEffect(() => {
    if (!isOpen || !isEditMode || !editingProject) {
      setProjectDemands([]);
      return;
    }
    const controller = new AbortController();
    setIsDemandSectionLoading(true);
    fetchDemands({ projectName: editingProject.name, page: 1, limit: 200 }, controller.signal)
      .then(res => { if (!controller.signal.aborted) setProjectDemands(res.data); })
      .finally(() => { if (!controller.signal.aborted) setIsDemandSectionLoading(false); });
    return () => controller.abort();
  }, [isOpen, isEditMode, editingProject?.name]);

  useEffect(() => {
    return () => { refreshControllerRef.current?.abort(); };
  }, []);

  // --- Derived State for Hierarchies ---

  // Organization Hierarchy: Center -> Branch -> Section
  const centerOptions = referenceData.centers
    .filter((v) => v.isActive !== false || v.name === form.center)
    .map((v) => ({
      value: v.name,
      label: v.displayName || v.name,
    }));

  const branchOptions = useMemo(() => {
    if (!form.center) return [];
    return referenceData.branches
      .filter((b) => b.centerName === form.center && (b.isActive !== false || b.name === form.branch))
      .map((v) => ({
        value: v.name,
        label: v.displayName || v.name,
      }));
  }, [referenceData.branches, form.center, form.branch]);

  const sectionOptions = useMemo(() => {
    if (!form.branch) return [];
    // Note: Section also depends on branchCenter, but practically branch names are unique or scoped.
    // Ideally we check both branchName and branchCenter.
    return referenceData.sections
      .filter((s) => s.branchName === form.branch && s.branchCenter === form.center && (s.isActive !== false || s.name === form.section))
      .map((v) => ({
        value: v.name,
        label: v.displayName || v.name,
      }));
  }, [referenceData.sections, form.branch, form.center, form.section]);


  // Location Hierarchy: Network -> Base -> Environment
  const networkOptions = referenceData.networks
    .filter((v) => v.isActive !== false || v.name === form.network)
    .map((v) => ({
      value: v.name,
      label: v.displayName || v.name,
    }));

  const baseOptions = useMemo(() => {
    if (!form.network) return [];
    // Filter available locations by network, then extract unique bases
    const relevantLocations = referenceData.locations.filter(l => l.networkName === form.network);
    const relevantBaseNames = new Set(relevantLocations.map(l => l.baseName));

    return referenceData.bases
      .filter(b => relevantBaseNames.has(b.name) && (b.isActive !== false || b.name === form.base))
      .map((v) => ({
        value: v.name,
        label: v.displayName || v.name,
      }));
  }, [referenceData.locations, referenceData.bases, form.network, form.base]);

  const environmentOptions = useMemo(() => {
    if (!form.network || !form.base) return [];
    // Filter available locations by network and base, then extract unique environments
    const relevantLocations = referenceData.locations.filter(
      l => l.networkName === form.network && l.baseName === form.base
    );
    const relevantEnvNames = new Set(relevantLocations.map(l => l.environmentName));

    return referenceData.environments
      .filter(e => relevantEnvNames.has(e.name) && (e.isActive !== false || e.name === form.environment))
      .map((v) => ({
        value: v.name,
        label: v.displayName || v.name,
      }));
  }, [referenceData.locations, referenceData.environments, form.network, form.base, form.environment]);

  const clusterOptions = useMemo(() => {
    if (!form.network || !form.base || !form.environment) return [];
    // Filter available locations by network, base, and environment, then extract unique clusters
    const relevantLocations = referenceData.locations.filter(
      l => l.networkName === form.network && l.baseName === form.base && l.environmentName === form.environment
    );
    const relevantClusterNames = new Set(relevantLocations.map(l => l.clusterName));

    return referenceData.clusters
      .filter(c => relevantClusterNames.has(c.name) && (c.isActive !== false || c.name === form.cluster))
      .map((v) => ({
        value: v.name,
        label: v.displayName || v.name,
      }));
  }, [referenceData.locations, referenceData.clusters, form.network, form.base, form.environment, form.cluster]);


  // --- Other Options ---

  const requestTypeOptions = (['Semiannual', ...(currentUser?.role === 'ADMIN' ? ['Emergency'] : [])] as ProjectType[]).map(
    (v) => ({ value: v, label: t(`projects.type.${v}`) })
  );

  const priorityOptions = (['P1', 'P2', 'P3'] as Priority[]).map((p) => ({
    value: p,
    label: t(`projects.createProject.priorityOptions.${p}`),
  }));

  const projectKindOptions = referenceData.projectKinds
    .filter((v) => v.isActive !== false || v.name === form.projectKind)
    .map((v) => ({
      value: v.name,
      label: v.displayName || v.name,
    }));

  const medianOptions = (['H1', 'H2'] as Median[]).map((m) => ({
    value: m,
    label: m,
  }));

  const emergencyOptionOptions = referenceData.emergencyOptions
    .filter((v) => v.isActive !== false || v.name === form.emergencyOption)
    .map((v) => ({
      value: v.name,
      label: v.name,
    }));

  // --- Handlers ---

  function setField(name: keyof typeof initialForm, value: any) {
    setForm((prev) => {
      const updates: any = { [name]: value };

      // Reset downstream selections when upstream changes
      if (name === 'center') {
        updates.branch = '';
        updates.section = '';
      } else if (name === 'branch') {
        updates.section = '';
      } else if (name === 'network') {
        updates.base = '';
        updates.environment = '';
        updates.cluster = '';
      } else if (name === 'base') {
        updates.environment = '';
        updates.cluster = '';
      } else if (name === 'environment') {
        updates.cluster = '';
      }

      return { ...prev, ...updates };
    });
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setField(e.target.name as keyof typeof initialForm, e.target.value);
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

    if (!location) return;

    const payload: CreateProjectPayload = {
      name: form.name.trim(),
      purpose: form.purpose.trim(),
      relatedTo: form.trackOrApp.trim() || undefined,
      type: (form.requestType as ProjectType) || 'Semiannual',
      kind: form.projectKind || referenceData.projectKinds[0]?.name || '',
      locationId: location.id,
      centerName: form.center,
      branchName: form.branch,
      sectionName: form.section,
      priority: form.priority as Priority,
    };

    if (form.requestType === 'Emergency' && form.emergencyOption) {
      payload.emergencyOption = form.emergencyOption;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(payload, editingProject?.name);

      // After project is created, create any valid inline requirements
      if (!isEditMode && inlineRequirements.length > 0) {
        const validRequirements = inlineRequirements.filter(
          r => r.serviceName && r.resourceName && r.value > 0
        );
        if (validRequirements.length > 0) {
          const results = await Promise.allSettled(
            validRequirements.map(r => {
              let reqLocationId = location.id;
              if (r.overrideLocation && r.network && r.base && r.environment && r.cluster) {
                const overrideLoc = referenceData.locations.find(
                  l =>
                    l.networkName === r.network &&
                    l.baseName === r.base &&
                    l.environmentName === r.environment &&
                    l.clusterName === r.cluster
                );
                if (overrideLoc) reqLocationId = overrideLoc.id;
              } else if (!r.overrideLocation && r.standaloneCluster) {
                const standaloneClusterLoc = referenceData.locations.find(
                  l =>
                    l.networkName === form.network &&
                    l.baseName === form.base &&
                    l.environmentName === form.environment &&
                    l.clusterName === r.standaloneCluster
                );
                if (standaloneClusterLoc) reqLocationId = standaloneClusterLoc.id;
              }
              return createDemand({
                projectName: form.name.trim(),
                serviceName: r.serviceName,
                resourceName: r.resourceName,
                resourceService: r.serviceName,
                value: r.value,
                locationId: reqLocationId,
                type: r.type,
                centerName: form.center || undefined,
                branchName: form.branch || undefined,
                sectionName: form.section || undefined,
              });
            })
          );
          const failedCount = results.filter(r => r.status === 'rejected').length;
          const succeededCount = results.filter(r => r.status === 'fulfilled').length;
          if (failedCount > 0) {
            // Show partial-failure info alongside the success
            setError(`${succeededCount} דרישות נוצרו, ${failedCount} נכשלו`);
          }
        }
      }

      showToast(isEditMode ? t('projects.updateSuccess') : t('common.toast.projectCreated'), 'success');
      handleClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        t('common.errors.unknown');
      setError(message);
      showToast(isEditMode ? t('projects.updateFailed') : t('common.toast.projectCreateFailed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (isSubmitting) return;
    onClose();
    setForm(initialForm);
    setError(null);
    setInlineRequirements([]);
    setProjectDemands([]);
    setIsDemandSectionLoading(false);
    setIsAddingDemand(false);
    setEditingDemandInProject(null);
    setDemandToCancel(null);
  }

  const placeholder = t('projects.createProject.selectOption');
  const isSemiannual = form.requestType === 'Semiannual';
  const isEmergency = form.requestType === 'Emergency';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? t('projects.editProject.title') : t('projects.createProject.title')}
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.name')}{' '}
              <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              placeholder={t('projects.createProject.namePlaceholder')}
              className={isEditMode ? `${inputClass} bg-gray-50 text-text-secondary` : inputClass}
              readOnly={isEditMode}
              disabled={isEditMode}
            />
          </div>

          {/* Track / Application */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.trackOrApp')}
            </label>
            <input
              type="text"
              name="trackOrApp"
              value={form.trackOrApp}
              onChange={handleChange}
              placeholder={t('projects.createProject.trackOrAppPlaceholder')}
              className={inputClass}
            />
          </div>

          {/* Center */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.center')} <span className="text-danger">*</span>
            </label>
            <Select
              options={centerOptions}
              value={form.center}
              onChange={(v) => setField('center', v)}
              placeholder={placeholder}
            />
          </div>

          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.branch')} <span className="text-danger">*</span>
            </label>
            <Select
              options={branchOptions}
              value={form.branch}
              onChange={(v) => setField('branch', v)}
              placeholder={placeholder}
              disabled={!form.center}
            />
          </div>

          {/* Section */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.section')} <span className="text-danger">*</span>
            </label>
            <Select
              options={sectionOptions}
              value={form.section}
              onChange={(v) => setField('section', v)}
              placeholder={placeholder}
              disabled={!form.branch}
            />
          </div>


          {/* Project Type & Kind Row Breakdown */}

          {/* Request Type */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.requestType')}{' '}
              <span className="text-danger">*</span>
            </label>
            <Select
              options={requestTypeOptions}
              value={form.requestType}
              onChange={(v) => setField('requestType', v)}
              placeholder={placeholder}
              disabled={isEditMode}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.priority')} <span className="text-danger">*</span>
            </label>
            <Select
              options={priorityOptions}
              value={form.priority}
              onChange={(v) => setField('priority', v)}
              placeholder={placeholder}
            />
          </div>

          {/* Kind */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.projectType')}
            </label>
            <Select
              options={projectKindOptions}
              value={form.projectKind}
              onChange={(v) => setField('projectKind', v)}
              placeholder={placeholder}
            />
          </div>

          {/* Emergency Fields */}
          {isEmergency && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                {t('projects.createProject.emergencyOption')} <span className="text-danger">*</span>
              </label>
              <Select
                options={emergencyOptionOptions}
                value={form.emergencyOption}
                onChange={(v) => setField('emergencyOption', v)}
                placeholder={placeholder}
              />
            </div>
          )}

          {/* Location Hierarchy */}

          {/* Network */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.network')} <span className="text-danger">*</span>
            </label>
            <Select
              options={networkOptions}
              value={form.network}
              onChange={(v) => setField('network', v)}
              placeholder={placeholder}
            />
          </div>

          {/* Base */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.base')} <span className="text-danger">*</span>
            </label>
            <Select
              options={baseOptions}
              value={form.base}
              onChange={(v) => setField('base', v)}
              placeholder={placeholder}
              disabled={!form.network}
            />
          </div>

          {/* Environment */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.environment')} <span className="text-danger">*</span>
            </label>
            <Select
              options={environmentOptions}
              value={form.environment}
              onChange={(v) => setField('environment', v)}
              placeholder={placeholder}
              disabled={!form.base}
            />
          </div>

          {/* Cluster */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.cluster')}
            </label>
            <Select
              options={clusterOptions}
              value={form.cluster}
              onChange={(v) => setField('cluster', v)}
              placeholder={placeholder}
              disabled={!form.environment}
            />
          </div>

          {/* Purpose */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('projects.createProject.purpose')}
            </label>
            <textarea
              name="purpose"
              value={form.purpose}
              onChange={handleChange}
              placeholder={t('projects.createProject.purposePlaceholder')}
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>

        {/* Demands Section — edit mode only */}
        {isEditMode && (
          <div className="border-t border-divider pt-4 mt-4" dir="rtl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">
                {t('project.demands.title', 'דרישות')}
                {projectDemands.length > 0 && (
                  <span className="ms-2 text-xs font-normal text-text-secondary">
                    ({projectDemands.length})
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingDemand(true)}
                className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer bg-transparent border-none"
              >
                <MdAdd size={15} />
                {t('project.demands.add', 'הוסף דרישה')}
              </button>
            </div>

            {isDemandSectionLoading && (
              <p className="text-sm text-text-secondary py-2">{t('common.loading', 'טוען...')}</p>
            )}

            {!isDemandSectionLoading && projectDemands.length === 0 && (
              <p className="text-sm text-text-secondary py-2">{t('project.demands.empty', 'אין דרישות')}</p>
            )}

            {projectDemands.length > 0 && (
              <div className="space-y-2">
                {projectDemands.map(demand => {
                  const isTerminal = TERMINAL_DEMAND_STATUSES.has(demand.status);
                  return (
                    <div key={demand.id} className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="flex-1 min-w-[110px] text-text-primary font-medium truncate">
                        {demand.serviceName}
                      </span>
                      <span className="flex-1 min-w-[110px] text-text-secondary truncate">
                        {demand.resourceName}
                      </span>
                      <span className="w-20 text-text-primary shrink-0">
                        {demand.value} {demand.unit}
                      </span>
                      <span className="w-24 text-text-secondary text-xs shrink-0">
                        {demand.location.network}/{demand.location.base}
                      </span>
                      <button
                        type="button"
                        onClick={() => { if (!isTerminal) setEditingDemandInProject(demand); }}
                        disabled={isTerminal}
                        className="px-2 py-1 text-xs border border-divider rounded-lg hover:border-primary transition-colors bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {t('common.edit', 'ערוך')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (!isTerminal) setDemandToCancel(demand); }}
                        disabled={isTerminal}
                        className="px-2 py-1 text-xs border border-divider rounded-lg hover:border-red-400 text-text-secondary hover:text-red-500 transition-colors bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {t('common.cancel', 'בטל')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Inline Requirements Section — create mode only */}
        {!editingProject && (
          <div className="border-t border-divider pt-4 mt-4" dir="rtl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">
                {t('project.inlineRequirements.title', 'דרישות (אופציונלי)')}
              </h3>
              <button
                type="button"
                onClick={addRequirementRow}
                className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer bg-transparent border-none"
              >
                <MdAdd size={15} />
                {t('project.inlineRequirements.addRow', 'הוסף דרישה')}
              </button>
            </div>

            {inlineRequirements.length > 0 && (
              <div className="space-y-2">
                {inlineRequirements.map((req, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    {/* Main row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Service select */}
                      <select
                        value={req.serviceName}
                        onChange={e => updateRequirementRow(idx, 'serviceName', e.target.value)}
                        className="flex-1 min-w-[120px] px-2 py-1.5 text-sm border border-divider rounded-lg bg-bg-default"
                      >
                        <option value="">{t('demand.service', 'שירות')}</option>
                        {referenceData.services.map(s => (
                          <option key={s.name} value={s.name}>{s.displayName || s.name}</option>
                        ))}
                      </select>

                      {/* Resource select (filtered by service) */}
                      <select
                        value={req.resourceName}
                        onChange={e => updateRequirementRow(idx, 'resourceName', e.target.value)}
                        className="flex-1 min-w-[120px] px-2 py-1.5 text-sm border border-divider rounded-lg bg-bg-default"
                        disabled={!req.serviceName}
                      >
                        <option value="">{t('demand.resource', 'משאב')}</option>
                        {referenceData.resources
                          .filter(r => r.serviceName === req.serviceName)
                          .map(r => (
                            <option key={r.name} value={r.name}>{r.name}</option>
                          ))}
                      </select>

                      {/* Value input */}
                      <input
                        type="number"
                        min={1}
                        value={req.value || ''}
                        onChange={e => updateRequirementRow(idx, 'value', Number(e.target.value))}
                        placeholder={t('demand.value', 'כמות')}
                        className="w-20 px-2 py-1.5 text-sm border border-divider rounded-lg bg-bg-default"
                      />

                      {/* Type select */}
                      <select
                        value={req.type}
                        onChange={e => updateRequirementRow(idx, 'type', e.target.value as 'New' | 'Extension')}
                        className="w-28 px-2 py-1.5 text-sm border border-divider rounded-lg bg-bg-default"
                      >
                        <option value="New">{t('demand.type.new', 'חדש')}</option>
                        <option value="Extension">{t('demand.type.extension', 'הרחבה')}</option>
                      </select>

                      {/* Standalone cluster select — visible only when NOT overriding location */}
                      {!req.overrideLocation && (
                        <select
                          value={req.standaloneCluster}
                          onChange={e => updateRequirementRow(idx, 'standaloneCluster', e.target.value)}
                          className="flex-1 min-w-[100px] px-2 py-1.5 text-sm border border-divider rounded-lg bg-bg-default"
                        >
                          <option value="">{t('projects.createProject.cluster', 'קלאסטר')}</option>
                          {referenceData.locations
                            .filter(l =>
                              l.networkName === form.network &&
                              l.baseName === form.base &&
                              l.environmentName === form.environment
                            )
                            .reduce<string[]>((acc, l) => acc.includes(l.clusterName) ? acc : [...acc, l.clusterName], [])
                            .filter(name => {
                              const ref = referenceData.clusters.find(c => c.name === name);
                              return ref?.isActive !== false || name === req.standaloneCluster;
                            })
                            .map(name => {
                              const ref = referenceData.clusters.find(c => c.name === name);
                              return <option key={name} value={name}>{ref?.displayName || name}</option>;
                            })}
                        </select>
                      )}

                      {/* Location override toggle */}
                      <button
                        type="button"
                        onClick={() => updateRequirementRow(idx, 'overrideLocation', !req.overrideLocation)}
                        title={req.overrideLocation
                          ? t('project.inlineRequirements.locationCustom', 'מיקום מותאם')
                          : t('project.inlineRequirements.locationFromProject', 'מיקום מהפרויקט')}
                        className={`transition-colors cursor-pointer bg-transparent border-none p-1 ${
                          req.overrideLocation ? 'text-primary' : 'text-text-secondary hover:text-primary'
                        }`}
                      >
                        <MdLocationOn size={16} />
                      </button>

                      {/* Delete row button */}
                      <button
                        type="button"
                        onClick={() => removeRequirementRow(idx)}
                        className="text-text-secondary hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none p-1"
                      >
                        <MdDelete size={16} />
                      </button>
                    </div>

                    {/* Location sub-row — visible only when override is active */}
                    {req.overrideLocation && (
                      <div className="flex items-center gap-2 flex-wrap ps-2">
                        {/* Network */}
                        <select
                          value={req.network}
                          onChange={e => updateRequirementRow(idx, 'network', e.target.value)}
                          className="flex-1 min-w-[100px] px-2 py-1.5 text-sm border border-primary/40 rounded-lg bg-bg-default"
                        >
                          <option value="">{t('projects.createProject.network', 'רשת')}</option>
                          {referenceData.networks
                            .filter(v => v.isActive !== false || v.name === req.network)
                            .map(v => (
                              <option key={v.name} value={v.name}>{v.displayName || v.name}</option>
                            ))}
                        </select>

                        {/* Base */}
                        <select
                          value={req.base}
                          onChange={e => updateRequirementRow(idx, 'base', e.target.value)}
                          disabled={!req.network}
                          className="flex-1 min-w-[100px] px-2 py-1.5 text-sm border border-primary/40 rounded-lg bg-bg-default disabled:opacity-50"
                        >
                          <option value="">{t('projects.createProject.base', 'בסיס')}</option>
                          {referenceData.locations
                            .filter(l => l.networkName === req.network)
                            .reduce<string[]>((acc, l) => acc.includes(l.baseName) ? acc : [...acc, l.baseName], [])
                            .filter(name => {
                              const ref = referenceData.bases.find(b => b.name === name);
                              return ref?.isActive !== false || name === req.base;
                            })
                            .map(name => {
                              const ref = referenceData.bases.find(b => b.name === name);
                              return <option key={name} value={name}>{ref?.displayName || name}</option>;
                            })}
                        </select>

                        {/* Environment */}
                        <select
                          value={req.environment}
                          onChange={e => updateRequirementRow(idx, 'environment', e.target.value)}
                          disabled={!req.base}
                          className="flex-1 min-w-[100px] px-2 py-1.5 text-sm border border-primary/40 rounded-lg bg-bg-default disabled:opacity-50"
                        >
                          <option value="">{t('projects.createProject.environment', 'סביבה')}</option>
                          {referenceData.locations
                            .filter(l => l.networkName === req.network && l.baseName === req.base)
                            .reduce<string[]>((acc, l) => acc.includes(l.environmentName) ? acc : [...acc, l.environmentName], [])
                            .filter(name => {
                              const ref = referenceData.environments.find(e => e.name === name);
                              return ref?.isActive !== false || name === req.environment;
                            })
                            .map(name => {
                              const ref = referenceData.environments.find(e => e.name === name);
                              return <option key={name} value={name}>{ref?.displayName || name}</option>;
                            })}
                        </select>

                        {/* Cluster */}
                        <select
                          value={req.cluster}
                          onChange={e => updateRequirementRow(idx, 'cluster', e.target.value)}
                          disabled={!req.environment}
                          className="flex-1 min-w-[100px] px-2 py-1.5 text-sm border border-primary/40 rounded-lg bg-bg-default disabled:opacity-50"
                        >
                          <option value="">{t('projects.createProject.cluster', 'אשכול')}</option>
                          {referenceData.locations
                            .filter(l =>
                              l.networkName === req.network &&
                              l.baseName === req.base &&
                              l.environmentName === req.environment
                            )
                            .reduce<string[]>((acc, l) => acc.includes(l.clusterName) ? acc : [...acc, l.clusterName], [])
                            .filter(name => {
                              const ref = referenceData.clusters.find(c => c.name === name);
                              return ref?.isActive !== false || name === req.cluster;
                            })
                            .map(name => {
                              const ref = referenceData.clusters.find(c => c.name === name);
                              return <option key={name} value={name}>{ref?.displayName || name}</option>;
                            })}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
            {isSubmitting ? t('common.submitting') : isEditMode ? t('common.save') : t('projects.createProject.submit')}
          </button>
        </div>
      </form>

        {isAddingDemand && (
          <CreateDemandModal
            isOpen={true}
            onClose={() => setIsAddingDemand(false)}
            onSubmit={async () => {
              // Create mode: CreateDemandModal calls createDemandGroup internally — onSubmit is never invoked
            }}
            onCreated={async () => {
              await refreshProjectDemands();
              setIsAddingDemand(false);
            }}
          />
        )}

        {editingDemandInProject && (
          <CreateDemandModal
            isOpen={true}
            onClose={() => setEditingDemandInProject(null)}
            onSubmit={async (payload, demandId) => {
              if (!demandId) return;
              await apiUpdateDemand(demandId, payload as UpdateDemandPayload);
              await refreshProjectDemands();
              setEditingDemandInProject(null);
            }}
            editingDemand={editingDemandInProject}
          />
        )}

        <ConfirmDialog
          isOpen={demandToCancel !== null}
          title={t('demands.cancelTitle', 'ביטול דרישה')}
          message={t('demands.cancelConfirm', 'לבטל דרישה זו?')}
          onConfirm={confirmCancelProjectDemand}
          onCancel={() => setDemandToCancel(null)}
          danger
        />
    </Modal>
  );
}
