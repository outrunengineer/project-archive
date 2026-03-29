## Instructions for Claude

When implementing any feature change, addition, or modification requested by the user:
1. **Update this file** to reflect the change — add it to the relevant page spec, visualization spec, or create a new section if needed.
2. Keep the requirements here as the living source of truth. Future conversations should be able to read this file and understand the full current state of the application, not just the original intent.
3. Record behavioural details (interactions, timing, visual rules) not just high-level descriptions — e.g. "tooltip disappears 3 seconds after cursor leaves the event dot or the tooltip" rather than just "tooltip on hover".

---

## Implemented Changes

### Timeline Visualization — Event Tooltip
- Hovering an event dot shows a detail tooltip (event name, type, date, description, resource count)
- Tooltip persists while cursor is over the dot **or** the tooltip panel itself
- Tooltip auto-dismisses **3 seconds** after the cursor leaves both the dot and the tooltip

### Timeline Visualization — Main Timeline Line
- Line starts at the **exact project start date** (not the padded domain start) — no line is drawn before it
- Line color is **neutral blue** (`#5b8dd9`)
- A **star icon** (D3 symbolStar, filled blue) is placed at the start date on the timeline
- Line endpoint depends on project status:
  - **Ongoing** → extends to today's date (or the last event date, whichever is later)
  - **Any other status** → extends to `statusDate` (or last event date, whichever is later)
- Month markers and the padded domain extend to match the same endpoint

### Timeline Visualization — Month Markers
- Vertical gridlines at the start of every calendar month, spanning the **full height of the canvas** (top margin to bottom edge)
- Each marker carries a **"MMM YYYY"** label (e.g. "Jan 2024") positioned just below the capacity band
- Markers render behind all other content (capacity band, timeline line, event dots)
- Replaced the previous quarterly x-axis tick marks

---

Project Overview and Goals

This application will be a source of truth for tracking historical data for a project and displaying the events of the project as a linear timeline. Representing project capacity, impacts to capacity as events occur, and accurately along that timeline can help demonstrate the realities and challenges of a long term or high complexity project to a non-technical executive audience.

The this application will have multiple projects, each project has multiple timelines, each timeline with multiple events along that timeline. Each timleine can have branching timelines that represent adjacent initiatives or priority changes that impact the project timeline.

Event types are:
Deliverables
Priority Changes
Staffing Changes
Initiatives
Key Decisions
Impediments

Each event has an impact sentiment:
- Positive Impact (upward arrow indicator, green)
- Negative Impact (downward arrow indicator, red)
- Neutral Impact (double-arrow indicator, muted)

---

## Architecture

### Stack
- **Framework**: Next.js (App Router) — full-stack, handles routing and API in one framework
- **Styling**: Tailwind CSS — design tokens from DESIGN.md registered in Tailwind config
- **Visualization**: D3.js — custom timeline with capacity bands, branching lines, zoom/pan, and event dots
- **ORM**: Prisma — typed ORM for the relational data model
- **Database**: SQLite (local, zero-infrastructure) — migratable to Postgres via Prisma if needed

### Project Structure
```
/app
  /projects              → Projects list page
  /projects/[id]         → Project detail
  /timelines/[id]        → Timeline Configuration page
  /timelines/[id]/view   → Project Timeline visualization
/components
  /timeline              → D3 visualization components
  /ui                    → Design system components (buttons, chips, inputs)
/lib
  /db.ts                 → Prisma client
/prisma
  schema.prisma          → Project → Timeline → Event data model
```

### Key Decisions
- D3.js is used for the timeline visualization because the capacity band, branching lines, and zoom/pan require full rendering control — no off-the-shelf timeline library is sufficient
- SQLite is chosen for simplicity at this scale; Prisma makes a future migration to Postgres a near-zero change
- Tailwind config is the single source of truth for design tokens (colors, spacing, typography) from DESIGN.md

---

## Application Identity

