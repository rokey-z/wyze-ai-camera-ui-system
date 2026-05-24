# AI Camera UI Builder — Build Reference (v3)

**Audience:** the camera-builder skill/agent. **Purpose:** given a user's plain-language
monitoring goal, this reference is everything needed to generate a customized camera UI
specification. Section 1 is the procedure; Sections 2–12 are lookup tables it calls;
Section 13 is the output contract; Section 14 is a worked example.

This reference consolidates the operational rules from the three-part research
specification. It is self-contained — the builder does not need the narrative documents.

---

## 1. Build procedure

Run these six stages in order. Each stage's output is named and consumed by the next.

```
STAGE 1  CAPTURE      raw goal text  (+ optional: camera placement, subject identity, example image / frame tap)
STAGE 2  DECOMPOSE    raw goal      -> intent frame            [§2]
STAGE 3  ROUTE        intent frame  -> archetype + cadence + confidence   [§3, §4]
                      if archetype confidence < 0.60  -> CUSTOM COMPOSITION   [§11.4]
                      if any intent-frame field confidence < 0.50 -> ask ONE clarifying question, then re-decompose
STAGE 4  SELECT       archetype     -> module set            [§5, §8]
STAGE 5  COMPOSE      module set    -> vision surface + slotted layout   [§6, §7]
STAGE 6  BIND         each module   -> detector across 3 tiers   [§9]
EMIT                  -> UI specification object             [§13]
```

Stages 4–6 are deterministic given the intent frame and the lookup tables. Stages 2–3
are LLM judgments; always emit a confidence score and honor the gates above.

---

## 2. Intent frame schema

Stage 2 decomposes the raw goal into exactly these seven fields. Every later stage reads
only the frame. Force the model to commit to each field; flag any field below 0.50
confidence for a clarifying question.

| # | Field | Type | Allowed values / form | Drives |
|---|-------|------|----------------------|--------|
| 1 | `subject` | string | the entity or region watched | binding, zone setup |
| 2 | `condition` | string | the state / event / value of interest | binding, archetype |
| 3 | `question` | string | what the user wants answered | layout emphasis |
| 4 | `urgency` | enum | `low` \| `medium` \| `high` \| `critical` | alerting policy |
| 5 | `signalNature` | enum | `state` \| `event` \| `value` \| `item` \| `presence` \| `wellbeing` | archetype routing |
| 6 | `cadence` | enum | see §4 | detector schedule, layout, cost |
| 7 | `outputPreference` | enum (multi) | `glance` \| `alert` \| `recap` \| `log` \| `collection` \| `history` | module & layout selection |

`signalNature` and `cadence` are distinct: `signalNature` is *what kind of thing* is
observed; `cadence` is *how often the camera looks*. A meter is `value` + `periodic`; a
plant is `state` + `time-lapse`.

---

## 3. Archetype catalog (9)

Stage 3 classifies the intent frame into ONE archetype. The strongest routing signal is
`signalNature`, refined by `subject` and `urgency`. Each archetype carries a default
module set, an alerting policy, and a default vision surface.

| Archetype | Routes when | Core question |
|-----------|-------------|---------------|
| `STATE_MONITOR` | signalNature = state | What state is it in, and for how long? |
| `EVENT_WATCHER` | signalNature = event, urgency ≥ medium | Did a noteworthy event occur? |
| `WELLBEING_MONITOR` | signalNature = wellbeing, or subject is a person/pet + safety | Is this person or pet safe and healthy? |
| `DISCOVERY` | signalNature = event, urgency = low | What appeared — can I savor and collect it? |
| `LIVE_ASSISTANT` | question asks "what should I do next" | What is happening now, and what's my next step? |
| `OPERATIONS` | multiple sites/devices in subject | What needs attention across my sites? |
| `INSTRUMENT_READER` | signalNature = value | What does it read right now? |
| `CAPTURE_LOGGER` | signalNature = item | Record this — what do I have / need? |
| `ATTENDANCE_VERIFIER` | signalNature = presence, subject is an expected agent | Did the expected person show up — when, how long? |

### Per-archetype defaults

