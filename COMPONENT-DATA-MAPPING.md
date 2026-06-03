# Component → Wyze AI One data mapping

How each of the 46 camera-UI components in this system maps to **real data available in
[Wyze AI One](../wyze-ai-one)**. Every endpoint and field below is verified against the
Wyze AI One codebase (`src/backend/api/external/*.py`, `src/backend/client_model/*.py`,
`src/backend/storage/models.py`). All external routes use the `/api` prefix.

This is the source-of-truth report behind the **Data check** tab in `index.html`.

## Purpose of the system (Spec v3 in brief)

The AI-Generated Camera UI System is a framework for an agent that **generates a camera
interface from a plain-language monitoring intent**. A goal is decomposed into a 7-field
**intent frame** (subject, condition, question, urgency, signalNature, cadence, output),
routed to one of **9 archetypes** (State Monitor, Event Watcher, Wellbeing, Discovery, Live
Assistant, Operations, Instrument Reader, Capture Logger, Attendance Verifier) at an
observation **cadence** (continuous / periodic / time-lapse / on-demand / window), then
modules are selected from a **46-module library** (9 families), arranged on a **6-slot layout
grammar** (S0 status · S1 hero · Sa actions · S2 insight · S3 activity · S4 analytics · S5
config), and each module is **bound to a detector** across three tiers:

- **Tier 1 — Catalog**: a pre-trained CV model (person, vehicle, package, pet, face, sounds).
- **Tier 2 — Composite**: catalog detectors + segmentation + temporal logic (door open/closed, duration, arrival/departure).
- **Tier 3 — Open-vocabulary VLM prompt**: a generated VLM/OCR prompt for novel goals with no catalog class.

In Wyze AI One, Tier 1/2 are the event pipeline (`tag_list`, detection chips), and **Tier 3
is the device-profile `user_prompt` evaluated by Gemini 2.5 Flash** — which is why `M-PROMPT`
is the single strongest fit in the library.

## Status summary

| Status | Count | Meaning |
|---|---|---|
| **Have** | **21** | Backed by real data today; component is doable as designed. |
| **Partial** | **16** | Data exists but must be derived, or the component must be redesigned to what the data supports. |
| **Missing** | **9** | The required data is not available in the app's API; would need new capability. |

## 1. What we have → doable (21)

`M-LIVE · M-SNAP · M-CLIP · M-REEL · M-GALLERY · M-GRID` (Vision) · `M-STATE` (State) ·
`M-FEED · M-FILTER · M-GROUPS` (Events) · `M-SCRUB · M-EVTLINE` (Timeline) ·
`M-RECAP · M-KPI` (Analytics) · `M-PROMPT · M-IDCARD · M-RULES` (Detection/Config) ·
`M-READOUT · M-CAPTURE · M-TIMESHEET · M-CALENDAR` (Readings).

## 2. What we don't have → redesign or new capability

**Partial (16)** — redesign to the data we have: `M-FOOTAGE, M-COMPARE, M-DURATION, M-SCORE,
M-MAPLINE, M-TREND, M-HEAT, M-ACT, M-DEVMAP, M-HEALTH, M-SOS, M-TICKET, M-JOURNAL, M-GAUGE,
M-LOG, M-REMINDER`.

**Missing (9)** — need new data/control: `M-TIMELAPSE, M-PTZ, M-VITALS, M-NIGHTGRAPH, M-TALK,
M-DETER, M-PLAY, M-ZONE, M-INVENTORY`. These cluster into: hardware controls not surfaced
(PTZ, two-way audio, siren, treat/laser), camera-impossible sensors (vitals), and stores not
built yet (time-lapse frames, zone polygons, inventory, sleep/session segmentation).

## 3. What we have, unused → new component opportunities

Wyze AI One has rich data that no current spec module consumes:

