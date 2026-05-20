# Notifications Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-stack, role-aware notifications system with a TopBar bell badge and panel, polling-based delivery, and 7 notification event types covering demand and project lifecycle events.

**Architecture:** HTTP polling every 30 s (no new server infrastructure required). Notifications are stored in PostgreSQL via a new `Notification` Prisma model; personal notifications use `recipientUsername`, admin-wide events use an `isAdminBroadcast` flag with per-user read tracking via `readByUsernames[]`. Event hooks are added directly in the existing demand and project service layer.

**Tech Stack:** Express + Prisma + PostgreSQL (backend); React 19 + TailwindCSS v4 + react-oidc-context + react-i18next (frontend); polling via `setInterval` in a custom hook.

---

## Notification Types and Recipients

| Event | `NotificationType` | Recipient |
|---|---|---|
| New demand submitted | `NewDemand` | Each username in `service.moderators[]` (User) + Admin broadcast |
| Demand approved / rejected / partial / conditional | `DemandDecision` | `demand.createdBy` (User personal) |
| Demand cancelled by creator | `DemandCancelled` | Each username in `service.moderators[]` + Admin broadcast |
| Demand edited | `DemandEdited` | Each username in `service.moderators[]` + Admin broadcast |
| New project created | `NewProject` | Admin broadcast only |
| Project deleted | `ProjectDeleted` | Admin broadcast only |
| Project edited | `ProjectEdited` | Admin broadcast only |

**Personal notification** (`recipientUsername` set): `isRead` is a plain boolean.  
**Admin broadcast** (`isAdminBroadcast = true`): read-state tracked per-user via `readByUsernames String[]`.

---

## File Map

### New files
| Path | Responsibility |
|---|---|
| `server/src/models/notification/notification.model.ts` | Pure data type – mirrors Prisma model |
| `server/src/services/notification/notification.service.ts` | DB CRUD: create, getUserNotifications, markRead, markAllRead |
| `server/src/controllers/notification/notification.controller.ts` | HTTP handlers for GET / PATCH routes |
| `server/src/routes/notification/notification.routes.ts` | Express router wired to controller |
| `client/src/api/notificationService.ts` | Axios wrappers: fetchNotifications, markRead, markAllRead |
| `client/src/hooks/useNotifications.ts` | Polling hook: notifications[], unreadCount, markRead, markAllRead |
| `client/src/contexts/NotificationContext.tsx` | Provider wrapping useNotifications, exported `useNotificationContext` |
| `client/src/components/notifications/NotificationBell.tsx` | Bell icon + badge rendered in TopBar |
| `client/src/components/notifications/NotificationPanel.tsx` | Dropdown panel: list + mark-all-read |
| `client/src/components/notifications/NotificationItem.tsx` | Single notification row |

### Modified files
| Path | Change |
|---|---|
| `server/prisma/schema.prisma` | Add `NotificationType` enum + `Notification` model |
| `server/src/routes/index.ts` | Mount `/notifications` router |
| `server/src/services/request/demand.service.ts` | Call notification service after create/cancel/update/approve/reject |
| `server/src/services/request/project.service.ts` | Call notification service after create/update/delete |
| `client/src/components/layout/TopBar.tsx` | Insert `<NotificationBell>` |
| `client/src/App.tsx` | Wrap with `<NotificationProvider>` |
| `client/src/i18n/locales/en/translation.json` | Add `notifications.*` keys |
| `client/src/i18n/locales/he/translation.json` | Add Hebrew `notifications.*` keys |

---

## Task 1: Prisma Schema — Notification Model

**Branch:** `feature/notifications`

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add enum and model to schema**

Open `server/prisma/schema.prisma`. Add at the end of the file (after the last existing enum):

```prisma
enum NotificationType {
  NewDemand
  DemandDecision
  DemandCancelled
  DemandEdited
  NewProject
  ProjectDeleted
  ProjectEdited
}

model Notification {
  id                Int              @id @default(autoincrement())
  type              NotificationType
  recipientUsername String?
  isAdminBroadcast  Boolean          @default(false)
  readByUsernames   String[]         @default([])
  isRead            Boolean          @default(false)
  title             String
  message           String
  demandId          Int?
  projectName       String?
  createdAt         DateTime         @default(now())

  @@index([recipientUsername, createdAt(sort: Desc)])
  @@index([isAdminBroadcast, createdAt(sort: Desc)])
}
```

