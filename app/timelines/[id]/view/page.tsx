import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { TimelineViewClient } from './TimelineViewClient';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function ProjectTimelinePage({ params }: Props) {
  const { id } = await params;

  const timeline = await prisma.timeline.findUnique({
    where: { id: Number(id) },
    include: {
      project: true,
      events: { orderBy: { date: 'asc' } },
    },
  });

  if (!timeline) notFound();

  // Fetch all sibling timelines (branches) with their events
  const siblings = await prisma.timeline.findMany({
    where: { projectId: timeline.project.id, isMain: false },
    include: { events: { orderBy: { date: 'asc' } } },
  });

  const serialize = (obj: object) =>
    JSON.parse(JSON.stringify(obj, (_, v) => (v instanceof Date ? v.toISOString() : v)));

  const updatedAt = timeline.events.length > 0
    ? timeline.events.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0].updatedAt
    : timeline.updatedAt;

  return (
    <TimelineViewClient
      timeline={serialize(timeline)}
      branches={serialize(siblings)}
      updatedAt={new Date(updatedAt).toISOString()}
    />
  );
}
