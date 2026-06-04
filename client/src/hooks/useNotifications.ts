import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '../api/notificationService';

const POLL_INTERVAL_MS = 30_000;

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await fetchNotifications(1, 20);
      if (signal?.aborted) return;
      setNotifications(result.data);
      setUnreadCount(result.meta.unreadCount);
    } catch {
      // silently ignore — panel shows stale data
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    load(controller.signal).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false);
    });
    intervalRef.current = setInterval(() => {
      const c = new AbortController();
      load(c.signal);
    }, POLL_INTERVAL_MS);
    return () => {
      controller.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  const markRead = useCallback(
    async (id: number) => {
      let wasUnread = false;
      setNotifications((prev) => {
        const target = prev.find((n) => n.id === id);
        if (!target || target.isRead) return prev;
        wasUnread = true;
        return prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      });
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await markNotificationRead(id);
      } catch {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
        );
        if (wasUnread) setUnreadCount((prev) => prev + 1);
      }
    },
    []
  );

  const markAllRead = useCallback(async () => {
    let snapshot: AppNotification[] = [];
    setNotifications((prev) => {
      snapshot = prev;
      return prev.map((n) => ({ ...n, isRead: true }));
    });
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      setNotifications(snapshot);
      setUnreadCount(snapshot.filter((n) => !n.isRead).length);
    }
  }, []);

  return { notifications, unreadCount, isLoading, markRead, markAllRead, reload: () => load() };
}
