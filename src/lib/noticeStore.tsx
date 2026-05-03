import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authContext';
import { computeUrgency, Urgency } from '@/lib/urgency';

export interface NoticeAttachment {
  url: string;
  name: string;
  type: string; // mime type
  size?: number;
}

export interface ManagedNotice {
  id: string;
  title: string;
  content: string;
  category: string;
  deadline: string;          // ISO timestamp
  base_urgency: Urgency;
  visibility: 'general' | 'faculty' | 'targeted';
  notice_type: 'task' | 'info';
  target_years: number[];
  target_sections: string[];
  attachments: NoticeAttachment[];
  author_id: string | null;
  author_name: string;
  created_at: string;
  // computed
  urgency: Urgency;
}

interface NoticeStoreContextType {
  notices: ManagedNotice[];
  loading: boolean;
  refresh: () => Promise<void>;
  addNotice: (data: Omit<ManagedNotice, 'id' | 'created_at' | 'urgency' | 'author_id' | 'author_name'>) => Promise<{ error?: string }>;
  updateNotice: (id: string, data: Partial<Omit<ManagedNotice, 'id' | 'urgency'>>) => Promise<{ error?: string }>;
  removeNotice: (id: string) => Promise<{ error?: string }>;
}

const NoticeStoreContext = createContext<NoticeStoreContextType>({
  notices: [], loading: true,
  refresh: async () => {},
  addNotice: async () => ({}), updateNotice: async () => ({}), removeNotice: async () => ({}),
});

export const useNoticeStore = () => useContext(NoticeStoreContext);

function enrich(rows: any[]): ManagedNotice[] {
  return (rows || []).map(r => ({
    ...r,
    target_years: r.target_years ?? [],
    target_sections: r.target_sections ?? [],
    notice_type: r.notice_type ?? 'info',
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
    urgency: computeUrgency(r.deadline),
  }));
}

export const NoticeStoreProvider = ({ children }: { children: ReactNode }) => {
  const { user, session } = useAuth();
  const [notices, setNotices] = useState<ManagedNotice[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('deadline', { ascending: true });
    if (!error) setNotices(enrich(data ?? []));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, session?.user?.id]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('notices-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  // Re-compute urgency every minute (so it updates dynamically)
  useEffect(() => {
    const i = setInterval(() => {
      setNotices(prev => prev.map(n => ({ ...n, urgency: computeUrgency(n.deadline) })));
    }, 60_000);
    return () => clearInterval(i);
  }, []);

  // Trigger expired-notice cleanup on mount + every 5 minutes
  useEffect(() => {
    const purge = async () => {
      try { await supabase.functions.invoke('cleanup-and-notify'); refresh(); } catch {}
    };
    purge();
    const i = setInterval(purge, 5 * 60_000);
    return () => clearInterval(i);
  }, [refresh]);

  const addNotice: NoticeStoreContextType['addNotice'] = async (data) => {
    if (!user) return { error: 'Not signed in' };
    const { error } = await supabase.from('notices').insert({
      ...data,
      author_id: user.id,
      author_name: user.name,
    } as any);
    if (error) return { error: error.message };
    refresh();
    return {};
  };

  const updateNotice: NoticeStoreContextType['updateNotice'] = async (id, data) => {
    const { error } = await supabase.from('notices').update({ ...data, updated_at: new Date().toISOString() } as any).eq('id', id);
    if (error) return { error: error.message };
    refresh();
    return {};
  };

  const removeNotice: NoticeStoreContextType['removeNotice'] = async (id) => {
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) return { error: error.message };
    refresh();
    return {};
  };

  return (
    <NoticeStoreContext.Provider value={{ notices, loading, refresh, addNotice, updateNotice, removeNotice }}>
      {children}
    </NoticeStoreContext.Provider>
  );
};