- App name: **Project Archive**
- Target audience: Non-technical executive stakeholders
- Primary purpose: Visual, historical narrative of a project's lifecycle — capacity, decisions, and impediments over time

---

## Navigation & App Shell

- Top navigation bar with tabs: **Projects | Timelines | Project Timeline**
- Global search bar: "Search Project Entities..."
- Notifications bell icon
- Settings gear icon
- User avatar/profile menu
- Collapsible left sidebar with icon-based navigation (visible in timeline view)
- Download/export button (bottom left of timeline view)

---

## Pages

### 1. Timeline Configuration Page

Admin/edit view for setting up and managing a project's timeline and events.

**Left Panel — General Configuration**
- Project Name (text input)
- Start Date (date picker)
- Status (dropdown — e.g., Ongoing, Completed, etc.)

**Left Panel — Initial Resources**
- Starting Engineer Headcount (number input)
- Helper text: "Baseline allocation at project inception."
- This value seeds the capacity line on the timeline visualization

**Main Panel — Tab Selector**
- Two tabs toggle the main panel content: **Events** (default) and **Risks**
- Left panel (General Configuration + Initial Resources) is unaffected by the active tab

**Main Panel — Events tab (Timeline Events Manager)**
- Subtitle: "Chronological record of key architectural and staffing milestones."
- Search bar: "Search event details..."
- "+ Add Event" button
- Event list/table with columns:
  - **Event Details**: event name (text input), date (date picker), description (textarea)
  - **Branch**: dropdown assigning the event to a timeline branch (e.g., Main, or a named sub-branch)
  - **Impact & Type**: type dropdown (Staffing Change, Impediment, Priority Change, etc.) + impact sentiment badge (Positive / Negative / Neutral)
  - **Resources**: engineer headcount number input at time of event
  - **Actions**: save icon, delete icon
- "View Entire Archive History (N Events)" expandable footer row

**Bottom Action Bar**
- ← Back to Overview (link)
- Discard Changes (text button)
- Save Timeline Configuration (primary button)

---

### 2. Project Timeline Page

Read-only interactive visualization of a project's timeline.

**Header Section**
- Status badge (e.g., "ESTIMATED Q3 FY28 COMPLETION") — green pill
- "Updated X time ago" recency label
- Project title (large)
- Date range (e.g., "August 2021 - Current")
- Short description of the timeline's focus

**Timeline Visualization**
- Horizontal timeline as the primary visual element
- **Risk heatmap columns** (bottommost layer): full-height vertical bands for each risk period, colored by severity (yellow = low, orange = medium, red = high); each column carries a floating label block showing severity + date range, risk type(s), and risk name — see "Feature Specification — Project Risk Heatmap" for full detail
- **Capacity band**: a shaded region behind the timeline line representing engineer headcount over time — its height or label changes at each staffing event (e.g., 2 ENG → 6 ENG → 3 ENG). This is a core concept, not decorative.
- **Main timeline**: solid blue horizontal line
- **Branch timelines**: dashed lines diverging from the main line, representing adjacent initiatives or priority shifts
- **Event dots** plotted on the line at their respective dates:
  - Green filled dot = positive impact event
  - Red/open dot = negative impact event
  - Color and fill reflect impact sentiment
- **Event labels** displayed above or below the timeline, showing:
  - Event type (e.g., STAFFING CHANGE, KEY DECISION) in small caps
  - Event name (bold)
  - Date
- Engineer headcount annotations at key intervals along the line (e.g., "6 ENG.")

**Controls**
- Pan (hand tool) and select/pointer toggle
- Zoom in / zoom out slider
- Reset button
- Download/export button

---

## Feature Specification — Project Risk Heatmap

### Overview
Each timeline can track multiple named risks, each spanning a date range. Risks are rendered as full-height heatmap columns in the D3 visualization, sitting behind all other content (capacity band, timeline line, event dots). A warning label floats above each risk column.

---

