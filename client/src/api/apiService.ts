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
  if (params?.createdBy) query.append('createdBy', params.createdBy);

  // If filtering by name or createdBy, use /api/projects/filter, otherwise /api/projects
  const endpoint = (params?.name || params?.createdBy) ? '/api/projects/filter' : '/api/projects';

  const { data } = await api.get(`${endpoint}?${query.toString()}`, { signal });
  return {
    data: data.data.map(mapProject),
    meta: data.meta,
  };
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const { data } = await api.post('/api/projects', payload);
  return mapProject(data);
}

export async function updateProject(name: string, payload: UpdateProjectPayload): Promise<Project> {
  const { data } = await api.put(`/api/projects/${encodeURIComponent(name)}`, payload);
  return mapProject(data);
}

export async function deleteProject(name: string): Promise<void> {
  await api.delete(`/api/projects/${encodeURIComponent(name)}`);
}

export async function duplicateProject(sourceName: string, payload: DuplicateProjectPayload): Promise<Project> {
  const { data } = await api.post(`/api/projects/${encodeURIComponent(sourceName)}/duplicate`, payload);
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
    if (params.createdBy) query.append('createdBy', params.createdBy);
  }

  // If any filter is present (besides pagination), use /api/demands/filter, otherwise /api/demands
  const isFiltering = params && (
    params.projectName || params.serviceName || params.resourceName || params.resourceService ||
    params.locationId || params.baseName || params.environmentName ||
    params.networkName || params.clusterName || params.type || params.status ||
    params.projectType || params.median || params.year || params.relatedTo || params.emergencyOption || params.projectPriority ||
    params.managed || params.centerName || params.createdBy
  );

  const endpoint = isFiltering ? '/api/demands/filter' : '/api/demands';

  if (params?.projectPriority) query.append('priority', params.projectPriority);

  const { data } = await api.get(`${endpoint}?${query.toString()}`, { signal });
  return {
    data: data.data.map(mapDemand),
    meta: data.meta,
  };
}

export async function createDemand(payload: CreateDemandPayload): Promise<Demand> {
  const { data } = await api.post('/api/demands', payload);
  return mapDemand(data);
}

export async function updateDemand(id: number, payload: UpdateDemandPayload): Promise<Demand> {
  const { data } = await api.patch(`/api/demands/${id}`, payload);
  return mapDemand(data);
}

export async function deleteDemand(id: number): Promise<void> {
  await api.delete(`/api/demands/${id}`);
}

export async function cancelDemand(id: number): Promise<Demand> {
  const { data } = await api.patch(`/api/demands/${id}/cancel`);
  return mapDemand(data);
}

export async function restoreDemand(id: number): Promise<Demand> {
  const { data } = await api.patch(`/api/demands/${id}/restore`);
  return mapDemand(data);
}

export async function approveDemand(id: number, payload: ApproveDemandPayload): Promise<Demand> {
  const { data } = await api.patch(`/api/demands/${id}/approve`, payload);
  return mapDemand(data);
}

export async function rejectDemand(id: number, payload: RejectDemandPayload): Promise<Demand> {
  const { data } = await api.patch(`/api/demands/${id}/reject`, payload);
  return mapDemand(data);
}

export async function bulkApproveDemands(payload: BulkApproveDemandPayload): Promise<BulkDecisionResult> {
  const { data } = await api.patch('/api/demands/bulk/approve', payload);
  return data;
}

export async function bulkRejectDemands(payload: BulkRejectDemandPayload): Promise<BulkDecisionResult> {
  const { data } = await api.patch('/api/demands/bulk/reject', payload);
  return data;
}

export async function fetchCenterPendingDemands(): Promise<Demand[]> {
  const res = await api.get<any[]>('/api/demands/center/pending');
  return res.data.map(mapDemand);
}

export async function assignDemand(id: number, assignedValue: number | null): Promise<Demand> {
  const { data } = await api.patch<any>(`/api/demands/${id}/assign`, { assignedValue });
  return mapDemand(data);
}

export async function fetchDemandHistory(params: { page?: number; limit?: number; centerName?: string }): Promise<PaginatedResponse<Demand>> {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.centerName) query.append('center', params.centerName);
  const { data } = await api.get(`/api/demands/history?${query.toString()}`);
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
  const { data } = await api.post('/api/demands/group', groupData);
  return (data as any[]).map(mapDemand);
}

export async function centerManagerApproveDemand(id: number): Promise<Demand> {
  const { data } = await api.patch(`/api/demands/${id}/cm-approve`);
  return mapDemand(data);
}

