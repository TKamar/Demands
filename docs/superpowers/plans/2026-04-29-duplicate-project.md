# Duplicate Project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Duplicate" action to each project row that opens a pre-filled modal, letting users copy a project to the next half-year period with control over which demands carry forward.

**Architecture:** Single atomic `POST /api/projects/:name/duplicate` endpoint runs project + demand creation in one Prisma transaction. The frontend opens a `DuplicateProjectModal` that fetches source demands, pre-fills all project fields, auto-advances year/median, and lets the user toggle/edit individual demands before submitting.

**Tech Stack:** Express + Prisma (backend), React + TypeScript + Tailwind (frontend), react-i18next for strings, react-icons for icons.

---

## File Map

| Action | File |
|--------|------|
| Modify | `server/src/services/request/project.service.ts` |
| Modify | `server/src/controllers/request/project.controller.ts` |
| Modify | `server/src/routes/request/project.routes.ts` |
| Modify | `client/src/api/types.ts` |
| Modify | `client/src/api/apiService.ts` |
| Modify | `client/src/hooks/useProjects.ts` |
| Create | `client/src/components/projects/DuplicateProjectModal.tsx` |
| Modify | `client/src/components/projects/ProjectsTable.tsx` |
| Modify | `client/src/pages/ProjectsPage.tsx` |

---

## Task 1: Backend service — `projectService.duplicate`

**Files:**
- Modify: `server/src/services/request/project.service.ts`

- [ ] **Step 1: Add the `duplicate` method to `projectService`**

Open `server/src/services/request/project.service.ts` and append the following method inside the `projectService` object (after the `delete` method, before the closing `}`):

```typescript
  duplicate: async (
    sourceName: string,
    newProjectData: {
      name: string;
      purpose: string;
      relatedTo?: string;
      type: ProjectType;
      kindName: string;
      locationId: number;
      year?: number;
      median?: Median;
      priority?: string;
      emergencyOptionName?: string;
      centerName: string;
      branchName: string;
      sectionName: string;
      createdBy?: string;
      createdByName?: string;
    },
    demands: { id: number; value: number }[]
  ) => {
    return prisma.$transaction(async (tx) => {
      const sourceDemands = demands.length > 0
        ? await tx.demand.findMany({ where: { id: { in: demands.map((d) => d.id) } } })
        : [];

      const project = await tx.project.create({
        data: newProjectData,
        include: { location: true, kind: true, emergencyOption: true },
      });

      if (sourceDemands.length > 0) {
        const valueMap = new Map(demands.map((d) => [d.id, d.value]));
        await tx.demand.createMany({
          data: sourceDemands.map((d) => ({
            projectName: project.name,
            serviceName: d.serviceName,
            resourceName: d.resourceName,
            resourceService: d.resourceService,
            value: valueMap.get(d.id)!,
            locationId: d.locationId,
            type: d.type,
            clusterName: d.clusterName ?? undefined,
            centerName: d.centerName,
            branchName: d.branchName,
            sectionName: d.sectionName,
            status: 'Pending' as const,
            createdBy: newProjectData.createdBy,
            createdByName: newProjectData.createdByName,
          })),
        });
      }

      return project;
    });
  },
```