| Wyze data source | New component idea |
|---|---|
| `GET /api/stories` (tone, why_it_matters, evidence) | **Story / tone card** — narrative with all-clear/routine/notable/alert band (richer than M-RECAP). |
| `GET /api/household/visual-memories` (runs[]) | **Agent-activity card** — status_line + relevance_score + feedback per monitoring agent. |
| DynamoDB `device-scene-profiles` (no public route yet) | **Scene-profile card** — per-camera location, composition, light/clarity, suggested AI features. |
| `household_memories` store | **Learnings card** — preferences/patterns the home learned, with edit/forget. |
| `GET /api/household/usage` + `/usage/agents` | **Usage / cost card** — plan, wits balance, spent today, per-agent breakdown. |
| `GET /api/reid/identities/{id}/gallery` | **Identity manager** — prototype gallery with merge/label/rename. |
| `POST /api/events/search` (NL) | **Semantic search** — natural-language "find when…" over event history. |
| AskHome chat + suggestion chips | **Assistant + suggestions** — conversational layer with action/config/insight/memory/feedback chips. |
| feedback / signals | **Feedback loop** — thumbs + comment + relevance on any card, feeding agent refinement. |

## Per-component mapping

### A · Vision
| Module | Status | Wyze AI One source (endpoint → fields) | Note / achievable path |
|---|---|---|---|
| M-LIVE | Have | `POST /api/devices/{mac}/stream_params` → signaling_url, auth_token, ice_servers · `GET …/power_status` → is_on | Direct WebRTC live; gate on is_on. |
| M-SNAP | Have | `POST /api/devices/{mac}/capture_snapshot` → url · `POST /api/devices/thumbnails` → thumbnails, captured_at | Raw direct; annotated/fused overlays bbox_xywh + video_description from the eventgroup artifact. |
| M-CLIP | Have | `POST /api/events/video_url` → url (MP4/MPD) · `POST /api/events/filter` → event_ts, tag_list, video_description | Event-triggered clip; tag_list = trigger. |
| M-FOOTAGE | Partial | `POST /api/events/filter` → event_ts | No 24/7 scrub index. Build activity-density scrub from event_ts; continuous record needs Cam-Plus index (not surfaced). |
| M-TIMELAPSE | Missing | — | No frame-sequence store. Schedule capture_snapshot (EventBridge) into an ordered sequence. |
| M-REEL | Have | `GET /api/eventgroups/{id}/artifact` → gif_url · `POST /api/eventgroups/digest` → highlights | Montage = event-group GIF; digest = highlights. |
| M-GALLERY | Have | `GET /api/eventgroups` → ai_tags, thumbnail_url · `GET /api/reid/identities` → entity_type, image_url | Group by tag or identity. |
| M-COMPARE | Partial | `capture_snapshot` → url · `thumbnails` → captured_at | No stored pairs; pick two captures at two times. Growth comparison needs the time-lapse store. |
| M-GRID | Have | `GET /api/devices` → device_mac, device_name · `…/stream_params` | Multi-cam tiles, one stream per tile. |
| M-PTZ | Missing | — | No PTZ control endpoint (only power on/off). |

### B · State & Status
| Module | Status | Source | Note |
|---|---|---|---|
| M-STATE | Have | `GET /api/household/visual-memories` → runs[].status_line · `…/power_status` → is_on | status_line ("Door closed (3h)") is VLM-derived present-tense state. |
| M-DURATION | Partial | `POST /api/events/filter` → event_ts deltas · `…/profile` → threshold_level | No structured time-in-state; compute from state-change timestamps. |
| M-VITALS | Missing | `…/eventgroups/{id}/artifact` → bbox_xywh (occupancy only) | No pulse/O₂/temp from cameras; occupancy count derivable. |
| M-SCORE | Partial | `GET /api/eventgroups` → score · visual-memories → relevance_score | Scores exist, different semantics; define a composite vs baseline. |

### C · Events
| Module | Status | Source | Note |
|---|---|---|---|
| M-FEED | Have | `POST /api/events/filter` → event_ts, tag_list, event_resources, video_description · `…/insights` → description_title, score | Core fit. |
| M-FILTER | Have | `GET /api/events/tags` (50+) · `…/filter` → tag_list, device_mac | Direct. |
| M-GROUPS | Have | `GET /api/eventgroups` → ai_tags, event_count, cameras | Bucket by ai_tags. |

### D · Timeline
| Module | Status | Source | Note |
|---|---|---|---|
| M-SCRUB | Have | `POST /api/events/filter` → event_ts | Markers direct; density shading by binning timestamps. |
| M-EVTLINE | Have | `POST /api/events/filter` → event_ts, tag_list | Day-axis markers + day/night shading. |
| M-NIGHTGRAPH | Missing | — | No session segmentation; VLM-classify a window into labeled segments via user_prompt. |
| M-MAPLINE | Partial | `GET /api/reid/identities/{id}/appearances` → device_mac, timestamp_ms, device_coverage | Cross-camera presence available; map needs device coordinates (missing). |

