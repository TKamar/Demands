# Development Status

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