- [ ] **Step 2: Generate and apply migration**

```bash
cd server
npx prisma migrate dev --name add_notifications
```

Expected output:
```
Your database migration has been successfully applied.
Generated Prisma Client
```

If running locally without Docker: ensure `DATABASE_URL` is set.  
If using Docker: run inside the server container: `docker compose exec server npx prisma migrate dev --name add_notifications`

- [ ] **Step 3: Verify Prisma client was regenerated**

```bash
cd server
npx prisma generate
```

Expected: `Generated Prisma Client (v5.x)` with no errors.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat: add Notification model and NotificationType enum to Prisma schema"
```

---

## Task 2: Backend Notification Service + Controller + Routes

**Branch:** `feature/notifications` (same)

**Files:**
- Create: `server/src/services/notification/notification.service.ts`
- Create: `server/src/controllers/notification/notification.controller.ts`
- Create: `server/src/routes/notification/notification.routes.ts`
- Modify: `server/src/routes/index.ts`

- [ ] **Step 1: Create notification service**

Create `server/src/services/notification/notification.service.ts`:

```typescript
import { prisma } from '../../config/database';
import type { NotificationType } from '@prisma/client';

export interface CreateNotificationData {
  type: NotificationType;
  title: string;
  message: string;
  demandId?: number;
  projectName?: string;
}

export const notificationService = {
  /** Create a notification for a specific user */
  async createForUser(username: string, data: CreateNotificationData) {
    return prisma.notification.create({
      data: {
        ...data,
        recipientUsername: username,
        isAdminBroadcast: false,
      },
    });
  },

  /** Create a broadcast notification visible to all admins */
  async createAdminBroadcast(data: CreateNotificationData) {
    return prisma.notification.create({
      data: {
        ...data,
        isAdminBroadcast: true,
      },
    });
  },

  /**
   * Fetch notifications for a user.
   * Returns personal notifications + admin broadcasts if user is admin.
   * unreadCount is returned in meta.
   */
  async getUserNotifications(
    username: string,
    isAdmin: boolean,
    page: number,
    limit: number
  ) {
    const where = {
      OR: [
        { recipientUsername: username },
        ...(isAdmin ? [{ isAdminBroadcast: true }] : []),
      ],
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    // Compute per-notification isRead for the current user
    const enriched = notifications.map((n) => ({
      ...n,
      isRead: n.recipientUsername
        ? n.isRead
        : n.readByUsernames.includes(username),
    }));

    const unreadCount = enriched.filter((n) => !n.isRead).length;

    return { data: enriched, meta: { total, unreadCount } };
  },

  /** Mark a single notification as read for the current user */
  async markRead(id: number, username: string) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new Error('Notification not found');

    if (notification.recipientUsername) {
      // Personal notification
      return prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
    } else {
      // Broadcast: append username to readByUsernames if not already present
      if (notification.readByUsernames.includes(username)) return notification;
      return prisma.notification.update({
        where: { id },
        data: { readByUsernames: { push: username } },
      });
    }
  },

  /** Mark all notifications as read for the current user */
  async markAllRead(username: string, isAdmin: boolean) {
    // Personal notifications
    await prisma.notification.updateMany({
      where: { recipientUsername: username, isRead: false },
      data: { isRead: true },
    });

    if (isAdmin) {
      // Broadcast notifications not yet read by this user
      const unreadBroadcasts = await prisma.notification.findMany({
        where: {
          isAdminBroadcast: true,
          NOT: { readByUsernames: { has: username } },
        },
        select: { id: true },
      });
      for (const n of unreadBroadcasts) {
        await prisma.notification.update({
          where: { id: n.id },
          data: { readByUsernames: { push: username } },
        });
      }
    }
  },
};
```

- [ ] **Step 2: Create notification controller**

Create `server/src/controllers/notification/notification.controller.ts`:

```typescript
import type { Request, Response } from 'express';
import { notificationService } from '../../services/notification/notification.service';

