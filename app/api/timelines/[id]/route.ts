import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const timeline = await prisma.timeline.findUnique({
    where: { id: Number(id) },
    include: {
      project: true,
      events: { orderBy: { date: 'asc' } },
    },
  });
  if (!timeline) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(timeline);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { name, description, branchCloseMode } = body;

  const timeline = await prisma.timeline.update({
    where: { id: Number(id) },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(branchCloseMode !== undefined && { branchCloseMode }),
    },
  });

  return NextResponse.json(timeline);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const timeline = await prisma.timeline.findUnique({ where: { id: Number(id) } });

  if (!timeline) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (timeline.isMain) {
    return NextResponse.json({ error: 'Cannot delete the main timeline' }, { status: 403 });
  }

  await prisma.timeline.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
