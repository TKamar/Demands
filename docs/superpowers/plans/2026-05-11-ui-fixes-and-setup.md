# Demands UI Fixes & Local Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix demand action menus in the nested requirements table, add admin/moderator Delete capability, consolidate actions into a compact three-dot menu, add a Settings back-button, and create the missing client `.env.example` for local dev setup.

**Architecture:**
- A new reusable `MoreActionsMenu` component provides the three-dot dropdown pattern used in demand rows.
- `useDemands` hook gains `deleteDemand` (the API function already exists in `apiService.ts`; the hook just needs to expose it).
- `DemandSubTable` (inside `ProjectsAccordion`) replaces its inline icon buttons with role-aware `MoreActionsMenu` items; `SettingsPage` gains a back arrow.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, react-icons, react-oidc-context, React Router v7

---

## Status Audit

| User Task | Status | Plan Action |
|---|---|---|
| System Unification (sidebar → TopBar, MainPage tabs) | **COMPLETE** — already merged | None |
| Local Execution Setup | Partial — server has `.env.example`, client does not | Task 1 below |
| Fix Requirements Table actions (DemandSubTable) | **MISSING** — Edit shown to all, no Cancel/Delete | Tasks 2–4 |
| Admin/Mod Decision Making + Delete flow | Decide exists; Delete missing from DemandSubTable | Tasks 2–4 |
| Compact "More Actions" menu | **MISSING** | Task 3–4 |
| Settings Back Button | **MISSING** | Task 5 |

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `client/.env.example` | **Create** | Client env template for local dev |
| `client/src/hooks/useDemands.ts` | **Modify** | Expose `deleteDemand` |
| `client/src/components/common/MoreActionsMenu.tsx` | **Create** | Reusable three-dot dropdown |
| `client/src/components/main/ProjectsAccordion.tsx` | **Modify** | Fix DemandSubTable actions with MoreActionsMenu |
| `client/src/pages/SettingsPage.tsx` | **Modify** | Add Back button |
| `client/src/i18n/locales/en/translation.json` | **Modify** | New i18n keys |
| `client/src/i18n/locales/he/translation.json` | **Modify** | New i18n keys (Hebrew) |

---

## Branching Strategy

- `feature/local-execution` → Task 1 only; merge to main immediately
- `feature/demand-actions-compact-ui` → Tasks 2–4 together (interdependent)
- `feature/settings-back-button` → Task 5 only (independent, tiny)

---

## Task 1: Create `client/.env.example` and verify local setup

**Context:** `server/.env.example` already exists and is well-documented. The client has no env template, making local setup harder.

**Files:**
- Create: `client/.env.example`

- [ ] **Step 1: Create branch**

```bash
git checkout -b feature/local-execution
```

- [ ] **Step 2: Create `client/.env.example`**

Create `client/.env.example` with this content:

```
# === Demands Client — Environment Variables ===
# Copy this file to .env and fill in values for local development.
# For Docker-based dev, these are set automatically by docker-compose.yml.

# URL of the backend API server
VITE_API_URL=http://localhost:3000

# Keycloak OIDC authority (realm URL)
VITE_OIDC_AUTHORITY=http://localhost:8080/realms/demands

# Keycloak client ID for the frontend app
VITE_OIDC_CLIENT_ID=demands-web

# Redirect URI after login (must match Keycloak client settings)
VITE_OIDC_REDIRECT_URI=http://localhost:5173
```

- [ ] **Step 3: Verify Docker local dev works**

Run the full stack and confirm login + data load:

```bash
NODE_ENV=development docker compose --profile dev up --build
```

Expected: App loads at http://localhost:5173, login via Keycloak at http://localhost:8080, main table shows seeded data.

Test credentials: `admin1 / admin123`, `mod1 / mod123`, `user1 / user123`

- [ ] **Step 4: Commit and push**

```bash
git add client/.env.example
git commit -m "chore: add client env example for local development"
git push -u origin feature/local-execution
```

---

