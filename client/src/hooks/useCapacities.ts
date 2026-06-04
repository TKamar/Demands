import { useState, useCallback } from 'react';
import {
    fetchCapacities as fetchCapacitiesApi,
    createCapacity as createCapacityApi,
    updateCapacity as updateCapacityApi,
    deleteCapacity as deleteCapacityApi
} from '../api/apiService';
import type { Capacity, CreateCapacityPayload, UpdateCapacityPayload } from '../api/types';

export type { Capacity, CreateCapacityPayload, UpdateCapacityPayload };

export function useCapacities() {
    const [capacities, setCapacities] = useState<Capacity[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCapacities = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchCapacitiesApi();
            setCapacities(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch capacities');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createCapacity = useCallback(async (data: CreateCapacityPayload) => {
        setIsLoading(true);
        try {
            await createCapacityApi(data);
            await fetchCapacities();
        } catch (err: any) {
            console.error(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [fetchCapacities]);

    const updateCapacity = useCallback(async (data: UpdateCapacityPayload & { id: number }) => {
        setIsLoading(true);
        try {
            await updateCapacityApi(data.id, { value: data.value });
            await fetchCapacities();
        } catch (err: any) {
            console.error(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [fetchCapacities]);

    const deleteCapacity = useCallback(async (id: number) => {
        setIsLoading(true);
        try {
            await deleteCapacityApi(id);
            await fetchCapacities();
        } catch (err: any) {
            console.error(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [fetchCapacities]);

    return {
        capacities,
        isLoading,
        error,
        fetchCapacities,
        createCapacity,
        updateCapacity,
        deleteCapacity,
    };
}
