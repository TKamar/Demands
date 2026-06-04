import { useModal } from '../../contexts/ModalContext';
import { useRefresh } from '../../contexts/RefreshContext';
import CreateProjectModal from '../projects/CreateProjectModal';
import CreateDemandModal from '../projects/CreateDemandModal';
import { createProject, createDemand } from '../../api/apiService';
import type { CreateProjectPayload, CreateDemandPayload, UpdateProjectPayload, UpdateDemandPayload } from '../../api/types';

export default function GlobalModals() {
    const { activeModal, closeModal } = useModal();
    const { triggerRefreshProjects, triggerRefreshDemands } = useRefresh();

    async function handleCreateProject(payload: CreateProjectPayload | UpdateProjectPayload) {
        try {
            await createProject(payload as CreateProjectPayload);
            triggerRefreshProjects();
            closeModal();
        } catch (error) {
            console.error('Failed to create project', error);
        }
    }

    async function handleCreateDemand(payload: CreateDemandPayload | UpdateDemandPayload) {
        try {
            await createDemand(payload as CreateDemandPayload);
            triggerRefreshDemands();
            closeModal();
        } catch (error) {
            console.error('Failed to create demand', error);
        }
    }

    return (
        <>
            <CreateProjectModal
                isOpen={activeModal === 'project'}
                onClose={closeModal}
                onSubmit={handleCreateProject}
            />
            <CreateDemandModal
                isOpen={activeModal === 'demand'}
                onClose={closeModal}
                onSubmit={handleCreateDemand}
            />
        </>
    );
}
