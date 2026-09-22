import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const standalone = readFileSync(new URL('../smart-cards.html', import.meta.url), 'utf8');

test('state blocks sit below the in-card title and retain four rounded corners', () => {
  const alignedStateRules = html.match(/\.sc-card-top\{top:0;right:auto;left:0/g) ?? [];
  assert.equal(alignedStateRules.length, 2, 'desktop preview and narrow mobile rules must agree');
  assert.match(html, /\.sc-card-top\{top:0;right:auto;left:0;max-width:72%;padding:6px 12px 11px;border-radius:12px\}/);
  assert.match(html, /\.sc-card-top\{top:32px;left:12px;width:max-content;max-width:calc\(100% - 24px\);min-height:0;padding:0;background:none;box-shadow:none;backdrop-filter:none\}/);
});

test('cards have no Go live action and retain their evidence cluster', () => {
  assert.doesNotMatch(html, /<button class="primary">Go live<\/button>/);
  assert.match(html, /\.sc-evidence\{position:absolute;z-index:5;right:12px;bottom:10px;left:12px/);
  assert.match(html, /\.sc-card:after\{display:none\}/);
});

test('only the highest active alert receives a red perimeter and blinking state dot', () => {
  assert.match(html, /const highestAlert=cards\.find\(card=>card\.dataset\.cardMode==='alert'\)/);
  assert.match(html, /card\.classList\.toggle\('is-critical-alert',critical\)/);
  assert.match(html, /\.sc-grid>\.sc-card\.is-critical-alert::after\{[^}]*border:2px solid #ff4b55;border-radius:inherit/);
  assert.match(html, /\.sc-grid>\.sc-card\.is-critical-alert \.sc-state::before\{[^}]*background:#ff4b55;[^}]*animation:sc-critical-blink \.85s/);
  assert.match(html, /@media\(prefers-reduced-motion:reduce\)\{\.sc-grid>\.sc-card\.is-critical-alert \.sc-state::before\{animation:none\}\}/);
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

test('every card has an in-image title and backgroundless feedback at bottom-right', () => {
  assert.match(html, /\.sc-card>\.sc-label\{max-width:calc\(100% - 62px\);overflow:hidden;text-overflow:ellipsis\}/);
  assert.match(html, /\.sc-actions \.sc-feedback\{display:flex;position:absolute;z-index:6;top:-27px;right:0;bottom:auto/);
  assert.match(html, /\.sc-card>\.sc-label\{top:12px;right:12px;left:12px;max-width:none;padding:0;border:0;background:none;box-shadow:none;backdrop-filter:none;color:#fff/);
  assert.match(html, /\.sc-actions \.sc-feedback\{top:auto;right:12px;bottom:12px\}/);
  assert.match(html, /\.sc-actions \.sc-feedback button,\.sc-actions \.sc-feedback button:last-child\{width:24px;height:24px/);
  assert.match(html, /body\.sc-light-page \.sc-grid>\.sc-card \.sc-actions \.sc-feedback button\{color:#fff;filter:drop-shadow/);
  assert.doesNotMatch(html, /\.sc-card\.is-expanded \.sc-actions \.sc-feedback/);
  assert.match(html, /goalFeedback\.setAttribute\('aria-label',`Rate \$\{goal\} goal`\)/);
  assert.match(html, /goalFeedbackButtons\[0\]\.setAttribute\('aria-label',`\$\{goal\} goal was helpful`\)/);
});

test('icon theme, view, and state toggles share one evenly spaced control row', () => {
  assert.match(html, /<div class="sc-mode-row">\s*<div class="sc-theme-mode"[\s\S]*?<div class="sc-view-mode"[\s\S]*?<div class="sc-state-mode"/);
  assert.match(html, /\.sc-mode-row\{display:flex;align-items:center;justify-content:space-between;gap:10px\}/);
  assert.match(html, /class="sc-theme-toggle" id="sc-theme-toggle" type="button" aria-label="Switch to dark mode" aria-pressed="false"/);
  assert.match(html, /class="sc-icon-sun"/);
  assert.match(html, /class="sc-icon-moon"/);
  assert.doesNotMatch(html, /data-sc-theme=/);
  assert.match(html, /\.sc-mode-row \.sc-theme-mode,\.sc-mode-row \.sc-view-mode,\.sc-mode-row \.sc-state-mode\{[^}]*height:42px/);
  assert.match(html, /\.sc-mode-row \.sc-view-mode button,\.sc-mode-row \.sc-state-mode button\{width:42px;min-width:42px;height:36px/);
  assert.match(html, /\.sc-mode-row \.sc-view-mode::before,\.sc-mode-row \.sc-state-mode::before\{[^}]*transition:transform \.28s/);
  assert.match(html, /\.sc-mode-row \.sc-view-mode:has\(button:nth-child\(3\)\[aria-pressed="true"\]\)::before/);
  assert.match(html, /\.sc-mode-row \.sc-theme-toggle svg\{[^}]*transition:opacity \.24s/);
  assert.match(html, /@media\(prefers-reduced-motion:reduce\)\{\.sc-mode-row \.sc-theme-mode,[^}]*transition:none\}/);
  assert.match(html, /<body class="sc-light-page">/);
});

test('list, grid, and flip use the same emergency-ordered cards', () => {
  assert.match(html, /class="sc-view-mode" role="group" aria-label="Card view"/);
  assert.match(html, /data-sc-view="list" aria-pressed="true">List/);
  assert.match(html, /data-sc-view="grid" aria-pressed="false">Grid/);
  assert.match(html, /data-sc-view="flip" aria-pressed="false">Flip/);
  assert.match(html, /\.smartcards:not\(\.sc-flip-view\):not\(\.sc-grid-view\) \.sc-grid>\.sc-card\{aspect-ratio:40\/27\}/);
  assert.match(html, /\.smartcards\.sc-grid-view \.sc-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:12px\}/);
  assert.match(html, /\.smartcards\.sc-grid-view \.sc-grid>\.sc-card\{[^}]*aspect-ratio:1/);
  assert.match(html, /\.smartcards\.sc-grid-view \.sc-card-top \.sc-state\{font-size:clamp\(18px,5\.2vw,22px\)/);
  assert.match(html, /\.smartcards\.sc-grid-view \.sc-grid>\.sc-card \.sc-detection-box\{display:none\}/);
  assert.match(html, /\.smartcards\.sc-grid-view \.sc-highlight-now\{top:auto;right:auto;bottom:8px;left:8px;width:54px;height:38px\}/);
  assert.match(html, /\.smartcards\.sc-grid-view \.sc-card\[data-scene="security"\] \.sc-security-cameras \.sc-focus-layer\{display:block\}/);
  assert.match(html, /\.smartcards\.sc-grid-view \.sc-card\[data-scene="security"\] \.sc-security-cameras \.sc-camera-thumb\{[^}]*bottom:8px;[^}]*aspect-ratio:4\/3/);
  assert.match(html, /\.smartcards\.sc-grid-view \.sc-card\[data-scene="security"\] \.sc-actions \.sc-feedback\{bottom:48px\}/);
  assert.match(html, /classList\.toggle\('sc-grid-view',view==='grid'\)/);
  assert.match(html, /\.smartcards\.sc-flip-view \.sc-grid>\.sc-card\.is-current/);
  assert.match(html, /normal:\['security','garage','front','ev','bins','pets','wildlife','birds'\]/);
  assert.match(html, /alert:\['security','garage','pets','front','wildlife','ev','bins','birds'\]/);
  assert.match(html, /smartCardGrid\.addEventListener\('pointermove'/);
  assert.match(html, /touch-action:none;cursor:grab/);
  assert.match(html, /Math\.hypot\(dx,dy\)<8/);
  assert.match(html, /if\(event\.type==='pointerup'\)stepSmartCardFlip\(1,\{x:drag\.dx,y:drag\.dy\}\)/);
  assert.match(html, /const nextIndex=\(index\+direction\+cards\.length\)%cards\.length/);
  assert.match(html, /focusCard\.animate\(\[/);
  assert.match(html, /window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
  assert.doesNotMatch(html, /class="sc-flip-nav"/);
  assert.match(html, /<section class="sc-stories"[^>]*>[\s\S]*?<ol class="sc-story-list"><\/ol>/);
});

test('normal-state duration uses a translucent pill without changing alert copy', () => {
  assert.match(html, /security:\{state:'SAFE',sub:'for 2 hours'/);
  assert.doesNotMatch(html, /since 9:12 PM/);
  assert.match(html, /bins:\{state:'Bins OUT',sub:"Ready for tomorrow's pickup"/);
  assert.match(
    html,
    /\.sc-grid>\.sc-card:not\(\.is-alert-card\) \.sc-card-top \.sc-sub\{display:inline-flex;width:max-content;margin-top:5px;padding:3px 8px;border-radius:999px;background:rgba\(255,255,255,\.18\)/,
  );
  assert.doesNotMatch(html, /\.sc-card\.is-alert-card[^}]*\.sc-sub\{[^}]*border-radius:999px/);
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
  assert.match(html, /preview\.replaceChildren\(card\.querySelector\('\.sc-scene'\)\.cloneNode\(true\),previewScore,caption\)/);
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

test('top-only image gradient follows the rounded scene while the state and title have no fill', () => {
  assert.match(html, /\.sc-card \.sc-scene:before,\.sc-card\[data-tone\] \.sc-scene:before\{inset:0;background:linear-gradient\(to bottom,rgba\(0,0,0,\.76\) 0%,rgba\(0,0,0,\.38\) 36%,rgba\(0,0,0,0\) 72%\)\}/);
  assert.match(html, /\.sc-grid>\.sc-card:before\{display:none\}/);
  assert.match(html, /\.sc-card>\.sc-label\{top:12px;right:12px;left:12px;max-width:none;padding:0;border:0;background:none;box-shadow:none;backdrop-filter:none/);
  assert.match(html, /\.sc-grid>\.sc-card:not\(\.is-alert-card\) \.sc-card-top\{background:none;box-shadow:none;backdrop-filter:none\}/);
  assert.match(html, /\.sc-card\.is-alert-card \.sc-card-top\{border:0;background:none;color:#fff;box-shadow:none;backdrop-filter:none\}/);
});

test('detail sheet contains the same video and household evidence', () => {
  assert.match(html, /class="sc-evidence-time"/);
  assert.match(html, /class="sc-evidence-rule"/);
  assert.match(html, /class="sc-evidence-preview"/);
  assert.doesNotMatch(html, /Supporting Evidence/);
  assert.match(html, /<span class="sc-detail-checked"><\/span>/);
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
  assert.match(html, /class="sc-video-score\$\{score===5\?' is-five':''\}" aria-hidden="true">\$\{score\}<\/span>/);
  assert.match(html, /\.sc-video-item \.sc-video-score\.is-five\{background:#f6c453;color:#3c2a03\}/);
  assert.match(html, /\.sc-detail-preview-score\.is-five\{background:#f6c453;color:#3c2a03\}/);
  assert.match(html, /\.sc-story-score\.is-five\{background:#f6c453;color:#3c2a03\}/);
  assert.match(html, /class="sc-story-score\$\{rating===5\?' is-five':''\}"/);
  assert.match(html, /previewScore\.classList\.toggle\('is-five',previewScore\.textContent==='5'\)/);
  assert.match(html, /class="sc-detail-preview-score" role="img" hidden/);
  assert.match(html, /previewScore\.textContent=thumb\.querySelector\('\.sc-video-score'\)\.textContent/);
  assert.doesNotMatch(html, /class="sc-video-score"[^>]*>\$\{ratings\[index\]\}\/5/);
  assert.match(html, /\.sc-video-copy\{display:none\}/);
  assert.match(html, /\.sc-video-strip\.is-expanded\{display:grid;max-width:none/);
  assert.match(html, /data-video-sort="newest" aria-pressed="true" aria-label="Sort by time, newest first">Time<\/button>/);
  assert.match(html, /data-video-sort="rating-high" aria-pressed="false" aria-label="Sort by rating, highest first">Rating<\/button>/);
  assert.doesNotMatch(html, /sc-video-sort-select/);
  assert.match(html, /caption\.querySelector\('p'\)\.textContent=SMART_CARD_EVIDENCE\[mode\]\[scene\]\.video\[index\]/);
  assert.match(html, /detailDialog\.scrollTop=0;\n  \}\);/);
});

test('detail state stays unfilled and duration retains its pill treatment', () => {
  assert.match(html, /\.sc-detail-state\{[^}]*padding:0;border-radius:12px;background:none;color:#fff/);
  assert.match(html, /\.sc-detail-state span\{[^}]*background:rgba\(255,255,255,\.18\);color:inherit/);
  assert.match(html, /\.sc-detail-dialog\[data-mode="alert"\] \.sc-detail-state\{background:none;color:#fff\}/);
  assert.match(html, /\.sc-detail-dialog\[data-mode="alert"\] \.sc-detail-state strong\{color:#71edbe\}/);
  assert.match(html, /\.sc-detail-dialog\[data-mode="alert"\]\[data-scene="security"\] \.sc-detail-state strong\{color:#ff6570\}/);
  assert.match(html, /detailDialog\.dataset\.scene=scene/);
});

test('last-12-hours stories follow the card feed and open their rated video evidence', () => {
  assert.match(html, /<section class="sc-card-feed" aria-labelledby="sc-cards-heading">\s*<div class="sc-stories-head sc-cards-head"><h2 id="sc-cards-heading">8 updates on 8 monitor goals<\/h2><\/div>\s*<div class="sc-shell">[\s\S]*?<div class="sc-grid">[\s\S]*?<\/div>\s*<span class="sc-flip-status" aria-live="polite"><\/span>\s*<\/div>\s*<\/section>\s*<section class="sc-stories" aria-labelledby="sc-stories-heading">[\s\S]*?<ol class="sc-story-list"><\/ol>/);
  assert.match(html, /smartCards\.querySelector\('#sc-cards-heading'\)\.textContent=`\$\{cards\.length\} \$\{cards\.length===1\?'update':'updates'\} on \$\{goals\} monitor \$\{goals===1\?'goal':'goals'\}`/);
  assert.match(html, /\.sc-stories\{margin:65px 0 0;font-family:var\(--sans\)\}/);
  assert.match(html, /<h2 id="sc-stories-heading">6 key moments in last 12 hours<\/h2>/);
  assert.match(html, /smartCards\.querySelector\('#sc-stories-heading'\)\.textContent=`\$\{SMART_CARD_STORIES\.length\} key \$\{SMART_CARD_STORIES\.length===1\?'moment':'moments'\} in last 12 hours`/);
  assert.doesNotMatch(html, /Top-rated moments from the last 24 hours/);
  assert.match(html, /const SMART_CARD_STORIES=\[/);
  assert.match(html, /const rating=SMART_CARD_VIDEO_RATINGS\.highlights\[scene\]\[index\]/);
  assert.match(html, /storyList\.addEventListener\('click',event=>\{/);
  assert.match(html, /openDetail\(card,'highlights'\)/);
  assert.match(html, /videoStrip\.querySelector\(`\.sc-video-thumb\[data-video-index="\$\{story\.dataset\.storyIndex\}"\]`\)\?\.click\(\)/);
  assert.match(html, /detailDialog\.querySelector\('\.sc-detail-state strong'\)\.textContent=index===0\?state\.state:state\.events\[index\]\.label\.toUpperCase\(\)/);
});

test('last-12-hours stories use one timeline surface with camera-ratio thumbs and independent feedback', () => {
  assert.match(html, /\.sc-story-list\{position:relative;display:grid;gap:0;[^}]*background:#1c2a3c/);
  assert.match(html, /\.sc-story-list>li:after\{content:'';position:absolute;[^}]*width:1px;background:#6e8195/);
  assert.match(html, /\.sc-story-list>li:last-child:after\{display:none\}/);
  assert.match(html, /\.sc-story-list>li:before\{content:'';position:absolute;[^}]*border-radius:50%/);
  assert.match(html, /\.sc-story-thumb\{[^}]*aspect-ratio:16\/9/);
  assert.match(html, /\.sc-story-text\{display:-webkit-box;[^}]*-webkit-line-clamp:2/);
  assert.match(html, /\.sc-story-time\{[^}]*font-weight:500/);
  assert.match(html, /\.sc-story-copy strong\{display:inline;font-weight:800\}/);
  assert.match(html, /\.sc-story-description\{display:inline;/);
  assert.match(html, /\.sc-story-list>li\{position:relative;min-width:0\}/);
  assert.doesNotMatch(html, /\.sc-story-list>li\{[^}]*border-bottom/);
  assert.match(html, /<span class="sc-story-copy"><time class="sc-story-time">\$\{event\.time\}<\/time><span class="sc-story-text"><strong>\$\{title\}<\/strong>/);
  assert.match(html, /class="sc-story-feedback" role="group" aria-label="Rate \$\{title\} story"/);
  assert.match(html, /const feedback=event\.target\.closest\('\[data-story-feedback\]'\)/);
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
  assert.match(html, /pets:\['Living Room Cam'\]/);
  assert.match(html, /wildlife:\['Backyard Cam'\]/);
  assert.doesNotMatch(html, /sc-camera-source-section/);
  assert.doesNotMatch(html, /sc-camera-source-list/);
  assert.match(html, /function cameraSourceSummary\(cameras\)/);
  assert.match(html, /cameras\.map\(camera=>`<span class="sc-evidence-camera-item">/);
  assert.match(html, /camera\.replace\(\/ Cam\$\/,''\)/);
  assert.match(html, /<div class="sc-detail-evidence-head"><div><span class="sc-detail-checked"><\/span>/);
  assert.match(html, /\.sc-detail-evidence-head\{display:flex;min-width:0;flex-direction:column;align-items:flex-end/);
  assert.match(html, /\.sc-evidence-camera-summary\{display:inline-flex;align-items:flex-start;justify-content:flex-end;gap:3px/);
  assert.match(html, /\.sc-evidence-camera-item\{display:inline-flex;width:46px;min-width:0;flex-direction:column;align-items:center/);
  assert.match(html, /\.sc-evidence-camera-summary svg\{width:22px;height:22px;flex:0 0 22px;fill:none;stroke:none\}/);
  assert.match(html, /cameraSummary\.innerHTML=cameraSourceSummary\(SMART_CARD_CAMERAS\[scene\]\)/);
  assert.match(html, /cameraSummary\.setAttribute\('aria-label',`Cameras involved: \$\{SMART_CARD_CAMERAS\[scene\]\.join\(', '\)\}`\)/);
});

test('normal and alert states provide twenty video observations and two memories for every scene', () => {
  for (const scene of ['security', 'garage', 'ev', 'front', 'bins', 'birds', 'pets', 'wildlife']) {
    const occurrences = html.match(new RegExp(`${scene}:\\{video:\\[`, 'g')) ?? [];
    assert.equal(occurrences.length, ['birds', 'pets', 'wildlife'].includes(scene) ? 3 : 2, `${scene} needs evidence for every available state`);
  }
  assert.match(html, /SMART_CARD_EVIDENCE\[mode\]\[scene\]\.video\.push\(\.\.\.SMART_CARD_VIDEO_HISTORY\[mode\]\[scene\],\.\.\.SMART_CARD_VIDEO_ARCHIVE\[mode\]\[scene\]\)/);
  assert.match(html, /card\.querySelector\('\.sc-evidence-preview'\)\.textContent=evidence\.video\[0\]/);
  assert.match(html, /videoStrip\.innerHTML=videoEvidenceStrip\(SMART_CARD_EVIDENCE\[mode\]\[scene\]\.video,SMART_CARD_STATES\[mode\]\[scene\],SMART_CARD_VIDEO_RATINGS\[mode\]\[scene\],expanded,detailDialog\.dataset\.videoSort,Number\(detailDialog\.dataset\.selectedVideoIndex\)\)/);
  assert.match(html, /detailDialog\.querySelector\('\.sc-evidence-memory'\)\.innerHTML=evidenceList\(evidence\.memory,'household memory'\)/);
});

test('mixed defaults to alert-prioritized real scenarios; normal keeps wildlife highlights', () => {
  assert.match(html, /class="active" type="button" data-sc-state="mixed" aria-pressed="true"[^>]*>Mixed<\/button>/);
  assert.match(html, /type="button" data-sc-state="normal" aria-pressed="false">Normal<\/button>/);
  assert.doesNotMatch(html, /data-sc-state="highlights"/);
  assert.match(html, /setSmartCardState\('mixed'\)/);
  assert.match(html, /const cardMode=isAlert\|\|mixedAlerts\.has\(scene\)\?'alert':SMART_CARD_STATES\.highlights\[scene\]\?'highlights':'normal'/);
  assert.match(html, /const order=mode==='mixed'\?\[\.\.\.SMART_CARD_MIXED_ALERT_PRIORITY\.filter\(scene=>mixedAlerts\.has\(scene\)\),\.\.\.SMART_CARD_PRIORITY\.normal\.filter\(scene=>!mixedAlerts\.has\(scene\)\)\]:SMART_CARD_PRIORITY\[mode\]/);
  for (const [scene, state] of [['birds', 'CARDINAL'], ['pets', 'DOG PLAYING'], ['wildlife', 'RACCOON']]) {
    assert.match(html, new RegExp(`${scene}:\\{state:'${state}'.*?current:\\{state:.*?events:\\[\\{label:`));
  }
  assert.match(html, /collection\.className='sc-highlight-collection'/);
  assert.doesNotMatch(html, /class="sc-highlight-history"/);
  assert.doesNotMatch(html, /class="sc-highlight-latest"/);
  assert.match(html, /\.sc-grid>\.sc-card \.sc-evidence\{display:none\}/);
  assert.match(html, /collection\.querySelector\('\.sc-highlight-now'\)\.addEventListener\('click',event=>\{event\.stopPropagation\(\);openDetail\(card,'normal'\)\}\)/);
  assert.match(html, /state\.events\?\.\[index\]\?\.src\|\|state\.src/);
  for (const name of ['smart-bird-bluejay.webp','smart-bird-goldfinch.webp','smart-pet-playing.webp','smart-pet-drinking.webp','smart-wildlife-deer.webp','smart-wildlife-fox.webp']) {
    assert.ok(existsSync(new URL(`../assets/${name}`, import.meta.url)), `${name} must be present`);
  }
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

test('pet and wild animal watcher cards have paired camera states and evidence', () => {
  assert.match(html, /data-scene="pets" data-checked="11 secs ago"[^>]*><span class="sc-label">Pet watcher<\/span>/);
  assert.match(html, /pets:\{state:'RESTING',sub:'for 35 mins'.*smart-pet-resting\.webp/);
  assert.match(html, /pets:\{state:'AT DOOR',sub:'for 8 mins'.*smart-pet-at-door\.webp/);
  assert.match(html, /data-scene="wildlife" data-checked="22 secs ago"[^>]*><span class="sc-label">Wild animal watcher<\/span>/);
  assert.match(html, /wildlife:\{state:'NO WILDLIFE',sub:'for 2 hours'.*smart-wildlife-clear\.webp/);
  assert.match(html, /wildlife:\{state:'RACCOON',sub:'for 4 mins'.*smart-wildlife-raccoon\.webp/);
  for (const name of ['smart-pet-resting.webp', 'smart-pet-at-door.webp', 'smart-wildlife-clear.webp', 'smart-wildlife-raccoon.webp']) {
    assert.ok(existsSync(new URL(`../assets/${name}`, import.meta.url)), `${name} must be present`);
  }
  assert.match(html, /\.sc-card\[data-scene="pets"\] \.sc-detection-box\{/);
  assert.match(html, /\.sc-card\[data-scene="wildlife"\] \.sc-detection-box\{/);
});

test('dedicated Pages entry opens the standalone Smart Cards view', () => {
  assert.match(standalone, /<title>WYZE Smart Cards<\/title>/);
  assert.match(standalone, /index\.html\?view=smart-cards/);
  assert.match(html, /new URLSearchParams\(location\.search\)\.get\('view'\)==='smart-cards'/);
  assert.match(html, /if\(isStandaloneSmartCards\)document\.title='WYZE Smart Cards'/);
  assert.match(html, /body\.sc-standalone \.wrap>header,body\.sc-standalone \.tabs,body\.sc-standalone \.wrap>footer\{display:none\}/);
  assert.match(html, /body\.sc-standalone #pane-smart\{display:block!important\}/);
});
