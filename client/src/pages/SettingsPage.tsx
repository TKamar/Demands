import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'react-oidc-context';
import { MdArrowBack } from 'react-icons/md';
import CapacityManagement from '../components/management/CapacityManagement';
import WalletManagement from '../components/management/WalletManagement';
import CloudResourceManagement from '../components/management/CloudResourceManagement';
import EntityManager from '../components/common/EntityManager';
import { useReferenceData } from '../hooks/useReferenceData';
import { UserManagement } from '../components/settings/UserManagement';
import { ServiceAdmin } from '../components/settings/ServiceAdmin';
import { useCurrentUser } from '../hooks/useCurrentUser';
import type { UserRole } from '../types/domain';

// Role-based tab visibility
const getVisibleTabs = (role: UserRole): string[] => {
  switch (role) {
    case 'ADMIN':
      return ['infrastructure', 'organization', 'options', 'services', 'capacity', 'cloudResources', 'wallets', 'users'];
    case 'MODERATOR':
      return ['services', 'capacity', 'wallets'];
    default:
      // REGULAR_USER, CENTER_MANAGER: no settings access
      return [];
  }
};

const showTab = (tabName: string, role: UserRole): boolean => {
  return getVisibleTabs(role).includes(tabName);
};

// Sub-components for each tab section
function InfrastructureSettings({
    baseOptions, envOptions, networkOptions, clusterOptions, onSuccess
}: {
    baseOptions: { value: string; label: string }[];
    envOptions: { value: string; label: string }[];
    networkOptions: { value: string; label: string }[];
    clusterOptions: { value: string; label: string }[];
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const [subTab, setSubTab] = useState('base');

    const tabs = [
        { id: 'base', label: t('settings.tabs.base', 'Base') },
        { id: 'environment', label: t('settings.tabs.environment', 'Environment') },
        { id: 'network', label: t('settings.tabs.network', 'Network') },
        { id: 'cluster', label: t('settings.tabs.cluster', 'Cluster') },
        { id: 'location', label: t('settings.tabs.location', 'Location') },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex gap-2 border-b border-divider">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 text-start bg-transparent cursor-pointer transition-colors ${subTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {subTab === 'base' && (
                <EntityManager
                    title={t('settings.base.title', 'Bases')}
                    endpoint="/api/bases"
                    onSuccess={onSuccess}
                    columns={[
                        { key: 'name', label: t('common.name', 'Name'), render: (item) => <span className="font-bold text-gray-900">{item.name}</span> },
                        { key: 'displayName', label: t('common.displayName', 'Display Name') },
                        { key: 'isActive', label: t('common.active', 'Active'), type: 'toggle' },
                    ]}
                    fields={[
                        { key: 'name', label: t('common.name', 'Name'), type: 'text', required: true },
                        { key: 'displayName', label: t('common.displayName', 'Display Name'), type: 'text' },
                    ]}
                />
            )}
            {subTab === 'environment' && (
                <EntityManager
                    title={t('settings.environment.title', 'Environments')}
                    endpoint="/api/environments"
                    onSuccess={onSuccess}
                    columns={[
                        { key: 'name', label: t('common.name', 'Name'), render: (item) => <span className="font-bold text-gray-900">{item.name}</span> },
                        { key: 'displayName', label: t('common.displayName', 'Display Name') },
                        { key: 'isActive', label: t('common.active', 'Active'), type: 'toggle' },
                    ]}
                    fields={[
                        { key: 'name', label: t('common.name', 'Name'), type: 'text', required: true },
                        { key: 'displayName', label: t('common.displayName', 'Display Name'), type: 'text' },
                    ]}
                />
            )}
            {subTab === 'network' && (
                <EntityManager
                    title={t('settings.network.title', 'Networks')}
                    endpoint="/api/networks"
                    onSuccess={onSuccess}
                    columns={[
                        { key: 'name', label: t('common.name', 'Name'), render: (item) => <span className="font-bold text-gray-900">{item.name}</span> },
                        { key: 'displayName', label: t('common.displayName', 'Display Name') },
                        { key: 'isActive', label: t('common.active', 'Active'), type: 'toggle' },
                    ]}
                    fields={[
                        { key: 'name', label: t('common.name', 'Name'), type: 'text', required: true },
                        { key: 'displayName', label: t('common.displayName', 'Display Name'), type: 'text' },
                    ]}
                />
            )}
            {subTab === 'cluster' && (
                <EntityManager
                    title={t('settings.cluster.title', 'Clusters')}
                    endpoint="/api/clusters"
                    onSuccess={onSuccess}
                    columns={[
                        { key: 'name', label: t('common.name', 'Name'), render: (item) => <span className="font-bold text-gray-900">{item.name}</span> },
                        { key: 'displayName', label: t('common.displayName', 'Display Name') },
                        { key: 'isActive', label: t('common.active', 'Active'), type: 'toggle' },
                    ]}
                    fields={[
                        { key: 'name', label: t('common.name', 'Name'), type: 'text', required: true },
                        { key: 'displayName', label: t('common.displayName', 'Display Name'), type: 'text' },
                    ]}
                />
            )}
            {subTab === 'location' && (
                <EntityManager
                    title={t('settings.location.title', 'Locations')}
                    endpoint="/api/locations"
                    idField="id"
                    onSuccess={onSuccess}
                    columns={[
                        { key: 'baseName', label: t('settings.location.base', 'Base') },
                        { key: 'environmentName', label: t('settings.location.environment', 'Environment') },
                        { key: 'networkName', label: t('settings.location.network', 'Network') },
                        { key: 'clusterName', label: t('settings.location.cluster', 'Cluster') },
                        { key: 'isActive', label: t('common.active', 'Active'), type: 'toggle' },
                    ]}
                    fields={[
                        { key: 'baseName', label: t('settings.location.base', 'Base'), type: 'select', options: baseOptions, required: true },
                        { key: 'environmentName', label: t('settings.location.environment', 'Environment'), type: 'select', options: envOptions, required: true },
                        { key: 'networkName', label: t('settings.location.network', 'Network'), type: 'select', options: networkOptions, required: true },
                        { key: 'clusterName', label: t('settings.location.cluster', 'Cluster'), type: 'select', options: clusterOptions, required: true },
                    ]}
                />
            )}
        </div>
    );
}

