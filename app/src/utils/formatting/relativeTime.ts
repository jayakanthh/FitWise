export function getRelativeTime(timestamp: any): string {
  if (timestamp === null || timestamp === undefined) return '';

  let date: Date;

  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) {
    return 'Just now';
  }

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hrs ago`;
  }
  if (diffDays < 7) {
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  }
  if (diffWeeks < 4) {
    if (diffWeeks === 1) return '1 week ago';
    return `${diffWeeks} weeks ago`;
  }
  if (diffMonths < 12) {
    if (diffMonths === 1) return '1 month ago';
    return `${diffMonths} months ago`;
  }
  if (diffYears === 1) {
    return '1 year ago';
  }
  return `${diffYears} years ago`;
}