| Archetype | Default cadence | Required modules | Alerting policy | Vision: signal / treatment / layout / role |
|-----------|----------------|------------------|-----------------|-------------------------------------------|
| `STATE_MONITOR` | continuous | M-SNAP, M-STATE, M-DURATION, M-ACT, M-RULES | transitions + threshold breach only; never on steady state | snapshot / annotated / fused-overlay / **proof** |
| `EVENT_WATCHER` | continuous | M-LIVE, M-FEED, M-FILTER, M-SCRUB, M-RULES | aggressive false-positive suppression; instant on the critical event | live + clip / raw + cropped / full-bleed hero + filmstrip / **hero** |
| `WELLBEING_MONITOR` | continuous | M-SCORE or M-VITALS, M-LIVE, M-NIGHTGRAPH, M-RECAP, M-SOS, M-RULES | throttle routine activity; instant escalation on the critical event | live + clip / raw or abstracted / framed co-hero / **reassurance** |
| `DISCOVERY` | continuous | M-GALLERY, M-IDCARD, M-FILTER, M-TREND | deliver all events at low urgency; no alarms | collection / cropped-to-subject / mosaic + hero crop / **hero** |
| `LIVE_ASSISTANT` | continuous | M-LIVE, M-VITALS, M-NIGHTGRAPH, M-ACT | real-time cues only; minimal history | live / annotated / full-bleed hero / **hero** |
| `OPERATIONS` | continuous | M-GRID, M-MAPLINE, M-KPI, M-FEED, M-TICKET, M-HEALTH | exception-flagged; routed to ticket workflow | multi-view / raw + annotated / mosaic grid / **hero** |
| `INSTRUMENT_READER` | periodic | M-SNAP, M-READOUT, M-LOG, M-TREND, M-RULES | abnormal jump or stalled reading only | snapshot / cropped + annotated / fused-overlay / **proof** |
| `CAPTURE_LOGGER` | on-demand | M-CAPTURE, M-SNAP, M-INVENTORY, M-LOG, M-RULES | restock / threshold flags; no real-time alerts | snapshot / raw / filmstrip + inline / **proof** |
| `ATTENDANCE_VERIFIER` | window | M-TIMESHEET, M-CLIP, M-CALENDAR, M-LIVE, M-RULES | no-show or short-visit alert | clip / cropped-to-subject / inline-per-row / **proof** |

The archetype is a **prior, not a gate** — see §11.4 for the low-confidence path.

---

## 4. Observation cadence (5)

`cadence` is intent-frame field 6. It governs the detector schedule, the compute/power
budget, data retention, and the layout.

| Cadence | Meaning | Consequences |
|---------|---------|--------------|
| `continuous` | watches in real time | live feed present; highest compute; safety-critical watches |
| `periodic` | samples on an interval (hourly, daily) | no live feed; one VLM/OCR call per sample; cheap; meter & gauge reading |
| `time-lapse` | captures slowly over days–months | frames stored as a sequence; UI = time-lapse player + compare; plant growth, construction |
| `on-demand` | fires on user action or a presence trigger | near-zero idle cost; product scans, meal logging, read-aloud |
| `window` | watches only during a scheduled period | detector armed on a schedule; service-window verification, nighttime watching |

Rule: if cadence ≠ `continuous`, do **not** auto-include M-LIVE as hero; use M-SNAP,
M-TIMELAPSE, or M-CLIP per the archetype's vision default.

---

## 5. Module library (46 modules, 9 families)

Each module has: a data contract (signal shape consumed), a detection requirement, size
variants (`hero` / `panel` / `strip` / `compact`), and per-archetype priority weights.
The builder reasons over contracts only; it never renders pixels directly.

### Family A — Vision (10) — every camera-visual surface

| ID | Carries signal | Notes |
|----|----------------|-------|
| `M-LIVE` | live | real-time stream |
| `M-SNAP` | snapshot | latest or on-demand still; the workhorse of state/reader/logger |
| `M-CLIP` | event clip | player for one recorded event |
| `M-FOOTAGE` | continuous footage | full scrubbable record |
| `M-TIMELAPSE` | timelapse | accelerated long-duration sequence |
| `M-REEL` | highlight reel | auto-compiled montage of a period |
| `M-GALLERY` | collection | browsable grid grouped by entity |
| `M-COMPARE` | comparison pair | two time-aligned visuals, split layout |
| `M-GRID` | multi-view | synchronized multi-camera tiles |
| `M-PTZ` | (control) | pan / tilt / zoom over a live signal |

### Family B — State & Status (4)

