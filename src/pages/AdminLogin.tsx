import { useState } from 'react';
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/authContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (user && isAdmin) return <Navigate to="/admin" replace />;

  const signInAdmin = async (adminEmail: string, adminPassword: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    if (error) { toast({ title: 'Login failed', description: error.message, variant: 'destructive' }); return false; }
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', data.user!.id);
    const adminOk = (roles ?? []).some((r: any) => r.role === 'admin');
    if (!adminOk) {
      await supabase.auth.signOut();
      toast({ title: 'Access denied', description: 'This account is not an administrator.', variant: 'destructive' });
      return false;
    }
    toast({ title: 'Welcome, Administrator' });
    navigate('/admin');
    return true;
  };

  const handleDemoAdmin = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('demo-admin-login', { method: 'POST' });
      if (error) { toast({ title: 'Demo login failed', description: error.message, variant: 'destructive' }); return; }
      await signInAdmin(data.email, data.password);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signInAdmin(email, password);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 pt-20 pb-10">
      <div className="glass-strong max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-destructive to-urgent flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Admin Login</h1>
          <p className="text-sm text-muted-foreground mt-2">Restricted area · Admins only</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Admin Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary pr-12" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-60">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Sign In as Admin
          </button>
        </form>

      </div>
    </div>
  );
};

export default AdminLogin;
