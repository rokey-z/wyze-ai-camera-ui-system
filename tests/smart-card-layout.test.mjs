import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const standalone = readFileSync(new URL('../smart-cards.html', import.meta.url), 'utf8');

test('state blocks align with the mobile card top and retain four rounded corners', () => {
  const alignedStateRules = html.match(/\.sc-card-top\{top:0;right:auto;left:0/g) ?? [];
  assert.equal(alignedStateRules.length, 2, 'desktop preview and narrow mobile rules must agree');
  assert.match(html, /\.sc-card-top\{top:0;right:auto;left:0;max-width:72%;padding:6px 12px 11px;border-radius:12px\}/);
});

test('live action is top-right and evidence cluster is bottom-left', () => {
  assert.match(
    html,
    /\.sc-actions>\.primary\{top:10px;right:12px;bottom:auto;left:auto;color:#fff;/,
  );
  assert.match(html, /\.sc-evidence\{position:absolute;z-index:5;right:12px;bottom:10px;left:12px/);
  assert.match(html, /\.sc-card:after\{display:none\}/);
});

test('every card has compact goal feedback aligned to the goal line right edge', () => {
  assert.match(html, /\.sc-card>\.sc-label\{max-width:calc\(100% - 62px\);overflow:hidden;text-overflow:ellipsis\}/);
  assert.match(html, /\.sc-actions \.sc-feedback\{display:flex;position:absolute;z-index:6;top:-27px;right:0;bottom:auto/);
  assert.match(html, /\.sc-actions \.sc-feedback button,\.sc-actions \.sc-feedback button:last-child\{width:24px;height:24px/);
  assert.match(html, /body\.sc-light-page \.sc-actions \.sc-feedback button\{color:#42536b\}/);
  assert.match(html, /\.sc-card\.is-expanded \.sc-actions \.sc-feedback\{opacity:0;visibility:hidden;pointer-events:none/);
  assert.match(html, /goalFeedback\.setAttribute\('aria-label',`Rate \$\{goal\} goal`\)/);
  assert.match(html, /goalFeedbackButtons\[0\]\.setAttribute\('aria-label',`\$\{goal\} goal was helpful`\)/);
});

test('theme and state toggles share one control row', () => {
  assert.match(html, /<div class="sc-mode-row">\s*<div class="sc-theme-mode"[\s\S]*?<div class="sc-state-mode"/);
  assert.match(html, /class="active" type="button" data-sc-theme="light" aria-pressed="true">Light<\/button>/);
  assert.match(html, /data-sc-theme="dark" aria-pressed="false">Dark<\/button>/);
  assert.match(html, /<body class="sc-light-page">/);
});

test('normal-state duration uses a translucent pill without changing alert copy', () => {
  assert.match(
    html,
    /\.smartcards:not\(\.is-alert\) \.sc-card-top \.sc-sub\{display:inline-flex;width:max-content;margin-top:5px;padding:3px 8px;border-radius:999px;background:rgba\(255,255,255,\.18\)/,
  );
  assert.doesNotMatch(html, /\.smartcards\.is-alert[^}]*\.sc-sub\{[^}]*border-radius:999px/);
});

test('every card scene clips all four corners to the same radius', () => {
  assert.match(html, /\.sc-card,\.sc-card\.sc-hero\{overflow:visible;border:0;outline:0;border-radius:16px\}/);
  assert.match(html, /\.sc-scene\{overflow:hidden;border-radius:16px;clip-path:inset\(0 round 16px\)\}/);
  assert.match(html, /\.sc-card,\.sc-card\.sc-hero\{aspect-ratio:40\/27;border-radius:16px/);
});

test('expanded evidence extends below a fixed-size camera scene', () => {
  assert.match(html, /\.sc-card\.is-expanded,\.sc-card\.sc-hero\.is-expanded\{--sc-evidence-overlap-start:45\.833%;aspect-ratio:auto;min-height:0;padding-top:var\(--sc-evidence-overlap-start\);background:transparent;box-shadow:none\}/);
  assert.match(html, /\.sc-card\.is-expanded \.sc-scene\{inset:0 0 auto;height:auto;aspect-ratio:16\/11/);
  assert.match(html, /\.sc-card\.is-expanded:before,\.sc-card\.is-expanded\[data-tone\]:before\{height:82px;opacity:0\}/);
});

test('expanded state and duration stay fixed while the goal label clears', () => {
  assert.match(html, /\.sc-card\.is-expanded>\.sc-label\{opacity:0;visibility:hidden;transform:translateY\(-4px\)/);
  assert.match(html, /\.sc-card\.is-expanded \.sc-card-top\{z-index:7;top:0;left:0\}/);
  assert.match(html, /\.sc-card-top\{transition:top \.3s cubic-bezier/);
});

test('expansion keeps the image fixed and makes evidence match the card width', () => {
  assert.match(html, /\.sc-card\.is-expanded \.sc-scene\{inset:0 0 auto;height:auto;aspect-ratio:16\/11;cursor:pointer/);
  assert.match(html, /@media\(max-width:620px\)\{\.sc-card\.is-expanded,\.sc-card\.sc-hero\.is-expanded\{--sc-evidence-overlap-start:45%\}\.sc-card\.is-expanded \.sc-scene\{aspect-ratio:40\/27\}\}/);
  assert.match(html, /\.sc-card\.is-expanded \.sc-evidence\{position:relative;right:auto;bottom:auto;left:auto;width:100%;padding:12px;[^}]*border-radius:16px/);
});

test('clicking the image closes expanded supporting evidence', () => {
  assert.match(html, /const setEvidenceExpanded=expanded=>\{/);
  assert.match(html, /evidenceTrigger\.addEventListener\('click',\(\)=>setEvidenceExpanded\(!card\.classList\.contains\('is-expanded'\)\)\)/);
  assert.match(html, /card\.querySelector\('\.sc-scene'\)\.addEventListener\('click',\(\)=>\{/);
  assert.match(html, /if\(card\.classList\.contains\('is-expanded'\)\)setEvidenceExpanded\(false\)/);
});

test('mobile expansion focuses and scrolls to the supporting evidence panel', () => {
  assert.match(html, /\.sc-evidence\{[^}]*scroll-margin-top:76px;outline:none/);
  assert.match(html, /function focusExpandedEvidence\(evidence\)\{/);
  assert.match(html, /if\(!isStandaloneSmartCards&&!window\.matchMedia\('\(max-width:620px\)'\)\.matches\)return/);
  assert.match(html, /evidence\.focus\(\{preventScroll:true\}\)/);
  assert.match(html, /evidence\.scrollIntoView\(\{behavior:reducedMotion\?'auto':'smooth',block:'center'\}\)/);
  assert.match(html, /evidence\.setAttribute\('tabindex','-1'\)/);
  assert.match(html, /if\(expanded\)focusExpandedEvidence\(evidence\)/);
});

test('footer readability gradient follows the rounded card corners', () => {
  assert.match(
    html,
    /\.sc-card:before,\.sc-card\[data-tone\]:before\{[^}]*border-radius:0 0 16px 16px[^}]*background:linear-gradient\(to top/,
  );
});

test('supporting evidence progressively reveals video and household inputs', () => {
  assert.match(html, /class="sc-evidence-time"/);
  assert.match(html, /class="sc-evidence-rule"/);
  assert.match(html, /class="sc-evidence-preview"/);
  assert.match(html, /<span class="sc-evidence-heading">Supporting Evidence<\/span>/);
  assert.doesNotMatch(html, /Evidence behind this state/);
  assert.match(html, /<span>Video description<\/span><span class="sc-evidence-section-more">\+ more<\/span>/);
  assert.match(html, /<span>Household memory<\/span><span class="sc-evidence-section-more">\+ more<\/span>/);
  assert.match(html, /card\.classList\.toggle\('is-expanded',expanded\)/);
  assert.match(html, /\.sc-evidence-preview\{[^}]*max-height:21px[^}]*mask-image:linear-gradient/);
  assert.match(html, /\.sc-card\.is-expanded \.sc-evidence-preview\{display:none\}/);
  assert.match(html, /\.sc-evidence-details\{display:grid;gap:0;max-height:0;[^}]*transition:max-height/);
  assert.match(html, /\.sc-card\.is-expanded \.sc-evidence-details\{gap:18px;max-height:480px;[^}]*opacity:1/);
  assert.match(html, /\.sc-actions \.sc-feedback\{display:flex;position:absolute/);
});

test('each supporting-evidence row has unfilled feedback controls and content-first hierarchy', () => {
  assert.match(html, /function evidenceFeedback\(label\)/);
  assert.match(html, /Rate \$\{label\}/);
  assert.doesNotMatch(html, /class="sc-evidence-icon"/);
  assert.doesNotMatch(html, /class="sc-evidence-bullet"/);
  assert.match(html, /\.sc-evidence-item-feedback button\{[^}]*border:0;border-radius:0;background:none/);
  assert.match(html, /\.sc-evidence-list li\{position:relative;display:grid;grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(html, /\.sc-evidence-list li:before\{content:'•';[^}]*color:#91a3ba/);
  assert.match(html, /\.sc-evidence-section-header\{[^}]*color:#91a3ba;font:750 9px\/1\.3/);
  assert.match(html, /\.sc-evidence-item p\{[^}]*color:#f4f7fb;font-size:11\.5px;font-weight:620/);
  assert.match(html, /function evidenceList\(items,label\)/);
});

test('video and household evidence stay open with hover-only more labels', () => {
  assert.match(html, /class="sc-evidence-title-icon">\$\{SMART_CARD_EVIDENCE_ICONS\.video\}<\/span><span>Video description/);
  assert.match(html, /class="sc-evidence-title-icon">\$\{SMART_CARD_EVIDENCE_ICONS\.memory\}<\/span><span>Household memory/);
  assert.match(html, /\.sc-evidence-title-icon svg\{width:15px;height:15px;fill:none;stroke:currentColor/);
  assert.doesNotMatch(html, /sc-evidence-section-chevron/);
  assert.match(html, /\.sc-evidence-section-header\{[^}]*width:100%/);
  assert.match(html, /\.sc-evidence-section-more\{margin-left:auto;padding:3px 5px;[^}]*transition:color \.16s ease,background-color \.16s ease\}/);
  assert.match(html, /\.sc-evidence-section-more:hover\{background:rgba\(255,255,255,\.1\);color:#fff\}/);
  assert.match(html, /\.sc-evidence-list-wrap\{overflow:visible\}/);
  assert.doesNotMatch(html, /sc-evidence-section-trigger/);
  assert.doesNotMatch(html, /data-evidence-section/);
  assert.doesNotMatch(html, /is-collapsed/);
  assert.doesNotMatch(html, /--sc-expanded-height/);
});

test('expanded evidence identifies the cameras involved in each card state', () => {
  assert.match(html, /camera:'<svg viewBox="0 0 24 24" aria-hidden="true">/);
  assert.match(html, /security:\['Side Gate Cam','Garage Cam','Front Door Cam','Driveway Cam'\]/);
  assert.match(html, /garage:\['Garage Cam'\]/);
  assert.match(html, /front:\['Front Door Cam'\]/);
  assert.match(html, /bins:\['Driveway Cam'\]/);
  assert.match(html, /birds:\['Backyard Feeder Cam'\]/);
  assert.match(html, /<span>Cameras involved<\/span><\/div><ul class="sc-camera-source-list" aria-label="Cameras involved in this state">/);
  assert.match(html, /function cameraSourceList\(cameras\)/);
  assert.match(html, /\.sc-camera-source-list li\{display:inline-flex;align-items:center;gap:5px;[^}]*border-radius:999px/);
  assert.match(html, /evidence\.querySelector\('\.sc-camera-source-list'\)\.innerHTML=cameraSourceList\(SMART_CARD_CAMERAS\[scene\]\)/);
});

test('normal and alert states provide three observations and two memories for every scene', () => {
  for (const scene of ['security', 'garage', 'ev', 'front', 'bins', 'birds']) {
    const occurrences = html.match(new RegExp(`${scene}:\\{video:\\[`, 'g')) ?? [];
    assert.equal(occurrences.length, 2, `${scene} needs normal and alert evidence`);
  }
  assert.match(html, /card\.querySelector\('\.sc-evidence-preview'\)\.textContent=evidence\.video\[0\]/);
  assert.match(html, /card\.querySelector\('\.sc-evidence-video'\)\.innerHTML=evidenceList\(evidence\.video,'video description'\)/);
  assert.match(html, /card\.querySelector\('\.sc-evidence-memory'\)\.innerHTML=evidenceList\(evidence\.memory,'household memory'\)/);
});

test('EV charging reminder has paired visual states and personalized evidence', () => {
  assert.match(html, /data-scene="ev"[^>]*><span class="sc-label">EV charging reminder<\/span>/);
  assert.match(html, /ev:\{state:'CHARGING',sub:'for 45 mins',checked:'15 secs ago',src:'assets\/smart-ev-charging\.webp\?v=1'/);
  assert.match(html, /ev:\{state:'NOT PLUGGED IN',sub:'leaving in 8 hours',checked:'15 secs ago',src:'assets\/smart-ev-unplugged\.webp\?v=1'/);
  assert.match(html, /The charging connector is visibly seated in the vehicle charge port/);
  assert.match(html, /You asked to be reminded when the car is home overnight but not connected/);
  assert.match(html, /ev:\['EV Garage Cam'\]/);
  assert.match(html, /\.sc-card\[data-scene="ev"\] \.sc-detection-box\{/);
});

test('bird watcher card has paired normal and alert evidence', () => {
  assert.match(html, /data-scene="birds" data-checked="20 secs ago"/);
  assert.match(html, /birds:\{state:'NO BIRDS'.*smart-bird-feeder-clear\.webp/);
  assert.match(html, /birds:\{state:'CARDINAL'.*smart-bird-cardinal\.webp/);
  assert.match(html, /\.sc-card\[data-scene="birds"\] \.sc-detection-box/);
});

test('dedicated Pages entry opens the standalone Smart Cards view', () => {
  assert.match(standalone, /<title>WYZE Smart Cards<\/title>/);
  assert.match(standalone, /index\.html\?view=smart-cards/);
  assert.match(html, /new URLSearchParams\(location\.search\)\.get\('view'\)==='smart-cards'/);
  assert.match(html, /if\(isStandaloneSmartCards\)document\.title='WYZE Smart Cards'/);
  assert.match(html, /body\.sc-standalone \.wrap>header,body\.sc-standalone \.tabs,body\.sc-standalone \.wrap>footer\{display:none\}/);
  assert.match(html, /body\.sc-standalone #pane-smart\{display:block!important\}/);
});
