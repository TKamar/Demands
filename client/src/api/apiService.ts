import api from './axiosInstance';
import type { Demand, Project, AppUser } from '../types/domain';

import type {
  ReferenceItem,
  BranchItem,
  SectionItem,
  LocationItem,
  ResourceItem,
  CreateProjectPayload,
  UpdateProjectPayload,
  DuplicateProjectPayload,
  CreateDemandPayload,
  UpdateDemandPayload,
  PaginationParams,
  PaginatedResponse,
  ProjectFilterParams,
  DemandFilterParams,
  Capacity,
  CreateCapacityPayload,
  UpdateCapacityPayload,
  Wallet,
  CreateWalletPayload,
  UpdateWalletPayload,
  ApproveDemandPayload,
  RejectDemandPayload,
  BulkApproveDemandPayload,
  BulkRejectDemandPayload,
  BulkDecisionResult,
  UpdateUserPayload,
} from './types';

// --- Response mappers ---

function mapDemand(raw: any): Demand {
  return {
    id: raw.id,
    projectName: raw.projectName,
    serviceName: raw.serviceName,
    resourceName: raw.resourceName,
    resourceService: raw.resourceService,
    unit: raw.resource?.unit ?? '',
    value: raw.value,
    type: raw.type,
    location: {
      base: raw.location?.baseName ?? '',
      environment: raw.location?.environmentName ?? '',
      network: raw.location?.networkName ?? '',
      cluster: raw.location?.clusterName ?? '',
    },
    status: raw.status,
    clusterName: raw.clusterName,
    approvedValue: raw.approvedValue,
    assignedValue: raw.assignedValue,
    approvedDate: raw.approvedDate,
    reason: raw.reason,
    createdBy: raw.createdBy ?? '',
    createdByName: raw.createdByName ?? '',
    createdAt: raw.createdAt,
    centerName: raw.centerName,
    branchName: raw.branchName,
    sectionName: raw.sectionName,
  };
}

function mapProject(raw: any): Project {
  return {
    name: raw.name,
    purpose: raw.purpose,
    relatedTo: raw.relatedTo ?? undefined,
    type: raw.type,
    kind: raw.kindName ?? raw.kind,
    location: {
      base: raw.location?.baseName ?? '',
      environment: raw.location?.environmentName ?? '',
      network: raw.location?.networkName ?? '',
      cluster: raw.location?.clusterName ?? '',
    },
    year: raw.year ?? undefined,
    median: raw.median ?? undefined,
    priority: raw.priority ?? undefined,
    emergencyOption: raw.emergencyOptionName ?? raw.emergencyOption?.name ?? undefined,
    createdBy: raw.createdBy ?? '',
    createdByName: raw.createdByName ?? '',
    createdAt: raw.createdAt,
    demandCount: raw._count?.demands ?? 0,
    centerName: raw.centerName,
    branchName: raw.branchName,
    sectionName: raw.sectionName,
  };
}

// --- Projects ---

export async function fetchProjects(
  params?: PaginationParams & ProjectFilterParams,
  signal?: AbortSignal
): Promise<PaginatedResponse<Project>> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.name) query.append('name', params.name);

  // If filtering by name, use /projects/filter, otherwise /projects
  const endpoint = params?.name ? '/projects/filter' : '/projects';

  const { data } = await api.get(`${endpoint}?${query.toString()}`, { signal });
  return {
    data: data.data.map(mapProject),
    meta: data.meta,
  };
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const { data } = await api.post('/projects', payload);
  return mapProject(data);
}

export async function updateProject(name: string, payload: UpdateProjectPayload): Promise<Project> {
  const { data } = await api.put(`/projects/${encodeURIComponent(name)}`, payload);
  return mapProject(data);
}

export async function deleteProject(name: string): Promise<void> {
  await api.delete(`/projects/${encodeURIComponent(name)}`);
}

export async function duplicateProject(sourceName: string, payload: DuplicateProjectPayload): Promise<Project> {
  const { data } = await api.post(`/projects/${encodeURIComponent(sourceName)}/duplicate`, payload);
  return mapProject(data);
}

