import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const timelines = await prisma.timeline.findMany({
    orderBy: [{ project: { name: 'asc' } }, { isMain: 'desc' }, { branchName: 'asc' }],
    include: {
      project: { select: { id: true, name: true, status: true } },
      _count: { select: { events: true } },
    },
  });
  return NextResponse.json(timelines);
}