function OrganizationSettings({
    centerOptions, branches, onSuccess
}: {
    centerOptions: { value: string; label: string }[];
    branches: any[];
    onSuccess: () => void;
}) {
    const { t } = useTranslation();
    const [subTab, setSubTab] = useState('center');

    const tabs = [
        { id: 'center', label: t('settings.tabs.center', 'Center') },
        { id: 'branch', label: t('settings.tabs.branch', 'Branch') },
        { id: 'section', label: t('settings.tabs.section', 'Section') },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex gap-2 border-b border-divider">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 text-start bg-transparent cursor-pointer transition-colors ${subTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {subTab === 'center' && (
                <EntityManager
                    title={t('settings.center.title', 'Centers')}
                    endpoint="/api/centers"
                    onSuccess={onSuccess}
                    columns={[
                        { key: 'name', label: t('common.name', 'Name'), render: (item) => <span className="font-bold text-gray-900">{item.name}</span> },
                        { key: 'displayName', label: t('common.displayName', 'Display Name') },
                        { key: 'isActive', label: t('common.active', 'Active'), type: 'toggle' },
                    ]}
                    fields={[
                        { key: 'name', label: t('common.name', 'Name'), type: 'text', required: true },
                        { key: 'displayName', label: t('common.displayName', 'Display Name'), type: 'text' },
                    ]}
                />
            )}
            {subTab === 'branch' && (
                <EntityManager
                    title={t('settings.branch.title', 'Branches')}
                    endpoint="/api/branches"
                    idField={['centerName', 'name']} // Order matters for API url: /branches/centerName/name
                    onSuccess={onSuccess}
                    columns={[
                        { key: 'name', label: t('common.name', 'Name'), render: (item) => <span className="font-bold text-gray-900">{item.name}</span> },
                        { key: 'displayName', label: t('common.displayName', 'Display Name') },
                        { key: 'centerName', label: t('settings.branch.center', 'Center') },
                        { key: 'isActive', label: t('common.active', 'Active'), type: 'toggle' },
                    ]}
                    fields={[
                        { key: 'centerName', label: t('settings.branch.center', 'Center'), type: 'select', options: centerOptions, required: true },
                        { key: 'name', label: t('common.name', 'Name'), type: 'text', required: true },
                        { key: 'displayName', label: t('common.displayName', 'Display Name'), type: 'text' },
                    ]}
                />
            )}
            {subTab === 'section' && (
                <EntityManager
                    title={t('settings.section.title', 'Sections')}
                    endpoint="/api/sections"
                    idField={['branchCenter', 'branchName', 'name']} // API: /sections/branchCenter/branchName/name
                    onSuccess={onSuccess}
                    columns={[
                        { key: 'name', label: t('common.name', 'Name'), render: (item) => <span className="font-bold text-gray-900">{item.name}</span> },
                        { key: 'displayName', label: t('common.displayName', 'Display Name') },
                        { key: 'branchName', label: t('settings.section.branch', 'Branch') },
                        { key: 'branchCenter', label: t('settings.section.center', 'Center') },
                        { key: 'isActive', label: t('common.active', 'Active'), type: 'toggle' },
                    ]}
                    fields={[
                        {
                            key: 'branchCenter',
                            label: t('settings.section.center', 'Center'),
                            type: 'select',
                            options: centerOptions,
                            required: true,
                        },
                        {
                            key: 'branchName',
                            label: t('settings.section.branch', 'Branch'),
                            type: 'select',
                            required: true,
                            dependsOn: 'branchCenter',
                            optionsLoader: async (centerName) => {
                                try {
                                    // Use static data from branches array (already loaded via useReferenceData)
                                    return branches
                                        .filter(b => b.centerName === centerName)
                                        .map(b => ({
                                            value: b.name,
                                            label: b.displayName || b.name
                                        }));
                                } catch (err) {
                                    console.error('Failed to load branches:', err);
                                    return [];
                                }
                            }
                        },
                        { key: 'name', label: t('common.name', 'Name'), type: 'text', required: true },
                        { key: 'displayName', label: t('common.displayName', 'Display Name'), type: 'text' },
                    ]}
                />
            )}
        </div>
    );
}

