import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppUser, UserRole } from '../../types/domain';
import { fetchUsers, updateUser, fetchCenters } from '../../api/apiService';

interface Center { name: string; }
const ROLES: UserRole[] = ['ADMIN', 'MODERATOR', 'CENTER_MANAGER', 'REGULAR_USER'];

export const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers().then(setUsers);
    fetchCenters().then(setCenters);
  }, []);

  const handleUpdate = async (username: string, role: UserRole, centerName?: string) => {
    setSaving(username);
    try {
      const updated = await updateUser(username, { role, centerName });
      setUsers(prev => prev.map(u => (u.username === username ? updated : u)));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-4" dir="rtl">
      <h2 className="text-lg font-semibold mb-4">{t('settings.userManagement')}</h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-right">{t('users.username')}</th>
            <th className="p-2 text-right">{t('users.fullName')}</th>
            <th className="p-2 text-right">{t('users.role')}</th>
            <th className="p-2 text-right">{t('users.center')}</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <UserRow
              key={user.username}
              user={user}
              centers={centers}
              saving={saving === user.username}
              onUpdate={handleUpdate}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface UserRowProps {
  user: AppUser;
  centers: Center[];
  saving: boolean;
  onUpdate: (username: string, role: UserRole, centerName?: string) => void;
}

const UserRow: React.FC<UserRowProps> = ({ user, centers, saving, onUpdate }) => {
  const { t } = useTranslation();
  const [role, setRole] = useState<UserRole>(user.role);
  const [centerName, setCenterName] = useState<string>(user.centerName ?? '');

  const handleSave = () => {
    onUpdate(user.username, role, role === 'CENTER_MANAGER' ? centerName : undefined);
  };

  const changed = role !== user.role || centerName !== (user.centerName ?? '');

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="p-2">{user.username}</td>
      <td className="p-2">{user.fullName}</td>
      <td className="p-2">
        <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="border rounded px-2 py-1 text-sm">
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td className="p-2">
        {role === 'CENTER_MANAGER' ? (
          <select value={centerName} onChange={e => setCenterName(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="">{t('users.selectCenter')}</option>
            {centers.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        ) : <span className="text-gray-400">—</span>}
      </td>
      <td className="p-2">
        {changed && (
          <button onClick={handleSave} disabled={saving} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? '...' : t('common.save')}
          </button>
        )}
      </td>
    </tr>
  );
};
