# Sub-Project A: Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore three missing UI features: system-wide center filter for admin/moderator, create/edit/cancel demand actions in the My Requests requirements view, and a demand management section inside the project edit form.

**Architecture:** Lift `selectedCenters` state to `MainPage` so one `CenterFilter` controls all panels; mirror `RequirementsView`'s create/edit/cancel pattern into `RequestsIOpened`; add an edit-mode demands section to `CreateProjectModal` that fetches the project's demands, shows them with Edit/Cancel buttons per row, and stacks `CreateDemandModal` on top for editing.

**Tech Stack:** React 18, TypeScript, react-i18next, react-icons/md, existing `useDemands` hook, `fetchDemands` / `fetchDemandHistory` from `apiService.ts`.

---

## File Map

| File | Role |
|------|------|
| `client/src/api/apiService.ts` | Add `centerName` param to `fetchDemandHistory` |
| `client/src/hooks/useHistoryDemands.ts` | Accept `centerName` filter; reset and re-fetch on change |
| `client/src/pages/MainPage.tsx` | Own `selectedCenters` state; render global `CenterFilter` bar for admin/moderator |
| `client/src/components/main/panels/ApprovalRequestsPanel.tsx` | Accept `selectedCenters` as prop; remove local state and local CenterFilter render |
| `client/src/components/main/panels/MyRequestsPanel.tsx` | Accept and thread `selectedCenters` |
| `client/src/components/main/panels/HistoryPanel.tsx` | Accept and thread `selectedCenters` |
| `client/src/components/main/RequestsIOpened.tsx` | Accept `selectedCenters`; add create/edit/cancel demand actions |
| `client/src/components/main/RequestHistory.tsx` | Accept `selectedCenters`; pass to `useHistoryDemands` |
| `client/src/components/projects/CreateProjectModal.tsx` | Edit-mode demands section: fetch, list, add, edit, cancel |

---

## Task 1: Center Filter Backend Plumbing

**Files:**
- Modify: `client/src/api/apiService.ts`
- Modify: `client/src/hooks/useHistoryDemands.ts`

### Context

`fetchDemandHistory` in `apiService.ts` currently accepts only `{ page?, limit? }`. `useHistoryDemands` has no filter params at all. Both need `centerName` support so the global center filter can narrow history results.

`Modal` uses `createPortal` to `document.body` at `z-50` — stacking two modals works correctly since DOM order determines z-index among same-level fixed elements.

- [ ] **Step 1: Create feature branch**

```bash
git checkout dev && git pull
git checkout -b feature/sub-project-a-bug-fixes
```

- [ ] **Step 2: Add `centerName` to `fetchDemandHistory` in `apiService.ts`**

Find `fetchDemandHistory` (around line 248). Replace:
```ts
export async function fetchDemandHistory(params: { page?: number; limit?: number }): Promise<PaginatedResponse<Demand>> {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());
  const { data } = await api.get(`/demands/history?${query.toString()}`);
```
with:
```ts
export async function fetchDemandHistory(params: { page?: number; limit?: number; centerName?: string }): Promise<PaginatedResponse<Demand>> {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.centerName) query.append('center', params.centerName);
  const { data } = await api.get(`/demands/history?${query.toString()}`);
```

- [ ] **Step 3: Update `useHistoryDemands` to accept and react to `centerName`**

Replace the entire contents of `client/src/hooks/useHistoryDemands.ts` with:
```ts
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
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/api/apiService.ts client/src/hooks/useHistoryDemands.ts
git commit -m "feat: add centerName filter support to fetchDemandHistory and useHistoryDemands"
```

---

## Task 2: Center Filter — MainPage + Panel Props

**Files:**
- Modify: `client/src/pages/MainPage.tsx`
- Modify: `client/src/components/main/panels/ApprovalRequestsPanel.tsx`
- Modify: `client/src/components/main/panels/MyRequestsPanel.tsx`
- Modify: `client/src/components/main/panels/HistoryPanel.tsx`

### Context

`MainPage.tsx` owns one `selectedCenters` state. It renders a `CenterFilter` bar (between `TopNavTabs` and the panel) only when `isModeratorOrAdmin(role)` is true. All three panels lose their local center filter state and gain a `selectedCenters: string[]` prop.