function OptionsSettings({ onSuccess }: { onSuccess: () => void }) {
    const { t } = useTranslation();
    const [subTab, setSubTab] = useState('emergency');
    const tabs = [
        { id: 'emergency', label: t('settings.tabs.emergency', 'Emergency Options') },
        { id: 'projectKind', label: t('settings.tabs.projectKind', 'Project Kind') },
        { id: 'demandReason', label: t('settings.tabs.demandReason', 'Demand Reason') },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex gap-2 border-b border-divider">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 text-start bg-transparent cursor-pointer transition-colors ${subTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {subTab === 'emergency' && (
                <EntityManager
                    title={t('settings.emergency.title', 'Emergency Options')}
                    endpoint="/api/emergency-options"
                    onSuccess={onSuccess}
                    columns={[
                        { key: 'name', label: t('common.name', 'Name'), render: (item) => <span className="font-bold text-gray-900">{item.name}</span> },
                    ]}
                    fields={[
                        { key: 'name', label: t('common.name', 'Name'), type: 'text', required: true },
                    ]}
                />
            )}
            {subTab === 'projectKind' && (
                <EntityManager
                    title={t('settings.projectKind.title', 'Project Kinds')}
                    endpoint="/api/project-kinds"
                    onSuccess={onSuccess}
                    columns={[
                        { key: 'name', label: t('common.name', 'Name'), render: (item) => <span className="font-bold text-gray-900">{item.name}</span> },
                        { key: 'displayName', label: t('common.displayName', 'Display Name') },
                    ]}
                    fields={[
                        { key: 'name', label: t('common.name', 'Name'), type: 'text', required: true },
                        { key: 'displayName', label: t('common.displayName', 'Display Name'), type: 'text' },
                    ]}
                />
            )}
            {subTab === 'demandReason' && (
                <EntityManager
                    title={t('settings.demandReason.title', 'Demand Reasons')}
                    endpoint="/api/decision-reasons"
                    onSuccess={onSuccess}
                    columns={[
                        { key: 'name', label: t('common.name', 'Name'), render: (item) => <span className="font-bold text-gray-900">{item.name}</span> },
                        { key: 'displayName', label: t('common.displayName', 'Display Name') },
                    ]}
                    fields={[
                        { key: 'name', label: t('common.name', 'Name'), type: 'text', required: true },
                        { key: 'displayName', label: t('common.displayName', 'Display Name'), type: 'text' },
                    ]}
                />
            )}
        </div>
    )
}

