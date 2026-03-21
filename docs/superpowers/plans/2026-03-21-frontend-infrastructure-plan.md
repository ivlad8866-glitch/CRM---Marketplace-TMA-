# Frontend Infrastructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the React frontend to the real NestJS backend — API client, auth flow, Zustand stores, Socket.IO client, and minimal component extraction to support live data.

**Architecture:** Zustand stores (auth, tickets, messages, ui) own all shared state. A singleton `apiClient` handles fetch + JWT refresh. A `socketManager` wraps socket.io-client with typed events from `@crm/shared`. Telegram `initData` → POST `/auth/telegram` → JWT pair → stored in authStore. The existing monolithic `App.tsx` is refactored incrementally: first extract infrastructure hooks, then replace demo data calls one screen at a time.

**Tech Stack:** React 18, Zustand 5, socket.io-client 4, @crm/shared types, Vite 5, TypeScript 5

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/lib/api-client.ts` | Fetch wrapper: base URL, JWT headers, refresh interceptor, error normalization |
| Create | `frontend/src/lib/socket-manager.ts` | Socket.IO typed client: connect/disconnect, event binding, heartbeat |
| Create | `frontend/src/lib/telegram.ts` | Telegram WebApp helpers: getTg(), initData, haptics, backButton |
| Create | `frontend/src/stores/auth.store.ts` | Auth state: tokens, user, workspace, login/logout/refresh actions |
| Create | `frontend/src/stores/tickets.store.ts` | Tickets state: list, active ticket, counters, CRUD actions |
| Create | `frontend/src/stores/messages.store.ts` | Messages state: messages by ticketId, send/edit/delete, typing |
| Create | `frontend/src/stores/ui.store.ts` | UI state: route, platform, loading flags |
| Create | `frontend/src/hooks/useSocket.ts` | Hook: connects socket on auth, binds store updates, heartbeat interval |
| Modify | `frontend/App.tsx` | Replace demo data with store reads, wire auth flow, socket connection |
| Modify | `frontend/package.json` | Add zustand, socket.io-client, @crm/shared |
| Modify | `frontend/vite.config.ts` | Add proxy for /api/v1 in dev mode |

---

## Task 1: Install Dependencies & Configure Vite

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`

- [ ] **Step 1: Install production dependencies**

Run: `cd frontend && pnpm add zustand socket.io-client @crm/shared`

- [ ] **Step 2: Configure Vite dev proxy**

```typescript
// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 3: Verify build still works**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/vite.config.ts frontend/pnpm-lock.yaml
git commit -m "chore: add zustand, socket.io-client, @crm/shared to frontend"
```

---

## Task 2: API Client

**Files:**
- Create: `frontend/src/lib/api-client.ts`

- [ ] **Step 1: Create API client with JWT refresh**

```typescript
// frontend/src/lib/api-client.ts
import type { ErrorResponse } from '@crm/shared';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include', // refresh token is in httpOnly cookie
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    accessToken = null;
    throw new ApiError(401, 'SESSION_EXPIRED', 'Session expired');
  }

  const body = await res.json();
  accessToken = body.data.accessToken;
  return accessToken!;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { field: string; reason: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  skipAuth?: boolean;
}

export async function apiClient<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, params, skipAuth, ...init } = options;

  // Build URL with query params
  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined) searchParams.set(key, String(val));
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!skipAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(url, {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  // Auto-refresh on 401
  if (res.status === 401 && !skipAuth) {
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken();
      }
      const newToken = await refreshPromise;
      refreshPromise = null;

      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, {
        ...init,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });
    } catch {
      refreshPromise = null;
      throw new ApiError(401, 'SESSION_EXPIRED', 'Session expired');
    }
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json();

  if (!res.ok) {
    const err = json as ErrorResponse;
    throw new ApiError(res.status, err.code, err.message, err.details);
  }

  return json.data !== undefined ? json.data : json;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/api-client.ts
git commit -m "feat(frontend): add API client with JWT refresh interceptor"
```

---

## Task 3: Telegram Helpers

**Files:**
- Create: `frontend/src/lib/telegram.ts`

- [ ] **Step 1: Extract Telegram helpers**

