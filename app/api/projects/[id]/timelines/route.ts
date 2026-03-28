import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const timelines = await prisma.timeline.findMany({
    where: { projectId: Number(id) },
    orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
    include: { _count: { select: { events: true } } },
  });
  return NextResponse.json(timelines);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { name, branchName, description } = body;

  if (!name || !branchName) {
    return NextResponse.json({ error: 'name and branchName are required' }, { status: 400 });
  }

  const timeline = await prisma.timeline.create({
    data: {
      name,
      description,
      isMain: false,
      branchName,
      projectId: Number(id),
    },
  });

  return NextResponse.json(timeline, { status: 201 });
}
