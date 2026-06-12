# AI Camera UI Builder — Build Reference (v4)

**Audience:** the camera-builder skill/agent. **Purpose:** given a user's plain-language
monitoring goal, generate a customized camera UI specification using the v4 compose flow:

> **elements + layout → template**

There is no component layer. A template is sections of element renders arranged by layout
patterns. Elements are the only units of meaning; layouts are pure containers (size and
position only — they never lock which element fills a slot); every screen is generated,
never drawn freeform. Every visual adjustment lands as an **element-format change** or a
**named layout rule** — never one-off styling on a single screen.

---

## 1. Build procedure

Run these six stages in order.

1. **Frame the goal** as the one question the screen answers
   ("Did the bins go out — and come back?", "Is the baby okay without staring at a feed?").
2. **Pick elements** from the vocabulary (§2) that answer it. Typical skeleton:
   state + duration → hero evidence → event list or log → time trend → insight → action.
3. **Pick a format per element.** The first format listed is the default; pick smaller
   formats as the element moves from headline to supporting role.
4. **Arrange with layout patterns** (§4). The hero (or a media-led grid) must appear in
   the first two sections. Each section is one pattern plus a section header.
5. **Compose the home widget** (§5) — it answers the goal in one glance.
6. **Emit the template object** (§7) and verify (§6): every claim must be a registry
   element with an allowed format, and every pattern rule must hold.

---

## 2. Element vocabulary (27)

Each element lists its formats (first = default), allowed layouts (standalone / overlay),
tap action, query states, AI provenance, and its recorded rules.

### Media `media`
Raw media — stream, still, clip, lapse, animated preview, identity portrait crop (square) or sound clip. Recognition can key on audio as well as visuals (bird song, cry) — no audio field in the API yet (`audio_track` is recorded as the gap).
- formats: `full-card` `small-thumb` `square` `sound-clip` (first = default)
- layouts: standalone / overlay · action: `open-clip` · states: empty, loading
- RULE: the visual formats share one gradient, border and radius family; sound-clip renders a play button · waveform · duration pill

### Detection marker `detection-marker`
Bounding box + label anchored to the frame by detector geometry
- formats: `bound-box` · layouts: overlay · action: `correct` · provenance: detector, correctable

### State `state`
Current condition or AI judgment of a subject — word, pill, sentence or verdict badge (tone, verification, known-identity)
- formats: `text-large` `badge` `text-small` (first = default)
- layouts: standalone / overlay · action: `open-chat` · provenance: vlm, correctable
- RULE: a live stream renders as the red ● LIVE pill

### Measurement `measurement`
Value + unit read from the scene (VLM, no OCR endpoint)
- formats: `tile` `text-large` `text-tagline` · layouts: standalone / overlay · action: `correct` · provenance: vlm, correctable
- RULE: the unit rides with the value

### Duration `duration`
Elapsed time in state — derived from state-change timestamps
- formats: `text-large` `text-small` `badge` `text-tagline` · layouts: standalone / overlay
- RULE: always reads with a leading "for"

### Category tag `category-tag`
Classifier tag on one instance (person / vehicle / pet)
- formats: `badge` `text-tagline` · layouts: standalone / overlay · action: `filter` · provenance: detector

### Category count `category-count`
Instances grouped + counted per category — the filter row
- formats: `badge` · action: `filter` · states: empty, loading

### Instance tag `instance-tag`
The instance by name only — no count attached
- formats: `badge` `text-small` `text-tagline` · action: `filter` · states: empty, loading

### Instance count `instance-count`
How many — events, devices online, frames, sightings
- formats: `tile` `text-small` `badge` `text-tagline` · action: `navigate` · states: empty, loading
- RULE: the name of what's counted leads the value (Cats · 4) — the tile is the exception: value on top, name beneath

### Time trend chart `time-trend`
Activity binned over time — hourly (minute bins), daily (hour bins), weekly (day bins), monthly (calendar grid); binary signals get a two-level state band
- formats: `hourly-chart` `daily-chart` `weekly-chart` `month-chart` · states: state mode, empty, loading
- RULE: use a time chart only when the time axis answers the template's question — cross-subject comparisons use rows or tiles instead
- RULE: the chart title names the template's goal ("Pickups this month", not "Monthly chart")
- RULE: axis labels sit below the chart, never over the bars
- RULE: bar charts carry a colour legend beneath the axis — month-calendar cells are self-labelled
- RULE: binary signals (open / closed, on / off) render the state mode on ANY span (`on:[bins]`) — two levels only, never count-height bars; the month calendar fills on-days
- RULE: month calendar: marked days carry their value — a count, duration or ✓; unmarked days show a dimmed day number; today's cell carries a ring (`today:` day, default the last)