// --- Demands ---

export async function fetchDemands(
  params?: PaginationParams & DemandFilterParams,
  signal?: AbortSignal
): Promise<PaginatedResponse<Demand>> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.sortBy) query.append('sortBy', params.sortBy);
  if (params?.sortDir) query.append('sortDir', params.sortDir);

  if (params) {
    if (params.projectName) query.append('project', params.projectName);

    // Map serviceName to resourceService, taking precedence over explicit resourceService filter
    if (params.serviceName) {
      query.append('resourceService', params.serviceName);
    } else if (params.resourceService) {
      query.append('resourceService', params.resourceService);
    }

    if (params.resourceName) query.append('resource', params.resourceName);
    if (params.locationId) query.append('location', params.locationId.toString());
    if (params.baseName) query.append('base', params.baseName);
    if (params.environmentName) query.append('environment', params.environmentName);
    if (params.networkName) query.append('network', params.networkName);
    if (params.clusterName) query.append('cluster', params.clusterName);
    if (params.type) query.append('type', params.type);
    if (params.status) query.append('status', params.status);
    if (params.projectType) query.append('projectType', params.projectType);
    if (params.median) query.append('median', params.median);
    if (params.year) query.append('year', params.year.toString());
    if (params.relatedTo) query.append('relatedTo', params.relatedTo);
    if (params.emergencyOption) query.append('emergencyOption', params.emergencyOption);
    if (params.managed) query.append('managed', 'true');
    if (params.centerName) query.append('center', params.centerName);
  }

  // If any filter is present (besides pagination), use /demands/filter, otherwise /demands
  const isFiltering = params && (
    params.projectName || params.serviceName || params.resourceName || params.resourceService ||
    params.locationId || params.baseName || params.environmentName ||
    params.networkName || params.clusterName || params.type || params.status ||
    params.projectType || params.median || params.year || params.relatedTo || params.emergencyOption || params.projectPriority ||
    params.managed || params.centerName
  );

  const endpoint = isFiltering ? '/demands/filter' : '/demands';

  if (params?.projectPriority) query.append('priority', params.projectPriority);

  const { data } = await api.get(`${endpoint}?${query.toString()}`, { signal });
  return {
    data: data.data.map(mapDemand),
    meta: data.meta,
  };
}

export async function createDemand(payload: CreateDemandPayload): Promise<Demand> {
  const { data } = await api.post('/demands', payload);
  return mapDemand(data);
}

export async function updateDemand(id: number, payload: UpdateDemandPayload): Promise<Demand> {
  const { data } = await api.patch(`/demands/${id}`, payload);
  return mapDemand(data);
}

export async function deleteDemand(id: number): Promise<void> {
  await api.delete(`/demands/${id}`);
}

export async function cancelDemand(id: number): Promise<Demand> {
  const { data } = await api.patch(`/demands/${id}/cancel`);
  return mapDemand(data);
}

export async function restoreDemand(id: number): Promise<Demand> {
  const { data } = await api.patch(`/demands/${id}/restore`);
  return mapDemand(data);
}

export async function approveDemand(id: number, payload: ApproveDemandPayload): Promise<Demand> {
  const { data } = await api.patch(`/demands/${id}/approve`, payload);
  return mapDemand(data);
}

export async function rejectDemand(id: number, payload: RejectDemandPayload): Promise<Demand> {
  const { data } = await api.patch(`/demands/${id}/reject`, payload);
  return mapDemand(data);
}

export async function bulkApproveDemands(payload: BulkApproveDemandPayload): Promise<BulkDecisionResult> {
  const { data } = await api.patch('/demands/bulk/approve', payload);
  return data;
}

export async function bulkRejectDemands(payload: BulkRejectDemandPayload): Promise<BulkDecisionResult> {
  const { data } = await api.patch('/demands/bulk/reject', payload);
  return data;
}

export async function fetchCenterPendingDemands(): Promise<Demand[]> {
  const res = await api.get<any[]>('/demands/center/pending');
  return res.data.map(mapDemand);
}

