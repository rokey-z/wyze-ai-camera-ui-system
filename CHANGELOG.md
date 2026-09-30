# Changelog

All notable changes to this project are recorded here. Each release matches a git tag
(`v0.8.0` and so on) and the number in [`VERSION`](VERSION).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use
[Semantic Versioning](https://semver.org/). The project is still a design mockup, so it stays
below 1.0.

These release numbers version the repository. The component-library generations shown inside
the app (v1, v1.5, v2, v2.5, v3, v4) are design-system names and are unrelated.

## [Unreleased]

## [0.9.0] - 2026-09-29

### Added
- A Wall view in the view toggle (list, grid, wall, flip). Camera tiles touch with no gaps,
  corners, or shadows, and run edge to edge of the screen on phones.
- The Wall view zooms each tile to its detection box, so the relevant area fills the tile.
- An Auto zoom button in the top line, on by default. It frames every camera on its focus area
  in all views.
- A Camera health card that shows all 8 cameras as a live grid with status dots. In alert,
  Backyard Cam is offline and the feeder camera is low on battery. It includes evidence and
  memory in the detail sheet.
- The WYZE mascot floats at the bottom left as a chat entry. It opens a WYZE AI panel with
  suggested questions and mock answers drawn from the live cards, each with a View card link.
- The mascot pops in with a wave, then plays a random gesture every few seconds (wave, laugh,
  wink and point, peek wave, cheer). It shows its chat pose while the panel is open.

### Changed
- The goal line at the top left of each card is dimmer, so the state stands out.
- On phones and the standalone page, the top line is a WYZE wordmark followed by all the
  controls, and it stays pinned while you scroll. Section titles are smaller.
- In the Wall view, the most urgent alert spans the full width at 4:3 with a larger state,
  the goal and state lines sit closer, the duration text is larger, and focus boxes are hidden.

## [0.8.0] - 2026-09-23

### Added
- "WYZE AI is learning your home" intro card in the New view. It has a progress pill that
  doubles as the progress bar (34 of 48 hours), learning steps with a flaring active dot,
  and found-object pills. The pills expand into explained rows with camera pills and thumbs
  up/down, and "+ Tell me more" lets people add their own.
- A single view toggle that rotates through list, grid, and flip.

### Changed
- In flip view, cards swipe out to the screen edge instead of being clipped, and the next two
  real cards stack behind the current one.
- The drop and delete feedback controls use the WYZE green accent.
- The control row groups the icon buttons and gives the state switch full-width, equal segments.
- The New view's section heading sits directly above the suggestion cards.

## [0.7.0] - 2026-09-23

### Added
- Keep and drop flow for suggested cards. Keep collapses "Why this?", plays confetti, and shows
  a toast. Drop flips the card over to a feedback form with reasons, an optional note, and a
  hold-to-talk transcript mock. In grid view, the card lifts above a dark overlay.
- A Delete card flow on the detail page, big snapshot thumbs up/down, and video clip durations.
- The Mixed view now includes new suggestions, placed right after the top alert.
- A spring press-down effect on cards and buttons.

### Changed
- The detail sheet title and close button stay pinned. "More/less" and the time/rating sort
  now animate.

## [0.6.0] - 2026-09-21

### Added
- A smart card detail sheet with rated video evidence: a scrollable strip, a sortable
  twenty-item list, and preview captions.
- Pet watcher and wild animal watcher cards.
- A flip view, event highlights, and alert previews.

### Fixed
- Smart card feedback controls now register a selection (ISSUE-001), with a regression test.

## [0.5.0] - 2026-09-04

### Added
- A mobile smart camera card feed, plus a standalone Smart Cards page on GitHub Pages.
- Supporting evidence panels with disclosures, camera sources, goal-line feedback, and a
  refresh action.
- EV charging, bird visit, and bins pickup cards.

## [0.4.0] - 2026-06-12

### Added
- An Elements tab: a UI element to data field map with formats, descriptions, and rules.
- The design system in stages: semantic elements, recipes, and declarative template screens
  checked by lint rules.
- v4 components and templates built from elements plus layout, a Layout tab with slot
  patterns and fit rules, and new templates (Trash Bin Checker, Walk-in Fridge Temp, Lawn Crew
  Checker, Night Watcher).
- `PRODUCTION-MIGRATION.md` and a v4 rewrite of the `.MD` reference.

## [0.3.0] - 2026-06-09

### Added
- Data cards on components that show which data fields drive each visual, with connecting
  lines and availability marks.
- The v3 component set with honest data binding, and every template and framework sample
  rebuilt on it.

### Changed
- The data check now matches the real Wyze AI One API.

## [0.2.0] - 2026-06-05

### Added
- A Data check tab and full-fidelity library components.
- Component sets v1.5, v2 (30 components), and v2.5 (24 components), including Assistant,
  Insight, and Agent Widget.
- Real Wyze agent templates merged into the Generator, each with its own preview and
  agent entry card.

### Changed
- The Playground merged into the Generator. Main tabs renamed to Components, Templates,
  Spec, and .MD.

## [0.1.0] - 2026-05-24

### Added
- The initial interactive mockup and specification for the Wyze AI camera UI system.
- A Playground that turns a typed or spoken goal into a generated mockup, with Claude,
  OpenAI, Gemini, and xAI as providers.
- Mobile layout support and the Sa action strip placement.

[Unreleased]: https://github.com/rokey-z/wyze-ai-camera-ui-system/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/rokey-z/wyze-ai-camera-ui-system/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/rokey-z/wyze-ai-camera-ui-system/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/rokey-z/wyze-ai-camera-ui-system/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/rokey-z/wyze-ai-camera-ui-system/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/rokey-z/wyze-ai-camera-ui-system/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/rokey-z/wyze-ai-camera-ui-system/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/rokey-z/wyze-ai-camera-ui-system/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/rokey-z/wyze-ai-camera-ui-system/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/rokey-z/wyze-ai-camera-ui-system/releases/tag/v0.1.0
