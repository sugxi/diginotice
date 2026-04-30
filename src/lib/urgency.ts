// Dynamic urgency calculation based on remaining days to deadline
export type Urgency = 'low' | 'normal' | 'important' | 'urgent' | 'expired';

export function computeUrgency(deadline: string | Date): Urgency {
  const due = new Date(deadline).getTime();
  const now = Date.now();
  const diffDays = (due - now) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'expired';
  if (diffDays <= 4) return 'urgent';
  if (diffDays <= 7) return 'important';
  if (diffDays <= 15) return 'normal';
  return 'low';
}

export function daysUntil(deadline: string | Date): number {
  const due = new Date(deadline).getTime();
  return Math.ceil((due - Date.now()) / (1000 * 60 * 60 * 24));
}

export function getUrgencyLabel(u: Urgency): string {
  switch (u) {
    case 'urgent': return '🔴 Urgent';
    case 'important': return '🟠 Important';
    case 'normal': return '🔵 Normal';
    case 'low': return '🟢 Low';
    case 'expired': return '⚫ Expired';
  }
}

export function getUrgencyColorClass(u: Urgency): string {
  switch (u) {
    case 'urgent': return 'priority-urgent';
    case 'important': return 'priority-important';
    case 'normal': return 'priority-normal';
    case 'low': return 'priority-low';
    case 'expired': return 'priority-low';
  }
}

export function getUrgencyBadge(u: Urgency): string {
  switch (u) {
    case 'urgent': return 'bg-urgent text-urgent-foreground';
    case 'important': return 'bg-important text-important-foreground';
    case 'normal': return 'bg-normal text-normal-foreground';
    case 'low': return 'bg-low text-low-foreground';
    case 'expired': return 'bg-muted text-muted-foreground';
  }
}
