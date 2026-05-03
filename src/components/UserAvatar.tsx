import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  url?: string | null;
  name?: string;
  className?: string;
}

const UserAvatar = ({ url, name, className }: UserAvatarProps) => {
  const initials = (name || 'U').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <Avatar className={cn('ring-2 ring-primary/30', className)}>
      {url && <AvatarImage src={url} alt={name || 'avatar'} />}
      <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">{initials}</AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
