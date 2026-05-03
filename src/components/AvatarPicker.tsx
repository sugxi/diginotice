import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authContext';
import { DEFAULT_AVATARS } from '@/lib/avatars';
import { useToast } from '@/hooks/use-toast';
import UserAvatar from '@/components/UserAvatar';
import { Upload, Loader2, Check } from 'lucide-react';

const AvatarPicker = () => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const role = user.role === 'admin' ? 'teacher' : (user.role as 'student' | 'teacher');
  const defaults = DEFAULT_AVATARS[role];

  const setAvatar = async (url: string) => {
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
    setBusy(false);
    if (error) { toast({ title: 'Failed to update', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Profile picture updated' });
    await refreshProfile();
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' }); return; }
    setBusy(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' });
    if (upErr) { setBusy(false); toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' }); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    await setAvatar(publicUrl);
  };

  return (
    <div className="glass-strong p-6">
      <h2 className="font-display text-xl font-semibold text-foreground mb-4">Profile Picture</h2>
      <div className="flex items-center gap-4 mb-6">
        <UserAvatar url={user.avatar_url} name={user.name} className="w-20 h-20" />
        <div>
          <p className="text-sm font-medium text-foreground">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2">Choose a default avatar</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {defaults.map(url => (
            <button key={url} type="button" disabled={busy} onClick={() => setAvatar(url)}
              className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary p-0 ring-2 transition-colors ${user.avatar_url === url ? 'ring-primary' : 'ring-transparent hover:ring-primary/50'}`}>
              <img src={url} alt="avatar option" className="block h-full w-full object-cover object-center" />
              {user.avatar_url === url && (
                <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                  <Check className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">Or upload your own</p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Upload Image
        </button>
      </div>
    </div>
  );
};

export default AvatarPicker;