```typescript
// frontend/src/lib/telegram.ts

export function getTg() {
  return window.Telegram?.WebApp;
}

export function getInitData(): string {
  return getTg()?.initData ?? '';
}

export function isTelegramEnv(): boolean {
  return !!getTg()?.initData;
}

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  getTg()?.HapticFeedback?.impactOccurred(style);
}

export function hapticNotification(type: 'success' | 'warning' | 'error') {
  getTg()?.HapticFeedback?.notificationOccurred(type);
}

export function expandApp() {
  const tg = getTg();
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.('#0e1621');
  tg.setBackgroundColor?.('#0e1621');
}

export function showBackButton(handler: () => void): () => void {
  const tg = getTg();
  if (!tg) return () => {};
  tg.BackButton.show();
  tg.BackButton.onClick(handler);
  return () => {
    tg.BackButton.offClick(handler);
    tg.BackButton.hide();
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/telegram.ts
git commit -m "feat(frontend): extract Telegram WebApp helpers"
```

---

## Task 4: Auth Store

**Files:**
- Create: `frontend/src/stores/auth.store.ts`

- [ ] **Step 1: Create auth store with Telegram login flow**

```typescript
// frontend/src/stores/auth.store.ts
import { create } from 'zustand';
import type { UserResponse, MembershipResponse } from '@crm/shared';
import { apiClient, setAccessToken, ApiError } from '../lib/api-client';
import { getInitData, isTelegramEnv } from '../lib/telegram';

interface AuthState {
  user: UserResponse | null;
  memberships: MembershipResponse[];
  activeWorkspaceId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: () => Promise<void>;
  selectWorkspace: (workspaceId: string) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  memberships: [],
  activeWorkspaceId: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async () => {
    if (!isTelegramEnv()) {
      set({ error: 'NOT_TELEGRAM' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const initData = getInitData();
      const result = await apiClient<{
        accessToken: string;
        user: UserResponse;
        memberships: MembershipResponse[];
      }>('/auth/telegram', {
        method: 'POST',
        body: { initData },
        skipAuth: true,
      });

      setAccessToken(result.accessToken);

      // Auto-select workspace if only one
      const activeWid = result.memberships.length === 1
        ? result.memberships[0].workspaceId
        : null;

      set({
        user: result.user,
        memberships: result.memberships,
        activeWorkspaceId: activeWid,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.code : 'AUTH_FAILED';
      set({ error: msg, isLoading: false });
    }
  },

  selectWorkspace: (workspaceId: string) => {
    set({ activeWorkspaceId: workspaceId });
  },

  logout: () => {
    setAccessToken(null);
    set({
      user: null,
      memberships: [],
      activeWorkspaceId: null,
      isAuthenticated: false,
    });
  },

  fetchMe: async () => {
    try {
      const wid = get().activeWorkspaceId;
      if (!wid) return;
      const user = await apiClient<UserResponse>(`/workspaces/${wid}/me`);
      set({ user });
    } catch {
      // ignore — non-critical
    }
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/auth.store.ts
git commit -m "feat(frontend): add auth store with Telegram login flow"
```

---

## Task 5: UI Store (Routing)

**Files:**
- Create: `frontend/src/stores/ui.store.ts`

- [ ] **Step 1: Create UI store with route management**

```typescript
// frontend/src/stores/ui.store.ts
import { create } from 'zustand';

type ClientScreen = 'loading' | 'directory' | 'services' | 'chat' | 'history' | 'rating';
type AdminScreen = 'access' | 'dashboard' | 'tickets' | 'ticket' | 'services' | 'templates' | 'team' | 'settings';
type Platform = 'telegram' | 'whatsapp' | 'web';
type ClientRoute = `client/${ClientScreen}`;
type AdminRoute = `admin/${AdminScreen}`;
type Route = 'select' | ClientRoute | AdminRoute;

function getRouteFromHash(): Route {
  const hash = window.location.hash.replace('#', '');
  if (hash && isValidRoute(hash)) return hash as Route;
  return 'select';
}

function isValidRoute(r: string): boolean {
  if (r === 'select') return true;
  if (r.startsWith('client/') || r.startsWith('admin/')) return true;
  return false;
}

interface UiState {
  route: Route;
  platform: Platform;
  globalLoading: boolean;

  navigate: (route: Route) => void;
  setGlobalLoading: (v: boolean) => void;

  // Computed helpers
  isClient: () => boolean;
  isAdmin: () => boolean;
  clientScreen: () => ClientScreen;
  adminScreen: () => AdminScreen;
}

export type { Route, ClientScreen, AdminScreen, Platform };

export const useUiStore = create<UiState>((set, get) => ({
  route: getRouteFromHash(),
  platform: (window.Telegram?.WebApp ? 'telegram' : 'web') as Platform,
  globalLoading: false,

  navigate: (route: Route) => {
    window.location.hash = route;
    set({ route });
  },

  setGlobalLoading: (v: boolean) => set({ globalLoading: v }),

  isClient: () => get().route.startsWith('client/'),
  isAdmin: () => get().route.startsWith('admin/'),
  clientScreen: () => (get().route.replace('client/', '') || 'directory') as ClientScreen,
  adminScreen: () => (get().route.replace('admin/', '') || 'dashboard') as AdminScreen,
}));
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/ui.store.ts
git commit -m "feat(frontend): add UI store with route management"
```

