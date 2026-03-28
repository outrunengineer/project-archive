---
name: project-planning
description: Guide a software project from raw idea to a build-ready plan. Use this skill whenever the user wants to plan a new project, has a CLAUDE.md with requirements, shares design screenshots or mockups, asks for an architecture recommendation, wants a development plan or task breakdown, or says things like "plan this project", "what should I build first", "help me architect this", or "break this down into tasks". Trigger even if the user only has a rough idea — this skill works from any starting point.
---

# Project Planning Skill

Transform a project idea, CLAUDE.md, and/or design screenshots into a complete, build-ready PLAN.md — covering refined requirements, architecture, and a hierarchical task breakdown with tests.

The process has four phases. Work through them in order, but adapt to where the user already is. If they have a detailed CLAUDE.md, skip the intake questions that are already answered. If they have no screenshots, skip screenshot interpretation.

---

## Phase 1: Requirements Capture & Refinement

### 1a. Read existing context

Before asking anything, read what exists:
- Read `CLAUDE.md` if present — extract project goals, data model, event types, UI pages, and any stated constraints
- Read any design documents (e.g., `DESIGN.md`) for visual system, tone, and component rules
- Scan for existing screenshots or design assets in the repo (common locations: `designs/`, `assets/`, `.claude/`)

Summarize what you found to the user in 2–3 sentences so they know you've absorbed it, then proceed.

### 1b. Interpret design screenshots

If the user shares screenshots or mockups (in chat or as file paths), extract requirements from them systematically:

**For each screen, identify:**
- Page name and purpose (what does a user accomplish here?)
- Layout structure: panels, columns, sidebars, primary content area
- Every interactive element: inputs, dropdowns, buttons, toggles, search bars — and what each one does
- Data displayed: what fields, what types, what relationships to other entities
- Navigation: how does this screen connect to others?
- Visual indicators: color coding, badges, icons, status labels — and what they communicate
- Any controls unique to this view (zoom, pan, export, expand/collapse)

**Watch for non-obvious details:**
- Decorative-looking elements that are actually functional (e.g., a shaded band that represents resource capacity, not just styling)
- Labels or annotations that imply a data field even if no input is shown
- Footnotes or helper text that reveal business rules
- Truncated text in inputs that hints at longer content

Ask the user to clarify anything ambiguous before moving on — a wrong assumption here compounds through the rest of the plan.

### 1c. Identify gaps and refine

Compare what you've captured against a complete requirements picture. Probe for anything missing:

- **Data model gaps**: Are all entity relationships clear? Are there fields implied by the UI that aren't named?
- **Edge cases**: What happens when there's no data? What are valid/invalid states?
- **User roles**: Is there one user type or many? Do different roles see different things?
- **Design rule coverage**: Does every component in the design system have a corresponding requirement? (e.g., if the design doc specifies glassmorphism sidebars, is there a requirement for a sidebar?)
- **Flows not shown**: Are there screens implied but not mocked (e.g., onboarding, error states, empty states)?

Present gaps as a short numbered list. Ask the user to confirm, correct, or fill them in before proceeding to architecture.

### 1d. Write refined requirements into CLAUDE.md

Once requirements are confirmed, update `CLAUDE.md` with any additions or corrections. Use the existing structure — add sections rather than rewriting. Flag anything that changed from the original so the user can see what was refined.

---

## Phase 2: Architecture

### 2a. Derive a stack recommendation

Don't assume a stack — derive it from the requirements. Work through these questions against what you know about the project:

1. **Rendering needs**: Is this mostly read-heavy display, or write-heavy interaction? Does it need SSR/SEO, or is it a private internal tool?
2. **Visualization complexity**: Does the UI require custom rendering (charts, timelines, canvas, D3) or will standard components suffice?
3. **Data scale**: How many records? Single-user or multi-user? Does it need real-time updates?
4. **Auth requirements**: Is authentication needed? Social login, SSO, or simple password?
5. **Deployment target**: Local tool, hosted SaaS, or embedded? Who runs it?

From these answers, recommend a specific, minimal stack. Name exact libraries. Explain each choice in one sentence tied directly to a requirement — not general best practices. Identify one alternative and briefly note when you'd pick it instead.

