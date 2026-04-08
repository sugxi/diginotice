// NLP utility for keyword extraction and priority classification

const URGENT_KEYWORDS = ['urgent', 'emergency', 'immediately', 'asap', 'critical', 'deadline', 'today', 'now', 'alert'];
const IMPORTANT_KEYWORDS = ['exam', 'submission', 'meeting', 'important', 'required', 'mandatory', 'notice', 'announcement', 'assignment', 'test', 'review'];
const NORMAL_KEYWORDS = ['update', 'schedule', 'reminder', 'information', 'event', 'workshop', 'seminar', 'class'];
const LOW_KEYWORDS = ['optional', 'general', 'fyi', 'miscellaneous', 'casual', 'social'];

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
  'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each',
  'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very',
  'just', 'because', 'this', 'that', 'these', 'those', 'it', 'its',
]);

export type Priority = 'urgent' | 'important' | 'normal' | 'low';

export interface NLPResult {
  priority: Priority;
  keywords: string[];
  cleanedText: string;
  confidence: number;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
}

function removeStopWords(tokens: string[]): string[] {
  return tokens.filter(t => !STOP_WORDS.has(t));
}

export function extractKeywords(text: string): string[] {
  const tokens = tokenize(text);
  const meaningful = removeStopWords(tokens);
  const freq: Record<string, number> = {};
  meaningful.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

export function classifyPriority(text: string): Priority {
  const lower = text.toLowerCase();
  const urgentScore = URGENT_KEYWORDS.filter(k => lower.includes(k)).length;
  const importantScore = IMPORTANT_KEYWORDS.filter(k => lower.includes(k)).length;
  const normalScore = NORMAL_KEYWORDS.filter(k => lower.includes(k)).length;
  const lowScore = LOW_KEYWORDS.filter(k => lower.includes(k)).length;

  if (urgentScore >= 2 || (urgentScore >= 1 && lower.includes('!'))) return 'urgent';
  if (urgentScore >= 1) return 'urgent';
  if (importantScore >= 2) return 'important';
  if (importantScore >= 1) return 'important';
  if (normalScore >= 1) return 'normal';
  if (lowScore >= 1) return 'low';
  return 'normal';
}

export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,!?;:'"()-]/g, '')
    .trim();
}

export function analyzeNotice(text: string): NLPResult {
  const keywords = extractKeywords(text);
  const priority = classifyPriority(text);
  const cleanedText = cleanText(text);
  
  const lower = text.toLowerCase();
  const allKeywords = [...URGENT_KEYWORDS, ...IMPORTANT_KEYWORDS, ...NORMAL_KEYWORDS, ...LOW_KEYWORDS];
  const matchCount = allKeywords.filter(k => lower.includes(k)).length;
  const confidence = Math.min(matchCount / 3, 1);

  return { priority, keywords, cleanedText, confidence };
}

export function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'urgent': return 'priority-urgent';
    case 'important': return 'priority-important';
    case 'normal': return 'priority-normal';
    case 'low': return 'priority-low';
  }
}

export function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case 'urgent': return '🔴 Urgent';
    case 'important': return '🟠 Important';
    case 'normal': return '🔵 Normal';
    case 'low': return '🟢 Low';
  }
}