---

## Task 6: Tickets Store

**Files:**
- Create: `frontend/src/stores/tickets.store.ts`

- [ ] **Step 1: Create tickets store**

```typescript
// frontend/src/stores/tickets.store.ts
import { create } from 'zustand';
import type { TicketListItem, TicketResponse, TicketCounters, PaginatedResponse } from '@crm/shared';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from './auth.store';

interface TicketsState {
  tickets: TicketListItem[];
  activeTicket: TicketResponse | null;
  counters: TicketCounters;
  page: number;
  totalPages: number;
  isLoading: boolean;

  fetchTickets: (params?: { status?: string; search?: string; page?: number }) => Promise<void>;
  fetchTicket: (ticketId: string) => Promise<void>;
  updateTicketInList: (ticketId: string, changes: Partial<TicketListItem>) => void;
  clearActive: () => void;
}

const defaultCounters: TicketCounters = { new: 0, inProgress: 0, waitingCustomer: 0, slaOverdue: 0 };

export const useTicketsStore = create<TicketsState>((set) => ({
  tickets: [],
  activeTicket: null,
  counters: defaultCounters,
  page: 1,
  totalPages: 1,
  isLoading: false,

  fetchTickets: async (params) => {
    const wid = useAuthStore.getState().activeWorkspaceId;
    if (!wid) return;

    set({ isLoading: true });
    try {
      const res = await apiClient<PaginatedResponse<TicketListItem>>(
        `/workspaces/${wid}/tickets`,
        { params: params as Record<string, string | number | undefined> },
      );
      set({
        tickets: res.data,
        page: res.meta.page,
        totalPages: res.meta.totalPages,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchTicket: async (ticketId: string) => {
    const wid = useAuthStore.getState().activeWorkspaceId;
    if (!wid) return;

    try {
      const ticket = await apiClient<TicketResponse>(`/workspaces/${wid}/tickets/${ticketId}`);
      set({ activeTicket: ticket });
    } catch {
      // handled by caller
    }
  },

  updateTicketInList: (ticketId, changes) => {
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, ...changes } : t,
      ),
    }));
  },

  clearActive: () => set({ activeTicket: null }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/tickets.store.ts
git commit -m "feat(frontend): add tickets store with CRUD actions"
```

---

## Task 7: Messages Store

**Files:**
- Create: `frontend/src/stores/messages.store.ts`

- [ ] **Step 1: Create messages store**

