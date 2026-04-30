import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useNoticeStore } from '@/lib/noticeStore';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Users, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';
import { Navigate } from 'react-router-dom';
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

const Analytics = () => {
  const { user, isAdminOrTeacher, loading } = useAuth();
  const { notices } = useNoticeStore();
  const [statusRows, setStatusRows] = useState<{ notice_id: string; status: string; student_id: string }[]>([]);
  const [studentTotals, setStudentTotals] = useState<{ year: number | null; section: string | null }[]>([]);

  useEffect(() => {
    if (!isAdminOrTeacher) return;
    (async () => {
      const [{ data: statuses }, { data: students }] = await Promise.all([
        supabase.from('notice_statuses').select('notice_id, status, student_id'),
        supabase.from('profiles').select('year, section'),
      ]);
      setStatusRows(statuses ?? []);
      setStudentTotals(students ?? []);
    })();
  }, [isAdminOrTeacher]);

  const rows: ProgressRow[] = useMemo(() => {
    return notices.map(n => {
      // total assigned: count students matching visibility
      let total: number;
      if (n.visibility === 'general') {
        total = studentTotals.length;
      } else if (n.visibility === 'faculty') {
        total = 0;
      } else {
        total = studentTotals.filter(s =>
          (n.target_years.length === 0 || (s.year && n.target_years.includes(s.year))) &&
          (n.target_sections.length === 0 || (s.section && n.target_sections.includes(s.section)))
        ).length;
      }
      const forNotice = statusRows.filter(s => s.notice_id === n.id);
      const completed = forNotice.filter(s => s.status === 'completed').length;
      const inProgress = forNotice.filter(s => s.status === 'in-progress').length;
      const missed = forNotice.filter(s => s.status === 'missed').length + (n.urgency === 'expired' ? Math.max(0, total - forNotice.length) : 0);
      const explicit = forNotice.filter(s => s.status === 'pending').length;
      const pending = Math.max(0, total - completed - inProgress - missed - explicit) + explicit;
      return { noticeId: n.id, title: n.title, urgency: n.urgency, total, pending, inProgress, completed, missed };
    });
  }, [notices, statusRows, studentTotals]);

  if (loading) return <div className="min-h-screen pt-32 text-center text-muted-foreground">Loading…</div>;
  if (!isAdminOrTeacher) return <Navigate to="/" replace />;

  const overall = rows.reduce((acc, r) => ({
    total: acc.total + r.total,
    pending: acc.pending + r.pending,
    inProgress: acc.inProgress + r.inProgress,
    completed: acc.completed + r.completed,
    missed: acc.missed + r.missed,
  }), { total: 0, pending: 0, inProgress: 0, completed: 0, missed: 0 });

  const overallCards = [
    { icon: Users, label: 'Total Assignments', value: overall.total, color: 'from-primary to-accent' },
    { icon: CheckCircle, label: 'Completed', value: overall.completed, color: 'from-low to-normal' },
    { icon: Clock, label: 'In Progress', value: overall.inProgress, color: 'from-important to-primary' },
    { icon: AlertCircle, label: 'Pending', value: overall.pending, color: 'from-urgent to-important' },
    { icon: XCircle, label: 'Missed', value: overall.missed, color: 'from-destructive to-urgent' },
  ];

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="font-display text-4xl font-bold text-foreground">Analytics</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {overallCards.map((c, i) => (
            <div key={i} className="glass-card text-center">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mx-auto mb-2`}>
                <c.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="glass-strong p-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">Per-Notice Breakdown</h2>
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
                {rows.map(r => {
                  const pct = r.total ? Math.round((r.completed / r.total) * 100) : 0;
                  return (
                    <tr key={r.noticeId} className="border-b border-border/50">
                      <td className="py-3 pr-3 text-foreground font-medium max-w-xs truncate">{r.title}</td>
                      <td className="py-3 pr-3"><span className={`text-[10px] px-2 py-0.5 rounded ${getUrgencyBadge(r.urgency)}`}>{getUrgencyLabel(r.urgency)}</span></td>
                      <td className="py-3 pr-3 text-center">{r.total}</td>
                      <td className="py-3 pr-3 text-center text-low">{r.completed}</td>
                      <td className="py-3 pr-3 text-center text-important">{r.inProgress}</td>
                      <td className="py-3 pr-3 text-center text-urgent">{r.pending}</td>
                      <td className="py-3 pr-3 text-center text-destructive">{r.missed}</td>
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
                {rows.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No notices yet.</td></tr>
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
