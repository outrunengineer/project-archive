# Project Archive — Development Plan

## Overview

This plan covers the full build of **Project Archive**: a historical project timeline tool for non-technical executive audiences. It expands the 7-phase outline in CLAUDE.md into concrete tasks with implementation steps and tests.

**What this plan covers:** Design system → App shell → API layer → Projects page → Timeline configuration → D3 visualization → Polish.

**What it doesn't cover:** Authentication (single-user tool, no auth), `/projects/[id]` detail page (deferred), multi-user or real-time concerns.

**Key assumptions:**
- Branches are sibling `Timeline` records (`isMain: false`) on the same project — one level deep only, multiple branches allowed per project. This models the real-world scenario of engineers being pulled from the main timeline onto parallel initiatives.
- The main timeline config page (`/timelines/[id]`) is the hub for a project — it loads all sibling branch timelines and surfaces them in a single event manager.
- Clicking a project card on the Projects page navigates to `/timelines/[id]` where `[id]` is the project's main timeline.
- **Branch lifecycle**: a branch requires an event to open (its first event is the branch origin) and an event to close. Close has two modes: **remerge** (the closing event's `resourceCount` folds the engineers back into the main timeline's headcount) or **close** (the branch simply stops; resources are not reabsorbed). This is stored as a `branchCloseMode: 'REMERGE' | 'CLOSE' | null` field on the Timeline — null while the branch is open.
- **"Project Timeline" nav tab**: only visible when the user is actively on the `/timelines/[id]/view` page. Hidden on all other routes.
- **`/timelines` page**: lists all timelines across all projects, grouped by project, alphabetical within each group.

---

## Architecture

### Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack routing + server actions in one framework; pages and API co-located |
| Styling | Tailwind CSS | Design tokens from DESIGN.md registered as Tailwind config values — single source of truth |
| Visualization | D3.js | Capacity band, branching lines, zoom/pan require full rendering control; no off-the-shelf library is adequate |
| ORM | Prisma | Type-safe DB access; SQLite → Postgres migration is a one-line config change |
| Database | SQLite (dev.db) | Zero infrastructure; appropriate for this scale |
| Fonts | next/font (Manrope + Inter) | DESIGN.md dual-font strategy: Manrope for display/headlines, Inter for body/labels |

### Project Structure

```
/app
  layout.tsx                  → Root layout: fonts, metadata, app shell wrapper
  page.tsx                    → Redirect to /projects
  globals.css                 → Tailwind base + CSS custom properties for design tokens
  /projects
    page.tsx                  → Projects list + inline create/edit
  /timelines
    page.tsx                  → All timelines list (Timelines nav tab)
    /[id]
      page.tsx                → Timeline Configuration (left panel + events manager)
      /view
        page.tsx              → D3 Timeline Visualization (read-only)
  /api
    /projects
      route.ts                → GET list, POST create
      /[id]
        route.ts              → PATCH update, DELETE delete
    /projects/[id]/timelines
      route.ts                → GET list (main + branches), POST create branch
    /timelines/[id]
      route.ts                → GET detail, PATCH update, DELETE delete
    /timelines/[id]/events
      route.ts                → GET list, POST create
    /events/[id]
      route.ts                → PATCH update, DELETE delete
    /timelines/[id]/risks
      route.ts                → GET list, POST create
    /risks/[id]
      route.ts                → PATCH update, DELETE delete

/components
  /timeline                   → D3 visualization components
    TimelineCanvas.tsx        → Root D3 SVG container with zoom/pan
    CapacityBand.tsx          → Shaded headcount region
    EventDots.tsx             → Colored dots by impact sentiment
    EventLabels.tsx           → Alternating above/below labels
    BranchLines.tsx           → Dashed branch lines
    TimelineControls.tsx      → Zoom slider, pan toggle, reset button
  /ui                         → Design system primitives
    Button.tsx
    Input.tsx
    Textarea.tsx
    Select.tsx
    StatusChip.tsx
    Card.tsx
    IconButton.tsx

/lib
  db.ts                       → Prisma client singleton
  utils.ts                    → Shared helpers (date formatting, headcount derivation)

/prisma
  schema.prisma               → Project → Timeline → Event data model (already defined)
```

### Data Model

```
Project
  id                Int       PK
  name              String
  startDate         DateTime
  status            String    "Ongoing" | "Completed" | "On-Hold" | "Cancelled"
  statusDate        DateTime? Required when status is Completed, On-Hold, or Cancelled.
                              Null when status is Ongoing. Stores the month+year the
                              project entered that status. Displayed as "Completed March 2025".
  startingHeadcount Int       Baseline for capacity line
  createdAt         DateTime
  updatedAt         DateTime
  timelines         Timeline[]

Timeline
  id              Int             PK
  name            String
  description     String?
  isMain          Boolean         true = main project timeline; false = branch
  branchName      String          "Main" for main; branch label (e.g. "RxEVO Lite") for branches
  branchCloseMode BranchCloseMode null = open branch; REMERGE = closing event folds
                                  headcount back into main; CLOSE = branch ends, no reabsorption
  projectId       Int             FK → Project
  createdAt       DateTime
  updatedAt       DateTime
  events          Event[]

enum BranchCloseMode {
  REMERGE   // closing event's resourceCount is added back to the main timeline headcount
  CLOSE     // branch line ends at the closing event; engineers not tracked back to main
}

Event
  id              Int              PK
  name            String
  date            DateTime
  description     String?
  type            EventType        DELIVERABLE | PRIORITY_CHANGE | STAFFING_CHANGE
                                   | INITIATIVE | KEY_DECISION | IMPEDIMENT
  impactSentiment ImpactSentiment  POSITIVE | NEGATIVE | NEUTRAL
  resourceCount   Int?             Headcount snapshot at this event
  timelineId      Int              FK → Timeline (main or branch)
  createdAt       DateTime
  updatedAt       DateTime
```

Risk
  id          Int       PK
  name        String    User-defined label shown on the visualization
  startDate   DateTime  Start of the risk period
  endDate     DateTime? Null when status is Ongoing; column extends to today in that case
  status      String    "Ongoing" | "Completed"
  severity    String    "LOW" | "MEDIUM" | "HIGH"
  types       String    JSON array stored as text: e.g. '["RESOURCE","DEPENDENCY"]'
                        Valid values: "RESOURCE" | "DEPENDENCY" | "TECHNICAL" | "SCOPE"
  timelineId  Int       FK → Timeline (main timeline only — risks belong to the main timeline)
  createdAt   DateTime
  updatedAt   DateTime

**Capacity line derivation:** The capacity line is not stored — it is derived at render time from `project.startingHeadcount` + all `STAFFING_CHANGE` events across the main timeline, sorted by date, where `resourceCount` is the new headcount at that point. For REMERGE branch closes, the closing event's `resourceCount` is added back to the running headcount at that date.

**Schema migration needed:** Add `branchCloseMode` enum and field to the `Timeline` model in `prisma/schema.prisma` before running migrations. Also add the `Risk` model in the same migration pass.

### API Surface

