# v4 → Wyze AI One — Production Migration Guide

**Audience:** the coding agent migrating the v4 design system (elements + layout → template)
from this mockup repo into the Wyze AI One production codebase at `~/Desktop/wyze`.
**Companion:** `AI-Camera-Builder-Reference.md` (the v4 build reference — read it first;
it defines every element, format, layout pattern and rule referenced below).

---

## 1. What you are migrating

Production today implements **Reference v3**: a 7-slot grammar (`S0→S5 + Sa`), 41 module
blocks, per-archetype layout presets, and a `UISpecification` whose `layout` array names
module IDs. v4 replaces the module/component layer entirely:

| v3 (in production now) | v4 (this repo, to migrate) |
|---|---|
| 46 modules / 41 block components | **27 elements**, each rendered through a **format** (20 formats) |
| 7-slot grammar (S0–S5, Sa) | **10 layout patterns** — pure containers; slots fix size + position only |
| per-archetype recipes / presets | **templates = sections of element renders arranged by patterns** |
| module picker | element·format claims, validated by lint against the registry |
| styling per block | styling lives in the **format renderer** (one pill, one tagline, one tile…) |

The governing contract (keep it during and after migration): **every visual fix lands as
an element-format change or a named layout rule — never one-off styling on a screen.**

## 2. Source of truth in this repo

Everything lives in `index.html` (single-file mockup) — line numbers drift, search by name:

| What | Where |
|---|---|
| Element registry (27 + 10 patterns) | `EL_REGISTRY` — schema `{id,grp,label,desc,rules,states,sig,formats,layouts,action,accepts,modifier,sample,stage}` |
| Default format renderers | `FMT_STAGE` (+ `agPill`, `chartLegend`, `elEmptyHTML`, `elLoadingHTML`) |
| Node grammar walker | `renderV4Nodes(parts)` — nodes: `hdr,row,card,list,log,grid,sgrid,strip,hero,chips,more,empty,loading,widget`; leaf `S(el,fmt,sample)` |
| Claims extraction | `claimsOfParts(parts)` → `element·format` strings |
| The 10 production templates | `const T4` (package, garage, baby, pet, stove, bird, rentals, trash, fridge, lawn) |
| Runtime lint / verification | `lintT4()` + `lintV4()` — hero-early, card titles, ≥4 rows, tagline format, widget-only, grid row cap, claim validity, coverage matrix |
| v4 fit CSS (layout mechanics) | `.v4prev/.v4tpl`-scoped rules: log left/middle/right grid, sgrid 3.2 cells, `.btnblock` row sharing, media-led cells drop chrome, lone-slot block width |
| Data-field bindings | `SEL2UI` + `MAPLINES` + `FIELD_GROUPS` — element ← API-field pairs (76 bindings over the Wyze AI One endpoints) |

## 3. Where it lands in production (`~/Desktop/wyze`)

Read `AGENTS.md` first — it is the repo's rule book (conventions, dev setup, lessons,
roadmap hygiene). `CLAUDE.md` adds skill routing (use `ship` to deploy, `investigate`
for bugs, `book-task` to track this migration). Frontend: React 18 + TS + Vite + CSS
Modules at `src/frontend`; backend: FastAPI at `src/backend`.

Existing v3 artifacts you will replace or evolve (all under
`src/frontend/components/agent/`):

| Production file | Role today | v4 disposition |
|---|---|---|
| `MODULE_REGISTRY.ts` | module-ID → block component | becomes `ELEMENT_REGISTRY.ts`: element id → `{formats, rules, states, render(fmt, props)}` |
| `blocks/` (41 files) | one component per module | collapse into **format renderers** (one `Pill`, one `Tagline`, one `Tile`, one `Chart` family…) + thin element wrappers |
| `GenericLayoutRenderer.tsx` | walks `UISpecification.layout` by 7 slots | walks v4 **sections of nodes**; one container component per layout pattern (`List`, `Log`, `Card`, `Grid`, `ScrollGrid`, `Strip`, `Hero`, `ChipBar`, `SectionHeader`, `Widget`) |
| `data/layout_presets` | per-archetype presets | the 10 `T4` template objects, serialized as the new `UISpecification` v4 schema |
| `RENDERER_REGISTRY.ts` / `typed-renderers/` | typed cell renderers | keep the mechanism; renderers become element·format renderers |
| `AgentEclipseCard.tsx` | home widget | implements the v4 widget contract (`grad, alert?, pill, sub, name`) |
| `LayoutBuildPanel` / `SwapPopover` | editing UI | drive off the element registry's `formats[]` (swap = format change, the only legal per-slot edit) |

