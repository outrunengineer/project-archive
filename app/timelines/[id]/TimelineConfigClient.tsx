'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Save, Trash2, ChevronDown, ChevronUp, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { StatusChip } from '@/components/ui/StatusChip';
import { IconButton } from '@/components/ui/IconButton';
import { formatDate } from '@/lib/utils';

type Event = {
  id: number;
  name: string;
  date: string;
  description: string | null;
  type: string;
  impactSentiment: string;
  resourceCount: number | null;
  resourcesReturned: boolean;
  conclusionType: string | null;
  timelineId: number;
};

type Timeline = {
  id: number;
  name: string;
  description: string | null;
  isMain: boolean;
  branchName: string;
  projectId: number;
  project: {
    id: number;
    name: string;
    startDate: string;
    status: string;
    startingHeadcount: number;
    statusDate: string | null;
  };
  events: Event[];
};

type Sibling = {
  id: number;
  name: string;
  branchName: string;
  isMain: boolean;
  _count: { events: number };
};

const EVENT_TYPE_OPTIONS = [
  { value: 'DELIVERABLE', label: 'Deliverable' },
  { value: 'PRIORITY_CHANGE', label: 'Priority Change' },
  { value: 'STAFFING_CHANGE', label: 'Staffing Change' },
  { value: 'INITIATIVE', label: 'Initiative' },
  { value: 'KEY_DECISION', label: 'Key Decision' },
  { value: 'IMPEDIMENT', label: 'Impediment' },
  { value: 'FINISHED', label: 'Finished' },
];

const CONCLUSION_TYPE_OPTIONS = [
  { value: 'PAUSED', label: 'Paused' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'SUCCESSFUL', label: 'Successful' },
];

const SENTIMENT_OPTIONS = [
  { value: 'POSITIVE', label: 'Positive' },
  { value: 'NEGATIVE', label: 'Negative' },
  { value: 'NEUTRAL', label: 'Neutral' },
];