```typescript
// frontend/src/stores/messages.store.ts
import { create } from 'zustand';
import type { MessageResponse, CursorResponse } from '@crm/shared';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from './auth.store';

interface TypingUser {
  userId: string;
  userName: string;
  timeout: ReturnType<typeof setTimeout>;
}

interface MessagesState {
  messagesByTicket: Record<string, MessageResponse[]>;
  hasMore: Record<string, boolean>;
  typingUsers: Record<string, TypingUser[]>; // by ticketId
  isLoading: boolean;

  fetchMessages: (ticketId: string, before?: string) => Promise<void>;
  addMessage: (ticketId: string, message: MessageResponse) => void;
  updateMessage: (ticketId: string, messageId: string, changes: Partial<MessageResponse>) => void;
  removeMessage: (ticketId: string, messageId: string) => void;

  setTyping: (ticketId: string, userId: string, userName: string, isTyping: boolean) => void;

  clearTicketMessages: (ticketId: string) => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messagesByTicket: {},
  hasMore: {},
  typingUsers: {},
  isLoading: false,

  fetchMessages: async (ticketId, before) => {
    const wid = useAuthStore.getState().activeWorkspaceId;
    if (!wid) return;

    set({ isLoading: true });
    try {
      const params: Record<string, string | number | undefined> = {};
      if (before) params.before = before;

      const res = await apiClient<CursorResponse<MessageResponse>>(
        `/workspaces/${wid}/tickets/${ticketId}/messages`,
        { params },
      );

      set((state) => {
        const existing = state.messagesByTicket[ticketId] || [];
        const merged = before ? [...res.data, ...existing] : res.data;
        return {
          messagesByTicket: { ...state.messagesByTicket, [ticketId]: merged },
          hasMore: { ...state.hasMore, [ticketId]: res.hasMore },
          isLoading: false,
        };
      });
    } catch {
      set({ isLoading: false });
    }
  },

  addMessage: (ticketId, message) => {
    set((state) => {
      const existing = state.messagesByTicket[ticketId] || [];
      // Dedupe by id
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messagesByTicket: {
          ...state.messagesByTicket,
          [ticketId]: [...existing, message],
        },
      };
    });
  },

  updateMessage: (ticketId, messageId, changes) => {
    set((state) => {
      const msgs = state.messagesByTicket[ticketId];
      if (!msgs) return state;
      return {
        messagesByTicket: {
          ...state.messagesByTicket,
          [ticketId]: msgs.map((m) => (m.id === messageId ? { ...m, ...changes } : m)),
        },
      };
    });
  },

  removeMessage: (ticketId, messageId) => {
    set((state) => {
      const msgs = state.messagesByTicket[ticketId];
      if (!msgs) return state;
      return {
        messagesByTicket: {
          ...state.messagesByTicket,
          [ticketId]: msgs.map((m) =>
            m.id === messageId ? { ...m, isDeleted: true, text: null } : m,
          ),
        },
      };
    });
  },

  setTyping: (ticketId, userId, userName, isTyping) => {
    set((state) => {
      const current = state.typingUsers[ticketId] || [];

      // Clear existing timeout for this user
      const existing = current.find((t) => t.userId === userId);
      if (existing) clearTimeout(existing.timeout);

      if (!isTyping) {
        return {
          typingUsers: {
            ...state.typingUsers,
            [ticketId]: current.filter((t) => t.userId !== userId),
          },
        };
      }

      // Auto-clear after 5s
      const timeout = setTimeout(() => {
        get().setTyping(ticketId, userId, userName, false);
      }, 5000);

      const filtered = current.filter((t) => t.userId !== userId);
      return {
        typingUsers: {
          ...state.typingUsers,
          [ticketId]: [...filtered, { userId, userName, timeout }],
        },
      };
    });
  },

  clearTicketMessages: (ticketId) => {
    set((state) => {
      const { [ticketId]: _, ...rest } = state.messagesByTicket;
      return { messagesByTicket: rest };
    });
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/messages.store.ts
git commit -m "feat(frontend): add messages store with cursor pagination and typing"
```

---

## Task 8: Socket Manager + useSocket Hook

**Files:**
- Create: `frontend/src/lib/socket-manager.ts`
- Create: `frontend/src/hooks/useSocket.ts`

- [ ] **Step 1: Create typed Socket.IO manager**

```typescript
// frontend/src/lib/socket-manager.ts
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@crm/shared';
import { getAccessToken } from './api-client';
import { LIMITS } from '@crm/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

const WS_URL = import.meta.env.VITE_WS_URL || '';

export function getSocket(): TypedSocket | null {
  return socket;
}

export function connectSocket(): TypedSocket {
  if (socket?.connected) return socket;

  const token = getAccessToken();
  if (!token) throw new Error('No access token for socket connection');

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: LIMITS.SOCKET_RECONNECT_MAX_MS,
  }) as TypedSocket;

  // Heartbeat
  heartbeatInterval = setInterval(() => {
    socket?.emit('heartbeat');
  }, LIMITS.HEARTBEAT_INTERVAL_MS);

  socket.on('disconnect', () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  });

  return socket;
}

export function disconnectSocket() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  socket?.disconnect();
  socket = null;
}
```

- [ ] **Step 2: Create useSocket hook that binds WS events to stores**

