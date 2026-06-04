import type { ProjectType, ProjectKind, Median, DemandType, DemandStatus, UserRole } from '../types/domain';

export interface ReferenceItem {
  name: string;
  displayName?: string;
  isActive?: boolean;
}


export interface BranchItem {
  name: string;
  centerName: string;
  displayName?: string;
  isActive?: boolean;
}

export interface SectionItem {
  name: string;
  displayName?: string;
  branchName: string;
  branchCenter: string;
  isActive?: boolean;
}

export interface LocationItem {
  id: number;
  baseName: string;
  environmentName: string;
  networkName: string;
  clusterName: string;
  isActive?: boolean;
}

export interface ResourceItem {
  name: string;
  unit: string;
  serviceName: string;
  isActive?: boolean;
}

export type Priority = 'P1' | 'P2' | 'P3';

export interface CreateProjectPayload {
  name: string;
  purpose: string;
  relatedTo?: string;
  type: ProjectType;
  kind: ProjectKind;
  locationId: number;
  year?: number;
  median?: Median;
  emergencyOption?: string;
  priority?: Priority;
  centerName?: string;
  branchName?: string;
  sectionName?: string;
}

export interface UpdateProjectPayload {
  purpose?: string;
  relatedTo?: string;
  type?: ProjectType;
  kind?: ProjectKind;
  locationId?: number;
  year?: number;
  median?: Median;
  emergencyOption?: string;
  priority?: Priority;
  centerName?: string;
  branchName?: string;
  sectionName?: string;
}

export interface DuplicateProjectPayload {
  name: string;
  purpose: string;
  relatedTo?: string;
  type: ProjectType;
  kind: ProjectKind;
  locationId: number;
  year?: number;
  median?: Median;
  emergencyOption?: string;
  priority?: Priority;
  centerName?: string;
  branchName?: string;
  sectionName?: string;
  demands: { id: number; value: number }[];
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    totalPending?: number;
    page: number;
    limit: number;
    totalPages: number;
    totalValue?: number;
    totalApprovedValue?: number;
  };
}

export interface ProjectFilterParams {
  name?: string;
  createdBy?: string;
}

export interface CreateDemandPayload {
  projectName: string;
  serviceName: string;
  resourceName: string;
  resourceService: string;
  value: number;
  locationId?: number;
  type: DemandType;
  clusterName?: string;
  centerName?: string;
  branchName?: string;
  sectionName?: string;
}

export interface UpdateDemandPayload {
  serviceName?: string;
  resourceName?: string;
  resourceService?: string;
  value?: number;
  locationId?: number;
  type?: DemandType;
  clusterName?: string;
  centerName?: string;
  branchName?: string;
  sectionName?: string;
}

export interface DemandFilterParams {
  projectName?: string;
  serviceName?: string;
  resourceName?: string;
  resourceService?: string;
  locationId?: number;
  baseName?: string;
  environmentName?: string;
  networkName?: string;
  clusterName?: string;
  type?: DemandType;
  status?: DemandStatus;
  projectType?: ProjectType;
  median?: Median;
  year?: number;
  relatedTo?: string;
  emergencyOption?: string;
  centerName?: string;
  branchName?: string;
  sectionName?: string;
  projectPriority?: Priority;
  managed?: boolean;
  createdBy?: string;
}

export interface Capacity {
  id: number;
  locationId: number;
  resourceName: string;
  resourceService: string;
  value: number;
  allocated: number;
  available: number;
  location: LocationItem;
  resource: ResourceItem;
}

export interface CreateCapacityPayload {
  locationId: number;
  resourceName: string;
  resourceService: string;
  value: number;
}

export interface UpdateCapacityPayload {
  value: number;
}

export interface Wallet {
  id: number;
  centerName: string;
  capacityId: number;
  value: number;
  center: {
    name: string;
    displayName?: string;
  };
  capacity: {
    id: number;
    resourceName: string;
    resourceService: string;
    location: {
      id: number;
      baseName: string;
      environmentName: string;
      networkName: string;
      clusterName: string;
    };
    resource: {
      name: string;
      unit: string;
      serviceName: string;
    };
  };
}

export interface CreateWalletPayload {
  centerName: string;
  capacityId: number;
  value: number;
}

export interface UpdateWalletPayload {
  value: number;
}

export type ApprovalStatus = 'Approved' | 'PartiallyApproved' | 'ApprovedWithCondition';

export interface ApproveDemandPayload {
  status: ApprovalStatus;
  approvedValue?: number;
  reason?: string;
}

export interface RejectDemandPayload {
  reason: string;
}

export interface BulkDemandFilters {
  project?: string;
  resource?: string;
  resourceService?: string;
  base?: string;
  environment?: string;
  network?: string;
  cluster?: string;
  type?: string;
  status?: string;
  projectType?: string;
  median?: string;
  year?: number;
  relatedTo?: string;
  emergencyOption?: string;
  priority?: string;
}

export interface BulkApproveDemandPayload {
  ids?: number[];
  selectAll?: boolean;
  filters?: BulkDemandFilters;
  excludedIds?: number[];
  status: ApprovalStatus;
  approvedValue?: number;
  reason?: string;
}

export interface BulkRejectDemandPayload {
  ids?: number[];
  selectAll?: boolean;
  filters?: BulkDemandFilters;
  excludedIds?: number[];
  reason: string;
}

export interface BulkDecisionResult {
  count: number;
}

export interface UpdateUserPayload {
  role: UserRole;
  centerName?: string;
  managedServices?: string[];
}
