import { useState, useMemo } from 'react';
import NoticeCard from '@/components/NoticeCard';
import { analyzeNotice, Priority } from '@/lib/nlp';
import { Search, Filter, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { useNoticeStore, isNoticeVisibleToUser, ManagedNotice } from '@/lib/noticeStore';
import { useToast } from '@/hooks/use-toast';

const YEARS = [1, 2, 3, 4];
const SECTIONS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const Notifications = () => {
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [selectedNotice, setSelectedNotice] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const { user, isAdminOrTeacher } = useAuth();
  const { notices, addNotice, removeNotice } = useNoticeStore();
  const { toast } = useToast();

  // Add notice form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [visType, setVisType] = useState<'general' | 'faculty' | 'targeted'>('general');
  const [visYears, setVisYears] = useState<number[]>([]);
  const [visSections, setVisSections] = useState<string[]>([]);

  // Filter notices based on user's role/year/section
  const visibleNotices = useMemo(() => {
    return notices.filter(n =>
      isNoticeVisibleToUser(n, user?.role, user?.year, user?.section)
    );
  }, [notices, user]);

  const processed = useMemo(() => {
    return visibleNotices.map(n => ({
      notice: n,
      nlp: analyzeNotice(n.title + ' ' + n.content),
    }));
  }, [visibleNotices]);

  const filtered = useMemo(() => {
    let items = processed;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.notice.title.toLowerCase().includes(q) ||
        i.notice.content.toLowerCase().includes(q) ||
        i.nlp.keywords.some(k => k.includes(q))
      );
    }
    if (filterPriority !== 'all') {
      items = items.filter(i => i.nlp.priority === filterPriority);
    }
    const order = { urgent: 0, important: 1, normal: 2, low: 3 };
    return items.sort((a, b) => order[a.nlp.priority] - order[b.nlp.priority]);
  }, [processed, search, filterPriority]);

  const priorities: (Priority | 'all')[] = ['all', 'urgent', 'important', 'normal', 'low'];

  const toggleYear = (y: number) => setVisYears(prev => prev.includes(y) ? prev.filter(v => v !== y) : [...prev, y]);
  const toggleSection = (s: string) => setVisSections(prev => prev.includes(s) ? prev.filter(v => v !== s) : [...prev, s]);

  const handleAddNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    const notice: ManagedNotice = {
      id: Date.now().toString(),
      title: newTitle,
      content: newContent,
      author: user?.name || 'Unknown',
      date: new Date().toISOString().slice(0, 10),
      category: newCategory,
      expiryDate: newExpiryDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      visibility: {
        type: visType,
        ...(visType === 'targeted' ? { years: visYears.length ? visYears : undefined, sections: visSections.length ? visSections : undefined } : {}),
      },
    };
    addNotice(notice);
    toast({ title: 'Notice Published', description: notice.title });
    setNewTitle(''); setNewContent(''); setNewCategory('General'); setNewExpiryDate('');
    setVisType('general'); setVisYears([]); setVisSections([]);
    setShowAdd(false);
  };

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-4xl font-bold text-foreground">Notices</h1>
          {isAdminOrTeacher && (
            <button onClick={() => setShowAdd(!showAdd)} className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:scale-105 transition-all">
              <Plus className="w-4 h-4" /> Add Notice
            </button>
          )}
        </div>

        {!user && (
          <div className="glass-card mb-6 text-center py-4">
            <p className="text-muted-foreground text-sm">You're viewing as a guest. <a href="/login" className="text-primary font-medium hover:underline">Login</a> to see notices targeted to your year & section.</p>
          </div>
        )}

        {/* Add Notice Form */}
        {showAdd && isAdminOrTeacher && (
          <form onSubmit={handleAddNotice} className="glass-strong p-6 mb-8 space-y-4">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Notice title" required className="w-full px-4 py-2 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary" />
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Notice content..." required rows={3} className="w-full px-4 py-2 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Category</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary">
                  {['General', 'Academic', 'Event', 'Alert', 'Social'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Expiry Date</label>
                <input type="date" value={newExpiryDate} onChange={e => setNewExpiryDate(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-secondary text-foreground outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Who can see this notice?</label>
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
                    <p className="text-xs text-muted-foreground mb-2">Select Years (leave empty for all years)</p>
                    <div className="flex gap-2">
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

            <button type="submit" className="gradient-primary text-primary-foreground px-6 py-2 rounded-xl font-medium hover:scale-105 transition-all">Publish Notice</button>
          </form>
        )}

        {/* Search & Filter */}
        <div className="glass-strong p-4 mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notices or keywords..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {priorities.map(p => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  filterPriority === p
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'bg-secondary text-secondary-foreground hover:bg-muted'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map(({ notice }) => (
            <div key={notice.id} className="relative group">
              <NoticeCard notice={notice} onClick={() => setSelectedNotice(notice.id)} />
              {isAdminOrTeacher && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeNotice(notice.id); toast({ title: 'Notice Deleted' }); }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-urgent text-urgent-foreground p-1.5 rounded-lg transition-opacity z-10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="glass-card text-center py-12">
            <p className="text-muted-foreground">No notices match your search criteria.</p>
          </div>
        )}

        {/* Modal */}
        {selectedNotice && (() => {
          const n = visibleNotices.find(n => n.id === selectedNotice);
          if (!n) return null;
          const nlp = analyzeNotice(n.title + ' ' + n.content);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm" onClick={() => setSelectedNotice(null)}>
              <div className="glass-strong max-w-lg w-full p-8 relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setSelectedNotice(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
                <h2 className="font-display text-2xl font-bold text-foreground mb-4">{n.title}</h2>
                <p className="text-muted-foreground mb-4">{nlp.cleanedText}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {nlp.keywords.map(k => (
                    <span key={k} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-lg">{k}</span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">By {n.author} · {n.date} · {n.category}</p>
                {n.visibility.type !== 'general' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Visibility: {n.visibility.type === 'faculty' ? 'Faculty Only' : `Year ${n.visibility.years?.join(', ') || 'All'} · Section ${n.visibility.sections?.join(', ') || 'All'}`}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Expires: {n.expiryDate}</p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default Notifications;