## Task 2: Expose `deleteDemand` in `useDemands` hook

**Context:** `deleteDemand(id)` already exists in `client/src/api/apiService.ts` (line 199). It just isn't imported or exposed by the `useDemands` hook.

**Files:**
- Modify: `client/src/hooks/useDemands.ts`

- [ ] **Step 1: Create branch**

```bash
git checkout -b feature/demand-actions-compact-ui
```

- [ ] **Step 2: Update `useDemands.ts` — add import and interface**

In `client/src/hooks/useDemands.ts`, replace the existing import line:

```typescript
// BEFORE
import { fetchDemands, createDemand as apiCreateDemand, updateDemand as apiUpdateDemand, cancelDemand as apiCancelDemand, approveDemand as apiApproveDemand, rejectDemand as apiRejectDemand, bulkApproveDemands as apiBulkApprove, bulkRejectDemands as apiBulkReject } from '../api/apiService';

// AFTER
import { fetchDemands, createDemand as apiCreateDemand, updateDemand as apiUpdateDemand, deleteDemand as apiDeleteDemand, cancelDemand as apiCancelDemand, approveDemand as apiApproveDemand, rejectDemand as apiRejectDemand, bulkApproveDemands as apiBulkApprove, bulkRejectDemands as apiBulkReject } from '../api/apiService';
```

- [ ] **Step 3: Add `deleteDemand` to the `UseDemandsResult` interface**

In `client/src/hooks/useDemands.ts`, add to the interface:

```typescript
interface UseDemandsResult {
  demands: Demand[];
  isLoading: boolean;
  error: string | null;
  total: number;
  totalPending: number;
  totalPages: number;
  totalValue: number;
  totalApprovedValue: number;
  createDemand: (payload: CreateDemandPayload) => Promise<void>;
  updateDemand: (id: number, payload: UpdateDemandPayload) => Promise<void>;
  deleteDemand: (id: number) => Promise<void>;          // ← add this
  cancelDemand: (id: number) => Promise<void>;
  approveDemand: (id: number, payload: ApproveDemandPayload) => Promise<void>;
  rejectDemand: (id: number, payload: RejectDemandPayload) => Promise<void>;
  bulkApproveDemands: (payload: BulkApproveDemandPayload) => Promise<number>;
  bulkRejectDemands: (payload: BulkRejectDemandPayload) => Promise<number>;
}
```

- [ ] **Step 4: Add `deleteDemand` callback inside the hook function**

After the `cancelDemand` callback in `useDemands`:

```typescript
const deleteDemand = useCallback(async (id: number) => {
  await apiDeleteDemand(id);
  triggerRefreshDemands();
}, [triggerRefreshDemands]);
```

- [ ] **Step 5: Add `deleteDemand` to the return statement**

```typescript
return { demands, isLoading, error, total, totalPending, totalPages, totalValue, totalApprovedValue, createDemand, updateDemand, deleteDemand, cancelDemand, approveDemand, rejectDemand, bulkApproveDemands, bulkRejectDemands };
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors on `useDemands.ts`.

---

## Task 3: Create `MoreActionsMenu` reusable component

**Context:** A reusable three-dot dropdown to replace multiple inline icon buttons in table action cells.

**Files:**
- Create: `client/src/components/common/MoreActionsMenu.tsx`

- [ ] **Step 1: Create the component file**

Create `client/src/components/common/MoreActionsMenu.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react';
import { MdMoreVert } from 'react-icons/md';

export interface MoreAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface MoreActionsMenuProps {
  actions: MoreAction[];
  /** Controls trigger button icon size; default 'sm' (14px) */
  size?: 'sm' | 'md';
}

