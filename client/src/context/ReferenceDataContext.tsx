import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from 'react-oidc-context';
import {
    fetchBases,
    fetchEnvironments,
    fetchNetworks,
    fetchClusters,
    fetchCenters,
    fetchBranches,
    fetchSections,
    fetchLocations,
    fetchServices,
    fetchResources,
    fetchProjectKinds,
    fetchEmergencyOptions,
} from '../api/apiService';
import type { ReferenceItem, BranchItem, SectionItem, LocationItem, ResourceItem } from '../api/types';

interface ReferenceDataState {
    bases: ReferenceItem[];
    environments: ReferenceItem[];
    networks: ReferenceItem[];
    clusters: ReferenceItem[];
    centers: ReferenceItem[];
    branches: BranchItem[];
    sections: SectionItem[];
    locations: LocationItem[];
    services: ReferenceItem[];
    resources: ResourceItem[];
    projectKinds: ReferenceItem[];
    emergencyOptions: ReferenceItem[];
    isLoading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
}

const ReferenceDataContext = createContext<ReferenceDataState | null>(null);

export function useReferenceDataContext() {
    const context = useContext(ReferenceDataContext);
    if (!context) {
        throw new Error('useReferenceDataContext must be used within a ReferenceDataProvider');
    }
    return context;
}

export function ReferenceDataProvider({ children }: { children: ReactNode }) {
    const auth = useAuth();
    const [bases, setBases] = useState<ReferenceItem[]>([]);
    const [environments, setEnvironments] = useState<ReferenceItem[]>([]);
    const [networks, setNetworks] = useState<ReferenceItem[]>([]);
    const [clusters, setClusters] = useState<ReferenceItem[]>([]);
    const [centers, setCenters] = useState<ReferenceItem[]>([]);
    const [branches, setBranches] = useState<BranchItem[]>([]);
    const [sections, setSections] = useState<SectionItem[]>([]);
    const [locations, setLocations] = useState<LocationItem[]>([]);
    const [services, setServices] = useState<ReferenceItem[]>([]);
    const [resources, setResources] = useState<ResourceItem[]>([]);
    const [projectKinds, setProjectKinds] = useState<ReferenceItem[]>([]);
    const [emergencyOptions, setEmergencyOptions] = useState<ReferenceItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [b, e, n, cl, c, br, sec, loc, s, r, pk, eo] = await Promise.all([
                fetchBases(),
                fetchEnvironments(),
                fetchNetworks(),
                fetchClusters(),
                fetchCenters(),
                fetchBranches(),
                fetchSections(),
                fetchLocations(),
                fetchServices(),
                fetchResources(),
                fetchProjectKinds(),
                fetchEmergencyOptions(),
            ]);

            setBases(b);
            setEnvironments(e);
            setNetworks(n);
            setClusters(cl);
            setCenters(c);
            setBranches(br);
            setSections(sec);
            setLocations(loc);
            setServices(s);
            setResources(r);
            setProjectKinds(pk);
            setEmergencyOptions(eo);
            setError(null);
        } catch (err: any) {
            console.error('Failed to load reference data', err);
            setError(err.message ?? 'Failed to load reference data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (auth.isAuthenticated) {
            fetchData();
        }
    }, [fetchData, auth.isAuthenticated]);

    const value = {
        bases,
        environments,
        networks,
        clusters,
        centers,
        branches,
        sections,
        locations,
        services,
        resources,
        projectKinds,
        emergencyOptions,
        isLoading,
        error,
        refreshData: fetchData,
    };

    return (
        <ReferenceDataContext.Provider value={value}>
            {children}
        </ReferenceDataContext.Provider>
    );
}
