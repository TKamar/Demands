# UI Redesign — Unified Main Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sidebar-based layout and separate Projects/Demands/Management pages with a single top-bar layout and a unified MainPage containing two tab views.

**Architecture:** A new `TopBar` replaces the `Sidebar`. A new `MainPage` owns two tabs ("Projects & Requirements" and "Requirements") with shared center-filter and resource-summary state. The Management page is deleted — bulk decisions move into the Requirements tab and capacity/wallet management moves into Settings.

**Tech Stack:** React 18, TypeScript, Vite, react-router-dom v6, react-oidc-context, react-i18next, Tailwind CSS (custom tokens), react-icons/md

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| **Create** | `client/src/components/layout/TopBar.tsx` | Logo, role icon (crown/cog), username, dropdown (Profile, Logout, Settings) |
| **Modify** | `client/src/components/layout/Layout.tsx` | Remove Sidebar; render TopBar + full-width Outlet |
| **Modify** | `client/src/App.tsx` | Remove navSections/userProfile build; pass userProfile to TopBar via context or props; update routes |
| **Create** | `client/src/pages/MainPage.tsx` | Two tabs + shared centerFilter + resourceSummaryOpen state |
| **Create** | `client/src/components/main/CenterFilter.tsx` | Multiselect center dropdown (controlled) |
| **Create** | `client/src/components/main/ResourceSummaryStrip.tsx` | Collapsible resource chips row |
| **Create** | `client/src/components/main/RequirementsView.tsx` | Wraps DemandsTable; adds bulk action bar for mod/admin |
| **Create** | `client/src/components/main/ProjectsAccordion.tsx` | Accordion project rows + inline demands sub-table |
| **Modify** | `client/src/pages/SettingsPage.tsx` | Add Capacity + Wallets tabs; show by role |
| **Delete** | `client/src/pages/ProjectsPage.tsx` | Replaced by MainPage |
| **Delete** | `client/src/pages/DemandsPage.tsx` | Replaced by MainPage |
| **Delete** | `client/src/pages/ManagementPage.tsx` | Absorbed into Requirements tab + Settings |
| **Delete** | `client/src/components/layout/Sidebar.tsx` | Replaced by TopBar |

---

## Task 1: TopBar component

**Files:**
- Create: `client/src/components/layout/TopBar.tsx`

- [ ] **Step 1: Create the file**

