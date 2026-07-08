import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthContextValue { session: Session | null; user: User | null; loading: boolean; signOut: () => Promise<void>; }
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => listener.subscription.unsubscribe();
  }, []);
  const value = useMemo(() => ({ session, user: session?.user ?? null, loading, signOut: async () => { await supabase.auth.signOut(); } }), [session, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue { const value = useContext(AuthContext); if (!value) throw new Error('useAuth phải nằm trong AuthProvider'); return value; }