| ID | Function |
|----|----------|
| `M-STATE` | binary/multi-state badge (open/closed, on/off, present/missing) |
| `M-DURATION` | elapsed-time-in-state counter; turns red past a threshold |
| `M-VITALS` | live numeric metrics (pulse, O₂, temp, occupancy count) |
| `M-SCORE` | composite rolled-up score with trend vs. baseline |

### Family C — Events (3)

| ID | Function |
|----|----------|
| `M-FEED` | reverse-chron AI-tagged snapshot cards |
| `M-FILTER` | category filter chips over a feed or gallery |
| `M-GROUPS` | clips bucketed by trigger type |

### Family D — Timeline (4)

| ID | Function |
|----|----------|
| `M-SCRUB` | continuous time axis with activity shading |
| `M-EVTLINE` | discrete event markers on a day axis |
| `M-NIGHTGRAPH` | color-coded segments of a bounded session |
| `M-MAPLINE` | cross-camera movement fused on one timeline + map |

### Family E — Analytics (4)

| ID | Function |
|----|----------|
| `M-TREND` | a metric over time (line/bar); supports baseline compare |
| `M-HEAT` | spatial activity heat map |
| `M-RECAP` | AI plain-language summary of a period |
| `M-KPI` | headline-number tiles, exception-flagged |

### Family F — Controls & Actions (4)

| ID | Function |
|----|----------|
| `M-TALK` | two-way audio |
| `M-DETER` | siren / lights / escalating deterrent |
| `M-PLAY` | interaction control (treat toss, laser, recorded call) |
| `M-ACT` | quick action bound to the monitored thing (open/close, mute, mark-handled) |

### Family G — Detection & Config (4)

| ID | Function |
|----|----------|
| `M-ZONE` | draw regions of interest on the frame |
| `M-PROMPT` | natural-language detection prompt (VLM-bound) |
| `M-IDCARD` | identity panel for a recognized subject (species, face, plate) |
| `M-RULES` | thresholds, schedules, sensitivity, escalation targets |

### Family H — Fleet & Escalation (5)

| ID | Function |
|----|----------|
| `M-DEVMAP` | cameras on a map / floorplan with status badges |
| `M-HEALTH` | battery, signal, storage, uptime; fleet roll-up |
| `M-SOS` | emergency escalation / caregiver call tree |
| `M-TICKET` | assign / investigate / resolve workflow on an event |
| `M-JOURNAL` | logged care / operational entries |

### Family I — Readings & Records (8)

| ID | Function |
|----|----------|
| `M-READOUT` | large numeric/text value display; supports read-aloud variant |
| `M-GAUGE` | analog gauge/dial with current value and safe-range band |
| `M-LOG` | timestamped running log of readings or captures |
| `M-INVENTORY` | item list with counts, stock status, restock flags |
| `M-CAPTURE` | scan/capture action + recent-captures strip |
| `M-TIMESHEET` | visit log — arrival, departure, duration, status — each row a clip |
| `M-REMINDER` | schedule- or elapsed-time reminder card |
| `M-CALENDAR` | heatmap calendar of occurrences |

---

## 6. Vision surface

Every UI carries at least one Vision Surface — a configured Family-A module. The builder
sets four properties.

**Signal (9):** `live`, `snapshot`, `event-clip`, `continuous-footage`, `timelapse`,
`highlight-reel`, `collection`, `comparison-pair`, `multi-view`.

**Treatment (4):** `raw` · `annotated` (boxes, zones, OCR digits, pose, timers, status
words drawn on the frame) · `cropped-to-subject` · `abstracted` (pose skeleton, silhouette,
heatmap, blur — for privacy or clarity).

**Layout (9):** `full-bleed-hero` · `framed-panel` · `inline-thumbnail` · `filmstrip` ·
`mosaic-grid` · `split` · `picture-in-picture` · `fused-overlay` (data drawn ON the visual)
· `ambient-backdrop`.

**Role (3):** `hero` (visual is the largest element) · `proof` (visual fused with / bound
to the data as evidence — one unit) · `reassurance` (co-hero beside a non-image insight).

**RULE — vision is never absent.** Every emitted UI has ≥1 Vision Surface in a `hero`,
`proof`, or `reassurance` role. The builder chooses the role; it never omits the visual.
For `value` and `state` goals use `fused-overlay` + `proof` — the number/state word is
drawn on its source frame, not placed beside an icon.

**Playback mode** is set with the signal: `live` auto-plays; `highlight-reel` and
`timelapse` loop; `event-clip` is tap-to-play; `continuous-footage` is scrub; `snapshot`
is static.

