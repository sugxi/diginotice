import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/authContext';
import { useNoticeStore } from '@/lib/noticeStore';
import { useStatuses, StudentStatus } from '@/lib/statusContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Calendar, Users, Target, GraduationCap, Building2, FileText, ImageIcon, Download, Inbox, Clock, PlayCircle, CheckCircle, XCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getUrgencyBadge, getUrgencyLabel } from '@/lib/urgency';

const COLORS: Record<string, string> = {
  Assigned: 'hsl(var(--primary))',
  Pending: 'hsl(var(--urgent))',
  'In Progress': 'hsl(var(--important))',
  Completed: 'hsl(var(--low))',
  Missed: 'hsl(var(--destructive))',
};

const STATUS_OPTIONS: { value: StudentStatus; label: string; icon: any; color: string }[] = [
  { value: 'assigned', label: 'Assigned', icon: Inbox, color: 'primary' },
  { value: 'pending', label: 'Pending', icon: Clock, color: 'urgent' },
  { value: 'in-progress', label: 'In Progress', icon: PlayCircle, color: 'important' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'low' },
  { value: 'missed', label: 'Missed', icon: XCircle, color: 'destructive' },
];

const NoticeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdminOrTeacher, loading } = useAuth();
  const { notices } = useNoticeStore();
  const { statuses, setStatus } = useStatuses();
  const [statusRows, setStatusRows] = useState<{ status: string; student_id: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; year: number | null; section: string | null; name: string | null }[]>([]);

  const notice = notices.find(n => n.id === id);

  useEffect(() => {
    if (!isAdminOrTeacher || !id) return;
    (async () => {
      const [{ data: s }, { data: st }] = await Promise.all([
        supabase.from('notice_statuses').select('status, student_id').eq('notice_id', id),
        supabase.from('profiles').select('id, year, section, name'),
      ]);
      setStatusRows((s ?? []) as any);
      setStudents(st ?? []);
    })();
  }, [id, isAdminOrTeacher]);

  const breakdown = useMemo(() => {
    if (!notice) return null;
    let assignedStudents = students;
    if (notice.visibility === 'faculty') assignedStudents = [];
    else if (notice.visibility === 'targeted') {
      assignedStudents = students.filter(s =>
        (notice.target_years.length === 0 || (s.year && notice.target_years.includes(s.year))) &&
        (notice.target_sections.length === 0 || (s.section && notice.target_sections.includes(s.section)))
      );
    }
    const total = assignedStudents.length;
    const map = new Map<string, string>();
    statusRows.forEach(r => map.set(r.student_id, r.status));
    let completed = 0, inProgress = 0, pending = 0, missed = 0, assigned = 0;
    assignedStudents.forEach(s => {
      const st = map.get(s.id);
      if (st === 'completed') completed++;
      else if (st === 'in-progress') inProgress++;
      else if (st === 'pending') pending++;
      else if (st === 'missed') missed++;
      else assigned++;
    });
    if (notice.urgency === 'expired') {
      missed += assigned;
      assigned = 0;
    }
    return { total, assigned, pending, inProgress, completed, missed };
  }, [notice, students, statusRows]);

  if (loading) return <div className="min-h-screen pt-32 text-center text-muted-foreground">Loading…</div>;
  if (!notice) return (
    <div className="min-h-screen gradient-bg pt-24 px-4 max-w-4xl mx-auto">
      <Link to="/notifications" className="text-primary hover:underline">← Back to Notices</Link>
      <p className="text-center text-muted-foreground mt-12">Notice not found.</p>
    </div>
  );

  const isTask = notice.notice_type === 'task';
  const myStatus: StudentStatus = statuses[notice.id] ?? (notice.urgency === 'expired' ? 'missed' : 'assigned');

  const yearLabel = notice.target_years.length ? notice.target_years.map(y => `Year ${y}`).join(', ') : 'All years';
  const sectionLabel = notice.target_sections.length ? `Section ${notice.target_sections.join(', ')}` : 'All sections';
  const audience =
    notice.visibility === 'general' ? 'All Students' :
    notice.visibility === 'faculty' ? 'Faculty Only' :
    `${yearLabel} · ${sectionLabel}`;

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <Link to={isAdminOrTeacher ? '/analytics' : '/notifications'} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="glass-strong p-6 md:p-8 mb-6">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <h1 className="font-display text-3xl font-bold text-foreground flex-1">{notice.title}</h1>
            <span className={`text-xs px-3 py-1 rounded-full ${getUrgencyBadge(notice.urgency)}`}>{getUrgencyLabel(notice.urgency)}</span>
          </div>
          <span className={`inline-block text-xs px-2 py-0.5 rounded mb-4 ${isTask ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
            {isTask ? 'Task-Based' : 'Informational'}
          </span>
          <p className="text-muted-foreground whitespace-pre-wrap mb-6">{notice.content}</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Detail icon={Calendar} label="Deadline" value={new Date(notice.deadline).toLocaleString()} />
            <Detail icon={Target} label="Audience" value={audience} />
            <Detail icon={GraduationCap} label="Year" value={notice.target_years.length ? notice.target_years.join(', ') : (notice.visibility === 'faculty' ? '—' : 'All')} />
            <Detail icon={Building2} label="Section" value={notice.target_sections.length ? notice.target_sections.join(', ') : (notice.visibility === 'faculty' ? '—' : 'All')} />
          </div>

          {notice.attachments?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Attachments</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {notice.attachments.map((a, idx) => {
                  const isImage = a.type?.startsWith('image/');
                  return (
                    <a key={idx} href={a.url} target="_blank" rel="noopener noreferrer" download={a.name}
                      className="glass flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/40 transition-colors">
                      {isImage ? (
                        <img src={a.url} alt={a.name} className="w-12 h-12 object-cover rounded-lg shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{isImage ? 'Image' : 'PDF / File'}</p>
                      </div>
                      <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Student status update — only for task-based notices */}
        {isTask && user?.role === 'student' && (
          <div className="glass-strong p-6 mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-1">My Status</h2>
            <p className="text-sm text-muted-foreground mb-4">Click to update your progress on this task.</p>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(({ value, label, icon: Icon, color }) => {
                const active = myStatus === value;
                return (
                  <button key={value} onClick={() => setStatus(notice.id, value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? `bg-${color}/20 text-${color} ring-2 ring-${color}/40 scale-105`
                        : 'glass text-muted-foreground hover:text-foreground'
                    }`}>
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Informational notices: no status, just a hint */}
        {!isTask && (
          <div className="glass-strong p-6 text-center">
            <p className="text-muted-foreground">This is an informational notice — no action required.</p>
          </div>
        )}

        {/* Analytics — staff only, task-based only */}
        {isTask && isAdminOrTeacher && breakdown && (
          <AnalyticsBlock data={breakdown} />
        )}
      </div>
    </div>
  );
};

