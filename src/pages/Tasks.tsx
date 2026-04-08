import { useState, useMemo } from 'react';
import { sampleTasks, sampleNotices } from '@/lib/sampleData';
import { analyzeNotice, getPriorityLabel, getPriorityColor } from '@/lib/nlp';
import type { Priority } from '@/lib/nlp';
import { CheckCircle, Clock, PlayCircle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/lib/sampleData';

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newPriority, setNewPriority] = useState<'urgent' | 'important' | 'normal' | 'low'>('normal');
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');
  const { toast } = useToast();

  const enrichedTasks = useMemo(() => {
    return tasks.map(t => {
      if (t.manualPriority) {
        return { ...t, priority: t.manualPriority };
      }
      const notice = sampleNotices.find(n => n.id === t.noticeId);
      const nlp = notice ? analyzeNotice(notice.title + ' ' + notice.content) : null;
      return { ...t, priority: (nlp?.priority ?? 'normal') as Priority };
    });
  }, [tasks]);

  const filtered = filter === 'all' ? enrichedTasks : enrichedTasks.filter(t => t.status === filter);

  // Sort by linked notice priority
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
    setNewTitle('');
    setNewDesc('');
    setNewDue('');
    setNewPriority('normal');
    setShowAdd(false);
    toast({ title: 'Task Added', description: task.title });
  };

  const cycleStatus = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = t.status === 'pending' ? 'in-progress' : t.status === 'in-progress' ? 'completed' : 'pending';
      return { ...t, status: next };
    }));
  };

  const statusIcons = {
    pending: <Clock className="w-4 h-4 text-urgent" />,
    'in-progress': <PlayCircle className="w-4 h-4 text-important" />,
    completed: <CheckCircle className="w-4 h-4 text-low" />,
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
            <button type="submit" className="gradient-primary text-primary-foreground px-6 py-2 rounded-xl font-medium hover:scale-105 transition-all">Create Task</button>
          </form>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'in-progress', 'completed'] as const).map(f => (
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
              <button onClick={() => cycleStatus(task.id)} className="shrink-0 hover:scale-110 transition-transform">
                {statusIcons[task.status]}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-foreground ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>{task.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Due: {task.dueDate}</span>
                  <span className="bg-secondary px-2 py-0.5 rounded-md">{getPriorityLabel(task.priority)}</span>
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-lg capitalize shrink-0 ${
                task.status === 'completed' ? 'bg-low/20 text-low' :
                task.status === 'in-progress' ? 'bg-important/20 text-important' :
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
