import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { TimelineConfigClient } from './TimelineConfigClient';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function TimelineConfigPage({ params }: Props) {
  const { id } = await params;

  const timeline = await prisma.timeline.findUnique({
    where: { id: Number(id) },
    include: {
      project: true,
      events: { orderBy: { date: 'asc' } },
    },
  });

  if (!timeline) notFound();

  const siblings = await prisma.timeline.findMany({
    where: { projectId: timeline.projectId },
    include: { _count: { select: { events: true } } },
    orderBy: [{ isMain: 'desc' }, { branchName: 'asc' }],
  });

  const serialize = (obj: object) =>
    JSON.parse(JSON.stringify(obj, (_, v) => (v instanceof Date ? v.toISOString() : v)));

  return (
    <TimelineConfigClient
      timeline={serialize(timeline)}
      siblings={serialize(siblings)}
    />
  );
}
