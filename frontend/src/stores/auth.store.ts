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
      // non-critical
    }
  },
}));
