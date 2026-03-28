import type { Event } from '@/app/generated/prisma/client';

/** Format a date as "Month YYYY" e.g. "March 2025" */
export function formatMonthYear(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Format a date as "Mon D, YYYY" e.g. "Aug 12, 2024" */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format a relative time label e.g. "2 hours ago" */
export function formatRelativeTime(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Derive capacity at each point in time from a starting headcount + STAFFING_CHANGE events.
 * Returns an array of { date, headcount } sorted by date.
 */
export function deriveCapacitySegments(
  startingHeadcount: number,
  events: { date: Date | string; type: string; resourceCount: number | null }[],
  startDate: Date | string,
): { date: Date; headcount: number }[] {
  const staffingEvents = events
    .filter((e) => e.resourceCount != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const segments: { date: Date; headcount: number }[] = [
    { date: new Date(startDate), headcount: startingHeadcount },
  ];

  for (const event of staffingEvents) {
    segments.push({ date: new Date(event.date), headcount: event.resourceCount! });
  }

  return segments;
}

/** Map EventType enum to display label */
export function eventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    DELIVERABLE: 'Deliverable',
    PRIORITY_CHANGE: 'Priority Change',
    STAFFING_CHANGE: 'Staffing Change',
    INITIATIVE: 'Initiative',
    KEY_DECISION: 'Key Decision',
    IMPEDIMENT: 'Impediment',
  };
  return labels[type] ?? type;
}
