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
  assert.match(html, /security:\{state:'SAFE',sub:'for 2 hours'/);
  assert.doesNotMatch(html, /since 9:12 PM/);
  assert.match(html, /bins:\{state:'Bins OUT',sub:"Ready for tomorrow's pickup"/);
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
  assert.match(html, /\.sc-card\.is-expanded,\.sc-card\.sc-hero\.is-expanded\{--sc-evidence-overlap-start:57\.292%;aspect-ratio:auto;min-height:0;padding-top:var\(--sc-evidence-overlap-start\);background:transparent;box-shadow:none\}/);
  assert.match(html, /\.sc-card\.is-expanded \.sc-scene\{inset:0 0 auto;height:auto;aspect-ratio:16\/11/);
  assert.match(html, /\.sc-card\.is-expanded:before,\.sc-card\.is-expanded\[data-tone\]:before\{height:82px;opacity:0\}/);
});

test('expanded camera imagery zooms around the detection focus without exposing card edges', () => {
  assert.match(html, /\.sc-focus-layer\{position:absolute;inset:0;transform:translate3d\(0,0,0\) scale\(1\);transform-origin:var\(--sc-focus-x,50%\) var\(--sc-focus-y,50%\)/);
  assert.match(html, /\.sc-card\.is-expanded \.sc-focus-layer\{transform:scale\(1\.45\)\}/);
  assert.doesNotMatch(html, /\.sc-card\.is-expanded \.sc-focus-layer\{[^}]*translate/);
  assert.match(html, /\.sc-card\[data-scene="ev"\]\{--sc-focus-x:40\.5%;--sc-focus-y:43\.5%\}/);
  assert.match(html, /\.smartcards\.is-alert \.sc-card\[data-scene="security"\]\{--sc-focus-x:57%;--sc-focus-y:42%\}/);
  assert.match(html, /\.sc-security-cameras \.sc-focus-layer\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(html, /const focusLayer=document\.createElement\('div'\)/);
  assert.match(html, /focusLayer\.append\(\.\.\.sceneElement\.children\)/);
  assert.match(html, /sceneElement\.append\(focusLayer\)/);
});

test('expanded state and duration stay fixed while the goal label clears', () => {
  assert.match(html, /\.sc-card\.is-expanded>\.sc-label\{opacity:0;visibility:hidden;transform:translateY\(-4px\)/);
  assert.match(html, /\.sc-card\.is-expanded \.sc-card-top\{z-index:7;top:0;left:0\}/);
  assert.match(html, /\.sc-card-top\{transition:top \.3s cubic-bezier/);
});

test('expansion keeps the image fixed and makes evidence match the card width', () => {
  assert.match(html, /\.sc-card\.is-expanded \.sc-scene\{inset:0 0 auto;height:auto;aspect-ratio:16\/11;cursor:pointer/);
  assert.match(html, /@media\(max-width:620px\)\{\.sc-card\.is-expanded,\.sc-card\.sc-hero\.is-expanded\{--sc-evidence-overlap-start:56\.25%\}\.sc-card\.is-expanded \.sc-scene\{aspect-ratio:40\/27\}\}/);
  assert.match(html, /\.sc-card\.is-expanded \.sc-evidence\{position:relative;right:auto;bottom:auto;left:auto;width:100%;padding:12px;[^}]*border-radius:16px/);
});

test('clicking the image closes expanded supporting evidence', () => {
  assert.match(html, /const setEvidenceExpanded=expanded=>\{/);
  assert.match(html, /evidenceTrigger\.addEventListener\('click',\(\)=>setEvidenceExpanded\(!card\.classList\.contains\('is-expanded'\)\)\)/);
  assert.match(html, /sceneElement\.addEventListener\('click',\(\)=>\{/);
  assert.match(html, /if\(card\.classList\.contains\('is-expanded'\)\)setEvidenceExpanded\(false\)/);
});

test('folding evidence preserves the feed position without forced focus or scrolling', () => {
  assert.doesNotMatch(html, /function focusExpandedEvidence\(evidence\)/);
  assert.doesNotMatch(html, /evidence\.focus\(\{preventScroll:true\}\)/);
  assert.doesNotMatch(html, /if\(expanded\)focusExpandedEvidence\(evidence\)/);
  assert.doesNotMatch(html, /evidence\.setAttribute\('tabindex','-1'\)/);
  assert.match(html, /\.sc-card,\.sc-card\.sc-hero\{transform-origin:top center;transition:height \.46s cubic-bezier\(\.22,1,\.36,1\),padding-top \.46s/);
  assert.match(html, /\.sc-card\.sc-is-measuring,\.sc-card\.sc-is-measuring \*\{transition:none!important;animation:none!important\}/);
  assert.match(html, /const startHeight=card\.getBoundingClientRect\(\)\.height/);
  assert.match(html, /const endHeight=card\.getBoundingClientRect\(\)\.height/);
  assert.match(html, /card\.style\.height=`\$\{endHeight\}px`/);
  assert.match(html, /if\(event\.target===card&&event\.propertyName==='height'\)finishResize\(\)/);
  assert.match(html, /window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
  assert.match(html, /--sc-evidence-details-height/);
  assert.match(html, /\.sc-grid\{overflow-anchor:none\}/);
  assert.match(html, /\.sc-card,\.sc-card\.sc-hero\{transform-origin:top center;transition:height/);
  assert.match(html, /\.sc-evidence-details\{[^}]*clip-path:inset\(0 0 100% 0\)/);
  assert.match(html, /\.sc-card\.is-expanded \.sc-evidence-details\{[^}]*clip-path:inset\(0\)/);
  assert.doesNotMatch(html, /\.sc-evidence-details\{[^}]*translateY\(-6px\)/);
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
  assert.match(html, /\.sc-card\.is-expanded \.sc-evidence-details\{gap:18px;max-height:var\(--sc-evidence-details-height,480px\);[^}]*opacity:1/);
  assert.match(html, /\.sc-actions \.sc-feedback\{display:flex;position:absolute/);
});

test('each supporting-evidence row has unfilled feedback controls and content-first hierarchy', () => {
  assert.match(html, /function evidenceFeedback\(label\)/);
  assert.match(html, /Rate \$\{label\}/);
  assert.doesNotMatch(html, /class="sc-evidence-icon"/);
  assert.doesNotMatch(html, /class="sc-evidence-bullet"/);
  assert.match(html, /\.sc-evidence-item-feedback button\{[^}]*border:0;border-radius:0;background:none/);
  assert.match(html, /\.sc-evidence-list li\{position:relative;display:grid;grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(html, /\.sc-evidence-list li\{[^}]*padding-left:24px\}/);
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
  assert.match(html, /camera:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http:\/\/www\.w3\.org\/2000\/svg" aria-hidden="true">/);
  assert.match(html, /M6 18H11V20H7V22H17V20H13V18H18/);
  assert.match(html, /security:\['Side Gate Cam','Garage Cam','Front Door Cam','Driveway Cam'\]/);
  assert.match(html, /garage:\['Garage Cam'\]/);
  assert.match(html, /front:\['Front Door Cam'\]/);
  assert.match(html, /bins:\['Driveway Cam'\]/);
  assert.match(html, /birds:\['Backyard Feeder Cam'\]/);
  assert.doesNotMatch(html, /sc-camera-source-section/);
  assert.doesNotMatch(html, /sc-camera-source-list/);
  assert.match(html, /function cameraSourceSummary\(cameras\)/);
  assert.match(html, /cameras\.map\(camera=>`<span class="sc-evidence-camera-item">/);
  assert.match(html, /camera\.replace\(\/ Cam\$\/,''\)/);
  assert.match(html, /class="sc-evidence-heading-row"><span class="sc-evidence-heading">Supporting Evidence<\/span><span class="sc-evidence-camera-summary"><\/span>/);
  assert.match(html, /\.sc-evidence-heading-row\{display:none;align-items:center;justify-content:space-between/);
  assert.match(html, /\.sc-card\.is-expanded \.sc-evidence-heading-row\{display:flex\}/);
  assert.match(html, /\.sc-evidence-camera-summary\{display:inline-flex;align-items:flex-start;justify-content:flex-end;gap:3px/);
  assert.match(html, /\.sc-evidence-camera-item\{display:inline-flex;width:46px;min-width:0;flex-direction:column;align-items:center/);
  assert.match(html, /\.sc-evidence-camera-summary svg\{width:22px;height:22px;flex:0 0 22px;fill:none;stroke:none\}/);
  assert.match(html, /\.sc-card\.is-expanded \.sc-evidence-trigger:after\{top:25px;transform:rotate\(-90deg\)\}/);
  assert.match(html, /cameraSummary\.innerHTML=cameraSourceSummary\(SMART_CARD_CAMERAS\[scene\]\)/);
  assert.match(html, /cameraSummary\.setAttribute\('aria-label',`Cameras involved: \$\{SMART_CARD_CAMERAS\[scene\]\.join\(', '\)\}`\)/);
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
  assert.match(html, /ev:\{state:'NEEDS CHARGING',sub:'last charged 2 days ago',checked:'15 secs ago',src:'assets\/smart-ev-unplugged\.webp\?v=1'/);
  assert.match(html, /The charging connector is visibly seated in the vehicle charge port/);
  assert.match(html, /The car was last seen connected 2 days ago and has remained home through two overnight charging windows/);
  assert.doesNotMatch(html, /6 hours to full charge/);
  assert.doesNotMatch(html, /not charging for 3 hours/);
  assert.match(html, /ev:\['EV Garage Cam'\]/);
  assert.match(html, /\.sc-card\[data-scene="ev"\] \.sc-detection-box\{/);
});

test('bird watcher card has paired normal and alert evidence', () => {
  assert.match(html, /data-scene="birds" data-checked="20 secs ago"/);
  assert.match(html, /birds:\{state:'NO BIRDS',sub:'3 bird visits today'.*smart-bird-feeder-clear\.webp/);
  assert.doesNotMatch(html, /for 18 mins/);
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
