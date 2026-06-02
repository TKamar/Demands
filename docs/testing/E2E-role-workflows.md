# E2E Role Workflow Test Checklist

## Purpose

This document provides a comprehensive manual test checklist for validating end-to-end workflows across all four user roles in the Demands system. It covers both happy path scenarios (normal operation) and sad path scenarios (error handling and access restrictions) to ensure the approval hierarchy, RBAC enforcement, and user workflows function correctly.

## Test Instructions

1. **Setup:** Seed the database with test data using the seed script (see Prerequisites)
2. **Execute:** Follow each test case step-by-step in the order provided
3. **Verify:** Check off each expected outcome as it's confirmed
4. **Document:** Record the status (PASS/FAIL) and any notes in the Status and Notes fields
5. **Track:** Use the Summary Checklist at the end to track overall progress

### Test Data Seed

Before running any tests, execute the seed script to populate test database:

```bash
npm run seed:sub-project-c
```

This creates:
- **Test Users:** admin1, mod1, manager1, user1 with appropriate roles
- **Test Projects:** 3 projects distributed across Center A and Center B
- **Test Demands:** 14-15 demands with various statuses (Pending, CenterManagerApproved, Approved, Rejected, etc.)

---

## Test Cases by Role

### ADMIN ROLE TESTS

#### Admin-HappyPath-01: Global visibility and multi-center approval

**Objective:** Verify admin can view all projects from all centers and make approval decisions across the system.

**Prerequisites:**
- [ ] Logged in as admin1
- [ ] Database seeded with test data (3 projects, 14+ demands)
- [ ] Projects 1 & 2 in Center A, Project 3 in Center B visible in system
- [ ] At least 3 demands with Pending or CenterManagerApproved status ready for approval

**Steps:**
1. Navigate to "Approval Requests" → Projects section
2. Verify that all three projects (Project 1, Project 2, Project 3) are visible in the list
3. Expand Project 1 (Center A) service group to view demands
4. Verify all demands are visible regardless of their current status
5. Click "Deep Decision" button on the service group
6. In the modal, select "Manual Decision" option
7. Approve 1 demand by marking status as "Approved"
8. Leave 1 demand undecided (no selection)
9. Click "Save Decisions (1)" button to process the approval
10. Verify the modal closes and returns to projects view
11. Expand Project 1 again to confirm approved demand now shows Approved status
12. Navigate to Project 3 (Center B) in the projects list
13. Expand Project 3 and verify you can view and interact with Center B demands

**Expected Outcomes:**
- [ ] Admin sees all three projects (both Center A and Center B) in projects list
- [ ] All demands visible when expanding service groups, regardless of current status
- [ ] Deep Decision modal opens without errors when clicking button
- [ ] Manual Decision option available in modal
- [ ] Can select individual demands and assign approval status
- [ ] Partial selection allowed (can approve some, leave others undecided)
- [ ] "Save Decisions" button processes the approval successfully
- [ ] Modal closes after saving
- [ ] Approved demand status persists and is visible in updated accordion view
- [ ] Can navigate between projects from different centers (Center A and Center B)
- [ ] Can view and act on demands from both centers equally

**Status:** [ ] PASS / [ ] FAIL

**Notes:** 
[Document any observations, unexpected behavior, error messages, or additional findings here]


---

#### Admin-SadPath-01: Attempt to approve already-approved demand

**Objective:** Verify graceful handling when admin encounters already-approved demands and confirm no errors occur.

**Prerequisites:**
- [ ] Logged in as admin1
- [ ] Database seeded with test data
- [ ] Project 1 (Center A) visible with at least 1 demand in Approved status

**Steps:**
1. Navigate to "Approval Requests" → Projects section
2. Expand Project 1 service group
3. Identify a demand with "Approved" status in the list
4. Click "Deep Decision" button on the service group containing the approved demand
5. Observe the modal's behavior when handling approved demands
6. Note which demands are available for selection (if any filtering occurs)
7. Attempt to select the approved demand if possible
8. Observe any validation messages or state restrictions

