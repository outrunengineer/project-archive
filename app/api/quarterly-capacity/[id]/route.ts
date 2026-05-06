import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

const VALID_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const {
    fiscalYear,
    quarter,
    totalFte,
    platformFte,
    replacementFte,
    newFte,
    businessContinuityFte,
  } = body;

  if (quarter !== undefined && !VALID_QUARTERS.includes(quarter)) {
    return NextResponse.json(
      { error: `quarter must be one of ${VALID_QUARTERS.join(', ')}` },
      { status: 400 }
    );
  }

  const record = await prisma.quarterlyCapacity.update({
    where: { id: Number(id) },
    data: {
      ...(fiscalYear !== undefined && { fiscalYear: Number(fiscalYear) }),
      ...(quarter !== undefined && { quarter }),
      ...(totalFte !== undefined && { totalFte }),
      ...(platformFte !== undefined && { platformFte }),
      ...(replacementFte !== undefined && { replacementFte }),
      ...(newFte !== undefined && { newFte }),
      ...(businessContinuityFte !== undefined && { businessContinuityFte }),
    },
  });

  return NextResponse.json(record);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.quarterlyCapacity.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
