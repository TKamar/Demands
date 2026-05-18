# Center Manager & Multi-Step Approval — Implementation Progress

> Last updated: 2026-05-19
> Plan file: `.claude/plans/task-brief-implementation-floofy-axolotl.md`

---

## Branch Status

| # | Branch | Status | Commits |
|---|--------|--------|---------|
| 1 | `feature/center-manager-role` | ✅ Complete | `2fb887b`, `268cf2f`, `ff84ca6` |
| 2 | `feature/center-home-page` | ✅ Complete | `bdfee6f`, `d1760ae` |
| 3 | `feature/multi-step-approval` | ✅ Complete | `bf1aa19`, `f479dc5` |
| 4 | `feature/request-history-restore` | ✅ Complete | `b25030a`, `d0e8316` |
| 5 | `feature/resource-assignment` | ✅ Complete | `4a46571` |
| 6 | `feature/moderator-bulk-decision` | ⬜ Not started | — |

---

## What's Done (Branches 1–5)

### Branch 1 — Center Manager Role
- `UserRole` enum (`ADMIN`, `MODERATOR`, `CENTER_MANAGER`, `REGULAR_USER`) in Prisma schema
- `User` model (username PK, role, centerName FK → Center) + migration
- `DemandStatus` extended: `PendingCenterManager`, `CenterManagerRejected`
- `server/src/models/auth/user.model.ts` — DB-backed class with `canManageCenter()`
- `server/src/middleware/authorization.ts` — `requireAuth` now async-upserts user from DB; `requireCenterManager` added
- `server/src/services/admin/user.service.ts` — `getAll`, `updateRoleAndCenter` (guards self-demotion + last-admin)
- `server/src/controllers/admin/user.controller.ts` + `server/src/routes/admin/user.routes.ts`
- `GET /api/me` endpoint returns `{username, fullName, role, centerName}`
- `client/src/hooks/useCurrentUser.ts` — fetches `/api/me` on auth
- `client/src/components/settings/UserManagement.tsx` — admin table: role + center dropdowns, save button
- `client/src/pages/SettingsPage.tsx` — "User Management" tab for ADMIN only
- i18n keys: `settings.*`, `users.*`, `status.*`, `projects.status.PendingCenterManager/CenterManagerRejected`

**Key fixes applied:**
- Added `authenticate` middleware before `requireAuth` on all new routes (was causing 401)
- `requireAdmin` now has DB fallback for promoted admins not yet in OIDC groups
- `requireAuth` returns 503 (not silent REGULAR_USER) on DB failure

---

### Branch 2 — Center Home Page
- `client/src/components/main/TopNavTabs.tsx` — toggle tabs: My Approval Requests (CM only), Requests I Opened, Request History; clicking active tab deselects
- `client/src/components/main/MyApprovalRequests.tsx` — `forwardRef` + `useImperativeHandle` exposing `reload()`; table of `PendingCenterManager` demands with Approve/Reject buttons
- `client/src/components/main/RequestsIOpened.tsx` — user's own demands, paginated
- `client/src/components/main/ResourcesForAssignment.tsx` — placeholder (replaced in Branch 5)
- `GET /api/demands/center/pending` backend endpoint
- `MainPage.tsx` wired with `topNavTab` state + conditional panel rendering

**Key fixes applied:**
- `getDemandsByCenterAndStatus` now includes `service` + `resource` (so `demand.unit` is populated)
- `fetchDemands` returns `{ data, meta }` — fixed dead `Array.isArray` check in `RequestsIOpened`

---

### Branch 3 — Multi-Step Approval
- `demand.service.ts` `create()` defaults status to `PendingCenterManager`
- `update()` and `cancel()` accept both `'Pending'` and `'PendingCenterManager'`
- `cmApprove(id)` → transitions `PendingCenterManager` → `Pending`
- `cmReject(id, reason)` → transitions `PendingCenterManager` → `CenterManagerRejected`
- Routes: `PATCH /api/demands/:id/cm-approve`, `PATCH /api/demands/:id/cm-reject`
- `client/src/components/management/CmDecisionModal.tsx` — approve/reject radio, reason textarea (reject only, required), demand summary
- `MainPage.tsx` wired with `cmDecisionDemand` + `cmDecisionInitial` state; passes `initialDecision` to modal