function ServicesSettings({ serviceOptions, onSuccess }: { serviceOptions: { value: string; label: string }[]; onSuccess: () => void }) {
    const { t } = useTranslation();
    const [subTab, setSubTab] = useState('service');
    const tabs = [
        { id: 'service', label: t('settings.tabs.service', 'Services') },
        { id: 'resource', label: t('settings.tabs.resource', 'Resources') },
        { id: 'admin', label: t('settings.tabs.admin', 'Service Admin') },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex gap-2 border-b border-divider">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 text-start bg-transparent cursor-pointer transition-colors ${subTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {subTab === 'service' && (
                <EntityManager
                    title={t('settings.service.title', 'Services')}
                    endpoint="/api/services"
                    onSuccess={onSuccess}
                    columns={[
                        { key: 'name', label: t('common.name', 'Name'), render: (item) => <span className="font-bold text-gray-900">{item.name}</span> },
                        {
                            key: 'moderators',
                            label: t('common.moderators', 'Moderators'),
                            render: (item) => (item.moderators || []).join(', ')
                        },
                        { key: 'isActive', label: t('common.active', 'Active'), type: 'toggle' },
                    ]}
                    fields={[
                        { key: 'name', label: t('common.name', 'Name'), type: 'text', required: true },
                        {
                            key: 'moderators',
                            label: t('common.moderators', 'Moderators'),
                            type: 'array-string',
                            description: t('settings.service.moderatorsDesc', 'Type and press Enter to add moderator')
                        },
                    ]}
                />
            )}
            {subTab === 'resource' && (
                <EntityManager
                    title={t('settings.resource.title', 'Resources')}
                    endpoint="/api/resources"
                    idField={['serviceName', 'name']} // API: /resources/serviceName/name
                    onSuccess={onSuccess}
                    columns={[
                        { key: 'name', label: t('common.name', 'Name'), render: (item) => <span className="font-bold text-gray-900">{item.name}</span> },
                        { key: 'serviceName', label: t('settings.resource.service', 'Service') },
                        { key: 'unit', label: t('settings.resource.unit', 'Unit') },
                        { key: 'isActive', label: t('common.active', 'Active'), type: 'toggle' },
                    ]}
                    fields={[
                        { key: 'name', label: t('common.name', 'Name'), type: 'text', required: true },
                        { key: 'serviceName', label: t('settings.resource.service', 'Service'), type: 'select', options: serviceOptions, required: true },
                        { key: 'unit', label: t('settings.resource.unit', 'Unit'), type: 'text', required: true },
                    ]}
                />
            )}
            {subTab === 'admin' && (
                <ServiceAdmin />
            )}
        </div>
    );
}

