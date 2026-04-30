import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  year?: number;
  section?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signUp: (data: { email: string; password: string; name: string; role: UserRole; year?: number; section?: string; }) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isAdminOrTeacher: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true,
  signUp: async () => ({}), signIn: async () => ({}), logout: async () => {},
  isAdminOrTeacher: false,
});

export const useAuth = () => useContext(AuthContext);

async function loadProfile(authUser: User): Promise<UserProfile | null> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', authUser.id),
  ]);
  if (!profile) return null;
  const role = (roles?.[0]?.role as UserRole) ?? 'student';
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role,
    year: profile.year ?? undefined,
    section: profile.section ?? undefined,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        // defer profile fetch to avoid deadlocks
        setTimeout(() => {
          loadProfile(sess.user).then(p => setUser(p));
        }, 0);
      } else {
        setUser(null);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      if (sess?.user) {
        loadProfile(sess.user).then(p => { setUser(p); setLoading(false); });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp: AuthContextType['signUp'] = async ({ email, password, name, role, year, section }) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { name, role, year: year?.toString() ?? '', section: section ?? '' },
      },
    });
    if (error) return { error: error.message };
    return {};
  };

  const signIn: AuthContextType['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const isAdminOrTeacher = user?.role === 'admin' || user?.role === 'teacher';

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, logout, isAdminOrTeacher }}>
      {children}
    </AuthContext.Provider>
  );
};
