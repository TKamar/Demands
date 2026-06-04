import { useState, useEffect } from 'react';
import { fetchProjects } from '../api/apiService';
import type { Project } from '../types/domain';

let globalProjectsPromise: Promise<any> | null = null;
let cachedProjects: Project[] | null = null;

export function useCachedProjects() {
    const [projects, setProjects] = useState<Project[]>(cachedProjects || []);
    const [isLoading, setIsLoading] = useState(!cachedProjects);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (cachedProjects) {
            setProjects(cachedProjects);
            setIsLoading(false);
            return;
        }

        let cancelled = false;

        async function load() {
            if (globalProjectsPromise) {
                try {
                    const res = await globalProjectsPromise;
                    if (!cancelled) {
                        setProjects(res.data);
                        cachedProjects = res.data;
                        setIsLoading(false);
                    }
                } catch (err: any) {
                    if (!cancelled) {
                        setError(err.message || 'Failed to load projects');
                        setIsLoading(false);
                    }
                }
                return;
            }

            globalProjectsPromise = fetchProjects({ limit: 1000 });

            try {
                const res = await globalProjectsPromise;
                if (!cancelled) {
                    setProjects(res.data);
                    cachedProjects = res.data;
                    setIsLoading(false);
                }
            } catch (err: any) {
                globalProjectsPromise = null;
                if (!cancelled) {
                    setError(err.message || 'Failed to load projects');
                    setIsLoading(false);
                }
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    return { projects, isLoading, error };
}
