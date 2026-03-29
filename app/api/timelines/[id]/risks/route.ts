import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const risks = await prisma.risk.findMany({
    where: { timelineId: Number(id) },
    orderBy: { startDate: 'asc' },
  });
  return NextResponse.json(
    risks.map((r) => ({ ...r, types: JSON.parse(r.types) as string[] }))
  );
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { name, startDate, endDate, status, severity, types, impact } = body;

  if (!name || !startDate || !severity || !types) {
    return NextResponse.json(
      { error: 'name, startDate, severity, and types are required' },
      { status: 400 }
    );
  }

  if (!Array.isArray(types) || types.length === 0) {
    return NextResponse.json({ error: 'types must be a non-empty array' }, { status: 400 });
  }

  const validSeverities = ['LOW', 'MEDIUM', 'HIGH'];
  if (!validSeverities.includes(severity)) {
    return NextResponse.json({ error: 'severity must be LOW, MEDIUM, or HIGH' }, { status: 400 });
  }

  const validTypes = ['RESOURCE', 'DEPENDENCY', 'TECHNICAL', 'SCOPE'];
  for (const t of types as string[]) {
    if (!validTypes.includes(t)) {
      return NextResponse.json(
        { error: `Invalid type: ${t}. Must be one of ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }
  }

  if (endDate && new Date(endDate) < new Date(startDate)) {
    return NextResponse.json({ error: 'endDate must be on or after startDate' }, { status: 400 });
  }

  const risk = await prisma.risk.create({
    data: {
      name,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      status: status ?? 'Ongoing',
      severity,
      types: JSON.stringify(types),
      impact: impact ?? null,
      timelineId: Number(id),
    },
  });

  return NextResponse.json({ ...risk, types: JSON.parse(risk.types) as string[] }, { status: 201 });
}
