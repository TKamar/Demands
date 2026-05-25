# Sprint Status — RBAC / Multi-Resource / Decision-Dialog Sprint

**Date paused:** 2026-05-25  
**Working branch:** `dev` (all completed phases already merged)  
**Next branch to create:** `feat/decision-dialog-refactor` (Phase 5)

---

## What Is Done

| Phase | Branch | Description | Merged to dev |
|-------|--------|-------------|---------------|
| 1 | `feat/db-schema-sprint4` | DB schema: requirementGroupId, prerequisiteDemandId, isInternalTicket, WaitingOnPrerequisite enum | ✅ |
| 2 | `feat/backend-history-transfer` | CM endpoints, history endpoint, group creation, transfer, atomic approve/reject | ✅ |
| 3 | `feat/rbac-view-architecture` | Role-aware tabs, sub-view panels, RequestHistory | ✅ |
| 4 | `feat/multi-resource-form` | Multi-row ResourceRow component, createDemandGroup form submission | ✅ |

---

## What Is Next

### Phase 5 — Decision Dialog Refactor
**Branch to create:** `feat/decision-dialog-refactor` (from `dev`)

**Files to create/modify:**

1. **Create `client/src/components/management/CmDecisionModal.tsx`**
   - Simple modal for Center Manager approve/reject flow
   - Props: `open: boolean`, `onClose: () => void`, `demand: Demand | null`
   - Approve button → calls `centerManagerApproveDemand(demand.id)` from apiService
   - Reject: shows textarea for reason → calls `centerManagerRejectDemand(demand.id, reason)`
   - On success: close modal + show toast + call `onSuccess()` so parent can refresh list

2. **Modify `client/src/components/main/MyApprovalRequests.tsx`**
   - Currently `onApprove` and `onReject` props are wired with empty handlers in `ApprovalRequestsPanel`
   - Replace the `onApprove`/`onReject` callback pattern with internal `CmDecisionModal` state
   - Add `selectedDemand: Demand | null` state
   - Set it when user clicks Approve or Reject button in the table
   - Render `<CmDecisionModal>` at bottom of component
   - On `CmDecisionModal.onSuccess`: call `reload()` to refresh the list

3. **Modify `client/src/components/management/DecisionModal.tsx`**
   - Read the current file first to understand its structure
   - Add two-path state machine for Moderator:
     ```typescript
     type DecisionPath = 'select' | 'manual' | 'transfer'
     const [path, setPath] = useState<DecisionPath>('select')
     ```
   - `select` view: two large clickable cards
     - "קבלת החלטה ידנית" → `setPath('manual')`
     - "העברה למנהל שירות אחר" → `setPath('transfer')`
   - `manual` view: existing approve/reject UI (already there)
   - `transfer` view:
     - Service selector (all active services except demand's current service)
     - Notes textarea (optional)
     - Submit → calls `transferDemand(demand.id, targetServiceName)` from apiService
     - On success: close + toast + refresh
   - Add "Back" button in `manual` and `transfer` views to return to `select`
   - Reset `path` to `'select'` when modal closes/opens with new demand

4. **Modify `client/src/components/main/RequirementsView.tsx`**
   - Add `WaitingOnPrerequisite` visual handling:
     - `StatusBadge` already handles it (indigo color) ← already done in Phase 2
     - Disable `MdGavel` decide button for demands with `status === 'WaitingOnPrerequisite'`
     - Add tooltip: "ממתין לתנאי מוקדם — ההחלטה תיפתח כשהדרישה הפנימית תושלם"
   - Read file first to find where `setDecisionDemand` or `onMakeDecision` is called

5. **Modify `client/src/components/main/panels/ApprovalRequestsPanel.tsx`**
   - Remove `onApprove` and `onReject` props (they're no longer needed — CmDecisionModal is internal to MyApprovalRequests)
   - Remove them from the interface and from `MainPage.tsx` render call

**API functions already available in `client/src/api/apiService.ts`:**
- `centerManagerApproveDemand(id: number)` 
- `centerManagerRejectDemand(id: number, reason: string)`
- `transferDemand(id: number, targetServiceName: string)`

---

### Phase 6 — Work Log Update
**Branch to create:** `chore/sprint4-work-log` (from `dev`)

- Update `WORK_LOG.md` with Phase 5 entry
- Push `dev` to origin

---

## Git Protocol Reminders

- Every new phase = new branch from `dev`
- Merge only to `dev`, never to `main`
- No AI traces in commits, code, comments, or docs
- Commit author: `tkamar` (`tomer.kamar@gmail.com`) only
- Run `npx tsc --noEmit` on both `client/` and `server/` before committing

---

## Key Files Reference

| File | Role |
|------|------|
| `client/src/components/management/DecisionModal.tsx` | Moderator decision — needs two-path refactor |
| `client/src/components/management/CmDecisionModal.tsx` | TO CREATE — CM approve/reject |
| `client/src/components/main/MyApprovalRequests.tsx` | Needs CmDecisionModal wired in |
| `client/src/components/main/RequirementsView.tsx` | Needs WaitingOnPrerequisite disable on decide action |
| `client/src/components/main/panels/ApprovalRequestsPanel.tsx` | Remove onApprove/onReject props |
| `client/src/api/apiService.ts` | All new API functions already present |
| `client/src/types/domain.ts` | DemandStatus union includes WaitingOnPrerequisite |

---

## How to Continue

1. `git checkout dev && git pull origin dev`
2. `git checkout -b feat/decision-dialog-refactor`
3. Read `client/src/components/management/DecisionModal.tsx` in full
4. Implement steps 1–5 from Phase 5 above
5. Run `npx tsc --noEmit` in `client/`
6. Commit and merge to `dev`
7. Create `chore/sprint4-work-log`, update `WORK_LOG.md`, merge + push
