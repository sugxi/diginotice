import { useMemo, useState } from 'react';
import { CheckCircle, Clock, PlayCircle, XCircle, Filter, Inbox } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { useNoticeStore } from '@/lib/noticeStore';
import { useStatuses, StudentStatus } from '@/lib/statusContext';
import { Urgency, getUrgencyBadge, getUrgencyColorClass, getUrgencyLabel, daysUntil } from '@/lib/urgency';
import { Link } from 'react-router-dom';

const Tasks = () => {
  const { user } = useAuth();
  const { notices } = useNoticeStore();
  const { statuses, setStatus } = useStatuses();
  const [filter, setFilter] = useState<'all' | StudentStatus>('all');

  const myTasks = useMemo(() => {
    // only task-type notices appear as tasks
    const items = notices
      .filter(n => n.notice_type === 'task')
      .map(n => ({
        notice: n,
        status: statuses[n.id] ?? (n.urgency === 'expired' ? 'missed' as StudentStatus : 'assigned' as StudentStatus),
      }));
    const order: Record<Urgency, number> = { urgent: 0, important: 1, normal: 2, low: 3, expired: 4 };
    return items.sort((a, b) => order[a.notice.urgency] - order[b.notice.urgency]);
  }, [notices, statuses]);

  const filtered = filter === 'all' ? myTasks : myTasks.filter(t => t.status === filter);

  if (!user) {
    return (
      <div className="min-h-screen gradient-bg pt-32 px-4 text-center">
        <div className="glass-strong max-w-md mx-auto p-8">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Sign in required</h1>
          <p className="text-muted-foreground mb-4">Please log in to track your tasks.</p>
          <Link to="/login" className="gradient-primary text-primary-foreground px-6 py-2 rounded-xl font-medium inline-block">Login</Link>
        </div>
      </div>
    );
  }

  const statusIcons: Record<StudentStatus, JSX.Element> = {
    assigned: <Inbox className="w-4 h-4 text-primary" />,
    pending: <Clock className="w-4 h-4 text-urgent" />,
    'in-progress': <PlayCircle className="w-4 h-4 text-important" />,
    completed: <CheckCircle className="w-4 h-4 text-low" />,
    missed: <XCircle className="w-4 h-4 text-destructive" />,
  };

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl font-bold text-foreground">My Tasks</h1>
            <p className="text-sm text-muted-foreground mt-1">Tasks are auto-generated from notices assigned to you.</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {(['all', 'assigned', 'pending', 'in-progress', 'completed', 'missed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${filter === f ? 'bg-primary text-primary-foreground shadow' : 'glass text-muted-foreground hover:text-foreground'}`}>{f}</button>
          ))}
        </div>

        <div className="space-y-4">
          {filtered.map(({ notice, status }) => (
            <div key={notice.id} className={`glass-card flex items-start gap-4 ${getUrgencyColorClass(notice.urgency)}`}>
              <div className="shrink-0 mt-1">{statusIcons[status]}</div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-foreground ${status === 'completed' ? 'line-through opacity-60' : ''} ${status === 'missed' ? 'line-through opacity-50 text-destructive' : ''}`}>{notice.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{notice.content.slice(0, 140)}{notice.content.length > 140 ? '…' : ''}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                  <span>Due: {new Date(notice.deadline).toLocaleString()}</span>
                  <span className={`px-2 py-0.5 rounded-md ${getUrgencyBadge(notice.urgency)}`}>{getUrgencyLabel(notice.urgency)}</span>
                  <span>{daysUntil(notice.deadline) < 0 ? 'Expired' : `${daysUntil(notice.deadline)}d left`}</span>
                </div>
                {user.role === 'student' && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {(['assigned', 'pending', 'in-progress', 'completed', 'missed'] as const).map(s => (
                      <button key={s} onClick={() => setStatus(notice.id, s)} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-all ${
                        status === s
                          ? s === 'completed' ? 'bg-low/30 text-low'
                            : s === 'missed' ? 'bg-destructive/30 text-destructive'
                            : s === 'in-progress' ? 'bg-important/30 text-important'
                            : s === 'pending' ? 'bg-urgent/30 text-urgent'
                            : 'bg-primary/30 text-primary'
                          : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                      }`}>{s}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="glass-card text-center py-12">
            <p className="text-muted-foreground">No tasks found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
