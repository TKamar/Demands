# Sub-Project C: Mock Data & E2E Role Flow Testing

Date: 2026-06-02

## Overview

Create comprehensive seed data and test documentation to validate end-to-end workflows across all four user roles (admin, moderator, center manager, regular user) with both happy-path and sad-path scenarios. This enables manual E2E testing of the complete demand approval hierarchy and RBAC enforcement.

---

## Role Responsibilities & Approval Hierarchy

### Admin
- **Visibility:** All projects and requirements in system (global view)
- **Actions:** Create, edit, delete, approve, reject, deep decision on ANY demand
- **Approval Gate:** Bypasses all other approval gates (can approve directly)
- **Test Focus:** Unrestricted access to all functionality

### Center Manager
- **Visibility:** Requirements for their center only
- **Actions:** Approve/reject requirements (first approval gate)
- **Escalation:** Approved requirements forward to moderator for final approval
- **Status Flow:** Pending → CenterManagerApproved → (awaits moderator decision)
- **Test Focus:** Local approval authority, cannot see other centers

### Moderator
- **Visibility:** Requirements approved by center managers (second approval gate queue)
- **Actions:** Approve/reject/conditionally approve requirements; create requirements for self or other moderators
- **Escalation:** Final decision authority (after center manager approval)
- **Status Flow:** CenterManagerApproved → Approved/Rejected/ApprovedWithCondition
- **Test Focus:** Multi-step decision-making, cannot create for regular users

### Regular User
- **Visibility:** Only their own demands and projects they created
- **Actions:** Create demands, edit/cancel Pending demands
- **Restrictions:** Cannot edit Approved/Rejected/other terminal statuses, cannot see others' demands
- **Status Flow:** Create → Pending → (awaits center manager approval)
- **Test Focus:** Create and manage own demands

---

## Seed Data Structure

### Test Database State

**Total Demands:** 12-15 across 3 projects

| Status | Count | Notes |
|--------|-------|-------|
| Pending | 4 | Created by users, awaiting center manager review |
| CenterManagerApproved | 3 | Center manager approved, awaiting moderator decision |
| Approved | 2 | Fully approved (by moderator or admin) |
| Rejected | 2 | Rejected by moderator/admin |
| ApprovedWithCondition | 1 | Conditional approval by moderator |
| PartiallyApproved | 1 | Partial approval (resources mixed) |
| Cancelled | 1 | Cancelled by user |

### Project & Center Distribution

**Project 1 (Center A):** 5 demands
- Created by: user1
- Statuses: Pending (3), CenterManagerApproved (1), Approved (1)
- Services: Compute (3 resources), Storage (2 resources)

**Project 2 (Center A):** 4 demands
- Created by: user1 (2), admin1 (2)
- Statuses: Pending (1), Rejected (1), ApprovedWithCondition (1), Cancelled (1)
- Services: Compute (2), Network (2)

**Project 3 (Center B):** 6 demands
- Created by: user1
- Statuses: Pending (2), CenterManagerApproved (2), PartiallyApproved (1), Approved (1)
- Services: Storage (4), Network (2)

### Test Users

| Username | Role | Center | Purpose |
|----------|------|--------|---------|
| admin1 | Admin | All | Global access, test unrestricted actions |
| mod1 | Moderator | System-wide | Test moderator approval queue, requirement creation |
| manager1 | Center Manager | Center A | Test center-level approvals, access control |
| user1 | Regular User | - | Test demand creation, self-service workflow |

---

## E2E Test Scenarios

### Admin - Happy Path

**Scenario:** Admin creates project, views all demands from all centers, makes decisions

**Prerequisites:**
- Logged in as admin1
- Projects 1, 2, 3 exist with mixed-status demands

**Steps:**
1. Navigate to "Approval Requests" → Projects
2. Verify Projects 1, 2, 3 all visible (from both Center A and Center B)
3. Expand Project 1 service group → See all demands
4. Click "Deep Decision" on service group
5. In modal: Select "Manual Decision"
6. Approve 1 demand, leave 1 undecided
7. Click "Save Decisions (1)" → Verify approval processed
8. Navigate to Project 3 (Center B) → Confirm can view/act on it