- [ ] **Step 2: Verify the server still compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/request/project.service.ts
git commit -m "feat(server): add projectService.duplicate with prisma transaction"
```

---

## Task 2: Backend controller action + route

**Files:**
- Modify: `server/src/controllers/request/project.controller.ts`
- Modify: `server/src/routes/request/project.routes.ts`

- [ ] **Step 1: Add `duplicate` to `projectController`**

Open `server/src/controllers/request/project.controller.ts` and append the following inside the `projectController` object (after the `delete` method, before the closing `}`):

```typescript
  duplicate: async (req: Request, res: Response) => {
    try {
      const { username, fullName, isPrivileged } = getUserContext(req);
      const sourceName = req.params.name;
      const {
        name, purpose, relatedTo, type, kind, locationId,
        year, median, priority, emergencyOption,
        centerName, branchName, sectionName,
        demands,
      } = req.body;

      // Verify source exists and caller owns it
      const sourceProject = await projectService.findByName(sourceName);
      if (!sourceProject) {
        return res.status(404).json({ error: 'Project not found' });
      }
      if (!isPrivileged && sourceProject.createdBy !== username) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // New name must be unique
      const nameConflict = await projectService.findByName(name);
      if (nameConflict) {
        return res.status(400).json({ error: 'A project with this name already exists' });
      }

      // Type-specific validation
      if (type === ProjectType.Semiannual) {
        if (year === undefined || year === null) {
          return res.status(400).json({ error: 'year is required for Semiannual projects' });
        }
        if (!median) {
          return res.status(400).json({ error: 'median is required for Semiannual projects' });
        }
      }
      if (type === ProjectType.Emergency && !emergencyOption) {
        return res.status(400).json({ error: 'emergencyOption is required for Emergency projects' });
      }

      // Validate location
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        include: { base: true, environment: true, network: true },
      });
      if (!location || !location.isActive || !location.base.isActive || !location.environment.isActive || !location.network.isActive) {
        return res.status(400).json({ error: 'Location or its components are not active' });
      }

      // Validate org fields
      if (!centerName || !branchName || !sectionName) {
        return res.status(400).json({ error: 'centerName, branchName, and sectionName are required' });
      }
      const center = await prisma.center.findUnique({ where: { name: centerName } });
      if (!center || !center.isActive) {
        return res.status(400).json({ error: 'Center not found or not active' });
      }
      const branch = await prisma.branch.findUnique({
        where: { name_centerName: { name: branchName, centerName } },
      });
      if (!branch || !branch.isActive) {
        return res.status(400).json({ error: 'Branch not found or not active' });
      }
      const section = await prisma.section.findUnique({
        where: { name_branchName_branchCenter: { name: sectionName, branchName, branchCenter: centerName } },
      });
      if (!section || !section.isActive) {
        return res.status(400).json({ error: 'Section not found or not active' });
      }

      const project = await projectService.duplicate(
        sourceName,
        {
          name,
          purpose,
          relatedTo: relatedTo || undefined,
          type,
          kindName: kind,
          locationId,
          year: type === ProjectType.Semiannual ? year : undefined,
          median: type === ProjectType.Semiannual ? median : undefined,
          priority: priority || undefined,
          emergencyOptionName: type === ProjectType.Emergency ? emergencyOption : undefined,
          centerName,
          branchName,
          sectionName,
          createdBy: username,
          createdByName: fullName,
        },
        demands || []
      );

      res.status(201).json(project);
    } catch (error) {
      console.error('projectController.duplicate error:', error);
      res.status(400).json({ error: 'Failed to duplicate project' });
    }
  },
```

- [ ] **Step 2: Register the route**

Open `server/src/routes/request/project.routes.ts` and add this line **before** the `/:name` GET route (to avoid the param route swallowing it):

```typescript
router.post("/:name/duplicate", authenticate, requireAuth, projectController.duplicate);
```

The file should now look like:

```typescript
router.get("/", authenticate, requireAuth, projectController.getAll);
router.get("/filter", authenticate, requireAuth, projectController.getByFilters);
router.get("/:name", authenticate, requireAuth, projectController.getByName);
router.post("/", authenticate, requireAuth, projectController.create);
router.post("/:name/duplicate", authenticate, requireAuth, projectController.duplicate);
router.put("/:name", authenticate, requireAuth, projectController.update);
router.delete("/:name", authenticate, requireAuth, projectController.delete);
```

- [ ] **Step 3: Verify compilation**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke-test the endpoint (server must be running)**

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:3000/api/projects/NONEXISTENT/duplicate \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected output: `401` (unauthenticated) or `404` (not found after auth) — confirms the route is registered.

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/request/project.controller.ts \
        server/src/routes/request/project.routes.ts
git commit -m "feat(server): add POST /projects/:name/duplicate endpoint"
```

