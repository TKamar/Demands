import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'react-oidc-context';
import { useReferenceData } from '../../hooks/useReferenceData';
import { fetchMyServices } from '../../api/apiService';
import Modal from '../common/Modal';
import Select from '../common/Select';
import SearchableSelect from '../common/SearchableSelect';
import type { Capacity, CreateCapacityPayload } from '../../api/types';

interface CapacityModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    capacity?: Capacity | null;
    isLoading?: boolean;
}

export default function CapacityModal({ open, onClose, onSubmit, capacity, isLoading }: CapacityModalProps) {
    const { t } = useTranslation();
    const referenceData = useReferenceData();
    const auth = useAuth();

    // Auth State
    const userGroups = (auth.user?.profile.groups as string[]) || [];
    const isAdmin = userGroups.includes('admin');
    const isModerator = userGroups.includes('moderator');

    // Form State
    const [network, setNetwork] = useState('');
    const [base, setBase] = useState('');
    const [environment, setEnvironment] = useState('');
    const [cluster, setCluster] = useState('');
    const [service, setService] = useState('');
    const [resource, setResource] = useState(''); // Just the resource name
    const [value, setValue] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Moderator Services State
    const [myServices, setMyServices] = useState<string[]>([]);

    useEffect(() => {
        if (open && isModerator && !isAdmin) {
            fetchMyServices().then(services => {
                setMyServices(services.map(s => s.name));
            }).catch(console.error);
        }
    }, [open, isModerator, isAdmin]);

    // Derived Options - Network
    const networkOptions = useMemo(() => referenceData.networks.map((v) => ({
        value: v.name,
        label: v.displayName || v.name,
    })), [referenceData.networks]);

    // Derived Options - Base (Filtered by Network)
    const baseOptions = useMemo(() => {
        if (!network) return [];
        const relevantLocations = referenceData.locations.filter(l => l.networkName === network);
        const relevantBaseNames = new Set(relevantLocations.map(l => l.baseName));
        return referenceData.bases
            .filter(b => relevantBaseNames.has(b.name))
            .map((v) => ({
                value: v.name,
                label: v.displayName || v.name,
            }));
    }, [referenceData.locations, referenceData.bases, network]);

    // Derived Options - Environment (Filtered by Network & Base)
    const environmentOptions = useMemo(() => {
        if (!network || !base) return [];
        const relevantLocations = referenceData.locations.filter(
            l => l.networkName === network && l.baseName === base
        );
        const relevantEnvNames = new Set(relevantLocations.map(l => l.environmentName));
        return referenceData.environments
            .filter(e => relevantEnvNames.has(e.name))
            .map((v) => ({
                value: v.name,
                label: v.displayName || v.name,
            }));
    }, [referenceData.locations, referenceData.environments, network, base]);

    // Derived Options - Cluster (Filtered by Network, Base & Environment)
    const clusterOptions = useMemo(() => {
        if (!network || !base || !environment) return [];
        const relevantLocations = referenceData.locations.filter(
            l => l.networkName === network && l.baseName === base && l.environmentName === environment
        );
        const relevantClusterNames = new Set(relevantLocations.map(l => l.clusterName));
        return referenceData.clusters
            .filter(c => relevantClusterNames.has(c.name))
            .map((v) => ({
                value: v.name,
                label: v.displayName || v.name,
            }));
    }, [referenceData.locations, referenceData.clusters, network, base, environment]);

    // Service Options
    const serviceOptions = useMemo(() => {
        let services = referenceData.services;
        if (isModerator && !isAdmin && myServices.length > 0) {
            services = services.filter(s => myServices.includes(s.name));
        }
        return services.map((s) => ({
            value: s.name,
            label: s.displayName || s.name,
        }));
    }, [referenceData.services, isModerator, isAdmin, myServices]);

    // Resource Options (Filtered by Service)
    const resourceOptions = useMemo(() => {
        if (!service) return [];
        return referenceData.resources
            .filter(r => r.serviceName === service)
            .map((r) => ({
                value: r.name,
                label: r.name, // Resource unit is distinct, maybe adding it to label would be good? For now simplified.
            }));
    }, [referenceData.resources, service]);

    // Initialize/Reset Form
    useEffect(() => {
        if (capacity) {
            setNetwork(capacity.location.networkName);
            setBase(capacity.location.baseName);
            setEnvironment(capacity.location.environmentName);
            setCluster(capacity.location.clusterName);
            setService(capacity.resourceService);
            setResource(capacity.resourceName);
            setValue(capacity.value);
        } else {
            setNetwork('');
            setBase('');
            setEnvironment('');
            setCluster('');
            setService('');
            setResource('');
            setValue(0);
        }
        setIsSubmitting(false);
    }, [capacity, open]);

    // Handle Location Change Logic
    const handleNetworkChange = (val: string) => {
        setNetwork(val);
        setBase('');
        setEnvironment('');
        setCluster('');
    };

    const handleBaseChange = (val: string) => {
        setBase(val);
        setEnvironment('');
        setCluster('');
    };

    const handleEnvironmentChange = (val: string) => {
        setEnvironment(val);
        setCluster('');
    };

    const handleServiceChange = (val: string) => {
        setService(val);
        setResource(''); // Reset dependent resource
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Resolve Location ID
        const location = referenceData.locations.find(
            (l) => l.networkName === network && l.baseName === base && l.environmentName === environment && l.clusterName === cluster
        );

        if (!location) return;

        setIsSubmitting(true);
        try {
            const payload: CreateCapacityPayload = {
                locationId: location.id,
                resourceName: resource,
                resourceService: service,
                value,
            };
            await onSubmit(payload);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            title={capacity ? t('management.capacity.modal.editTitle') : t('management.capacity.modal.createTitle')}
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Network */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('projects.createProject.network')} <span className="text-danger">*</span>
                        </label>
                        <Select
                            options={networkOptions}
                            value={network}
                            onChange={handleNetworkChange}
                            placeholder={t('projects.createProject.selectOption')}
                            disabled={!!capacity}
                        />
                    </div>

                    {/* Base */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('projects.createProject.base')} <span className="text-danger">*</span>
                        </label>
                        <Select
                            options={baseOptions}
                            value={base}
                            onChange={handleBaseChange}
                            placeholder={t('projects.createProject.selectOption')}
                            disabled={!!capacity || !network}
                        />
                    </div>

                    {/* Environment */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('projects.createProject.environment')} <span className="text-danger">*</span>
                        </label>
                        <Select
                            options={environmentOptions}
                            value={environment}
                            onChange={handleEnvironmentChange}
                            placeholder={t('projects.createProject.selectOption')}
                            disabled={!!capacity || !base}
                        />
                    </div>

                    {/* Cluster */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('projects.createProject.cluster')} <span className="text-danger">*</span>
                        </label>
                        <Select
                            options={clusterOptions}
                            value={cluster}
                            onChange={setCluster}
                            placeholder={t('projects.createProject.selectOption')}
                            disabled={!!capacity || !environment}
                        />
                    </div>
                </div>

                <div className="h-px bg-divider my-1"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Service */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('management.capacity.columns.service')} <span className="text-danger">*</span>
                        </label>
                        <SearchableSelect
                            options={serviceOptions}
                            value={service}
                            onChange={handleServiceChange}
                            placeholder={t('projects.createProject.selectOption')}
                            disabled={!!capacity}
                        />
                    </div>

                    {/* Resource */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('management.capacity.columns.resource')} <span className="text-danger">*</span>
                        </label>
                        <Select
                            options={resourceOptions}
                            value={resource}
                            onChange={setResource}
                            placeholder={t('projects.createProject.selectOption')}
                            disabled={!!capacity || !service}
                        />
                    </div>


                    {/* Unit */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('management.capacity.columns.unit')}
                        </label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 rounded-xl border border-divider bg-bg-default text-text-secondary cursor-not-allowed font-medium text-sm"
                            value={capacity?.resource.unit || referenceData.resources.find(r => r.name === resource && r.serviceName === service)?.unit || ''}
                            disabled
                        />
                    </div>

                    {/* Value */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('management.capacity.modal.value')} <span className="text-danger">*</span>
                        </label>
                        <input
                            type="number"
                            className="w-full px-4 py-2.5 rounded-xl border border-divider bg-bg-paper focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                            value={value}
                            onChange={(e) => setValue(Number(e.target.value))}
                            min="0"
                            required
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={isLoading || isSubmitting || (!capacity && (!network || !base || !environment || !cluster || !service || !resource))}
                        className="px-6 py-2.5 bg-text-primary text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        {capacity ? t('management.capacity.modal.save') : t('management.capacity.modal.create')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