---

## 7. Layout slot grammar (6 slots)

Place modules into six ordered slots, top to bottom. The archetype sets which slot is the
hero; per-module priority weights order modules within a slot.

| Slot | Role | Typical occupants |
|------|------|-------------------|
| `S0` Status strip | at-a-glance condition, always visible | M-STATE, M-HEALTH badge, alert status |
| `S1` Hero | the single most important surface | archetype-dependent: M-LIVE / M-SNAP+M-STATE / M-SCORE / M-GALLERY / M-READOUT / M-CAPTURE / M-TIMESHEET |
| `S2` Primary insight | answers the core question | M-DURATION, M-NIGHTGRAPH, M-VITALS, M-KPI, M-TREND |
| `S3` Activity | events and time | M-FEED, M-FILTER, M-SCRUB, M-EVTLINE, M-CLIP |
| `S4` Analytics | aggregate view | M-TREND, M-HEAT, M-RECAP, M-CALENDAR |
| `S5` Action dock | controls and config | M-ACT, M-TALK, M-DETER, M-PLAY, M-SOS, M-RULES |

Hero rewiring by archetype: EVENT_WATCHER/LIVE_ASSISTANT → live in S1; STATE_MONITOR →
M-SNAP+M-STATE fused in S1; WELLBEING → M-SCORE/M-VITALS in S1 with M-LIVE co-hero;
DISCOVERY → M-GALLERY in S1; INSTRUMENT_READER → M-SNAP+M-READOUT fused in S1;
CAPTURE_LOGGER → M-CAPTURE in S1; ATTENDANCE_VERIFIER → M-TIMESHEET in S1; OPERATIONS →
M-GRID in S1.

---

## 8. Composition matrix (archetype → module)

`R` required · `C` conditional (admit if scored in by the intent frame) · `–` rarely used.
Start from the archetype column; promote/suppress conditionals from intent specifics.

| Module | STATE | EVENT | WELL | DISC | LIVE | OPS | READER | LOGGER | VERIFIER |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| M-LIVE | C | R | R | C | R | C | – | – | C |
| M-SNAP | R | C | C | – | C | – | R | R | C |
| M-CLIP | C | R | C | C | – | C | – | – | R |
| M-GALLERY | – | – | – | R | – | – | – | – | – |
| M-GRID | – | C | – | – | – | R | – | – | – |
| M-TIMELAPSE | C | – | – | C | – | – | C | – | – |
| M-COMPARE | C | – | – | C | – | C | C | C | – |
| M-STATE | R | C | R | – | C | C | – | – | – |
| M-DURATION | R | – | C | – | C | – | – | – | C |
| M-VITALS | – | – | R | – | R | C | – | – | – |
| M-SCORE | – | – | R | C | – | C | – | – | – |
| M-FEED | C | R | C | C | – | R | – | C | R |
| M-FILTER | – | R | – | R | – | R | – | – | – |
| M-SCRUB | C | R | C | – | – | C | – | – | – |
| M-NIGHTGRAPH | – | – | R | – | C | – | – | – | – |
| M-TREND | C | – | R | C | – | R | R | C | – |
| M-RECAP | C | C | R | C | – | R | C | C | – |
| M-KPI | – | – | – | – | – | R | – | – | – |
| M-ACT | R | C | – | – | C | C | – | – | – |
| M-DETER | – | R | – | – | – | – | – | – | – |
| M-IDCARD | – | C | – | R | – | C | – | – | C |
| M-PROMPT | C | C | – | – | – | – | C | C | – |
| M-SOS | – | – | R | – | – | – | – | – | – |
| M-TICKET | – | – | – | – | – | R | – | – | – |
| M-DEVMAP | – | C | – | C | – | R | – | – | – |
| M-READOUT | – | – | – | – | – | – | R | – | – |
| M-GAUGE | – | – | – | – | – | – | C | – | – |
| M-LOG | C | – | – | – | – | C | R | R | C |
| M-INVENTORY | – | – | – | – | – | – | – | R | – |
| M-CAPTURE | – | – | – | – | – | – | – | R | – |
| M-TIMESHEET | – | – | – | – | – | – | – | – | R |
| M-REMINDER | C | – | C | – | – | – | C | R | – |
| M-CALENDAR | – | C | – | C | – | C | C | C | R |
| M-RULES | R | R | R | C | C | R | R | R | R |

