import { useState, useEffect, useMemo, useCallback } from 'react';
import { MdAdd } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import type { CloudResourceStatusFlat } from '../../api/types';
import {
    fetchCloudResourceStatusFlat,
    createCloudResourceStatus,
    deleteCloudResourceStatus,
    updateCloudMonitorStatus,
} from '../../api/apiService';
import CloudResourceTable from './CloudResourceTable';
import CloudResourceModal from './CloudResourceModal';
import FilterSort from '../common/filters/FilterSort';
import { useToast } from '../common/Toast';
import type { FilterGroupConfig } from '../../types/filter';

type CloudResourceFilterKey = 'base' | 'network' | 'cluster' | 'service' | 'status';

const INITIAL_FILTERS: Record<CloudResourceFilterKey, string> = {
    base: '',
    network: '',
    cluster: '',
    service: '',
    status: '',
};

export default function CloudResourceManagement() {
    const { t } = useTranslation();
    const { showToast } = useToast();

    const [resources, setResources] = useState<CloudResourceStatusFlat[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedResource, setSelectedResource] = useState<CloudResourceStatusFlat | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filters, setFilters] = useState<Record<CloudResourceFilterKey, string>>(INITIAL_FILTERS);

    // Fetch resources
    const fetchResources = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchCloudResourceStatusFlat();
            setResources(data);
        } catch (err) {
            console.error('Failed to fetch cloud resources:', err);
            showToast('Failed to fetch cloud resources', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    // Filter options (computed from resources)
    const baseOptions = useMemo(() => {
        const seen = new Set<string>();
        return resources
            .filter(r => r.baseName && !seen.has(r.baseName) && !!seen.add(r.baseName))
            .map(r => ({ value: r.baseName, label: r.baseName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [resources]);

    const networkOptions = useMemo(() => {
        const seen = new Set<string>();
        return resources
            .filter(r => r.networkName && !seen.has(r.networkName) && !!seen.add(r.networkName))
            .map(r => ({ value: r.networkName, label: r.networkName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [resources]);

    const clusterOptions = useMemo(() => {
        const seen = new Set<string>();
        return resources
            .filter(r => r.clusterName && !seen.has(r.clusterName) && !!seen.add(r.clusterName))
            .map(r => ({ value: r.clusterName, label: r.clusterName }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [resources]);

    const serviceOptions = useMemo(() => {
        const seen = new Set<string>();
        return resources
            .filter(r => r.service && !seen.has(r.service) && !!seen.add(r.service))
            .map(r => ({ value: r.service, label: r.service }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [resources]);

    const statusOptions = [
        { value: 'green', label: 'green' },
        { value: 'yellow', label: 'yellow' },
        { value: 'red', label: 'red' },
    ];

    const filterGroups = useMemo((): FilterGroupConfig<CloudResourceFilterKey>[] => [
        {
            id: 'main',
            label: 'common.filters',
            defaultExpanded: true,
            fields: [
                { key: 'base', label: 'projects.createProject.base', inputType: 'select', options: baseOptions },
                { key: 'network', label: 'management.capacity.columns.network', inputType: 'select', options: networkOptions },
                { key: 'cluster', label: 'projects.createProject.cluster', inputType: 'select', options: clusterOptions },
                { key: 'service', label: 'common.service', inputType: 'select', options: serviceOptions },
                { key: 'status', label: 'common.status', inputType: 'select', options: statusOptions },
            ],
        },
    ], [baseOptions, networkOptions, clusterOptions, serviceOptions]);

    const filteredResources = useMemo(() => {
        return resources.filter(r => {
            if (filters.base && r.baseName !== filters.base) return false;
            if (filters.network && r.networkName !== filters.network) return false;
            if (filters.cluster && r.clusterName !== filters.cluster) return false;
            if (filters.service && r.service !== filters.service) return false;
            if (filters.status && r.status !== filters.status) return false;
            return true;
        });
    }, [resources, filters]);

    const handleFilterChange = useCallback((key: CloudResourceFilterKey, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleClearFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

    const handleCreate = useCallback(() => {
        setSelectedResource(null);
        setIsModalOpen(true);
    }, []);

    const handleEdit = useCallback((resource: CloudResourceStatusFlat) => {
        setSelectedResource(resource);
        setIsModalOpen(true);
    }, []);

    const handleDelete = useCallback(async (id: number) => {
        if (window.confirm(t('common.confirmDelete', 'Are you sure you want to delete this item?'))) {
            try {
                await deleteCloudResourceStatus(id);
                showToast('Cloud resource deleted successfully', 'success');
                await fetchResources();
            } catch (err) {
                showToast('Failed to delete cloud resource', 'error');
            }
        }
    }, [deleteCloudResourceStatus, fetchResources, showToast, t]);

    const handleClose = useCallback(() => setIsModalOpen(false), []);

    const handleSubmit = useCallback(async (data: any) => {
        setIsSubmitting(true);
        try {
            if (selectedResource) {
                // Edit mode
                await updateCloudMonitorStatus(selectedResource.id, {
                    status: data.status,
                    reason: data.reason,
                    tag: data.tag,
                });
                showToast('Cloud resource updated successfully', 'success');
            } else {
                // Create mode
                await createCloudResourceStatus(data);
                showToast('Cloud resource created successfully', 'success');
            }
            await fetchResources();
            handleClose();
        } catch (err: any) {
            const message = err?.response?.data?.error || 'Failed to save cloud resource';
            showToast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedResource, showToast, fetchResources, handleClose]);

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-text-primary">
                    {t('management.cloudResources.title', 'Cloud Resources')}
                </h2>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-blue-600 font-medium text-sm transition-colors"
                >
                    <MdAdd size={18} />
                    {t('common.add', 'Add')}
                </button>
            </div>

            {/* Filters */}
            <FilterSort<CloudResourceFilterKey>
                filterGroups={filterGroups}
                filterValues={filters}
                onFilterChange={handleFilterChange}
                onClearAllFilters={handleClearFilters}
                sortOptions={[]}
                sortState={{ field: null, direction: 'asc' }}
                onSortChange={() => {}}
            />

            {/* Table */}
            <CloudResourceTable
                resources={filteredResources}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoading}
            />

            {/* Modal */}
            <CloudResourceModal
                open={isModalOpen}
                onClose={handleClose}
                onSubmit={handleSubmit}
                resource={selectedResource}
                isLoading={isSubmitting}
            />
        </div>
    );
}
