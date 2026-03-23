import { create } from 'zustand';
import type { UserResponse, MembershipResponse } from '@crm/shared';
import { apiClient, setAccessToken, ApiError } from '../lib/api-client';
import { getInitData, isTelegramEnv } from '../lib/telegram';

interface AuthState {
  user: UserResponse | null;
  memberships: MembershipResponse[];
  activeWorkspaceId: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: () => Promise<void>;
  devLogin: (telegramId: number) => Promise<void>;
  selectWorkspace: (workspaceId: string) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  memberships: [],
  activeWorkspaceId: null,
  role: null,
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

      const activeWid = result.memberships.length === 1
        ? result.memberships[0].workspaceId
        : null;

      set({
        user: result.user,
        memberships: result.memberships,
        activeWorkspaceId: activeWid,
        role: result.memberships[0]?.role ?? null,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.code : 'AUTH_FAILED';
      set({ error: msg, isLoading: false });
    }
  },

  devLogin: async (telegramId: number) => {
    set({ isLoading: true, error: null });

    try {
      const result = await apiClient<{
        accessToken: string;
        user: UserResponse;
        workspace: { id: string; name: string; slug: string } | null;
        service: unknown;
        clientNumber: string | null;
        ticketNumber: string | null;
        role: string;
      }>('/auth/dev-login', {
        method: 'POST',
        body: { telegramId },
        skipAuth: true,
      });

      setAccessToken(result.accessToken);

      // Construct a membership from the dev-login response
      const membership: MembershipResponse = {
        id: 'dev-membership',
        role: result.role as MembershipResponse['role'],
        status: 'ACTIVE' as MembershipResponse['status'],
        userId: result.user.id,
        workspaceId: result.workspace?.id ?? '',
        workspaceName: result.workspace?.name,
        joinedAt: new Date().toISOString(),
      };

      set({
        user: result.user,
        memberships: [membership],
        activeWorkspaceId: result.workspace?.id ?? null,
        role: result.role,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.code : 'DEV_LOGIN_FAILED';
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
      role: null,
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
      // non-critical
    }
  },
}));
