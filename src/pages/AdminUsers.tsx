import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/integrations/supabase/client';
import { Shield, UserCog, Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Role = 'admin' | 'teacher' | 'student';
interface Row {
  id: string;
  name: string;
  email: string;
  year?: number | null;
  section?: string | null;
  department?: string | null;
  register_number?: string | null;
  faculty_id?: string | null;
  roles: Role[];
}

const AdminUsers = () => {
  const { user, isAdmin, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [query, setQuery] = useState('');
  const { toast } = useToast();

  const refresh = async () => {
    setBusy(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    const byUser = new Map<string, Role[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    });
    const out: Row[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      year: p.year,
      section: p.section,
      department: p.department,
      register_number: p.register_number,
      faculty_id: p.faculty_id,
      roles: byUser.get(p.id) ?? [],
    }));
    setRows(out);
    setBusy(false);
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  const grant = async (userId: string, role: Role) => {
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Granted ${role}` });
    refresh();
  };

  const revoke = async (userId: string, role: Role) => {
    if (role === 'admin' && userId === user?.id) {
      toast({ title: 'You cannot remove your own admin role.', variant: 'destructive' }); return;
    }
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Removed ${role}` });
    refresh();
  };

  if (loading) return <div className="min-h-screen pt-32 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/admin-login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const filtered = rows.filter(r => {
    const q = query.toLowerCase();
    return !q || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.department?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-7 h-7 text-primary" />
          <h1 className="font-display text-3xl font-bold text-foreground">Admin · User Management</h1>
        </div>

        <div className="glass-card flex items-center gap-3 mb-6">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, email or department" className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm" />
        </div>

        <div className="glass-strong p-4 overflow-x-auto">
          {busy ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading users…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-3 pr-3">Name</th>
                  <th className="pb-3 pr-3">Email</th>
                  <th className="pb-3 pr-3">Department</th>
                  <th className="pb-3 pr-3">Identity</th>
                  <th className="pb-3 pr-3">Roles</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const isAdminRow = r.roles.includes('admin');
                  const isTeacher = r.roles.includes('teacher');
                  return (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-3 pr-3 text-foreground font-medium">{r.name}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{r.email}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{r.department || '—'}</td>
                      <td className="py-3 pr-3 text-muted-foreground text-xs">
                        {r.register_number ? <>Reg: {r.register_number}<br />Y{r.year} · {r.section}</> : r.faculty_id ? <>Faculty: {r.faculty_id}</> : '—'}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex gap-1 flex-wrap">
                          {r.roles.map(role => (
                            <span key={role} className={`text-[10px] px-2 py-0.5 rounded ${role === 'admin' ? 'bg-destructive/20 text-destructive' : role === 'teacher' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>{role}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {!isAdminRow && (
                            <button onClick={() => grant(r.id, 'admin')} className="text-[11px] px-2 py-1 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><UserCog className="w-3 h-3 inline mr-1" />Make Admin</button>
                          )}
                          {isAdminRow && (
                            <button onClick={() => revoke(r.id, 'admin')} className="text-[11px] px-2 py-1 rounded-lg bg-secondary text-muted-foreground hover:bg-muted">Revoke Admin</button>
                          )}
                          {!isTeacher && (
                            <button onClick={() => grant(r.id, 'teacher')} className="text-[11px] px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20">Make Teacher</button>
                          )}
                          {isTeacher && (
                            <button onClick={() => revoke(r.id, 'teacher')} className="text-[11px] px-2 py-1 rounded-lg bg-secondary text-muted-foreground hover:bg-muted">Revoke Teacher</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No users found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
