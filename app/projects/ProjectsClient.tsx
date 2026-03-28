'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Settings2, Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusChip } from '@/components/ui/StatusChip';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { formatDate, formatMonthYear } from '@/lib/utils';

type Project = {
  id: number;
  name: string;
  startDate: string;
  statusDate: string | null;
  status: string;
  startingHeadcount: number;
  createdAt: string;
  updatedAt: string;
  mainTimelineId: number | null;
  _count: { timelines: number };
};

const STATUS_OPTIONS = [
  { value: 'Ongoing', label: 'Ongoing' },
  { value: 'Completed', label: 'Completed' },
  { value: 'On-Hold', label: 'On-Hold' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const SENTIMENT_MAP: Record<string, 'positive' | 'negative' | 'neutral'> = {
  Ongoing: 'neutral',
  Completed: 'positive',
  'On-Hold': 'negative',
  Cancelled: 'negative',
};

export function ProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    status: 'Ongoing',
    startingHeadcount: 1,
  });
  const [saving, setSaving] = useState(false);

  async function createProject() {
    if (!form.name || !form.startDate) return;
    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ name: '', startDate: '', status: 'Ongoing', startingHeadcount: 1 });
        router.refresh();
        const data = await res.json();
        setProjects((prev) => [{ ...data, mainTimelineId: data.timelines?.[0]?.id ?? null }, ...prev]);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(id: number) {
    if (!confirm('Delete this project and all its data?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  function openTimeline(project: Project) {
    if (project.mainTimelineId) {
      router.push(`/timelines/${project.mainTimelineId}/view`);
    }
  }

  return (
    <div className="px-8 py-10 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-on-surface">Projects</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Project
        </Button>
      </div>

      {/* New Project Form */}
      {showForm && (
        <Card className="mb-6">
          <h2 className="font-display font-semibold text-base mb-4">New Project</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input
              label="Project Name"
              placeholder="e.g. Platform Modernization"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            />
            <Input
              label="Starting Headcount"
              type="number"
              min={1}
              value={form.startingHeadcount}
              onChange={(e) =>
                setForm((f) => ({ ...f, startingHeadcount: Number(e.target.value) }))
              }
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="tertiary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={createProject} disabled={saving || !form.name || !form.startDate}>
              {saving ? 'Creating…' : 'Create Project'}
            </Button>
          </div>
        </Card>
      )}

      {/* Project List */}
      <div className="flex flex-col gap-3">
        {projects.length === 0 && (
          <div className="text-center py-20 text-on-surface-variant">
            <p className="font-display text-xl font-semibold mb-2">No projects yet</p>
            <p className="text-sm">Create your first project to get started.</p>
          </div>
        )}
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-surface-container-lowest rounded-xl px-6 py-5 flex items-center gap-4 group hover:shadow-sm transition-shadow cursor-pointer"
            onClick={() => openTimeline(project)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="font-display font-semibold text-base text-on-surface truncate">
                  {project.name}
                </span>
                <StatusChip variant={SENTIMENT_MAP[project.status] ?? 'neutral'} label={project.status} />
              </div>
              <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                <span>Started {formatDate(project.startDate)}</span>
                {project.statusDate && (
                  <span>
                    {project.status} {formatMonthYear(project.statusDate)}
                  </span>
                )}
                <span>
                  {project._count.timelines} timeline{project._count.timelines !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {project.mainTimelineId && (
                <Link
                  href={`/timelines/${project.mainTimelineId}/view`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton
                    icon={<Eye className="w-4 h-4" />}
                    label="View project timeline"
                  />
                </Link>
              )}
              <IconButton
                icon={<Settings2 className="w-4 h-4" />}
                label="Open timeline config"
                onClick={(e) => {
                  e.stopPropagation();
                  if (project.mainTimelineId) router.push(`/timelines/${project.mainTimelineId}`);
                }}
              />
              <IconButton
                icon={<Trash2 className="w-4 h-4" />}
                label="Delete project"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteProject(project.id);
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
