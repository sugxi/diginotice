import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, LayoutDashboard, Home, Info, LogIn, ListTodo, Menu, X, LogOut, BarChart3, Shield, UserCircle } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { useNotifications } from '@/lib/notificationContext';
import UserAvatar from '@/components/UserAvatar';

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout, isAdminOrTeacher, isAdmin } = useAuth();
  const { unread, items, markRead, markAllRead } = useNotifications();
  const [bellOpen, setBellOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/about', label: 'About', icon: Info },
    { to: '/notifications', label: 'Notices', icon: Bell },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tasks', label: 'Tasks', icon: ListTodo },
    ...(user ? [{ to: '/profile', label: 'Profile', icon: UserCircle }] : []),
    ...(isAdminOrTeacher ? [{ to: '/analytics', label: 'Analytics', icon: BarChart3 }] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">NoticeBoard</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${active ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                  <item.icon className="w-4 h-4" />{item.label}
                </Link>
              );
            })}
            {user ? (
              <div className="flex items-center gap-2 ml-2 relative">
                {/* Bell with unread */}
                <button onClick={() => setBellOpen(!bellOpen)} className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                  <Bell className="w-4 h-4" />
                  {unread > 0 && <span className="absolute top-0 right-0 bg-urgent text-urgent-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{unread}</span>}
                </button>
                {bellOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 glass-strong rounded-xl shadow-xl p-3 max-h-96 overflow-y-auto z-50">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-sm font-semibold text-foreground">Notifications</span>
                      {unread > 0 && <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>}
                    </div>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 text-center">No notifications yet.</p>
                    ) : items.slice(0, 10).map(n => (
                      <div key={n.id} onClick={() => markRead(n.id)} className={`p-2 rounded-lg cursor-pointer hover:bg-secondary/50 ${!n.read ? 'bg-primary/5' : ''}`}>
                        <p className="text-xs font-medium text-foreground">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground select-none" aria-label="Account info">
                  <UserAvatar url={user.avatar_url} name={user.name} className="w-7 h-7" />
                  <span className="hidden lg:inline">{user.name}</span>
                  <span className="hidden lg:inline bg-secondary px-1.5 py-0.5 rounded capitalize">{user.role}</span>
                </div>
                <button onClick={logout} aria-label="Sign Out" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            ) : (
              <Link to="/login" className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${location.pathname === '/login' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                <LogIn className="w-4 h-4" /> Login
              </Link>
            )}
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-xl text-foreground hover:bg-secondary transition-colors">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden glass-strong border-t border-border">
          <div className="px-4 py-3 space-y-1">
            {navItems.map(item => {
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                  <item.icon className="w-4 h-4" />{item.label}
                </Link>
              );
            })}
            {user ? (
              <>
                <div className="px-4 py-2 text-xs text-muted-foreground">Signed in as <span className="font-medium text-foreground">{user.name}</span> ({user.role}){unread > 0 && <span className="ml-2 bg-urgent text-urgent-foreground px-1.5 py-0.5 rounded text-[10px]">{unread} new</span>}</div>
                <button onClick={() => { logout(); setMobileOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary">
                <LogIn className="w-4 h-4" /> Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