export default function SettingsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const auth = useAuth();
    const currentUser = useCurrentUser();

    // DB-backed role takes precedence; fall back to OIDC groups for initial render
    const dbRole = currentUser?.role;
    const oidcRole = (auth.user?.profile.groups as string[])?.[0]?.toLowerCase() || 'user';
    const userRole = (dbRole || (!dbRole && oidcRole === 'admin' ? 'ADMIN' : oidcRole === 'moderator' ? 'MODERATOR' : 'REGULAR_USER')) as UserRole;
    const isAdmin = userRole === 'ADMIN';
    const isModerator = userRole === 'MODERATOR';

    // Check access permissions
    const hasAccess = showTab('infrastructure', userRole) || showTab('services', userRole);

    const [mainTab, setMainTab] = useState<'infrastructure' | 'organization' | 'options' | 'services' | 'capacity' | 'cloudResources' | 'wallets' | 'users'>(
        isAdmin ? 'infrastructure' : 'services'
    );

    // Fetch all reference data for dropdowns
    const {
        bases, environments, networks, clusters, centers, branches, services, refreshData
    } = useReferenceData();

    // -- Options Helpers --
    const baseOptions = useMemo(() => bases.map(b => ({ value: b.name, label: b.displayName || b.name })), [bases]);
    const envOptions = useMemo(() => environments.map(e => ({ value: e.name, label: e.displayName || e.name })), [environments]);
    const networkOptions = useMemo(() => networks.map(n => ({ value: n.name, label: n.displayName || n.name })), [networks]);
    const clusterOptions = useMemo(() => clusters.map(c => ({ value: c.name, label: c.displayName || c.name })), [clusters]);
    const centerOptions = useMemo(() => centers.map(c => ({ value: c.name, label: c.displayName || c.name })), [centers]);



    const serviceOptions = useMemo(() => services.map(s => ({ value: s.name, label: s.name })), [services]);

    const mainTabs = [
        ...(isAdmin ? [
            { id: 'infrastructure', label: t('settings.mainTabs.infrastructure', 'Infrastructure') },
            { id: 'organization', label: t('settings.mainTabs.organization', 'Organization') },
            { id: 'options', label: t('settings.mainTabs.options', 'Options') },
        ] : []),
        { id: 'services', label: t('settings.mainTabs.services', 'Services') },
        ...((isAdmin || isModerator) ? [
            { id: 'capacity', label: t('settings.mainTabs.capacity', 'Capacity') },
        ] : []),
        ...(isAdmin ? [
            { id: 'cloudResources', label: t('settings.mainTabs.cloudResources', 'Cloud Resources') },
            { id: 'wallets', label: t('settings.mainTabs.wallets', 'Wallets') },
            { id: 'users', label: t('settings.userManagement', 'User Management') },
        ] : []),
    ];

    // Empty state for users without access
    if (!hasAccess) {
        return (
            <div className="max-w-[1600px] mx-auto p-6 md:p-8">
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/projects')}
                        className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer p-0 mb-4 text-sm"
                    >
                        <MdArrowBack size={16} />
                        {t('common.back', 'Back')}
                    </button>
                    <h1 className="text-2xl font-bold text-text-primary mb-2">{t('nav.settings', 'Settings')}</h1>
                </div>
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                    <p className="text-amber-800">
                        {t('settings.accessDenied', 'Settings are available for Admins and Moderators only.')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto p-6 md:p-8">
            <div className="mb-8">
                <button
                    onClick={() => navigate('/projects')}
                    className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors bg-transparent border-none cursor-pointer p-0 mb-4 text-sm"
                >
                    <MdArrowBack size={16} />
                    {t('common.back', 'Back')}
                </button>
                <h1 className="text-2xl font-bold text-text-primary mb-2">{t('nav.settings', 'Settings')}</h1>
                <p className="text-text-secondary">{t('settings.subtitle', 'Manage system entities and configurations')}</p>
            </div>

            {/* Main Tabs Header */}
            <div className="flex items-center gap-1 border-b border-divider mb-8 overflow-x-auto">
                {mainTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setMainTab(tab.id as any)}
                        className={`px-6 py-3 font-medium text-sm transition-all relative cursor-pointer border-none bg-transparent outline-none whitespace-nowrap
                            ${mainTab === tab.id
                                ? 'text-primary'
                                : 'text-text-secondary hover:text-text-primary hover:bg-gray-50 rounded-t-lg'
                            }`}
                    >
                        {tab.label}
                        {mainTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            <div className="animate-slide-in">
                {mainTab === 'infrastructure' && showTab('infrastructure', userRole) && (
                    <InfrastructureSettings
                        baseOptions={baseOptions}
                        envOptions={envOptions}
                        networkOptions={networkOptions}
                        clusterOptions={clusterOptions}
                        onSuccess={refreshData}
                    />
                )}
                {mainTab === 'organization' && showTab('organization', userRole) && (
                    <OrganizationSettings
                        centerOptions={centerOptions}
                        branches={branches}
                        onSuccess={refreshData}
                    />
                )}
                {mainTab === 'options' && showTab('options', userRole) && <OptionsSettings onSuccess={refreshData} />}
                {mainTab === 'services' && showTab('services', userRole) && <ServicesSettings serviceOptions={serviceOptions} onSuccess={refreshData} />}
                {mainTab === 'capacity' && showTab('capacity', userRole) && <CapacityManagement />}
                {mainTab === 'cloudResources' && showTab('cloudResources', userRole) && <CloudResourceManagement />}
                {mainTab === 'wallets' && showTab('wallets', userRole) && <WalletManagement />}
                {mainTab === 'users' && showTab('users', userRole) && <UserManagement />}
            </div>
        </div>
    );
}