export async function assignDemand(id: number, assignedValue: number | null): Promise<Demand> {
  const { data } = await api.patch<any>(`/demands/${id}/assign`, { assignedValue });
  return mapDemand(data);
}

export async function fetchDemandHistory(params: { page?: number; limit?: number }): Promise<PaginatedResponse<Demand>> {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());
  const { data } = await api.get(`/demands/history?${query.toString()}`);
  return {
    data: data.data.map(mapDemand),
    meta: data.meta,
  };
}

export async function createDemandGroup(groupData: {
  projectName: string;
  serviceName: string;
  type: string;
  clusterName?: string;
  rows: Array<{ resourceName: string; resourceService: string; value: number; locationId: number }>;
}): Promise<Demand[]> {
  const { data } = await api.post('/demands/group', groupData);
  return (data as any[]).map(mapDemand);
}

export async function centerManagerApproveDemand(id: number): Promise<Demand> {
  const { data } = await api.patch(`/demands/${id}/cm-approve`);
  return mapDemand(data);
}

export async function centerManagerRejectDemand(id: number, reason: string): Promise<Demand> {
  const { data } = await api.patch(`/demands/${id}/cm-reject`, { reason });
  return mapDemand(data);
}

export async function transferDemand(id: number, targetServiceName: string): Promise<{ original: Demand; internal: Demand }> {
  const { data } = await api.post(`/demands/${id}/transfer`, { targetServiceName });
  return {
    original: mapDemand(data.original),
    internal: mapDemand(data.internal),
  };
}

// --- Reference data ---

export async function fetchBases(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/bases');
  return data;
}

export async function fetchEnvironments(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/environments');
  return data;
}

export async function fetchNetworks(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/networks');
  return data;
}

export async function fetchClusters(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/clusters');
  return data;
}

export async function fetchCenters(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/centers');
  return data;
}

export async function fetchBranches(): Promise<BranchItem[]> {
  const { data } = await api.get('/branches');
  return data;
}

export async function fetchSections(): Promise<SectionItem[]> {
  const { data } = await api.get('/sections');
  return data;
}

export async function fetchLocations(): Promise<LocationItem[]> {
  const { data } = await api.get('/locations');
  return data;
}

export async function fetchServices(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/services');
  return data;
}

export async function fetchMyServices(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/services/mine');
  return data;
}

export async function fetchResources(): Promise<ResourceItem[]> {
  const { data } = await api.get('/resources');
  return data;
}

export async function fetchProjectKinds(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/project-kinds');
  return data;
}

export async function fetchEmergencyOptions(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/emergency-options');
  return data;
}

// --- Capacities ---

export async function fetchCapacities(): Promise<Capacity[]> {
  const { data } = await api.get('/capacities');
  return data;
}

export async function createCapacity(payload: CreateCapacityPayload): Promise<Capacity> {
  const { data } = await api.post('/capacities', payload);
  return data;
}

export async function updateCapacity(id: number, payload: UpdateCapacityPayload): Promise<Capacity> {
  const { data } = await api.put(`/capacities/${id}`, payload);
  return data;
}

export async function deleteCapacity(id: number): Promise<void> {
  await api.delete(`/capacities/${id}`);
}

// --- Wallets ---

export async function fetchWallets(): Promise<Wallet[]> {
  const { data } = await api.get('/wallets');
  return data;
}

export async function createWallet(payload: CreateWalletPayload): Promise<Wallet> {
  const { data } = await api.post('/wallets', payload);
  return data;
}

export async function updateWallet(id: number, payload: UpdateWalletPayload): Promise<Wallet> {
  const { data } = await api.put(`/wallets/${id}`, payload);
  return data;
}

export async function deleteWallet(id: number): Promise<void> {
  await api.delete(`/wallets/${id}`);
}

// --- Users (admin) ---

export async function fetchUsers(): Promise<AppUser[]> {
  const res = await api.get<AppUser[]>('/users');
  return res.data;
}

export async function updateUser(username: string, payload: UpdateUserPayload): Promise<AppUser> {
  const res = await api.patch<AppUser>(`/users/${username}`, payload);
  return res.data;
}
