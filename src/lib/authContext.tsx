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
  register_number?: string;
  roll_number?: string;
  faculty_id?: string;
  department?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  role: 'student' | 'teacher';
  year?: number;
  section?: string;
  register_number?: string;
  roll_number?: string;
  faculty_id?: string;
  department?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdminOrTeacher: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true,
  signUp: async () => ({}), signIn: async () => ({}), logout: async () => {},
  refreshProfile: async () => {},
  isAdminOrTeacher: false, isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

async function loadProfile(authUser: User): Promise<UserProfile | null> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', authUser.id),
  ]);
  if (!profile) return null;
  const roleSet = new Set((roles ?? []).map((r: any) => r.role as UserRole));
  const role: UserRole = roleSet.has('admin') ? 'admin' : roleSet.has('teacher') ? 'teacher' : 'student';
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role,
    year: profile.year ?? undefined,
    section: profile.section ?? undefined,
    register_number: (profile as any).register_number ?? undefined,
    roll_number: (profile as any).roll_number ?? undefined,
    faculty_id: (profile as any).faculty_id ?? undefined,
    department: (profile as any).department ?? undefined,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        setTimeout(() => { loadProfile(sess.user).then(p => setUser(p)); }, 0);
      } else {
        setUser(null);
      }
    });

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

  const refreshProfile = async () => {
    if (!session?.user) return;
    const p = await loadProfile(session.user);
    setUser(p);
  };

  const signUp: AuthContextType['signUp'] = async (d) => {
    const { error } = await supabase.auth.signUp({
      email: d.email, password: d.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name: d.name,
          role: d.role,
          year: d.year?.toString() ?? '',
          section: d.section ?? '',
          register_number: d.register_number ?? '',
          roll_number: d.roll_number ?? '',
          faculty_id: d.faculty_id ?? '',
          department: d.department ?? '',
        },
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

  const logout = async () => { await supabase.auth.signOut(); };

  const isAdmin = user?.role === 'admin';
  const isAdminOrTeacher = isAdmin || user?.role === 'teacher';

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, logout, refreshProfile, isAdminOrTeacher, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
