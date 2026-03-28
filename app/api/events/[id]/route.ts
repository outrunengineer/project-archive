import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { name, date, description, type, impactSentiment, resourceCount, resourcesReturned, conclusionType } = body;

  const event = await prisma.event.update({
    where: { id: Number(id) },
    data: {
      ...(name !== undefined && { name }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(impactSentiment !== undefined && { impactSentiment }),
      ...(resourceCount !== undefined && { resourceCount }),
      ...(resourcesReturned !== undefined && { resourcesReturned }),
      ...(conclusionType !== undefined && { conclusionType }),
    },
  });

  return NextResponse.json(event);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.event.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
