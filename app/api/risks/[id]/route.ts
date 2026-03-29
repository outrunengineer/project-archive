import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { name, startDate, endDate, status, severity, types, impact } = body;

  if (severity !== undefined) {
    const validSeverities = ['LOW', 'MEDIUM', 'HIGH'];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json({ error: 'severity must be LOW, MEDIUM, or HIGH' }, { status: 400 });
    }
  }

  if (types !== undefined) {
    if (!Array.isArray(types) || types.length === 0) {
      return NextResponse.json({ error: 'types must be a non-empty array' }, { status: 400 });
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
  }

  const risk = await prisma.risk.update({
    where: { id: Number(id) },
    data: {
      ...(name !== undefined && { name }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(status !== undefined && { status }),
      ...(severity !== undefined && { severity }),
      ...(types !== undefined && { types: JSON.stringify(types) }),
      ...(impact !== undefined && { impact: impact || null }),
    },
  });

  return NextResponse.json({ ...risk, types: JSON.parse(risk.types) as string[] });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.risk.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
