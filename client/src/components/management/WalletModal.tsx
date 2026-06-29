import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useReferenceData } from '../../hooks/useReferenceData';
import { useCapacities } from '../../hooks/useCapacities';
import Modal from '../common/Modal';
import Select from '../common/Select';
import SearchableSelect from '../common/SearchableSelect';
import type { Wallet, CreateWalletPayload } from '../../api/types';

interface WalletModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateWalletPayload) => Promise<void>;
    wallet?: Wallet | null;
    isLoading?: boolean;
}

export default function WalletModal({ open, onClose, onSubmit, wallet, isLoading }: WalletModalProps) {
    const { t } = useTranslation();
    const referenceData = useReferenceData();
    const { capacities, fetchCapacities } = useCapacities();

    // Form State
    const [centerName, setCenterName] = useState('');
    const [service, setService] = useState('');
    const [resource, setResource] = useState('');
    const [network, setNetwork] = useState('');
    const [base, setBase] = useState('');
    const [environment, setEnvironment] = useState('');
    const [value, setValue] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch capacities when modal opens
    useEffect(() => {
        if (open) {
            fetchCapacities();
        }
    }, [open, fetchCapacities]);

    // Center options
    const centerOptions = useMemo(() => referenceData.centers.map((c) => ({
        value: c.name,
        label: c.displayName || c.name,
    })), [referenceData.centers]);

    // Service options - only services that have capacities
    const serviceOptions = useMemo(() => {
        const servicesWithCapacities = new Set(capacities.map(c => c.resourceService));
        return referenceData.services
            .filter(s => servicesWithCapacities.has(s.name))
            .map((s) => ({
                value: s.name,
                label: s.displayName || s.name,
            }));
    }, [referenceData.services, capacities]);

    // Resource options - filtered by selected service
    const resourceOptions = useMemo(() => {
        if (!service) return [];
        const resourcesWithCapacities = new Set(
            capacities
                .filter(c => c.resourceService === service)
                .map(c => c.resourceName)
        );
        return referenceData.resources
            .filter(r => r.serviceName === service && resourcesWithCapacities.has(r.name))
            .map((r) => ({
                value: r.name,
                label: r.name,
            }));
    }, [referenceData.resources, capacities, service]);

    // Network options - filtered by selected service+resource capacities
    const networkOptions = useMemo(() => {
        if (!service || !resource) return [];
        const networksWithCapacities = new Set(
            capacities
                .filter(c => c.resourceService === service && c.resourceName === resource)
                .map(c => c.location.networkName)
        );
        return referenceData.networks
            .filter(n => networksWithCapacities.has(n.name))
            .map((n) => ({
                value: n.name,
                label: n.displayName || n.name,
            }));
    }, [referenceData.networks, capacities, service, resource]);

    // Base options - filtered by selected service+resource+network
    const baseOptions = useMemo(() => {
        if (!service || !resource || !network) return [];
        const basesWithCapacities = new Set(
            capacities
                .filter(c =>
                    c.resourceService === service &&
                    c.resourceName === resource &&
                    c.location.networkName === network
                )
                .map(c => c.location.baseName)
        );
        return referenceData.bases
            .filter(b => basesWithCapacities.has(b.name))
            .map((b) => ({
                value: b.name,
                label: b.displayName || b.name,
            }));
    }, [referenceData.bases, capacities, service, resource, network]);

    // Environment options - filtered by selected service+resource+network+base
    const environmentOptions = useMemo(() => {
        if (!service || !resource || !network || !base) return [];
        const envsWithCapacities = new Set(
            capacities
                .filter(c =>
                    c.resourceService === service &&
                    c.resourceName === resource &&
                    c.location.networkName === network &&
                    c.location.baseName === base
                )
                .map(c => c.location.environmentName)
        );
        return referenceData.environments
            .filter(e => envsWithCapacities.has(e.name))
            .map((e) => ({
                value: e.name,
                label: e.displayName || e.name,
            }));
    }, [referenceData.environments, capacities, service, resource, network, base]);

    // Find the matching capacity based on all selections
    const selectedCapacity = useMemo(() => {
        if (!service || !resource || !network || !base || !environment) return null;
        return capacities.find(c =>
            c.resourceService === service &&
            c.resourceName === resource &&
            c.location.networkName === network &&
            c.location.baseName === base &&
            c.location.environmentName === environment
        );
    }, [capacities, service, resource, network, base, environment]);

    // Initialize/Reset Form
    useEffect(() => {
        if (wallet) {
            setCenterName(wallet.centerName);
            setService(wallet.capacity.resource.serviceName);
            setResource(wallet.capacity.resourceName);
            setNetwork(wallet.capacity.location.networkName);
            setBase(wallet.capacity.location.baseName);
            setEnvironment(wallet.capacity.location.environmentName);
            setValue(wallet.value);
        } else {
            setCenterName('');
            setService('');
            setResource('');
            setNetwork('');
            setBase('');
            setEnvironment('');
            setValue(0);
        }
        setIsSubmitting(false);
    }, [wallet, open]);

    // Cascading resets
    const handleServiceChange = (val: string) => {
        setService(val);
        setResource('');
        setNetwork('');
        setBase('');
        setEnvironment('');
    };

    const handleResourceChange = (val: string) => {
        setResource(val);
        setNetwork('');
        setBase('');
        setEnvironment('');
    };

    const handleNetworkChange = (val: string) => {
        setNetwork(val);
        setBase('');
        setEnvironment('');
    };

    const handleBaseChange = (val: string) => {
        setBase(val);
        setEnvironment('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCapacity || !centerName) return;

        setIsSubmitting(true);
        try {
            const payload: CreateWalletPayload = {
                centerName,
                capacityId: selectedCapacity.id,
                value,
            };
            await onSubmit(payload);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const isEditMode = !!wallet;

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            title={wallet ? t('management.wallet.modal.editTitle') : t('management.wallet.modal.createTitle')}
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Center */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">
                        {t('management.wallet.columns.center')} <span className="text-danger">*</span>
                    </label>
                    <Select
                        options={centerOptions}
                        value={centerName}
                        onChange={setCenterName}
                        placeholder={t('projects.createProject.selectOption')}
                        disabled={isEditMode}
                    />
                </div>

                <div className="h-px bg-divider my-1"></div>

                {/* Service & Resource */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('management.wallet.columns.service')} <span className="text-danger">*</span>
                        </label>
                        <SearchableSelect
                            options={serviceOptions}
                            value={service}
                            onChange={handleServiceChange}
                            placeholder={t('projects.createProject.selectOption')}
                            disabled={isEditMode}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('management.wallet.columns.resource')} <span className="text-danger">*</span>
                        </label>
                        <Select
                            options={resourceOptions}
                            value={resource}
                            onChange={handleResourceChange}
                            placeholder={t('projects.createProject.selectOption')}
                            disabled={isEditMode || !service}
                        />
                    </div>
                </div>

                <div className="h-px bg-divider my-1"></div>

                {/* Location: Network, Base, Environment */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('management.wallet.columns.network')} <span className="text-danger">*</span>
                        </label>
                        <Select
                            options={networkOptions}
                            value={network}
                            onChange={handleNetworkChange}
                            placeholder={t('projects.createProject.selectOption')}
                            disabled={isEditMode || !resource}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('management.wallet.columns.base')} <span className="text-danger">*</span>
                        </label>
                        <Select
                            options={baseOptions}
                            value={base}
                            onChange={handleBaseChange}
                            placeholder={t('projects.createProject.selectOption')}
                            disabled={isEditMode || !network}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('management.wallet.columns.environment')} <span className="text-danger">*</span>
                        </label>
                        <Select
                            options={environmentOptions}
                            value={environment}
                            onChange={setEnvironment}
                            placeholder={t('projects.createProject.selectOption')}
                            disabled={isEditMode || !base}
                        />
                    </div>
                </div>

                <div className="h-px bg-divider my-1"></div>

                {/* Value & Unit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('management.wallet.modal.value')} <span className="text-danger">*</span>
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

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('management.capacity.columns.unit')}
                        </label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 rounded-xl border border-divider bg-bg-default text-text-secondary cursor-not-allowed font-medium text-sm"
                            value={selectedCapacity?.resource?.unit || ''}
                            disabled
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={isLoading || isSubmitting || !centerName || !selectedCapacity}
                        className="px-6 py-2.5 bg-text-primary text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        {wallet ? t('management.wallet.modal.save') : t('management.wallet.modal.create')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
