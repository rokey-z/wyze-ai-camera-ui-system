# Smart Cards — UI Logic & Rules (Integration Spec)

**Audience:** the coding agent that plugs the Smart Cards experience from this mockup into the
real Wyze system. Read this file first, before `index.html`.
**Version:** matches [`VERSION`](VERSION) (0.12.x). Change history is in [`CHANGELOG.md`](CHANGELOG.md).
**Live reference:** https://rokey-z.github.io/wyze-ai-camera-ui-system/smart-cards.html

The mockup is the behavioral reference. This document explains *why* it behaves that way and which
rules must survive the move. When code and this document disagree, the code is what shipped, so fix
this document in the same change.

---

## 0. Ground rules for the integrating agent

1. **Everything is in `index.html`.** Line numbers drift, so search by the identifiers in §15.
   Smart Cards code is the `SMART_CARD_*` constants, the `*SmartCard*` functions, and the `.sc-*`
   CSS classes.
2. **Separate the rules from the mock data.** Every rule in this doc is real product behavior.
   Every value in the `SMART_CARD_*` tables is a placeholder, and §14 lists what each one stands
   for in production.
3. **One answer per goal.** A Smart Card answers one question the user checks their cameras for,
   such as "Is the garage closed?". It doesn't list events. Don't add clip feeds or event lists
   to the card face; they belong in the detail sheet.
4. **Honesty beats calm.** A card must never show a reassuring state (SAFE, CLOSED, ALL ONLINE) when
   its camera can't see. If a camera is offline, the card says so. This matches the Wyze AI One
   rule "quiet must never masquerade as blind". See §11.
5. **Keep motion optional.** Every animation has a `prefers-reduced-motion` fallback. New motion
   must add one too.
6. **Verify.** Run the checks in §16 before calling a change done.

---

## 1. Vocabulary

| Term | Meaning | In code |
|---|---|---|
| **Goal** (scene) | One thing the user monitors, such as the garage door or packages. One card per goal. | `data-scene` on the card: `security, garage, front, ev, bins, birds, pets, wildlife, health` |
| **Goal line** | Small uppercase label at the card's top left, such as "GARAGE MONITOR" | `.sc-card>.sc-label` |
| **State** | The one-word or short answer, such as OPEN, SAFE, or 1 OFFLINE | `.sc-state` |
| **Duration (sub)** | How long the state has held, or a qualifier, such as "for 15 mins" | `.sc-sub` |
| **Checked** | Freshness of the last look, such as "18 secs ago" | `card.dataset.checked` |
| **Card mode** | Which data a card shows: `normal`, `alert`, `suggested`, `highlights` | `card.dataset.cardMode` |
| **Page state** | The top switch: Mixed, Normal, Alert, New | `setSmartCardState(mode)` with `mixed / normal / alert / suggested` |
| **Critical alert** | The single most important alert on screen. It gets a red outline and the live window. | `.is-critical-alert` |
| **Camera offline** | A goal whose bound camera is offline. It says so instead of showing a calm or stale state (§11). | `.is-camera-offline` |
| **Suggestion** | A card the AI proposes and the user hasn't kept yet. Shown with a NEW badge. | `.is-suggested-card` |
| **Evidence** | Why the AI believes the state: video frames, household memory, and a recommendation | `SMART_CARD_EVIDENCE` |
| **Highlight** | A recent notable event that outranks a boring current state, such as a cardinal visit | `SMART_CARD_STATES.highlights` |
| **Focus box** | The detection region that justifies the state | `.sc-detection-box` |
| **Learned fact** | Something the AI noticed while learning the home, such as "Garage door" | `SMART_CARD_LEARNED` |

---

## 2. Screen anatomy (top to bottom)

1. **Top line** (`.sc-mode-row`), pinned on phones (≤620px) and on the standalone route:
   - **WYZE wordmark** (`.sc-brand`), with a small version label under it. The label is read
     from `VERSION`, and a test keeps the fallback in sync. Both are hidden at 400px wide or
     less, so the controls fit.
   - **Theme button** (`#sc-theme-toggle`): light or dark.
   - **View button** (`.sc-view-cycle`): one button that cycles list → grid → wall → flip (§5).
   - **Auto zoom button** (`.sc-zoom-toggle`): on by default (§5.5).
   - **State switch** (`.sc-state-mode`): Mixed, Normal, Alert, New. Four equal segments fill the
     rest of the row, and a sliding highlight marks the active one.
   - The bar's background extends edge to edge (box-shadow plus clip-path trick) without widening
     the page.