**Expected Outcomes:**
- ✅ Admin sees all projects regardless of center
- ✅ Can open Deep Decision modal on any service group
- ✅ Approves demands successfully with partial selection allowed
- ✅ Can navigate between projects from different centers
- ✅ Can create demands for any center

---

### Admin - Sad Path

**Scenario:** Admin attempts to approve already-approved demand

**Prerequisites:**
- Logged in as admin1
- Project 1 with Approved demands visible

**Steps:**
1. Expand Project 1 → Find Approved demand
2. Attempt to click "Deep Decision" on service group with approved demand
3. Observe Deep Decision behavior for approved demands

**Expected Outcomes:**
- ✅ Modal opens or shows appropriate state (approved demands may be skipped/uneditable)
- ✅ No error crash; graceful handling of terminal status

---

### Center Manager - Happy Path

**Scenario:** Center manager reviews pending demands, approves/rejects, sees escalation

**Prerequisites:**
- Logged in as manager1
- Project 1 (Center A) with 3 Pending demands visible

**Steps:**
1. Navigate to "My Center" or "Approval Requests" → Verify only Center A projects shown
2. Expand Project 1 service group
3. Click "Deep Decision"
4. Approve 2 demands (manual path: select "Approved")
5. Reject 1 demand (select "Rejected" with reason)
6. Save decisions
7. Verify demands now show as CenterManagerApproved/Rejected in accordion
8. Try to navigate to Project 3 (Center B) → Verify access denied or hidden

**Expected Outcomes:**
- ✅ Center manager sees only Center A demands
- ✅ Can approve/reject with decisions processed
- ✅ Approved demands marked as CenterManagerApproved (awaiting moderator)
- ✅ Cannot view/access other centers' projects
- ✅ Rejected demands move to rejected status

---

### Center Manager - Sad Path

**Scenario:** Center manager tries to access other center's demands

**Prerequisites:**
- Logged in as manager1
- Project 3 (Center B) created

**Steps:**
1. Navigate to Projects list
2. Attempt to view/expand Project 3 (Center B)
3. Observe access control behavior

**Expected Outcomes:**
- ✅ Project 3 hidden from list, or visible but non-interactive
- ✅ Cannot expand, cannot see demands, cannot take actions
- ✅ UI clearly indicates access restriction (if visible at all)

---

### Moderator - Happy Path

**Scenario:** Moderator reviews center manager approvals, makes final decisions, creates requirement

**Prerequisites:**
- Logged in as mod1
- Project 1 with CenterManagerApproved demands from center manager approval
- No prior moderator decision made on these demands

**Steps:**
1. Navigate to "Approval Requests" → Projects
2. Expand Project 1 service group → See CenterManagerApproved demands
3. Click "Deep Decision"
4. Select "Manual Decision"
5. Approve 1 demand (Approved status)
6. Conditionally approve 1 demand (ApprovedWithCondition with reason)
7. Leave 1 undecided
8. Save decisions
9. Verify decisions processed
10. Navigate to "Create Demand" → Create new requirement for self
11. Verify new requirement appears in system

**Expected Outcomes:**
- ✅ Moderator sees CenterManagerApproved demands
- ✅ Can approve/reject/conditionally approve each demand
- ✅ Undecided demands remain in current status
- ✅ Can create requirements for self
- ✅ New requirement visible in system with moderator as creator

---

### Moderator - Sad Path

**Scenario:** Moderator tries to create requirement for regular user

**Prerequisites:**
- Logged in as mod1
- Create Demand modal open

**Steps:**
1. Open "Create Demand" modal
2. Attempt to assign demand to user1 (regular user) instead of self
3. Observe validation/permission behavior

**Expected Outcomes:**
- ✅ Cannot create for regular users
- ✅ Error shown or field restricted to moderators only
- ✅ Can only create for self or other moderators

---

### User - Happy Path

**Scenario:** User creates demand, views in My Requests, edits while pending

**Prerequisites:**
- Logged in as user1
- Project 1 exists (created by user1 in seed data)

**Steps:**
1. Navigate to "My Requests" → Projects
2. Expand Project 1 → See user1's own demands
3. Click on a Pending demand → Open sidebar
4. Click "Edit" → Open CreateDemandModal with pre-filled data
5. Modify quantity/unit → Submit
6. Verify demand status remains Pending
7. Verify updated values show in accordion
8. Attempt to edit an Approved demand → Observe disabled state