export default function MoreActionsMenu({ actions, size = 'sm' }: MoreActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const visibleActions = actions.filter(Boolean);
  if (visibleActions.length === 0) return null;

  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-gray-100 bg-transparent border-none cursor-pointer transition-colors"
        title="More actions"
      >
        <MdMoreVert size={iconSize} />
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-1 z-[400] bg-bg-paper border border-divider rounded-xl shadow-lg py-1 min-w-[148px]">
          {visibleActions.map((action, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                if (!action.disabled) {
                  action.onClick();
                  setOpen(false);
                }
              }}
              disabled={action.disabled}
              className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-start border-none transition-colors
                ${action.disabled
                  ? 'opacity-40 cursor-not-allowed bg-transparent'
                  : 'cursor-pointer hover:bg-gray-50 bg-transparent'
                }
                ${action.danger ? 'text-danger' : 'text-text-primary'}`}
            >
              {action.icon && <span className="shrink-0 flex items-center">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

---

## Task 4: Fix `DemandSubTable` — role-based actions + MoreActionsMenu

**Context:** The current `DemandSubTable` inside `ProjectsAccordion.tsx`:
- Shows Edit to everyone with no ownership/status check
- Has no Cancel action for regular users
- Has no Delete action for mods/admins
- Uses bare icon buttons instead of a three-dot menu

**Action matrix:**

| Role | Demand status | Own demand? | Edit | Cancel | Decide | Delete |
|---|---|---|---|---|---|---|
| user | Pending | yes | ✓ | ✓ | — | — |
| user | Pending | no | — | — | — | — |
| user | non-Pending | any | — | — | — | — |
| mod/admin | Pending | any | — | — | ✓ | ✓ |
| mod/admin | non-Pending | any | — | — | — | — |

**Files:**
- Modify: `client/src/components/main/ProjectsAccordion.tsx`
- Modify: `client/src/i18n/locales/en/translation.json`
- Modify: `client/src/i18n/locales/he/translation.json`

- [ ] **Step 1: Add new i18n keys to `en/translation.json`**

Open `client/src/i18n/locales/en/translation.json` and add these keys inside the appropriate existing sections (add to `"demand"` and `"common"` objects):

```json
"demand": {
  "deleteConfirm": "Delete this requirement?",
  "deleted": "Requirement deleted",
  "deleteError": "Failed to delete requirement",
  "cancelConfirm": "Cancel this requirement?",
  "cancelled": "Requirement cancelled",
  "cancelError": "Failed to cancel requirement"
}
```

And in `"common"`:
```json
"common": {
  "cancel": "Cancel",
  "moreActions": "More actions"
}
```

- [ ] **Step 2: Add same keys to `he/translation.json`**

```json
"demand": {
  "deleteConfirm": "למחוק דרישה זו?",
  "deleted": "הדרישה נמחקה",
  "deleteError": "מחיקת הדרישה נכשלה",
  "cancelConfirm": "לבטל דרישה זו?",
  "cancelled": "הדרישה בוטלה",
  "cancelError": "ביטול הדרישה נכשל"
}
```

And in `"common"`:
```json
"common": {
  "cancel": "ביטול",
  "moreActions": "פעולות נוספות"
}
```

- [ ] **Step 3: Update imports at top of `ProjectsAccordion.tsx`**

Replace the existing imports block to add the new imports:

```tsx
// Add these to the existing imports:
import { useAuth } from 'react-oidc-context';           // already imported in parent; add inside DemandSubTable too
import { MdEdit, MdDelete, MdCancel, MdGavel } from 'react-icons/md';  // MdCancel + MdGavel are new
import MoreActionsMenu from '../common/MoreActionsMenu';
import type { MoreAction } from '../common/MoreActionsMenu';
```

At the top of the file, add `MdCancel` and `MdGavel` to the existing `react-icons/md` import:

```tsx
import {
  MdExpandMore,
  MdChevronRight,
  MdEdit,
  MdDelete,
  MdContentCopy,
  MdFilterList,
  MdArrowUpward,
  MdArrowDownward,
  MdUnfoldMore,
  MdCancel,
  MdGavel,
} from 'react-icons/md';
```

And add the MoreActionsMenu import:

```tsx
import MoreActionsMenu from '../common/MoreActionsMenu';
import type { MoreAction } from '../common/MoreActionsMenu';
```

- [ ] **Step 4: Rewrite the `DemandSubTable` function**

Replace the entire `DemandSubTable` function (lines 148–313 of `ProjectsAccordion.tsx`) with:

```tsx
function DemandSubTable({
  projectName,
  canDecide,
}: {
  projectName: string;
  canDecide: boolean;
}) {
  const { t } = useTranslation();
  const auth = useAuth();
  const { showToast } = useToast();
  const userSub = auth.user?.profile.sub ?? '';

  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [decidingDemand, setDecidingDemand] = useState<Demand | null>(null);
  const [isDecisionLoading, setIsDecisionLoading] = useState(false);

  const { demands, isLoading, updateDemand, deleteDemand, cancelDemand, approveDemand, rejectDemand } = useDemands(
    { projectName },
    { page: 1, limit: 100 }
  );

  async function handleSubmitDemand(
    payload: CreateDemandPayload | UpdateDemandPayload,
    demandId?: number
  ) {
    if (demandId) {
      await updateDemand(demandId, payload as UpdateDemandPayload);
      setEditingDemand(null);
    }
  }

  async function handleDeleteDemand(demand: Demand) {
    if (!window.confirm(t('demand.deleteConfirm', 'Delete this requirement?'))) return;
    try {
      await deleteDemand(demand.id);
      showToast(t('demand.deleted', 'Requirement deleted'), 'success');
    } catch {
      showToast(t('demand.deleteError', 'Failed to delete requirement'), 'error');
    }
  }

  async function handleCancelDemand(demand: Demand) {
    if (!window.confirm(t('demand.cancelConfirm', 'Cancel this requirement?'))) return;
    try {
      await cancelDemand(demand.id);
      showToast(t('demand.cancelled', 'Requirement cancelled'), 'success');
    } catch {
      showToast(t('demand.cancelError', 'Failed to cancel requirement'), 'error');
    }
  }

  async function handleApprove(payload: ApproveDemandPayload) {
    if (!decidingDemand) return;
    setIsDecisionLoading(true);
    try {
      await approveDemand(decidingDemand.id, payload);
      showToast(t('management.success.approved'), 'success');
      setDecidingDemand(null);
    } catch (err: any) {
      showToast(err?.response?.data?.error || t('management.error.approveFailed'), 'error');
    } finally {
      setIsDecisionLoading(false);
    }
  }

  async function handleReject(payload: RejectDemandPayload) {
    if (!decidingDemand) return;
    setIsDecisionLoading(true);
    try {
      await rejectDemand(decidingDemand.id, payload);
      showToast(t('management.success.rejected'), 'success');
      setDecidingDemand(null);
    } catch (err: any) {
      showToast(err?.response?.data?.error || t('management.error.rejectFailed'), 'error');
    } finally {
      setIsDecisionLoading(false);
    }
  }

  function buildActions(demand: Demand): MoreAction[] {
    const isPending = demand.status === 'Pending';
    const isOwner = demand.createdBy === userSub;

    if (canDecide) {
      // Moderators and admins: Decide + Delete (Pending only)
      if (!isPending) return [];
      return [
        {
          label: t('management.decide', 'Decide'),
          icon: <MdGavel size={12} />,
          onClick: () => setDecidingDemand(demand),
        },
        {
          label: t('common.delete', 'Delete'),
          icon: <MdDelete size={12} />,
          danger: true,
          onClick: () => handleDeleteDemand(demand),
        },
      ];
    }

    // Regular users: Edit + Cancel (own Pending demands only)
    if (!isPending || !isOwner) return [];
    return [
      {
        label: t('common.edit', 'Edit'),
        icon: <MdEdit size={12} />,
        onClick: () => setEditingDemand(demand),
      },
      {
        label: t('common.cancel', 'Cancel'),
        icon: <MdCancel size={12} />,
        danger: true,
        onClick: () => handleCancelDemand(demand),
      },
    ];
  }

  if (isLoading) {
    return (
      <div className="px-12 py-4 text-xs text-text-secondary border-t border-dashed border-primary/30">
        {t('common.loading', 'Loading…')}
      </div>
    );
  }

  if (demands.length === 0) {
    return (
      <div className="px-12 py-4 text-xs text-text-secondary italic border-t border-dashed border-primary/30">
        {t('demands.empty', 'No requirements')}
      </div>
    );
  }

  return (
    <div className="border-t border-dashed border-primary/30 bg-primary/[0.02]">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-primary/5 text-text-secondary">
            <th className="ps-12 pe-3 py-2 text-start font-semibold">{t('demand.service', 'Service')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('demand.resource', 'Resource')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('demand.value', 'Value')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('demand.status', 'Status')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('common.actions', 'Actions')}</th>
          </tr>
        </thead>
        <tbody>
          {demands.map((demand) => {
            const rowActions = buildActions(demand);
            return (
              <tr
                key={demand.id}
                className="border-t border-divider/50 hover:bg-primary/5 cursor-pointer transition-colors"
                onClick={() => setSelectedDemand(demand)}
              >
                <td className="ps-12 pe-3 py-2 text-text-primary">{demand.serviceName}</td>
                <td className="px-3 py-2 text-text-secondary">{demand.resourceName}</td>
                <td className="px-3 py-2 font-medium">{demand.value.toLocaleString()}</td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      demand.status === 'Approved'
                        ? 'bg-green-100 text-green-700'
                        : demand.status === 'Pending'
                        ? 'bg-amber-100 text-amber-700'
                        : demand.status === 'Rejected'
                        ? 'bg-red-100 text-red-700'
                        : demand.status === 'PartiallyApproved'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {demand.status}
                  </span>
                </td>
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <MoreActionsMenu actions={rowActions} size="sm" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <DemandDetailSidebar
        demand={selectedDemand}
        project={null}
        isOpen={selectedDemand !== null}
        onClose={() => setSelectedDemand(null)}
        onEdit={(d) => { setEditingDemand(d); setSelectedDemand(null); }}
        isModerator={canDecide}
        onMakeDecision={canDecide ? (d) => { setDecidingDemand(d); setSelectedDemand(null); } : undefined}
      />

      {editingDemand && (
        <CreateDemandModal
          isOpen
          onClose={() => setEditingDemand(null)}
          onSubmit={handleSubmitDemand}
          editingDemand={editingDemand}
        />
      )}

      <DecisionModal
        open={decidingDemand !== null}
        onClose={() => setDecidingDemand(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        demand={decidingDemand}
        isLoading={isDecisionLoading}
      />
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Start dev server and manually test**

```bash
npm run dev:client
```

Test scenarios:
1. Log in as `user1` — expand a project → demand row shows no actions menu for non-owned demands; for own Pending demands shows three-dot → Edit + Cancel
2. Log in as `mod1` — expand a project → Pending demands show three-dot → Decide + Delete; non-Pending demands show no menu
3. Log in as `admin1` — same as mod1; Decide opens DecisionModal; Delete shows confirm then removes demand and refreshes

- [ ] **Step 7: Commit**

```bash
git add client/src/hooks/useDemands.ts \
        client/src/components/common/MoreActionsMenu.tsx \
        client/src/components/main/ProjectsAccordion.tsx \
        client/src/i18n/locales/en/translation.json \
        client/src/i18n/locales/he/translation.json
git commit -m "feat: compact three-dot action menu in demand sub-table with role-based actions"
```

---

## Task 5: Add Back button to Settings page

**Context:** `SettingsPage` has no way to navigate back to the main dashboard other than clicking the logo. Admins/mods need a clear Back arrow.

**Files:**
- Modify: `client/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Create branch**

```bash
git checkout -b feature/settings-back-button
```

- [ ] **Step 2: Add `useNavigate` import and `MdArrowBack` icon**

In `client/src/pages/SettingsPage.tsx`, add to the existing imports:

```tsx
import { useNavigate } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
```

- [ ] **Step 3: Add Back button inside `SettingsPage` JSX**

Inside `SettingsPage`, add `const navigate = useNavigate();` after the hook declarations.

Then replace the `<div className="mb-8">` header block:

```tsx
// BEFORE
<div className="mb-8">
    <h1 className="text-2xl font-bold text-text-primary mb-2">{t('nav.settings', 'Settings')}</h1>
    <p className="text-text-secondary">{t('settings.subtitle', 'Manage system entities and configurations')}</p>
</div>

// AFTER
<div className="mb-8">
    <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer p-0 mb-4 text-sm"
    >
        <MdArrowBack size={16} />
        {t('common.back', 'Back')}
    </button>
    <h1 className="text-2xl font-bold text-text-primary mb-2">{t('nav.settings', 'Settings')}</h1>
    <p className="text-text-secondary">{t('settings.subtitle', 'Manage system entities and configurations')}</p>
</div>
```

- [ ] **Step 4: Add `common.back` i18n key**

In `client/src/i18n/locales/en/translation.json`, in the `"common"` object add:
```json
"back": "Back"
```

In `client/src/i18n/locales/he/translation.json`, in the `"common"` object add:
```json
"back": "חזרה"
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

- [ ] **Step 6: Start dev server and test**

```bash
npm run dev:client
```

Navigate to `/settings` → click Back → should land on `/projects`.
Check both logged-in roles (admin, moderator) can see and use the button.

- [ ] **Step 7: Commit and push**

```bash
git add client/src/pages/SettingsPage.tsx \
        client/src/i18n/locales/en/translation.json \
        client/src/i18n/locales/he/translation.json
git commit -m "feat: add back navigation button to settings page"
git push -u origin feature/settings-back-button
```

---

## Task 6: Push demand-actions branch and create PRs

- [ ] **Step 1: Push demand-actions branch**

```bash
git checkout feature/demand-actions-compact-ui
git push -u origin feature/demand-actions-compact-ui
```

- [ ] **Step 2: Create PRs on GitHub**

```bash
gh pr create --base main --head feature/local-execution \
  --title "chore: add client env example for local dev setup" \
  --body "Creates client/.env.example template so developers can run the frontend locally without Docker."

gh pr create --base main --head feature/demand-actions-compact-ui \
  --title "feat: role-based demand actions with compact three-dot menu" \
  --body "$(cat <<'EOF'
## Summary
- Exposes `deleteDemand` in `useDemands` hook (API function already existed)
- Adds reusable `MoreActionsMenu` three-dot dropdown component
- Fixes `DemandSubTable` in ProjectsAccordion: role-based actions (regular users: Edit+Cancel on own pending demands; mods/admins: Decide+Delete on any pending demand)
- Adds Hebrew + English i18n keys for new messages

## Test Plan
- [ ] Log in as user1: expand a project; own pending demands show ⋮ → Edit, Cancel; non-own or non-pending show no menu
- [ ] Log in as mod1: pending demands show ⋮ → Decide, Delete; non-pending show no menu
- [ ] Log in as admin1: same as mod1; Delete works and refreshes table
EOF
)"

gh pr create --base main --head feature/settings-back-button \
  --title "feat: add back button to settings page" \
  --body "Adds a Back arrow button at the top of SettingsPage that navigates to /projects."
```

---

## Verification Checklist

| Scenario | Expected Result |
|---|---|
| `user1` expands project with own Pending demand | ⋮ menu shows Edit + Cancel |
| `user1` expands project with other user's Pending demand | No ⋮ menu shown |
| `user1` expands project with Approved demand | No ⋮ menu shown |
| `mod1` expands project with Pending demand | ⋮ menu shows Decide + Delete |
| `mod1` clicks Decide | DecisionModal opens with Approve/Reject options |
| `mod1` clicks Delete → confirms | Demand disappears; success toast |
| `admin1` same as mod1 | Same behavior |
| Any role visits /settings | Back arrow visible; click navigates to /projects |
| Docker compose `--profile dev up` | App loads; all 3 test user types can log in |
