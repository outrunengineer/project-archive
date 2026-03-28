/**
 * @jest-environment node
 *
 * Database structure tests — verify schema correctness using an in-memory SQLite DB.
 * Each test suite shares one in-memory database; data is wiped between tests.
 */

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@/app/generated/prisma/client';
import { EventType, ImpactSentiment, BranchCloseMode } from '@/app/generated/prisma/enums';
import { readFileSync } from 'fs';
import { join } from 'path';

let prisma: PrismaClient;

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  const adapter = new PrismaBetterSqlite3({ url: ':memory:' });
  prisma = new PrismaClient({ adapter });

  // Enable foreign key enforcement (SQLite disables it by default)
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');

  // Apply the migration to create all tables
  const migrationSQL = readFileSync(
    join(process.cwd(), 'prisma/migrations/20260327025654_init/migration.sql'),
    'utf-8',
  );

  const statements = migrationSQL
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Delete in reverse FK order to avoid constraint violations
  await prisma.event.deleteMany();
  await prisma.timeline.deleteMany();
  await prisma.project.deleteMany();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createProject(overrides: Partial<Parameters<typeof prisma.project.create>[0]['data']> = {}) {
  return prisma.project.create({
    data: {
      name: 'Test Project',
      startDate: new Date('2024-01-01'),
      ...overrides,
    },
  });
}

async function createTimeline(projectId: number, overrides: Partial<Parameters<typeof prisma.timeline.create>[0]['data']> = {}) {
  return prisma.timeline.create({
    data: {
      name: 'Test Timeline',
      projectId,
      ...overrides,
    },
  });
}

async function createEvent(timelineId: number, overrides: Partial<Parameters<typeof prisma.event.create>[0]['data']> = {}) {
  return prisma.event.create({
    data: {
      name: 'Test Event',
      date: new Date('2024-06-01'),
      type: EventType.KEY_DECISION,
      timelineId,
      ...overrides,
    },
  });
}

// ---------------------------------------------------------------------------
// Project model
// ---------------------------------------------------------------------------

describe('Project model', () => {
  it('creates with required fields and applies defaults', async () => {
    const project = await createProject();

    expect(project.id).toBeGreaterThan(0);
    expect(project.name).toBe('Test Project');
    expect(project.startDate).toEqual(new Date('2024-01-01'));
    // defaults
    expect(project.status).toBe('Ongoing');
    expect(project.startingHeadcount).toBe(1);
    expect(project.statusDate).toBeNull();
    expect(project.createdAt).toBeInstanceOf(Date);
    expect(project.updatedAt).toBeInstanceOf(Date);
  });

  it('creates with all optional fields set', async () => {
    const statusDate = new Date('2025-01-01');
    const project = await createProject({
      status: 'Completed',
      startingHeadcount: 8,
      statusDate,
    });

    expect(project.status).toBe('Completed');
    expect(project.startingHeadcount).toBe(8);
    expect(project.statusDate).toEqual(statusDate);
  });

  it('updates and reflects changes', async () => {
    const project = await createProject();
    const updatedAt = project.updatedAt;

    // Ensure at least 1ms passes so updatedAt changes
    await new Promise((r) => setTimeout(r, 2));

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { name: 'Renamed Project' },
    });

    expect(updated.name).toBe('Renamed Project');
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(updatedAt.getTime());
  });

  it('deletes by id', async () => {
    const project = await createProject();
    await prisma.project.delete({ where: { id: project.id } });
    const found = await prisma.project.findUnique({ where: { id: project.id } });
    expect(found).toBeNull();
  });

  it('throws when required name is missing', async () => {
    await expect(
      prisma.project.create({
        // @ts-expect-error intentional: missing required field
        data: { startDate: new Date() },
      }),
    ).rejects.toThrow();
  });

  it('throws when required startDate is missing', async () => {
    await expect(
      prisma.project.create({
        // @ts-expect-error intentional: missing required field
        data: { name: 'No Date' },
      }),
    ).rejects.toThrow();
  });

  it('auto-increments ids independently', async () => {
    const a = await createProject({ name: 'Project A' });
    const b = await createProject({ name: 'Project B' });
    expect(b.id).toBeGreaterThan(a.id);
  });
});

