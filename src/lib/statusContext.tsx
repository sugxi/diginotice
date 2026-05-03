import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authContext';

export type StudentStatus = 'assigned' | 'pending' | 'in-progress' | 'completed' | 'missed';

interface StatusContextType {
  statuses: Record<string, StudentStatus>; // notice_id -> status
  setStatus: (noticeId: string, status: StudentStatus) => Promise<void>;
  refresh: () => Promise<void>;
}

const StatusContext = createContext<StatusContextType>({
  statuses: {},
  setStatus: async () => {},
  refresh: async () => {},
});

export const useStatuses = () => useContext(StatusContext);

export const StatusProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<Record<string, StudentStatus>>({});

  const refresh = useCallback(async () => {
    if (!user) { setStatuses({}); return; }
    const { data } = await supabase
      .from('notice_statuses')
      .select('notice_id, status')
      .eq('student_id', user.id);
    const map: Record<string, StudentStatus> = {};
    (data ?? []).forEach((r: any) => { map[r.notice_id] = r.status; });
    setStatuses(map);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('status-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notice_statuses', filter: `student_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  const setStatus = async (noticeId: string, status: StudentStatus) => {
    if (!user) return;
    setStatuses(prev => ({ ...prev, [noticeId]: status })); // optimistic
    await supabase.from('notice_statuses').upsert(
      { notice_id: noticeId, student_id: user.id, status, updated_at: new Date().toISOString() },
      { onConflict: 'notice_id,student_id' }
    );
  };

  return (
    <StatusContext.Provider value={{ statuses, setStatus, refresh }}>
      {children}
    </StatusContext.Provider>
  );
};
