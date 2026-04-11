import { useMemo } from 'react';
import { sampleTasks } from '@/lib/sampleData';
import { analyzeNotice, Priority, getPriorityLabel } from '@/lib/nlp';
import { Bell, ListTodo, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { useNoticeStore, isNoticeVisibleToUser } from '@/lib/noticeStore';

const Dashboard = () => {
  const { user } = useAuth();
  const { notices } = useNoticeStore();

  const visibleNotices = useMemo(() => {
    return notices.filter(n => isNoticeVisibleToUser(n, user?.role, user?.year, user?.section));
  }, [notices, user]);

  const stats = useMemo(() => {
    const priorityCounts: Record<Priority, number> = { urgent: 0, important: 0, normal: 0, low: 0 };
    visibleNotices.forEach(n => {
      const { priority } = analyzeNotice(n.title + ' ' + n.content);
      priorityCounts[priority]++;
    });
    const taskStats = {
      total: sampleTasks.length,
      pending: sampleTasks.filter(t => t.status === 'pending').length,
      inProgress: sampleTasks.filter(t => t.status === 'in-progress').length,
      completed: sampleTasks.filter(t => t.status === 'completed').length,
    };
    return { priorityCounts, taskStats, totalNotices: visibleNotices.length };
  }, [visibleNotices]);

  const statCards = [
    { icon: Bell, label: 'Total Notices', value: stats.totalNotices, color: 'from-primary to-accent' },
    { icon: AlertTriangle, label: 'Urgent', value: stats.priorityCounts.urgent, color: 'from-urgent to-important' },
    { icon: ListTodo, label: 'Total Tasks', value: stats.taskStats.total, color: 'from-normal to-primary' },
    { icon: CheckCircle, label: 'Completed', value: stats.taskStats.completed, color: 'from-low to-normal' },
  ];

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display text-4xl font-bold text-foreground mb-8">Dashboard</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
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
          {/* Priority breakdown */}
          <div className="glass-strong p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Priority Breakdown
            </h2>
            <div className="space-y-4">
              {(['urgent', 'important', 'normal', 'low'] as Priority[]).map(p => {
                const count = stats.priorityCounts[p];
                const pct = stats.totalNotices ? (count / stats.totalNotices) * 100 : 0;
                return (
                  <div key={p}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground font-medium">{getPriorityLabel(p)}</span>
                      <span className="text-muted-foreground">{count} ({Math.round(pct)}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          p === 'urgent' ? 'bg-urgent' : p === 'important' ? 'bg-important' : p === 'normal' ? 'bg-normal' : 'bg-low'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task overview */}
          <div className="glass-strong p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Task Overview
            </h2>
            <div className="space-y-3">
              {sampleTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    task.status === 'completed' ? 'bg-low' : task.status === 'in-progress' ? 'bg-important' : 'bg-urgent'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">Due: {task.dueDate}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg capitalize ${
                    task.status === 'completed' ? 'bg-low/20 text-low' :
                    task.status === 'in-progress' ? 'bg-important/20 text-important' :
                    'bg-urgent/20 text-urgent'
                  }`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
