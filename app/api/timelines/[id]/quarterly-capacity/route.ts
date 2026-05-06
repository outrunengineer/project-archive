import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

const VALID_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const records = await prisma.quarterlyCapacity.findMany({
    where: { timelineId: Number(id) },
    orderBy: [{ fiscalYear: 'asc' }, { quarter: 'asc' }],
  });
  return NextResponse.json(records);
}

export async function POST(req: NextRequest, { params }: Params) {
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

  if (!fiscalYear || !quarter) {
    return NextResponse.json(
      { error: 'fiscalYear and quarter are required' },
      { status: 400 }
    );
  }

  if (!VALID_QUARTERS.includes(quarter)) {
    return NextResponse.json(
      { error: `quarter must be one of ${VALID_QUARTERS.join(', ')}` },
      { status: 400 }
    );
  }

  const record = await prisma.quarterlyCapacity.upsert({
    where: {
      timelineId_fiscalYear_quarter: {
        timelineId: Number(id),
        fiscalYear: Number(fiscalYear),
        quarter,
      },
    },
    update: {
      totalFte: totalFte ?? 0,
      platformFte: platformFte ?? 0,
      replacementFte: replacementFte ?? 0,
      newFte: newFte ?? 0,
      businessContinuityFte: businessContinuityFte ?? 0,
    },
    create: {
      timelineId: Number(id),
      fiscalYear: Number(fiscalYear),
      quarter,
      totalFte: totalFte ?? 0,
      platformFte: platformFte ?? 0,
      replacementFte: replacementFte ?? 0,
      newFte: newFte ?? 0,
      businessContinuityFte: businessContinuityFte ?? 0,
    },
  });

  return NextResponse.json(record, { status: 201 });
}
