import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id: Number(id) },
    include: { timelines: true },
  });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { name, startDate, status, statusDate, startingHeadcount } = body;

  const project = await prisma.project.update({
    where: { id: Number(id) },
    data: {
      ...(name !== undefined && { name }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(status !== undefined && { status }),
      ...(statusDate !== undefined && { statusDate: statusDate ? new Date(statusDate) : null }),
      ...(startingHeadcount !== undefined && { startingHeadcount }),
    },
  });

  return NextResponse.json(project);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.project.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
