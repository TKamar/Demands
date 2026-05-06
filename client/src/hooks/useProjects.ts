import { useState, useEffect, useCallback } from 'react';
import { fetchProjects, createProject as apiCreateProject, updateProject as apiUpdateProject, deleteProject as apiDeleteProject, duplicateProject as apiDuplicateProject } from '../api/apiService';
import { useRefresh } from '../contexts/RefreshContext';
import type { Project } from '../types/domain';
import type { CreateProjectPayload, UpdateProjectPayload, DuplicateProjectPayload, PaginationParams, ProjectFilterParams } from '../api/types';

interface UseProjectsResult {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  total: number;
  totalPages: number;
  createProject: (payload: CreateProjectPayload) => Promise<void>;
  updateProject: (name: string, payload: UpdateProjectPayload) => Promise<void>;
  deleteProject: (name: string) => Promise<void>;
  duplicateProject: (name: string, payload: DuplicateProjectPayload) => Promise<void>;
}

export function useProjects(
  filters?: ProjectFilterParams,
  pagination?: PaginationParams
): UseProjectsResult {
  const { projectsRefreshTrigger, triggerRefreshProjects } = useRefresh();
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const params = { ...filters, ...pagination };
        const { data, meta } = await fetchProjects(params, controller.signal);
        setProjects(data);
        setTotal(meta.total);
        setTotalPages(meta.totalPages);
      } catch (err: any) {
        if (err.name !== 'CanceledError' && err.message !== 'canceled') {
          setError(err.message ?? 'Failed to load projects');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      controller.abort();
    };
  }, [JSON.stringify(filters), pagination?.page, pagination?.limit, projectsRefreshTrigger]);

  const createProject = useCallback(async (payload: CreateProjectPayload) => {
    await apiCreateProject(payload);
    triggerRefreshProjects();
  }, [triggerRefreshProjects]);

  const updateProject = useCallback(async (name: string, payload: UpdateProjectPayload) => {
    await apiUpdateProject(name, payload);
    triggerRefreshProjects();
  }, [triggerRefreshProjects]);

  const deleteProject = useCallback(async (name: string) => {
    await apiDeleteProject(name);
    triggerRefreshProjects();
  }, [triggerRefreshProjects]);

  const duplicateProject = useCallback(async (name: string, payload: DuplicateProjectPayload) => {
    await apiDuplicateProject(name, payload);
    triggerRefreshProjects();
  }, [triggerRefreshProjects]);

  return { projects, isLoading, error, total, totalPages, createProject, updateProject, deleteProject, duplicateProject };
}