**Expected Outcomes:**
- [ ] Deep Decision modal opens without crashing or error
- [ ] Modal displays state appropriately for already-approved demands
- [ ] Approved demands are either skipped, shown as read-only, or clearly marked as unediteable
- [ ] No error messages or console errors occur
- [ ] User interface gracefully handles terminal status (Approved) without breaking workflow
- [ ] Modal can be closed without adverse effects

**Status:** [ ] PASS / [ ] FAIL

**Notes:** 
[Document any observations about how approved demands are handled, UI behavior, and any edge cases]


---

### CENTER MANAGER ROLE TESTS

#### CenterManager-HappyPath-01: Review and approve pending demands

**Objective:** Verify center manager can view only their center's demands and successfully approve/reject them, with decisions escalating to moderator.

**Prerequisites:**
- [ ] Logged in as manager1 (Center A manager)
- [ ] Database seeded with test data
- [ ] Project 1 (Center A) visible in system
- [ ] Project 1 contains at least 3 Pending demands ready for review

**Steps:**
1. Navigate to "My Center" or "Approval Requests" → Projects section
2. Verify that only Center A projects are visible in the list
3. Expand Project 1 service group to view demands
4. Confirm all demands shown belong to Center A
5. Click "Deep Decision" button on the service group
6. In the modal, select "Manual Decision" option
7. Approve 2 demands by selecting "Approved" status for each
8. Reject 1 demand by selecting "Rejected" status and providing a reason (e.g., "Exceeds budget")
9. Click "Save Decisions" button to process decisions
10. Verify modal closes and returns to projects view
11. Expand Project 1 again to view updated demand statuses
12. Verify approved demands now show status as "CenterManagerApproved"
13. Verify rejected demand shows "Rejected" status
14. Scroll or navigate to locate Project 3 (Center B) in the projects list
15. Attempt to click on or expand Project 3

**Expected Outcomes:**
- [ ] Only Center A projects visible in projects list
- [ ] Cannot see Center B projects (Project 3 either hidden or clearly inaccessible)
- [ ] All visible demands belong to Center A
- [ ] Deep Decision modal opens successfully
- [ ] Manual Decision option available and selectable
- [ ] Can approve multiple demands in single decision batch
- [ ] Can reject demands with reason field
- [ ] "Save Decisions" button processes the approval/rejection successfully
- [ ] Approved demands transition to "CenterManagerApproved" status (awaiting moderator review)
- [ ] Rejected demands transition to "Rejected" status
- [ ] Updated statuses persist and visible in accordion after refresh
- [ ] Project 3 (Center B) is either completely hidden from list or visible but non-interactive

**Status:** [ ] PASS / [ ] FAIL

**Notes:** 
[Document any observations about center filtering, decision processing, and access control enforcement]


---

#### CenterManager-SadPath-01: Attempt to access other center's demands

**Objective:** Verify center manager access control prevents viewing or interacting with other center's demands.

**Prerequisites:**
- [ ] Logged in as manager1 (Center A manager)
- [ ] Database seeded with test data
- [ ] Project 1 & 2 (Center A) visible in system
- [ ] Project 3 (Center B) exists in database

**Steps:**
1. Navigate to "Approval Requests" → Projects section
2. Review the complete list of projects displayed
3. Identify whether Project 3 (Center B) appears in the list
4. If Project 3 is visible, attempt to click on it to expand service groups
5. If Project 3 is not visible, search or scroll to confirm it's not listed
6. If Project 3 can be expanded, attempt to view or interact with its demands
7. Try to click "Deep Decision" on any Center B demand (if visible)
8. Observe UI behavior and any access control messages

**Expected Outcomes:**
- [ ] Project 3 (Center B) is completely hidden from projects list, OR
- [ ] Project 3 is visible but non-interactive (greyed out, read-only indicators)
- [ ] Cannot expand Center B project service groups
- [ ] Cannot view Center B demands if project expands
- [ ] Cannot take any actions (approve, reject, edit) on Center B demands
- [ ] No error crashes or console errors when attempting access
- [ ] UI clearly indicates access restriction (if Project 3 is visible at all)

**Status:** [ ] PASS / [ ] FAIL

**Notes:** 
[Document how access restriction is implemented (hidden vs. disabled), any UI indicators, and edge cases]


---

### MODERATOR ROLE TESTS

#### Moderator-HappyPath-01: Review center manager approvals and create requirement

