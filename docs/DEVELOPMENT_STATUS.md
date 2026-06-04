# Development Status

## Task: Resolve PR #8 Merge Conflicts

**Status:** Complete  
**PR:** `feature/center-home-page` → `dev` (#8) — now CLEAN / MERGEABLE

### Conflicts Resolved

| File | Resolution |
|------|-----------|
| `client/src/components/projects/StatusBadge.tsx` | Kept dev's dark mode variants for all 6 existing statuses; added `PendingCenterManager` (orange) and `CenterManagerRejected` (deep red) with matching dark variants |
| `client/src/i18n/locales/en/translation.json` | Dev as base (main/centerFilter/resourceSummary/project/notifications/theme); added feature's CM namespaces (users/status/tabs/approvalRequests/myRequests/resourceAssignment/history/actions); used dev's shorter CM status labels |
| `client/src/i18n/locales/he/translation.json` | Same strategy — dev base + feature's Hebrew CM namespaces |
| `server/prisma/schema.prisma` | Kept both User/UserRole model (feature) and Notification/NotificationType model (dev) |

### Auto-Merged (no manual action needed)
- `client/src/pages/MainPage.tsx` — dev had no changes since branch point
- `client/src/types/domain.ts` — dev had no changes; feature's UserRole/AppUser/CM DemandStatus values applied cleanly
- All server API/controller/service files — dev had no changes to those

### Key Decisions
- CM status badge label length: kept dev's shorter form ("Pending CM Approval" / "Rejected by CM") for better table/badge display fit
- `status.*` top-level namespace: preserved alongside `projects.status.*` — new CM components use `t('status.X')` while StatusBadge uses `t('projects.status.X')`

---


## Task: Fix Incomplete i18n Localization

**Status:** Complete  
**Branch:** `feature/i18n-missing-keys` → merged to `dev`

### Root Cause
Components call `t('key', 'English fallback')` with keys absent from the locale JSON files.
i18next returns the English fallback for all languages regardless of selection.

### What Was Fixed

| Area | Fix |
|------|-----|
| Tab labels (Projects & Requirements, Requirements) | Added `main.tabs.*` |
| Search placeholder | Added `main.search.placeholder` |
| Action buttons (New Project, New Requirement) | Added `main.actions.*` |
| Center filter label + dropdown | Added `centerFilter.*` |
| Resources strip label | Added `resourceSummary.*` |
| Table column headers (Name, Type, Center, Priority, Status) | Added `project.*` singular namespace |
| Demand sub-table headers (Service, Resource, Value, Status) | Added to `demand.*` |
| Project/demand empty states | Added `projects.empty`, `demands.empty` |
| Filter options (Emergency, Semiannual, H1, H2, P1-P3) | Replaced hardcoded labels with `t()` calls in RequirementsView |
| Pre-existing parity gaps | Fixed `projects.demandType.*` in he + `management.*.columns.cluster` in en |

### Reusable Patterns Available
- `useDirection` hook: `client/src/hooks/useDirection.ts`
- `Tx` wrapper: `client/src/components/common/Tx.tsx`
- `useLocalizedOptions` hook: `client/src/hooks/useLocalizedOptions.ts`
- CM sprint dir="rtl" removal checklist: `docs/CM_MERGE_CHECKLIST.md`

### Pattern: Adding a new translatable component
1. Call `t('yourNamespace.yourKey', 'English fallback')` in code
2. Add `yourNamespace.yourKey` to BOTH `en/translation.json` AND `he/translation.json`
3. The fallback string is English-only insurance — Hebrew rendering requires the JSON key