### E · Analytics
| Module | Status | Source | Note |
|---|---|---|---|
| M-TREND | Partial | `…/events/filter` → event_ts counts · `…/household/usage` → wits_spent_today | Event/usage trends doable; arbitrary metric series not stored. |
| M-HEAT | Partial | `…/eventgroups/{id}/artifact` → bbox_xywh, frame_timestamp_ms | Strong latent fit: accumulate bbox centers into a spatial grid overlay. |
| M-RECAP | Have | `GET /api/stories` → narrative, why_it_matters, highlights, tone · `…/digest` | Story narrative is this module. |
| M-KPI | Have | `…/eventgroups` → event_count · `…/power_status` → is_on · `…/household/usage` → wits_balance | Headline tiles from counts. |

### F · Controls & Actions
| Module | Status | Source | Note |
|---|---|---|---|
| M-ACT | Partial | `POST /api/devices/{mac}/power_on` · `…/power_off` | Power control only; map open/close→power for switchables. |
| M-TALK | Missing | — | No two-way audio endpoint. |
| M-DETER | Missing | — | No siren/lights endpoint. |
| M-PLAY | Missing | — | No treat/laser accessory control. |

### G · Detection & Config
| Module | Status | Source | Note |
|---|---|---|---|
| M-PROMPT | Have | `GET/PUT /api/devices/{mac}/profile` → user_prompt (≤4000), threshold_level · `tools/vlm.py` (Gemini) | **Best fit** — the profile user_prompt is the open-vocab VLM detector. |
| M-IDCARD | Have | `GET /api/reid/identities` → identity_name, entity_type, image_url, attributes, is_known_identity, last_recognized_ts | Direct. |
| M-RULES | Have | `…/profile` → threshold_level, user_prompt, personalized_preference · `GET /api/agents` → triggers, quiet_hours | Maps to profile + triggers + quiet hours. |
| M-ZONE | Missing | — | No zone-polygon storage; add to device profile, render over current frame. |

### H · Fleet & Escalation
| Module | Status | Source | Note |
|---|---|---|---|
| M-DEVMAP | Partial | `GET /api/devices` · `…/power_status` → is_on | Status roll-up yes; positional map needs coordinates (missing). |
| M-HEALTH | Partial | `GET /api/devices` → firmware_ver · `…/power_status` → is_on | Online+firmware yes; battery/signal/storage/uptime not in model. |
| M-SOS | Partial | `GET /api/household` → members · push subscriptions | Escalation tree on members+push; call/SMS needs comms integration. |
| M-TICKET | Partial | `GET /api/eventgroups` → status · `/api/signals` | Closest primitives; full assignable workflow needs extension. |
| M-JOURNAL | Partial | `GET /api/household/visual-memories` → runs[].summary, created_at | Chronological log exists; user-written journal needs an entry store. |

### I · Readings & Records
| Module | Status | Source | Note |
|---|---|---|---|
| M-READOUT | Have | `…/capture_snapshot` → url · `tools/vlm.py` (Gemini OCR via user_prompt) | On-demand value read; persist for history. |
| M-GAUGE | Partial | `…/capture_snapshot` → url · `tools/vlm.py` | Value via VLM; safe-range band defined in profile, dial rendered in UI. |
| M-LOG | Partial | `POST /api/events/filter` → event_ts | Event log yes; periodic reading log needs persisted scheduled readings. |
| M-INVENTORY | Missing | — | No inventory data; VLM shelf-scan into an inventory store. |
| M-CAPTURE | Have | `…/capture_snapshot` · `…/capture_video` → url · `…/thumbnails` | Capture action + recent-captures strip. |
| M-TIMESHEET | Have | `GET /api/reid/identities/{id}/appearances` → device_mac, timestamp_ms, thumbnail_url · `…/events/video_url` | Derive arrival/departure/duration from a person identity’s appearances; link each row’s clip. |
| M-REMINDER | Partial | `GET /api/agents` → triggers (schedule) | Scheduled triggers as reminders; elapsed-time from last event_ts. |
| M-CALENDAR | Have | `POST /api/eventgroups/digest` → per-date counts · `…/events/filter` → event_ts | Occurrence density per day. |

---
*Generated for the Wyze AI One integration · mirrors the **Data check** tab in `index.html`.*
