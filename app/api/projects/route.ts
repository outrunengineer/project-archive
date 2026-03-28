import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { timelines: true } } },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, startDate, status, statusDate, startingHeadcount } = body;

  if (!name || !startDate) {
    return NextResponse.json({ error: 'name and startDate are required' }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name,
      startDate: new Date(startDate),
      status: status ?? 'Ongoing',
      statusDate: statusDate ? new Date(statusDate) : null,
      startingHeadcount: startingHeadcount ?? 1,
      timelines: {
        create: {
          name,
          isMain: true,
          branchName: 'Main',
        },
      },
    },
    include: { _count: { select: { timelines: true } } },
  });

  return NextResponse.json(project, { status: 201 });
}