2. **Learning intro card** (`.sc-intro-card`). Shown only in New (§8).
3. **Section title** (`#sc-cards-heading`). This is text, not a control. Format:
   - `Now · {n} updates across {g} goals` (Mixed, Normal, Alert)
   - `· {k} new` appended when suggestions are mixed in, kept together with non-breaking spaces
   - `{n} new suggestions across {g} goals` (New)
4. **Card feed** (`.sc-grid`), in the chosen view.
5. **Key moments** (`.sc-stories`): "{n} key moments in last 12 hours". Rated highlight events
   that open the detail sheet on the matching video.
6. **Floating layer:**
   - The **mascot chat entry**, bottom left (§10).
   - A **toast**, bottom center, for confirmations.
   - The **live window**, inside the critical card (§9).

**Themes:** the page is light by default (`<body class="sc-light-page">`). Dark mode sets
`.smartcards.dark` and removes `sc-light-page`. Every new style needs a
`body.sc-light-page …` counterpart. The detail sheet is always dark.

**Routes:** `index.html?view=smart-cards` (and `smart-cards.html`, which redirects there) adds
`body.sc-standalone`, which hides the rest of the mockup's chrome. On phones, the regular tab bar
hides while Smart Cards is active.

---

## 3. Card anatomy

```
┌────────────────────────────────────────┐
│ GOAL LINE (dimmed 64% white)     [NEW] │  NEW only on suggestions
│ STATE (large, colored by mode)         │
│ ( duration pill )                      │  pill only in non-alert modes
│                                        │
│          camera image + focus box      │  image zooms when Auto zoom is on
│ [live window]            [thumbs]      │  live: critical only; thumbs: security
└────────────────────────────────────────┘
│ ✦ Why this?  (suggestions, list view)  │
│ [ Keep ]            [ Drop ]           │
└────────────────────────────────────────┘
```

- **State color:**
  - Alert: green `#71edbe`.
  - Home security alert: red `#ff6570`.
  - Camera health alert: amber `#ffb454`.
  - Normal and suggested: white.
  - Tests pin these colors.
- **Duration** is a translucent pill in normal modes and plain text in alerts.
- **Critical alert:** a 2px red perimeter (`#ff4b55`) and an `aria-label` starting "Urgent
  alert:". Exactly one card per screen can be critical. There is **no dot before the state**: a
  blinking red dot reads as live video, so the LIVE badge on the live window (§9) is the only
  thing that blinks.