### Absolute time `absolute-time`
A specific moment — clock time (2:00 PM), date, day index or span
- formats: `text-small` `text-tagline` · layouts: standalone / overlay

### Relative time `relative-time`
Elapsed since — recency stamps like "2m ago"
- formats: `text-tagline` `text-small` · layouts: standalone / overlay

### High priority marker `priority-marker`
Flags what needs attention NOW — a single red dot, or an Important badge
- formats: `dot` `badge` · layouts: standalone / overlay
- RULE: one red dot or one Important badge — never a scale

### Confidence `confidence`
Attachable modifier — model confidence + tap-to-correct on any AI-derived element
- formats: `button-pill` · action: `correct`
- RULE: if used, it sits directly next to the state it verifies — never a standalone section

### Trend delta `trend-delta`
Change vs the prior period — or the peak callout
- formats: `badge` `text-small` · action: `open-chat`

### Name tag `name-tag`
Who or what by name — agent, person / pet identity, scene object, contact (device name lives in Devices)
- formats: `badge` `text-small` `text-tagline` · layouts: standalone / overlay

### Attribute tag `attribute-tag`
Identity / device attributes (species, descriptors, battery)
- formats: `text-tagline` `text-small` `badge`

### Insight `insight`
AI-synthesized prose over a period — tap opens the chat sheet
- formats: `text-medium` `text-large` · action: `open-chat` · provenance: llm · states: empty, loading
- RULE: reads as a longer full sentence, never a terse headline
- RULE: carries a timestamp or duration tagline beneath the prose

### Suggestion `suggestion`
Proactive question / nudge — tap opens the chat sheet
- formats: `button` · action: `open-chat` · states: empty, loading

### Description title `description`
Short factual headline for ONE media item — event or group
- formats: `text-small` `text-tagline` · layouts: standalone / overlay · provenance: vlm · states: empty, loading

### Description detail `description-detail`
The full VLM sentence behind the title — what actually happened
- formats: `text-medium` `text-small` · layouts: standalone / overlay · provenance: vlm · states: empty, loading

### Device name `device-name`
Which camera / device — the tile and overlay label
- formats: `text-tagline` `text-small` · layouts: standalone / overlay

### Device state `device-state`
Connectivity & power — online / offline, on / off
- formats: `badge` `text-small` · layouts: standalone / overlay
- RULE: colored by the state — green online / on, red offline / off
- RULE: text-small leads with a status dot

### Device count `device-count`
Fleet roll-up — devices online vs total
- formats: `text-small` `tile` · states: empty, loading

### Device control `device-control`
Command button — power, talk, siren, lights
- formats: `button-pill` `button-block` · action: `control`
- RULE: blocks sit 2–3 to a row — a single action uses the pill

### Contact action `contact-action`
Escalation contact — name, number and the call / text actions
- formats: `list` `button-block` · action: `control`
- RULE: blocks sit 2–3 to a row — a single contact uses the list row

### More `more-paging` (System group, with contact-action)
The paging footer that closes a list and discloses how much more there is
- formats: `button-pill`
- RULE: full width; always the LAST row of a list · carries the remaining count

---

## 3. Formats (20)

`text-large` `text-medium` `text-small` `text-tagline` `badge` `dot` `tile` `list`
`small-thumb` `square` `full-card` `sound-clip` `bound-box` `button` `button-pill`
`button-block` `hourly-chart` `daily-chart` `weekly-chart` `month-chart`

Format-level conventions (the renderer is the single source of styling):

- **badge** — every badge renders as the same pill: one shape, one text size,
  colour-tinted background.
- **text-tagline** — uniform 9.5 px, upright, regular weight, muted colour; immune to
  context styling.
- **button-block** — coloured fill with white icon and label, same treatment as the pill.
- **tile** — the shared tile anatomy: big value on top, name beneath.
- **charts** — see the time-trend rules: goal-named title, axis below, legend beneath,
  binary = state band, calendar cells self-labelled.

