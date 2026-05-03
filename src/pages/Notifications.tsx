import { useState, useMemo, useRef } from 'react';
import NoticeCard from '@/components/NoticeCard';
import { Search, Filter, Plus, Trash2, Pencil, Paperclip, X, Loader2, FileText } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { useNoticeStore, ManagedNotice, NoticeAttachment } from '@/lib/noticeStore';
import { useToast } from '@/hooks/use-toast';
import { Urgency, getUrgencyLabel, getUrgencyBadge } from '@/lib/urgency';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const YEARS = [1, 2, 3, 4];
const SECTIONS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const Notifications = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterUrgency, setFilterUrgency] = useState<Urgency | 'all'>('all');
  const [filterType, setFilterType] = useState<'all' | 'task' | 'info'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { user, isAdminOrTeacher } = useAuth();
  const { notices, addNotice, updateNotice, removeNotice } = useNoticeStore();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newDeadline, setNewDeadline] = useState('');
  const [newBaseUrgency, setNewBaseUrgency] = useState<Urgency>('normal');
  const [newNoticeType, setNewNoticeType] = useState<'task' | 'info'>('info');
  const [visType, setVisType] = useState<'general' | 'faculty' | 'targeted'>('general');
  const [visYears, setVisYears] = useState<number[]>([]);
  const [visSections, setVisSections] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<NoticeAttachment[]>([]);

  const resetForm = () => {
    setNewTitle(''); setNewContent(''); setNewCategory('General'); setNewDeadline('');
    setNewBaseUrgency('normal'); setNewNoticeType('info'); setVisType('general'); setVisYears([]); setVisSections([]);
    setAttachments([]);
    setEditingId(null);
  };

  const startEdit = (n: ManagedNotice) => {
    setEditingId(n.id);
    setNewTitle(n.title); setNewContent(n.content); setNewCategory(n.category);
    setNewDeadline(n.deadline.slice(0, 16));
    setNewBaseUrgency(n.base_urgency);
    setNewNoticeType(n.notice_type);
    setVisType(n.visibility);
    setVisYears(n.target_years || []);
    setVisSections(n.target_sections || []);
    setAttachments(n.attachments || []);
    setShowAdd(true);
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
    if (filterType !== 'all') items = items.filter(n => n.notice_type === filterType);
    const order: Record<Urgency, number> = { urgent: 0, important: 1, normal: 2, low: 3, expired: 4 };
    return [...items].sort((a, b) => order[a.urgency] - order[b.urgency]);
  }, [notices, search, filterUrgency, filterType]);

  const urgencies: (Urgency | 'all')[] = ['all', 'urgent', 'important', 'normal', 'low'];

  const toggleYear = (y: number) => setVisYears(p => p.includes(y) ? p.filter(v => v !== y) : [...p, y]);
  const toggleSection = (s: string) => setVisSections(p => p.includes(s) ? p.filter(v => v !== s) : [...p, s]);

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const allowed = files.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (allowed.length !== files.length) {
      toast({ title: 'Some files skipped', description: 'Only images and PDFs are allowed', variant: 'destructive' });
    }
    setUploading(true);
    const uploaded: NoticeAttachment[] = [];
    for (const f of allowed) {
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: 'File too large', description: `${f.name} exceeds 10MB`, variant: 'destructive' });
        continue;
      }
      const path = `${user?.id}/${Date.now()}-${f.name}`;
      const { error: upErr } = await supabase.storage.from('notice-attachments').upload(path, f, { upsert: true, cacheControl: '3600' });
      if (upErr) {
        toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' });
        continue;
      }
      const { data: { publicUrl } } = supabase.storage.from('notice-attachments').getPublicUrl(path);
      uploaded.push({ url: publicUrl, name: f.name, type: f.type, size: f.size });
    }
    setAttachments(prev => [...prev, ...uploaded]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeAttachment = (idx: number) => setAttachments(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || !newDeadline) return;
    const payload = {
      title: newTitle, content: newContent, category: newCategory,
      deadline: new Date(newDeadline).toISOString(),
      base_urgency: newBaseUrgency,
      notice_type: newNoticeType,
      visibility: visType,
      target_years: visType === 'targeted' ? visYears : [],
      target_sections: visType === 'targeted' ? visSections : [],
      attachments,
    };
    const { error } = editingId
      ? await updateNotice(editingId, payload as any)
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
              <label className="text-sm text-muted-foreground mb-2 block">Notice Type</label>
              <div className="flex gap-2 flex-wrap">
                {([['info', 'Informational'], ['task', 'Task-Based']] as const).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setNewNoticeType(val)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${newNoticeType === val ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Task-based notices support student status tracking and analytics.</p>
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
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Attachments (Images / PDFs)</label>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleAttachmentUpload} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="glass px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-60">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                {uploading ? 'Uploading...' : 'Attach Files'}
              </button>
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((a, idx) => (
                    <div key={idx} className="flex items-center gap-2 glass p-2 rounded-lg">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs text-foreground flex-1 truncate">{a.name}</span>
                      <button type="button" onClick={() => removeAttachment(idx)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
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
            {(['all', 'task', 'info'] as const).map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filterType === t ? 'bg-primary text-primary-foreground shadow' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                {t === 'all' ? 'All Types' : t === 'task' ? 'Task' : 'Info'}
              </button>
            ))}
            <span className="w-px h-5 bg-border mx-1" />
            {urgencies.map(p => (
              <button key={p} onClick={() => setFilterUrgency(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filterUrgency === p ? 'bg-primary text-primary-foreground shadow' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>{p}</button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map(notice => (
            <div key={notice.id} className="relative group">
              <NoticeCard notice={notice} onClick={() => navigate(`/notice/${notice.id}`)} />
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
      </div>
    </div>
  );
};

export default Notifications;
