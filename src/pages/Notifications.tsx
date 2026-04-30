import { useState, useMemo } from 'react';
import NoticeCard from '@/components/NoticeCard';
import { Search, Filter, Plus, Trash2, X, Pencil } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { useNoticeStore, ManagedNotice } from '@/lib/noticeStore';
import { useToast } from '@/hooks/use-toast';
import { Urgency, getUrgencyLabel, getUrgencyBadge } from '@/lib/urgency';
import { extractKeywords, cleanText } from '@/lib/nlp';

const YEARS = [1, 2, 3, 4];
const SECTIONS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const Notifications = () => {
  const [search, setSearch] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<Urgency | 'all'>('all');
  const [selectedNotice, setSelectedNotice] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { user, isAdminOrTeacher } = useAuth();
  const { notices, addNotice, updateNotice, removeNotice } = useNoticeStore();
  const { toast } = useToast();

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newDeadline, setNewDeadline] = useState('');
  const [newBaseUrgency, setNewBaseUrgency] = useState<Urgency>('normal');
  const [visType, setVisType] = useState<'general' | 'faculty' | 'targeted'>('general');
  const [visYears, setVisYears] = useState<number[]>([]);
  const [visSections, setVisSections] = useState<string[]>([]);

  const resetForm = () => {
    setNewTitle(''); setNewContent(''); setNewCategory('General'); setNewDeadline('');
    setNewBaseUrgency('normal'); setVisType('general'); setVisYears([]); setVisSections([]);
    setEditingId(null);
  };

  const startEdit = (n: ManagedNotice) => {
    setEditingId(n.id);
    setNewTitle(n.title); setNewContent(n.content); setNewCategory(n.category);
    setNewDeadline(n.deadline.slice(0, 16));
    setNewBaseUrgency(n.base_urgency);
    setVisType(n.visibility);
    setVisYears(n.target_years || []);
    setVisSections(n.target_sections || []);
    setShowAdd(true);
    setSelectedNotice(null);
  };

  const filtered = useMemo(() => {
    let items = notices;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q)
      );
    }
    if (filterUrgency !== 'all') items = items.filter(n => n.urgency === filterUrgency);
    const order: Record<Urgency, number> = { urgent: 0, important: 1, normal: 2, low: 3, expired: 4 };
    return [...items].sort((a, b) => order[a.urgency] - order[b.urgency]);
  }, [notices, search, filterUrgency]);

  const urgencies: (Urgency | 'all')[] = ['all', 'urgent', 'important', 'normal', 'low'];

  const toggleYear = (y: number) => setVisYears(p => p.includes(y) ? p.filter(v => v !== y) : [...p, y]);
  const toggleSection = (s: string) => setVisSections(p => p.includes(s) ? p.filter(v => v !== s) : [...p, s]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || !newDeadline) return;
    const payload = {
      title: newTitle, content: newContent, category: newCategory,
      deadline: new Date(newDeadline).toISOString(),
      base_urgency: newBaseUrgency,
      visibility: visType,
      target_years: visType === 'targeted' ? visYears : [],
      target_sections: visType === 'targeted' ? visSections : [],
    };
    const { error } = editingId
      ? await updateNotice(editingId, payload)
      : await addNotice(payload as any);
    if (error) { toast({ title: 'Error', description: error, variant: 'destructive' }); return; }
    toast({ title: editingId ? 'Notice Updated' : 'Notice Published', description: newTitle });
    resetForm();
    setShowAdd(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await removeNotice(id);
    if (error) toast({ title: 'Error', description: error, variant: 'destructive' });
    else toast({ title: 'Notice Deleted' });
  };

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-4xl font-bold text-foreground">Notices</h1>
          {isAdminOrTeacher && (
            <button onClick={() => { if (showAdd) resetForm(); setShowAdd(!showAdd); }} className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:scale-105 transition-all">
              <Plus className="w-4 h-4" /> {showAdd ? 'Cancel' : 'Add Notice'}
            </button>
          )}
        </div>

        {!user && (
          <div className="glass-card mb-6 text-center py-4">
            <p className="text-muted-foreground text-sm">Please <a href="/login" className="text-primary font-medium hover:underline">login</a> to view notices targeted to you.</p>
          </div>
        )}

        {showAdd && isAdminOrTeacher && (
          <form onSubmit={handleSubmit} className="glass-strong p-6 mb-8 space-y-4">
            <h2 className="font-display text-lg font-semibold text-foreground">{editingId ? 'Edit Notice' : 'New Notice'}</h2>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Notice title" required className="w-full px-4 py-2 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary" />
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Notice content..." required rows={3} className="w-full px-4 py-2 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Category</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary">
                  {['General', 'Academic', 'Event', 'Alert', 'Social'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Deadline</label>
                <input type="datetime-local" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} required className="w-full px-4 py-2 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Initial Urgency (auto-updates by deadline)</label>
              <div className="flex gap-2 flex-wrap">
                {(['urgent', 'important', 'normal', 'low'] as const).map(p => (
                  <button key={p} type="button" onClick={() => setNewBaseUrgency(p)} className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all ${newBaseUrgency === p ? getUrgencyBadge(p) : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                    {getUrgencyLabel(p)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Who can see this notice?</label>
              <div className="flex gap-2 mb-3 flex-wrap">
                {([['general', 'Everyone'], ['faculty', 'Faculty Only'], ['targeted', 'Specific Year/Section']] as const).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setVisType(val)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${visType === val ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {visType === 'targeted' && (
                <div className="space-y-3 p-4 rounded-xl bg-secondary/50">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Select Years (leave empty for all years)</p>
                    <div className="flex gap-2 flex-wrap">
                      {YEARS.map(y => (
                        <button key={y} type="button" onClick={() => toggleYear(y)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${visYears.includes(y) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                          Year {y}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Select Sections (leave empty for all sections)</p>
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
            <button type="submit" className="gradient-primary text-primary-foreground px-6 py-2 rounded-xl font-medium hover:scale-105 transition-all">
              {editingId ? 'Save Changes' : 'Publish Notice'}
            </button>
          </form>
        )}

        <div className="glass-strong p-4 mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search notices..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {urgencies.map(p => (
              <button key={p} onClick={() => setFilterUrgency(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filterUrgency === p ? 'bg-primary text-primary-foreground shadow' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>{p}</button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map(notice => (
            <div key={notice.id} className="relative group">
              <NoticeCard notice={notice} onClick={() => setSelectedNotice(notice.id)} />
              {isAdminOrTeacher && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 flex gap-1 z-10 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); startEdit(notice); }} className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(notice.id); }} className="bg-urgent text-urgent-foreground p-1.5 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="glass-card text-center py-12">
            <p className="text-muted-foreground">No notices match your search criteria.</p>
          </div>
        )}

        {selectedNotice && (() => {
          const n = notices.find(x => x.id === selectedNotice);
          if (!n) return null;
          const text = n.title + ' ' + n.content;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm" onClick={() => setSelectedNotice(null)}>
              <div className="glass-strong max-w-lg w-full p-8 relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setSelectedNotice(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                <h2 className="font-display text-2xl font-bold text-foreground mb-4">{n.title}</h2>
                <p className="text-muted-foreground mb-4">{cleanText(text)}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {extractKeywords(text).slice(0, 6).map(k => (
                    <span key={k} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-lg">{k}</span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">By {n.author_name} · {n.category}</p>
                <p className="text-xs text-muted-foreground mt-1">Deadline: {new Date(n.deadline).toLocaleString()}</p>
                {n.visibility !== 'general' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Visibility: {n.visibility === 'faculty' ? 'Faculty Only' : `Year ${n.target_years.join(', ') || 'All'} · Section ${n.target_sections.join(', ') || 'All'}`}
                  </p>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default Notifications;
