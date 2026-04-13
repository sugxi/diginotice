import { useState, useMemo } from 'react';
import { sampleTasks } from '@/lib/sampleData';
import { analyzeNotice, getPriorityLabel, getPriorityColor } from '@/lib/nlp';
import type { Priority } from '@/lib/nlp';
import { CheckCircle, Clock, PlayCircle, Plus, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/lib/sampleData';
import { useAuth } from '@/lib/authContext';
import { useNoticeStore } from '@/lib/noticeStore';

const YEARS = [1, 2, 3, 4];
const SECTIONS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newPriority, setNewPriority] = useState<'urgent' | 'important' | 'normal' | 'low'>('normal');
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'missed'>('all');
  const [visType, setVisType] = useState<'general' | 'faculty' | 'targeted'>('general');
  const [visYears, setVisYears] = useState<number[]>([]);
  const [visSections, setVisSections] = useState<string[]>([]);
  const { toast } = useToast();
  const { user, isAdminOrTeacher } = useAuth();
  const { notices } = useNoticeStore();

  const toggleYear = (y: number) => setVisYears(prev => prev.includes(y) ? prev.filter(v => v !== y) : [...prev, y]);
  const toggleSection = (s: string) => setVisSections(prev => prev.includes(s) ? prev.filter(v => v !== s) : [...prev, s]);

  const enrichedTasks = useMemo(() => {
    return tasks.map(t => {
      if (t.manualPriority) {
        return { ...t, priority: t.manualPriority };
      }
      const notice = notices.find(n => n.id === t.noticeId);
      const nlp = notice ? analyzeNotice(notice.title + ' ' + notice.content) : null;
      return { ...t, priority: (nlp?.priority ?? 'normal') as Priority };
    });
  }, [tasks, notices]);

  const filtered = filter === 'all' ? enrichedTasks : enrichedTasks.filter(t => t.status === filter);

  const sorted = [...filtered].sort((a, b) => {
    const order = { urgent: 0, important: 1, normal: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTitle,
      description: newDesc,
      dueDate: newDue || '2026-04-15',
      status: 'pending',
      manualPriority: newPriority,
    };
    setTasks(prev => [...prev, task]);
    setNewTitle(''); setNewDesc(''); setNewDue(''); setNewPriority('normal');
    setVisType('general'); setVisYears([]); setVisSections([]);
    setShowAdd(false);
    toast({ title: 'Task Added', description: task.title });
  };

  const setTaskStatus = (id: string, status: Task['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const cycleStatus = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = t.status === 'pending' ? 'in-progress' : t.status === 'in-progress' ? 'completed' : t.status === 'completed' ? 'missed' : 'pending';
      return { ...t, status: next };
    }));
  };

  const statusIcons = {
    pending: <Clock className="w-4 h-4 text-urgent" />,
    'in-progress': <PlayCircle className="w-4 h-4 text-important" />,
    completed: <CheckCircle className="w-4 h-4 text-low" />,
    missed: <XCircle className="w-4 h-4 text-destructive" />,
  };

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-4xl font-bold text-foreground">Tasks</h1>
          <button onClick={() => setShowAdd(!showAdd)} className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:scale-105 transition-all">
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>

        {/* Add task form */}
        {showAdd && (
          <form onSubmit={addTask} className="glass-strong p-6 mb-8 space-y-4">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title" required className="w-full px-4 py-2 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary" />
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" className="w-full px-4 py-2 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary" />
            <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary" />
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Priority Level</label>
              <div className="flex gap-2">
                {(['urgent', 'important', 'normal', 'low'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewPriority(p)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                      newPriority === p
                        ? p === 'urgent' ? 'bg-urgent text-urgent-foreground'
                          : p === 'important' ? 'bg-important text-important-foreground'
                          : p === 'normal' ? 'bg-normal text-normal-foreground'
                          : 'bg-low text-low-foreground'
                        : 'glass text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {getPriorityLabel(p)}
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility selector */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Who can view this task?</label>
              <div className="flex gap-2 mb-3">
                {([['general', 'Everyone'], ['faculty', 'Faculty Only'], ['targeted', 'Specific Year/Section']] as const).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setVisType(val)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${visType === val ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {visType === 'targeted' && (
                <div className="space-y-3 p-4 rounded-xl bg-secondary/50">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Select Years (leave empty for all)</p>
                    <div className="flex gap-2">
                      {YEARS.map(y => (
                        <button key={y} type="button" onClick={() => toggleYear(y)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${visYears.includes(y) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                          Year {y}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Select Sections (leave empty for all)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SECTIONS.map(s => (
                        <button key={s} type="button" onClick={() => toggleSection(s)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${visSections.includes(s) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="gradient-primary text-primary-foreground px-6 py-2 rounded-xl font-medium hover:scale-105 transition-all">Create Task</button>
          </form>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'in-progress', 'completed', 'missed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                filter === f ? 'bg-primary text-primary-foreground shadow' : 'glass text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="space-y-4">
          {sorted.map(task => (
            <div key={task.id} className={`glass-card flex items-center gap-4 ${getPriorityColor(task.priority)}`}>
              <button onClick={() => cycleStatus(task.id)} className="shrink-0 hover:scale-110 transition-transform" title="Click to cycle status">
                {statusIcons[task.status]}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-foreground ${task.status === 'completed' ? 'line-through opacity-60' : ''} ${task.status === 'missed' ? 'line-through opacity-40 text-destructive' : ''}`}>{task.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Due: {task.dueDate}</span>
                  <span className="bg-secondary px-2 py-0.5 rounded-md">{getPriorityLabel(task.priority)}</span>
                </div>
                {/* Status selector for students */}
                {user && (
                  <div className="flex gap-1.5 mt-2">
                    {(['pending', 'in-progress', 'completed', 'missed'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setTaskStatus(task.id, s)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-all ${
                          task.status === s
                            ? s === 'completed' ? 'bg-low/20 text-low'
                              : s === 'missed' ? 'bg-destructive/20 text-destructive'
                              : s === 'in-progress' ? 'bg-important/20 text-important'
                              : 'bg-urgent/20 text-urgent'
                            : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className={`text-xs px-3 py-1 rounded-lg capitalize shrink-0 ${
                task.status === 'completed' ? 'bg-low/20 text-low' :
                task.status === 'in-progress' ? 'bg-important/20 text-important' :
                task.status === 'missed' ? 'bg-destructive/20 text-destructive' :
                'bg-urgent/20 text-urgent'
              }`}>
                {task.status}
              </span>
            </div>
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="glass-card text-center py-12">
            <p className="text-muted-foreground">No tasks found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
