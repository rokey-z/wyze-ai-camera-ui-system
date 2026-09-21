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

test('checked time is static and followed by an icon-only refresh action', () => {
  assert.match(html, /<div class="sc-evidence-meta"><span class="sc-evidence-time"><\/span><button class="sc-evidence-refresh"/);
  assert.doesNotMatch(html, /<button class="sc-evidence-trigger"[^>]*><span class="sc-evidence-time"/);
  assert.match(html, /\.sc-evidence-meta\{display:flex;align-items:center;gap:5px;width:max-content;cursor:default\}/);
  assert.match(html, /\.sc-evidence-refresh\{display:grid;place-items:center;width:22px;height:22px;[^}]*background:none/);
  assert.match(html, /aria-label="Refresh \$\{goal\} state" title="Refresh state"><svg/);
  assert.match(html, /refreshButton\.addEventListener\('click',\(\)=>\{/);
  assert.match(html, /evidence\.querySelector\('\.sc-evidence-time'\)\.textContent='just now'/);
});

test('every card has compact goal feedback aligned to the goal line right edge', () => {
  assert.match(html, /\.sc-card>\.sc-label\{max-width:calc\(100% - 62px\);overflow:hidden;text-overflow:ellipsis\}/);
  assert.match(html, /\.sc-actions \.sc-feedback\{display:flex;position:absolute;z-index:6;top:-27px;right:0;bottom:auto/);
  assert.match(html, /\.sc-actions \.sc-feedback button,\.sc-actions \.sc-feedback button:last-child\{width:24px;height:24px/);
  assert.match(html, /body\.sc-light-page \.sc-actions \.sc-feedback button\{color:#42536b\}/);
  assert.doesNotMatch(html, /\.sc-card\.is-expanded \.sc-actions \.sc-feedback/);
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

test('the detail sheet opens above a fixed feed with a large copy of the camera scene', () => {
  assert.match(html, /const detailDialog=document\.createElement\('dialog'\)/);
  assert.match(html, /detailDialog\.className='sc-detail-dialog'/);
  assert.match(html, /detailDialog\.setAttribute\('aria-labelledby','sc-detail-title'\)/);
  assert.match(html, /preview\.replaceChildren\(card\.querySelector\('\.sc-scene'\)\.cloneNode\(true\),caption\)/);
  assert.match(html, /\.sc-detail-preview-card\.sc-card\{[^}]*aspect-ratio:4\/3/);
  assert.match(html, /\.sc-detail-dialog\{position:fixed;inset:auto 0 0/);
  assert.doesNotMatch(html, /card\.classList\.toggle\('is-expanded'/);
});

test('card body and evidence preview open details without hijacking other controls', () => {
  assert.match(html, /evidenceTrigger\.addEventListener\('click',\(\)=>openDetail\(card\)\)/);
  assert.match(html, /card\.addEventListener\('click',event=>\{/);
  assert.match(html, /if\(event\.target\.closest\('button,\.sc-evidence-meta'\)\)return/);
  assert.match(html, /card\.addEventListener\('keydown',event=>\{/);
  assert.match(html, /event\.target!==card\|\|!\['Enter',' '\]\.includes\(event\.key\)/);
  assert.match(html, /detailDialog\.querySelector\('\.sc-detail-close'\)\.addEventListener\('click',closeDetail\)/);
  assert.match(html, /detailDialog\.addEventListener\('click',event=>\{if\(event\.target===detailDialog\)closeDetail\(\)\}\)/);
});

test('detail sheet is mobile-scrollable and does not move the feed', () => {
  assert.match(html, /body\.sc-detail-open\{overflow:hidden\}/);
  assert.match(html, /\.sc-detail-dialog\{[^}]*max-height:min\(92dvh,900px\)[^}]*overflow-y:auto/);
  assert.match(html, /detailDialog\.addEventListener\('close',\(\)=>\{/);
  assert.match(html, /lastDetailCard\?\.focus\(\{preventScroll:true\}\)/);
  assert.match(html, /@media\(prefers-reduced-motion:reduce\)\{\.sc-detail-dialog\{animation:none\}\}/);
});

test('footer readability gradient follows the rounded card corners', () => {
  assert.match(
    html,
    /\.sc-card:before,\.sc-card\[data-tone\]:before\{[^}]*border-radius:0 0 16px 16px[^}]*background:linear-gradient\(to top/,
  );
});

test('detail sheet contains the same video and household evidence', () => {
  assert.match(html, /class="sc-evidence-time"/);
  assert.match(html, /class="sc-evidence-rule"/);
  assert.match(html, /class="sc-evidence-preview"/);
  assert.match(html, /<span class="sc-detail-evidence-label">Supporting Evidence<\/span>/);
  assert.doesNotMatch(html, /Evidence behind this state/);
  assert.match(html, /<span>Video Evidences<\/span><div class="sc-video-actions"><div class="sc-video-sort" role="group" aria-label="Sort video evidence" hidden>/);
  assert.match(html, /<button class="sc-evidence-section-more sc-video-more" type="button" aria-expanded="false"/);
  assert.match(html, /<span>Household memory<\/span><span class="sc-evidence-section-more">\+ more<\/span>/);
  assert.match(html, /\.sc-evidence-preview\{[^}]*max-height:21px[^}]*mask-image:linear-gradient/);
  assert.match(html, /videoStrip\.innerHTML=videoEvidenceStrip\(SMART_CARD_EVIDENCE\[mode\]\[scene\]\.video,SMART_CARD_STATES\[mode\]\[scene\],SMART_CARD_VIDEO_RATINGS\[mode\]\[scene\],expanded,detailDialog\.dataset\.videoSort,Number\(detailDialog\.dataset\.selectedVideoIndex\)\)/);
  assert.match(html, /videoStrip\.scrollLeft=0/);
  assert.match(html, /detailDialog\.querySelector\('\.sc-evidence-memory'\)\.innerHTML=evidenceList\(evidence\.memory,'household memory'\)/);
  assert.match(html, /\.sc-actions \.sc-feedback\{display:flex;position:absolute/);
});

test('video evidences scroll horizontally with thumbnail ratings and top evidence highlights', () => {
  assert.match(html, /class="sc-video-strip sc-evidence-video" id="sc-video-evidence-list" aria-label="Video evidences; swipe horizontally"/);
  assert.match(html, /\.sc-video-strip\{display:flex;max-width:calc\(100% \+ 36px\);gap:8px;[^}]*overflow-x:auto;[^}]*scroll-snap-type:x mandatory/);
  assert.match(html, /\.sc-video-item\{flex:0 0 94px/);
  assert.match(html, /\.sc-video-thumb\{[^}]*height:64px/);
  assert.match(html, /\.sc-video-item\.is-featured \.sc-video-thumb\{border-color:#71edbeaa;box-shadow:0 0 0 1px #71edbe5c\}/);
  assert.match(html, /\.sc-video-score\{position:absolute;top:5px;right:5px/);
  assert.match(html, /\.filter\(item=>item\.score>=4\)\.sort\(\(a,b\)=>b\.score-a\.score\|\|a\.index-b\.index\)\.slice\(0,3\)/);
  assert.match(html, /featuredIndexes\.has\(index\)\?' is-featured':''/);
  assert.match(html, /class="sc-video-thumb" type="button" data-video-index="\$\{index\}" aria-pressed="\$\{index===selectedIndex\}"/);
  assert.match(html, /class="sc-video-score" aria-hidden="true">\$\{score\}<\/span>/);
  assert.doesNotMatch(html, /class="sc-video-score"[^>]*>\$\{ratings\[index\]\}\/5/);
  assert.match(html, /\.sc-video-copy\{display:none\}/);
  assert.match(html, /\.sc-video-strip\.is-expanded\{display:grid;max-width:none/);
  assert.match(html, /data-video-sort="newest" aria-pressed="true" aria-label="Sort by time, newest first">Time<\/button>/);
  assert.match(html, /data-video-sort="rating-high" aria-pressed="false" aria-label="Sort by rating, highest first">Rating<\/button>/);
  assert.doesNotMatch(html, /sc-video-sort-select/);
  assert.match(html, /caption\.querySelector\('p'\)\.textContent=SMART_CARD_EVIDENCE\[mode\]\[scene\]\.video\[index\]/);
  assert.match(html, /detailDialog\.scrollTop=0;\n  \}\);/);
});

test('detail state and duration reuse each card color treatment', () => {
  assert.match(html, /\.sc-detail-state\{[^}]*background:linear-gradient\(90deg,rgba\(0,0,0,\.62\) 0%,rgba\(0,0,0,\.25\) 42%,rgba\(0,0,0,0\) 78%\)/);
  assert.match(html, /\.sc-detail-state span\{[^}]*background:rgba\(255,255,255,\.18\);color:inherit/);
  assert.match(html, /\.smartcards\.is-alert \.sc-detail-state\{background:rgba\(113,237,190,\.82\);color:#09271e\}/);
  assert.match(html, /\.smartcards\.is-alert \.sc-detail-dialog\[data-scene="security"\] \.sc-detail-state\{background:rgba\(255,75,85,\.82\);color:#fff\}/);
  assert.match(html, /detailDialog\.dataset\.scene=scene/);
});

test('detail evidence summary and cameras sit to the right of state on mobile', () => {
  assert.match(html, /\.sc-detail-content\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1\.45fr\)/);
  assert.match(html, /\.sc-detail-evidence-head\{display:flex;min-width:0;flex-direction:column;align-items:flex-end/);
  assert.match(html, /\.sc-detail-sections\{display:grid;grid-column:1\/-1/);
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

test('video more expands while household memory keeps its hover-only label', () => {
  assert.match(html, /class="sc-evidence-title-icon">\$\{SMART_CARD_EVIDENCE_ICONS\.video\}<\/span><span>Video Evidences/);
  assert.match(html, /class="sc-evidence-title-icon">\$\{SMART_CARD_EVIDENCE_ICONS\.memory\}<\/span><span>Household memory/);
  assert.match(html, /\.sc-evidence-title-icon svg\{width:15px;height:15px;fill:none;stroke:currentColor/);
  assert.doesNotMatch(html, /sc-evidence-section-chevron/);
  assert.match(html, /\.sc-evidence-section-header\{[^}]*width:100%/);
  assert.match(html, /\.sc-evidence-section-more\{margin-left:auto;padding:3px 5px;[^}]*transition:color \.16s ease,background-color \.16s ease\}/);
  assert.match(html, /\.sc-evidence-section-more:hover\{background:rgba\(255,255,255,\.1\);color:#fff\}/);
  assert.match(html, /videoMore\.addEventListener\('click',\(\)=>\{/);
  assert.match(html, /videoSort\.addEventListener\('click',event=>\{/);
  assert.match(html, /\.sc-evidence-list-wrap\{overflow:visible\}/);
  assert.doesNotMatch(html, /sc-evidence-section-trigger/);
  assert.doesNotMatch(html, /data-evidence-section/);
  assert.doesNotMatch(html, /is-collapsed/);
  assert.doesNotMatch(html, /--sc-expanded-height/);
});

test('detail sheet identifies the cameras involved in each card state', () => {
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
  assert.match(html, /<div class="sc-detail-evidence-head"><div><span class="sc-detail-evidence-label">Supporting Evidence<\/span>/);
  assert.match(html, /\.sc-detail-evidence-head\{display:flex;min-width:0;flex-direction:column;align-items:flex-end/);
  assert.match(html, /\.sc-evidence-camera-summary\{display:inline-flex;align-items:flex-start;justify-content:flex-end;gap:3px/);
  assert.match(html, /\.sc-evidence-camera-item\{display:inline-flex;width:46px;min-width:0;flex-direction:column;align-items:center/);
  assert.match(html, /\.sc-evidence-camera-summary svg\{width:22px;height:22px;flex:0 0 22px;fill:none;stroke:none\}/);
  assert.match(html, /cameraSummary\.innerHTML=cameraSourceSummary\(SMART_CARD_CAMERAS\[scene\]\)/);
  assert.match(html, /cameraSummary\.setAttribute\('aria-label',`Cameras involved: \$\{SMART_CARD_CAMERAS\[scene\]\.join\(', '\)\}`\)/);
});

test('normal and alert states provide twenty video observations and two memories for every scene', () => {
  for (const scene of ['security', 'garage', 'ev', 'front', 'bins', 'birds']) {
    const occurrences = html.match(new RegExp(`${scene}:\\{video:\\[`, 'g')) ?? [];
    assert.equal(occurrences.length, 2, `${scene} needs normal and alert evidence`);
  }
  assert.match(html, /SMART_CARD_EVIDENCE\[mode\]\[scene\]\.video\.push\(\.\.\.SMART_CARD_VIDEO_HISTORY\[mode\]\[scene\],\.\.\.SMART_CARD_VIDEO_ARCHIVE\[mode\]\[scene\]\)/);
  assert.match(html, /card\.querySelector\('\.sc-evidence-preview'\)\.textContent=evidence\.video\[0\]/);
  assert.match(html, /videoStrip\.innerHTML=videoEvidenceStrip\(SMART_CARD_EVIDENCE\[mode\]\[scene\]\.video,SMART_CARD_STATES\[mode\]\[scene\],SMART_CARD_VIDEO_RATINGS\[mode\]\[scene\],expanded,detailDialog\.dataset\.videoSort,Number\(detailDialog\.dataset\.selectedVideoIndex\)\)/);
  assert.match(html, /detailDialog\.querySelector\('\.sc-evidence-memory'\)\.innerHTML=evidenceList\(evidence\.memory,'household memory'\)/);
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
