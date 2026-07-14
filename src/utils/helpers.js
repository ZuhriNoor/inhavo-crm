// Shared utility helpers

/**
 * Format a Date as "X time ago"
 */
export const formatDistanceToNow = (date) => {
  if (!date) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

/**
 * Format a date as DD/MM/YYYY
 */
export const formatDate = (date) => {
  if (!date) return '—';
  const d = date instanceof Date ? date : date.toDate?.() || new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format a Firestore Timestamp or Date to a <input type="date"> compatible string (YYYY-MM-DD)
 */
export const toInputDate = (ts) => {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().split('T')[0];
};

/**
 * Convert a YYYY-MM-DD string to a JavaScript Date
 */
export const fromInputDate = (str) => {
  if (!str) return null;
  return new Date(str + 'T00:00:00');
};

/**
 * Check if a task is overdue (deadline in the past, not completed)
 */
export const isOverdue = (task) => {
  if (task.status === 'completed') return false;
  if (!task.deadline) return false;
  const deadline = task.deadline?.toDate ? task.deadline.toDate() : new Date(task.deadline);
  return deadline < new Date();
};

/**
 * Check if a task deadline is within 24 hours
 */
export const isDueSoon = (task) => {
  if (task.status === 'completed') return false;
  if (!task.deadline) return false;
  const deadline = task.deadline?.toDate ? task.deadline.toDate() : new Date(task.deadline);
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return deadline > new Date() && deadline < in24h;
};

/**
 * Get initials from a name string
 */
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Generate a color from a string (for consistent avatar colors)
 */
export const stringToColor = (str) => {
  if (!str) return '#875a7b';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#875a7b', '#00a09d', '#3b82f6', '#f59e0b',
    '#8b5cf6', '#10b981', '#ef4444', '#ec4899',
  ];
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Truncate a string to maxLen characters
 */
export const truncate = (str, maxLen = 50) => {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
};