- **Goal line:** regular weight (400), uppercase, 64% white.
- **Camera offline:** state "CAMERA OFFLINE" (or "{n} CAMERA(S) OFFLINE" when only some of a
  multi-camera goal's cameras are down) in amber `#ffb454`, duration "{Camera} · last seen
  {last state}", the last frame greyscale and darkened, a red "Offline 25m" tag at the bottom
  left, no focus box, and an `aria-label` starting "Camera offline:". See §11.
- **Image layer:**
  - Every card image is wrapped in `.sc-focus-layer`, which is the element that zooms.
  - Home security is multi-camera: in normal mode it shows a 2×2 grid, and in alert mode one
    main view plus three thumbnails.
  - Camera health shows a status grid (§11).
- **Highlight cards** (birds, pets, wildlife in Normal) show the notable event big, plus a small
  "now" thumbnail at the bottom left with the current state.
- **Tapping a card** opens the detail sheet (§6). Buttons inside the card never trigger this.

---

## 4. Page states and card modes

### 4.1 Resolution rule

`setSmartCardState(mode)` resolves each card's mode in this order:

```
cardMode = alert       if a camera bound to the goal is offline (Camera offline, §11)
         = suggested   if page is New, or the goal is picked as a Mixed suggestion
         = alert       if page is Alert, or the goal is picked as a Mixed alert
         = highlights  if the goal has highlight data (birds, pets, wildlife)
         = normal      otherwise
```

Each mode reads its own data: `SMART_CARD_STATES[cardMode][scene]` and
`SMART_CARD_EVIDENCE[normal|alert][scene]`. Suggested and highlights modes reuse the normal
evidence. A Camera offline card is ordered as an alert but reads its last known normal state and
evidence (`smartCardOfflineState`). A goal whose camera is offline is never picked as a Mixed
suggestion. Changing the mode rewrites the state, duration, checked time, and image, and
re-renders the health grid.

### 4.2 Mixed: the realistic default

The page opens in Mixed. It simulates a real moment:

- **Alerts:** 2–4 goals, chosen by `chooseMixedAlertScenes()`. It always includes security *or*
  garage (50/50), then adds goals weighted by `SMART_CARD_MIXED_WEIGHTS` (security 3, garage 3,
  wildlife 2, ev 2, health 1.5, bins 1.5, front 1.5, pets 1, birds 0.5).
- **Suggestions:** 1–2 goals that aren't alerts, chosen at random by
  `chooseMixedSuggestedScenes()`.
- **Reshuffle:** clicking Mixed again picks a new set.

### 4.3 Ordering rules (production must keep these)

1. **The top-priority alert comes first.** Alert priority is
   `SMART_CARD_MIXED_ALERT_PRIORITY` (security, garage, health, wildlife, ev, bins, front, pets,
   birds). It becomes the **critical alert**.
2. **New suggestions come next.** They always sit above everything except that one top alert.
3. **Then the remaining alerts,** in priority order.
4. **Then routine cards,** in `SMART_CARD_PRIORITY.normal` order.

Alert-only and New pages use `SMART_CARD_PRIORITY.alert` and `SMART_CARD_PRIORITY.suggested`.
Camera offline cards count as alerts for this ordering, at their goal's alert priority.
The critical alert is always `cards.find(card => cardMode === 'alert')` after ordering, so any
goal can be critical when it is the top alert. (The Mixed demo always includes Home security or
Garage monitor, so they are the ones you see.)

---

## 5. Views

The page opens in **Wall** view with the **Mixed** state (the markup starts with
`sc-grid-view sc-wall-view` and the button at `data-view="wall"`, so there is no jump on load).

The view button cycles `SMART_CARD_VIEWS = ['list','grid','wall','flip']`. Its label always names
the next view, such as "List view. Switch to grid view". The icon swap spins old icons out and
springs new ones in. `setSmartCardView()` runs a FLIP animation on the card in focus.

| View | Layout | Rules |
|---|---|---|
| **List** | One column. Cards at 40:27. | The full "Why this?" plus Keep and Drop show below suggestion images. Focus boxes are visible. |
| **Grid** | Two columns of square tiles with 12px gaps. | Compact text. Focus boxes are hidden with `visibility:hidden`, so they stay measurable for zoom. Suggestions get compact Keep and Drop overlays at the bottom. Home security thumbnails hide on unkept suggestions. |
| **Wall** | Two columns of square tiles with **no gaps, corners, or shadows**. Runs edge to edge on screens ≤640px (full-bleed `.sc-shell`). | The **critical alert spans both columns at 4:3** with a larger state. The goal line and state sit tighter. The duration is 12.5px. Focus boxes are hidden. The camera area is maximized. |
| **Flip** | A deck of one card at a time, with the next two real cards stacked behind (`is-behind-1`: up 12px at .955 scale; `is-behind-2`: up 23px at .91 scale). | Drag or swipe: an 8px threshold starts the drag. Cards fly out past the deck to the screen edge, clipped only at the viewport. Arrow keys also step. Taps inside the card back never start a drag. |

### 5.5 Auto zoom (all views)

`zoomSmartCardWall()` runs after every view or state sync, on window resize, and when the button
toggles. For each card that has a focus box and isn't multi-camera:

```
zoom = clamp(1.15, 0.58 × min(tileW / boxW, tileH / boxH), 2.4)
pan  = move the box center to the tile center, clamped so no image edge shows
```

- **Skipped:** Home security (its thumbnails share the layer), Camera health (no single
  focus area), and Camera offline cards (they keep the whole last frame).
- **Focus box line:** it keeps a constant thin line through
  `border-width: calc(2px / var(--sc-wall-zoom))`.
- **Detail preview:** it removes the inline zoom, so the preview always shows the full frame.
- **Off:** turning the button off eases every tile back to the full camera view.

---

## 6. Detail sheet

Opening a card shows `.sc-detail-dialog`, a modal bottom sheet that is always dark and locks
body scroll. Sections:

1. **Pinned header:** the goal title and ×. It stays pinned while the sheet scrolls.
2. **Preview:**
   - A copy of the card image, unzoomed, with the focus box.
   - Big thumbs up/down at the bottom right that rate "this snapshot".
   - After you pick a video, it switches to that frame, adds the rating badge at the top right,
     and adds a caption.
   - For Camera health, the thumbs move to the top right so they don't cover a tile.
3. **State row:** the state and duration, the checked time, and camera sources. More than four
   cameras collapse to "All N cameras".
4. **Video Evidences:**
   - Compact strip of 9 thumbnails, each with a rating (1–5) and a clip length (m:ss).
   - Featured frames are the top three rated ≥4. They get a green outline; a 5 is a yellow badge.
   - "+ more" expands to a list of 20 with a Time/Rating sort. Expanding animates the height.
     Re-sorting animates each row to its new place.
5. **Household memory:** two memory lines, each rated with thumbs.
6. **Why this?:** the recommendation text plus thumbs.
7. **Delete card:** flips the sheet to the feedback form (reasons, an optional note,
   hold-to-talk mock) and then removes the card with a toast.

**Feedback votes** are toggles: tap again to clear. They're stored per key
(`evidence:{mode}:{scene}:{label}`) and survive reopening the sheet.

---

## 7. Suggestions: keep, drop, delete

A suggestion is a card the AI proposes. The user decides:

| Action | Where | What happens |
|---|---|---|
| **Keep** | The Keep button on the card | Button changes to "Kept". The "Why this?" section collapses. Confetti rises from the card top (110 pieces, about 2–3s). A toast says "{Goal} added to your Smart Cards". The card stays, marked `data-suggestion-decision="kept"`, and becomes a normal card: its NEW badge disappears (`[data-suggestion-decision="kept"] .sc-new-badge{display:none}`). |
| **Drop** | The Drop button on the card | **Opens the WYZE AI chat**, which asks "Why drop {Goal}?". Quick replies are the four reasons, or the user types their own. While it asks, the card has a green ring (`.is-asking`). On reply, the card fades out, the cards below slide up, the heading recounts, and the AI confirms. Closing the chat keeps the card. |
| **Delete** | The detail sheet | The flip-form flow described in §6. It works for any card, not just suggestions. |

Drop reasons (`SMART_CARD_DROP_REASONS`):
- `not-relevant`: Not relevant to me
- `wrong-camera`: Wrong camera or area
- `too-many`: Too many similar updates
- `already-covered`: I already monitor this elsewhere
- A free-text answer is stored as reason `other` with the note.

Every decision is recorded as `{decision: 'kept'|'dropped'|'deleted', reason?, note?}` per goal
(`suggestionDecisions`). **Production must send these to the backend.** They're the training
signal for future suggestions.

---

## 8. Learning intro card (New only)

This card explains the goal-driven system to someone coming from a traditional camera, before any
suggestions exist. Structure, inside one yellow-tinted panel:

1. **Mascot plus chat bubble:** the waving mascot overlaps a bubble in first person. "Hi, I'm
   learning your home. Right now I'm watching your cameras to learn what's normal. Next, I'll
   suggest Smart Cards that answer what you check most…". Keep the now-and-next framing.
2. **Progress pill:** "● LEARNING · 34 of 48 hours". The pill is the progress bar: a rounded
   yellow fill at `--sc-progress` with a shimmer, and `role="progressbar"`.
3. **Steps:**
   - "Mapped your 8 cameras" (done).
   - "Learning your routines" (active, with a flaring dot). This step holds the found-entity
     pills and a **See details** link.
   - "Your first Smart Cards: in about 14 hours. We'll let you know."
4. **Found-entity pills:** yellow, one per object or entity found (Garage door, Packages, Golden
   retriever…). The first 6 show.
   - **See details** expands them into rows. Each row has the pill, gray camera pills (for
     example Garage · Driveway), a one-line explanation, and thumbs to confirm or correct it.
   - **+ Tell me more** opens the chat to ask what else to watch. The answer becomes a blue
     "You added" pill.

Production mapping: the progress, steps, and entities come from the personalization or learning
pipeline. Thumbs on an entity are corrections and must be sent back.

---

## 9. Live window (critical alert only)

When a critical alert exists, `.sc-live` is moved *into that card*, except when that card is
Camera health (its camera tiles are already the live view, and the camera at issue can't stream)
or a Camera offline card:

- **Position:** bottom left in list and flip views; top right in grid and wall views (Home
  security thumbnails fill the bottom edge there).
- **Contents:** the camera feed, a blinking red LIVE badge, the camera name without "Cam", and a
  clock ticking every second.
- **Tap:** opens the card's detail sheet.
- **× button:** hides it for this `scene:mode` until a different card becomes critical.
- **When it hides:** with no critical alert (Normal, New), when the critical card is Camera
  health or Camera offline, and while its card is dropping.
- **Mock:** the snapshot drifts slowly to suggest video. **Production must use the real live
  stream** of the camera that triggered the alert.

---

## 10. WYZE AI chat (mascot)

- **Entry:**
  - A 68px mascot at the bottom left with an idle bob.
  - On load, it pops in with a wave and shows a one-time "Hi! Ask me about your home" bubble.
  - Every 4–8s it plays a random gesture (wave, laugh, wink & point, peek-wave, cheer) for about
    2.2s, then returns to rest. It never repeats the same gesture twice in a row.
  - Hover triggers a gesture.
  - While the panel is open, it shows the chat-bubble pose.
  - Gestures pause while the panel is open, while the tab is hidden, and under reduced motion.
- **Sprites:** `assets/mascot/{wave,laugh,wink-point,chat,peek-wave,cheer,lean,sit-wink}.webp`,
  each a 240px transparent square. `lean` isn't used, because its wall edge is baked in.
- **Panel:** a WYZE AI header, a message log, suggested-question chips, and an input. Escape
  closes it.
- **Answers (mock):** keyword routing (`SMART_CARD_BOT_TOPICS`) finds the goal and replies from the
  card's *live* state: "{Goal}: {STATE} · {duration}. Checked {time}", with a **View card**
  button that scrolls to and pulses the card. "What happened overnight" summarizes the key
  moments. **Production: route to AskHome** (the conversational agent) and keep the reply shape:
  state, duration, freshness, and a link to the card.
- **Prompt API (other features reuse the chat through this):**
  ```js
  smartCardBot.prompt({
    message,      // HTML string the bot says
    chips,        // [{label, value?}] quick replies; they replace the default chips until answered
    placeholder,  // input hint while waiting
    onReply,      // (text, value) => replyHtml ; called once, then chips and placeholder reset
    onCancel      // called if the panel closes, or another prompt replaces this one
  })
  ```
  Used by Drop (§7) and + Tell me more (§8). Keep one conversational surface; don't add inline
  forms for questions the AI asks.

---

## 11. Camera health card

- **What it is:** a goal that watches the cameras themselves. Its image is a grid of every
  camera's latest snapshot (`SMART_CARD_HEALTH_CAMERAS`): 4×2 in list view, 2×4 in
  square and flip views.
- **Per-tile status:**
  - Online: green dot.
  - Offline: greyscale, darkened, red dot, "Offline 25m" tag.
  - Low battery: amber dot, "Battery 12%" tag.
  - In square and flip views, only tiles with a problem keep a name label.
- **States:** "ALL ONLINE · 8 of 8 cameras" in normal. "1 OFFLINE · Backyard Cam for 25 mins" in
  alert, with the state in amber.
- **Honesty rule:** when a camera is offline, every goal that depends on it must say so on its
  own card instead of showing a calm state. The health card is the summary, not a substitute.
  Production: the health data comes from device status APIs, never inferred from silence.
- **Camera offline (implemented):** while Camera health is in alert, `smartCardOfflineCameras`
  lists its offline cameras (`SMART_CARD_HEALTH_ISSUES.alert`, status `offline`; low battery
  doesn't count). Every other goal whose `SMART_CARD_CAMERAS` includes one becomes a Camera
  offline card (§3): ordered as an alert, never suggested, no live window, no zoom. Its detail
  sheet shows the same state in amber over the grey last frame, with the goal's normal evidence
  (`data-offline="true"` on the dialog). In the demo, Backyard Cam is offline, so the Wild animal
  watcher shows "CAMERA OFFLINE · Backyard Cam · last seen NO WILDLIFE".

---

## 12. Visual language

| Token | Value | Use |
|---|---|---|
| Alert red | `#ff4b55` / `#ff6570` | Critical perimeter, live frame, security alert state |
| WYZE green | `#71edbe` (dark) / `#16a777` (light) | Success, Keep, active controls, feedback forms, selected states, the Auto zoom button when on |
| Amber | `#ffb454` | Health alert, battery |
| Learning yellow | `#f6c453` / `#ffe29a` / `#f3d98a` | "Why this?", learning pill, found-entity pills, NEW badge |
| User blue | `#78a5ff` / `#2764e7` | "You added" pills, New segment highlight |
| Dark surface | `#101925`, `#142135` | Detail sheet, cards in dark mode |

- **Type:**
  - Section titles 15px/800.
  - "Why this?" title 17px/800, body 13px/500 at 1.5.
  - Goal line 11px uppercase at 64% white, regular weight (400).
  - State 22–40px depending on view.
- **Motion:**
  - Standard ease `cubic-bezier(.22,1,.36,1)`.
  - Springs for flips, press, zoom, and icon swaps. Flips spring-settle with about 6° of
    overshoot.
  - Press-down scales cards to .975 and buttons to .95, then springs back.
  - All motion has a reduced-motion path.
- **Accessibility:**
  - Icon buttons carry `aria-label`s, and toggles use `aria-pressed` or `role="switch"`.
  - The progress bar uses `role="progressbar"`.
  - Decisions are also announced through a visually hidden status (`.sc-suggestion-status`).
    Toasts are `aria-hidden`.
  - Touch targets are at least 34px, and at least 42px in the top line.

---

## 13. What is mocked

| Mock in this repo | Production source |
|---|---|
| `SMART_CARD_STATES` (state, duration, checked, image) | Per-goal agent output (VMA run result) plus the latest snapshot |
| `SMART_CARD_EVIDENCE`, `_VIDEO_HISTORY`, `_VIDEO_ARCHIVE`, `_VIDEO_RATINGS` | The agent's evidence frames with relevance scores; clip durations from recordings |
| `SMART_CARD_RECOMMENDATIONS` ("Why this?") | The suggestion engine's rationale |
| `SMART_CARD_CAMERAS` | The goal's bound cameras |
| `SMART_CARD_STORIES` (key moments) | Top-rated events in the last 12h |
| `SMART_CARD_LEARNED`, progress 34/48h, "1,284 events" | Personalization or learning pipeline |
| `SMART_CARD_HEALTH_*` | Device status and health APIs |
| Mixed random selection | Real current alert and suggestion state. Keep the §4.3 ordering. |
| Chat answers, gesture timer | AskHome responses. Keep the gesture timer as is. |
| Hold-to-talk transcript (delete form) | Real speech-to-text |
| Live window drift animation | The camera's live stream |
| Clock and relative times | Server timestamps |

## 14. Suggested production data contract

Adapt the names to the target codebase's conventions (read its `AGENTS.md` first):

```ts
type CardMode = 'normal' | 'alert' | 'suggested' | 'highlights';

interface SmartCard {
  goalId: string;              // was data-scene
  goalLabel: string;           // goal line, e.g. "Garage monitor"
  mode: CardMode;
  priority: number;            // drives §4.3 ordering; lower = more urgent
  state: string;               // "OPEN"
  stateTone: 'neutral' | 'good' | 'alert' | 'critical' | 'warning';
  sub: string;                 // "for 15 mins"
  checkedAt: string;           // ISO time; rendered relative
  snapshot: { url: string; alt: string; focusBox?: Box };   // Box in % of frame
  cameras: CameraRef[];        // camera sources; >4 renders "All N cameras"
  suggestion?: { rationale: string; decision?: 'kept' | 'dropped' };
  highlight?: { current: { state: string; snapshot: string; checkedAt: string };
                events: { label: string; at: string; snapshot: string }[] };
  health?: { cameraId: string; name: string; status: 'online' | 'offline' | 'battery';
             note?: string; snapshot: string }[];
}
interface Evidence {
  frames: { url: string; caption: string; score: 1 | 2 | 3 | 4 | 5; at: string; durationSec: number }[]; // ≥20
  memory: string[];            // household memory lines
  recommendation: string;      // "Why this?"
}
// Events to POST back (the learning signal)
type CardEvent =
  | { type: 'decision'; goalId: string; decision: 'kept' | 'dropped' | 'deleted'; reason?: string; note?: string }
  | { type: 'vote'; key: string; vote: 'up' | 'down' | null }   // evidence, snapshot, recommendation, learned fact
  | { type: 'learned-add'; label: string };                      // from + Tell me more
```

## 15. Source map (search by name in `index.html`)

| Concern | Identifiers |
|---|---|
| Data | `SMART_CARD_STATES`, `SMART_CARD_EVIDENCE`, `SMART_CARD_VIDEO_HISTORY`, `SMART_CARD_VIDEO_ARCHIVE`, `SMART_CARD_VIDEO_RATINGS`, `SMART_CARD_STORIES`, `SMART_CARD_RECOMMENDATIONS`, `SMART_CARD_CAMERAS`, `SMART_CARD_HEALTH_CAMERAS`, `SMART_CARD_HEALTH_ISSUES`, `SMART_CARD_LEARNED` |
| Ordering | `SMART_CARD_PRIORITY`, `SMART_CARD_MIXED_ALERT_PRIORITY`, `SMART_CARD_MIXED_WEIGHTS`, `chooseMixedAlertScenes`, `chooseMixedSuggestedScenes`, `setSmartCardState` |
| Views | `SMART_CARD_VIEWS`, `setSmartCardView`, `syncSmartCardView`, `syncSmartCardViewCycle`, `stackSmartCards`, `stepSmartCardFlip`, `finishSmartCardDrag`, `zoomSmartCardWall` |
| Cards and detail | `initSmartCardEvidence` (builds the card chrome, detail sheet, keep, drop, delete, feedback), `videoEvidenceStrip`, `videoEvidenceDuration`, `evidenceFeedback`, `cameraSourceSummary`, `dismissSmartCard`, `askSmartCardDrop` |
| Health and live | `renderSmartCardHealth`, `smartCardOfflineCameras`, `smartCardOfflineState`, `syncSmartCardOfflineNote`, `syncSmartCardLive`, `initSmartCardLive` |
| Intro | `initSmartCardIntro` |
| Chat | `initSmartCardBot`, `SMART_CARD_BOT_TOPICS`, `smartCardBot.prompt` |
| Styles | `.sc-*`. Views are scoped by `.smartcards.sc-grid-view`, `.sc-wall-view` (always with `sc-grid-view`), and `.sc-flip-view`. Page states use `.is-mixed`, `.is-alert`, `.is-suggested`, `.is-highlights`. |

## 16. Verification

```bash
node --test tests/smart-card-layout.test.mjs            # static structure and rule pins (fast)
node tests/smart-card-pages.e2e.mjs                     # headless Chrome: real layout and interactions
node tests/smart-card-feedback.regression-1.e2e.mjs     # feedback votes persist (ISSUE-001)
```

- **When to update the tests:** they pin real rules (ordering, colors, counts, geometry). When a
  rule changes on purpose, update the test in the same change and say so.
- **Mixed is random:** checks on Mixed must hold for every possible pick.
- **Preview locally:** serve the repo root, for example with `npx serve .`, and open
  `/?view=smart-cards`.
- **Releases:** follow the README's "Versions and releases": `VERSION`, a `CHANGELOG.md` entry,
  and a `vX.Y.Z` tag.
