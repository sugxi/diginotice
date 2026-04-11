import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  year?: number;    // 1-4, only for students
  section?: string; // A-Z, only for students
}

interface AuthContextType {
  user: UserProfile | null;
  login: (profile: UserProfile) => void;
  logout: () => void;
  isAdminOrTeacher: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isAdminOrTeacher: false,
});

export const useAuth = () => useContext(AuthContext);

// Preset demo accounts for quick login
export const demoAccounts: UserProfile[] = [
  { id: 'admin-1', name: 'Admin User', email: 'admin@noticeboard.com', role: 'admin' },
  { id: 'teacher-1', name: 'Prof. Smith', email: 'smith@noticeboard.com', role: 'teacher' },
  { id: 'student-1', name: 'Alice (3rd Year, B)', email: 'alice@student.com', role: 'student', year: 3, section: 'B' },
  { id: 'student-2', name: 'Bob (1st Year, A)', email: 'bob@student.com', role: 'student', year: 1, section: 'A' },
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  const login = (profile: UserProfile) => setUser(profile);
  const logout = () => setUser(null);
  const isAdminOrTeacher = user?.role === 'admin' || user?.role === 'teacher';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdminOrTeacher }}>
      {children}
    </AuthContext.Provider>
  );
};