export const notificationController = {
  async list(req: Request, res: Response) {
    const user = req.auth!.user;
    const isAdmin = user.hasRole('admin');
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const result = await notificationService.getUserNotifications(
      user.username,
      isAdmin,
      page,
      limit
    );
    res.json(result);
  },

  async markRead(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const user = req.auth!.user;
    const updated = await notificationService.markRead(id, user.username);
    res.json(updated);
  },

  async markAllRead(req: Request, res: Response) {
    const user = req.auth!.user;
    const isAdmin = user.hasRole('admin');
    await notificationService.markAllRead(user.username, isAdmin);
    res.json({ ok: true });
  },
};
```

- [ ] **Step 3: Create notification routes**

Create `server/src/routes/notification/notification.routes.ts`:

```typescript
import { Router } from 'express';
import { requireAuth } from '../../middleware/authorization';
import { notificationController } from '../../controllers/notification/notification.controller';

const router = Router();

router.use(requireAuth);

router.get('/', notificationController.list);
router.patch('/:id/read', notificationController.markRead);
router.patch('/read-all', notificationController.markAllRead);

export default router;
```

- [ ] **Step 4: Mount the router**

Open `server/src/routes/index.ts`. Find the line where existing routers are mounted (e.g., `router.use('/demands', demandRoutes)`). Add:

```typescript
import notificationRoutes from './notification/notification.routes';
// ... existing imports ...

router.use('/notifications', notificationRoutes);
```

- [ ] **Step 5: Manual smoke test**

Start the server locally. With a valid JWT token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/notifications
# Expected: { data: [], meta: { total: 0, unreadCount: 0 } }
```

- [ ] **Step 6: Commit**

```bash
git add server/src/services/notification/ server/src/controllers/notification/ server/src/routes/notification/ server/src/routes/index.ts
git commit -m "feat: notification service, controller, and routes"
```

---

## Task 3: Backend Event Hooks

**Branch:** `feature/notifications` (same)

**Files:**
- Modify: `server/src/services/request/demand.service.ts`
- Modify: `server/src/services/request/project.service.ts`

The goal: after each state-changing operation, call `notificationService` to create the appropriate notifications. All `include`s on the Prisma calls already return the service, resource, and project — use them to build readable messages.

- [ ] **Step 1: Import notificationService in demand.service.ts**

Open `server/src/services/request/demand.service.ts`. Add at the top:

```typescript
import { notificationService } from '../notification/notification.service';
```

- [ ] **Step 2: Hook into `create`**

Find the `create` method. After the `prisma.demand.create(...)` call resolves (store the result in `demand`), add:

```typescript
// Notify service moderators + admin broadcast about new demand
const moderators: string[] = demand.service?.moderators ?? [];
const notifData = {
  type: 'NewDemand' as const,
  title: 'New Demand Submitted',
  message: `New demand for ${demand.resourceName} (${demand.value} ${demand.resource.unit}) in project "${demand.projectName}" was submitted by ${demand.createdByName || demand.createdBy}.`,
  demandId: demand.id,
  projectName: demand.projectName,
};
await Promise.all([
  ...moderators.map((username) => notificationService.createForUser(username, notifData)),
  notificationService.createAdminBroadcast(notifData),
]);
```

- [ ] **Step 3: Hook into `approve`**

Find the `approve` method. After the `prisma.demand.update(...)` resolves (store in `demand`), add:

```typescript
if (demand.createdBy) {
  const statusLabel: Record<string, string> = {
    Approved: 'approved',
    PartiallyApproved: 'partially approved',
    ApprovedWithCondition: 'approved with condition',
  };
  const label = statusLabel[demand.status] ?? demand.status;
  await notificationService.createForUser(demand.createdBy, {
    type: 'DemandDecision',
    title: 'Decision Received on Your Demand',
    message: `Your demand for ${demand.resourceName} in project "${demand.projectName}" was ${label}.${demand.approvedValue != null ? ` Approved value: ${demand.approvedValue} ${demand.resource.unit}.` : ''}`,
    demandId: demand.id,
    projectName: demand.projectName,
  });
}
```

