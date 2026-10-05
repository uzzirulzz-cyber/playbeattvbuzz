'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { get, post } from './api';

// ─── Session ────────────────────────────────────────────────

export type SessionInfo = {
  user: { id: string; email: string; name: string; role: string; twoFactor?: boolean } | null;
  subscription: { id: string; plan: string; quality: string; devicesLimit: number; expiresAt: string } | null;
  unread: number;
};

type Toast = { id: number; kind: 'ok' | 'err' | 'info'; text: string };

type AppState = {
  session: SessionInfo | null;
  sessionLoading: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  hasActiveSub: boolean;
  cartPlanId: string | null;
  setCartPlanId: (id: string | null) => void;
  toasts: Toast[];
  toast: (kind: Toast['kind'], text: string) => void;
  favorites: { refType: string; refId: string }[];
  favSet: Set<string>;
  refreshFavorites: () => Promise<void>;
  toggleFavorite: (refType: string, refId: string, label: string) => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppProvider missing');
  return v;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [cartPlanId, setCartPlanId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [favorites, setFavorites] = useState<{ refType: string; refId: string }[]>([]);

  const toast = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const s = await get<SessionInfo>('/api/auth/me');
      setSession(s);
    } catch {
      setSession({ user: null, subscription: null, unread: 0 });
    } finally {
      setSessionLoading(false);
    }
  }, []);

  const refreshFavorites = useCallback(async () => {
    try {
      const s = await get<{ user: { id: string } | null }>('/api/auth/me');
      if (!s.user) {
        setFavorites([]);
        return;
      }
      const r = await get<{ rows: { refType: string; refId: string }[] }>('/api/favorites');
      setFavorites(r.rows.map((x) => ({ refType: x.refType, refId: x.refId })));
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const favSet = useMemo(() => new Set(favorites.map((f) => `${f.refType}:${f.refId}`)), [favorites]);

  const toggleFavorite = useCallback(
    async (refType: string, refId: string, label: string) => {
      const key = `${refType}:${refId}`;
      if (favSet.has(key)) {
        await fetch('/api/favorites', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refType, refId }) });
        setFavorites((f) => f.filter((x) => !(x.refType === refType && x.refId === refId)));
        toast('info', 'Removed from favorites');
      } else {
        await post('/api/favorites', { refType, refId, label });
        setFavorites((f) => [...f, { refType, refId }]);
        toast('ok', 'Added to favorites');
      }
    },
    [favSet, toast],
  );

  const logout = useCallback(async () => {
    await post('/api/auth/logout');
    setSession({ user: null, subscription: null, unread: 0 });
    setFavorites([]);
    toast('info', 'Signed out');
  }, [toast]);

  const value: AppState = {
    session,
    sessionLoading,
    refreshSession,
    logout,
    isAdmin: !!session?.user && ['SUPERADMIN', 'ADMIN', 'STAFF'].includes(session.user.role),
    hasActiveSub: !!session?.subscription,
    cartPlanId,
    setCartPlanId,
    toasts,
    toast,
    favorites,
    favSet,
    refreshFavorites,
    toggleFavorite,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
