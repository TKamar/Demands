export type ProjectType = 'Semiannual' | 'Emergency';
export type ProjectKind = string;
export type Median = 'H1' | 'H2';
export type Priority = 'P1' | 'P2' | 'P3';
export type DemandType = 'New' | 'Extension';
export type DemandStatus =
  | 'PendingCenterManager'
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'PartiallyApproved'
  | 'ApprovedWithCondition'
  | 'Cancelled'
  | 'CenterManagerRejected'
  | 'WaitingOnPrerequisite'
  | 'AwaitingProcurement'
  | 'HeldForEfficiency'
  | 'ConditionalFootprintReduction'
  | 'InProgress'
  | 'TransferredTo810';

export type UserRole = 'ADMIN' | 'MODERATOR' | 'CENTER_MANAGER' | 'REGULAR_USER';

export interface AppUser {
  username: string;
  fullName: string;
  role: UserRole;
  centerName: string | null;
  managedCenters: string[];
  managedServices: string[];
}

export interface Project {
  name: string;
  purpose: string;
  relatedTo?: string;
  type: ProjectType;
  kind: ProjectKind;
  location: DemandLocation;
  year?: number;
  median?: Median;
  priority?: Priority;
  emergencyOption?: string;
  centerName?: string;
  branchName?: string;
  sectionName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  demandCount?: number;
}

export interface DemandLocation {
  base: string;
  environment: string;
  network: string;
  cluster: string;
}

export interface Demand {
  id: number;
  projectName: string;
  serviceName: string;
  resourceName: string;
  resourceService: string;
  unit: string;
  value: number;
  type: DemandType;
  location: DemandLocation;
  status: DemandStatus;
  clusterName?: string;
  approvedValue?: number;
  assignedValue?: number;
  approvedDate?: string;
  reason?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  centerName?: string;
  branchName?: string;
  sectionName?: string;
  requirementGroupId?: number;
  prerequisiteDemandId?: number;
  isInternalTicket?: boolean;
}

// ── Cloud Monitor ──────────────────────────────────────────────────────────

export type CloudStatus = 'green' | 'yellow' | 'red';
export type CloudTag    = 'OK' | 'CAPACITY' | 'CLIENT_PROCESS' | 'MAINTENANCE';

export interface CloudResourceStatusEntry {
  id:        number;
  status:    CloudStatus;
  reason:    string;
  tag:       CloudTag;
  updatedAt: string;
  updatedBy: string | null;
}

export type CloudMonitorCluster = Record<string, CloudResourceStatusEntry>;
export type CloudMonitorNetwork = { clusters: Record<string, CloudMonitorCluster> };
export type CloudMonitorSite    = { networks: Record<string, CloudMonitorNetwork> };
export type CloudMonitorData    = Record<string, CloudMonitorSite>;

export interface CloudResourceStatusFlat {
  id: number;
  baseName: string;
  networkName: string;
  clusterName: string;
  service: string;
  status: CloudStatus;
  reason: string;
  tag: CloudTag;
  updatedAt: string;
  updatedBy: string | null;
}