export async function centerManagerRejectDemand(id: number, reason: string): Promise<Demand> {
  const { data } = await api.patch(`/api/demands/${id}/cm-reject`, { reason });
  return mapDemand(data);
}

export async function transferDemand(id: number, targetServiceName: string): Promise<{ original: Demand; internal: Demand }> {
  const { data } = await api.post(`/api/demands/${id}/transfer`, { targetServiceName });
  return {
    original: mapDemand(data.original),
    internal: mapDemand(data.internal),
  };
}

// --- Reference data ---

export async function fetchBases(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/api/bases');
  return data;
}

export async function fetchEnvironments(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/api/environments');
  return data;
}

export async function fetchNetworks(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/api/networks');
  return data;
}

export async function fetchClusters(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/api/clusters');
  return data;
}

export async function fetchCenters(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/api/centers');
  return data;
}

export async function fetchBranches(): Promise<BranchItem[]> {
  const { data } = await api.get('/api/branches');
  return data;
}

export async function fetchSections(): Promise<SectionItem[]> {
  const { data } = await api.get('/api/sections');
  return data;
}

export async function fetchLocations(): Promise<LocationItem[]> {
  const { data } = await api.get('/api/locations');
  return data;
}

export async function fetchServices(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/api/services');
  return data;
}

export async function fetchMyServices(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/api/services/mine');
  return data;
}

export async function fetchResources(): Promise<ResourceItem[]> {
  const { data } = await api.get('/api/resources');
  return data;
}

export async function fetchProjectKinds(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/api/project-kinds');
  return data;
}

export async function fetchEmergencyOptions(): Promise<ReferenceItem[]> {
  const { data } = await api.get('/api/emergency-options');
  return data;
}

// --- Capacities ---

export async function fetchCapacities(): Promise<Capacity[]> {
  const { data } = await api.get('/api/capacities');
  return data;
}

export async function createCapacity(payload: CreateCapacityPayload): Promise<Capacity> {
  const { data } = await api.post('/api/capacities', payload);
  return data;
}

export async function updateCapacity(id: number, payload: UpdateCapacityPayload): Promise<Capacity> {
  const { data } = await api.put(`/api/capacities/${id}`, payload);
  return data;
}

export async function deleteCapacity(id: number): Promise<void> {
  await api.delete(`/api/capacities/${id}`);
}

// --- Wallets ---

export async function fetchWallets(): Promise<Wallet[]> {
  const { data } = await api.get('/api/wallets');
  return data;
}

export async function createWallet(payload: CreateWalletPayload): Promise<Wallet> {
  const { data } = await api.post('/api/wallets', payload);
  return data;
}

export async function updateWallet(id: number, payload: UpdateWalletPayload): Promise<Wallet> {
  const { data } = await api.put(`/api/wallets/${id}`, payload);
  return data;
}

export async function deleteWallet(id: number): Promise<void> {
  await api.delete(`/api/wallets/${id}`);
}

// --- Users (admin) ---

export interface AdminStats {
  totalDemands: number;
  totalProjects: number;
  pendingCount: number;
  approvedCount: number;
  byStatus: Record<string, number>;
  byCenter: { center: string; count: number }[];
  byService: { service: string; count: number }[];
}

export async function fetchAdminStats(centers?: string[]): Promise<AdminStats> {
  const params = centers && centers.length > 0
    ? '?' + centers.map(c => `centers=${encodeURIComponent(c)}`).join('&')
    : '';
  const response = await api.get<AdminStats>(`/api/admin/stats${params}`);
  return response.data;
}

export async function fetchUsers(): Promise<AppUser[]> {
  const res = await api.get<AppUser[]>('/api/users');
  return res.data;
}

export async function exportProjects(centers?: string[]): Promise<void> {
  const params = centers && centers.length > 0
    ? '?' + centers.map(c => `centers=${encodeURIComponent(c)}`).join('&')
    : '';
  const response = await api.get(`/api/projects/export${params}`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  const today = new Date().toISOString().slice(0, 10);
  a.download = `projects-${today}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importProjects(file: File): Promise<{ created: { projects: number; demands: number; skipped: number }; errors?: string[] }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/api/projects/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateUser(username: string, payload: UpdateUserPayload): Promise<AppUser> {
  const res = await api.patch<AppUser>(`/api/users/${username}`, payload);
  return res.data;
}

// --- Service Admin ---

export async function updateService(name: string, data: { moderators: string[] }): Promise<any> {
  const response = await api.put(`/api/services/${name}`, data);
  return response.data;
}

export async function getAllServices(): Promise<any[]> {
  const response = await api.get('/api/services');
  return response.data;
}

export const apiService = {
  updateService,
  getAllServices,
  getUsers: fetchUsers,
};
