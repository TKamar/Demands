import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useReferenceData } from '../../hooks/useReferenceData';
import Modal from '../common/Modal';
import Select from '../common/Select';
import type { CloudResourceStatusFlat } from '../../api/types';

interface CloudResourceModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    resource?: CloudResourceStatusFlat | null;
    isLoading?: boolean;
}

const VALID_STATUSES = ['green', 'yellow', 'red'] as const;
const VALID_TAGS = ['OK', 'CAPACITY', 'CLIENT_PROCESS', 'MAINTENANCE'] as const;

export default function CloudResourceModal({ open, onClose, onSubmit, resource, isLoading }: CloudResourceModalProps) {
    const { t } = useTranslation();
    const referenceData = useReferenceData();

    // Form State
    const [base, setBase] = useState('');
    const [network, setNetwork] = useState('');
    const [cluster, setCluster] = useState('');
    const [service, setService] = useState('');
    const [status, setStatus] = useState<'green' | 'yellow' | 'red'>('green');
    const [reason, setReason] = useState('');
    const [tag, setTag] = useState<'OK' | 'CAPACITY' | 'CLIENT_PROCESS' | 'MAINTENANCE'>('OK');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Derived Options
    const baseOptions = useMemo(() =>
        referenceData.bases.map(b => ({
            value: b.name,
            label: b.displayName || b.name,
        })), [referenceData.bases]);

    const networkOptions = useMemo(() => {
        if (!base) return [];
        const relevantLocations = referenceData.locations.filter(l => l.baseName === base);
        const relevantNetworkNames = new Set(relevantLocations.map(l => l.networkName));
        return referenceData.networks
            .filter(n => relevantNetworkNames.has(n.name))
            .map(n => ({
                value: n.name,
                label: n.displayName || n.name,
            }));
    }, [referenceData.locations, referenceData.networks, base]);

    const clusterOptions = useMemo(() => {
        if (!base || !network) return [];
        const relevantLocations = referenceData.locations.filter(
            l => l.baseName === base && l.networkName === network
        );
        const relevantClusterNames = new Set(relevantLocations.map(l => l.clusterName));
        return referenceData.clusters
            .filter(c => relevantClusterNames.has(c.name))
            .map(c => ({
                value: c.name,
                label: c.displayName || c.name,
            }));
    }, [referenceData.locations, referenceData.clusters, base, network]);

    // Initialize/Reset Form
    useEffect(() => {
        if (resource) {
            setBase(resource.baseName);
            setNetwork(resource.networkName);
            setCluster(resource.clusterName);
            setService(resource.service);
            setStatus(resource.status);
            setReason(resource.reason);
            setTag(resource.tag);
        } else {
            setBase('');
            setNetwork('');
            setCluster('');
            setService('');
            setStatus('green');
            setReason('');
            setTag('OK');
        }
        setIsSubmitting(false);
    }, [resource, open]);

    const handleBaseChange = (val: string) => {
        setBase(val);
        setNetwork('');
        setCluster('');
    };

    const handleNetworkChange = (val: string) => {
        setNetwork(val);
        setCluster('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!base || !network || !cluster || !service || !reason.trim()) {
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                baseName: base,
                networkName: network,
                clusterName: cluster,
                service,
                status,
                reason: reason.trim(),
                tag,
            };
            await onSubmit(payload);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const isEditMode = !!resource;

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            title={isEditMode ? t('common.editRecord', 'Edit Record') : t('common.createRecord', 'Create Record')}
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Base */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('projects.createProject.base', 'Base')} <span className="text-danger">*</span>
                        </label>
                        <Select
                            options={baseOptions}
                            value={base}
                            onChange={handleBaseChange}
                            placeholder={t('projects.createProject.selectOption', 'Select option')}
                            disabled={isEditMode}
                        />
                    </div>

                    {/* Network */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('management.capacity.columns.network', 'Network')} <span className="text-danger">*</span>
                        </label>
                        <Select
                            options={networkOptions}
                            value={network}
                            onChange={handleNetworkChange}
                            placeholder={t('projects.createProject.selectOption', 'Select option')}
                            disabled={isEditMode || !base}
                        />
                    </div>

                    {/* Cluster */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('projects.createProject.cluster', 'Cluster')} <span className="text-danger">*</span>
                        </label>
                        <Select
                            options={clusterOptions}
                            value={cluster}
                            onChange={setCluster}
                            placeholder={t('projects.createProject.selectOption', 'Select option')}
                            disabled={isEditMode || !network}
                        />
                    </div>

                    {/* Service */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('common.service', 'Service')} <span className="text-danger">*</span>
                        </label>
                        <input
                            type="text"
                            value={service}
                            onChange={(e) => setService(e.target.value)}
                            placeholder={t('common.enterService', 'Enter service name')}
                            disabled={isEditMode}
                            className={`w-full px-4 py-2.5 rounded-xl border border-divider text-text-primary text-sm ${
                                isEditMode ? 'bg-gray-100 text-text-secondary cursor-not-allowed' : 'bg-white'
                            }`}
                        />
                    </div>
                </div>

                <div className="h-px bg-divider my-1"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Status */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('common.status', 'Status')} <span className="text-danger">*</span>
                        </label>
                        <Select
                            options={VALID_STATUSES.map(s => ({ value: s, label: s }))}
                            value={status}
                            onChange={(val) => setStatus(val as 'green' | 'yellow' | 'red')}
                            placeholder={t('projects.createProject.selectOption', 'Select option')}
                        />
                    </div>

                    {/* Tag */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-text-primary">
                            {t('common.tag', 'Tag')} <span className="text-danger">*</span>
                        </label>
                        <Select
                            options={VALID_TAGS.map(t => ({ value: t, label: t }))}
                            value={tag}
                            onChange={(val) => setTag(val as 'OK' | 'CAPACITY' | 'CLIENT_PROCESS' | 'MAINTENANCE')}
                            placeholder={t('projects.createProject.selectOption', 'Select option')}
                        />
                    </div>
                </div>

                {/* Reason */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text-primary">
                        {t('common.reason', 'Reason')} <span className="text-danger">*</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={t('common.enterReason', 'Enter reason')}
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-divider bg-white text-text-primary text-sm resize-none"
                    />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-divider">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl border border-divider bg-white text-text-primary hover:bg-gray-50 font-medium text-sm transition-colors"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || isLoading || !base || !network || !cluster || !service || !reason.trim()}
                        className="px-6 py-2.5 rounded-xl bg-primary text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-sm transition-colors"
                    >
                        {isEditMode ? t('common.update', 'Update') : t('common.create', 'Create')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