### Risk Data Model

Each risk belongs to a **timeline** and has:

| Field | Type | Notes |
|---|---|---|
| `name` | string | User-defined label shown on the visualization (e.g. "External API Check") |
| `startDate` | date | Start of the risk period |
| `endDate` | date \| null | End of the risk period; `null` if ongoing |
| `status` | enum | `Ongoing` or `Completed` |
| `severity` | enum | `LOW`, `MEDIUM`, `HIGH` |
| `type` | enum (multi-select) | `RESOURCE`, `DEPENDENCY`, `TECHNICAL`, `SCOPE` — a risk may have more than one type |

---

### Visualization — Risk Heatmap

**Rendering layer**: Risks are drawn behind everything else — behind month markers, capacity band, and timeline line. They should be the bottommost layer in the D3 group stack.

**Column appearance**:
- Each risk renders as a filled vertical rectangle spanning from the top of the canvas (`y = 0` / `MARGIN.top`) to the bottom edge (`y = height`)
- X bounds are `xScale(risk.startDate)` → `xScale(risk.endDate ?? today)`
- Fill color by severity (semi-transparent so underlying content remains legible):
  - `LOW` → yellow, e.g. `rgba(251, 191, 36, 0.15)` fill, `rgba(251, 191, 36, 0.4)` left/right border strokes
  - `MEDIUM` → orange, e.g. `rgba(249, 115, 22, 0.15)` fill, `rgba(249, 115, 22, 0.4)` border
  - `HIGH` → red, e.g. `rgba(239, 68, 68, 0.15)` fill, `rgba(239, 68, 68, 0.4)` border
- Left and right edges of the column get a 1px vertical stroke in the severity color; no top/bottom stroke

**Label block** (floated above the risk column, near the top of the canvas):
- Anchored at the horizontal center of the risk column
- Line 1: Warning triangle icon (SVG path or unicode ⚠) + severity label + date range — e.g. **"Medium Risk Period: Dec–Jan"**
- Line 2: Risk type(s) in parentheses — e.g. **"(Dependency & Resource)"**
- Line 3: Risk name (user-defined) — e.g. **"External API Check"**
- Label text uses the severity color (not muted) so it reads clearly against the light fill
- If multiple risks overlap in date range, their label blocks **stack vertically** — the second label block sits directly below the first. Each block is offset downward by the height of the previous block plus a small gap.
- **Hovering a risk label block** shows a tooltip (same `inverse-surface` dark panel style as event tooltips) containing: risk name, severity, type(s), date range, and status.

**Ongoing risk extent**: a risk with no end date and status `Ongoing` has its column extend to **today's date** (same rule as the main timeline line for Ongoing projects).

---

### Timeline Configuration Page — Risk Tab

The main panel of the Timeline Configuration page gains a **tab selector** at the top, switching the panel content between **Events** and **Risks**.

**Tab selector behaviour**:
- Two tabs: `Events` (default, active on load) and `Risks`
- Selecting a tab replaces the main panel content; left panel (general config + initial resources) is unchanged
- Active tab is visually highlighted (same style as the existing active-state patterns in the UI)

**Risks tab — Risk Manager panel**:
- Subtitle: "Periods of elevated project risk tracked against the timeline."
- Search bar: "Search risks..."
- "+ Add Risk" button (same style as "+ Add Event")
- Risk list/table with one row per risk, inline-editable, with columns:
  - **Risk Name**: text input (e.g. "External API Check")
  - **Start Date**: date picker
  - **End Date**: date picker — leave blank if the risk is ongoing
  - **Status**: dropdown — `Ongoing` / `Completed`
  - **Severity**: dropdown — `Low` / `Medium` / `High` — rendered with a colored badge matching the severity color
  - **Type**: multi-select dropdown — `Resource`, `Dependency`, `Technical`, `Scope` — selected values shown as small chips
  - **Actions**: save icon, delete icon (same as events row)