---

## Task 3: Frontend types + API function

**Files:**
- Modify: `client/src/api/types.ts`
- Modify: `client/src/api/apiService.ts`

- [ ] **Step 1: Add `DuplicateProjectPayload` type**

Open `client/src/api/types.ts` and append after the `UpdateProjectPayload` interface:

```typescript
export interface DuplicateProjectPayload {
  name: string;
  purpose: string;
  relatedTo?: string;
  type: ProjectType;
  kind: ProjectKind;
  locationId: number;
  year?: number;
  median?: Median;
  emergencyOption?: string;
  priority?: Priority;
  centerName?: string;
  branchName?: string;
  sectionName?: string;
  demands: { id: number; value: number }[];
}
```

- [ ] **Step 2: Add `duplicateProject` API function**

Open `client/src/api/apiService.ts` and add the import for `DuplicateProjectPayload` to the existing import block at the top, then add this function after `deleteProject`:

Add to the import list:
```typescript
  DuplicateProjectPayload,
```

Add the function:
```typescript
export async function duplicateProject(sourceName: string, payload: DuplicateProjectPayload): Promise<Project> {
  const { data } = await api.post(`/projects/${encodeURIComponent(sourceName)}/duplicate`, payload);
  return mapProject(data);
}
```

- [ ] **Step 3: Verify compilation**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/api/types.ts client/src/api/apiService.ts
git commit -m "feat(client): add DuplicateProjectPayload type and duplicateProject API function"
```

---

## Task 4: Extend `useProjects` hook

**Files:**
- Modify: `client/src/hooks/useProjects.ts`

- [ ] **Step 1: Add `duplicateProject` to the hook**

Open `client/src/hooks/useProjects.ts`.

Add `duplicateProject as apiDuplicateProject` and `DuplicateProjectPayload` to the imports:

```typescript
import { fetchProjects, createProject as apiCreateProject, updateProject as apiUpdateProject, deleteProject as apiDeleteProject, duplicateProject as apiDuplicateProject } from '../api/apiService';
import type { Project } from '../types/domain';
import type { CreateProjectPayload, UpdateProjectPayload, DuplicateProjectPayload, PaginationParams, ProjectFilterParams } from '../api/types';
```

Add `duplicateProject` to the `UseProjectsResult` interface:

```typescript
interface UseProjectsResult {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  total: number;
  totalPages: number;
  createProject: (payload: CreateProjectPayload) => Promise<void>;
  updateProject: (name: string, payload: UpdateProjectPayload) => Promise<void>;
  deleteProject: (name: string) => Promise<void>;
  duplicateProject: (name: string, payload: DuplicateProjectPayload) => Promise<void>;
}
```

Add the callback inside the hook body (after `deleteProject`):

```typescript
  const duplicateProject = useCallback(async (name: string, payload: DuplicateProjectPayload) => {
    await apiDuplicateProject(name, payload);
    triggerRefreshProjects();
  }, [triggerRefreshProjects]);
```

Add `duplicateProject` to the return value:

```typescript
  return { projects, isLoading, error, total, totalPages, createProject, updateProject, deleteProject, duplicateProject };
```

- [ ] **Step 2: Verify compilation**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useProjects.ts
git commit -m "feat(client): add duplicateProject to useProjects hook"
```

---

## Task 5: `DuplicateProjectModal` component

**Files:**
- Create: `client/src/components/projects/DuplicateProjectModal.tsx`

- [ ] **Step 1: Create the component**

Create `client/src/components/projects/DuplicateProjectModal.tsx` with the following content:

```typescript
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

  // --- Demand state ---
  const [demands, setDemands] = useState<Demand[]>([]);
  const [isLoadingDemands, setIsLoadingDemands] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [demandValues, setDemandValues] = useState<Record<number, string>>({});

  // --- Project form state ---
  const [form, setForm] = useState(() => buildInitialForm(sourceProject));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build initial form from source project
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

  // Reload form + demands whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;

    setForm(buildInitialForm(sourceProject));
    setError(null);
    setIsSubmitting(false);

    setIsLoadingDemands(true);
    fetchDemands({ projectName: sourceProject.name }, { page: 1, limit: 1000 })
      .then(({ data }) => {
        setDemands(data);

        // Pre-select approved demands
        const approvedIds = new Set(
          data.filter((d) => APPROVED_STATUSES.has(d.status)).map((d) => d.id)
        );
        setSelectedIds(approvedIds);

        // Set initial values
        const values: Record<number, string> = {};
        data.forEach((d) => {
          const isApproved = APPROVED_STATUSES.has(d.status);
          values[d.id] = String(isApproved ? (d.approvedValue ?? d.value) : d.value);
        });
        setDemandValues(values);
      })
      .catch(() => {
        showToast('Failed to load demands', 'error');
      })
      .finally(() => setIsLoadingDemands(false));
  }, [isOpen, sourceProject.name]);

  // --- Location hierarchy options ---
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

  // --- Org hierarchy options ---
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

  // --- Other options ---
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

  // --- Form field handler ---
  function setField(name: keyof typeof form, value: string) {
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

  // --- Demand selection ---
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

  // --- Submit ---
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
      priority: form.priority as Priority || undefined,
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
        {/* Project fields */}
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

        {/* Demands section */}
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
```

- [ ] **Step 2: Verify compilation**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors. Fix any type errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/projects/DuplicateProjectModal.tsx
git commit -m "feat(client): add DuplicateProjectModal component"
```

---

## Task 6: Wire up `ProjectsTable` and `ProjectsPage`

**Files:**
- Modify: `client/src/components/projects/ProjectsTable.tsx`
- Modify: `client/src/pages/ProjectsPage.tsx`

- [ ] **Step 1: Add duplicate button to `ProjectsTable`**

Open `client/src/components/projects/ProjectsTable.tsx`.

Add `MdContentCopy` to the import at the top:
```typescript
import { MdEdit, MdDelete, MdContentCopy } from 'react-icons/md';
```

Add `onDuplicate` to `ProjectsTableProps`:
```typescript
interface ProjectsTableProps {
  projects: Project[];
  isLoading?: boolean;
  selectedProject?: Project | null;
  onSelectProject: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onDuplicate: (project: Project) => void;
  visibleColumns: ColumnConfig<ProjectColumnKey>[];
}
```

In the `renderCell` function, find the `case 'actions':` block and replace the `<div>` contents with:

```typescript
      case 'actions':
        return (
          <td key={columnKey} className="px-4 py-3 whitespace-nowrap">
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(project); }}
                className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                title={t('common.edit')}
              >
                <MdEdit size={18} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(project); }}
                className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                title={t('projects.actions.duplicate')}
              >
                <MdContentCopy size={18} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(project); }}
                className="p-1.5 text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={(project.demandCount ?? 0) > 0 ? t('projects.actions.cannotDeleteWithDemands') : t('common.delete')}
                disabled={(project.demandCount ?? 0) > 0}
              >
                <MdDelete size={18} />
              </button>
            </div>
          </td>
        );