Modules not listed (M-FOOTAGE, M-REEL, M-PTZ, M-EVTLINE, M-MAPLINE, M-HEAT, M-TALK,
M-PLAY, M-ZONE, M-HEALTH, M-JOURNAL, M-GROUPS) are all-conditional — admit only when the
intent frame explicitly calls for them.

---

## 9. Detection binding (3 tiers)

Stage 6 binds each module's data contract to a real signal. Try tiers in order.

| Tier | Mechanism | Use when | Examples |
|------|-----------|----------|----------|
| **Tier 1 — catalog** | a pre-trained CV model | the condition is a known class | person, vehicle, package, animal, face, pet; sounds: cry, bark, glass-break, smoke alarm; pose / fall |
| **Tier 2 — composite** | catalog detectors + segmentation + temporal logic | condition derived from known primitives | door open/closed, duration, presence/absence, occupancy count, arrival/departure |
| **Tier 3 — open-vocabulary prompt** | a generated VLM/OCR prompt evaluated on frames | no catalog detector exists | "Is a visible flame on the stovetop?", meter-digit OCR, "Is the trash bin in its usual spot?" |

**Tier 3 is a detection program, not a single prompt.** Emit: a prompt with a forced
structured answer (`{value|boolean, confidence}`), a confidence threshold, temporal
debouncing (N consistent frames before firing), and a calibration pass (user confirms/
corrects the first ~6 detections to tune the threshold). Tier-3 modules render with a
visible confidence indicator and a one-tap "correct this" affordance until calibration
converges. Default thresholds conservative.

Cost rule: never run a VLM every frame. Gate Tier-3 with a cheap motion or catalog
detector and invoke the VLM only on candidate frames; for `periodic`/`on-demand` cadence,
invoke on the schedule only.

---

## 10. Alerting policy by archetype

| Archetype | Delivery | Throttle | Quiet hours |
|-----------|----------|----------|-------------|
| STATE_MONITOR | on transition + threshold breach | no steady-state alerts | respect |
| EVENT_WATCHER | per qualifying event | heavy false-positive suppression | configurable |
| WELLBEING_MONITOR | routine throttled; critical instant | ~1 routine alert / 15 min | never throttle critical |
| DISCOVERY | every event, low urgency | none (it is content) | batch overnight |
| LIVE_ASSISTANT | real-time cue | none | n/a (session-bound) |
| OPERATIONS | exception → ticket | per-rule | per-site |
| INSTRUMENT_READER | abnormal jump / stalled reading | no per-reading alerts | respect |
| CAPTURE_LOGGER | restock / threshold flag | batched | respect |
| ATTENDANCE_VERIFIER | no-show / short-visit | one per service window | n/a |

---

## 11. Decision rules & guardrails

**11.1 Module count cap.** Main screen ≤ 7 modules. On overflow, demote lowest-scoring
conditionals to a secondary "more" surface — never the main screen.

**11.2 Never drop a required module silently.** If a required module cannot bind to a
detector in Stage 6, surface a capability gap to the user; do not ship a broken UI.

**11.3 Dependency rules.** M-DURATION requires M-STATE. M-FILTER requires M-FEED or
M-GALLERY. M-SOS requires a critical-event detector. M-IDCARD requires a recognition
model. M-TIMESHEET requires M-CLIP for evidence rows. M-INVENTORY requires M-CAPTURE.
Deduplicate timeline modules — at most one of M-SCRUB / M-EVTLINE / M-NIGHTGRAPH unless
intent justifies more.

**11.4 Custom composition (low archetype confidence).** If archetype confidence < 0.60,
do not force a match. Select modules directly from the intent frame: map `signalNature`
and `outputPreference` to module families, admit M-RULES + a Vision Surface always, and
bind via Tier 3. The archetype accelerates the common case; the intent frame + module
contracts + Tier-3 binding guarantee the long tail is always reachable.

**11.5 Vision is never absent.** Enforce the §6 rule at emit time. Reject any UI spec
with no Vision Surface.

**11.6 Privacy by archetype.** WELLBEING goals aimed at a person default to `abstracted`
treatment (pose) availability and on-device processing where possible.

**11.7 One clarifying question maximum.** If decomposition or routing is below threshold,
ask exactly one targeted question, then proceed. Do not interrogate the user.

---

## 12. Worked example

**Goal:** "Tell me if I left the stove on."