const STATUS_OPTIONS = [
  { value: 'Ongoing', label: 'Ongoing' },
  { value: 'Completed', label: 'Completed' },
  { value: 'On-Hold', label: 'On-Hold' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const SENTIMENT_CHIP_MAP: Record<string, 'positive' | 'negative' | 'neutral'> = {
  POSITIVE: 'positive',
  NEGATIVE: 'negative',
  NEUTRAL: 'neutral',
};

type NewEventDraft = {
  name: string;
  date: string;
  description: string;
  type: string;
  impactSentiment: string;
  resourceCount: string;
  resourcesReturned: boolean;
  conclusionType: string;
  timelineId: number;
};

function blankDraft(timelineId: number): NewEventDraft {
  return {
    name: '',
    date: '',
    description: '',
    type: 'DELIVERABLE',
    impactSentiment: 'NEUTRAL',
    resourceCount: '',
    resourcesReturned: false,
    conclusionType: 'PAUSED',
    timelineId,
  };
}

export function TimelineConfigClient({
  timeline,
  siblings,
}: {
  timeline: Timeline;
  siblings: Sibling[];
}) {
  const router = useRouter();

  /* ─── Project / timeline config state ─── */
  const [projectForm, setProjectForm] = useState({
    name: timeline.project.name,
    startDate: timeline.project.startDate.split('T')[0],
    status: timeline.project.status,
    startingHeadcount: timeline.project.startingHeadcount,
  });

  /* ─── Events state ─── */
  const [events, setEvents] = useState<Event[]>(timeline.events);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [drafts, setDrafts] = useState<{ [id: number]: Partial<Event> }>({});
  const [newEvent, setNewEvent] = useState<NewEventDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [newEventErrors, setNewEventErrors] = useState<{ name?: string; date?: string; general?: string }>({});
  const [configErrors, setConfigErrors] = useState<{ name?: string; startDate?: string; startingHeadcount?: string }>({});

  /* ─── Branch creation ─── */
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [branchName, setBranchName] = useState('');

  const branchOptions = siblings.map((s) => ({
    value: String(s.id),
    label: s.branchName + (s.isMain ? ' (Main)' : ''),
  }));

  /* ─── Filtering ─── */
  const filtered = events.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );
  const visibleEvents = showAll ? filtered : filtered.slice(0, 10);

  /* ─── Inline edit helpers ─── */
  const patchDraft = useCallback((id: number, field: string, value: unknown) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [field]: value } }));
  }, []);

  const eventValue = (event: Event, field: keyof Event) =>
    drafts[event.id]?.[field] !== undefined ? drafts[event.id][field] : event[field];

  /* ─── Save event row ─── */
  async function saveEvent(event: Event) {
    const patch = drafts[event.id];
    if (!patch || Object.keys(patch).length === 0) return;
    const res = await fetch(`/api/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...patch,
        date: patch.date ? new Date(patch.date as string).toISOString() : undefined,
        resourceCount:
          patch.resourceCount !== undefined
            ? patch.resourceCount === null || (patch.resourceCount as unknown) === ''
              ? null
              : Number(patch.resourceCount)
            : undefined,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setEvents((ev) => ev.map((e) => (e.id === event.id ? { ...e, ...updated, date: updated.date.split('T')[0] } : e)));
      setDrafts((d) => { const next = { ...d }; delete next[event.id]; return next; });
    }
  }

  /* ─── Delete event ─── */
  async function deleteEvent(id: number) {
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    setEvents((ev) => ev.filter((e) => e.id !== id));
  }

  /* ─── Add event ─── */
  async function addEvent() {
    if (!newEvent) return;
    const errors: typeof newEventErrors = {};
    if (!newEvent.name.trim()) errors.name = 'Required';
    if (!newEvent.date) errors.date = 'Required';
    if (Object.keys(errors).length > 0) {
      setNewEventErrors(errors);
      return;
    }
    setNewEventErrors({});
    try {
      const res = await fetch(`/api/timelines/${newEvent.timelineId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEvent,
          date: new Date(newEvent.date).toISOString(),
          resourceCount: newEvent.resourceCount ? Number(newEvent.resourceCount) : null,
          resourcesReturned: newEvent.resourcesReturned,
          conclusionType: newEvent.type === 'FINISHED' ? newEvent.conclusionType : null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        if (created.timelineId === timeline.id) {
          setEvents((ev) => [...ev, { ...created, date: created.date.split('T')[0] }].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          ));
        }
        setNewEvent(null);
        setNewEventErrors({});
      } else {
        const body = await res.json().catch(() => ({}));
        setNewEventErrors({ general: body.error ?? `Save failed (${res.status})` });
      }
    } catch {
      setNewEventErrors({ general: 'Network error — could not save event.' });
    }
  }

  /* ─── Save timeline/project config ─── */
  async function saveConfig() {
    const errors: typeof configErrors = {};
    if (!projectForm.name.trim()) errors.name = 'Project name is required.';
    if (!projectForm.startDate) errors.startDate = 'Start date is required.';
    if (!projectForm.startingHeadcount || projectForm.startingHeadcount < 1)
      errors.startingHeadcount = 'Headcount must be at least 1.';
    if (Object.keys(errors).length > 0) {
      setConfigErrors(errors);
      return;
    }
    setConfigErrors({});
    setSaving(true);
    try {
      await fetch(`/api/projects/${timeline.projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectForm.name,
          startDate: new Date(projectForm.startDate).toISOString(),
          status: projectForm.status,
          startingHeadcount: Number(projectForm.startingHeadcount),
        }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  /* ─── Delete branch ─── */
  async function deleteBranch(id: number) {
    if (!confirm('Delete this branch and all its events?')) return;
    const res = await fetch(`/api/timelines/${id}`, { method: 'DELETE' });
    if (res.ok) {
      // If we just deleted the branch we're currently on, redirect to main timeline
      if (id === timeline.id) {
        const main = siblings.find((s) => s.isMain);
        if (main) router.push(`/timelines/${main.id}`);
      } else {
        router.refresh();
      }
    }
  }

  /* ─── Create branch ─── */
  async function createBranch() {
    if (!branchName.trim()) return;
    await fetch(`/api/projects/${timeline.projectId}/timelines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: branchName, branchName }),
    });
    setShowBranchForm(false);
    setBranchName('');
    router.refresh();
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* ─── Left Panel ─── */}
      <aside className="w-72 shrink-0 bg-surface-container-low flex flex-col gap-8 px-6 py-8 overflow-y-auto">
        <div>
          <h2 className="font-display font-semibold text-sm text-on-surface-variant uppercase tracking-wider mb-4">
            General Configuration
          </h2>
          <div className="flex flex-col gap-4">
            <Input
              label="Project Name"
              value={projectForm.name}
              error={configErrors.name}
              onChange={(e) => { setConfigErrors((ce) => ({ ...ce, name: undefined })); setProjectForm((f) => ({ ...f, name: e.target.value })); }}
            />
            <Input
              label="Start Date"
              type="date"
              value={projectForm.startDate}
              error={configErrors.startDate}
              onChange={(e) => { setConfigErrors((ce) => ({ ...ce, startDate: undefined })); setProjectForm((f) => ({ ...f, startDate: e.target.value })); }}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={projectForm.status}
              onChange={(v) => setProjectForm((f) => ({ ...f, status: v }))}
            />
          </div>
        </div>

        <div>
          <h2 className="font-display font-semibold text-sm text-on-surface-variant uppercase tracking-wider mb-1">
            Initial Resources
          </h2>
          <p className="text-xs text-on-surface-variant mb-4">
            Baseline allocation at project inception.
          </p>
          <Input
            label="Starting Engineer Headcount"
            type="number"
            min={1}
            value={projectForm.startingHeadcount}
            error={configErrors.startingHeadcount}
            onChange={(e) => {
              setConfigErrors((ce) => ({ ...ce, startingHeadcount: undefined }));
              setProjectForm((f) => ({ ...f, startingHeadcount: Number(e.target.value) }));
            }}
          />
        </div>

        <div>
          <h2 className="font-display font-semibold text-sm text-on-surface-variant uppercase tracking-wider mb-4">
            Branches
          </h2>
          <div className="flex flex-col gap-2">
            {siblings.map((s) => (
              <div key={s.id} className="flex items-center group/branch">
                <Link
                  href={`/timelines/${s.id}`}
                  className={`flex-1 text-sm px-3 py-2 rounded-lg transition-colors ${
                    s.id === timeline.id
                      ? 'bg-surface-container-highest text-on-surface font-medium'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {s.branchName}{' '}
                  <span className="text-xs opacity-60">({s._count.events})</span>
                </Link>
                {!s.isMain && (
                  <IconButton
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    label="Delete branch"
                    size="sm"
                    onClick={() => deleteBranch(s.id)}
                    className="opacity-0 group-hover/branch:opacity-100 transition-opacity ml-1"
                  />
                )}
              </div>
            ))}
          </div>
          {showBranchForm ? (
            <div className="mt-3 flex flex-col gap-2">
              <Input
                placeholder="Branch name (e.g. RxEVO Lite)"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={createBranch}>Create</Button>
                <Button size="sm" variant="tertiary" onClick={() => setShowBranchForm(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowBranchForm(true)}
              className="mt-3 text-xs text-on-surface-variant hover:text-on-surface flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Branch
            </button>
          )}
        </div>
      </aside>

      {/* ─── Main Panel ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Events Manager Header */}
        <div className="px-8 py-6 bg-surface-container-highest flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-on-surface">
              {timeline.project.name}
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Chronological record of key architectural and staffing milestones.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Link href={`/timelines/${timeline.id}/view`}>
              <Button variant="secondary" size="sm">
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                View Timeline
              </Button>
            </Link>
          </div>
        </div>

        {/* Search + Add Event */}
        <div className="px-8 py-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant" />
            <input
              type="search"
              placeholder="Search event details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-surface-container-high rounded-md outline-none placeholder:text-on-surface-variant"
            />
          </div>
          <Button
            size="sm"
            onClick={() => setNewEvent(blankDraft(timeline.id))}
            disabled={!!newEvent}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Event
          </Button>
        </div>

        {/* Events Table */}
        <div className="flex-1 overflow-y-auto px-8 pb-4">
          {/* New event row */}
          {newEvent && (
            <div className="mb-4 bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-on-surface">New Event</h3>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Name"
                  placeholder="Event name"
                  value={newEvent.name}
                  error={newEventErrors.name}
                  onChange={(e) => { setNewEventErrors((er) => ({ ...er, name: undefined })); setNewEvent((n) => n && { ...n, name: e.target.value }); }}
                />
                <Input
                  label="Date"
                  type="date"
                  value={newEvent.date}
                  error={newEventErrors.date}
                  onChange={(e) => { setNewEventErrors((er) => ({ ...er, date: undefined })); setNewEvent((n) => n && { ...n, date: e.target.value }); }}
                />
                <Select
                  label="Branch"
                  options={branchOptions}
                  value={String(newEvent.timelineId)}
                  onChange={(v) => setNewEvent((n) => n && { ...n, timelineId: Number(v) })}
                />
              </div>
              <Textarea
                label="Description"
                rows={2}
                placeholder="Optional description…"
                value={newEvent.description}
                onChange={(e) => setNewEvent((n) => n && { ...n, description: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-3">
                <Select
                  label="Type"
                  options={EVENT_TYPE_OPTIONS}
                  value={newEvent.type}
                  onChange={(v) => setNewEvent((n) => n && { ...n, type: v })}
                />
                <Select
                  label="Impact"
                  options={SENTIMENT_OPTIONS}
                  value={newEvent.impactSentiment}
                  onChange={(v) => setNewEvent((n) => n && { ...n, impactSentiment: v })}
                />
                <Input
                  label="Headcount"
                  type="number"
                  placeholder="Optional"
                  value={newEvent.resourceCount}
                  onChange={(e) => setNewEvent((n) => n && { ...n, resourceCount: e.target.value })}
                />
              </div>
              {newEvent.type === 'FINISHED' && !siblings.find((s) => s.id === newEvent.timelineId)?.isMain && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-outline-variant">
                  <Select
                    label="Conclusion Type"
                    options={CONCLUSION_TYPE_OPTIONS}
                    value={newEvent.conclusionType}
                    onChange={(v) => setNewEvent((n) => n && { ...n, conclusionType: v })}
                  />
                  <div className="flex flex-col gap-[0.4rem]">
                    <span className="text-xs text-on-surface-variant font-medium">Resources Returned</span>
                    <label className="flex items-center gap-2 h-9 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newEvent.resourcesReturned}
                        onChange={(e) => setNewEvent((n) => n && { ...n, resourcesReturned: e.target.checked })}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <span className="text-sm text-on-surface">Return resources to project</span>
                    </label>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                {newEventErrors.general && (
                  <span className="text-xs text-red-500 mr-auto">{newEventErrors.general}</span>
                )}
                <Button variant="tertiary" size="sm" onClick={() => { setNewEvent(null); setNewEventErrors({}); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={addEvent}>
                  Save Event
                </Button>
              </div>
            </div>
          )}

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_120px_180px_80px_60px] gap-3 px-4 py-2 text-xs font-medium text-on-surface-variant uppercase tracking-wide">
            <span>Event Details</span>
            <span>Branch</span>
            <span>Impact & Type</span>
            <span>Headcount</span>
            <span></span>
          </div>

          {visibleEvents.length === 0 && !newEvent && (
            <div className="text-center py-12 text-on-surface-variant">
              <p className="text-sm">No events yet. Add your first event above.</p>
            </div>
          )}

          {visibleEvents.map((event) => {
            const siblingForEvent = siblings.find((s) => s.id === event.timelineId);
            return (
              <div
                key={event.id}
                className="grid grid-cols-[1fr_120px_180px_80px_60px] gap-3 px-4 py-3 rounded-xl hover:bg-surface-container-lowest transition-colors group items-start"
              >
                {/* Event Details */}
                <div className="flex flex-col gap-1.5">
                  <input
                    className="text-sm font-medium text-on-surface bg-transparent outline-none border-b border-transparent focus:border-outline-variant w-full"
                    value={String(eventValue(event, 'name') ?? '')}
                    onChange={(e) => patchDraft(event.id, 'name', e.target.value)}
                  />
                  <input
                    type="date"
                    className="text-xs text-on-surface-variant bg-transparent outline-none w-full"
                    value={String(eventValue(event, 'date') ?? '').split('T')[0]}
                    onChange={(e) => patchDraft(event.id, 'date', e.target.value)}
                  />
                  <textarea
                    rows={1}
                    className="text-xs text-on-surface-variant bg-transparent outline-none resize-none w-full"
                    placeholder="Description…"
                    value={String(eventValue(event, 'description') ?? '')}
                    onChange={(e) => patchDraft(event.id, 'description', e.target.value)}
                  />
                </div>

                {/* Branch */}
                <select
                  className="text-xs bg-surface-container-high rounded-md px-2 h-7 outline-none cursor-pointer"
                  value={String(eventValue(event, 'timelineId') ?? event.timelineId)}
                  onChange={(e) => patchDraft(event.id, 'timelineId', Number(e.target.value))}
                >
                  {siblings.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.branchName}
                    </option>
                  ))}
                </select>

                {/* Impact & Type */}
                <div className="flex flex-col gap-1">
                  <select
                    className="text-xs bg-surface-container-high rounded-md px-2 h-7 outline-none cursor-pointer"
                    value={String(eventValue(event, 'type') ?? event.type)}
                    onChange={(e) => patchDraft(event.id, 'type', e.target.value)}
                  >
                    {EVENT_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <StatusChip
                    variant={SENTIMENT_CHIP_MAP[String(eventValue(event, 'impactSentiment') ?? event.impactSentiment)]}
                    label={String(eventValue(event, 'impactSentiment') ?? event.impactSentiment)}
                  />
                  <select
                    className="text-xs bg-surface-container-high rounded-md px-2 h-7 outline-none cursor-pointer"
                    value={String(eventValue(event, 'impactSentiment') ?? event.impactSentiment)}
                    onChange={(e) => patchDraft(event.id, 'impactSentiment', e.target.value)}
                  >
                    {SENTIMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Headcount */}
                <input
                  type="number"
                  className="text-xs bg-surface-container-high rounded-md px-2 h-7 outline-none w-full"
                  placeholder="—"
                  value={String(eventValue(event, 'resourceCount') ?? '')}
                  onChange={(e) =>
                    patchDraft(event.id, 'resourceCount', e.target.value ? Number(e.target.value) : null)
                  }
                />

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconButton
                    icon={<Save className="w-3.5 h-3.5" />}
                    label="Save event"
                    size="sm"
                    onClick={() => saveEvent(event)}
                  />
                  <IconButton
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    label="Delete event"
                    size="sm"
                    onClick={() => deleteEvent(event.id)}
                  />
                </div>
              </div>
            );
          })}

          {/* Expandable footer */}
          {filtered.length > 10 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="w-full mt-2 py-3 text-xs text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1 transition-colors rounded-xl hover:bg-surface-container-lowest"
            >
              {showAll ? (
                <><ChevronUp className="w-3.5 h-3.5" /> Show fewer</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5" /> View Entire Archive History ({filtered.length} Events)</>
              )}
            </button>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="px-8 py-4 bg-surface-container-highest flex items-center justify-between">
          <Link
            href="/projects"
            className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            ← Back to Projects
          </Link>
          <div className="flex items-center gap-3">
            {Object.keys(configErrors).length > 0 && (
              <span className="text-xs text-red-500">Fix errors in the configuration panel before saving.</span>
            )}
            <Button variant="tertiary" onClick={() => { setConfigErrors({}); router.refresh(); }}>
              Discard Changes
            </Button>
            <Button onClick={saveConfig} disabled={saving || Object.keys(configErrors).length > 0}>
              {saving ? 'Saving…' : 'Save Timeline Configuration'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