```typescript
// frontend/src/hooks/useSocket.ts
import { useEffect } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket-manager';
import { useAuthStore } from '../stores/auth.store';
import { useMessagesStore } from '../stores/messages.store';
import { useTicketsStore } from '../stores/tickets.store';

export function useSocket() {
  const { isAuthenticated, activeWorkspaceId } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !activeWorkspaceId) return;

    const socket = connectSocket();

    // --- Message events ---
    socket.on('message:new', (message) => {
      useMessagesStore.getState().addMessage(message.ticketId, message);
    });

    socket.on('message:edited', ({ messageId, text, updatedAt }) => {
      // Update across all ticket message lists
      const state = useMessagesStore.getState();
      for (const ticketId of Object.keys(state.messagesByTicket)) {
        state.updateMessage(ticketId, messageId, { text, isEdited: true } as any);
      }
    });

    socket.on('message:deleted', ({ messageId }) => {
      const state = useMessagesStore.getState();
      for (const ticketId of Object.keys(state.messagesByTicket)) {
        state.removeMessage(ticketId, messageId);
      }
    });

    // --- Typing ---
    socket.on('typing:update', ({ ticketId, userId, userName, isTyping }) => {
      useMessagesStore.getState().setTyping(ticketId, userId, userName, isTyping);
    });

    // --- Read receipts ---
    socket.on('receipt:read', ({ ticketId, messageId, readAt }) => {
      useMessagesStore.getState().updateMessage(ticketId, messageId, { readAt } as any);
    });

    // --- Ticket events ---
    socket.on('ticket:updated', ({ ticketId, changes }) => {
      useTicketsStore.getState().updateTicketInList(ticketId, changes as any);
    });

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, activeWorkspaceId]);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/socket-manager.ts frontend/src/hooks/useSocket.ts
git commit -m "feat(frontend): add typed Socket.IO manager and useSocket hook"
```

---

## Task 9: Wire App.tsx to Real Infrastructure

**Files:**
- Modify: `frontend/App.tsx`

This task replaces the demo bootstrapping in App.tsx with real auth + store usage. We keep the existing UI render logic but swap data sources.

- [ ] **Step 1: Add imports and auth bootstrap at the top of App.tsx**

At the very top, after the existing React imports, add:

```typescript
import { useAuthStore } from './src/stores/auth.store';
import { useUiStore } from './src/stores/ui.store';
import { useTicketsStore } from './src/stores/tickets.store';
import { useMessagesStore } from './src/stores/messages.store';
import { useSocket } from './src/hooks/useSocket';
import { expandApp, haptic, showBackButton, isTelegramEnv } from './src/lib/telegram';
import { getSocket } from './src/lib/socket-manager';
```

- [ ] **Step 2: Replace the role-select + auth logic in the App component**

At the beginning of the `App` function body, after existing state declarations, add:

```typescript
// Real auth
const { user, isAuthenticated, isLoading: authLoading, login, memberships, activeWorkspaceId, selectWorkspace } = useAuthStore();
const { navigate, route: storeRoute } = useUiStore();

// Connect socket when authenticated
useSocket();

// Auto-login on mount
useEffect(() => {
  if (isTelegramEnv() && !isAuthenticated) {
    login();
  }
}, []);

// Expand Telegram app on mount
useEffect(() => {
  expandApp();
}, []);

// After login, auto-navigate based on role
useEffect(() => {
  if (!isAuthenticated || !activeWorkspaceId) return;
  const membership = memberships.find(m => m.workspaceId === activeWorkspaceId);
  if (!membership) return;

  const isStaff = ['WORKSPACE_OWNER', 'ADMIN', 'AGENT'].includes(membership.role);
  if (isStaff && route === 'select') {
    navigate('admin/dashboard');
  } else if (!isStaff && route === 'select') {
    navigate('client/directory');
  }
}, [isAuthenticated, activeWorkspaceId]);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors (or only existing type warnings)

- [ ] **Step 4: Commit**

```bash
git add frontend/App.tsx
git commit -m "feat(frontend): wire App.tsx to auth store, socket, and route management"
```

---

## Task 10: TypeScript Verification & Final Integration

- [ ] **Step 1: Run TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Fix any type errors found**

Common issues:
- @crm/shared import resolution in Vite (may need `tsconfig.json` paths)
- Missing `Window.Telegram` type augmentation
- Store state types vs existing App.tsx local types

- [ ] **Step 3: Verify dev server starts**

Run: `cd frontend && npx vite --host 2>&1 | head -20`
Expected: Server starts on port 5173

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix(frontend): resolve TypeScript errors in frontend infrastructure"
```