**Objective:** Verify moderator can review center manager-approved demands, make final decisions (approve/reject/conditional), and create requirements for self.

**Prerequisites:**
- [ ] Logged in as mod1 (Moderator role)
- [ ] Database seeded with test data
- [ ] Project 1 (Center A) visible with demands in "CenterManagerApproved" status
- [ ] At least 3 CenterManagerApproved demands available for moderator review

**Steps:**
1. Navigate to "Approval Requests" → Projects section
2. Expand Project 1 service group
3. Verify demands displayed have "CenterManagerApproved" status (awaiting moderator decision)
4. Click "Deep Decision" button on the service group
5. In the modal, select "Manual Decision" option
6. Approve 1 demand by selecting "Approved" status
7. Conditionally approve 1 demand by selecting "ApprovedWithCondition" and providing condition (e.g., "Approved if disk space available")
8. Leave 1 demand undecided (no selection made)
9. Click "Save Decisions" button to process decisions
10. Verify modal closes and returns to projects view
11. Expand Project 1 again to confirm decisions were applied
12. Verify approved demand shows "Approved" status
13. Verify conditionally approved demand shows "ApprovedWithCondition" status
14. Navigate to "Create Demand" or equivalent menu option
15. Open Create Demand modal/form
16. Create a new requirement for self (mod1), selecting moderator as the creator
17. Specify service and resource details (e.g., 4 CPU cores)
18. Submit the new demand
19. Navigate back to projects list and verify new requirement appears

**Expected Outcomes:**
- [ ] Moderator sees demands in "CenterManagerApproved" status (not Pending or Approved)
- [ ] Deep Decision modal opens for moderator review
- [ ] Manual Decision option available
- [ ] Can approve demands (transition to "Approved")
- [ ] Can conditionally approve demands with reason/condition field
- [ ] Can leave demands undecided (status unchanged)
- [ ] "Save Decisions" button processes all three decision types
- [ ] Decisions persist and visible in updated accordion view
- [ ] Approved and ApprovedWithCondition statuses reflect correct values
- [ ] Can navigate to Create Demand interface
- [ ] Can create new requirement for self (mod1)
- [ ] New requirement appears in system with moderator as creator
- [ ] New requirement is visible in Moderator's approval requests

**Status:** [ ] PASS / [ ] FAIL

**Notes:** 
[Document any observations about decision processing, conditional approval handling, and requirement creation]


---

#### Moderator-SadPath-01: Attempt to create requirement for regular user

**Objective:** Verify moderator cannot create requirements for regular users; permission restricted to moderators and admins only.

**Prerequisites:**
- [ ] Logged in as mod1 (Moderator role)
- [ ] Database seeded with test data
- [ ] Create Demand modal accessible

**Steps:**
1. Navigate to "Create Demand" or equivalent menu option
2. Open the Create Demand modal/form
3. Look for a field to select or assign the requirement creator/owner
4. Attempt to assign the demand to user1 (a regular user) as the creator
5. If dropdown available, select user1 from the list
6. If text field available, type user1 and attempt to submit
7. Observe validation behavior and any permission warnings
8. Try to submit the form with user1 as creator

**Expected Outcomes:**
- [ ] Create Demand modal opens successfully
- [ ] Creator selection field is restricted to moderators/admins only, OR
- [ ] Dropdown/list only shows moderators and admins, excluding regular users
- [ ] If user1 can be selected, attempting to submit shows error message
- [ ] Error message clearly indicates "Cannot create for regular users" or similar
- [ ] Validation prevents form submission when non-moderator assigned
- [ ] Moderator can only create requirements for self or other moderators
- [ ] No system errors or crashes when attempting invalid assignment

**Status:** [ ] PASS / [ ] FAIL

**Notes:** 
[Document how permission restriction is enforced (field restriction vs. form validation), error messages, and UI behavior]


---

### USER ROLE TESTS

#### User-HappyPath-01: Create, view, and edit own pending demands

**Objective:** Verify user can view only their own demands, create new demands, and edit Pending demands while updates persist.

