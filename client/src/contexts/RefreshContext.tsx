import { createContext, useContext, useState, type ReactNode } from 'react';

interface RefreshContextType {
    projectsRefreshTrigger: number;
    demandsRefreshTrigger: number;
    triggerRefreshProjects: () => void;
    triggerRefreshDemands: () => void;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: ReactNode }) {
    const [projectsRefreshTrigger, setProjectsTrigger] = useState(0);
    const [demandsRefreshTrigger, setDemandsTrigger] = useState(0);

    const triggerRefreshProjects = () => setProjectsTrigger((prev) => prev + 1);
    const triggerRefreshDemands = () => setDemandsTrigger((prev) => prev + 1);

    return (
        <RefreshContext.Provider
            value={{
                projectsRefreshTrigger,
                demandsRefreshTrigger,
                triggerRefreshProjects,
                triggerRefreshDemands,
            }}
        >
            {children}
        </RefreshContext.Provider>
    );
}

export function useRefresh() {
    const context = useContext(RefreshContext);
    if (context === undefined) {
        throw new Error('useRefresh must be used within a RefreshProvider');
    }
    return context;
}
