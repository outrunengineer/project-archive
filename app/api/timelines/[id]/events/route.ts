import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const events = await prisma.event.findMany({
    where: { timelineId: Number(id) },
    orderBy: { date: 'asc' },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { name, date, description, type, impactSentiment, resourceCount, resourcesReturned, conclusionType } = body;

  if (!name || !date || !type) {
    return NextResponse.json({ error: 'name, date, and type are required' }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      name,
      date: new Date(date),
      description,
      type,
      impactSentiment: impactSentiment ?? 'NEUTRAL',
      resourceCount: resourceCount ?? null,
      resourcesReturned: resourcesReturned ?? false,
      conclusionType: conclusionType ?? null,
      timelineId: Number(id),
    },
  });

  return NextResponse.json(event, { status: 201 });
}
