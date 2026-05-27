import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdEdit, MdSearch } from 'react-icons/md';
import type { AppUser, UserRole } from '../../types/domain';
import { fetchUsers, updateUser, fetchCenters, fetchServices } from '../../api/apiService';
import Modal from '../common/Modal';
import { useToast } from '../common/Toast';

interface ReferenceItem { name: string; }

const ROLES: UserRole[] = ['ADMIN', 'MODERATOR', 'CENTER_MANAGER', 'REGULAR_USER'];

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN: 'bg-amber-100 text-amber-700',
  MODERATOR: 'bg-blue-100 text-blue-700',
  CENTER_MANAGER: 'bg-green-100 text-green-700',
  REGULAR_USER: 'bg-gray-100 text-gray-600',
};

export const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [centers, setCenters] = useState<ReferenceItem[]>([]);
  const [services, setServices] = useState<ReferenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal state
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [draftRole, setDraftRole] = useState<UserRole>('REGULAR_USER');
  const [draftCenter, setDraftCenter] = useState('');
  const [draftServices, setDraftServices] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchUsers(), fetchCenters(), fetchServices()])
      .then(([u, c, s]) => {
        setUsers(u);
        setCenters(c);
        setServices(s);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (editingUser) {
      setDraftRole(editingUser.role);
      setDraftCenter(editingUser.centerName ?? '');
      setDraftServices(editingUser.managedServices ?? []);
    }
  }, [editingUser]);

  const handleDraftRoleChange = (newRole: UserRole) => {
    setDraftRole(newRole);
    if (newRole !== 'CENTER_MANAGER') setDraftCenter('');
    if (newRole !== 'MODERATOR') setDraftServices([]);
  };

  const handleServicesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setDraftServices(selected);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
      const updated = await updateUser(editingUser.username, {
        role: draftRole,
        centerName: draftRole === 'CENTER_MANAGER' ? draftCenter : undefined,
        managedServices: draftRole === 'MODERATOR' ? draftServices : undefined,
      });
      setUsers(prev => prev.map(u => u.username === editingUser.username ? updated : u));
      setEditingUser(null);
      showToast(t('users.updateSuccess', 'User updated successfully'), 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || t('users.updateError', 'Failed to update user'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(u =>
    [u.username, u.fullName, u.role].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-text-primary m-0">
            {t('settings.userManagement')}
          </h3>
          <div className="relative">
            <MdSearch size={20} className="absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder={t('common.search', 'Search...')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-bg-paper text-sm ps-10 pe-4 py-2 rounded-xl border border-divider outline-none focus:border-primary transition-colors w-64"
            />
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-bg-paper rounded-xl shadow-sm border border-divider overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="text-xs text-text-secondary uppercase bg-gray-50 border-b border-divider">
              <tr>
                <th className="px-6 py-3 font-semibold whitespace-nowrap text-start">
                  {t('users.username')}
                </th>
                <th className="px-6 py-3 font-semibold whitespace-nowrap text-start">
                  {t('users.fullName')}
                </th>
                <th className="px-6 py-3 font-semibold whitespace-nowrap text-start">
                  {t('users.role')}
                </th>
                <th className="px-6 py-3 font-semibold whitespace-nowrap text-start">
                  {t('users.centerOrServices', 'Center / Services')}
                </th>
                <th className="px-6 py-3 font-semibold text-center w-[100px]">
                  {t('common.actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-secondary">
                    {t('common.noResults', 'No results found')}
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.username} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-text-primary whitespace-nowrap text-start">
                      <span className="font-bold text-text-primary">{user.username}</span>
                    </td>
                    <td className="px-6 py-4 text-text-primary whitespace-nowrap text-start">
                      {user.fullName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-start">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-primary whitespace-nowrap text-start">
                      {user.role === 'CENTER_MANAGER' && user.centerName
                        ? user.centerName
                        : user.role === 'MODERATOR' && user.managedServices?.length
                          ? user.managedServices.join(', ')
                          : <span className="text-text-secondary">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-1.5 text-text-secondary hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                        >
                          <MdEdit size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      <Modal
        isOpen={editingUser !== null}
        onClose={() => setEditingUser(null)}
        title={t('users.editUser', 'Edit User')}
      >
        <div className="flex flex-col gap-4">
          {/* Role field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
              {t('users.role')}
            </label>
            <select
              value={draftRole}
              onChange={e => handleDraftRoleChange(e.target.value as UserRole)}
              className="px-4 py-2 border border-divider rounded-xl outline-none focus:border-primary transition-colors bg-bg-paper text-text-primary text-sm w-full"
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Center field — only for CENTER_MANAGER */}
          {draftRole === 'CENTER_MANAGER' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">
                {t('users.center')}
              </label>
              <select
                value={draftCenter}
                onChange={e => setDraftCenter(e.target.value)}
                className="px-4 py-2 border border-divider rounded-xl outline-none focus:border-primary transition-colors bg-bg-paper text-text-primary text-sm w-full"
              >
                <option value="">{t('users.selectCenter')}</option>
                {centers.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Managed services — only for MODERATOR */}
          {draftRole === 'MODERATOR' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">
                {t('users.managedServices', 'Managed Services')}
              </label>
              <select
                multiple
                value={draftServices}
                onChange={handleServicesChange}
                size={Math.min(services.length || 4, 6)}
                className="px-4 py-2 border border-divider rounded-xl outline-none focus:border-primary transition-colors bg-bg-paper text-text-primary text-sm w-full"
              >
                {services.map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setEditingUser(null)}
              disabled={isSaving}
              className="px-4 py-2 text-text-secondary hover:bg-gray-100 rounded-xl transition-colors border-none cursor-pointer bg-transparent"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-4 py-2 bg-text-primary text-bg-paper rounded-xl hover:bg-black transition-colors border-none cursor-pointer font-medium${isSaving ? ' opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSaving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