- New risks added via "+ Add Risk" appear as a blank row at the top of the list
- Deleting a risk removes it immediately from local state; persisted on save

**Save behaviour**: Risks are saved/deleted through the same bottom action bar ("Save Timeline Configuration") that governs events — no separate save action per risk row beyond the row-level save icon.

---

### API Routes — Risks

- `GET /api/timelines/[id]/risks` — list all risks for a timeline
- `POST /api/timelines/[id]/risks` — create a new risk
- `PATCH /api/risks/[id]` — update a risk
- `DELETE /api/risks/[id]` — delete a risk

---

## Development Plan

Phases are ordered by dependency — each phase unblocks the next.

### Phase 1 — Design System Components (`/components/ui`)
Everything else depends on these primitives. Build them first against DESIGN.md.
- Button (primary, secondary, tertiary variants)
- Input (text, number, date picker)
- Textarea
- Dropdown/Select
- Status chip (positive, negative, neutral, custom label)
- Card / surface container
- Icon wrappers (save, delete, bell, gear, avatar, search)

### Phase 2 — App Shell & Layout
- Root layout with top navigation bar (Projects | Timelines | Project Timeline tabs)
- Global search bar
- Notifications, settings, and user avatar slots
- Collapsible left sidebar with icon-based navigation
- Active tab/route highlighting

### Phase 3 — API Routes & Server Actions
CRUD endpoints that pages depend on before they can function.
- `GET/POST /api/projects` — list and create projects
- `GET/PATCH/DELETE /api/projects/[id]` — project detail, update, delete
- `GET/POST /api/projects/[id]/timelines` — list and create timelines for a project
- `GET/PATCH/DELETE /api/timelines/[id]` — timeline detail, update, delete
- `GET/POST /api/timelines/[id]/events` — list and create events
- `PATCH/DELETE /api/events/[id]` — update and delete individual events

### Phase 4 — Projects List Page (`/app/projects`)
First end-to-end vertical slice — data → API → UI.
- Fetch and display all projects
- Project card showing name, status, start date, timeline count
- "New Project" action (modal or inline form)
- Navigate to project detail on click

### Phase 5 — Timeline Configuration Page (`/app/timelines/[id]`)
Data entry point — events must exist before the visualization has anything to render.
- Left panel: General Configuration form (name, start date, status)
- Left panel: Initial Resources form (starting headcount)
- Timeline Events Manager table with inline editing per row
- Add Event, save per-row, delete per-row
- Branch dropdown populated from existing branches on the timeline
- Search/filter events by detail
- Expandable "View Entire Archive History" footer showing total event count
- Bottom action bar: Back, Discard Changes, Save Timeline Configuration

### Phase 6 — D3 Timeline Visualization (`/app/timelines/[id]/view`)
Built incrementally — each sub-step produces a working, renderable state.

1. **Base timeline** — horizontal time scale (D3 scaleTime), solid line, event dots colored by impact sentiment
2. **Event labels** — type category (small caps), name (bold), date; alternating above/below to avoid overlap
3. **Capacity band** — shaded region behind the timeline driven by staffing event headcount values; updates at each staffing change point
4. **Engineer headcount annotations** — numeric labels at capacity change intervals along the line
5. **Branch timelines** — dashed lines diverging from the main line at the branch origin event, scoped to branch-assigned events
6. **Zoom & pan** — D3 zoom behavior; zoom slider and pan toggle wired to the same transform
7. **Controls & reset** — pointer/hand tool toggle, reset button snapping back to initial transform
8. **Timeline page header** — status badge, recency label, title, date range, description

### Phase 7 — Search, Export & Polish
- Global search across project entities (projects, timelines, events)
- Download/export button (SVG or PNG snapshot of the D3 visualization)
- "Updated X time ago" recency label using event timestamps
- Final design pass against DESIGN.md (no-line rule, tonal layering, glassmorphism sidebar, spacing scale)

