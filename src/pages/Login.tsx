import { useState } from 'react';
import { Eye, EyeOff, LogIn, UserPlus, LogOut, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/authContext';
import { Link, useNavigate } from 'react-router-dom';

const YEARS = [1, 2, 3, 4];
const SECTIONS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
type PublicRole = 'student' | 'teacher';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<PublicRole>('student');
  const [year, setYear] = useState(1);
  const [section, setSection] = useState('A');
  const [registerNumber, setRegisterNumber] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [department, setDepartment] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { user, signIn, signUp, logout } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center px-4 pt-20">
        <div className="glass-strong max-w-md w-full p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">Welcome, {user.name}</h1>
            <p className="text-sm text-muted-foreground mt-2 capitalize">Role: {user.role}</p>
            {user.role === 'student' && (
              <p className="text-sm text-muted-foreground">Year {user.year} · Section {user.section} · {user.department}</p>
            )}
            {user.role === 'teacher' && (
              <p className="text-sm text-muted-foreground">Faculty ID: {user.faculty_id} · {user.department}</p>
            )}
          </div>
          <div className="flex gap-2">
            {user.role === 'student' && (
              <Link to="/profile" className="flex-1 text-center bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:scale-[1.02] transition-all">My Profile</Link>
            )}
            <button onClick={async () => { await logout(); toast({ title: 'Logged Out' }); }} className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-3 rounded-xl font-medium hover:scale-[1.02] transition-all">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) { toast({ title: 'Login failed', description: error, variant: 'destructive' }); return; }
        toast({ title: 'Login Successful' });
        navigate('/');
      } else {
        if (role === 'student' && (!registerNumber || !rollNumber || !department)) {
          toast({ title: 'Missing fields', description: 'Register No, Roll No and Department are required.', variant: 'destructive' });
          return;
        }
        if (role === 'teacher' && (!facultyId || !department)) {
          toast({ title: 'Missing fields', description: 'Faculty ID and Department are required.', variant: 'destructive' });
          return;
        }
        const { error } = await signUp({
          email, password,
          name: name || email.split('@')[0],
          role,
          year: role === 'student' ? year : undefined,
          section: role === 'student' ? section : undefined,
          register_number: role === 'student' ? registerNumber : undefined,
          roll_number: role === 'student' ? rollNumber : undefined,
          faculty_id: role === 'teacher' ? facultyId : undefined,
          department,
        });
        if (error) { toast({ title: 'Signup failed', description: error, variant: 'destructive' }); return; }
        toast({ title: 'Account Created', description: 'You are now signed in.' });
        navigate('/');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 pt-20 pb-10">
      <div className="glass-strong max-w-md w-full p-8 animate-glow">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
            {isLogin ? <LogIn className="w-8 h-8 text-primary-foreground" /> : <UserPlus className="w-8 h-8 text-primary-foreground" />}
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p className="text-sm text-muted-foreground mt-2">{isLogin ? 'Sign in to access your notice board' : 'Join the smart notice board'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-2 focus:ring-primary transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
                <div className="flex gap-2">
                  {(['student', 'teacher'] as const).map(r => (
                    <button key={r} type="button" onClick={() => setRole(r)} className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium capitalize transition-all ${role === r ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {role === 'student' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Register Number</label>
                      <input type="text" value={registerNumber} onChange={e => setRegisterNumber(e.target.value)} placeholder="REG12345" required className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Roll Number</label>
                      <input type="text" value={rollNumber} onChange={e => setRollNumber(e.target.value)} placeholder="23" required className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Department</label>
                    <input type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="Computer Science" required className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Year</label>
                      <select value={year} onChange={e => setYear(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary">
                        {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Section</label>
                      <select value={section} onChange={e => setSection(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary">
                        {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {role === 'teacher' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Faculty ID</label>
                    <input type="text" value={facultyId} onChange={e => setFacultyId(e.target.value)} placeholder="FAC001" required className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Department</label>
                    <input type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="Computer Science" required className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </>
              )}
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-2 focus:ring-primary transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-2 focus:ring-primary transition-all pr-12" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>

        <div className="mt-6 pt-6 border-t border-border/50">
          <Link
            to="/admin-login"
            className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-3 rounded-xl font-medium hover:bg-muted transition-all"
          >
            <Shield className="w-4 h-4" /> Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
