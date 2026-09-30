# Wyze AI Camera UI System

A framework — and an interactive mockup — for an **AI agent that generates a customized
camera interface from a user's monitoring intent**, including long-tail goals no product
serves today ("tell me if I left the stove on," "read my gas meter," "verify the lawn
crew stayed an hour").

### ▶ Live mockup

**Smart Cards:** https://rokey-z.github.io/wyze-ai-camera-ui-system/smart-cards.html

**Full UI system:** https://rokey-z.github.io/wyze-ai-camera-ui-system/

Pick a camera goal and watch the agent decompose it, resolve an archetype, select UI
modules, and compose a customized interface. Three tabs:

- **Generator** — intent → generated camera UI, with the six-stage generation trace.
- **Library & spec** — browse all 46 reusable UI components side-by-side with the live
  specification; the two views cross-link.
- **Builder reference** — the machine-actionable build reference, with copy / download.

### What's in this repo

| File | What it is |
|------|-----------|
| `index.html` | The interactive mockup (self-contained — open it directly or via the live link) |
| `smart-cards.html` | Dedicated GitHub Pages entry for the mobile Smart Cards experience |
| `Camera-UI-Complete-Spec-v3.docx` | Complete design & engineering specification (v3) |
| `AI-Camera-Builder-Reference.md` | Machine-actionable build reference for the camera-builder agent |

### Versions and releases

The current release is in [`VERSION`](VERSION), and every release is summarized in
[`CHANGELOG.md`](CHANGELOG.md) and tagged in git (`v0.8.0` and so on). To cut a release:

1. Move the entries under **Unreleased** in `CHANGELOG.md` into a new version section, and
   add a compare link for it at the bottom.
2. Put the same number in `VERSION`, following [SemVer](https://semver.org/): minor for new
   features, patch for fixes.
3. Commit, then tag and push: `git tag -a v0.9.0 -m "v0.9.0" && git push origin main --tags`.

### The framework in brief

A camera UI is a **composition problem**. The agent decomposes a plain-language goal into
a seven-field **intent frame**, routes it to one of **nine monitoring archetypes** (State
Monitor, Event Watcher, Wellbeing Monitor, Discovery, Live Assistant, Operations Console,
Instrument Reader, Capture Logger, Attendance Verifier), picks an **observation cadence**
(continuous / periodic / time-lapse / on-demand / window), selects modules from a
**46-module library**, arranges them against a six-slot layout grammar, and binds each to a
detector across three tiers — catalog detectors, composite signals, and open-vocabulary
vision-language-model prompts for novel goals. Camera imagery stays structurally central:
every generated UI leads with a real visual, tagged by signal type.

*Research preview · US market · May 2026*