```

In the `ProjectsTable` function signature, destructure `onDuplicate`:
```typescript
export default function ProjectsTable({
  projects,
  isLoading,
  selectedProject,
  onSelectProject,
  onEdit,
  onDelete,
  onDuplicate,
  visibleColumns,
}: ProjectsTableProps) {
```

- [ ] **Step 2: Wire up `DuplicateProjectModal` in `ProjectsPage`**

Open `client/src/pages/ProjectsPage.tsx`.

Add the import:
```typescript
import DuplicateProjectModal from '../components/projects/DuplicateProjectModal';
```

Add `duplicateProject` to the hook destructure:
```typescript
const { projects: allProjects, isLoading, error, createProject, updateProject, deleteProject, duplicateProject } = useProjects(...)
```

Add state for the duplicating project (after `editingProject` state):
```typescript
const [duplicatingProject, setDuplicatingProject] = useState<Project | null>(null);
```

Add the handler (after `handleDeleteProject`):
```typescript
async function handleDuplicateProject(sourceName: string, payload: any) {
  await duplicateProject(sourceName, payload);
  setCurrentPage(1);
}
```

Pass `onDuplicate` to `ProjectsTable`:
```typescript
<ProjectsTable
  projects={paginatedProjects}
  isLoading={false}
  selectedProject={selectedProject}
  onSelectProject={setSelectedProject}
  onEdit={handleEditProject}
  onDelete={handleDeleteProject}
  onDuplicate={(p) => setDuplicatingProject(p)}
  visibleColumns={orderedVisibleColumns}
/>
```

Add `DuplicateProjectModal` before the closing `</div>`:
```typescript
{duplicatingProject && (
  <DuplicateProjectModal
    isOpen={true}
    onClose={() => setDuplicatingProject(null)}
    sourceProject={duplicatingProject}
    onSubmit={handleDuplicateProject}
  />
)}
```

Add the import for `DuplicateProjectPayload` in `ProjectsPage.tsx`:
```typescript
import type { CreateProjectPayload, UpdateProjectPayload, DuplicateProjectPayload } from '../api/types';
```

Update `handleDuplicateProject` type:
```typescript
async function handleDuplicateProject(sourceName: string, payload: DuplicateProjectPayload) {
  await duplicateProject(sourceName, payload);
  setCurrentPage(1);
}
```

- [ ] **Step 3: Add i18n translation keys**

Find all translation JSON files (typically `client/src/locales/*/translation.json`) and add:

```json
"projects": {
  "duplicateProject": {
    "title": "Duplicate Project",
    "demandsTitle": "Demands to carry forward",
    "approvedDemands": "Approved demands (pre-selected)",
    "optionalDemands": "Other demands (optional)",
    "noDemands": "This project has no demands.",
    "submit": "Duplicate"
  },
  "duplicateSuccess": "Project duplicated successfully",
  "actions": {
    "duplicate": "Duplicate project"
  }
}
```

- [ ] **Step 4: Verify compilation**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual browser test**

1. Start the app: `npm run dev` from the repo root.
2. Navigate to the Projects page.
3. Confirm a copy icon appears in each row's actions column.
4. Click it on a Semiannual project with existing demands.
5. Confirm the modal opens with: auto-advanced year/median, suggested name, all project fields filled, approved demands pre-checked, non-approved demands unchecked.
6. Edit a demand value, uncheck an approved demand, check an optional demand.
7. Submit — confirm a new project appears in the list.
8. Open the new project's demands and confirm the correct demands and values.
9. Repeat for an Emergency project — confirm no year/median fields and name ends in `- copy`.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/projects/ProjectsTable.tsx \
        client/src/pages/ProjectsPage.tsx
git commit -m "feat(client): wire duplicate project modal into ProjectsTable and ProjectsPage"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Atomic transaction ✓ | Approved demands pre-checked ✓ | Optional demands unchecked ✓ | approvedValue → new value ✓ | Auto-advance year/median ✓ | Suggested name ✓ | Full project form editable ✓ | Duplicate button in table row ✓ | Authorization mirrors update/delete ✓
- [x] **No placeholders:** All steps contain complete code.
- [x] **Type consistency:** `DuplicateProjectPayload` defined in Task 3, used in Tasks 4, 5, 6. `projectService.duplicate` signature in Task 1 matches the call in Task 2.