`ApprovalRequestsPanel` currently has `const [selectedCenters, setSelectedCenters] = useState<string[]>([])` (line 27) and renders `<CenterFilter>` at lines 55–64. Both are removed.

`MyRequestsPanel` passes `selectedCenters={[]}` hardcoded to `ProjectsAccordion` (line 60) — replace with prop.

`HistoryPanel` passes `selectedCenters={[]}` hardcoded to `ProjectsAccordion` (line 40) — replace with prop.

- [ ] **Step 1: Update `MainPage.tsx`**

Replace the entire file with:
```tsx
import { useState, useEffect, useRef } from 'react';
import { TopNavTabs } from '../components/main/TopNavTabs';
import type { TopNavTabId } from '../components/main/TopNavTabs';
import ApprovalRequestsPanel from '../components/main/panels/ApprovalRequestsPanel';
import MyRequestsPanel from '../components/main/panels/MyRequestsPanel';
import HistoryPanel from '../components/main/panels/HistoryPanel';
import CenterFilter from '../components/main/CenterFilter';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getDefaultTab, isModeratorOrAdmin } from '../utils/roleUtils';
import type { SubViewId } from '../utils/roleUtils';
import type { UserRole } from '../types/domain';

const DEFAULT_TAB: TopNavTabId = 'myRequests';
const DEFAULT_SUBVIEWS: Record<TopNavTabId, SubViewId> = {
  approvalRequests: 'requirements',
  myRequests: 'projects',
  history: 'requirements',
};

export default function MainPage() {
  const currentUser = useCurrentUser();
  const role: UserRole = currentUser?.role ?? 'REGULAR_USER';

  const [topNavTab, setTopNavTab] = useState<TopNavTabId>(DEFAULT_TAB);
  const [subViewByTab, setSubViewByTab] = useState<Record<TopNavTabId, SubViewId>>(DEFAULT_SUBVIEWS);
  const [selectedCenters, setSelectedCenters] = useState<string[]>([]);
  const defaultTabSetRef = useRef(false);

  useEffect(() => {
    if (currentUser && !defaultTabSetRef.current) {
      defaultTabSetRef.current = true;
      setTopNavTab(getDefaultTab(currentUser.role));
    }
  }, [currentUser]);

  const subView = subViewByTab[topNavTab];

  const handleSubViewChange = (view: SubViewId) => {
    setSubViewByTab((prev) => ({ ...prev, [topNavTab]: view }));
  };

  return (
    <div className="flex flex-col h-full">
      <TopNavTabs activeTab={topNavTab} onTabChange={setTopNavTab} role={role} />

      {isModeratorOrAdmin(role) && (
        <div className="bg-bg-paper border-b border-divider px-6 py-3">
          <CenterFilter selectedCenters={selectedCenters} onChange={setSelectedCenters} />
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {topNavTab === 'approvalRequests' && (
          <ApprovalRequestsPanel
            subView={subView}
            onSubViewChange={handleSubViewChange}
            role={role}
            selectedCenters={selectedCenters}
          />
        )}
        {topNavTab === 'myRequests' && (
          <MyRequestsPanel
            subView={subView}
            onSubViewChange={handleSubViewChange}
            currentUser={currentUser}
            selectedCenters={selectedCenters}
          />
        )}
        {topNavTab === 'history' && (
          <HistoryPanel
            subView={subView}
            onSubViewChange={handleSubViewChange}
            currentUser={currentUser}
            selectedCenters={selectedCenters}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `ApprovalRequestsPanel.tsx`**

Replace the entire file with:
```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdSearch } from 'react-icons/md';
import { useModal } from '../../../contexts/ModalContext';
import ProjectsAccordion from '../ProjectsAccordion';
import RequirementsView from '../RequirementsView';
import { MyApprovalRequests } from '../MyApprovalRequests';
import { ResourcesForAssignment } from '../ResourcesForAssignment';
import ResourceSummaryStrip from '../ResourceSummaryStrip';
import type { SubViewId } from '../../../utils/roleUtils';
import type { UserRole } from '../../../types/domain';