| Method | Path | Reads/Writes | Used By |
|---|---|---|---|
| GET | /api/projects | List all projects | Projects page |
| POST | /api/projects | Create project | Projects page (new project form) |
| PATCH | /api/projects/[id] | Update project name/status/startDate | Projects page (inline edit) |
| DELETE | /api/projects/[id] | Delete project + cascade | Projects page |
| GET | /api/projects/[id]/timelines | List timelines for a project (main + branches) | Timeline config page |
| POST | /api/projects/[id]/timelines | Create a branch timeline | Timeline config branch dropdown |
| GET | /api/timelines | All timelines across all projects, with project info | Timelines list page |
| GET | /api/timelines/[id] | Timeline detail + project | Timeline config, timeline view header |
| PATCH | /api/timelines/[id] | Update timeline name/description | Timeline config left panel |
| DELETE | /api/timelines/[id] | Delete timeline (branch only — main is protected) | Timeline config |
| GET | /api/timelines/[id]/events | List all events for a timeline | Timeline config events table, D3 view |
| POST | /api/timelines/[id]/events | Create event on a timeline | Timeline config add event |
| PATCH | /api/events/[id] | Update event fields | Timeline config inline row save |
| DELETE | /api/events/[id] | Delete event | Timeline config row delete |
| GET | /api/timelines/[id]/risks | List all risks for a timeline | Timeline config Risks tab, D3 view |
| POST | /api/timelines/[id]/risks | Create a risk | Timeline config Risks tab add row |
| PATCH | /api/risks/[id] | Update risk fields | Timeline config Risks tab row save |
| DELETE | /api/risks/[id] | Delete risk | Timeline config Risks tab row delete |

### Dependency Map

```
SQLite DB
  ↓ (Prisma schema)
Prisma Client (app/generated/prisma)
  ↓
lib/db.ts
  ↓
API Routes (/app/api/...)
  ↓
Pages + D3 Components
  ↓
App Shell (layout, nav, sidebar)
  ↓
Design System (components/ui) ← Tailwind tokens (globals.css / tailwind.config)
```

Build order: design tokens → UI components → app shell → API routes → pages → D3 visualization.

### Key Technical Decisions

- **D3 over a chart library**: Capacity band shading, branching dashed lines, and zoom/pan require SVG primitives — Recharts, Victory, etc. can't express this layout.
- **SQLite**: Zero-infrastructure local tool. Prisma makes Postgres migration a one-line provider change.
- **Server Actions vs. Route Handlers**: Using REST route handlers (not server actions) to keep the API layer explicit and testable independently of Next.js.
- **Capacity derived at render time**: Storing a "current headcount" as a derived value (not a column) prevents data duplication and ensures consistency when events are reordered or deleted.
- **Branches as sibling Timelines**: Rather than a `parentTimelineId` for nesting, branches are flat siblings under a project. This simplifies queries and matches the one-level-deep requirement.

---

## Development Phases

---

## Phase 1 — Design System (`/components/ui`)

Establish the visual foundation. Every subsequent phase consumes these primitives. Building them first ensures consistent design token usage and prevents rework.

### Task 1.1 — Install Fonts and Register Design Tokens

Replace the Next.js default Geist fonts with Manrope + Inter as specified in DESIGN.md. Register all DESIGN.md color tokens in `tailwind.config.ts` and expose them as CSS custom properties in `globals.css`.

