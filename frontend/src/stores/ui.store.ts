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

  isClient: () => boolean;
  isAdmin: () => boolean;
  clientScreen: () => ClientScreen;
  adminScreen: () => AdminScreen;
}

export type { Route, ClientRoute, AdminRoute, ClientScreen, AdminScreen, Platform };

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