**Prerequisites:**
- [ ] Logged in as user1 (Regular User role)
- [ ] Database seeded with test data
- [ ] Project 1 (Center A) exists and was created by user1
- [ ] Project 1 contains at least 1 Pending demand created by user1
- [ ] Project 1 contains at least 1 Approved demand (for restriction testing)

**Steps:**
1. Navigate to "My Requests" or user dashboard
2. Click on Projects to view user's projects
3. Verify only Project 1 (created by user1) is visible
4. Expand Project 1 service group to view demands
5. Verify all visible demands show user1 as creator
6. Locate a Pending demand in the list
7. Click on the Pending demand to open sidebar/details view
8. Verify demand details displayed correctly (service, quantity, status)
9. Click "Edit" button on the demand sidebar
10. In the edit modal, change the quantity value (e.g., from 2 to 3 units)
11. Submit/save the edited demand
12. Verify modal closes and returns to projects view
13. Expand Project 1 again to confirm updated quantity is visible
14. Verify demand status remains "Pending"
15. Locate an Approved demand in the list
16. Click on the Approved demand to open sidebar
17. Observe the "Edit" button state (should be disabled/greyed out)
18. Hover over the disabled Edit button to see tooltip message

**Expected Outcomes:**
- [ ] User sees only their own projects ("My Requests" filters correctly)
- [ ] Cannot see projects created by other users
- [ ] Can view demands within their own projects
- [ ] All visible demands show user1 as creator
- [ ] Can open demand details sidebar
- [ ] Can open edit modal for Pending demands
- [ ] Quantity and other field edits save successfully
- [ ] Updated values persist and visible in accordion after closing modal
- [ ] Demand status remains "Pending" after edit (not auto-approved)
- [ ] Edit button is present and enabled for Pending demands
- [ ] Edit button is disabled (greyed out) for Approved demands
- [ ] Tooltip or message on disabled Edit explains "Cannot edit approved demands"
- [ ] Cannot edit approved demands even after clicking disabled button

**Status:** [ ] PASS / [ ] FAIL

**Notes:** 
[Document any observations about demand visibility, edit functionality, status preservation, and button states]


---

#### User-SadPath-01: Attempt to edit approved demand

**Objective:** Verify user cannot edit approved demands and UI clearly communicates this restriction.

**Prerequisites:**
- [ ] Logged in as user1 (Regular User role)
- [ ] Database seeded with test data
- [ ] Project 1 (Center A) visible with at least 1 Approved demand

**Steps:**
1. Navigate to "My Requests" → Projects
2. Expand Project 1 service group
3. Locate a demand with "Approved" status
4. Click on the Approved demand to open sidebar/details view
5. Examine the Edit button (should be disabled/greyed out)
6. Attempt to click the disabled Edit button
7. Observe any tooltip or explanatory message that appears
8. Try right-clicking or using keyboard shortcuts to edit (if applicable)
9. Verify no edit modal opens for approved demand

**Expected Outcomes:**
- [ ] Approved demand displays correctly in sidebar with all details
- [ ] Edit button is visually disabled (greyed out, reduced opacity, or disabled cursor)
- [ ] Edit button cannot be clicked or does not respond to click
- [ ] Hovering over Edit button shows tooltip: "Cannot edit approved demands" (or similar message)
- [ ] No CreateDemandModal opens when attempting to edit approved demand
- [ ] Keyboard shortcuts (if available) also respect the edit restriction
- [ ] No error crashes or unexpected behavior when attempting edit
- [ ] User receives clear UX feedback about why edit is unavailable

**Status:** [ ] PASS / [ ] FAIL

**Notes:** 
[Document the UI behavior for disabled Edit button, tooltip content, and any edge cases discovered]


---

## Summary Checklist

Use this checklist to track overall test progress and status:

| # | Test Case | Role | Type | Status |
|---|-----------|------|------|--------|
| 1 | Admin-HappyPath-01: Global visibility and approval | Admin | Happy Path | [ ] PASS / [ ] FAIL |
| 2 | Admin-SadPath-01: Approve already-approved demand | Admin | Sad Path | [ ] PASS / [ ] FAIL |
| 3 | CenterManager-HappyPath-01: Review and approve demands | Center Manager | Happy Path | [ ] PASS / [ ] FAIL |
| 4 | CenterManager-SadPath-01: Attempt to access other center | Center Manager | Sad Path | [ ] PASS / [ ] FAIL |
| 5 | Moderator-HappyPath-01: Review and create requirement | Moderator | Happy Path | [ ] PASS / [ ] FAIL |
| 6 | Moderator-SadPath-01: Create for regular user | Moderator | Sad Path | [ ] PASS / [ ] FAIL |
| 7 | User-HappyPath-01: Create, view, edit own demands | User | Happy Path | [ ] PASS / [ ] FAIL |
| 8 | User-SadPath-01: Edit approved demand | User | Sad Path | [ ] PASS / [ ] FAIL |

**Overall Status:** [ ] All tests passing / [ ] Some failures detected / [ ] Not started

**Date Completed:** _______________

**Tester Name:** _______________

---

## Status Color Guide & Reference

### Demand Status Values
- **Pending:** Initial status when created, awaiting center manager review
- **CenterManagerApproved:** Center manager approved, now awaiting moderator final decision
- **Approved:** Final approved status (can be set by moderator, admin, or center manager at final gate)
- **Rejected:** Rejected by center manager or moderator, terminal status
- **ApprovedWithCondition:** Approved by moderator with conditions, terminal status
- **PartiallyApproved:** Mixed approval on resources within demand, awaiting moderator decision
- **Cancelled:** Cancelled by creator, terminal status

### User Roles & Permissions Matrix

| Role | View | Create | Approve | Reject | Conditional Approve | Edit Others | Self-Edit Limit |
|------|------|--------|---------|--------|---------------------|-------------|-----------------|
| Admin | All demands, all centers | Any | Any demand | Any demand | Any demand | Yes | None (full access) |
| Center Manager | Own center only | Yes (for center) | Own center demands | Own center demands | No | No | First gate only |
| Moderator | CenterManagerApproved+ | For self/moderators | CenterManagerApproved | CenterManagerApproved | CenterManagerApproved | No | Final gate only |
| User | Own demands only | Own projects | No | No | No | No | Pending demands only |

### Test Result Categories

- **PASS:** All expected outcomes confirmed, no errors, workflow completed successfully
- **FAIL:** One or more expected outcomes not observed, error encountered, or workflow blocked
- **BLOCKED:** Test cannot proceed due to environment/data issue (document blocker in Notes)

---

## Quick Reference: Test Data Map

### Projects
- **Project 1 (Center A):** 5 demands (Pending: 3, CenterManagerApproved: 1, Approved: 1)
- **Project 2 (Center A):** 4 demands (Pending: 1, Rejected: 1, ApprovedWithCondition: 1, Cancelled: 1)
- **Project 3 (Center B):** 6 demands (Pending: 2, CenterManagerApproved: 2, PartiallyApproved: 1, Approved: 1)

### Test Users
- **admin1:** Admin role - full system access
- **mod1:** Moderator role - approve CenterManagerApproved demands, create for self
- **manager1:** Center Manager role - manage Center A only
- **user1:** Regular User role - view/edit own demands

---

## Tips for Testers

1. **Prepare a test environment:** Use fresh database seed for clean testing
2. **Take screenshots:** Document UI state before and after each major action for reference
3. **Test in order:** Follow test cases sequentially; later tests may depend on earlier actions
4. **Watch for edge cases:** Check behavior when limits are reached (e.g., no more demands to approve)
5. **Verify persistence:** After actions, refresh or navigate away and back to confirm changes saved
6. **Document carefully:** Use Notes field to record exact error messages, unexpected UI behavior, or missing features
7. **Test on clean session:** Log out and log back in as different user between role tests to avoid state pollution
8. **Check browser console:** Open Developer Tools (F12) and watch Console tab for JavaScript errors during tests

---

## Approval Hierarchy Reference

```
User creates Demand → Pending status
    ↓ (Center Manager reviews)
Center Manager approves → CenterManagerApproved status
    ↓ (Moderator reviews)
Moderator approves → Approved status (Final)
    OR
Moderator rejects → Rejected status (Final)
    OR
Moderator conditionally approves → ApprovedWithCondition (Final)

Admin can:
- Bypass all gates and approve directly to Approved
- Approve/Reject at any stage
- View and act on all projects regardless of center
```
