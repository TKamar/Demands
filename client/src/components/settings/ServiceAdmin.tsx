import { useCallback, useEffect, useState } from 'react';
import { updateService, getAllServices, fetchUsers } from '../../api/apiService';

interface Service {
  name: string;
  displayName?: string;
  moderators: string[];
  isActive: boolean;
}

interface Moderator {
  username: string;
  fullName: string;
}

export const ServiceAdmin = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editModerators, setEditModerators] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch services and moderators on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [svc, users] = await Promise.all([
          getAllServices(),
          fetchUsers(),
        ]);
        setServices(svc);
        setModerators(users.filter((u: any) => u.role === 'MODERATOR'));
      } catch (err) {
        console.error('Failed to load services/moderators:', err);
        setError('Failed to load services and moderators');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleEditService = useCallback((serviceName: string) => {
    const service = services.find(s => s.name === serviceName);
    if (service) {
      setEditingService(serviceName);
      setEditModerators([...service.moderators]);
    }
  }, [services]);

  const handleToggleModerator = useCallback((modUsername: string) => {
    setEditModerators(prev =>
      prev.includes(modUsername)
        ? prev.filter(m => m !== modUsername)
        : [...prev, modUsername]
    );
  }, []);

  const handleSave = useCallback(async (serviceName: string) => {
    try {
      await updateService(serviceName, { moderators: editModerators });
      setServices(prev =>
        prev.map(s => s.name === serviceName ? { ...s, moderators: editModerators } : s)
      );
      setEditingService(null);
      setError(null);
    } catch (err) {
      console.error('Failed to update service:', err);
      setError('Failed to save service moderators');
    }
  }, [editModerators]);

  const handleCancel = useCallback(() => {
    setEditingService(null);
    setEditModerators([]);
    setError(null);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Services & Moderators</h3>
        <div className="text-gray-600">Loading services...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Services & Moderators</h3>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto border rounded">
        <table className="w-full min-w-full">
          <thead>
            <tr className="bg-bg-default border-b">
              <th className="p-3 text-left font-medium">Service</th>
              <th className="p-3 text-left font-medium">Assigned Moderators</th>
              <th className="p-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-3 text-center text-gray-600">
                  No services found
                </td>
              </tr>
            ) : (
              services.map(service => (
                <tr key={service.name} className="border-b hover:bg-bg-default">
                  <td className="p-3 font-mono text-sm">
                    {service.displayName || service.name}
                  </td>
                  <td className="p-3">
                    {editingService === service.name ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {moderators.length === 0 ? (
                          <p className="text-gray-600 text-sm">No moderators available</p>
                        ) : (
                          moderators.map(mod => (
                            <label key={mod.username} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editModerators.includes(mod.username)}
                                onChange={() => handleToggleModerator(mod.username)}
                                className="w-4 h-4"
                              />
                              <span>{mod.fullName} ({mod.username})</span>
                            </label>
                          ))
                        )}
                      </div>
                    ) : (
                      <span className="text-sm">
                        {editModerators.length > 0 ? editModerators.join(', ') : '—'}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {editingService === service.name ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleSave(service.name)}
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-3 py-1 bg-bg-default0 text-white text-sm rounded hover:bg-gray-600 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditService(service.name)}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