- [ ] **Step 4: Hook into `reject`**

Find the `reject` method. After the `prisma.demand.update(...)` resolves (store in `demand`), add:

```typescript
if (demand.createdBy) {
  await notificationService.createForUser(demand.createdBy, {
    type: 'DemandDecision',
    title: 'Decision Received on Your Demand',
    message: `Your demand for ${demand.resourceName} in project "${demand.projectName}" was rejected.${demand.reason ? ` Reason: ${demand.reason}` : ''}`,
    demandId: demand.id,
    projectName: demand.projectName,
  });
}
```

- [ ] **Step 5: Hook into `cancel`**

Find the `cancel` method (or the controller's cancel handler — search for `status: 'Cancelled'` in demand.service.ts). After the update resolves, add:

```typescript
const moderators: string[] = demand.service?.moderators ?? [];
const notifData = {
  type: 'DemandCancelled' as const,
  title: 'Demand Cancelled by Creator',
  message: `The demand for ${demand.resourceName} in project "${demand.projectName}" was cancelled by ${demand.createdByName || demand.createdBy}.`,
  demandId: demand.id,
  projectName: demand.projectName,
};
await Promise.all([
  ...moderators.map((username) => notificationService.createForUser(username, notifData)),
  notificationService.createAdminBroadcast(notifData),
]);
```

- [ ] **Step 6: Hook into `update` (demand edit)**

Find the `update` method. After the `prisma.demand.update(...)` resolves, add:

```typescript
const moderators: string[] = demand.service?.moderators ?? [];
const notifData = {
  type: 'DemandEdited' as const,
  title: 'Demand Edited',
  message: `The demand for ${demand.resourceName} in project "${demand.projectName}" was edited by ${demand.createdByName || demand.createdBy}.`,
  demandId: demand.id,
  projectName: demand.projectName,
};
await Promise.all([
  ...moderators.map((username) => notificationService.createForUser(username, notifData)),
  notificationService.createAdminBroadcast(notifData),
]);
```

- [ ] **Step 7: Hook into project service**

Open `server/src/services/request/project.service.ts`. Add:

```typescript
import { notificationService } from '../notification/notification.service';
```

After project `create`, add:

```typescript
await notificationService.createAdminBroadcast({
  type: 'NewProject',
  title: 'New Project Created',
  message: `Project "${project.name}" was created by ${project.createdByName || project.createdBy}.`,
  projectName: project.name,
});
```

After project `update`, add:

```typescript
await notificationService.createAdminBroadcast({
  type: 'ProjectEdited',
  title: 'Project Edited',
  message: `Project "${project.name}" was edited.`,
  projectName: project.name,
});
```

After project `delete` (or wherever the project name is still available), add:

```typescript
await notificationService.createAdminBroadcast({
  type: 'ProjectDeleted',
  title: 'Project Deleted',
  message: `Project "${projectName}" and all its demands were deleted.`,
  projectName: projectName,
});
```

> **Note on `service.moderators`:** The `prisma.demand.create/update` calls in demand.service.ts already `include: { service: true, resource: true, ... }`. Verify this is the case — if not, add `service: true` to the include block for create/cancel/update operations.

- [ ] **Step 8: Commit**

```bash
git add server/src/services/request/demand.service.ts server/src/services/request/project.service.ts
git commit -m "feat: add notification event hooks to demand and project services"
```

---

## Task 4: Frontend — API Functions + useNotifications Hook + Context

**Branch:** `feature/notifications` (same)

**Files:**
- Create: `client/src/api/notificationService.ts`
- Create: `client/src/hooks/useNotifications.ts`
- Create: `client/src/contexts/NotificationContext.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Create API service**

Create `client/src/api/notificationService.ts`:

```typescript
import api from './api';  // the existing axios instance with auth header

export interface AppNotification {
  id: number;
  type: string;
  recipientUsername: string | null;
  isAdminBroadcast: boolean;
  isRead: boolean;  // already computed server-side for current user
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

export async function fetchNotifications(
  page = 1,
  limit = 20
): Promise<NotificationsResponse> {
  const { data } = await api.get('/notifications', { params: { page, limit } });
  return data;
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/notifications/read-all');
}
```

> **Verify the axios instance path**: the existing codebase imports axios instance from `../api/api` or `../api/apiService` — match the exact pattern used in `apiService.ts`. The instance already has the JWT auth header set by `useAuthToken`.

- [ ] **Step 2: Create useNotifications hook**

Create `client/src/hooks/useNotifications.ts`:

```typescript
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

  const load = useCallback(async () => {
    try {
      const result = await fetchNotifications(1, 20);
      setNotifications(result.data);
      setUnreadCount(result.meta.unreadCount);
    } catch {
      // silently ignore — panel shows stale data
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    load().finally(() => setIsLoading(false));
    intervalRef.current = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  const markRead = useCallback(
    async (id: number) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await markNotificationRead(id);
    },
    []
  );

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await markAllNotificationsRead();
  }, []);

  return { notifications, unreadCount, isLoading, markRead, markAllRead, reload: load };
}
```

- [ ] **Step 3: Create NotificationContext**

Create `client/src/contexts/NotificationContext.tsx`:

```typescript
import { createContext, useContext } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import type { AppNotification } from '../api/notificationService';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  reload: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const value = useNotifications();
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used inside NotificationProvider');
  return ctx;
}
```

- [ ] **Step 4: Wrap App with NotificationProvider**

Open `client/src/App.tsx`. Find the provider hierarchy:

```tsx
<ToastProvider>
  <RefreshProvider>
    <ReferenceDataProvider>
      <ModalProvider>
        ...