---

## 4. Layout patterns (12)

Patterns are **containers**: their slots fix size and position only — any reasonable
element · format can fill a slot. Rules are recorded per pattern and enforced by lint
where marked.

### Section header `hdr`
Opens a section: names what follows and carries one glanceable number or status.
- title left; ONE optional fixed slot on the right — any glanceable element
- titles render regular weight, dimmed — the content carries the emphasis
- closes with a divider — one header per section

### List `list`
Repeated rows for a stream of items — the event feed, visits, contacts.
- at least 4 rows before the More footer
- row anatomy: fixed lead slot (56×42 when media) · flex middle · fixed right slot — any reasonable element · format
- the second line under the main text uses the tagline format

### Log `log`
Compact text-only rows for readings and state changes — a journal, not a feed.
- titled by a section header in the same section (lint-enforced)
- at least 4 rows before the More footer
- text renders only — media belongs in List
- three slots per row align left · middle · right — any reasonable element · format in each

### Timeline `timeline`
Moments on a vertical thread — a dot and its time on the line, content beside; for stories where the sequence itself matters.
- a vertical thread connects the dots — one dot per moment, its time beside the dot
- dots may take the moment's state colour
- a lead (clip thumb) sits under the time — if one moment carries it, all do
- body takes any reasonable element · format — clip, group, instance, text; the trailing slot right-aligns
- at least 3 moments, newest first

### Card `card`
A self-contained block for one subject — its state, media and detail boxed together.
- every screen card opens with a title row (lint-enforced; identity / widget showcase cards are the exception)
- bare values never float — a subject's values sit boxed together in its card
- one card = one subject

### ID card `idcard`
A detailed introduction of ONE entity — a media / instance / clip / group: a square portrait beside its name, attributes and stats (e.g. a bird-species intro).
- square media left; name · attributes · stats stacked right
- opens with an optional verdict badge
- one ID card = one entity (a species, a person, a clip, a group)

### Grid `grid`
Equal cells in fixed rows — device fleets, KPI tiles, multi-camera walls.
- equal-width cells; full-bleed content fills the cell and drops the cell outline — the content IS the cell
- 2–3 columns at phone width
- non-scrolling — at most 2 rows; more items move to the Scroll grid
- each cell may pin ONE small overlay to a corner (tl · tr · bl · br)

### Scroll grid `sgrid`
One row of equal cells that scrolls horizontally — growing galleries and sighting reels.
- single row, scrolls horizontally
- viewport shows 3.2 cells — the cut-off cell signals there's more
- use when items outgrow the static grid's 2-row cap
- each cell may pin ONE small overlay to a corner (tl · tr · bl · br)

### Strip `strip`
A horizontal rail of fixed-size items — compact recent-events scanning.
- fixed-size items, horizontally scannable

### Hero `hero`
The full-width media surface that anchors a screen; small elements overlay its corners.
- leads the screen — within the first two sections (lint-enforced)
- a media-led grid in the first two sections also satisfies the lead (camera consoles)
- overlays pin to corners (tl · tr · bl · br); keep them small

### Widget `widget`
The home-screen widget: one glance answers the template's question.
- widget-only — never inside a template screen (lint-enforced)
- round thumb · exactly ONE pill · one freshness line (tagline format) · name beneath
- an optional alert dot (priority-marker) pins to the thumb

