import { useState, useEffect, useMemo, useCallback } from 'react';
import { MdAdd } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { useCapacities } from '../../hooks/useCapacities';
import type { Capacity } from '../../api/types';
import CapacityTable from './CapacityTable';
import CapacityModal from './CapacityModal';
import FilterSort from '../common/filters/FilterSort';
import { useToast } from '../common/Toast';
import type { FilterGroupConfig } from '../../types/filter';

type CapacityFilterKey = 'service' | 'resource' | 'base' | 'network' | 'environment';

const INITIAL_FILTERS: Record<CapacityFilterKey, string> = {
    service: '',
    resource: '',
    base: '',
    network: '',
    environment: '',
};

const noop = () => {};

export default function CapacityManagement() {
    const { t } = useTranslation();
    const {
        capacities,
        isLoading,
        error,
        fetchCapacities,
        createCapacity,
        updateCapacity,
        deleteCapacity
    } = useCapacities();
    const { showToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCapacity, setSelectedCapacity] = useState<Capacity | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filters, setFilters] = useState<Record<CapacityFilterKey, string>>(INITIAL_FILTERS);

    useEffect(() => {
        fetchCapacities();
    }, [fetchCapacities]);

    const serviceOptions = useMemo(() => {
        const seen = new Set<string>();
        return capacities
            .filter(c => c.resourceService && !seen.has(c.resourceService) && !!seen.add(c.resourceService))
            .map(c => ({ value: c.resourceService, label: c.resourceService }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [capacities]);

    const resourceOptions = useMemo(() => {
        const seen = new Set<string>();
        return capacities
            .filter(c => c.resourceName && !seen.has(c.resourceName) && !!seen.add(c.resourceName))
            .map(c => ({ value: c.resourceName, label: c.resourceName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [capacities]);

    const baseOptions = useMemo(() => {
        const seen = new Set<string>();
        return capacities
            .filter(c => c.location.baseName && !seen.has(c.location.baseName) && !!seen.add(c.location.baseName))
            .map(c => ({ value: c.location.baseName, label: c.location.baseName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [capacities]);

    const networkOptions = useMemo(() => {
        const seen = new Set<string>();
        return capacities
            .filter(c => c.location.networkName && !seen.has(c.location.networkName) && !!seen.add(c.location.networkName))
            .map(c => ({ value: c.location.networkName, label: c.location.networkName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [capacities]);

    const environmentOptions = useMemo(() => {
        const seen = new Set<string>();
        return capacities
            .filter(c => c.location.environmentName && !seen.has(c.location.environmentName) && !!seen.add(c.location.environmentName))
            .map(c => ({ value: c.location.environmentName, label: c.location.environmentName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [capacities]);

    const filterGroups = useMemo((): FilterGroupConfig<CapacityFilterKey>[] => [
        {
            id: 'main',
            label: 'common.filters',
            defaultExpanded: true,
            fields: [
                { key: 'service', label: 'management.capacity.columns.service', inputType: 'select', options: serviceOptions },
                { key: 'resource', label: 'management.capacity.columns.resource', inputType: 'select', options: resourceOptions },
                { key: 'base', label: 'projects.createProject.base', inputType: 'select', options: baseOptions },
                { key: 'network', label: 'management.capacity.columns.network', inputType: 'select', options: networkOptions },
                { key: 'environment', label: 'management.capacity.columns.environment', inputType: 'select', options: environmentOptions },
            ],
        },
    ], [serviceOptions, resourceOptions, baseOptions, networkOptions, environmentOptions]);

    const filteredCapacities = useMemo(() => {
        return capacities.filter(c => {
            if (filters.service && c.resourceService !== filters.service) return false;
            if (filters.resource && c.resourceName !== filters.resource) return false;
            if (filters.base && c.location.baseName !== filters.base) return false;
            if (filters.network && c.location.networkName !== filters.network) return false;
            if (filters.environment && c.location.environmentName !== filters.environment) return false;
            return true;
        });
    }, [capacities, filters]);

    const handleFilterChange = useCallback((key: CapacityFilterKey, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleClearFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

    const handleCreate = useCallback(() => {
        setSelectedCapacity(null);
        setIsModalOpen(true);
    }, []);

    const handleEdit = useCallback((capacity: Capacity) => {
        setSelectedCapacity(capacity);
        setIsModalOpen(true);
    }, []);

    const handleDelete = useCallback(async (id: number) => {
        if (window.confirm(t('Are you sure you want to delete this capacity?'))) {
            try {
                await deleteCapacity(id);
                showToast('Capacity deleted successfully', 'success');
            } catch (err) {
                showToast('Failed to delete capacity', 'error');
            }
        }
    }, [deleteCapacity, showToast, t]);

    const handleClose = useCallback(() => setIsModalOpen(false), []);

    const handleSubmit = useCallback(async (data: any) => {
        setIsSubmitting(true);
        try {
            if (selectedCapacity) {
                await updateCapacity({ id: selectedCapacity.id, value: data.value });
                showToast('Capacity updated successfully', 'success');
            } else {
                await createCapacity(data);
                showToast('Capacity created successfully', 'success');
            }
            setIsModalOpen(false);
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Operation failed', 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedCapacity, updateCapacity, createCapacity, showToast]);

    return (
        <div className="flex flex-col gap-6">
            <div className="relative flex items-center justify-between">
                <h2 className="text-xl font-bold text-text-primary m-0">
                    {t('management.tabs.capacity')}
                </h2>
                <div className="flex items-center gap-2">
                    <FilterSort
                        compact
                        filterGroups={filterGroups}
                        filterValues={filters}
                        onFilterChange={handleFilterChange}
                        onClearAllFilters={handleClearFilters}
                        sortOptions={[]}
                        sortState={{ field: null, direction: 'asc' }}
                        onSortChange={noop}
                    />
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-text-primary text-bg-paper rounded-xl hover:bg-black transition-colors border-none cursor-pointer font-medium"
                    >
                        <MdAdd size={20} />
                        {t('management.capacity.add')}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
                    {error}
                </div>
            )}

            <CapacityTable
                capacities={filteredCapacities}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoading && !isSubmitting}
            />

            {isModalOpen && (
                <CapacityModal
                    open={isModalOpen}
                    onClose={handleClose}
                    onSubmit={handleSubmit}
                    capacity={selectedCapacity}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
}