**Key fix applied:**
- `CmDecisionModal` now accepts `initialDecision` prop so clicking "Reject" pre-selects rejection

---

### Branch 4 — Request History & Restore
- `getHistory` backend: regular users see own, CM sees center (OR creator), mods see managed services, admin sees all; limit 500
- `restore` backend: checks `['Rejected', 'CenterManagerRejected']`, checks permission (admin OR creator OR canManageCenter), resets to `PendingCenterManager`
- Routes: `GET /api/demands/history`, `PATCH /api/demands/:id/restore`
- `client/src/components/main/RequestHistory.tsx` — RTL table, StatusBadge, Restore button for rejected statuses, `window.confirm` guard
- `MainPage.tsx` wired `{topNavTab === 'history' && <RequestHistory />}`
- `StatusBadge.tsx` updated with `PendingCenterManager` + `CenterManagerRejected` entries

**Key fix applied:**
- Moderator `getHistory` scoped to managed services (mirrors bulkApprove pattern)
- CM history uses OR-combined `centerName` + `createdBy`

---

### Branch 5 — Resource Assignment
- `assign` endpoint: `PATCH /api/demands/:id/assign` — requires `assignedValue > 0`, `status === 'Pending'`, `canManageCenter`
- `client/src/components/main/ResourcesForAssignment.tsx` — full impl: fetches `Pending` demands, inline number inputs pre-filled with existing `approvedValue`, calls `cmAssignDemand` on save
- `cmAssignDemand(id, value)` API service function added

> **Spec note:** `assign` guards on `status === 'Pending'` (after CM approval). If the intent is to let CMs pre-assign before approving, this guard should change to `PendingCenterManager`. No defect — matches the written plan — but may warrant product discussion.

---

## What's Left

### Branch 6 — `feature/moderator-bulk-decision` ⬜

**Scope:**
1. **`WalletSummary.tsx`** — new component showing center wallet balance (value, allocated, available) per capacity; used inside `BulkDecisionModal`
2. **`BulkDecisionModal.tsx`** — enhanced with:
   - `WalletSummary` embedded at top
   - Approval mode selector: Full Amount / Specific Amount / Percentage
   - Percentage mode computes total from selected demands' `value` sum
   - 3-state dialog: `idle → confirming → success/error`
   - Stats row: selected count + total requested
3. **i18n keys** for `bulkDecision.*`, `wallet.*`, `decisionStatus.*`, `actions.next/back/confirm`
4. **Build + commit**

**Files to touch:**
| Action | Path |
|--------|------|
| Modify | `client/src/components/management/BulkDecisionModal.tsx` |
| Create | `client/src/components/management/WalletSummary.tsx` |
| Modify | `client/src/api/apiService.ts` (add `fetchWallets`) |
| Modify | `client/src/i18n/locales/en/translation.json` |
| Modify | `client/src/i18n/locales/he/translation.json` |

---

### Final Verification Checklist (after Branch 6 merge)

- [ ] New user logs in → REGULAR_USER in DB, no center
- [ ] Admin promotes user to CENTER_MANAGER via Settings → User Management
- [ ] CM user sees "My Approval Requests" tab; Regular User does not
- [ ] New demand → status `PendingCenterManager`
- [ ] CM approves → status `Pending` (in mod queue)
- [ ] CM rejects → status `CenterManagerRejected`
- [ ] CM-rejected demand: Restore button in history → back to `PendingCenterManager`
- [ ] Mod-rejected demand: Restore button → back to `PendingCenterManager`
- [ ] CM sees `Pending` demands in "Resources for Assignment", can set `approvedValue`
- [ ] Moderator bulk decision: wallet summary shows, percentage mode calculates correctly, confirm dialog appears, success state shown

---

## Migration Note

`prisma migrate dev` fails from Windows host (scram-sha-256 auth to Docker PostgreSQL).

**Workaround:** Migration file was created manually at `server/prisma/migrations/20260518000000_add_user_model_and_cm_statuses/migration.sql`. To apply in production/dev:

```bash
docker compose exec server npx prisma migrate deploy
```

## Bootstrap Note

First admin must be set directly in DB (no UI yet to promote the very first admin):

```sql
UPDATE "User" SET role = 'ADMIN' WHERE username = '<your-username>';
```
