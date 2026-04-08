import { useState, useMemo } from 'react';
import NoticeCard from '@/components/NoticeCard';
import { sampleNotices } from '@/lib/sampleData';
import { analyzeNotice, Priority } from '@/lib/nlp';
import { Search, Filter } from 'lucide-react';

const Notifications = () => {
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [selectedNotice, setSelectedNotice] = useState<string | null>(null);

  const processed = useMemo(() => {
    return sampleNotices.map(n => ({
      notice: n,
      nlp: analyzeNotice(n.title + ' ' + n.content),
    }));
  }, []);

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

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-4xl font-bold text-foreground mb-8">Notifications</h1>

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
            <NoticeCard key={notice.id} notice={notice} onClick={() => setSelectedNotice(notice.id)} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="glass-card text-center py-12">
            <p className="text-muted-foreground">No notices match your search criteria.</p>
          </div>
        )}

        {/* Modal */}
        {selectedNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm" onClick={() => setSelectedNotice(null)}>
            <div className="glass-strong max-w-lg w-full p-8" onClick={e => e.stopPropagation()}>
              {(() => {
                const n = sampleNotices.find(n => n.id === selectedNotice)!;
                const nlp = analyzeNotice(n.title + ' ' + n.content);
                return (
                  <>
                    <h2 className="font-display text-2xl font-bold text-foreground mb-4">{n.title}</h2>
                    <p className="text-muted-foreground mb-4">{nlp.cleanedText}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {nlp.keywords.map(k => (
                        <span key={k} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-lg">{k}</span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">By {n.author} · {n.date} · {n.category}</p>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