#### Steps
- Install `@next/font` is already available via `next/font`. Add `Manrope` and `Inter` to `app/layout.tsx` using `next/font/google`, replacing the Geist imports.
- Set `--font-display: Manrope` and `--font-body: Inter` as CSS variables in the `<html>` element.
- In `tailwind.config.ts`, extend `theme.colors` with the full DESIGN.md palette: `primary` (#000000), `secondary` (#545e76), `surface` (#f8f9fa), `surface-container-low`, `surface-container-lowest` (#ffffff), `surface-container-high`, `surface-container-highest`, `surface-bright`, `surface-tint`, `surface-variant`, `outline-variant`, `on-surface`, `on-surface-variant` (#44474c), `on-primary`, `on-primary-container`, `primary-fixed`, `primary-fixed-dim` (#648d78), `tertiary-fixed`, `tertiary-fixed-dim`, `on-tertiary-fixed-variant`, `inverse-surface`.
- Extend `theme.fontFamily` with `display: ['Manrope', ...]` and `body: ['Inter', ...]`.
- Extend `theme.fontSize` with the DESIGN.md type scale: `display-lg` (3.5rem), `display-sm` (2.25rem), `headline`, `title-lg`, `body-sm` (0.75rem), `label-md` (0.75rem).
- Extend `theme.spacing` with named scale values from DESIGN.md (`spacing-2` → 0.4rem, `spacing-4` → 0.9rem, `spacing-12` → 2.75rem, `spacing-16` → 3.5rem).
- Update `app/layout.tsx` metadata: title "Project Archive", description matching the app purpose.

#### Automated Tests
- Visual smoke test: render a page and assert `font-family` on `<body>` includes "Inter".
- Assert Tailwind config exports `colors.primary` as `#000000`.
- Assert `colors['surface-container-lowest']` is `#ffffff`.

#### Test Correctness Checks
- Font test: check that `next/font` injects the CSS variable, not just that the variable is referenced in the class.
- Color token test: this is a config value check, not a render test — sufficient to verify the config object directly without a browser.

---

### Task 1.2 — Button Component

Build the `Button` component with three variants: primary, secondary, tertiary.

#### Steps
- Primary: `bg-primary text-on-primary rounded-md`, with a `135deg` linear gradient from `primary` to `primary-fixed-dim` (the "silk finish" from DESIGN.md).
- Secondary: `bg-surface-container-high text-on-surface rounded-md`, no border.
- Tertiary: text-only, `text-primary-fixed-dim`, no background or border.
- Accept `variant`, `size` (default/sm), `disabled`, `onClick`, `type`, `children` props.
- Disabled state: `opacity-50 cursor-not-allowed`.

#### Automated Tests
- Renders all three variants without throwing.
- Primary button has a gradient background class.
- Disabled button does not call `onClick`.
- Snapshot test for each variant.

#### Test Correctness Checks
- The gradient test should check for the actual CSS gradient string in the style or className, not just that the element rendered.
- `onClick` suppression: simulate a click on a disabled button and assert the mock was not called.

---

### Task 1.3 — Input, Textarea, Select Components

Build form primitive components matching the DESIGN.md input spec.

#### Steps
- **Input**: `bg-surface-container-high` default fill; on focus switch to `bg-surface-container-lowest` with a 1px "ghost border" using `surface-tint` (the "Active State" from DESIGN.md). Label positioned above using `label-md` in `on-surface-variant`.
- **Textarea**: Same styling as Input; accepts `rows` prop.
- **Select**: Styled dropdown matching Input appearance. Accepts `options: { value, label }[]`, `value`, `onChange`, `placeholder`. On open, use an extra-diffused ambient shadow (`0 20px 40px rgba(25, 28, 29, 0.06)`).
- All three: accept `label`, `id`, `error`, `disabled`, `className` props. Error state renders error text in `tertiary-fixed-dim`.

#### Automated Tests
- Input renders label text above the field.
- Input applies focus class change on focus event.
- Select renders all options.
- Select calls `onChange` with the correct value.
- Textarea respects `rows` prop.

#### Test Correctness Checks
- Focus class test: simulate `focus` event and assert className contains the active-state class. Don't test via CSS computed style (not available in jsdom).
- Select `onChange`: use a real event simulation (fireEvent or userEvent), not just calling the prop directly.

---

### Task 1.4 — StatusChip Component

Render impact sentiment and event type labels as styled chips.

#### Steps
- Accept `variant: 'positive' | 'negative' | 'neutral' | 'custom'` and `label: string`.
- Positive: `bg-primary-fixed text-on-primary-container rounded-full`.
- Negative: `bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-full`.
- Neutral: `bg-surface-container-high text-on-surface-variant rounded-full`.
- Custom: `bg-surface-container-high text-on-surface rounded-full` (for event type chips).
- Use `label-md` font size. Include optional `icon` slot (for arrow indicators).
- Positive impact: ↑ upward arrow. Negative: ↓ downward arrow. Neutral: ↕ double arrow.

#### Automated Tests
- Each variant renders the correct label.
- Positive chip contains an upward arrow indicator.
- Negative chip contains a downward arrow indicator.
- Snapshot test for each variant.

#### Test Correctness Checks
- Arrow tests: assert the arrow character or icon is in the rendered output, not just that the chip rendered. This is functional — the arrows are the visual language the stakeholder audience reads.

---

### Task 1.5 — Card and IconButton Components

#### Steps
- **Card**: Surface container with `bg-surface-container-lowest` on `bg-surface-container-low` background (tonal layering, no border). Accepts `children`, optional `header` slot, `className`. Use `spacing-12` for section separation.
- **IconButton**: Circular button wrapping an SVG icon. Accepts `icon`, `label` (for aria-label), `onClick`, `variant` (ghost/filled), `size`.
- Provide icon wrappers for: save (floppy disk), delete (trash), bell (notification), gear (settings), search (magnifying glass), avatar (person), download (arrow-down), add (+). Use inline SVGs or a minimal icon library (e.g., `lucide-react` — already lightweight).

#### Automated Tests
- Card renders children and header slot.
- IconButton fires `onClick` on click.
- IconButton has an accessible `aria-label`.

#### Test Correctness Checks
- aria-label test: assert the attribute is present on the button element, not just that the component mounted.

---

## Phase 2 — App Shell & Layout

Provides the navigation frame that wraps every page. All pages depend on this.

### Task 2.1 — Root Layout with Top Navigation

#### Steps
- Update `app/layout.tsx` to render a top nav bar with: app name "Project Archive" (left), tab links `Projects | Timelines | Project Timeline` (center-left), global search bar "Search Project Entities..." (right), bell icon, gear icon, user avatar.
- Active tab: bold underline, driven by `usePathname()`. Tab routing: Projects → `/projects`, Timelines → `/timelines`, Project Timeline → `/timelines/[last-viewed-id]/view` (or `/projects` if no ID in context — use a simple localStorage key for last-viewed timeline ID).
- Top nav height: fixed, `bg-surface-container-highest` (no border — tonal shift only, per no-line rule).
- Fonts: `font-display` (Manrope) for the app name; `font-body` (Inter) for nav tabs and search.
- **"Project Timeline" tab visibility**: only render this tab when `usePathname()` matches `/timelines/[id]/view`. On all other routes, the tab is not rendered (not just inactive — absent from the DOM). When it is visible, it links to the current view URL.
- Global search bar: input styled per Task 1.3. Wired to search in Phase 7.

#### Automated Tests
- Top nav renders all three tab links.
- Active tab has the active class when pathname matches.
- App name "Project Archive" is present in the nav.

#### Test Correctness Checks
- Active tab test: mock `usePathname` to return `/projects`, assert that the Projects tab has the active class and the others don't.

---

### Task 2.2 — Collapsible Left Sidebar

The sidebar appears in the Timeline visualization view. It holds icon-based navigation and the download button.

#### Steps
- Implement as a fixed-position left sidebar component, collapsed by default (icon-only, ~48px wide), expandable to a labeled list (~200px).
- Glassmorphism style: `bg-surface-variant/80 backdrop-blur-[12px]` (DESIGN.md spec). This lets the timeline colors bleed through.
- Icons: timeline view (chart), project overview (folder), settings (gear). Download button pinned to bottom.
- Toggle: a collapse/expand arrow button at the top of the sidebar.
- The sidebar is only rendered in the timeline view layout (`/timelines/[id]/view`). Use a nested layout file at `app/timelines/[id]/view/layout.tsx`.

#### Automated Tests
- Sidebar renders in collapsed state by default.
- Clicking the toggle button expands the sidebar.
- Download button is present and has an accessible label.

#### Test Correctness Checks
- Collapsed/expanded test: check width class or aria-expanded attribute, not visual pixel width.

---

## Phase 3 — API Routes & Server Actions

All page data fetching depends on these. Build and test them before building pages.

### Task 3.1 — Projects API (`/api/projects`, `/api/projects/[id]`)

#### Steps
- `GET /api/projects`: Return all projects with `id`, `name`, `status`, `startDate`, `startingHeadcount`, `_count.timelines`. Order by `createdAt` descending.
- `POST /api/projects`: Validate `name` (required, non-empty), `startDate` (required, valid date), `status` (optional, default "Ongoing", must be one of: Ongoing, Completed, On-Hold, Cancelled), `statusDate` (required when status is not Ongoing; must be a valid date; null/omitted when status is Ongoing), `startingHeadcount` (optional, default 1, must be ≥ 1). Create project. Also create a main Timeline record (`isMain: true`, `branchName: "Main"`, `name` = project name) in the same transaction, so every project always has a main timeline.
- `PATCH /api/projects/[id]`: Accept partial updates to `name`, `status`, `statusDate`, `startDate`, `startingHeadcount`. If `status` is patched to Ongoing, server must set `statusDate` to null. If `status` is patched to Completed/On-Hold/Cancelled, `statusDate` is required. Return 404 if not found.
- `DELETE /api/projects/[id]`: Cascade deletes handled by Prisma schema. Return 404 if not found.

#### Automated Tests
- GET returns an array (empty or populated).
- POST with valid body creates a project and its main Timeline, returns 201.
- POST with missing `name` returns 400.
- POST with `startingHeadcount: 0` returns 400.
- POST with `status: "Completed"` and no `statusDate` returns 400.
- POST with `status: "Ongoing"` and a `statusDate` provided still creates the project with `statusDate: null` (server enforces the null).
- PATCH updates only the provided fields (non-provided fields unchanged).
- PATCH setting `status` to Ongoing clears `statusDate` to null automatically.
- PATCH setting `status` to Completed without `statusDate` returns 400.
- PATCH on non-existent ID returns 404.
- DELETE removes the project and its cascade records.
- DELETE on non-existent ID returns 404.

#### Test Correctness Checks
- POST test: after creating a project, query the DB and assert the main Timeline was also created with `isMain: true`.
- PATCH partial update: set only `name`, then assert `status` is unchanged from its original value.
- `statusDate` auto-null test: PATCH `status: "Ongoing"` on a Completed project, then re-fetch and assert `statusDate` is null in the DB — not just in the response.
- Cascade DELETE: after deleting a project, assert that Timeline and Event records with that `projectId` no longer exist.

---

### Task 3.2 — Timelines API (`/api/projects/[id]/timelines`, `/api/timelines/[id]`)

#### Steps
- `GET /api/timelines`: Return all timelines across all projects, each including `project { id, name }` and `_count.events`. Order: by `project.name` ascending, then `timeline.name` ascending within each project.
- `GET /api/projects/[id]/timelines`: Return all timelines for a project (main + all branches), including `_count.events`. Order: main first, then branches by `createdAt`.
- `POST /api/projects/[id]/timelines`: Create a branch timeline (`isMain: false`). Require `branchName` (non-empty, unique within the project). Return 409 if `branchName` already exists on this project.
- `GET /api/timelines/[id]`: Return timeline detail including `project` (id, name, startDate, startingHeadcount, status).
- `PATCH /api/timelines/[id]`: Update `name`, `description`, `branchName`. Reject updates that would change `isMain`. Reject `branchName` change on main timeline.
- `DELETE /api/timelines/[id]`: Reject if `isMain: true` (main timeline cannot be deleted independently — delete the project instead). Return 403 with a clear message.

#### Automated Tests
- GET timelines returns main timeline first.
- POST branch creates a timeline with `isMain: false`.
- POST branch with duplicate `branchName` on same project returns 409.
- PATCH updates `branchName` on a branch timeline.
- PATCH attempting to set `isMain: false` on a main timeline returns 400.
- DELETE on a main timeline returns 403.
- DELETE on a branch timeline removes it and its events.

#### Test Correctness Checks
- "Main first" ordering: seed a project with a branch created before the main, assert main still appears first.
- Duplicate branchName: test same project, different `branchName` (should succeed) vs. same `branchName` on same project (should 409).

---

### Task 3.3 — Events API (`/api/timelines/[id]/events`, `/api/events/[id]`)

#### Steps
- `GET /api/timelines/[id]/events`: Return all events for a timeline, ordered by `date` ascending.
- `POST /api/timelines/[id]/events`: Validate `name` (required), `date` (required, valid date), `type` (required, must be a valid `EventType` enum value), `impactSentiment` (optional, default NEUTRAL), `description` (optional), `resourceCount` (optional, ≥ 0 if provided).
- `PATCH /api/events/[id]`: Accept partial updates to any event field. Return 404 if not found. Validate same rules as POST for any provided fields.
- `DELETE /api/events/[id]`: Return 404 if not found.

#### Automated Tests
- GET returns events sorted by date ascending.
- POST creates an event with all required fields, returns 201.
- POST with invalid `type` value returns 400.
- POST with missing `name` returns 400.
- PATCH updates `resourceCount` without affecting other fields.
- PATCH with invalid `type` returns 400.
- DELETE removes the event and returns 200.
- DELETE on non-existent event returns 404.

#### Test Correctness Checks
- Date ordering test: create events out of order, assert GET returns them in date order.
- Partial PATCH: create an event, PATCH only `description`, re-fetch and assert `name`, `type`, `date` are unchanged.
- Invalid type: use a string not in the EventType enum. This tests server-side validation, not just TypeScript types.

---

## Phase 4 — Projects Page (`/app/projects`)

First end-to-end vertical slice. Connects the API to the UI.

### Task 4.1 — Projects List

#### Steps
- Fetch projects via `GET /api/projects` (use `fetch` in a server component for initial load).
- Render project cards in a responsive grid. Each card: project name (`title-lg`, Manrope), status chip (using StatusChip from Task 1.4), start date, timeline count badge.
- **Status display**: Ongoing → "ONGOING" chip (neutral variant). Completed/On-Hold/Cancelled → chip label includes the month and year from `statusDate`, e.g. "COMPLETED MARCH 2025", "ON-HOLD JUNE 2024". Format `statusDate` as `MMMM YYYY` (full month name + 4-digit year).
- Clicking a card navigates to `/timelines/[mainTimelineId]` — include the main timeline's `id` in the project list response (add it to the GET response as `mainTimelineId`).
- Empty state: centered illustration + "No projects yet. Create your first project." with a primary Create button.
- Loading state: skeleton card placeholders (3 cards, matching card dimensions).

#### Automated Tests
- Renders a card for each project in the mock response.
- Empty state renders when response is an empty array.
- Each card links to `/timelines/[mainTimelineId]`.
- Status chip variant matches project status.

#### Test Correctness Checks
- Card link test: assert `href` attribute is `/timelines/{mainTimelineId}`, not just that a link exists.
- Empty state test: assert the empty-state text appears, not just that the page renders without error.

---

### Task 4.2 — Inline Project Create/Edit

#### Steps
- "New Project" button (primary, top-right of page) reveals an inline form (slide-down or modal using `surface_bright` with glassmorphism per DESIGN.md).
- Form fields: Project Name (Input), Start Date (Input type="date"), Status (Select with options: Ongoing, Completed, On-Hold, Cancelled), Starting Headcount (Input type="number", min=1).
- **Status Date field**: conditionally rendered immediately below the Status select. Hidden when Status is "Ongoing". Visible (and required) when Status is Completed, On-Hold, or Cancelled. Uses a month+year picker: a Select for month (January–December) + a number Input for year. On submit, combine into a `statusDate` DateTime (first of the selected month, e.g. `2025-03-01`).
- Submit calls `POST /api/projects`. On success: optimistically add the card, close the form, navigate to the new main timeline.
- Clicking the edit icon (pencil/gear) on a card opens the same form pre-populated for that project. Submit calls `PATCH /api/projects/[id]`.
- Clicking the delete icon on a card: confirm dialog ("Delete [Project Name]? This will remove all timelines and events."), then calls `DELETE /api/projects/[id]`, removes the card.

#### Automated Tests
- "New Project" button opens the create form.
- Submitting an empty name shows a validation error.
- Status Date field is not rendered when Status is "Ongoing".
- Status Date field appears when Status is changed to "Completed", "On-Hold", or "Cancelled".
- Submitting with Status "Completed" and no status date shows a validation error.
- Submitting a valid form calls POST and closes the form.
- Edit form pre-populates with existing project data, including status and status date month/year.
- Changing status to Ongoing in the edit form hides the status date and sends `statusDate: null`.
- Delete confirm dialog appears before the delete API is called.
- Cancelling the delete dialog does not call the delete API.

#### Test Correctness Checks
- Validation error test: submit with empty name, assert error message is shown before any API call is made.
- Status Date conditional: use `userEvent.selectOptions` to change the status select, then assert the status date inputs appear/disappear.
- Optimistic update: after POST resolves, assert the new card appears in the list without a full page reload.

---

### Task 4.3 — Timelines List Page (`/app/timelines`)

The "Timelines" nav tab destination. Shows all timelines across all projects for quick access.

#### Steps
- Fetch via `GET /api/timelines` (new endpoint: return all timelines joined with their project, sorted by project name then timeline name).
- Render grouped by project: project name as a group header (`title-lg`, Manrope), then timeline cards beneath it. Within each group, timelines are sorted alphabetically.
- Each timeline card: timeline name, branch indicator (main vs. branch label), event count, last updated date.
- Clicking a timeline card navigates to `/timelines/[id]` (config page).
- Empty state: "No timelines yet. Create a project to get started." with a link to `/projects`.

#### Automated Tests
- Timelines render grouped under their project name.
- Within a group, timelines are in alphabetical order.
- Each card links to `/timelines/[id]`.
- Empty state renders when no timelines exist.

---

## Phase 5 — Timeline Configuration Page (`/app/timelines/[id]`)

The primary data-entry interface. Must be fully functional before the visualization has anything to render.

### Task 5.1 — Left Panel: General Configuration

#### Steps
- Fetch timeline detail + project via `GET /api/timelines/[id]`.
- Render: Project Name (Input, bound to `project.name`), Start Date (Input date, `project.startDate`), Status (Select, `project.status`).
- These fields save to `PATCH /api/projects/[projectId]` on the "Save Timeline Configuration" action (Phase 5.4), not on each keystroke.
- Render below: **Initial Resources** section — "Starting Engineer Headcount" (Input number, `project.startingHeadcount`) with helper text "Baseline allocation at project inception."

#### Automated Tests
- Fields render with pre-populated values from the fetched timeline/project.
- Changing a field value updates the local form state.
- Helper text "Baseline allocation at project inception." is present.

---

### Task 5.2 — Timeline Events Manager Table

The main panel. Shows all events across the main timeline and all branch timelines for this project.

#### Steps
- Fetch all timelines for the project via `GET /api/projects/[projectId]/timelines` (to get branch list for dropdown).
- Fetch events for each timeline, or add a query param `?allBranches=true` to return events across all timelines for the project (add this as a convenience endpoint: `GET /api/projects/[id]/events` — return all events across all timelines, including their `timelineId`).
- Render a table with columns: **Event Details** (name input, date input, description textarea), **Branch** (Select dropdown — options: "Main" + each branch name, mapped to their timeline IDs), **Impact & Type** (type Select + impact StatusChip), **Resources** (number input for `resourceCount`), **Actions** (save icon, delete icon).
- Each row is independently editable in-place. Save icon: calls `PATCH /api/events/[id]`. Delete icon: calls `DELETE /api/events/[id]` with a confirm prompt.
- Search bar: "Search event details..." — filters visible rows client-side by event name or description.
- "+ Add Event" button: appends a blank row at the top, pre-filled with today's date and Main branch. Does not persist until the save icon is clicked (calls `POST /api/timelines/[timelineId]/events`).

#### Automated Tests
- Events table renders one row per event.
- Search filters rows by event name (case-insensitive).
- Search with no matches shows "No events found" state.
- "+ Add Event" adds a blank row without an API call.
- Saving a new row calls POST with the correct `timelineId` for the selected branch.
- Saving an existing row calls PATCH with only changed fields.
- Delete icon shows a confirm dialog before DELETE is called.
- Changing the Branch select on a row updates `timelineId` on save.

#### Test Correctness Checks
- `timelineId` routing: test that selecting "RxEVO Lite" in the Branch dropdown and saving the row calls `POST /api/timelines/[branchTimelineId]/events`, not the main timeline ID.
- Search: test with a search term that matches 2 of 5 events — assert exactly 2 rows are visible.

---

### Task 5.3 — Branch Management

#### Steps
- The Branch dropdown in the events table is populated from the project's timelines.
- Add a "Manage Branches" action (link or icon near the Branch column header) that opens a small panel/modal listing existing branches with rename and delete actions, plus a "New Branch" input.
- New Branch: calls `POST /api/projects/[id]/timelines` with the entered `branchName`. On success, the new branch appears in all Branch dropdowns immediately. A branch has no line on the visualization until it has at least one event.
- **Branch close**: each branch row in the management panel has a "Close Branch" action. Closing requires the branch to have at least one event (the close event). Presents two options: **Remerge** (resources fold back into main — sets `branchCloseMode: REMERGE` on the Timeline) or **Close** (branch ends without reabsorption — sets `branchCloseMode: CLOSE`). Calls `PATCH /api/timelines/[branchId]`.
- Branch delete: calls `DELETE /api/timelines/[branchId]`. Show a warning: "This will also delete all events on this branch." Use a confirm dialog.

#### Automated Tests
- New branch input calls the correct POST endpoint.
- Duplicate branch name shows a 409 error message.
- Deleting a branch shows a warning message before the API call.
- After deletion, the branch is removed from the Branch dropdown options.

---

### Task 5.4 — Expandable Archive Footer + Action Bar

#### Steps
- Footer row: "View Entire Archive History (N Events)" — N is the total count across all timelines. Clicking expands to show a read-only summary list of all events (name, date, type).
- Bottom action bar (sticky to page bottom):
  - "← Back to Overview" → `/projects`
  - "Discard Changes" (tertiary button) → resets form state to the last-fetched values
  - "Save Timeline Configuration" (primary button) → calls `PATCH /api/projects/[projectId]` with the General Configuration form values + `PATCH /api/timelines/[id]` for the timeline name/description. Individual event saves are handled per-row (Task 5.2).
- On save success: show a transient success toast. On failure: show an error toast.

#### Automated Tests
- Archive footer shows correct total event count.
- Clicking footer row expands the event summary.
- "Discard Changes" resets form state.
- "Save Timeline Configuration" calls PATCH on the project and timeline.
- Save failure shows an error toast.

---

## Phase 6 — D3 Timeline Visualization (`/app/timelines/[id]/view`)

Built incrementally — each sub-task delivers a renderable visualization.

### Task 6.1 — Base Timeline: Scale, Line, Event Dots

#### Steps
- `TimelineCanvas.tsx`: SVG element filling the viewport minus the sidebar. Initialize a D3 `scaleTime` from `project.startDate` to `Date.now()` (or the latest event date + padding).
- Draw a 2px horizontal line (`stroke: primary`) across the SVG at vertical center.
- Plot event dots: circles at their x-position (mapped via the time scale). Dot color: green (`primary-fixed`) for POSITIVE, red (`tertiary-fixed-dim`) for NEGATIVE, muted gray (`outline-variant`) for NEUTRAL. Fill: solid for positive; open (fill: none, stroke) for negative. Radius: 6px.
- Fetch events via `GET /api/timelines/[id]/events` for the main timeline. This step only renders main-timeline events.

#### Automated Tests
- SVG element renders with a non-zero width and height.
- Correct number of circles rendered for the event count.
- Positive-sentiment event dot has the green fill class/attribute.
- Negative-sentiment event dot has an open (no fill) appearance.

#### Test Correctness Checks
- Dot color test: query the SVG circle elements and check their `fill` attribute directly, not via snapshot. Colors are functional data in this UI.
- Event count test: seed 5 events, assert exactly 5 circles in the SVG.

---

### Task 6.2 — Event Labels

#### Steps
- For each event, render a label group: event type in `label-md` small-caps (`STAFFING CHANGE`, `KEY DECISION`, etc.), event name in bold (`title-md`), date in `body-sm`.
- Alternate labels above and below the timeline line to minimize overlap. Implement a simple odd/even alternation first; improve collision detection in Phase 7 polish if needed.
- Position labels with a connector tick line from the dot to the label.

#### Automated Tests
- Labels render for each event.
- Event type is displayed in uppercase/small-caps.
- Labels alternate above and below the timeline (odd-indexed events render above, even below — or vice versa).

---

### Task 6.3 — Capacity Band

The capacity band is the core non-decorative feature: a shaded region representing engineer headcount over time.

#### Steps
- Derive the headcount timeline:
  1. Start: `project.startingHeadcount` at `project.startDate`.
  2. Each `STAFFING_CHANGE` event: headcount steps to `event.resourceCount` at `event.date`.
  3. This produces a step function: `[{ date, headcount }, ...]` sorted by date.
- Map headcount to a vertical band height. Define a Y scale: 0 ENG maps to a minimum band height (e.g., 20px), max observed headcount maps to the maximum band height (e.g., 120px). The band is centered on the timeline line.
- Render the band as a D3 `area` with a step curve (`d3.curveStepAfter`), filled with `surface-container-high` at 60% opacity.
- Render headcount annotations: at each step-change point, render a small label `"N ENG."` above the band.

#### Automated Tests
- Band path element exists in the SVG.
- Headcount derivation function: given `startingHeadcount: 2` and one STAFFING_CHANGE event at `resourceCount: 6`, the derived series is `[{date: startDate, headcount: 2}, {date: eventDate, headcount: 6}]`.
- Band height is larger at `headcount: 6` than at `headcount: 2`.

#### Test Correctness Checks
- Headcount derivation: unit-test the derivation function separately from the D3 rendering. This is pure logic and should be in `lib/utils.ts`.
- Band height test: check the D3 area path's Y coordinates, or check the computed band height passed to the D3 generator, rather than trying to measure rendered pixel heights.

---

### Task 6.4 — Branch Timelines

#### Steps
- Fetch all branch timelines for the project. For each branch, fetch its events.
- **Branch origin**: the branch line starts at the date of the branch's first event. No event = no branch line rendered. Connect the branch origin to the main timeline with a short diagonal line segment.
- **Branch close**: the branch line ends at the date of the branch's last event. If `branchCloseMode` is `REMERGE`, render a closing diagonal connector back to the main timeline (mirroring the origin connector), indicating the resources rejoined. If `CLOSE`, the dashed line simply terminates at the last event dot with no return connector.
- Render each branch as a dashed horizontal line (`stroke-dasharray: 6 4`, `stroke: secondary`) at a distinct Y offset from the main line. Position branches above or below alternately if multiple branches exist.
- Branch event dots and labels follow the same rules as Task 6.1–6.2 but rendered at the branch line's Y position.
- **Capacity band interaction**: for a REMERGE branch, the main timeline's capacity band must account for the returned headcount — the derivation in Task 6.3 must include REMERGE closing events from all branch timelines in the step function.

#### Automated Tests
- Branch line element is dashed (`stroke-dasharray` attribute set).
- Branch events render at the branch line's Y position, not the main line's Y.
- No branch elements render if there are no branch timelines.

#### Test Correctness Checks
- Y position test: assert that a branch event dot's `cy` attribute is different from a main-timeline event dot's `cy` attribute.

---

### Task 6.5 — Zoom, Pan, and Controls

#### Steps
- Apply `d3.zoom()` to the SVG. Zoom extent: [0.5, 4]. On zoom, update the D3 time scale's domain and re-render all elements.
- Zoom slider: an `<input type="range" min=0.5 max=4 step=0.1>` wired to the same D3 zoom transform.
- Pan (hand tool) and pointer (select) toggle: two icon buttons (hand icon / cursor icon). In pan mode, the SVG cursor is `grab`; dragging pans the timeline. In pointer mode, clicking an event dot opens an **event detail tooltip** (see below).
- Reset button: snaps the view back to the initial transform (fit-all scale, x=0).
- Controls bar rendered at top-right of the visualization, overlaid on the SVG.
- **Event detail tooltip**: clicking an event dot in pointer mode renders a floating tooltip anchored near the dot. Content: event name (bold), event type chip, impact sentiment chip, date, description (if present), resource count (if present). Style: `inverse_surface` dark background per DESIGN.md. The tooltip is a stub at this phase — fields are displayed as plain text with no editing capability. Dismiss by clicking elsewhere on the SVG.

#### Automated Tests
- Zoom slider renders with min/max values.
- Clicking Reset restores the initial transform.
- Pointer/pan toggle buttons render with accessible labels.
- In pointer mode, clicking an event dot opens the event detail tooltip.
- Tooltip displays the event name, type, impact sentiment, and date.
- Clicking elsewhere on the SVG dismisses the tooltip.
- Tooltip does not open in pan mode.

#### Test Correctness Checks
- Reset test: programmatically apply a zoom transform, then click Reset and assert the transform returns to identity/initial.
- Pointer mode test: simulate a click on an event dot and assert the detail popover or handler fires. Ensure this test doesn't fire in pan mode.

---

### Task 6.6 — Timeline Page Header

#### Steps
- Render above the SVG: status badge (e.g. "ESTIMATED Q3 FY28 COMPLETION" — derived from `project.status`), "Updated X time ago" label (relative time from the latest `event.updatedAt`), project title (`display-sm`, Manrope), date range ("August 2021 - Current" derived from `project.startDate`), and timeline description.
- Status badge: primary StatusChip variant with a custom label.
- "Updated X time ago": compute relative time with `Intl.RelativeTimeFormat` or a minimal utility.

#### Automated Tests
- Header renders the project title.
- Header renders the start date in the expected format.
- "Updated X time ago" renders a relative time string (not an empty string).

---

## Phase 7 — Search, Export & Polish

### Task 7.1 — Global Search

#### Steps
- The global search bar in the top nav (`GET /api/search?q=...`) searches across: project names, timeline names, event names and descriptions.
- Implement `GET /api/search` — query all three models with `contains` (case-insensitive), return grouped results: `{ projects: [...], timelines: [...], events: [...] }`.
- The search input renders a dropdown of results (max 10 per category). Clicking a result navigates to the relevant page.
- Debounce the search input by 300ms.

#### Automated Tests
- Search returns matching projects, timelines, and events.
- Search with no matches returns empty arrays (not 404).
- Results are grouped by type.
- Search is case-insensitive.

---

### Task 7.2 — Export (SVG/PNG Snapshot)

#### Steps
- Download button (in left sidebar and bottom-left of timeline view): captures the D3 SVG as an SVG file or a PNG via `canvas.toDataURL`.
- For SVG export: serialize the SVG element to a string, create a Blob, trigger download.
- For PNG export: use `html-to-image` or manually draw the SVG to a canvas element. Label the file `project-archive-[project-name]-[date].png`.

#### Automated Tests
- Download button triggers a file download (mock the `URL.createObjectURL` and assert it was called).
- The exported filename contains the project name and current date.

---

### Task 7.3 — Design Polish Pass

Apply the remaining DESIGN.md rules that aren't already enforced by components.

#### Steps
- Audit all surfaces: ensure no 1px solid borders are used anywhere (no-line rule). Replace any border with tonal shift.
- Audit all section separators: replace any `border-b` with `spacing-12` or `spacing-16` whitespace.
- Verify the glassmorphism sidebar: `bg-surface-variant/80 backdrop-blur-[12px]`.
- Verify no bright saturated blues anywhere — replace any `blue-*` Tailwind utilities with `secondary` or `on-secondary-container`.
- Audit rounded corners: no `rounded-none` — minimum `rounded` (0.25rem) everywhere.
- Final pass: `inverse_surface` dark tooltips on hover for data labels.

#### Automated Tests
- Grep the component source for `border-b`, `border-t`, `border-l`, `border-r` — any hit that isn't the ghost-border pattern (opacity < 20%) should fail the audit.
- No Tailwind `blue-*` color utilities in component source.

---

---

## Phase 8 — Risk Data Layer

Adds the `Risk` model to the database and exposes CRUD API routes. This phase has no UI dependencies and is self-contained — it must be complete before Phases 9 and 10 can begin.

### Task 8.1 — Prisma Risk Model + Migration

Add the `Risk` model to `prisma/schema.prisma` and generate a migration.

#### Steps
- Add to `schema.prisma`:
  ```prisma
  model Risk {
    id         Int       @id @default(autoincrement())
    name       String
    startDate  DateTime
    endDate    DateTime?
    status     String    @default("Ongoing")
    severity   String    // "LOW" | "MEDIUM" | "HIGH"
    types      String    // JSON array string: '["RESOURCE","DEPENDENCY"]'
    timelineId Int
    timeline   Timeline  @relation(fields: [timelineId], references: [id], onDelete: Cascade)
    createdAt  DateTime  @default(now())
    updatedAt  DateTime  @updatedAt
  }
  ```
- Add `risks Risk[]` to the `Timeline` model.
- Run `npx prisma migrate dev --name add_risk_model`.
- Regenerate the Prisma client.
- `types` is stored as a JSON string because SQLite has no native array type. Parse with `JSON.parse(risk.types)` and serialize with `JSON.stringify(types)` at the API boundary.

#### Automated Tests
- `prisma db push` succeeds with no errors against a fresh SQLite DB.
- A `Risk` record can be created, read, updated, and deleted via the Prisma client in a test environment.
- `onDelete: Cascade` — deleting a `Timeline` also deletes its associated risks.
- Creating a `Risk` with an invalid `timelineId` throws a foreign key constraint error.

#### Test Correctness Checks
- Cascade test: create a timeline + 2 risks, delete the timeline, assert the risks table has 0 rows for that `timelineId`.
- The `types` JSON round-trip: write `["RESOURCE","DEPENDENCY"]`, read back and parse — assert the result equals the original array, not a stringified string-of-strings.

---

### Task 8.2 — Risk API Routes

Implement the four risk CRUD endpoints.

#### Steps
- **`GET /api/timelines/[id]/risks`**: Return all risks for the timeline ordered by `startDate` ascending. Parse `types` from JSON string to array before returning. Return `[]` (not 404) when no risks exist.
- **`POST /api/timelines/[id]/risks`**: Accept `{ name, startDate, endDate?, status, severity, types[] }`. Validate: `name` required; `startDate` required and valid ISO date; `endDate` must be after `startDate` if provided; `severity` must be one of `LOW | MEDIUM | HIGH`; each `types` value must be one of `RESOURCE | DEPENDENCY | TECHNICAL | SCOPE`; `status` must be `Ongoing` or `Completed`. Serialize `types` array to JSON string before write. Return `201` with created risk (types parsed back to array).
- **`PATCH /api/risks/[id]`**: Accept partial updates for any field. Apply same validation rules as POST for any provided fields. Return `404` if risk not found. Return updated risk.
- **`DELETE /api/risks/[id]`**: Return `404` if not found. Return `204` on success.

#### Automated Tests
- GET returns risks sorted by `startDate` ascending.
- GET returns `[]` (not 404) when a timeline has no risks.
- POST creates a risk and returns it with `types` as a parsed array (not a string).
- POST with missing `name` returns `400`.
- POST with `endDate` before `startDate` returns `400`.
- POST with invalid `severity` value returns `400`.
- POST with an invalid `types` entry returns `400`.
- PATCH updates only the supplied fields; unsupplied fields remain unchanged.
- PATCH on a non-existent risk returns `404`.
- DELETE removes the risk; subsequent GET does not include it.
- DELETE on a non-existent risk returns `404`.

#### Test Correctness Checks
- `types` array test: POST with `types: ["RESOURCE","TECHNICAL"]`, then GET — assert the returned `types` field is an array, not a string.
- Partial PATCH: supply only `severity: "HIGH"`. Assert the `name` field is unchanged in the response.
- Date validation: supply `startDate: "2024-06-01"`, `endDate: "2024-05-01"` — must return `400`, not silently accept.

#### Risk & Notes
- SQLite enforces foreign keys only if `PRAGMA foreign_keys = ON` is set. Confirm Prisma's SQLite adapter enables this; if not, the cascade test may pass trivially and miss a real bug.

---

## Phase 9 — Timeline Configuration: Risk Tab

Adds the tab selector and Risks tab to the Timeline Configuration page. Depends on Phase 8 (API routes must exist).

### Task 9.0 — MultiSelect Component (`/components/ui/MultiSelect.tsx`)

A reusable multi-select input for the design system. Build this first within Phase 9 — the Risk Manager table depends on it.

#### Steps
- Props: `options: { label: string; value: string }[]`, `value: string[]`, `onChange: (values: string[]) => void`, `placeholder?: string`.
- Trigger button: renders selected values as small chips (pill shape, `rounded-full`, `bg-surface-container-high text-on-surface text-xs`) inside the button, separated by a small gap. When nothing is selected, shows `placeholder` text in `on-surface-variant`.
- Dropdown panel: opens on trigger click, closes on outside click or `Escape`. Use a `useEffect` click-outside listener. Panel styled with `bg-surface-bright shadow-[0_20px_40px_rgba(25,28,29,0.06)]` per DESIGN.md elevation rules.
- Each option renders as a row with a checkbox (`checked` when the value is in `value` prop) and a label. Toggling calls `onChange` with the updated array.
- No search within the dropdown — the type list is short and fixed.
- Close the dropdown after selection only if all options are selected (i.e., keep it open for multi-pick convenience).

#### Automated Tests
- Renders with placeholder text when `value` is empty.
- Renders a chip for each selected value.
- Clicking the trigger opens the dropdown.
- Clicking an unchecked option calls `onChange` with that value added.
- Clicking a checked option calls `onChange` with that value removed.
- Clicking outside the open dropdown closes it.
- Pressing `Escape` closes the dropdown.

#### Test Correctness Checks
- `onChange` value test: start with `value: ["RESOURCE"]`, click "Dependency" — assert `onChange` was called with `["RESOURCE", "DEPENDENCY"]`, not just `["DEPENDENCY"]`.
- Outside-click: simulate a click on a sibling element outside the component and assert the dropdown is no longer in the DOM.

---

### Task 9.1 — Tab Selector Component

Add a tab selector above the main panel that switches between **Events** and **Risks**.

#### Steps
- Render two tab buttons at the top of the main panel content area, above the existing events subtitle. Labels: "Events" (default active) and "Risks".
- Active tab: visually distinguished — use `bg-surface-container-highest text-on-surface` for active, `text-on-surface-variant hover:bg-surface-container` for inactive, matching the pointer/pan toggle button pattern already in `TimelineViewClient`.
- Tab state is local React state (`useState<'events' | 'risks'>('events')`). No URL parameter needed.
- When "Events" is active: render the existing Timeline Events Manager content unchanged.
- When "Risks" is active: render the Risk Manager panel (Task 9.2).
- The left panel (General Configuration + Initial Resources) is unaffected by the active tab.

#### Automated Tests
- Tab selector renders with both "Events" and "Risks" labels.
- "Events" tab is active by default.
- Clicking "Risks" tab renders the Risk Manager panel.
- Clicking "Events" tab re-renders the Events Manager panel.
- The left panel renders regardless of active tab.

#### Test Correctness Checks
- Default state test: assert that on initial render, the Events Manager is visible and the Risk Manager is not.
- Tab switch: after clicking "Risks", assert the risk-specific UI (e.g., "+ Add Risk" button) is in the DOM and the events UI is not.

---

### Task 9.2 — Risk Manager Table

The Risks tab content. Inline-editable rows, one per risk, mirroring the events table pattern.

#### Steps
- Fetch risks for the timeline via `GET /api/timelines/[id]/risks` when the Risks tab is first activated (lazy load — do not fetch on page load).
- Render panel header: subtitle "Periods of elevated project risk tracked against the timeline." and search bar "Search risks..." filtering rows client-side by risk name.
- "+ Add Risk" button: appends a blank row at the top of the list with empty fields and status defaulting to "Ongoing". Does not persist until the row-level save icon is clicked.
- **Table columns:**
  - **Risk Name**: text `Input` component, bound to `risk.name`.
  - **Start Date**: date `Input`, bound to `risk.startDate`.
  - **End Date**: date `Input`, bound to `risk.endDate`. Leave blank for ongoing risks.
  - **Status**: `Select` dropdown — options: `Ongoing`, `Completed`.
  - **Severity**: `Select` dropdown — options: `Low`, `Medium`, `High`. Render the selected value with a colored badge: yellow for Low, orange for Medium, red for High (matching the visualization severity colors).
  - **Type**: multi-select dropdown — options: `Resource`, `Dependency`, `Technical`, `Scope`. Selected values displayed as small chips within the cell. A risk may have one or more types.
  - **Actions**: save icon (calls `POST` for new rows, `PATCH` for existing), delete icon (calls `DELETE /api/risks/[id]` with a confirm prompt; for unsaved new rows, just removes the local row).
- Row save: serializes `types` as an array for the API. On POST success, replaces the local blank row with the returned persisted row (which now has an `id`).
- "Save Timeline Configuration" (bottom action bar) does **not** auto-save risk rows — per-row save is the mechanism. The bottom bar only saves the General Configuration fields (project name, status, dates, headcount).

#### Automated Tests
- Risk Manager renders one row per fetched risk.
- Search filters rows by risk name (case-insensitive).
- "+ Add Risk" appends a blank row without an API call.
- Saving a new row calls `POST /api/timelines/[id]/risks` with the correct payload.
- Saving an existing row calls `PATCH /api/risks/[id]`.
- Severity `Select` shows a colored badge for the selected value.
- Multi-select type: selecting "Resource" and "Dependency" results in both values being sent in the POST payload's `types` array.
- Delete icon shows a confirm prompt before the API call.
- Deleting an unsaved new row removes it from local state without an API call.

#### Test Correctness Checks
- New row POST payload: assert that `types` in the POST body is a proper array (`["RESOURCE"]`), not a comma-separated string.
- Severity color: assert the badge element for "High" has the red color class/style, not just that the dropdown shows "High" text.
- Multi-select: simulate selecting two types, then save — assert the PATCH payload's `types` field contains both values.

#### Risk & Notes
- Multi-select UI: build a proper `MultiSelect` component in `/components/ui` (see Task 9.0) before implementing this table. With 4 fixed options and chip rendering already established in the design system, the component is straightforward and avoids a future promotion pass.
- Lazy-loading risks on tab activation avoids a redundant fetch on page load when the user never opens the Risks tab. Ensure the fetch is not re-triggered on every tab switch — cache the result in local state once loaded, and only re-fetch after a successful mutation.
- Risks belong to the **main timeline only**. Branch timelines do not carry risks. The `timelineId` on a risk always refers to a timeline where `isMain: true`.

---

## Phase 10 — D3 Risk Heatmap Visualization

Renders the risk data onto the timeline visualization. Depends on Phase 8 (API) and can be developed independently of Phase 9 (config UI) as long as seed data exists in the DB.

### Task 10.1 — Fetch Risks and Render Heatmap Columns

Add risks as the bottommost D3 layer in `TimelineViewClient.tsx`.

#### Steps
- Fetch risks for the main timeline in the server component (`/app/timelines/[id]/view/page.tsx`) alongside the existing timeline + events fetch, and pass as a `risks` prop to `TimelineViewClient`.
- In `drawTimeline()`, add a `risksG` group **before** `monthMarkersG` (inserted first into `g`) so it sits beneath all other layers.
- For each risk:
  - Compute `x1 = xScale(risk.startDate)` and `x2 = xScale(risk.endDate ?? new Date())` (today's date for ongoing risks).
  - Render a `<rect>` from `y = MARGIN.top` to `y = height` (full canvas height, clipped by `timeline-clip`).
  - Fill by severity:
    - `LOW`: `rgba(251, 191, 36, 0.15)` fill
    - `MEDIUM`: `rgba(249, 115, 22, 0.15)` fill
    - `HIGH`: `rgba(239, 68, 68, 0.15)` fill
  - Left edge: a 1px `<line>` from `(x1, MARGIN.top)` to `(x1, height)` in the severity color at 40% opacity.
  - Right edge: a 1px `<line>` from `(x2, MARGIN.top)` to `(x2, height)` in the severity color at 40% opacity.
- Risks with no data render nothing (empty `risks` array is a valid state).

#### Automated Tests
- A risk `<rect>` is rendered for each risk in the props.
- The rect `x` attribute matches `xScale(risk.startDate)`.
- An ongoing risk (null `endDate`) renders its right edge at `xScale(today)`.
- A `LOW` severity risk has a yellow-tinted fill; `HIGH` has a red-tinted fill.
- Left and right edge lines are rendered for each risk.
- With zero risks, no risk-related SVG elements are rendered.

#### Test Correctness Checks
- Severity fill test: query the risk rect's `fill` attribute and assert it contains the expected rgba string for each severity level — not a snapshot match, which could mask color regressions.
- Ongoing right edge: mock `new Date()` to a fixed date, then assert `x2` equals `xScale(that fixed date)`.
- Layer order: assert `risksG` appears before `monthMarkersG` in the SVG DOM order.

#### Risk & Notes
- `new Date()` inside `drawTimeline` means the ongoing column endpoint is evaluated at render time. This is correct and consistent with how the main timeline line handles Ongoing projects. No memoization needed.

---

### Task 10.2 — Risk Label Blocks

Floating label group above each risk column, with vertical stacking for overlapping risks.

#### Steps
- For each risk, compute the label block anchor: `x = (x1 + x2) / 2` (horizontal center of the column).
- Label block content (three text lines + icon):
  - Line 1: ⚠ warning icon (Unicode or a small SVG path at 10px) + severity label + date range — e.g. `"Medium Risk: Dec 2025 – Jan 2026"`. Format dates as `"MMM YYYY"` using `d3.timeFormat`.
  - Line 2: type(s) in parentheses — e.g. `"(Dependency & Resource)"`. Join multiple types with " & ".
  - Line 3: risk name — e.g. `"External API Check"`.
- Label block height is approximately 48px (3 lines × 14px + padding). Use this constant to compute vertical stacking offsets.
- **Stacking algorithm**: sort risks by `startDate`. For each risk, check if its date range overlaps with any previously rendered risk. If overlap is detected, increment a `stackDepth` counter for that risk. The label block's `y` anchor = `MARGIN.top + 8 + (stackDepth * 52)`. Non-overlapping risks have `stackDepth = 0`.
- Text styling: severity color for lines 1 and 2, `on-surface` (`#1a1c1e`) for line 3 (the name). Font: `Inter, sans-serif`, 9px for lines 1–2, 10px bold for line 3.
- Render label blocks after risk rects, inside `risksG`, so they are above the rects but still below month markers.

#### Automated Tests
- A label group is rendered for each risk.
- Line 1 text includes the severity word and a formatted date range.
- Line 2 text includes the risk type(s).
- Line 3 text equals the risk name.
- Two overlapping risks produce label blocks at different `y` offsets (stacking).
- Two non-overlapping risks produce label blocks at the same base `y` offset.

#### Test Correctness Checks
- Stacking test: create two risks with overlapping date ranges — assert their label group `transform` or `y` attribute values differ by approximately the label block height (48–52px).
- Non-overlap test: create two risks whose date ranges do not touch — assert both label groups have the same base `y` offset.
- Type joining: a risk with `types: ["RESOURCE","DEPENDENCY"]` should produce line 2 text `"(Resource & Dependency)"`, not `"(RESOURCE,DEPENDENCY)"` — test the label string directly.

---

### Task 10.3 — Risk Hover Tooltip

Hovering a risk label block or its column shows a detail tooltip.

#### Steps
- Attach `mouseenter` and `mouseleave` handlers to both the risk `<rect>` and the label group `<g>` for each risk.
- On `mouseenter`: call `setTooltip` with the risk data and the `mouseEvent.clientX / clientY` coordinates. Cancel any active hide timer (`cancelHide()`).
- On `mouseleave`: call `scheduleHide()` (the existing 3-second auto-dismiss timer already in `TimelineViewClient`).
- Extend the `tooltip` state type to accommodate either an `Event` or a `Risk` — use a discriminated union: `{ kind: 'event'; event: Event; x: number; y: number } | { kind: 'risk'; risk: Risk; x: number; y: number }`.
- In the tooltip JSX, render risk tooltip content when `tooltip.kind === 'risk'`:
  - Risk name (bold, `font-display`)
  - Severity badge (colored chip matching severity color)
  - Type(s) as a comma-separated line
  - Date range: `"MMM YYYY – MMM YYYY"` or `"MMM YYYY – Ongoing"`
  - Status label
- Style: same `fixed z-50 bg-inverse-surface text-surface rounded-lg px-3 py-2 text-xs shadow-lg` as the event tooltip.
- The 3-second auto-dismiss and persist-while-hovered behaviours are inherited from the existing `scheduleHide` / `cancelHide` pattern — no new timer logic needed.

#### Automated Tests
- Hovering a risk rect sets tooltip state with `kind: 'risk'` and the correct risk data.
- Risk tooltip renders the risk name.
- Risk tooltip renders the severity value.
- Risk tooltip renders the type(s).
- Risk tooltip renders the date range in formatted form.
- Moving the cursor from the risk rect to the tooltip panel does not dismiss the tooltip.
- Tooltip auto-dismisses 3 seconds after cursor leaves both the rect and the tooltip.

#### Test Correctness Checks
- `kind` discriminant test: assert that after hovering a risk element, the tooltip state's `kind` field is `"risk"` — not just that *some* tooltip appeared, which could mask the event tooltip being shown instead.
- Auto-dismiss: use `jest.useFakeTimers()`. Simulate `mouseleave` on the risk rect; advance timers by 2999ms — assert tooltip still visible. Advance by 1ms more — assert tooltip is null.

#### Risk & Notes
- The tooltip state refactor (adding `kind` discriminant) touches existing event tooltip logic. Ensure existing event tooltip tests still pass after the type change.

---

## Open Questions

- ~~Multi-select component approach~~ → **Resolved**: Build `MultiSelect` as a proper `/components/ui` component in Task 9.0.
- ~~Risks on branch timelines?~~ → **Resolved**: Risks belong to the main timeline only. Branch timelines never carry risks.
