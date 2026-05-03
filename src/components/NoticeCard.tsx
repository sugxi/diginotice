import { useMemo } from 'react';
import { ManagedNotice } from '@/lib/noticeStore';
import { extractKeywords, cleanText } from '@/lib/nlp';
import { getUrgencyColorClass, getUrgencyLabel, getUrgencyBadge, daysUntil } from '@/lib/urgency';
import { Calendar, User, Tag, Clock } from 'lucide-react';

interface NoticeCardProps {
  notice: ManagedNotice;
  onClick?: () => void;
}

const NoticeCard = ({ notice, onClick }: NoticeCardProps) => {
  const { keywords, cleanedText } = useMemo(() => {
    const text = notice.title + ' ' + notice.content;
    return { keywords: extractKeywords(text), cleanedText: cleanText(text) };
  }, [notice]);

  const u = notice.urgency;
  const days = daysUntil(notice.deadline);

  return (
    <div onClick={onClick} className={`glass-card cursor-pointer ${getUrgencyColorClass(u)} transition-all duration-300`}>
      <div className="flex items-start justify-between mb-3 gap-2">
        <h3 className="font-display text-lg font-semibold text-foreground leading-tight flex-1">
          {notice.title}
        </h3>
        <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${getUrgencyBadge(u)}`}>
          {getUrgencyLabel(u)}
        </span>
      </div>
      <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded mb-3 ${notice.notice_type === 'task' ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
        {notice.notice_type === 'task' ? 'Task' : 'Info'}
      </span>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{cleanedText}</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {keywords.slice(0, 4).map(kw => (
          <span key={kw} className="flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-lg">
            <Tag className="w-3 h-3" />{kw}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><User className="w-3 h-3" />{notice.author_name}</span>
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Due {new Date(notice.deadline).toLocaleDateString()}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{days < 0 ? 'Expired' : `${days}d left`}</span>
        <span className="bg-secondary px-2 py-0.5 rounded-md">{notice.category}</span>
      </div>
    </div>
  );
};

export default NoticeCard;