// ---------------------------------------------------------------------------
// Timeline model
// ---------------------------------------------------------------------------

describe('Timeline model', () => {
  it('creates with required fields and applies defaults', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id);

    expect(timeline.id).toBeGreaterThan(0);
    expect(timeline.name).toBe('Test Timeline');
    expect(timeline.projectId).toBe(project.id);
    // defaults
    expect(timeline.isMain).toBe(true);
    expect(timeline.branchName).toBe('Main');
    expect(timeline.description).toBeNull();
    expect(timeline.branchCloseMode).toBeNull();
    expect(timeline.createdAt).toBeInstanceOf(Date);
    expect(timeline.updatedAt).toBeInstanceOf(Date);
  });

  it('creates with all optional fields set', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id, {
      description: 'Secondary branch',
      isMain: false,
      branchName: 'Feature Branch',
      branchCloseMode: BranchCloseMode.REMERGE,
    });

    expect(timeline.description).toBe('Secondary branch');
    expect(timeline.isMain).toBe(false);
    expect(timeline.branchName).toBe('Feature Branch');
    expect(timeline.branchCloseMode).toBe(BranchCloseMode.REMERGE);
  });

  it('accepts CLOSE as branchCloseMode', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id, {
      branchCloseMode: BranchCloseMode.CLOSE,
    });
    expect(timeline.branchCloseMode).toBe(BranchCloseMode.CLOSE);
  });

  it('throws when required name is missing', async () => {
    const project = await createProject();
    await expect(
      prisma.timeline.create({
        // @ts-expect-error intentional: missing required field
        data: { projectId: project.id },
      }),
    ).rejects.toThrow();
  });

  it('throws when projectId references a non-existent project', async () => {
    await expect(
      createTimeline(999999),
    ).rejects.toThrow();
  });

  it('belongs to the correct project', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id);
    expect(timeline.projectId).toBe(project.id);
  });
});

// ---------------------------------------------------------------------------
// Event model
// ---------------------------------------------------------------------------