```

Add `<NotificationProvider>` inside `<RefreshProvider>` (after RefreshProvider, before ReferenceDataProvider):

```tsx
import { NotificationProvider } from './contexts/NotificationContext';

// Inside the render:
<ToastProvider>
  <RefreshProvider>
    <NotificationProvider>
      <ReferenceDataProvider>
        <ModalProvider>
          ...
        </ModalProvider>
      </ReferenceDataProvider>
    </NotificationProvider>
  </RefreshProvider>
</ToastProvider>
```

- [ ] **Step 5: Commit**

```bash
git add client/src/api/notificationService.ts client/src/hooks/useNotifications.ts client/src/contexts/NotificationContext.tsx client/src/App.tsx
git commit -m "feat: notification API service, polling hook, and context provider"
```

---

## Task 5: Frontend — NotificationBell + NotificationPanel + NotificationItem Components

**Branch:** `feature/notifications` (same)

**Files:**
- Create: `client/src/components/notifications/NotificationBell.tsx`
- Create: `client/src/components/notifications/NotificationPanel.tsx`
- Create: `client/src/components/notifications/NotificationItem.tsx`

**Visual spec (from `Notifications.jpeg` mockup):**
- Bell icon (MdNotifications from react-icons/md) in TopBar right area
- Yellow/amber badge showing unread count (capped at "99+")
- Clicking bell toggles a dropdown panel anchored below the bell
- Panel: `ההתראות שלי` header (from i18n) + X close + list + "Mark all read" button
- Each row: type icon + title (bold) + message (smaller text, gray) + time
- Unread rows have a distinct left border or background tint
- Panel closes on outside click

- [ ] **Step 1: Create NotificationItem**

Create `client/src/components/notifications/NotificationItem.tsx`:

```tsx
import { formatDistanceToNow } from 'date-fns';
import { MdCheckCircle, MdCancel, MdEdit, MdAddCircle, MdFolder, MdFolderOff, MdFolderOpen, MdNotifications } from 'react-icons/md';
import type { AppNotification } from '../../api/notificationService';
import { useNavigate } from 'react-router-dom';

const TYPE_ICON: Record<string, React.ReactNode> = {
  NewDemand: <MdAddCircle className="text-primary" size={18} />,
  DemandDecision: <MdCheckCircle className="text-success" size={18} />,
  DemandCancelled: <MdCancel className="text-danger" size={18} />,
  DemandEdited: <MdEdit className="text-warning" size={18} />,
  NewProject: <MdFolder className="text-primary" size={18} />,
  ProjectDeleted: <MdFolderOff className="text-danger" size={18} />,
  ProjectEdited: <MdFolderOpen className="text-warning" size={18} />,
};