```tsx
// client/src/components/layout/TopBar.tsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'react-oidc-context';
import { MdStorage, MdPersonOutline, MdLogout, MdExpandMore, MdSettings } from 'react-icons/md';
import { GiQueenCrown } from 'react-icons/gi';
import { MdOutlineSettings } from 'react-icons/md';
import type { UserProfile } from '../../types/navigation';
import LanguageSwitcher from '../LanguageSwitcher';

interface TopBarProps {
  userProfile: UserProfile;
}

export default function TopBar({ userProfile }: TopBarProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const isAdmin = userProfile.role.toLowerCase() === 'admin';
  const isModerator = userProfile.role.toLowerCase() === 'moderator';
  const hasSettingsAccess = isAdmin || isModerator;

  return (
    <header className="h-14 bg-bg-paper border-b border-divider flex items-center justify-between px-6 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <MdStorage size={20} className="text-white" />
        </div>
        <span className="text-base font-bold text-text-primary">{t('app.title')}</span>
      </div>

      {/* Right side: language + role icon + user */}
      <div className="flex items-center gap-4">
        <LanguageSwitcher />

        {/* Role icon — clicking navigates to settings */}
        {hasSettingsAccess && (
          <button
            onClick={() => navigate('/settings')}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
            title={t('nav.settings', 'Settings')}
          >
            {isAdmin ? (
              <GiQueenCrown size={20} className="text-amber-500" />
            ) : (
              <MdOutlineSettings size={20} />
            )}
          </button>
        )}

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-100 transition-colors bg-transparent border-none cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center">
              <MdPersonOutline size={18} />
            </div>
            <span className="text-sm font-medium text-text-primary max-w-[140px] truncate">
              {userProfile.name}
            </span>
            <MdExpandMore
              size={18}
              className={`text-text-secondary transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {menuOpen && (
            <div className="absolute end-0 top-full mt-1 w-44 bg-bg-paper rounded-xl shadow-lg border border-divider overflow-hidden z-[9999]">
              <button
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-text-primary hover:bg-gray-50 transition-colors bg-transparent border-none cursor-pointer text-start"
              >
                <MdPersonOutline size={18} />
                {t('user.profile')}
              </button>
              <button
                onClick={() => { setMenuOpen(false); auth.signoutRedirect(); }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-danger hover:bg-gray-50 transition-colors bg-transparent border-none cursor-pointer text-start"
              >
                <MdLogout size={18} />
                {t('user.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Check `GiQueenCrown` is available**

Run: `grep -r "react-icons" client/package.json`

If `react-icons` is already a dependency (it is — `MdStorage` is used in Sidebar), no install needed. `GiQueenCrown` is in the `gi` set. If you prefer staying in `md`, replace with `MdWorkspacePremium` or any suitable icon.

- [ ] **Step 3: Type-check**

Run: `cd client && npx tsc --noEmit`

Expected: No errors (TopBar not yet imported anywhere).

---

## Task 2: Update Layout.tsx

**Files:**
- Modify: `client/src/components/layout/Layout.tsx`

- [ ] **Step 1: Replace Layout.tsx content**

```tsx
// client/src/components/layout/Layout.tsx
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import type { UserProfile } from '../../types/navigation';

interface LayoutProps {
  userProfile: UserProfile;
}

export default function Layout({ userProfile }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-bg-default">
      {/* Top accent bar */}
      <div className="h-1 bg-topbar shrink-0" />
      <TopBar userProfile={userProfile} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx to match new Layout props**

In `client/src/App.tsx`, the `<Layout>` element currently receives `navSections` and `userProfile`. Remove `navSections`:

Find this block:
```tsx
<Route
  element={
    <Layout navSections={navSections} userProfile={userProfile} />
  }
>
```

Replace with:
```tsx
<Route element={<Layout userProfile={userProfile} />}>
```

Also remove the `getNavItems` function, `navSections` variable, and unused imports (`MdFolder`, `MdDescription`, `MdRemoveRedEye`, `MdSettings`, `MdAddCircleOutline`, `NavSection`).

The simplified App.tsx `AppContent` function after cleanup:

```tsx
function AppContent() {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  useAuthToken();

  useEffect(() => {
    const dir = i18n.language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', i18n.language);
    document.title = t('app.title');
  }, [i18n.language, t]);

  useEffect(() => {
    if (!auth.isAuthenticated && !auth.isLoading && !auth.activeNavigator) {
      auth.signinRedirect();
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.activeNavigator, auth.signinRedirect]);

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('auth.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md p-6">
          <div className="text-red-600 mb-4">
            <p className="text-xl font-semibold">{t('auth.error', 'Authentication Error')}</p>
          </div>
          <p className="text-gray-600 mb-4">{auth.error.message}</p>
          <button
            onClick={() => auth.signinRedirect()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('auth.retry', 'Try Again')}
          </button>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) return null;

  const userProfile: UserProfile = {
    name: `${auth.user?.profile.given_name || ''} ${auth.user?.profile.family_name || ''}`.trim() || auth.user?.profile.email || 'User',
    role: (auth.user?.profile.groups as string[])?.[0] || 'user',
  };

  return (
    <BrowserRouter>
      <GlobalModals />
      <Routes>
        <Route element={<Layout userProfile={userProfile} />}>
          <Route index element={<Navigate to="/projects" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/demands" element={<DemandsPage />} />
          <Route path="/management" element={<ManagementPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

Note: ProjectsPage, DemandsPage, ManagementPage still imported — they will be replaced in later tasks.

- [ ] **Step 3: Type-check**

Run: `cd client && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 4: Start dev server and verify**

Run: `npm run dev:client`

Open the app. You should see: top accent bar → TopBar (logo + username) → full-width page content. The sidebar is gone. Navigate to /projects, /demands, /settings — all should load.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/layout/TopBar.tsx client/src/components/layout/Layout.tsx client/src/App.tsx
git commit -m "feat(client): replace sidebar with TopBar, update Layout to full-width"
```

---

## Task 3: MainPage.tsx — skeleton with tabs and shared state

**Files:**
- Create: `client/src/pages/MainPage.tsx`
- Create: `client/src/components/main/` (directory)

- [ ] **Step 1: Create the main directory and MainPage skeleton**

```tsx
// client/src/pages/MainPage.tsx
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useModal } from '../contexts/ModalContext';
import { MdAdd, MdSearch } from 'react-icons/md';

type MainTab = 'projects' | 'requirements';

export default function MainPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openModal } = useModal();

  const initialTab: MainTab =
    searchParams.get('tab') === 'requirements' ? 'requirements' : 'projects';

  const [activeTab, setActiveTab] = useState<MainTab>(initialTab);
  const [selectedCenters, setSelectedCenters] = useState<string[]>([]);
  const [resourceSummaryOpen, setResourceSummaryOpen] = useState(false);

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'requirements' ? { tab: 'requirements' } : {}, { replace: true });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-divider bg-bg-paper px-6">
        {(['projects', 'requirements'] as MainTab[]).map((tab) => {
          const label =
            tab === 'projects'
              ? t('main.tabs.projects', 'Projects & Requirements')
              : t('main.tabs.requirements', 'Requirements');
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-5 py-3 text-sm font-medium transition-colors relative cursor-pointer border-none bg-transparent outline-none whitespace-nowrap ${
                activeTab === tab
                  ? 'text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Center filter + resource summary strip placeholder */}
      <div className="bg-bg-paper border-b border-divider px-6 py-3">
        <p className="text-xs text-text-secondary italic">
          Center filter + resource summary — Task 4 & 5
        </p>
      </div>

      {/* Search + create buttons */}
      <div className="flex items-center gap-3 px-6 py-3 bg-bg-paper border-b border-divider">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-divider rounded-lg bg-bg-default cursor-not-allowed opacity-60">
          <MdSearch size={16} className="text-text-secondary" />
          <span className="text-sm text-text-secondary">
            {t('main.search.placeholder', 'Search… (coming soon)')}
          </span>
        </div>
        <button
          onClick={() => openModal('project')}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity border-none cursor-pointer whitespace-nowrap"
        >
          <MdAdd size={16} />
          {t('main.actions.newProject', 'New Project')}
        </button>
        <button
          onClick={() => openModal('demand')}
          className="flex items-center gap-1.5 px-4 py-2 border border-primary text-primary text-sm font-medium rounded-lg hover:bg-primary-light transition-colors bg-transparent cursor-pointer whitespace-nowrap"
        >
          <MdAdd size={16} />
          {t('main.actions.newRequirement', 'New Requirement')}
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'projects' ? (
          <div className="text-sm text-text-secondary italic">
            Projects accordion — Task 7
          </div>
        ) : (
          <div className="text-sm text-text-secondary italic">
            Requirements table — Task 6
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire MainPage into App.tsx routes**

In `client/src/App.tsx`, add import and replace the `/projects` route:

```tsx
import MainPage from './pages/MainPage';
```

Change:
```tsx
<Route path="/projects" element={<ProjectsPage />} />
<Route path="/demands" element={<DemandsPage />} />
<Route path="/management" element={<ManagementPage />} />
```

To:
```tsx
<Route path="/projects" element={<MainPage />} />
<Route path="/demands" element={<Navigate to="/projects?tab=requirements" replace />} />
<Route path="/management" element={<Navigate to="/projects" replace />} />
```

Keep `ProjectsPage`, `DemandsPage`, `ManagementPage` imports for now — they'll be removed in the cleanup task.

- [ ] **Step 3: Type-check**

Run: `cd client && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 4: Browser verify**

Navigate to `/projects` → see tabs, search bar, create buttons. Navigate to `/demands` → redirects to `/projects?tab=requirements` and Requirements tab is active. Navigate to `/management` → redirects to `/projects`.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/MainPage.tsx client/src/App.tsx
git commit -m "feat(client): scaffold MainPage with tabs, search bar, create buttons; update routes"
```

---

## Task 4: CenterFilter component

**Files:**
- Create: `client/src/components/main/CenterFilter.tsx`

- [ ] **Step 1: Create CenterFilter.tsx**

```tsx
// client/src/components/main/CenterFilter.tsx
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdExpandMore } from 'react-icons/md';
import { fetchCenters } from '../../api/apiService';
import type { ReferenceItem } from '../../api/types';

interface CenterFilterProps {
  selectedCenters: string[];
  onChange: (centers: string[]) => void;
}

export default function CenterFilter({ selectedCenters, onChange }: CenterFilterProps) {
  const { t } = useTranslation();
  const [centers, setCenters] = useState<ReferenceItem[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCenters().then(setCenters).catch(console.error);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const allSelected = selectedCenters.length === 0;

  const toggleCenter = (name: string) => {
    if (selectedCenters.includes(name)) {
      onChange(selectedCenters.filter((c) => c !== name));
    } else {
      onChange([...selectedCenters, name]);
    }
  };

  const selectAll = () => onChange([]);

  const label = allSelected
    ? t('centerFilter.all', 'All Centers')
    : selectedCenters.length === 1
    ? centers.find((c) => c.name === selectedCenters[0])?.displayName || selectedCenters[0]
    : t('centerFilter.count', '{{count}} centers', { count: selectedCenters.length });

  return (
    <div className="relative flex items-center gap-2" ref={containerRef}>
      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap">
        {t('centerFilter.label', 'Center')}
      </span>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-divider rounded-lg bg-bg-paper text-sm text-text-primary hover:border-primary transition-colors cursor-pointer min-w-[140px] text-start"
      >
        <span className="flex-1 truncate">{label}</span>
        <MdExpandMore
          size={16}
          className={`text-text-secondary transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute start-0 top-full mt-1 w-52 bg-bg-paper rounded-xl shadow-lg border border-divider overflow-hidden z-[200] py-1" style={{ insetInlineStart: '56px' }}>
          {/* Select All */}
          <button
            onClick={selectAll}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition-colors bg-transparent border-none cursor-pointer text-start"
          >
            <input
              type="checkbox"
              readOnly
              checked={allSelected}
              className="w-3.5 h-3.5 accent-primary"
            />
            <span className="text-text-primary font-medium">{t('centerFilter.selectAll', 'All Centers')}</span>
          </button>
          <div className="h-px bg-divider mx-2 my-1" />
          {centers.map((center) => (
            <button
              key={center.name}
              onClick={() => toggleCenter(center.name)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 transition-colors bg-transparent border-none cursor-pointer text-start"
            >
              <input
                type="checkbox"
                readOnly
                checked={selectedCenters.includes(center.name)}
                className="w-3.5 h-3.5 accent-primary"
              />
              <span className="text-text-primary">{center.displayName || center.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Check ReferenceItem type**

Run: `grep -n "ReferenceItem" client/src/api/types.ts`

If not exported, check what `fetchCenters()` returns and adjust the import. `fetchCenters` returns `Promise<ReferenceItem[]>` per line 250 of apiService.ts.

- [ ] **Step 3: Wire CenterFilter into MainPage**

In `client/src/pages/MainPage.tsx`, replace the center filter placeholder:

Add import:
```tsx
import CenterFilter from '../components/main/CenterFilter';
```

Replace:
```tsx
{/* Center filter + resource summary strip placeholder */}
<div className="bg-bg-paper border-b border-divider px-6 py-3">
  <p className="text-xs text-text-secondary italic">
    Center filter + resource summary — Task 4 & 5
  </p>
</div>
```

With:
```tsx
<div className="bg-bg-paper border-b border-divider px-6 py-3 flex items-center gap-4 flex-wrap">
  <CenterFilter selectedCenters={selectedCenters} onChange={setSelectedCenters} />
  <p className="text-xs text-text-secondary italic">Resource summary — Task 5</p>
</div>
```

- [ ] **Step 4: Type-check and browser verify**

Run: `cd client && npx tsc --noEmit`

In browser, open the center filter dropdown. All centers from the API should appear with checkboxes. Selecting centers updates the button label.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/main/CenterFilter.tsx client/src/pages/MainPage.tsx
git commit -m "feat(client): add CenterFilter multiselect component to MainPage"
```

---

## Task 5: ResourceSummaryStrip component

**Files:**
- Create: `client/src/components/main/ResourceSummaryStrip.tsx`

- [ ] **Step 1: Create ResourceSummaryStrip.tsx**

```tsx
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
  resourceKey: string; // "serviceName/resourceName"
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
            unit: cap.resource?.unit ?? '',
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
    for (const wallet of relevantWallets) {
      const cap = wallet.capacity;
      if (!cap) continue;
      const key = `${cap.resourceService}/${cap.resourceName}`;
      // wallet.value = what was allocated to this center (the "total" for them)
      // We don't have center-specific consumed demand here, so use capacity.allocated as proxy
      const existing = byResource.get(key);
      const allocated = capacities.find((c) => c.id === wallet.capacityId)?.allocated ?? 0;
      if (existing) {
        existing.total += wallet.value;
        existing.allocated += allocated;
        existing.remaining += Math.max(0, wallet.value - allocated);
      } else {
        byResource.set(key, {
          resourceKey: key,
          resourceName: cap.resourceName,
          unit: '',
          total: wallet.value,
          allocated,
          remaining: Math.max(0, wallet.value - allocated),
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
          <span className="text-text-secondary">{t('resourceSummary.total', 'Total')}</span>
          <span className="font-semibold text-text-primary">{s.total.toLocaleString()}{s.unit ? ` ${s.unit}` : ''}</span>
          <span className="text-text-secondary">·</span>
          <span className="text-amber-600 font-medium">{s.allocated.toLocaleString()}{s.unit ? ` ${s.unit}` : ''}</span>
          <span className="text-text-secondary">·</span>
          <span className="text-green-600 font-medium">{s.remaining.toLocaleString()}{s.unit ? ` ${s.unit}` : ''}</span>
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
```

- [ ] **Step 2: Wire ResourceSummaryStrip into MainPage**

Add import:
```tsx
import ResourceSummaryStrip from '../components/main/ResourceSummaryStrip';
```

Replace the placeholder in the center-filter row:
```tsx
{/* Before */}
<p className="text-xs text-text-secondary italic">Resource summary — Task 5</p>

{/* After */}
<ResourceSummaryStrip
  selectedCenters={selectedCenters}
  open={resourceSummaryOpen}
  onToggle={() => setResourceSummaryOpen(!resourceSummaryOpen)}
/>
```

- [ ] **Step 3: Type-check**

Run: `cd client && npx tsc --noEmit`

If `cap.resource?.unit` causes an error, check the `Capacity` type. If `resource` is not on the type, just use `''` for unit:
```tsx
unit: '',
```

- [ ] **Step 4: Browser verify**

Expand the resource strip. Chips should appear for each resource type with Total/Allocated/Remaining. Select a specific center — numbers should update.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/main/ResourceSummaryStrip.tsx client/src/pages/MainPage.tsx
git commit -m "feat(client): add ResourceSummaryStrip collapsible chips to MainPage"
```

---

## Task 6: RequirementsView component

**Files:**
- Create: `client/src/components/main/RequirementsView.tsx`

> **Key signatures** (confirmed from source):
> - `useDemands(filters: DemandFilterParams, pagination: PaginationParams)` — two separate args, returns `{ demands, isLoading, total, totalPages, approveDemand, rejectDemand, bulkApproveDemands, bulkRejectDemands, ... }`
> - `DemandsTable` props: `demands, projectMap: Map<string,Project>, visibleColumns: ColumnConfig<DemandColumnKey>[], onSelectDemand, onEdit?, onCancel?, onMakeDecision?, isModerator?, showCheckboxes?, selectedIds?: Set<number>, onToggleSelect?, isAllPageSelected?, onSelectAllPage?`
> - `DemandDetailSidebar` props: `demand: Demand|null, project: Project|null, isOpen: boolean, onClose, onEdit?, onCancel?, isModerator?, onMakeDecision?`
> - `BulkDecisionModal` props: `open: boolean, onClose, onApprove: (payload) => Promise<void>, onReject: (payload) => Promise<void>, selectedCount: number, isLoading?`

- [ ] **Step 1: Read the existing DemandsPage and ManagementPage as templates**

Run: `cat client/src/pages/DemandsPage.tsx`
Run: `cat client/src/pages/ManagementPage.tsx`

`RequirementsView` is a merge of these two pages turned into a component. `DemandsPage` provides the full table/filter/sort setup. `ManagementPage` provides the bulk decision pattern (checkbox selection, bulk approve/reject via `useDemands`'s `bulkApproveDemands`/`bulkRejectDemands`).

- [ ] **Step 2: Create RequirementsView.tsx**

Start from `DemandsPage.tsx` content. Key differences from DemandsPage:
1. It's a component (not a page) — receives `selectedCenters: string[]` prop
2. Center filter is driven from outside: inject `center: selectedCenters.join(',')` into the effective filters
3. Add bulk decision state and bulk action bar (taken from ManagementPage patterns)
4. Remove `PageHeader` (the main page provides layout)

```tsx
// client/src/components/main/RequirementsView.tsx
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'react-oidc-context';
import DemandsTable, { demandColumnConfig, type DemandColumnKey } from '../projects/DemandsTable';
import DemandDetailSidebar from '../demands/DemandDetailSidebar';
import ColumnSettingsDropdown from '../common/ColumnSettingsDropdown';
import { FilterSort } from '../common/filters';
import BulkDecisionModal from '../management/BulkDecisionModal';
import CreateDemandModal from '../projects/CreateDemandModal';
import DecisionModal from '../management/DecisionModal';
import { useDemands } from '../../hooks/useDemands';
import { useCachedProjects } from '../../hooks/useCachedProjects';
import { useReferenceData } from '../../hooks/useReferenceData';
import { useDebounce } from '../../hooks/useDebounce';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { useTableColumns } from '../../hooks/useTableColumns';
import { useToast } from '../common/Toast';
import Pagination from '../common/Pagination';
import {
  demandFilterGroups,
  demandSortOptions,
  initialDemandFilters,
  type DemandFilterKey,
  type DemandSortKey,
} from '../../configs/demandFilters';
import type { ApproveDemandPayload, RejectDemandPayload } from '../../api/types';
import type { Demand, Project } from '../../types/domain';
import type { SortState } from '../../types/filter';

interface RequirementsViewProps {
  selectedCenters: string[];
}

export default function RequirementsView({ selectedCenters }: RequirementsViewProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const { showToast } = useToast();
  const role = (auth.user?.profile.groups as string[])?.[0]?.toLowerCase() || 'user';
  const isModerator = role === 'admin' || role === 'moderator';

  const { orderedVisibleColumns, allColumns, toggleColumn, reorderColumns, resetToDefaults } =
    useTableColumns<DemandColumnKey>({ tableId: 'demands', columns: demandColumnConfig });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filters, setFilters] = useState<Record<DemandFilterKey, string>>(initialDemandFilters);
  const [sortState, setSortState] = useState<SortState<DemandSortKey>>({ field: null, direction: 'asc' });

  // Demand detail / edit state
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [decidingDemand, setDecidingDemand] = useState<Demand | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isAllAcrossPagesSelected, setIsAllAcrossPages] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('approve');

  const debouncedFilters = useDebounce(filters, 300);
  const effectiveFilters = useMemo(() => ({
    ...debouncedFilters,
    ...(selectedCenters.length > 0 ? { center: selectedCenters.join(',') } : {}),
  }), [debouncedFilters, selectedCenters]);

  const {
    demands, isLoading, total, totalPages, totalValue, totalApprovedValue,
    approveDemand, rejectDemand, bulkApproveDemands, bulkRejectDemands,
  } = useDemands(effectiveFilters, { page: currentPage, limit: itemsPerPage });

  const showLoading = useDelayedLoading(isLoading);
  const { projects } = useCachedProjects();
  const { bases, environments, networks, clusters, centers, branches, sections, services } = useReferenceData();

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.name, p])),
    [projects]
  );

  const filterGroupsWithOptions = useMemo(() => {
    // Mirror the same options build as DemandsPage
    const opt = (arr: { name: string; displayName?: string }[]) =>
      arr.map((x) => ({ value: x.name, label: x.displayName || x.name }));
    return demandFilterGroups.map((group) => ({
      ...group,
      fields: group.fields.map((field) => ({
        ...field,
        options:
          field.key === 'projectName' ? projects.map((p) => ({ value: p.name, label: p.name }))
          : field.key === 'base' ? opt(bases)
          : field.key === 'environment' ? opt(environments)
          : field.key === 'network' ? opt(networks)
          : field.key === 'cluster' ? opt(clusters)
          : field.key === 'center' ? opt(centers)
          : field.key === 'branch' ? opt(branches)
          : field.key === 'section' ? opt(sections)
          : field.key === 'service' ? opt(services)
          : field.options || [],
      })),
    }));
  }, [projects, bases, environments, networks, clusters, centers, branches, sections, services]);

  const handleFilterChange = useCallback((key: DemandFilterKey, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((field: DemandSortKey, direction: 'asc' | 'desc') => {
    setSortState({ field, direction });
    setCurrentPage(1);
  }, []);

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const isAllPageSelected = demands.length > 0 && demands.every((d) => selectedIds.has(d.id));
  const isSomePageSelected = demands.some((d) => selectedIds.has(d.id));

  const handleSelectAllPage = useCallback((checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      demands.forEach((d) => checked ? next.add(d.id) : next.delete(d.id));
      return next;
    });
  }, [demands]);

  const handleBulkApprove = async (payload: ApproveDemandPayload) => {
    await bulkApproveDemands({
      ids: isAllAcrossPagesSelected ? undefined : Array.from(selectedIds),
      ...(isAllAcrossPagesSelected ? { filters: effectiveFilters } : {}),
      status: payload.status,
      approvedValue: payload.approvedValue,
    });
    setSelectedIds(new Set());
    setIsAllAcrossPages(false);
    setBulkModalOpen(false);
    showToast(t('management.bulkApproveSuccess', 'Demands approved'), 'success');
  };

  const handleBulkReject = async (payload: RejectDemandPayload) => {
    await bulkRejectDemands({
      ids: isAllAcrossPagesSelected ? undefined : Array.from(selectedIds),
      ...(isAllAcrossPagesSelected ? { filters: effectiveFilters } : {}),
      reason: payload.reason,
    });
    setSelectedIds(new Set());
    setIsAllAcrossPages(false);
    setBulkModalOpen(false);
    showToast(t('management.bulkRejectSuccess', 'Demands rejected'), 'success');
  };

  const handleMakeDecision = useCallback((demand: Demand) => {
    setDecidingDemand(demand);
    const proj = projectMap.get(demand.projectName) ?? null;
    setSelectedProject(proj);
  }, [projectMap]);

  return (
    <div className="flex flex-col gap-4">
      <FilterSort
        filterGroups={filterGroupsWithOptions}
        sortOptions={demandSortOptions}
        filters={filters}
        sortState={sortState}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        onClearFilters={() => { setFilters(initialDemandFilters); setCurrentPage(1); }}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isModerator && selectedIds.size > 0 && (
            <>
              <button
                onClick={() => { setBulkAction('approve'); setBulkModalOpen(true); }}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 border-none cursor-pointer"
              >
                {t('management.bulkApprove', 'Bulk Approve')} ({selectedIds.size})
              </button>
              <button
                onClick={() => { setBulkAction('reject'); setBulkModalOpen(true); }}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 border-none cursor-pointer"
              >
                {t('management.bulkReject', 'Bulk Reject')} ({selectedIds.size})
              </button>
            </>
          )}
        </div>
        <ColumnSettingsDropdown
          columns={allColumns}
          onToggle={toggleColumn}
          onReorder={reorderColumns}
          onReset={resetToDefaults}
        />
      </div>

      <DemandsTable
        demands={demands}
        projectMap={projectMap}
        isLoading={showLoading}
        visibleColumns={orderedVisibleColumns}
        selectedDemand={selectedDemand}
        onSelectDemand={(demand) => {
          setSelectedDemand(demand);
          setSelectedProject(projectMap.get(demand.projectName) ?? null);
        }}
        onEdit={setEditingDemand}
        onCancel={undefined}
        onMakeDecision={isModerator ? handleMakeDecision : undefined}
        isModerator={isModerator}
        totalValue={totalValue}
        totalApprovedValue={totalApprovedValue}
        showCheckboxes={isModerator}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        isAllPageSelected={isAllPageSelected}
        isSomePageSelected={isSomePageSelected}
        onSelectAllPage={handleSelectAllPage}
        isAllAcrossPagesSelected={isAllAcrossPagesSelected}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {selectedDemand && (
        <DemandDetailSidebar
          demand={selectedDemand}
          project={selectedProject}
          isOpen={!!selectedDemand}
          onClose={() => setSelectedDemand(null)}
          onEdit={setEditingDemand}
          isModerator={isModerator}
          onMakeDecision={isModerator ? handleMakeDecision : undefined}
        />
      )}

      {editingDemand && (
        <CreateDemandModal
          demand={editingDemand}
          onClose={() => setEditingDemand(null)}
          onSuccess={() => setEditingDemand(null)}
        />
      )}

      {decidingDemand && (
        <DecisionModal
          open={!!decidingDemand}
          demand={decidingDemand}
          onClose={() => setDecidingDemand(null)}
          onApprove={async (payload) => {
            await (useDemands as any); // approveDemand is on useDemands — read ManagementPage for the pattern
          }}
          onReject={async (payload) => {
            await (useDemands as any);
          }}
        />
      )}

      {bulkModalOpen && (
        <BulkDecisionModal
          open={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          onApprove={handleBulkApprove}
          onReject={handleBulkReject}
          selectedCount={isAllAcrossPagesSelected ? total : selectedIds.size}
        />
      )}
    </div>
  );
}
```

> **Important:** The `DecisionModal` `onApprove`/`onReject` handlers need to call `approveDemand`/`rejectDemand` from `useDemands`. Read `client/src/pages/ManagementPage.tsx` lines 1–100 to see the exact pattern used there for single demand approval — mirror that in the `onApprove`/`onReject` callbacks above.

- [ ] **Step 3: Wire RequirementsView into MainPage**

Add import:
```tsx
import RequirementsView from '../components/main/RequirementsView';
```

Replace the Requirements tab placeholder:
```tsx
{/* Before */}
{activeTab === 'requirements' && (
  <div className="text-sm text-text-secondary italic">Requirements table — Task 6</div>
)}

{/* After */}
{activeTab === 'requirements' && (
  <RequirementsView selectedCenters={selectedCenters} />
)}
```

- [ ] **Step 4: Type-check**

Run: `cd client && npx tsc --noEmit`

Fix any type errors. The most likely issues are: `SortState` field type (check `SortState<DemandSortKey>` vs how `FilterSort` expects sort state), and bulk payload shapes — check `BulkApproveDemandPayload` in `client/src/api/types.ts`.

- [ ] **Step 5: Browser verify**

Navigate to `/projects?tab=requirements`. The full demands table with filters, sort, column toggle should appear. As moderator/admin, checkboxes appear; selecting rows shows Bulk Approve/Reject buttons.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/main/RequirementsView.tsx client/src/pages/MainPage.tsx
git commit -m "feat(client): add RequirementsView tab with full demands table and bulk decisions"
```

---

## Task 7: ProjectsAccordion component

**Files:**
- Create: `client/src/components/main/ProjectsAccordion.tsx`

- [ ] **Step 1: Read the existing ProjectsTable and useProjects hook**

Run: `cat client/src/components/projects/ProjectsTable.tsx | head -60`
Run: `cat client/src/hooks/useProjects.ts`

Note the `Project` type shape and what `useProjects` returns.

- [ ] **Step 2: Create ProjectsAccordion.tsx**

```tsx
// client/src/components/main/ProjectsAccordion.tsx
import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'react-oidc-context';
import { MdExpandMore, MdChevronRight, MdEdit, MdDelete, MdContentCopy } from 'react-icons/md';
import { useProjects } from '../../hooks/useProjects';
import { useDemands } from '../../hooks/useDemands';
import { useTableColumns } from '../../hooks/useTableColumns';
import ColumnSettingsDropdown from '../common/ColumnSettingsDropdown';
import PriorityBadge from '../projects/PriorityBadge';
import StatusBadge from '../projects/StatusBadge';
import DemandDetailSidebar from '../demands/DemandDetailSidebar';
import ProjectDetailSidebar from '../projects/ProjectDetailSidebar';
import DecisionModal from '../management/DecisionModal';
import CreateProjectModal from '../projects/CreateProjectModal';
import CreateDemandModal from '../projects/CreateDemandModal';
import DuplicateProjectModal from '../projects/DuplicateProjectModal';
import Pagination from '../common/Pagination';
import { useToast } from '../common/Toast';
import type { Project, Demand } from '../../types/domain';
import type { TableColumn } from '../../types/table';
import type { CreateProjectPayload, UpdateProjectPayload, DuplicateProjectPayload, CreateDemandPayload, UpdateDemandPayload, ApproveDemandPayload, RejectDemandPayload } from '../../api/types';

// Project-level column config for accordion header row
export type ProjectAccordionColumnKey = 'type' | 'center' | 'priority' | 'demandCount';

export const projectAccordionColumnConfig: TableColumn<ProjectAccordionColumnKey>[] = [
  { key: 'type', label: 'Type', defaultVisible: true },
  { key: 'center', label: 'Center', defaultVisible: true },
  { key: 'priority', label: 'Priority', defaultVisible: true },
  { key: 'demandCount', label: 'Demands', defaultVisible: true },
];

// Demand sub-table column config
export type DemandSubColumnKey = 'service' | 'resource' | 'value' | 'status';

export const demandSubColumnConfig: TableColumn<DemandSubColumnKey>[] = [
  { key: 'service', label: 'Service', defaultVisible: true },
  { key: 'resource', label: 'Resource', defaultVisible: true },
  { key: 'value', label: 'Value', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: true },
];

interface ProjectsAccordionProps {
  selectedCenters: string[];
}

function DemandSubTable({
  projectName,
  canDecide,
}: {
  projectName: string;
  canDecide: boolean;
}) {
  const { t } = useTranslation();
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [decidingDemand, setDecidingDemand] = useState<Demand | null>(null);

  const { orderedVisibleColumns, allColumns, toggleColumn, reorderColumns, resetToDefaults } =
    useTableColumns<DemandSubColumnKey>({
      tableId: `demand-sub-${projectName}`,
      columns: demandSubColumnConfig,
    });

  // Two-arg signature: (filters, pagination)
  const { demands, isLoading, updateDemand, cancelDemand, approveDemand, rejectDemand } = useDemands(
    { projectName },
    { page: 1, limit: 100 }
  );

  async function handleSubmitDemand(payload: CreateDemandPayload | UpdateDemandPayload, demandId?: number) {
    if (demandId) {
      await updateDemand(demandId, payload as UpdateDemandPayload);
      setEditingDemand(null);
    }
  }

  if (isLoading) {
    return <div className="px-12 py-3 text-xs text-text-secondary">{t('common.loading', 'Loading…')}</div>;
  }

  if (demands.length === 0) {
    return <div className="px-12 py-3 text-xs text-text-secondary italic">{t('demands.empty', 'No requirements')}</div>;
  }

  const visibleKeys = orderedVisibleColumns.map((c) => c.key);

  return (
    <div className="border-t border-dashed border-primary/30 bg-blue-50/40">
      {/* Sub-table header */}
      <div className="flex items-center justify-end px-12 py-1.5 border-b border-blue-100">
        <ColumnSettingsDropdown
          columns={allColumns}
          visibleColumns={orderedVisibleColumns.map((c) => c.key)}
          onToggleColumn={toggleColumn}
          onReorder={reorderColumns}
          onReset={resetToDefaults}
        />
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-blue-100/60 text-blue-800">
            {visibleKeys.includes('service') && <th className="px-12 py-2 text-start font-semibold">{t('demand.service', 'Service')}</th>}
            {visibleKeys.includes('resource') && <th className="px-3 py-2 text-start font-semibold">{t('demand.resource', 'Resource')}</th>}
            {visibleKeys.includes('value') && <th className="px-3 py-2 text-start font-semibold">{t('demand.value', 'Value')}</th>}
            {visibleKeys.includes('status') && <th className="px-3 py-2 text-start font-semibold">{t('demand.status', 'Status')}</th>}
            <th className="px-3 py-2 text-start font-semibold">{t('common.actions', 'Actions')}</th>
          </tr>
        </thead>
        <tbody>
          {demands.map((demand) => (
            <tr
              key={demand.id}
              className="border-b border-blue-100 hover:bg-blue-50 cursor-pointer transition-colors"
              onClick={() => setSelectedDemand(demand)}
            >
              {visibleKeys.includes('service') && <td className="px-12 py-2">{demand.serviceName}</td>}
              {visibleKeys.includes('resource') && <td className="px-3 py-2">{demand.resourceName}</td>}
              {visibleKeys.includes('value') && <td className="px-3 py-2">{demand.value}</td>}
              {visibleKeys.includes('status') && (
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <StatusBadge status={demand.status} />
                </td>
              )}
              <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingDemand(demand)}
                    className="p-1 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                    title={t('common.edit', 'Edit')}
                  >
                    <MdEdit size={14} />
                  </button>
                  {canDecide && demand.status === 'Pending' && (
                    <button
                      onClick={() => setDecidingDemand(demand)}
                      className="px-2 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded hover:bg-purple-200 border-none cursor-pointer font-medium"
                    >
                      {t('management.decide', 'Decide')}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <DemandDetailSidebar
        demand={selectedDemand}
        project={null}
        isOpen={selectedDemand !== null}
        onClose={() => setSelectedDemand(null)}
        onEdit={setEditingDemand}
        isModerator={canDecide}
        onMakeDecision={canDecide ? setDecidingDemand : undefined}
      />

      {editingDemand && (
        <CreateDemandModal
          isOpen={editingDemand !== null}
          onClose={() => setEditingDemand(null)}
          onSubmit={handleSubmitDemand}
          editingDemand={editingDemand}
        />
      )}

      <DecisionModal
        open={decidingDemand !== null}
        demand={decidingDemand}
        onClose={() => setDecidingDemand(null)}
        onApprove={(payload: ApproveDemandPayload) => approveDemand(decidingDemand!.id, payload).then(() => setDecidingDemand(null))}
        onReject={(payload: RejectDemandPayload) => rejectDemand(decidingDemand!.id, payload).then(() => setDecidingDemand(null))}
      />
    </div>
  );
}

export default function ProjectsAccordion({ selectedCenters }: ProjectsAccordionProps) {
  const { t } = useTranslation();
  const auth = useAuth();
  const { showToast } = useToast();
  const role = (auth.user?.profile.groups as string[])?.[0]?.toLowerCase() || 'user';
  const canDecide = role === 'admin' || role === 'moderator';

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [duplicatingProject, setDuplicatingProject] = useState<Project | null>(null);

  // Two-arg signature: (filters, pagination)
  const filters = useMemo(() => ({
    centerName: selectedCenters.length > 0 ? selectedCenters.join(',') : undefined,
  }), [selectedCenters]);

  const { projects, total, totalPages, isLoading, updateProject, deleteProject, duplicateProject } = useProjects(
    filters,
    { page: currentPage, limit: itemsPerPage }
  );

  const { orderedVisibleColumns, allColumns, toggleColumn, reorderColumns, resetToDefaults } =
    useTableColumns<ProjectAccordionColumnKey>({
      tableId: 'projects-accordion',
      columns: projectAccordionColumnConfig,
    });

  const toggleExpand = useCallback((name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(t('project.deleteConfirm', 'Delete this project?'))) return;
    try {
      await deleteProject(project.name);
      showToast(t('project.deleted', 'Project deleted'), 'success');
    } catch {
      showToast(t('project.deleteError', 'Failed to delete project'), 'error');
    }
  };

  async function handleSubmitProject(payload: CreateProjectPayload | UpdateProjectPayload, projectName?: string) {
    if (projectName) {
      await updateProject(projectName, payload as UpdateProjectPayload);
      setEditingProject(null);
    }
  }

  async function handleSubmitDuplicate(sourceName: string, payload: DuplicateProjectPayload) {
    await duplicateProject(sourceName, payload);
    setDuplicatingProject(null);
  }

  const visibleColKeys = orderedVisibleColumns.map((c) => c.key);

  return (
    <div className="flex flex-col gap-3">
      {/* Table toolbar */}
      <div className="flex justify-end">
        <ColumnSettingsDropdown
          columns={allColumns}
          visibleColumns={orderedVisibleColumns.map((c) => c.key)}
          onToggleColumn={toggleColumn}
          onReorder={reorderColumns}
          onReset={resetToDefaults}
        />
      </div>

      {/* Accordion table */}
      <div className="rounded-xl border border-divider overflow-hidden bg-bg-paper">
        {/* Header row */}
        <div className="grid bg-bg-default border-b border-divider text-xs font-semibold text-text-secondary uppercase tracking-wide"
          style={{ gridTemplateColumns: `32px 1fr ${visibleColKeys.map(() => '120px').join(' ')} 100px` }}>
          <div className="px-3 py-3" />
          <div className="px-4 py-3">{t('project.name', 'Name')}</div>
          {visibleColKeys.includes('type') && <div className="px-3 py-3">{t('project.type', 'Type')}</div>}
          {visibleColKeys.includes('center') && <div className="px-3 py-3">{t('project.center', 'Center')}</div>}
          {visibleColKeys.includes('priority') && <div className="px-3 py-3">{t('project.priority', 'Priority')}</div>}
          {visibleColKeys.includes('demandCount') && <div className="px-3 py-3 text-center">{t('project.demands', 'Demands')}</div>}
          <div className="px-3 py-3">{t('common.actions', 'Actions')}</div>
        </div>

        {isLoading && (
          <div className="px-4 py-8 text-center text-sm text-text-secondary">{t('common.loading', 'Loading…')}</div>
        )}

        {!isLoading && projects.map((project) => {
          const isExpanded = expandedProjects.has(project.name);
          return (
            <div key={project.name} className="border-b border-divider last:border-0">
              {/* Project row */}
              <div
                className={`grid items-center transition-colors hover:bg-gray-50 ${isExpanded ? 'bg-blue-50' : ''}`}
                style={{ gridTemplateColumns: `32px 1fr ${visibleColKeys.map(() => '120px').join(' ')} 100px` }}
              >
                {/* Expand toggle */}
                <button
                  onClick={(e) => toggleExpand(project.name, e)}
                  className="px-3 py-3 text-primary bg-transparent border-none cursor-pointer flex items-center justify-center"
                >
                  {isExpanded
                    ? <MdExpandMore size={18} />
                    : <MdChevronRight size={18} />}
                </button>
                {/* Name — clicking opens ProjectDetailSidebar */}
                <button
                  onClick={() => setSelectedProject(project)}
                  className="px-4 py-3 text-sm font-medium text-text-primary hover:text-primary text-start bg-transparent border-none cursor-pointer truncate"
                >
                  {project.name}
                </button>
                {visibleColKeys.includes('type') && (
                  <div className="px-3 py-3 text-xs">
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700">{project.type}</span>
                  </div>
                )}
                {visibleColKeys.includes('center') && (
                  <div className="px-3 py-3 text-sm text-text-secondary">{project.centerName}</div>
                )}
                {visibleColKeys.includes('priority') && (
                  <div className="px-3 py-3">
                    {project.priority ? <PriorityBadge priority={project.priority} /> : <span className="text-text-secondary text-xs">—</span>}
                  </div>
                )}
                {visibleColKeys.includes('demandCount') && (
                  <div className="px-3 py-3 text-sm text-center text-text-secondary">{project.demandCount ?? 0}</div>
                )}
                {/* Actions */}
                <div className="px-3 py-3 flex items-center gap-1.5">
                  <button
                    onClick={() => setEditingProject(project)}
                    className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer rounded"
                    title={t('common.edit', 'Edit')}
                  >
                    <MdEdit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project)}
                    className="p-1.5 text-text-secondary hover:text-danger transition-colors bg-transparent border-none cursor-pointer rounded"
                    title={t('common.delete', 'Delete')}
                  >
                    <MdDelete size={16} />
                  </button>
                  <button
                    onClick={() => setDuplicatingProject(project)}
                    className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer rounded"
                    title={t('common.duplicate', 'Duplicate')}
                  >
                    <MdContentCopy size={16} />
                  </button>
                </div>
              </div>

              {/* Expanded demands sub-table */}
              {isExpanded && (
                <DemandSubTable projectName={project.name} canDecide={canDecide} />
              )}
            </div>
          );
        })}

        {!isLoading && projects.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-text-secondary italic">
            {t('projects.empty', 'No projects found')}
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={total}
        itemsPerPage={itemsPerPage}
      />

      {/* Sidebars and modals */}
      <ProjectDetailSidebar
        project={selectedProject}
        isOpen={selectedProject !== null}
        onClose={() => setSelectedProject(null)}
        onEdit={setEditingProject}
        onDelete={handleDeleteProject}
      />

      {editingProject && (
        <CreateProjectModal
          isOpen={editingProject !== null}
          onClose={() => setEditingProject(null)}
          onSubmit={handleSubmitProject}
          editingProject={editingProject}
        />
      )}

      {duplicatingProject && (
        <DuplicateProjectModal
          isOpen={duplicatingProject !== null}
          onClose={() => setDuplicatingProject(null)}
          sourceProject={duplicatingProject}
          onSubmit={handleSubmitDuplicate}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify Project type has required fields**

Run: `grep -n "centerName\|demandCount\|priority\|type" client/src/types/domain.ts`

Confirm `Project` has `centerName`, `priority`, `type`. If `demandCount` is absent, add it as optional to the Project interface: `demandCount?: number;`

- [ ] **Step 4: Wire ProjectsAccordion into MainPage**

Add import:
```tsx
import ProjectsAccordion from '../components/main/ProjectsAccordion';
```

Replace:
```tsx
{/* Before */}
{activeTab === 'projects' && (
  <div className="text-sm text-text-secondary italic">Projects accordion — Task 7</div>
)}

{/* After */}
{activeTab === 'projects' && (
  <ProjectsAccordion selectedCenters={selectedCenters} />
)}
```

- [ ] **Step 5: Type-check**

Run: `cd client && npx tsc --noEmit`

Fix any type errors (missing props on sidebars, wrong demand type shape, etc.).

- [ ] **Step 6: Browser verify**

Navigate to `/projects`. Projects appear as accordion rows. Click the expand arrow → demands sub-table loads. Click a demand row → `DemandDetailSidebar` opens. Click a project name → `ProjectDetailSidebar` opens. As moderator/admin, "Decide" button appears on Pending demands.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/main/ProjectsAccordion.tsx client/src/pages/MainPage.tsx client/src/types/domain.ts
git commit -m "feat(client): add ProjectsAccordion with expandable demand sub-table"
```

---

## Task 8: Settings — add Capacity and Wallets tabs with role-based access

**Files:**
- Modify: `client/src/pages/SettingsPage.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Read the full SettingsPage tabs section**

Run: `grep -n "mainTabs\|mainTab\|setMainTab\|useState" client/src/pages/SettingsPage.tsx | head -20`

Note the `mainTabs` array and `mainTab` state type.

- [ ] **Step 2: Add role-based tab building to SettingsPage**

In `client/src/pages/SettingsPage.tsx`, find the component that renders the main tabs (the one with `useState` for `mainTab`). It's inside `export default function SettingsPage()`.

Add `useAuth` import at the top if not already present:
```tsx
import { useAuth } from 'react-oidc-context';
```

Add `CapacityManagement` and `WalletManagement` imports:
```tsx
import CapacityManagement from '../components/management/CapacityManagement';
import WalletManagement from '../components/management/WalletManagement';
```

Inside the `SettingsPage` function, add role detection:
```tsx
const auth = useAuth();
const role = (auth.user?.profile.groups as string[])?.[0]?.toLowerCase() || 'user';
const isAdmin = role === 'admin';
const isModerator = role === 'moderator';
```

Replace the static `mainTabs` array:
```tsx
// Before
const mainTabs = [
    { id: 'infrastructure', label: t('settings.mainTabs.infrastructure', 'Infrastructure') },
    { id: 'organization', label: t('settings.mainTabs.organization', 'Organization') },
    { id: 'options', label: t('settings.mainTabs.options', 'Options') },
    { id: 'services', label: t('settings.mainTabs.services', 'Services') },
];

// After
const mainTabs = [
    ...(isAdmin ? [
        { id: 'infrastructure', label: t('settings.mainTabs.infrastructure', 'Infrastructure') },
        { id: 'organization', label: t('settings.mainTabs.organization', 'Organization') },
        { id: 'options', label: t('settings.mainTabs.options', 'Options') },
    ] : []),
    { id: 'services', label: t('settings.mainTabs.services', 'Services') },
    { id: 'capacity', label: t('settings.mainTabs.capacity', 'Capacity') },
    { id: 'wallets', label: t('settings.mainTabs.wallets', 'Wallets') },
];
```

Add the new tab renders inside the `<div className="animate-slide-in">` block:
```tsx
{mainTab === 'capacity' && <CapacityManagement />}
{mainTab === 'wallets' && <WalletManagement />}
```

Update the `mainTab` state type to include the new values. Find:
```tsx
const [mainTab, setMainTab] = useState('infrastructure');
```

Change to:
```tsx
const [mainTab, setMainTab] = useState(isAdmin ? 'infrastructure' : 'services');
```

- [ ] **Step 3: Allow moderator to access /settings in App.tsx**

In `client/src/App.tsx`, the `/settings` route currently has no guard (the guard is implicit via navigation). There's no explicit route guard in App.tsx — access was controlled by the nav items. Since we're now also controlling it via the cog icon in TopBar, no route guard change is strictly needed (the route is open to any authenticated user). The Settings page itself only shows relevant tabs per role.

Verify by checking if there is a role guard on the settings route:
```bash
grep -n "settings\|SettingsPage\|role" client/src/App.tsx
```

If a guard exists (e.g., `role === 'admin'`), update it to `role === 'admin' || role === 'moderator'`.

- [ ] **Step 4: Type-check**

Run: `cd client && npx tsc --noEmit`

- [ ] **Step 5: Verify CapacityManagement and WalletManagement props**

Run: `grep -n "interface.*Props\|export default function" client/src/components/management/CapacityManagement.tsx`

If they require props (like `onSuccess`), check the Management page for how it calls them and pass the same props.

- [ ] **Step 6: Browser verify**

Log in as admin → navigate to Settings via crown → see all 6 tabs including Capacity and Wallets.
Log in as moderator → navigate to Settings via cog → see Services, Capacity, Wallets only.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/SettingsPage.tsx client/src/App.tsx
git commit -m "feat(client): add Capacity and Wallets tabs to Settings, allow moderator access"
```

---

## Task 9: Cleanup — delete old pages and sidebar

**Files:**
- Delete: `client/src/pages/ProjectsPage.tsx`
- Delete: `client/src/pages/DemandsPage.tsx`
- Delete: `client/src/pages/ManagementPage.tsx`
- Delete: `client/src/components/layout/Sidebar.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Remove old imports from App.tsx**

In `client/src/App.tsx`, remove these import lines:
```tsx
import ProjectsPage from './pages/ProjectsPage';
import DemandsPage from './pages/DemandsPage';
import ManagementPage from './pages/ManagementPage';
```

- [ ] **Step 2: Type-check to confirm nothing else imports them**

Run: `cd client && npx tsc --noEmit`

If errors mention `ProjectsPage`, `DemandsPage`, or `ManagementPage`, find the remaining references:
```bash
grep -rn "ProjectsPage\|DemandsPage\|ManagementPage\|Sidebar" client/src --include="*.tsx" --include="*.ts"
```

Fix any remaining references.

- [ ] **Step 3: Delete the files**

```bash
rm client/src/pages/ProjectsPage.tsx
rm client/src/pages/DemandsPage.tsx
rm client/src/pages/ManagementPage.tsx
rm client/src/components/layout/Sidebar.tsx
```

- [ ] **Step 4: Final type-check**

Run: `cd client && npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 5: Browser full smoke test**

Start the dev server: `npm run dev:client`

Check each scenario:
- `/` → redirects to `/projects`, shows MainPage with "Projects & Requirements" tab
- `/demands` → redirects to `/projects?tab=requirements`, Requirements tab active
- `/management` → redirects to `/projects`
- `/settings` → Settings page loads; admin sees 6 tabs, moderator sees 3 tabs
- `/dashboard` → DashboardPage placeholder loads
- TopBar: crown visible for admin, cog for moderator, neither for regular user
- Crown/cog click → navigates to `/settings`
- User dropdown → Profile and Logout options visible
- Create buttons → open correct modals
- Center filter → selecting centers updates table and resource chips
- Resource strip → collapse/expand works
- Accordion → expand/collapse works; demands sub-table loads; clicking demand opens sidebar
- Requirements tab → full demands table, filters, sort, column toggle all work
- Moderator/admin → bulk approve/reject bar appears on row selection

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(client): remove ProjectsPage, DemandsPage, ManagementPage, Sidebar — cleanup complete"
```

---

## Task 10: Write design doc and save brainstorm session

**Files:**
- Verify: `docs/superpowers/specs/2026-05-06-ui-redesign-design.md` (already created during brainstorming)

- [ ] **Step 1: Add .gitignore entry for brainstorm session files**

```bash
echo ".superpowers/" >> .gitignore
git add .gitignore
```

- [ ] **Step 2: Commit spec + plan docs**

```bash
git add docs/superpowers/specs/2026-05-06-ui-redesign-design.md docs/superpowers/plans/2026-05-06-ui-redesign.md
git commit -m "docs: add UI redesign spec and implementation plan"
```