const AnalyticsBlock = ({ data }: { data: { total: number; assigned: number; pending: number; inProgress: number; completed: number; missed: number } }) => {
  const pct = (v: number) => data.total ? Math.round((v / data.total) * 100) : 0;
  const pieData = [
    { name: 'Assigned', value: data.assigned },
    { name: 'Pending', value: data.pending },
    { name: 'In Progress', value: data.inProgress },
    { name: 'Completed', value: data.completed },
    { name: 'Missed', value: data.missed },
  ].filter(d => d.value > 0);
  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-6">
      <div className="glass-strong p-6">
        <h2 className="font-display text-xl font-semibold text-foreground mb-4">Status Distribution</h2>
        {data.total === 0 ? (
          <p className="text-muted-foreground text-center py-12">No students assigned.</p>
        ) : pieData.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No status updates yet.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => `${e.name} ${pct(e.value)}%`}>
                  {pieData.map(entry => (
                    <Cell key={entry.name} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${v} (${pct(v as number)}%)`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="glass-strong p-6">
        <h2 className="font-display text-xl font-semibold text-foreground mb-4">Summary</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="pb-2">Status</th>
              <th className="pb-2 text-center">Count</th>
              <th className="pb-2 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {(['Assigned','Pending','In Progress','Completed','Missed'] as const).map(label => {
              const v = label === 'Assigned' ? data.assigned : label === 'Pending' ? data.pending : label === 'In Progress' ? data.inProgress : label === 'Completed' ? data.completed : data.missed;
              return (
                <tr key={label} className="border-b border-border/50">
                  <td className="py-2 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ background: COLORS[label] }} />
                    {label}
                  </td>
                  <td className="py-2 text-center font-medium text-foreground">{v}</td>
                  <td className="py-2 text-right text-muted-foreground">{pct(v)}%</td>
                </tr>
              );
            })}
            <tr className="font-semibold">
              <td className="py-2">Total</td>
              <td className="py-2 text-center text-foreground">{data.total}</td>
              <td className="py-2 text-right text-muted-foreground">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Detail = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-center gap-2 glass rounded-xl p-3">
    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground font-medium truncate">{value}</p>
    </div>
  </div>
);

export default NoticeDetail;