interface Props {
  notification: AppNotification;
  onMarkRead: (id: number) => void;
  onClose: () => void;
}

export default function NotificationItem({ notification, onMarkRead, onClose }: Props) {
  const navigate = useNavigate();

  function handleClick() {
    if (!notification.isRead) onMarkRead(notification.id);
    onClose();
    if (notification.projectName) {
      navigate(`/projects?project=${encodeURIComponent(notification.projectName)}`);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-start px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-divider last:border-b-0 cursor-pointer bg-transparent ${
        notification.isRead ? '' : 'border-s-2 border-s-primary bg-primary/3'
      }`}
    >
      <span className="mt-0.5 shrink-0">
        {TYPE_ICON[notification.type] ?? <MdNotifications size={18} className="text-text-secondary" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${notification.isRead ? 'font-normal text-text-primary' : 'font-semibold text-text-primary'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-text-secondary mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      {!notification.isRead && (
        <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
      )}
    </button>
  );
}
```

> **date-fns dependency**: check `client/package.json`. If `date-fns` is not present, replace `formatDistanceToNow` with a simple relative time helper:
> ```typescript
> function relativeTime(iso: string) {
>   const diffMs = Date.now() - new Date(iso).getTime();
>   const diffMin = Math.floor(diffMs / 60000);
>   if (diffMin < 1) return 'just now';
>   if (diffMin < 60) return `${diffMin}m ago`;
>   const diffH = Math.floor(diffMin / 60);
>   if (diffH < 24) return `${diffH}h ago`;
>   return `${Math.floor(diffH / 24)}d ago`;
> }
> ```

- [ ] **Step 2: Create NotificationPanel**

Create `client/src/components/notifications/NotificationPanel.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { MdClose } from 'react-icons/md';
import { useNotificationContext } from '../../contexts/NotificationContext';
import NotificationItem from './NotificationItem';

interface Props {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: Props) {
  const { t } = useTranslation();
  const { notifications, markRead, markAllRead, isLoading } = useNotificationContext();

  return (
    <div className="absolute end-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-bg-paper border border-divider rounded-2xl shadow-lg z-50 flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-divider shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer bg-transparent border-none text-text-secondary"
          aria-label="close"
        >
          <MdClose size={18} />
        </button>
        <h2 className="text-sm font-semibold text-text-primary">
          {t('notifications.title')}
        </h2>
      </div>

      {/* Mark all read */}
      {notifications.some((n) => !n.isRead) && (
        <div className="px-4 py-2 border-b border-divider shrink-0">
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs text-primary hover:underline cursor-pointer bg-transparent border-none"
          >
            {t('notifications.markAllRead')}
          </button>
        </div>
      )}

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {isLoading && notifications.length === 0 && (
          <div className="p-8 text-center text-text-secondary text-sm">
            {t('notifications.loading')}
          </div>
        )}
        {!isLoading && notifications.length === 0 && (
          <div className="p-8 text-center text-text-secondary text-sm">
            {t('notifications.empty')}
          </div>
        )}
        {notifications.map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            onMarkRead={markRead}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create NotificationBell**

Create `client/src/components/notifications/NotificationBell.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react';
import { MdNotifications, MdNotificationsNone } from 'react-icons/md';
import { useNotificationContext } from '../../contexts/NotificationContext';
import NotificationPanel from './NotificationPanel';

export default function NotificationBell() {
  const { unreadCount } = useNotificationContext();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer bg-transparent border-none text-text-primary"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        {unreadCount > 0
          ? <MdNotifications size={22} className="text-amber-500" />
          : <MdNotificationsNone size={22} className="text-text-secondary" />
        }
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold leading-none">
            {badgeLabel}
          </span>
        )}
      </button>

      {isOpen && <NotificationPanel onClose={() => setIsOpen(false)} />}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/notifications/
git commit -m "feat: NotificationBell, NotificationPanel, and NotificationItem components"
```

---

## Task 6: TopBar Integration + i18n

**Branch:** `feature/notifications` (same)

**Files:**
- Modify: `client/src/components/layout/TopBar.tsx`
- Modify: `client/src/i18n/locales/en/translation.json`
- Modify: `client/src/i18n/locales/he/translation.json`

- [ ] **Step 1: Add i18n keys (English)**

Open `client/src/i18n/locales/en/translation.json`. Add a top-level `"notifications"` key:

```json
"notifications": {
  "title": "My Notifications",
  "markAllRead": "Mark all as read",
  "empty": "No notifications",
  "loading": "Loading...",
  "types": {
    "NewDemand": "New Demand",
    "DemandDecision": "Decision Received",
    "DemandCancelled": "Demand Cancelled",
    "DemandEdited": "Demand Edited",
    "NewProject": "New Project",
    "ProjectDeleted": "Project Deleted",
    "ProjectEdited": "Project Edited"
  }
}
```

- [ ] **Step 2: Add i18n keys (Hebrew)**

Open `client/src/i18n/locales/he/translation.json`. Add:

```json
"notifications": {
  "title": "ההתראות שלי",
  "markAllRead": "סמן הכל כנקרא",
  "empty": "אין התראות",
  "loading": "טוען...",
  "types": {
    "NewDemand": "דרישה חדשה",
    "DemandDecision": "קבלת תשובה על הדרישה",
    "DemandCancelled": "ביטול דרישה",
    "DemandEdited": "עריכת דרישה",
    "NewProject": "פרויקט חדש",
    "ProjectDeleted": "מחיקת פרויקט",
    "ProjectEdited": "עריכת פרויקט"
  }
}
```

- [ ] **Step 3: Add NotificationBell to TopBar**

Open `client/src/components/layout/TopBar.tsx`. Add the import:

```tsx
import NotificationBell from '../notifications/NotificationBell';
```

Find the right-side flex container (the one containing `<LanguageSwitcher>`, role icon, and user menu). Insert `<NotificationBell />` between `<LanguageSwitcher>` and the role icon button:

```tsx
{/* Right side */}
<div className="flex items-center gap-4">
  <LanguageSwitcher />
  <NotificationBell />       {/* ← ADD THIS */}
  {/* role icon (settings/crown) */}
  ...
  {/* user menu */}
  ...
</div>
```

- [ ] **Step 4: Verify build compiles**

```bash
cd client
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 5: End-to-end smoke test**

1. Start the full stack locally: `$env:NODE_ENV="development"; docker compose --profile dev up`
2. Log in as a regular user (e.g., `user1`)
3. Confirm bell icon appears in TopBar with no badge
4. Log in as a moderator, create a demand as user1, confirm moderator sees the bell turn amber with badge "1"
5. Click the bell — confirm panel opens with the "New Demand" notification
6. Click the notification — confirm it navigates to `/projects?project=<name>`
7. Confirm bell badge disappears after reading
8. Log in as admin — confirm admin sees all broadcast notifications

- [ ] **Step 6: Final commit and push**

```bash
git add client/src/components/layout/TopBar.tsx client/src/i18n/
git commit -m "feat: integrate NotificationBell in TopBar and add i18n notification keys"
git push origin feature/notifications
```

---

## Verification Checklist

- [ ] Bell appears in TopBar for all logged-in users
- [ ] Badge shows unread count (capped at "99+"), amber color when >0
- [ ] Panel opens on bell click, closes on outside click and X button
- [ ] Regular user sees demand decision notifications (approved/rejected)
- [ ] Service moderator sees new demand, cancelled, edited notifications
- [ ] Admin sees all moderator notifications + project-level broadcasts
- [ ] Clicking a notification navigates to the relevant project/demand
- [ ] "Mark all as read" clears badge and marks all items
- [ ] Polling every 30 s updates badge without page refresh
- [ ] RTL layout renders correctly (panel anchored to end, text direction correct)
- [ ] No new errors in browser console or server logs

---

## Phase 2 (Out of Scope for This Plan)

- SSE/WebSocket for instant delivery
- Admin "subscribe to project" feature
- Notification preferences/settings page
- Email/push notifications
- Notification expiry / auto-delete after N days
- Unread count in browser tab title / favicon badge