```
STAGE 2  intent frame:
  subject="stovetop / cooktop"  condition="active burner with nobody attending"
  question="is it on while unattended?"  urgency="high"
  signalNature="state"  cadence="continuous"  outputPreference=["alert","glance"]
STAGE 3  archetype=STATE_MONITOR  confidence=0.82  -> proceed
STAGE 4  modules: M-SNAP(R) M-STATE(R) M-DURATION(R) M-ACT(R) M-RULES(R)
                  + M-PROMPT(C, promoted: novel detection) + M-RECAP(C)
STAGE 5  vision surface: signal=snapshot treatment=annotated layout=fused-overlay role=proof
         layout: S0 strip=M-STATE  S1 hero=M-SNAP+M-STATE(fused)  S2=M-DURATION
                 S5=M-PROMPT,M-RULES,M-ACT
STAGE 6  binding:
  M-STATE/M-SNAP -> Tier 3 VLM prompt "Is a visible flame or glowing hot element on the
                    stovetop?" {boolean,confidence} threshold=0.7 debounce=3 frames
  "unattended"   -> Tier 1 person detector (absence near cooktop)
  M-DURATION     -> Tier 2 state-change timestamps
EMIT  -> see §13
```

---

## 13. Output contract

The builder emits one UI specification object. Shape:

```json
{
  "goal": "string (raw user goal)",
  "intentFrame": { "subject": "...", "condition": "...", "question": "...",
                   "urgency": "high", "signalNature": "state",
                   "cadence": "continuous", "outputPreference": ["alert","glance"] },
  "archetype": "STATE_MONITOR",
  "archetypeConfidence": 0.82,
  "alerting": { "delivery": "transition+threshold", "throttle": "no-steady-state",
                "quietHours": true },
  "visionSurface": { "signal": "snapshot", "treatment": "annotated",
                     "layout": "fused-overlay", "role": "proof",
                     "playback": "static" },
  "layout": [
    { "slot": "S0", "module": "M-STATE", "size": "strip" },
    { "slot": "S1", "module": "M-SNAP", "size": "hero", "fusedWith": "M-STATE" },
    { "slot": "S2", "module": "M-DURATION", "size": "panel" },
    { "slot": "S5", "module": "M-PROMPT", "size": "panel" },
    { "slot": "S5", "module": "M-RULES", "size": "compact" },
    { "slot": "S5", "module": "M-ACT", "size": "compact" }
  ],
  "bindings": [
    { "module": "M-SNAP", "tier": 3, "prompt": "Is a visible flame or glowing hot element on the stovetop?",
      "answerShape": "{boolean,confidence}", "threshold": 0.7, "debounceFrames": 3,
      "calibration": "user confirms first 6" },
    { "module": "M-STATE", "tier": 3, "source": "shared with M-SNAP" },
    { "module": "M-DURATION", "tier": 2, "source": "state-change timestamps" }
  ],
  "capabilityGaps": []
}
```

Rules for the emitted object: `layout` has ≤ 7 main-screen entries (§11.1); exactly one
entry has `role` resolving to the hero slot S1; `visionSurface` is always present
(§11.5); every required module appears in `bindings` or in `capabilityGaps` (§11.2).

---

## 14. Quick routing cheatsheet

| If the user says… | signalNature | archetype | cadence |
|-------------------|--------------|-----------|---------|
| "tell me if X is open/on/left out" | state | STATE_MONITOR | continuous |
| "alert me when X happens / someone does Y" | event | EVENT_WATCHER | continuous |
| "is my baby/parent/pet OK / safe" | wellbeing | WELLBEING_MONITOR | continuous |
| "show me which birds/animals visit" | event (low urgency) | DISCOVERY | continuous |
| "guide me / what do I do next" | — | LIVE_ASSISTANT | continuous |
| "across my properties / all my cameras" | — (multi-site) | OPERATIONS | continuous |
| "read / track the meter / gauge / display" | value | INSTRUMENT_READER | periodic |
| "log / count / what do I have / restock" | item | CAPTURE_LOGGER | on-demand |
| "did the crew / aide / kid show up / how long" | presence | ATTENDANCE_VERIFIER | window |
| "watch X grow / change over weeks" | state | (route by subject) | time-lapse |
| anything that matches nothing above | — | custom composition §11.4 | infer |

---

*Reference v3 · May 2026 · consolidated from the three-part AI-Generated Camera UI
specification. Module count: 46 across 9 families. Archetypes: 9. Cadences: 5.*