describe('Event model', () => {
  it('creates with required fields and applies defaults', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id);
    const event = await createEvent(timeline.id);

    expect(event.id).toBeGreaterThan(0);
    expect(event.name).toBe('Test Event');
    expect(event.date).toEqual(new Date('2024-06-01'));
    expect(event.type).toBe(EventType.KEY_DECISION);
    expect(event.timelineId).toBe(timeline.id);
    // defaults
    expect(event.impactSentiment).toBe(ImpactSentiment.NEUTRAL);
    expect(event.description).toBeNull();
    expect(event.resourceCount).toBeNull();
    expect(event.createdAt).toBeInstanceOf(Date);
    expect(event.updatedAt).toBeInstanceOf(Date);
  });

  it('accepts all EventType values', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id);

    const types = Object.values(EventType);
    for (const type of types) {
      const event = await createEvent(timeline.id, { type, name: `Event ${type}` });
      expect(event.type).toBe(type);
    }
  });

  it('accepts all ImpactSentiment values', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id);

    const sentiments = Object.values(ImpactSentiment);
    for (const sentiment of sentiments) {
      const event = await createEvent(timeline.id, {
        impactSentiment: sentiment,
        name: `Event ${sentiment}`,
      });
      expect(event.impactSentiment).toBe(sentiment);
    }
  });

  it('stores optional description and resourceCount', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id);
    const event = await createEvent(timeline.id, {
      description: 'An important decision',
      resourceCount: 5,
    });

    expect(event.description).toBe('An important decision');
    expect(event.resourceCount).toBe(5);
  });

  it('throws when timelineId references a non-existent timeline', async () => {
    await expect(createEvent(999999)).rejects.toThrow();
  });

  it('throws when required fields are missing', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id);

    await expect(
      prisma.event.create({
        // @ts-expect-error intentional: missing required fields
        data: { timelineId: timeline.id },
      }),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Cascade deletes
// ---------------------------------------------------------------------------

describe('Cascade deletes', () => {
  it('deleting a Project cascades to its Timelines', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id);

    await prisma.project.delete({ where: { id: project.id } });

    const found = await prisma.timeline.findUnique({ where: { id: timeline.id } });
    expect(found).toBeNull();
  });

  it('deleting a Project cascades to all Events under its Timelines', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id);
    const event = await createEvent(timeline.id);

    await prisma.project.delete({ where: { id: project.id } });

    const found = await prisma.event.findUnique({ where: { id: event.id } });
    expect(found).toBeNull();
  });

  it('deleting a Timeline cascades to its Events', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id);
    const event = await createEvent(timeline.id);

    await prisma.timeline.delete({ where: { id: timeline.id } });

    const found = await prisma.event.findUnique({ where: { id: event.id } });
    expect(found).toBeNull();
  });

  it('deleting a Timeline does not delete the parent Project', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id);

    await prisma.timeline.delete({ where: { id: timeline.id } });

    const found = await prisma.project.findUnique({ where: { id: project.id } });
    expect(found).not.toBeNull();
  });

  it('multiple Timelines are all removed when Project is deleted', async () => {
    const project = await createProject();
    const t1 = await createTimeline(project.id, { name: 'Main' });
    const t2 = await createTimeline(project.id, { name: 'Branch', isMain: false });

    await prisma.project.delete({ where: { id: project.id } });

    const [found1, found2] = await Promise.all([
      prisma.timeline.findUnique({ where: { id: t1.id } }),
      prisma.timeline.findUnique({ where: { id: t2.id } }),
    ]);
    expect(found1).toBeNull();
    expect(found2).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

describe('Relationships', () => {
  it('queries Project with its Timelines', async () => {
    const project = await createProject();
    await createTimeline(project.id, { name: 'Main Timeline' });
    await createTimeline(project.id, { name: 'Branch Timeline', isMain: false });

    const result = await prisma.project.findUnique({
      where: { id: project.id },
      include: { timelines: true },
    });

    expect(result?.timelines).toHaveLength(2);
    expect(result?.timelines.map((t) => t.name)).toEqual(
      expect.arrayContaining(['Main Timeline', 'Branch Timeline']),
    );
  });

  it('queries Timeline with its Events', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id);
    await createEvent(timeline.id, { name: 'Event A', type: EventType.DELIVERABLE });
    await createEvent(timeline.id, { name: 'Event B', type: EventType.IMPEDIMENT });

    const result = await prisma.timeline.findUnique({
      where: { id: timeline.id },
      include: { events: true },
    });

    expect(result?.events).toHaveLength(2);
    expect(result?.events.map((e) => e.name)).toEqual(
      expect.arrayContaining(['Event A', 'Event B']),
    );
  });

  it('queries Project → Timelines → Events (nested include)', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id);
    await createEvent(timeline.id, { type: EventType.STAFFING_CHANGE });

    const result = await prisma.project.findUnique({
      where: { id: project.id },
      include: { timelines: { include: { events: true } } },
    });

    expect(result?.timelines).toHaveLength(1);
    expect(result?.timelines[0].events).toHaveLength(1);
    expect(result?.timelines[0].events[0].type).toBe(EventType.STAFFING_CHANGE);
  });

  it('queries Timeline with its parent Project', async () => {
    const project = await createProject({ name: 'Parent Project' });
    const timeline = await createTimeline(project.id);

    const result = await prisma.timeline.findUnique({
      where: { id: timeline.id },
      include: { project: true },
    });

    expect(result?.project.name).toBe('Parent Project');
  });

  it('filters Events by type on a Timeline', async () => {
    const project = await createProject();
    const timeline = await createTimeline(project.id);
    await createEvent(timeline.id, { type: EventType.STAFFING_CHANGE, name: 'Hire' });
    await createEvent(timeline.id, { type: EventType.IMPEDIMENT, name: 'Blocker' });
    await createEvent(timeline.id, { type: EventType.STAFFING_CHANGE, name: 'Departure' });

    const staffingEvents = await prisma.event.findMany({
      where: { timelineId: timeline.id, type: EventType.STAFFING_CHANGE },
    });

    expect(staffingEvents).toHaveLength(2);
    expect(staffingEvents.every((e) => e.type === EventType.STAFFING_CHANGE)).toBe(true);
  });
});
