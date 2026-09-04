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
  assert.match(html, /<strong>Video description<\/strong>/);
  assert.match(html, /<strong>Household memory<\/strong>/);
  assert.match(html, /card\.classList\.toggle\('is-expanded',expanded\)/);
  assert.match(html, /\.sc-evidence-preview\{[^}]*max-height:21px[^}]*mask-image:linear-gradient/);
  assert.match(html, /\.sc-card\.is-expanded \.sc-evidence-preview\{display:none\}/);
  assert.match(html, /\.sc-evidence-details\{display:grid;gap:0;max-height:0;[^}]*transition:max-height/);
  assert.match(html, /\.sc-card\.is-expanded \.sc-evidence-details\{gap:18px;max-height:480px;[^}]*opacity:1/);
  assert.match(html, /\.sc-actions \.sc-feedback\{display:none\}/);
});

test('each supporting-evidence row has unfilled feedback controls and content-first hierarchy', () => {
  assert.match(html, /function evidenceFeedback\(label\)/);
  assert.match(html, /Rate \$\{label\}/);
  assert.match(html, /\.sc-evidence-icon\{[^}]*border-radius:0;background:none;color:#91a3ba\}/);
  assert.match(html, /\.sc-evidence-item-feedback button\{[^}]*border:0;border-radius:0;background:none/);
  assert.match(html, /\.sc-evidence-list li\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(html, /\.sc-evidence-item strong\{[^}]*color:#91a3ba;font-size:9px/);
  assert.match(html, /\.sc-evidence-item p\{[^}]*color:#f4f7fb;font-size:11\.5px;font-weight:620/);
  assert.match(html, /function evidenceList\(items,label\)/);
});

test('normal and alert states provide three observations and two memories for every scene', () => {
  for (const scene of ['security', 'garage', 'front', 'bins', 'birds']) {
    const occurrences = html.match(new RegExp(`${scene}:\\{video:\\[`, 'g')) ?? [];
    assert.equal(occurrences.length, 2, `${scene} needs normal and alert evidence`);
  }
  assert.match(html, /card\.querySelector\('\.sc-evidence-preview'\)\.textContent=evidence\.video\[0\]/);
  assert.match(html, /card\.querySelector\('\.sc-evidence-video'\)\.innerHTML=evidenceList\(evidence\.video,'video description'\)/);
  assert.match(html, /card\.querySelector\('\.sc-evidence-memory'\)\.innerHTML=evidenceList\(evidence\.memory,'household memory'\)/);
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
