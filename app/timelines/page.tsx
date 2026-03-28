import { prisma } from '@/lib/db';
import Link from 'next/link';
import { StatusChip } from '@/components/ui/StatusChip';

export const dynamic = 'force-dynamic';

export default async function TimelinesPage() {
  const timelines = await prisma.timeline.findMany({
    orderBy: [{ project: { name: 'asc' } }, { isMain: 'desc' }, { branchName: 'asc' }],
    include: {
      project: { select: { id: true, name: true, status: true } },
      _count: { select: { events: true } },
    },
  });

  const grouped = timelines.reduce<Record<string, typeof timelines>>((acc, t) => {
    const key = t.project.name;
    acc[key] = acc[key] ?? [];
    acc[key].push(t);
    return acc;
  }, {});

  const STATUS_MAP: Record<string, 'positive' | 'negative' | 'neutral'> = {
    Ongoing: 'neutral',
    Completed: 'positive',
    'On-Hold': 'negative',
    Cancelled: 'negative',
  };

  return (
    <div className="px-8 py-10 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-on-surface">Timelines</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          {timelines.length} timeline{timelines.length !== 1 ? 's' : ''} across{' '}
          {Object.keys(grouped).length} project{Object.keys(grouped).length !== 1 ? 's' : ''}
        </p>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-20 text-on-surface-variant">
          <p className="font-display text-xl font-semibold mb-2">No timelines yet</p>
          <p className="text-sm">
            <Link href="/projects" className="underline">Create a project</Link> to get started.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-8">
        {Object.entries(grouped).map(([projectName, tls]) => (
          <div key={projectName}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="font-display font-semibold text-base text-on-surface">{projectName}</h2>
              <StatusChip
                variant={STATUS_MAP[tls[0].project.status] ?? 'neutral'}
                label={tls[0].project.status}
              />
            </div>
            <div className="flex flex-col gap-2">
              {tls.map((t) => (
                <Link
                  key={t.id}
                  href={`/timelines/${t.id}`}
                  className="bg-surface-container-lowest rounded-xl px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow"
                >
                  <div>
                    <span className="font-medium text-sm text-on-surface">{t.branchName}</span>
                    {!t.isMain && (
                      <span className="ml-2 text-xs text-on-surface-variant">(branch)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-on-surface-variant">
                      {t._count.events} event{t._count.events !== 1 ? 's' : ''}
                    </span>
                    <Link
                      href={`/timelines/${t.id}/view`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-on-surface-variant hover:text-on-surface underline"
                    >
                      View
                    </Link>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
