import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { sampleNotices, Notice } from '@/lib/sampleData';

export interface NoticeVisibility {
  type: 'general' | 'faculty' | 'targeted';
  years?: number[];     // e.g. [1,3]
  sections?: string[];  // e.g. ['A','B']
}

export interface ManagedNotice extends Notice {
  visibility: NoticeVisibility;
  expiryDate: string; // YYYY-MM-DD
}

// Convert sample notices to managed notices (all general, expire in 30 days)
const initialNotices: ManagedNotice[] = sampleNotices.map(n => ({
  ...n,
  visibility: { type: 'general' },
  expiryDate: '2026-04-30',
}));

interface NoticeStoreContextType {
  notices: ManagedNotice[];
  addNotice: (notice: ManagedNotice) => void;
  removeNotice: (id: string) => void;
}

const NoticeStoreContext = createContext<NoticeStoreContextType>({
  notices: [],
  addNotice: () => {},
  removeNotice: () => {},
});

export const useNoticeStore = () => useContext(NoticeStoreContext);

export const NoticeStoreProvider = ({ children }: { children: ReactNode }) => {
  const [notices, setNotices] = useState<ManagedNotice[]>(initialNotices);

  // Auto-delete expired notices (check every minute)
  const purgeExpired = useCallback(() => {
    const now = new Date();
    setNotices(prev => prev.filter(n => {
      const expiry = new Date(n.expiryDate + 'T23:59:59');
      return now <= expiry;
    }));
  }, []);

  useEffect(() => {
    purgeExpired();
    const interval = setInterval(purgeExpired, 60_000);
    return () => clearInterval(interval);
  }, [purgeExpired]);

  const addNotice = (notice: ManagedNotice) => {
    setNotices(prev => [notice, ...prev]);
  };

  const removeNotice = (id: string) => {
    setNotices(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NoticeStoreContext.Provider value={{ notices, addNotice, removeNotice }}>
      {children}
    </NoticeStoreContext.Provider>
  );
};

/** Check if a notice is visible to a given user */
export function isNoticeVisibleToUser(
  notice: ManagedNotice,
  userRole?: string,
  userYear?: number,
  userSection?: string,
): boolean {
  const v = notice.visibility;
  // Admin and teachers see everything
  if (userRole === 'admin' || userRole === 'teacher') return true;
  // General notices visible to all
  if (v.type === 'general') return true;
  // Faculty-only notices hidden from students
  if (v.type === 'faculty') return false;
  // Targeted notices: check year & section
  if (v.type === 'targeted') {
    const yearMatch = !v.years || v.years.length === 0 || (userYear !== undefined && v.years.includes(userYear));
    const sectionMatch = !v.sections || v.sections.length === 0 || (userSection !== undefined && v.sections.includes(userSection));
    return yearMatch && sectionMatch;
  }
  return true;
}
