# Admin Guide — Settings & Infrastructure Management

## Overview
The Admin Settings panel allows full control over the Demands system: managing centers, branches, services, moderators, users, and resource capacities. This guide covers common workflows.

## Access Requirements
- **Role:** ADMIN only
- **Navigation:** Main menu → Settings icon (gear)

---

## Section 1: Organization Hierarchy

### Managing Centers

**To Create a New Center:**
1. Settings → Organization tab → Centers sub-tab
2. Click "Create Center"
3. Fill in:
   - **Name** (required, unique): e.g., "Finance Center"
   - **Display Name** (optional): e.g., "Central Finance"
4. Click "Save"

**To Rename a Center:**
1. Find the center in the Centers table
2. Click the "Edit" icon (pencil)
3. Modify **Display Name** or other fields
4. Click "Save"

**To Deactivate a Center:**
1. Find the center in the Centers table
2. Click the "Edit" icon
3. Toggle **Active** to OFF
4. Click "Save"
5. Note: Deactivated centers still appear for historical data; requests cannot be created in deactivated centers

**To Delete a Center:**
1. Find the center in the Centers table
2. Click the "Delete" icon (trash)
3. Confirm in dialog
4. Warning: Deletes all branches, sections, and requests in this center (use deactivation to preserve history)

### Managing Branches

**To Create a Branch:**
1. Settings → Organization tab → Branches sub-tab
2. Click "Create Branch"
3. Select **Center** from dropdown (required)
4. Enter **Branch Name** (required, unique per center)
5. Enter **Display Name** (optional)
6. Click "Save"

**To Move a Branch to Another Center:**
1. Cannot move existing branches; delete and recreate in the new center
2. Or: Use database directly with a migration

### Managing Sections

**To Create a Section:**
1. Settings → Organization tab → Sections sub-tab
2. Click "Create Section"
3. Select **Center** (required)
4. Select **Branch** (auto-filtered by center, required)
5. Enter **Section Name** (required)
6. Enter **Display Name** (optional)
7. Click "Save"

---

## Section 2: Services & Resources

### Managing Services

**To Create a New Service:**
1. Settings → Services tab
2. Click "Add Service"
3. Enter **Service Name** (required, e.g., "PostgreSQL")
4. Click "Save"

**To Assign Moderators to a Service:**
1. Settings → Services tab
2. Find the service in the table
3. Click "Edit" next to the service
4. Checkboxes appear for each moderator (mod1, mod2, etc.)
5. Check the boxes for moderators responsible for this service
6. Click "Save"

**Example moderator assignments:**
- VM: mod1 (handles all virtual machine requests)
- PostgreSQL: mod4 (database specialist)
- Openshift: mod1, mod7 (shared responsibility)

### Managing Resources

**To Create a New Resource:**
1. Settings → Services tab → Resources sub-section
2. Click "Add Resource"
3. Select **Service** (required, e.g., "VM")
4. Enter **Resource Name** (required, e.g., "vCPU")
5. Enter **Unit** (required, e.g., "count", "GB", "Mbps")
6. Click "Save"

**Resource Units Examples:**
- CPU cores: "count"
- Memory: "GB"
- Storage: "TB"
- Network: "Mbps"
- Custom: "units" or "licenses"

---

## Section 3: User Management

### Viewing All Users

1. Settings → User Management tab
2. Table shows all users with columns: Username, Full Name, Role, Center

### Assigning or Changing a User's Role

**Single User:**
1. Find the user in the table
2. Click the Role dropdown
3. Select new role:
   - **ADMIN**: Full system access, all settings visible
   - **MODERATOR**: Can approve requests for assigned services only
   - **CENTER_MANAGER**: Can approve requests for their assigned center
   - **REGULAR_USER**: Can create requests, see own requests and history
4. Click "Save"

**Multiple Users (Bulk):**
1. Check the checkboxes next to multiple users
2. A toolbar appears: "3 users selected"
3. Click one of the bulk role buttons:
   - "Set Role to Admin"
   - "Set Role to Moderator"
   - "Set Role to Center Manager"
   - "Set Role to Regular User"
4. Confirm in dialog
5. All selected users' roles updated instantly

### Assigning a Center Manager

**To Make a User a Center Manager:**
1. Select the user in User Management
2. Click Role dropdown → "CENTER_MANAGER"
3. A Center dropdown appears
4. Select the center they manage (e.g., "IT Center")
5. Click "Save"

**Effect:** This user can now:
- See "My Approval Requests" tab
- Approve/reject requests from their center (PendingCenterManager status)
- Cannot approve requests from other centers