### Chip bar `chips`
A wrapping row of pill chips — category filters above a list, or link chips under a card.
- text pills only, never media (that's Strip); wraps freely
- filter role sits between a header and its list; exactly one chip carries the selected state

---

## 5. Widget contract

Every template ships a home-screen widget: `{grad, alert?, pill, sub, name}` —
a round media thumb on a gradient, exactly ONE state pill, one freshness line
(relative time or duration, in the tagline format), the agent name beneath, and an optional alert dot.
The widget answers the template's question without opening it.

---

## 6. States & verification

**Empty / Loading are element STATES**, not layouts or elements: query-backed elements
declare `states:['empty','loading']` and render their own empty / loading chrome.
Grammar nodes `{empty:…}` / `{loading:true}` render the chrome and claim nothing.

The runtime lint (lintT4) enforces, per template:

- a hero (or media-led grid) within the first two sections
- every card opens with a title row
- event lists and logs show ≥ 4 rows before More; logs are titled
- list time / meta second lines use the tagline format
- static grids hold at most 2 rows — overflow moves to the scroll grid
- the widget pattern appears only as the widget
- every claim names a registry element with an allowed format; the coverage matrix
  reports exercised and unused element·format pairs honestly

---

## 7. Output contract — the template object

```js
{ id:'trash_bin_checker_v4', emoji:'🗑', title:'Trash Bin Checker',
  sub:'Attendance Verifier', goal:'Did the bins go out — and come back?',
  widget:{ grad:'…', alert:'#f6b73c',
    pill: S('state','badge',{tag:'BINS OUT',c:'#f6b73c'}),
    sub:  S('duration','text-small',{txt:'for 2h 4m'}),
    name: S('name-tag','text-tagline',{txt:'TRASH BINS'}) },
  sections:[ { lab:'state · how long', parts:[ /* nodes */ ] }, … ] }
```

**Node grammar** (what `parts` may contain):

| node | renders |
|---|---|
| `S(el, fmt, sample?)` | one element render — the leaf |
| `C(...slots)` | a column stacking slots |
| `{hdr:{t, right?}}` | section header (+ optional right slot) |
| `{row:[slots]}` | a flex row of slots |
| `{card:[parts]}` | bordered card (open with a `hdr`) |
| `{idcard:{t?, badge?, media, lines:[slots]}}` | entity intro — portrait + name/attributes/stats + optional verdict badge |
| `{list:[[slots],…]}` | list rows (lead · middle · right) |
| `{log:[[slots],…]}` | log rows (left · middle · right) |
| `{timeline:[{time, lead?, c?, body:[slots]},…]}` | vertical thread — dot + time (lead beneath) per moment, any content beside; newest first |
| `{grid:{cols, cells:[[slots],…]}}` | static grid, ≤ 2 rows; a cell item `{ov, at}` pins a corner overlay |
| `{sgrid:{cells:[[slots],…]}}` | scrollable one-row grid; cell overlays as in grid |
| `{strip:[slots]}` | media rail |
| `{hero:{grad, ov:[{el,fmt,s,at} \| {col:[slots],at}]}}` | media hero with corner overlays (`tl/tr/bl/br`) |
| `{chips:[slots]}` | chip bar |
| `{more:true}` | More paging footer |
| `{empty:{txt,sub}}` / `{loading:true}` | element-state chrome, claims nothing |

Every `S()` emits a claim `element·format` that the lint validates against the registry.

---

## 8. Worked example — Trash Bin Checker

Goal: *"Did the bins go out — and come back?"*

1. **state · how long** — card: header "Trash bins" · `state·text-large` OUT +
   `duration·badge` "for 2h 4m" · `description-detail·text-medium`.
2. **hero · curb check** — hero: `detection-marker·bound-box` "bins at curb" +
   `absolute-time·text-tagline` "checked 9:14 AM" (br).
3. **insight** — card: `insight·text-medium` full sentence + "Tuesday · pickup day" tagline.
4. **bin events** — list (4 rows): `media·small-thumb` · `description` over
   `relative-time·text-tagline` · `state·badge` — then `{more:true}`.
5. **pickup calendar** — header "Pickups this month" + `time-trend·month-chart`
   with weekly ✓ marks (today unmarked — pickup pending).
6. **nudge** — `suggestion·button` "Remind me to bring them back".
7. **widget** — BINS OUT pill · "for 2h 4m" · TRASH BINS, amber alert dot.

---

## 9. Quick routing cheatsheet

| goal shape | lead with | evidence | trend |
|---|---|---|---|
| binary state watch (door, stove) | state card + duration | state-band chart, log | daily-chart (state mode) |
| presence / wellbeing (baby, pet) | live hero + state overlay | event list, hourly chart | hourly/daily-chart |
| attendance verify (crew, trash) | state card | visit list + More | month-chart with marks |
| collection / discovery (birds) | hero + counts | scroll-grid gallery + chips | month-chart counts |
| fleet console (rentals) | KPI tiles + camera grid | cross-property list | per-subject log, NOT a time chart |
| instrument read (fridge) | measurement card | reading log | daily-chart |