interface ApprovalRequestsPanelProps {
  subView: SubViewId;
  onSubViewChange: (view: SubViewId) => void;
  role: UserRole;
  selectedCenters: string[];
}

export default function ApprovalRequestsPanel({
  subView,
  onSubViewChange,
  role,
  selectedCenters,
}: ApprovalRequestsPanelProps) {
  const { t } = useTranslation();
  const { openModal } = useModal();
  const [resourceSummaryOpen, setResourceSummaryOpen] = useState(false);

  const isCM = role === 'CENTER_MANAGER';

  return (
    <div className="flex flex-col h-full">
      {/* Sub-view toggle */}
      <div role="tablist" className="flex items-center gap-0 border-b border-divider bg-bg-paper px-6">
        {(['projects', 'requirements'] as SubViewId[]).map((view) => (
          <button
            key={view}
            role="tab"
            aria-selected={subView === view}
            onClick={() => onSubViewChange(view)}
            className={`px-5 py-3 text-sm font-medium transition-colors relative cursor-pointer border-none bg-transparent outline-none whitespace-nowrap ${
              subView === view ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t(view === 'projects' ? 'main.tabs.projects' : 'main.tabs.requirements')}
            {subView === view && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Resource summary strip (Projects sub-view only, not for CM) */}
      {subView === 'projects' && !isCM && (
        <div className="bg-bg-paper border-b border-divider px-6 py-3 flex items-center gap-4 flex-wrap">
          <ResourceSummaryStrip
            selectedCenters={selectedCenters}
            open={resourceSummaryOpen}
            onToggle={() => setResourceSummaryOpen((o) => !o)}
          />
        </div>
      )}

      {/* Toolbar (Projects sub-view only) */}
      {subView === 'projects' && (
        <div className="flex items-center gap-3 px-6 py-3 bg-bg-paper border-b border-divider">
          <div className="w-56 flex items-center gap-2 px-3 py-2 border border-divider rounded-lg bg-bg-default cursor-not-allowed opacity-60">
            <MdSearch size={16} className="text-text-secondary" />
            <span className="text-sm text-text-secondary">{t('main.search.placeholder', 'Search...')}</span>
          </div>
          <button
            onClick={() => openModal('project')}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity border-none cursor-pointer whitespace-nowrap ms-auto"
          >
            <MdAdd size={16} />
            {t('main.actions.newProject', 'New Project')}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {subView === 'projects' && (
          <div className="flex flex-col gap-4">
            {isCM && <ResourcesForAssignment />}
            <ProjectsAccordion selectedCenters={selectedCenters} />
          </div>
        )}
        {subView === 'requirements' && (
          isCM
            ? <MyApprovalRequests />
            : <RequirementsView selectedCenters={selectedCenters} managed={true} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `MyRequestsPanel.tsx`**

Replace the entire file with:
```tsx
import { useTranslation } from 'react-i18next';
import { MdAdd, MdSearch } from 'react-icons/md';
import { useModal } from '../../../contexts/ModalContext';
import ProjectsAccordion from '../ProjectsAccordion';
import { RequestsIOpened } from '../RequestsIOpened';
import type { SubViewId } from '../../../utils/roleUtils';
import type { AppUser } from '../../../types/domain';

interface MyRequestsPanelProps {
  subView: SubViewId;
  onSubViewChange: (view: SubViewId) => void;
  currentUser: AppUser | null;
  selectedCenters: string[];
}

export default function MyRequestsPanel({ subView, onSubViewChange, currentUser, selectedCenters }: MyRequestsPanelProps) {
  const { t } = useTranslation();
  const { openModal } = useModal();

  return (
    <div className="flex flex-col h-full">
      {/* Sub-view toggle */}
      <div role="tablist" className="flex items-center gap-0 border-b border-divider bg-bg-paper px-6">
        {(['projects', 'requirements'] as SubViewId[]).map((view) => (
          <button
            key={view}
            role="tab"
            aria-selected={subView === view}
            onClick={() => onSubViewChange(view)}
            className={`px-5 py-3 text-sm font-medium transition-colors relative cursor-pointer border-none bg-transparent outline-none whitespace-nowrap ${
              subView === view ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t(view === 'projects' ? 'main.tabs.projects' : 'main.tabs.requirements')}
            {subView === view && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Toolbar (Projects sub-view only) */}
      {subView === 'projects' && (
        <div className="flex items-center gap-3 px-6 py-3 bg-bg-paper border-b border-divider">
          <div className="w-56 flex items-center gap-2 px-3 py-2 border border-divider rounded-lg bg-bg-default cursor-not-allowed opacity-60">
            <MdSearch size={16} className="text-text-secondary" />
            <span className="text-sm text-text-secondary">{t('main.search.placeholder', 'Search...')}</span>
          </div>
          <button
            onClick={() => openModal('project')}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity border-none cursor-pointer whitespace-nowrap ms-auto"
          >
            <MdAdd size={16} />
            {t('main.actions.newProject', 'New Project')}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {subView === 'projects' && (
          <ProjectsAccordion selectedCenters={selectedCenters} mode="active" createdBy={currentUser?.username} />
        )}
        {subView === 'requirements' && currentUser && (
          <RequestsIOpened createdBy={currentUser.username} selectedCenters={selectedCenters} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update `HistoryPanel.tsx`**

Replace the entire file with:
```tsx
import { useTranslation } from 'react-i18next';
import ProjectsAccordion from '../ProjectsAccordion';
import RequestHistory from '../RequestHistory';
import type { SubViewId } from '../../../utils/roleUtils';
import type { AppUser } from '../../../types/domain';

interface HistoryPanelProps {
  subView: SubViewId;
  onSubViewChange: (view: SubViewId) => void;
  currentUser: AppUser | null;
  selectedCenters: string[];
}

export default function HistoryPanel({ subView, onSubViewChange, currentUser, selectedCenters }: HistoryPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full">
      {/* Sub-view toggle */}
      <div role="tablist" className="flex items-center gap-0 border-b border-divider bg-bg-paper px-6">
        {(['projects', 'requirements'] as SubViewId[]).map((view) => (
          <button
            key={view}
            role="tab"
            aria-selected={subView === view}
            onClick={() => onSubViewChange(view)}
            className={`px-5 py-3 text-sm font-medium transition-colors relative cursor-pointer border-none bg-transparent outline-none whitespace-nowrap ${
              subView === view ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t(view === 'projects' ? 'main.tabs.projects' : 'main.tabs.requirements')}
            {subView === view && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {subView === 'projects' && (
          <ProjectsAccordion selectedCenters={selectedCenters} mode="history" createdBy={currentUser?.username} />
        )}
        {subView === 'requirements' && (
          <RequestHistory selectedCenters={selectedCenters} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: errors about `selectedCenters` prop not existing on `RequestsIOpened` and `RequestHistory` — those are fixed in Task 3. Only those two errors are acceptable; no others.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/MainPage.tsx \
  client/src/components/main/panels/ApprovalRequestsPanel.tsx \
  client/src/components/main/panels/MyRequestsPanel.tsx \
  client/src/components/main/panels/HistoryPanel.tsx
git commit -m "feat: lift selectedCenters to MainPage and thread to all panels"
```

---

## Task 3: Center Filter — `RequestsIOpened` and `RequestHistory` Consumers

**Files:**
- Modify: `client/src/components/main/RequestsIOpened.tsx`
- Modify: `client/src/components/main/RequestHistory.tsx`

### Context

Both components need to accept `selectedCenters?: string[]` and use it to filter their demands by center. The `useDemands` hook accepts `centerName` in its filter params (comma-separated string for multiple centers). `useHistoryDemands` now accepts `{ centerName?: string }` after Task 1.

- [ ] **Step 1: Add `selectedCenters` to `RequestsIOpened`**

In `client/src/components/main/RequestsIOpened.tsx`:

Change the props interface from:
```tsx
interface RequestsIOpenedProps {
  createdBy: string;
}
```
to:
```tsx
interface RequestsIOpenedProps {
  createdBy: string;
  selectedCenters?: string[];
}
```

Change the component signature from:
```tsx
export const RequestsIOpened: React.FC<RequestsIOpenedProps> = ({ createdBy }) => {
```
to:
```tsx
export const RequestsIOpened: React.FC<RequestsIOpenedProps> = ({ createdBy, selectedCenters }) => {
```

Add this line directly before the `useDemands` call:
```tsx
  const centerName = selectedCenters && selectedCenters.length > 0 ? selectedCenters.join(',') : undefined;
```

Change the `useDemands` call from:
```tsx
  const { demands, isLoading, restoreDemand } = useDemands({ createdBy }, { page: 1, limit: 500 });
```
to:
```tsx
  const { demands, isLoading, restoreDemand } = useDemands({ createdBy, centerName }, { page: 1, limit: 500 });
```

- [ ] **Step 2: Add `selectedCenters` to `RequestHistory`**

In `client/src/components/main/RequestHistory.tsx`:

Change the component signature from:
```tsx
export default function RequestHistory() {
```
to:
```tsx
interface RequestHistoryProps {
  selectedCenters?: string[];
}

export default function RequestHistory({ selectedCenters }: RequestHistoryProps) {
```

Add this line before the `useHistoryDemands` call:
```tsx
  const centerName = selectedCenters && selectedCenters.length > 0 ? selectedCenters.join(',') : undefined;
```

Change the `useHistoryDemands` call from:
```tsx
  const { demands, isLoading, isFetchingMore, hasMore, sentinelRef } = useHistoryDemands();
```
to:
```tsx
  const { demands, isLoading, isFetchingMore, hasMore, sentinelRef } = useHistoryDemands({ centerName });
```

- [ ] **Step 3: Verify TypeScript compiles clean**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/main/RequestsIOpened.tsx \
  client/src/components/main/RequestHistory.tsx
git commit -m "feat: wire selectedCenters center filter into RequestsIOpened and RequestHistory"
```

---

## Task 4: Create + Edit + Cancel Demands in `RequestsIOpened`

**Files:**
- Modify: `client/src/components/main/RequestsIOpened.tsx`

### Context

`RequestsIOpened` currently only has `onRestore` wired. It needs a create button, edit modal, and cancel confirm dialog — the same pattern used in `RequirementsView`. The `useDemands` hook already exports `createDemand`, `updateDemand`, and `cancelDemand`; they just aren't destructured. `CreateDemandModal` is at `'../projects/CreateDemandModal'`.

- [ ] **Step 1: Add new imports**

At the top of `client/src/components/main/RequestsIOpened.tsx`, add these imports:

```tsx
import { MdAdd } from 'react-icons/md';
import CreateDemandModal from '../projects/CreateDemandModal';
import type { CreateDemandPayload, UpdateDemandPayload } from '../../api/types';
import type { Demand } from '../../types/domain';
```

(`Demand` is already imported — skip that line if it causes a duplicate.)

- [ ] **Step 2: Destructure new actions from `useDemands`**

Change:
```tsx
  const { demands, isLoading, restoreDemand } = useDemands({ createdBy, centerName }, { page: 1, limit: 500 });
```
to:
```tsx
  const { demands, isLoading, restoreDemand, createDemand, updateDemand, cancelDemand } = useDemands(
    { createdBy, centerName },
    { page: 1, limit: 500 }
  );
```

- [ ] **Step 3: Add new state variables**

After the existing `const [demandToRestore, setDemandToRestore] = useState<Demand | null>(null);` line, add:
```tsx
  const [isCreatingDemand, setIsCreatingDemand] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [demandToCancel, setDemandToCancel] = useState<Demand | null>(null);
```

- [ ] **Step 4: Add `handleSubmitDemand` and `confirmCancel` handlers**

After the existing `handleClearFilters` useCallback, add:
```tsx
  const handleSubmitDemand = useCallback(
    async (payload: CreateDemandPayload | UpdateDemandPayload, demandId?: number) => {
      if (demandId) {
        await updateDemand(demandId, payload as UpdateDemandPayload);
        setEditingDemand(null);
      } else {
        await createDemand(payload as CreateDemandPayload);
      }
    },
    [createDemand, updateDemand]
  );

  const confirmCancel = useCallback(async () => {
    if (!demandToCancel) return;
    const target = demandToCancel;
    setDemandToCancel(null);
    try {
      await cancelDemand(target.id);
      showToast(t('demands.cancelSuccess', 'הדרישה בוטלה'), 'success');
    } catch {
      showToast(t('demands.cancelError', 'שגיאה בביטול הדרישה'), 'error');
    }
  }, [demandToCancel, cancelDemand, showToast, t]);
```

- [ ] **Step 5: Add the "Add Requirement" button to the header**

Find the existing header div:
```tsx
        <div className="relative flex items-center justify-end gap-2 px-4 py-2 border-b border-divider">
```
Change to `dir="rtl"` and add the button before `<FilterSort`:
```tsx
        <div className="relative flex items-center gap-2 px-4 py-2 border-b border-divider" dir="rtl">
          <button
            onClick={() => setIsCreatingDemand(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity border-none cursor-pointer whitespace-nowrap"
          >
            <MdAdd size={15} />
            {t('requirements.addRequirement', '+ הוסף דרישה')}
          </button>
          <div className="flex-1" />
          <FilterSort
```

- [ ] **Step 6: Pass `onEdit` and `onCancel` to `DemandsTable`**

Find the `<DemandsTable` component. Add `onEdit` and `onCancel` props:
```tsx
        <DemandsTable
          demands={displayedItems}
          projectMap={projectMap}
          isLoading={isLoading}
          visibleColumns={MY_REQUESTS_COLUMNS}
          selectedDemand={selectedDemand}
          onSelectDemand={setSelectedDemand}
          onEdit={setEditingDemand}
          onCancel={setDemandToCancel}
          onRestore={handleRestore}
        />
```

- [ ] **Step 7: Add create, edit, and cancel modals/dialogs**

After the existing `</ConfirmDialog>` (the restore dialog), add:
```tsx
      {isCreatingDemand && (
        <CreateDemandModal
          isOpen={true}
          onClose={() => setIsCreatingDemand(false)}
          onSubmit={handleSubmitDemand}
          onCreated={() => setIsCreatingDemand(false)}
        />
      )}

      {editingDemand && (
        <CreateDemandModal
          isOpen={true}
          onClose={() => setEditingDemand(null)}
          onSubmit={handleSubmitDemand}
          editingDemand={editingDemand}
        />
      )}

      <ConfirmDialog
        isOpen={demandToCancel !== null}
        title={t('demands.cancelTitle', 'ביטול דרישה')}
        message={t('demands.cancelConfirm', 'לבטל דרישה זו?')}
        onConfirm={confirmCancel}
        onCancel={() => setDemandToCancel(null)}
        danger
      />
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add client/src/components/main/RequestsIOpened.tsx
git commit -m "feat: add create, edit, and cancel demand actions to RequestsIOpened"
```

---

## Task 5: Project Edit Form — Demands Section

**Files:**
- Modify: `client/src/components/projects/CreateProjectModal.tsx`

### Context

`CreateProjectModal` currently hides its entire inline requirements section in edit mode (`{!editingProject && ...}`). In edit mode, a "Demands" section replaces it. It fetches the project's existing demands via `fetchDemands` from `apiService`, displays them as read-only rows with Edit and Cancel action buttons, and stacks `CreateDemandModal` and `ConfirmDialog` on top for actions.

`Modal` uses `createPortal` to `document.body` at `z-50` — both `CreateProjectModal`'s own modal and any stacked `CreateDemandModal` portal to the same root, so DOM order controls z-level. The second portal to open will appear on top.

Terminal statuses that disable Edit/Cancel: `Approved`, `PartiallyApproved`, `ApprovedWithCondition`, `Rejected`, `CenterManagerRejected`, `Cancelled`.

- [ ] **Step 1: Add new imports**

At the top of `client/src/components/projects/CreateProjectModal.tsx`, change:
```tsx
import { useState, useMemo, useEffect } from 'react';
```
to:
```tsx
import { useState, useMemo, useEffect, useCallback } from 'react';
```

Change:
```tsx
import { createDemand } from '../../api/apiService';
```
to:
```tsx
import { createDemand, fetchDemands, updateDemand as apiUpdateDemand, cancelDemand as apiCancelDemand } from '../../api/apiService';
```

Change:
```tsx
import type { Project, ProjectType, Median } from '../../types/domain';
```
to:
```tsx
import type { Project, ProjectType, Median, Demand } from '../../types/domain';
```

Change:
```tsx
import type { CreateProjectPayload, UpdateProjectPayload, Priority } from '../../api/types';
```
to:
```tsx
import type { CreateProjectPayload, UpdateProjectPayload, Priority, UpdateDemandPayload } from '../../api/types';
```

After the `Modal` import line, add:
```tsx
import CreateDemandModal from './CreateDemandModal';
import ConfirmDialog from '../common/ConfirmDialog';
```

- [ ] **Step 2: Add the terminal-status constant**

Add this constant at module scope (above the `initialForm` constant):
```tsx
const TERMINAL_DEMAND_STATUSES = new Set([
  'Approved', 'PartiallyApproved', 'ApprovedWithCondition',
  'Rejected', 'CenterManagerRejected', 'Cancelled',
]);
```

- [ ] **Step 3: Add new state variables inside the component**

After the existing `const [error, setError] = useState<string | null>(null);` line, add:
```tsx
  // Edit-mode demands section state
  const [projectDemands, setProjectDemands] = useState<Demand[]>([]);
  const [isDemandSectionLoading, setIsDemandSectionLoading] = useState(false);
  const [isAddingDemand, setIsAddingDemand] = useState(false);
  const [editingDemandInProject, setEditingDemandInProject] = useState<Demand | null>(null);
  const [demandToCancel, setDemandToCancel] = useState<Demand | null>(null);
```

- [ ] **Step 4: Add `refreshProjectDemands` callback**

After the new state block, add:
```tsx
  const refreshProjectDemands = useCallback(async () => {
    if (!editingProject) return;
    setIsDemandSectionLoading(true);
    try {
      const res = await fetchDemands({ projectName: editingProject.name, page: 1, limit: 200 });
      setProjectDemands(res.data);
    } finally {
      setIsDemandSectionLoading(false);
    }
  }, [editingProject?.name]);
```

- [ ] **Step 5: Add useEffect to fetch demands when edit modal opens**

After the existing `useEffect` that populates the form (the one that depends on `[editingProject, isOpen]`), add:
```tsx
  useEffect(() => {
    if (!isOpen || !isEditMode || !editingProject) {
      setProjectDemands([]);
      return;
    }
    setIsDemandSectionLoading(true);
    fetchDemands({ projectName: editingProject.name, page: 1, limit: 200 })
      .then(res => setProjectDemands(res.data))
      .finally(() => setIsDemandSectionLoading(false));
  }, [isOpen, isEditMode, editingProject?.name]);
```

- [ ] **Step 6: Add `confirmCancelProjectDemand` handler**

After the `refreshProjectDemands` callback, add:
```tsx
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
```

- [ ] **Step 7: Reset new state in `handleClose`**

Find `handleClose`:
```tsx
  function handleClose() {
    if (isSubmitting) return;
    onClose();
    setForm(initialForm);
    setError(null);
    setInlineRequirements([]);
  }
```
Replace with:
```tsx
  function handleClose() {
    if (isSubmitting) return;
    onClose();
    setForm(initialForm);
    setError(null);
    setInlineRequirements([]);
    setProjectDemands([]);
    setIsAddingDemand(false);
    setEditingDemandInProject(null);
    setDemandToCancel(null);
  }
```

- [ ] **Step 8: Add the Demands section JSX in edit mode**

Find the existing inline requirements section:
```tsx
        {/* Inline Requirements Section — create mode only */}
        {!editingProject && (
```
Directly **before** this block (not replacing it), add the edit-mode demands section:
```tsx
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
```

- [ ] **Step 9: Add stacked modals and cancel confirm after the form's closing `</form>` tag**

Directly after `</form>` (before the closing `</Modal>`), add:
```tsx
        {isAddingDemand && (
          <CreateDemandModal
            isOpen={true}
            onClose={() => setIsAddingDemand(false)}
            onSubmit={async () => {}}
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
```

- [ ] **Step 10: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add client/src/components/projects/CreateProjectModal.tsx
git commit -m "feat: add edit-mode demands section to CreateProjectModal with add/edit/cancel actions"
```

---

## Task 6: Manual Verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify Center Filter — admin/moderator sees it everywhere**

1. Log in as `admin1` (or `mod1`).
2. Confirm a **Center Filter** bar appears between the top nav tabs and every panel's content.
3. Select one center — confirm Projects accordion, Requirements table, My Requests, and History all filter to that center.
4. Switch tabs — confirm the selected center persists.

- [ ] **Step 3: Verify Center Filter — regular user/CM does NOT see it**

1. Log in as `user1` (REGULAR_USER) or `cm1` (CENTER_MANAGER).
2. Confirm no Center Filter bar is visible anywhere.

- [ ] **Step 4: Verify Create Requirement in My Requests**

1. Log in as `user1`.
2. Navigate to **My Requests → Requirements** tab.
3. Confirm an "הוסף דרישה" button appears in the table header.
4. Click it — confirm `CreateDemandModal` opens.
5. Fill and submit — confirm a success toast appears and the demand appears in the list.

- [ ] **Step 5: Verify Edit + Cancel in My Requests**

1. In My Requests → Requirements, find a pending demand.
2. Click its **Edit** action button — confirm `CreateDemandModal` opens pre-filled.
3. Modify a value and save — confirm the change appears.
4. Click its **Cancel** action button — confirm `ConfirmDialog` appears.
5. Confirm cancel — confirm the demand disappears from the active list.

- [ ] **Step 6: Verify Project Edit Form demands section**

1. Navigate to any panel showing projects.
2. Click **Edit** on a project that has demands.
3. Confirm a "דרישות" section appears below the project form fields listing existing demands.
4. Click **הוסף דרישה** — confirm `CreateDemandModal` opens stacked above.
5. Create a demand — confirm it appears in the list after the modal closes.
6. Click **ערוך** on a pending demand — confirm `CreateDemandModal` opens with the demand pre-filled.
7. Click **בטל** on a pending demand — confirm `ConfirmDialog` appears; confirm the cancel.
8. Verify terminal-status demands have disabled Edit/Cancel buttons.

---

## Task 7: WORK_LOG Update

**Files:**
- Modify: `WORK_LOG.md`

- [ ] **Step 1: Append sprint entry**

Add to the end of `WORK_LOG.md`:

```markdown
---

## Sub-Project A: Bug Fixes

Branch: `feature/sub-project-a-bug-fixes`
Started: 2026-06-01

| Task | Area | Status |
|------|------|--------|
| 1 | apiService + useHistoryDemands center filter plumbing | ✅ Done |
| 2 | MainPage + panel prop threading | ✅ Done |
| 3 | RequestsIOpened + RequestHistory center filter consumers | ✅ Done |
| 4 | Create/Edit/Cancel in RequestsIOpened | ✅ Done |
| 5 | Project edit form demands section | ✅ Done |

### 2026-06-01

**feature/sub-project-a-bug-fixes**
- `fetchDemandHistory`: added `centerName` query param
- `useHistoryDemands`: accepts `{ centerName? }` filter; resets and re-fetches when filter changes
- `MainPage`: owns `selectedCenters` state; renders global `CenterFilter` bar for admin/moderator only; passes to all three panels
- `ApprovalRequestsPanel`: removed local center state and CenterFilter render; accepts `selectedCenters` prop; ResourceSummaryStrip kept
- `MyRequestsPanel`, `HistoryPanel`: accept and thread `selectedCenters` to sub-components
- `RequestsIOpened`: added `selectedCenters` filter; added create/edit/cancel demand actions mirroring RequirementsView
- `RequestHistory`: added `selectedCenters` filter via `useHistoryDemands`
- `CreateProjectModal`: added edit-mode demands section — fetches project demands, lists them with Edit/Cancel per row, stacks `CreateDemandModal` and `ConfirmDialog` for actions
```

- [ ] **Step 2: Commit**

```bash
git add WORK_LOG.md
git commit -m "docs: update work log for Sub-project A bug fixes"
```
