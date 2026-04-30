import { useMemo } from 'react';
import { Bell, ListTodo, AlertTriangle, CheckCircle, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { useNoticeStore } from '@/lib/noticeStore';
import { useStatuses } from '@/lib/statusContext';
import { Urgency, getUrgencyLabel } from '@/lib/urgency';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, isAdminOrTeacher } = useAuth();
  const { notices } = useNoticeStore();
  const { statuses } = useStatuses();

  const stats = useMemo(() => {
    const counts: Record<Urgency, number> = { urgent: 0, important: 0, normal: 0, low: 0, expired: 0 };
    notices.forEach(n => { counts[n.urgency]++; });
    const taskStatusCounts = { pending: 0, 'in-progress': 0, completed: 0, missed: 0 };
    notices.forEach(n => {
      const s = statuses[n.id] ?? (n.urgency === 'expired' ? 'missed' : 'pending');
      taskStatusCounts[s as keyof typeof taskStatusCounts]++;
    });
    return { counts, taskStatusCounts, totalNotices: notices.length };
  }, [notices, statuses]);

  const cards = [
    { icon: Bell, label: 'Total Notices', value: stats.totalNotices, color: 'from-primary to-accent' },
    { icon: AlertTriangle, label: 'Urgent', value: stats.counts.urgent, color: 'from-urgent to-important' },
    { icon: ListTodo, label: 'In Progress', value: stats.taskStatusCounts['in-progress'], color: 'from-normal to-primary' },
    { icon: CheckCircle, label: 'Completed', value: stats.taskStatusCounts.completed, color: 'from-low to-normal' },
  ];

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-4xl font-bold text-foreground">Dashboard</h1>
            {user && <p className="text-sm text-muted-foreground mt-1">Welcome back, {user.name} ({user.role})</p>}
          </div>
          {isAdminOrTeacher && (
            <Link to="/analytics" className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:scale-105 transition-all">
              <BarChart3 className="w-4 h-4" /> Analytics
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((s, i) => (
            <div key={i} className="glass-card text-center">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mx-auto mb-3`}>
                <s.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="glass-strong p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Urgency Breakdown
            </h2>
            <div className="space-y-4">
              {(['urgent', 'important', 'normal', 'low'] as Urgency[]).map(p => {
                const count = stats.counts[p];
                const pct = stats.totalNotices ? (count / stats.totalNotices) * 100 : 0;
                return (
                  <div key={p}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground font-medium">{getUrgencyLabel(p)}</span>
                      <span className="text-muted-foreground">{count} ({Math.round(pct)}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${p === 'urgent' ? 'bg-urgent' : p === 'important' ? 'bg-important' : p === 'normal' ? 'bg-normal' : 'bg-low'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-strong p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> My Task Progress
            </h2>
            <div className="space-y-3">
              {(['pending', 'in-progress', 'completed', 'missed'] as const).map(s => {
                const count = stats.taskStatusCounts[s];
                const pct = stats.totalNotices ? (count / stats.totalNotices) * 100 : 0;
                return (
                  <div key={s}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground font-medium capitalize">{s}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s === 'completed' ? 'bg-low' : s === 'in-progress' ? 'bg-important' : s === 'missed' ? 'bg-destructive' : 'bg-urgent'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
