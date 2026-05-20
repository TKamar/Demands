# CM Sprint Merge Checklist — dir="rtl" Fix

When merging any CM sprint branch into `dev`, verify that these files do NOT contain
hardcoded `dir="rtl"` attributes. The document-level `dir` set by `App.tsx` handles
direction for all children. Hardcoded `dir="rtl"` breaks the English LTR layout.

## Files to audit on merge

| File | Look for | Fix |
|------|----------|-----|
| `client/src/components/main/TopNavTabs.tsx` | `dir="rtl"` on container div | Remove attribute |
| `client/src/components/main/ResourcesForAssignment.tsx` | `dir="rtl"` on container div | Remove attribute |
| `client/src/components/main/RequestHistory.tsx` | `dir="rtl"` on root + empty-state divs | Remove both |
| `client/src/components/main/MyApprovalRequests.tsx` | `dir="rtl"` on root + empty-state divs | Remove both |
| `client/src/components/main/RequestsIOpened.tsx` | `dir="rtl"` on root + empty-state divs | Remove both |
| `client/src/components/management/CmDecisionModal.tsx` | `dir="rtl"` on overlay div | Remove attribute |
| `client/src/components/management/WalletSummary.tsx` | `dir="rtl"` on container div | Remove attribute |
| `client/src/components/settings/UserManagement.tsx` | `dir="rtl"` on outer `<div className="p-4">` | Remove attribute |

## Correct pattern

Use the `useDirection` hook (added in `feature/i18n-fix`) when a component
needs directional logic (e.g., icon rotation, padding flip):

```tsx
import { useDirection } from '../../hooks/useDirection';
const { dir } = useDirection();
// use `dir` prop only when explicitly needed, not on every wrapper div
```

## Why this matters

`App.tsx` is the single source of truth for document direction. It sets
`document.documentElement.dir` and `document.documentElement.lang` via a
`useEffect` on `i18n.language`. All child elements inherit direction from
the document root — hardcoding `dir="rtl"` on individual components bypasses
this and permanently locks those components to RTL regardless of language.
