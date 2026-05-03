import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useNoticeStore } from '@/lib/noticeStore';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Users, CheckCircle, Clock, AlertCircle, XCircle, ChevronRight, ArrowLeft } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { Urgency, getUrgencyBadge, getUrgencyLabel } from '@/lib/urgency';

interface ProgressRow {
  noticeId: string;
  title: string;
  urgency: Urgency;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  missed: number;
}

type TabKey = 'all' | 'completed' | 'in-progress' | 'pending' | 'missed';

const Analytics = () => {
  const { isAdminOrTeacher, loading } = useAuth();
  const { notices } = useNoticeStore();
  const [statusRows, setStatusRows] = useState<{ notice_id: string; status: string; student_id: string }[]>([]);
  const [studentTotals, setStudentTotals] = useState<{ year: number | null; section: string | null }[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  useEffect(() => {
    if (!isAdminOrTeacher) return;
    (async () => {
      const [{ data: statuses }, { data: students }] = await Promise.all([
        supabase.from('notice_statuses').select('notice_id, status, student_id'),
        supabase.from('profiles').select('year, section'),
      ]);
      setStatusRows((statuses ?? []) as any);
      setStudentTotals(students ?? []);
    })();
  }, [isAdminOrTeacher]);

  const taskNotices = useMemo(() => notices.filter(n => n.notice_type === 'task'), [notices]);

  const rows: ProgressRow[] = useMemo(() => {
    return taskNotices.map(n => {
      let total: number;
      if (n.visibility === 'general') total = studentTotals.length;
      else if (n.visibility === 'faculty') total = 0;
      else {
        total = studentTotals.filter(s =>
          (n.target_years.length === 0 || (s.year && n.target_years.includes(s.year))) &&
          (n.target_sections.length === 0 || (s.section && n.target_sections.includes(s.section)))
        ).length;
      }
      const forNotice = statusRows.filter(s => s.notice_id === n.id);
      const completed = forNotice.filter(s => s.status === 'completed').length;
      const inProgress = forNotice.filter(s => s.status === 'in-progress').length;
      const explicitPending = forNotice.filter(s => s.status === 'pending').length;
      const explicitMissed = forNotice.filter(s => s.status === 'missed').length;
      const accounted = completed + inProgress + explicitPending + explicitMissed;
      const unaccounted = Math.max(0, total - accounted);
      const missed = explicitMissed + (n.urgency === 'expired' ? unaccounted : 0);
      const pending = explicitPending + (n.urgency === 'expired' ? 0 : unaccounted);
      return { noticeId: n.id, title: n.title, urgency: n.urgency, total, pending, inProgress, completed, missed };
    });
  }, [taskNotices, statusRows, studentTotals]);

  if (loading) return <div className="min-h-screen pt-32 text-center text-muted-foreground">Loading…</div>;
  if (!isAdminOrTeacher) return <Navigate to="/" replace />;

  const overall = rows.reduce((acc, r) => ({
    total: acc.total + r.total,
    pending: acc.pending + r.pending,
    inProgress: acc.inProgress + r.inProgress,
    completed: acc.completed + r.completed,
    missed: acc.missed + r.missed,
  }), { total: 0, pending: 0, inProgress: 0, completed: 0, missed: 0 });

  const tabs: { key: TabKey; icon: any; label: string; value: number; color: string }[] = [
    { key: 'all', icon: Users, label: 'Total Assignments', value: overall.total, color: 'from-primary to-accent' },
    { key: 'completed', icon: CheckCircle, label: 'Completed', value: overall.completed, color: 'from-low to-normal' },
    { key: 'in-progress', icon: Clock, label: 'In Progress', value: overall.inProgress, color: 'from-important to-primary' },
    { key: 'pending', icon: AlertCircle, label: 'Pending', value: overall.pending, color: 'from-urgent to-important' },
    { key: 'missed', icon: XCircle, label: 'Missed', value: overall.missed, color: 'from-destructive to-urgent' },
  ];

  // Filter rows by active tab — show only notices that have at least one student in that bucket
  const filteredRows = activeTab === 'all'
    ? rows
    : rows.filter(r => {
        if (activeTab === 'completed') return r.completed > 0;
        if (activeTab === 'in-progress') return r.inProgress > 0;
        if (activeTab === 'pending') return r.pending > 0;
        if (activeTab === 'missed') return r.missed > 0;
        return true;
      });

  const activeLabel = tabs.find(t => t.key === activeTab)!.label;

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="font-display text-4xl font-bold text-foreground">Analytics</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {tabs.map(c => {
            const active = activeTab === c.key;
            return (
              <button key={c.key} onClick={() => setActiveTab(c.key)}
                className={`glass-card text-center transition-all hover:scale-105 ${active ? 'ring-2 ring-primary scale-105' : ''}`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mx-auto mb-2`}>
                  <c.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
              </button>
            );
          })}
        </div>

        <div className="glass-strong p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {activeTab === 'all' ? 'Per-Notice Breakdown' : `${activeLabel} — Filtered View`}
            </h2>
            {activeTab !== 'all' && (
              <button onClick={() => setActiveTab('all')} className="text-xs text-primary flex items-center gap-1 hover:underline">
                <ArrowLeft className="w-3 h-3" /> Back to all
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-3 pr-3">Notice</th>
                  <th className="pb-3 pr-3">Urgency</th>
                  <th className="pb-3 pr-3 text-center">Assigned</th>
                  <th className="pb-3 pr-3 text-center">Completed</th>
                  <th className="pb-3 pr-3 text-center">In Progress</th>
                  <th className="pb-3 pr-3 text-center">Pending</th>
                  <th className="pb-3 pr-3 text-center">Missed</th>
                  <th className="pb-3 min-w-[160px]">Progress</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(r => {
                  const pct = r.total ? Math.round((r.completed / r.total) * 100) : 0;
                  return (
                    <tr key={r.noticeId} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 pr-3 text-foreground font-medium max-w-xs">
                        <Link to={`/analytics/notice/${r.noticeId}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                          <span className="truncate">{r.title}</span>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                        </Link>
                      </td>
                      <td className="py-3 pr-3"><span className={`text-[10px] px-2 py-0.5 rounded ${getUrgencyBadge(r.urgency)}`}>{getUrgencyLabel(r.urgency)}</span></td>
                      <td className="py-3 pr-3 text-center">{r.total}</td>
                      <td className={`py-3 pr-3 text-center ${activeTab === 'completed' ? 'text-low font-bold' : 'text-low'}`}>{r.completed}</td>
                      <td className={`py-3 pr-3 text-center ${activeTab === 'in-progress' ? 'text-important font-bold' : 'text-important'}`}>{r.inProgress}</td>
                      <td className={`py-3 pr-3 text-center ${activeTab === 'pending' ? 'text-urgent font-bold' : 'text-urgent'}`}>{r.pending}</td>
                      <td className={`py-3 pr-3 text-center ${activeTab === 'missed' ? 'text-destructive font-bold' : 'text-destructive'}`}>{r.missed}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-low rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredRows.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">
                    {activeTab === 'all' ? 'No task-based notices yet.' : `No notices with ${activeLabel.toLowerCase()} students.`}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