### 2b. Generate architecture documents

Write the following into `PLAN.md` under an `## Architecture` section:

**Project structure** — the full directory tree with a comment on each folder's purpose. Be specific to this project, not a generic template.

**Data model** — entity diagram in text form (or Mermaid if appropriate). Include all fields, types, and relationships. Note which fields are required vs. optional.

**API surface** — list every endpoint or server action needed. For each: method, path, what it reads/writes, and which page(s) depend on it.

**Dependency map** — a table or diagram showing which components depend on which data, which pages depend on which components, and which API routes depend on which DB models. This surfaces the build order: things with no dependencies get built first.

**Key technical decisions** — for anything non-obvious (why D3 instead of a chart library, why SQLite instead of Postgres), write a one-line rationale so future contributors understand the tradeoff.

### 2c. Confirm architecture with the user

Present the architecture summary (stack + structure + key decisions) before writing the full PLAN.md. Ask: does this match how they imagined it? Are there constraints you missed (existing codebase, required library, team familiarity)? Adjust before continuing.

---

## Phase 3: Development Plan

### 3a. Structure the plan

Organize work into phases based on the dependency map from Phase 2. The rule: a phase should only contain work that is unblocked given all prior phases. Within a phase, order tasks so foundational pieces (shared utilities, DB schema, design tokens) come before the things that consume them.

Typical phase order for a new project:
1. Foundation (DB schema, design system tokens, shared types)
2. App shell (layout, navigation, routing)
3. Data layer (API routes / server actions)
4. Pages — simplest first (fewest dependencies), most complex last
5. Core feature components (custom visualizations, editors, complex interactions)
6. Cross-cutting concerns (search, export, notifications, error handling)
7. Polish (design pass, empty states, loading states, accessibility)

Adapt this order to the specific project — if a visualization is the core value prop, don't bury it in phase 5.

### 3b. Write hierarchical tasks

For each phase, write tasks at three levels:

```
## Phase N — Phase Name
Brief description of what this phase delivers and why it comes here.

### Task N.1 — Task Name
What to build. One paragraph describing the expected behavior and any constraints.

#### Steps
- Step-by-step implementation notes (not pseudocode — just enough to prevent wrong turns)

#### Automated Tests
- List each test that should be written for this task
- Be specific: "Test that creating an event with a past date returns a 400 error" not "Test error handling"
- Include unit tests for logic, integration tests for API routes, and component tests for UI behavior where appropriate

#### Test Correctness Checks
- For each test listed above, describe what a passing test actually proves
- Flag any test that could pass trivially (e.g., a mock that always returns true) and note how to make it meaningful
- Note any edge cases the tests don't cover that the reviewer should manually verify
```

### 3c. Flag risk and complexity

After writing each phase, add a short **Risk & Notes** section flagging:
- Tasks with high uncertainty (new library, complex algorithm, unclear requirement)
- Tasks that are likely to expand in scope
- Dependencies on external systems or decisions not yet made
- Anything that needs a design or product decision before implementation can start

### 3d. Write PLAN.md

Write the complete plan to `PLAN.md` in the project root. Structure:

```
# [Project Name] — Development Plan

## Overview
One paragraph: what this plan covers, what it doesn't, and what assumptions it makes.

## Architecture
[Output from Phase 2b]

## Development Phases
[Output from Phase 3b — all phases and tasks]

## Open Questions
Numbered list of anything that needs a decision before it blocks a task.
Tie each question to the task it blocks.
```

Do not summarize or abbreviate — the PLAN.md should be complete enough that a developer who wasn't in this conversation could pick it up and build from it.

---

## Phase 4: Review & Handoff

Present a short summary to the user:
- How many phases and tasks are in the plan
- Which phase is the recommended starting point and why
- The top 2–3 open questions that need answers before development begins
- Any risks worth flagging upfront

Ask: does the plan match their expectations? Is the scope right, or should any phase be expanded or cut?

Offer to iterate on any section before they consider the plan final.

---

## Output File

All persistent output goes to `PLAN.md` in the project root. `CLAUDE.md` is updated in place with refined requirements. Do not create additional files unless the user asks.

If `PLAN.md` already exists, read it first and ask whether to update in place or regenerate from scratch.