**Example:**
```
user2 → Role: CENTER_MANAGER, Center: IT Center
```

### Removing a Center Manager

1. Select the user
2. Click Role dropdown → any other role (e.g., "REGULAR_USER")
3. Center dropdown disappears
4. Click "Save"

---

## Section 4: Capacity & Wallet Management

### Managing Capacities

Capacities define the total available resources at each location.

**To Create a Capacity:**
1. Settings → Capacity tab
2. Click "Add Capacity"
3. Select **Location** (e.g., "Datacenter A - Production - Internal - Cluster-A")
4. Select **Service & Resource** (e.g., "VM" service, "vCPU" resource)
5. Enter **Total Value** (e.g., "1000" vCPU)
6. Click "Save"

**To View Capacity Usage:**
1. Capacity table shows: Location, Resource, Total, Allocated, Available
2. **Allocated** = sum of all approved demands for this resource at this location
3. **Available** = Total - Allocated

### Managing Wallets

Wallets assign center-specific budgets for resources.

**To Create a Wallet:**
1. Settings → Wallets tab
2. Click "Add Wallet"
3. Select **Center** (e.g., "IT Center")
4. Select **Capacity** (auto-populated from available capacities)
5. Enter **Allocated Value** (e.g., "500" out of "1000" vCPU)
6. Click "Save"

**Effect:** "IT Center" can only request up to 500 vCPU at the selected location, even if 1000 are available globally.

---

## Section 5: Options & Project Configuration

### Managing Project Kinds

Project kinds categorize requests (e.g., "App", "Track", "Infra").

**To Create a Project Kind:**
1. Settings → Options tab → Project Kinds
2. Click "Add Kind"
3. Enter **Name** (e.g., "Database Migration")
4. Click "Save"

### Managing Emergency Options

Emergency options categorize urgent requests (e.g., "Security Breach", "System Failure").

**To Create an Emergency Option:**
1. Settings → Options tab → Emergency Options
2. Click "Add Option"
3. Enter **Name** (e.g., "Compliance Requirement")
4. Click "Save"

---

## Common Workflows

### Workflow 1: Onboard a New Moderator

**Goal:** Add a new moderator for the PostgreSQL service

**Steps:**
1. Create a Keycloak user "mod8" in the realm (one-time, out-of-system)
2. Settings → User Management
3. Ensure "mod8" appears in the user list (auto-synced on first login)
4. Assign role: **MODERATOR**
5. Settings → Services → Find "Postgres (PG)"
6. Click "Edit" → check "mod8" → "Save"
7. Result: mod8 can now approve PostgreSQL requests

### Workflow 2: Split a Service Between Two Moderators

**Goal:** Share "VM" service management between mod1 and a new moderator

**Steps:**
1. Settings → Services → Find "VM"
2. Click "Edit"
3. Check both "mod1" and "mod8"
4. Click "Save"
5. Result: Both moderators see VM requests in their approval queue

### Workflow 3: Expand to a New Center

**Goal:** Create a new "Marketing Center"

**Steps:**
1. Settings → Organization → Centers
2. Click "Create Center"
3. Name: "Marketing Center", Display: "Marketing & Creative"
4. Click "Save"
5. Create branches under the center
6. Create sections under branches
7. Assign users to the new center
8. Assign a CENTER_MANAGER for the center
9. Allocate resources via Wallets
10. Result: Marketing Center is now part of the hierarchy

---

## Troubleshooting

**Q: I created a service but it doesn't appear in requests**
- A: Services are created in settings, but requests are created by users in the main app. Ensure the service is marked as **Active** (isActive = true).

**Q: A moderator isn't seeing their requests**
- A: Check that the moderator is assigned to the service. Settings → Services → Edit service → check moderator → Save.

**Q: A center manager can't approve requests**
- A: Confirm user role is **CENTER_MANAGER** and center is set correctly. Settings → User Management → select user → check Role and Center.

**Q: Bulk role change didn't work**
- A: Check browser console for errors. Ensure all selected users' current roles are valid. Retry with fewer users selected.

---

## Best Practices

1. **Always use Display Names** — Help users understand the hierarchy (e.g., "Cloud Operations" vs just "Cloud Team")
2. **Assign multiple moderators to critical services** — Provides redundancy if one moderator is unavailable
3. **Review wallets quarterly** — Ensure center allocations match actual demand
4. **Document custom services** — If you create non-standard services, document their purpose in a shared wiki
5. **Archive, don't delete** — Deactivate entities instead of deleting to preserve historical data
6. **Test with E2E scenarios** — Before going live, use the built-in E2E test projects to verify RBAC and workflows