**Expected Outcomes:**
- ✅ User sees only their own demands
- ✅ Can edit Pending demands
- ✅ Updated values persist
- ✅ Cannot edit Approved/terminal status demands (button disabled)
- ✅ Cannot see demands from other users

---

### User - Sad Path

**Scenario:** User tries to edit approved demand

**Prerequisites:**
- Logged in as user1
- Project 1 with Approved demand visible

**Steps:**
1. Expand Project 1 → Find Approved demand
2. Click on Approved demand → Open sidebar
3. Attempt to click "Edit" button

**Expected Outcomes:**
- ✅ Edit button is disabled (greyed out)
- ✅ Cannot open CreateDemandModal for approved demands
- ✅ Tooltip or message explains "Cannot edit approved demands"

---

## Seed Data Script

**File:** `server/scripts/seed-sub-project-c.ts`

**Functionality:**
- Creates test users: admin1, mod1, manager1, user1 (with correct roles)
- Creates 3 projects with assigned centers (A, A, B)
- Creates 12-15 demands with proper ownership and statuses
- Sets correct `createdBy`, `status`, `serviceName`, and resource data
- Idempotent: safe to run multiple times (deletes/recreates test data)

**Usage:**
```bash
npm run seed:sub-project-c
```

**Output:**
```
✅ Test data seeded successfully
- Created users: admin1, mod1, manager1, user1
- Created projects: 3 (Project Alpha, Project Beta, Project Gamma)
- Created demands: 14 total
  - Pending: 4
  - CenterManagerApproved: 3
  - Approved: 2
  - Rejected: 2
  - ApprovedWithCondition: 1
  - PartiallyApproved: 1
  - Cancelled: 1
```

---

## Test Checklist

**File:** `docs/testing/E2E-role-workflows.md`

**Format:** Markdown checklist with sections for each role and scenario type

**Structure:**
```
## Admin Role Tests

### Admin-HappyPath-01: Global visibility and approval
- Prerequisites: [...]
- Steps: [numbered list]
- Expected: [checkboxes]
- Status: [ ] PASS / [ ] FAIL

### Admin-SadPath-01: Approve already-approved demand
...

## Center Manager Role Tests

### CenterManager-HappyPath-01: Review and approve
...
```

**Checkbox Format:**
```markdown
**Expected Outcomes:**
- [ ] Outcome 1 observed
- [ ] Outcome 2 observed
- [ ] Outcome 3 observed

**Status:** [ ] PASS / [ ] FAIL

**Notes:** [Any observations, errors, or unexpected behavior]
```

---

## Files to Create & Modify

### Files Created

1. **`server/scripts/seed-sub-project-c.ts`** (~250 lines)
   - Seed script with all test data creation logic

2. **`docs/testing/E2E-role-workflows.md`** (~450 lines)
   - Master test checklist with all scenarios and step-by-step instructions

### Files Modified

1. **`server/package.json`**
   - Add script: `"seed:sub-project-c": "ts-node scripts/seed-sub-project-c.ts"`

2. **`WORK_LOG.md`**
   - Document Sub-Project C completion
   - List all test scenarios
   - Link to test checklist

---

## Out of Scope

- Automated E2E tests (Cypress/Playwright) — manual testing with checklist
- Load/performance testing — focuses on workflow validation
- Mobile testing — desktop browser only
- Accessibility testing — not included in this sprint

---

## Success Criteria

- ✅ Seed script runs successfully and populates all test data
- ✅ All 4 roles can be tested with appropriate data visibility
- ✅ Happy path scenarios can be completed without errors
- ✅ Sad path scenarios show appropriate error handling
- ✅ RBAC restrictions enforced (center manager cannot see other centers, user cannot edit approved, etc.)
- ✅ Approval hierarchy works (Center Manager → Moderator → Admin can bypass)
- ✅ Test checklist is clear and executable by team members

---

## Next Steps

1. Implementation: Create seed script and test checklist
2. Manual testing: Run through all scenarios with test data
3. Verification: Confirm all test cases pass and document results
4. Cleanup: Update WORK_LOG with completion summary
5. Merge to dev for team use
