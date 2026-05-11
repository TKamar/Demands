import api from './axiosInstance';

export interface AppNotification {
  id: number;
  type: string;
  recipientUsername: string | null;
  isAdminBroadcast: boolean;
  isRead: boolean;
  title: string;
  message: string;
  demandId: number | null;
  projectName: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  data: AppNotification[];
  meta: { total: number; unreadCount: number };
}

export async function fetchNotifications(page = 1, limit = 20): Promise<NotificationsResponse> {
  const { data } = await api.get('/notifications', { params: { page, limit } });
  return data;
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/notifications/read-all');
}