## 4. Migration phases

1. **Schema first.** Define the v4 `UISpecification` (zod or Pydantic mirror):
   `{id, title, sub, goal, widget, sections:[{lab, parts:[Node]}]}` with the node grammar
   from the reference §7. Claims (`element·format`) are derivable — port
   `claimsOfParts` as a pure function shared by frontend validation and backend tests.
2. **Element registry.** Port `EL_REGISTRY` to `ELEMENT_REGISTRY.ts` — ids, formats,
   layouts, actions, states, and the **rules as code comments + dev-mode assertions**.
   Port format renderers from `FMT_STAGE`, preserving the format-level conventions
   (every badge is the same pill; taglines pinned upright 9.5px-equivalent; device-state
   auto-colors by state; measurement unit rides with the value; charts: goal-named title,
   axis below, legend beneath, binary state band, self-labelled calendar cells).
3. **Layout containers.** One component per pattern, enforcing its recorded rules
   structurally where possible (Log renders exactly the 3-column l/m/r grid; Grid caps
   at 2 rows and throws to ScrollGrid in dev; ScrollGrid sizes cells to 3.2 per viewport;
   Hero pins overlays to corners; ChipBar marks exactly one selected chip). Slots accept
   ANY element render — do not type-restrict slot contents.
4. **Lint as tests.** Port `lintT4` into a spec validator (unit tests + a dev overlay):
   hero/media-grid within first two sections, cards titled, lists/logs ≥4 rows + More,
   tagline second lines, widget-only widget, claims valid against the registry, coverage
   report of unused element·format pairs.
5. **Data binding.** The mockup's `FIELD_GROUPS`/`MAPLINES` map elements to the real
   endpoints (`POST /api/events/filter`, `GET /api/eventgroups`, `GET /api/devices/...`,
   reid appearances, etc.). Wire each element's props to the existing services layer
   (`src/frontend/services`); `states:['empty','loading']` elements get their own
   empty/loading chrome — these are element states, not page states.
6. **Templates.** Re-emit the 10 `T4` templates as v4 specs and snapshot-test them.
   Their sample data is internally consistent on purpose (widget duration = state card =
   log timeline; calendar marks mirror the visit list; insights cite data the screen
   shows) — keep that property; the lint can't check semantics for you.
7. **Ship per repo rules.** Track the work with `book-task`, reference the roadmap issue
   in the PR (`Closes #N` — see AGENTS.md Roadmap Hygiene), and use the `ship` skill.

## 5. Conventions ledger (do not regress these)

- Confidence sits directly next to the state it verifies — never a standalone section.
- Insight is a full sentence with a timestamp/duration tagline.
- Duration always leads with "for". Instance-count's name leads the value (tile excepted).
- Button blocks sit 2–3 to a row; a single action is a pill.
- Priority is one red dot or one Important badge — never a scale.
- A time chart only when the time axis answers the goal; cross-subject comparison uses
  rows/tiles (see Overseas Rentals' per-property log — deliberately NOT a chart).
- More closes a list, full width, carries the remaining count.
- Empty/Loading are element states; grammar nodes render the chrome and claim nothing.

## 6. Known gaps to carry as backlog (found by the alignment audit)

- lint covers templates, not component showcases (cards-without-title in 3 v4 components).
- Chip-bar "selected" state is visual-only (no walker mechanism) — production should make
  selection a real prop on the ChipBar container.
- Strip has no overflow affordance (+N was dropped from the rules); add one if strips
  ever hold unbounded data.
- The layout axis of bindings (`standalone` vs `overlay`) is recorded but not validated —
  worth a check in the production validator.
