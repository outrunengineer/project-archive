import { prisma } from '@/lib/db';
import { ProjectsClient } from './ProjectsClient';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { timelines: true } },
      timelines: { where: { isMain: true }, select: { id: true } },
    },
  });

  const serialized = projects.map((p) => ({
    ...p,
    startDate: p.startDate.toISOString(),
    statusDate: p.statusDate?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    mainTimelineId: p.timelines[0]?.id ?? null,
  }));

  return <ProjectsClient initialProjects={serialized} />;
}
