import { useMemo } from 'react';
import { Notice } from '@/lib/sampleData';
import { analyzeNotice, getPriorityColor, getPriorityLabel } from '@/lib/nlp';
import { Calendar, User, Tag } from 'lucide-react';

interface NoticeCardProps {
  notice: Notice;
  onClick?: () => void;
}

const NoticeCard = ({ notice, onClick }: NoticeCardProps) => {
  const nlp = useMemo(() => analyzeNotice(notice.title + ' ' + notice.content), [notice]);

  return (
    <div
      onClick={onClick}
      className={`glass-card cursor-pointer ${getPriorityColor(nlp.priority)} transition-all duration-300`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-display text-lg font-semibold text-foreground leading-tight flex-1 mr-3">
          {notice.title}
        </h3>
        <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
          nlp.priority === 'urgent' ? 'bg-urgent text-urgent-foreground' :
          nlp.priority === 'important' ? 'bg-important text-important-foreground' :
          nlp.priority === 'normal' ? 'bg-normal text-normal-foreground' :
          'bg-low text-low-foreground'
        }`}>
          {getPriorityLabel(nlp.priority)}
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{nlp.cleanedText}</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {nlp.keywords.slice(0, 4).map(kw => (
          <span key={kw} className="flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-lg">
            <Tag className="w-3 h-3" />
            {kw}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><User className="w-3 h-3" />{notice.author}</span>
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{notice.date}</span>
        <span className="bg-secondary px-2 py-0.5 rounded-md">{notice.category}</span>
      </div>
    </div>
  );
};

export default NoticeCard;
