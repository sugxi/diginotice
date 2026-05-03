import { useMemo } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import { useNoticeStore } from '@/lib/noticeStore';
import { useStatuses, StudentStatus } from '@/lib/statusContext';
import { getUrgencyBadge, getUrgencyLabel, daysUntil } from '@/lib/urgency';
import { CheckCircle, Clock, PlayCircle, XCircle, Award, Hash, Building2, GraduationCap } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import AvatarPicker from '@/components/AvatarPicker';

const StudentProfile = () => {
  const { user, loading } = useAuth();
  const { notices } = useNoticeStore();
  const { statuses, setStatus } = useStatuses();

  const tasks = useMemo(() => {
    return notices
      .filter(n => n.notice_type === 'task')
      .map(n => ({
        notice: n,
        status: (statuses[n.id] ?? (n.urgency === 'expired' ? 'missed' : 'assigned')) as StudentStatus,
      }));
  }, [notices, statuses]);

  const stats = useMemo(() => {
    const c: Record<StudentStatus, number> = { assigned: 0, pending: 0, 'in-progress': 0, completed: 0, missed: 0 };
    tasks.forEach(t => { c[t.status]++; });
    return c;
  }, [tasks]);

  if (loading) return <div className="min-h-screen pt-32 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  const isStudent = user.role === 'student';

  const total = tasks.length;
  const completionPct = total ? Math.round((stats.completed / total) * 100) : 0;

  const statCards = [
    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'from-low to-normal' },
    { label: 'In Progress', value: stats['in-progress'], icon: PlayCircle, color: 'from-important to-primary' },
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'from-urgent to-important' },
    { label: 'Missed', value: stats.missed, icon: XCircle, color: 'from-destructive to-urgent' },
  ];

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Profile header */}
        <div className="glass-strong p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <UserAvatar url={user.avatar_url} name={user.name} className="w-24 h-24 rounded-2xl" />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl font-bold text-foreground">{user.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                {isStudent ? (
                  <>
                    <Detail icon={Hash} label="Register No" value={user.register_number || '—'} />
                    <Detail icon={Hash} label="Roll No" value={user.roll_number || '—'} />
                    <Detail icon={Building2} label="Department" value={user.department || '—'} />
                    <Detail icon={GraduationCap} label="Year" value={user.year ? `Year ${user.year}` : '—'} />
                    <Detail icon={GraduationCap} label="Section" value={user.section || '—'} />
                    <Detail icon={Award} label="Completion" value={`${completionPct}%`} />
                  </>
                ) : (
                  <>
                    <Detail icon={Hash} label="Faculty ID" value={user.faculty_id || '—'} />
                    <Detail icon={Building2} label="Department" value={user.department || '—'} />
                    <Detail icon={Award} label="Role" value={user.role} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Avatar picker */}
        <div className="mb-6">
          <AvatarPicker />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statCards.map((c, i) => (
            <div key={i} className="glass-card text-center">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mx-auto mb-2`}>
                <c.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="glass-card mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-foreground font-medium">Overall Progress</span>
            <span className="text-muted-foreground">{stats.completed} / {total} tasks</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-low transition-all" style={{ width: `${completionPct}%` }} />
          </div>
        </div>

        {/* Task management module */}
        <div className="glass-strong p-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">My Tasks</h2>
          {tasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tasks assigned yet. <Link to="/notifications" className="text-primary hover:underline">View notices</Link></p>
          ) : (
            <div className="space-y-3">
              {tasks.map(({ notice, status }) => (
                <div key={notice.id} className="glass rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-foreground ${status === 'completed' ? 'line-through opacity-60' : ''} ${status === 'missed' ? 'line-through opacity-50 text-destructive' : ''}`}>{notice.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notice.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span>Due: {new Date(notice.deadline).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded-md ${getUrgencyBadge(notice.urgency)}`}>{getUrgencyLabel(notice.urgency)}</span>
                        <span>{daysUntil(notice.deadline) < 0 ? 'Expired' : `${daysUntil(notice.deadline)}d left`}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {(['pending', 'in-progress', 'completed', 'missed'] as const).map(s => (
                      <button key={s} onClick={() => setStatus(notice.id, s)} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-all ${
                        status === s
                          ? s === 'completed' ? 'bg-low/30 text-low'
                            : s === 'missed' ? 'bg-destructive/30 text-destructive'
                            : s === 'in-progress' ? 'bg-important/30 text-important'
                            : 'bg-urgent/30 text-urgent'
                          : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                      }`}>{s}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Detail = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground font-medium truncate">{value}</p>
    </div>
  </div>
);

export default StudentProfile;
