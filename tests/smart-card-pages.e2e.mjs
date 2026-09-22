import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync } from 'node:fs';
import test from 'node:test';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const chromePath = chromeCandidates.find(existsSync);

const harness = `<!doctype html><html><head><title>RUNNING</title></head><body>
<iframe id="app" src="/smart-cards.html" style="width:390px;height:844px;border:0"></iframe>
<script>
const frame=document.querySelector('#app');
const finish=result=>{document.title='RESULT:'+btoa(JSON.stringify(result))};
let attempts=0;
const inspect=()=>{
  attempts+=1;
  try{
    const win=frame.contentWindow;
    const doc=frame.contentDocument;
    if(!doc?.querySelector('.sc-grid>.sc-card')||!win.location.search.includes('view=smart-cards'))throw new Error('waiting');
    const images=[...doc.images];
    const hiddenSelectors=['.wrap>header','.tabs','.wrap>footer'];
    const initialCardBounds=doc.querySelector('.sc-grid>.sc-card').getBoundingClientRect();
    const initialScrollY=win.scrollY;
    const controlsAligned=()=>{
      const row=doc.querySelector('.sc-mode-row').getBoundingClientRect();
      const theme=doc.querySelector('.sc-theme-mode').getBoundingClientRect();
      const view=doc.querySelector('.sc-view-mode').getBoundingClientRect();
      const state=doc.querySelector('.sc-state-mode').getBoundingClientRect();
      return Math.abs(theme.top-view.top)<=1&&Math.abs(view.top-state.top)<=1&&theme.right<=view.left&&view.right<=state.left&&Math.abs((view.left+view.right)/2-(row.left+row.right)/2)<=1&&theme.left>=row.left&&state.right<=row.right;
    };
    const initial={
      path:win.location.pathname,
      search:win.location.search,
      title:doc.title,
      standalone:doc.body.classList.contains('sc-standalone'),
      light:doc.body.classList.contains('sc-light-page'),
      cards:doc.querySelectorAll('.sc-grid>.sc-card').length,
      hiddenChrome:hiddenSelectors.every(selector=>getComputedStyle(doc.querySelector(selector)).display==='none'),
      brokenImages:images.filter(image=>image.complete&&image.naturalWidth===0).map(image=>image.getAttribute('src')),
      cardWidth:Math.round(doc.querySelector('.sc-grid>.sc-card').getBoundingClientRect().width),
      sceneHeight:Math.round(doc.querySelector('.sc-grid>.sc-card .sc-scene').getBoundingClientRect().height),
      landscapeCards:[...doc.querySelectorAll('.sc-grid>.sc-card')].every(card=>Math.abs(card.getBoundingClientRect().width/card.getBoundingClientRect().height-40/27)<.02),
      normalOrder:[...doc.querySelectorAll('.sc-grid>.sc-card')].map(card=>card.dataset.scene),
      controlsOneLineCentered:controlsAligned(),
      cardHeading:(()=>{const heading=doc.querySelector('#sc-cards-heading');const storiesHeading=doc.querySelector('#sc-stories-heading');return {text:heading.textContent,aboveCards:heading.getBoundingClientRect().bottom<doc.querySelector('.sc-grid>.sc-card').getBoundingClientRect().top,sameStyle:getComputedStyle(heading).fontSize===getComputedStyle(storiesHeading).fontSize&&getComputedStyle(heading).fontWeight===getComputedStyle(storiesHeading).fontWeight}})(),
      refreshButtons:doc.querySelectorAll('.sc-evidence-refresh').length,
      checkedTimeInsideTrigger:!!doc.querySelector('.sc-evidence-trigger .sc-evidence-time'),
      goalFeedbackButtons:doc.querySelectorAll('.sc-actions .sc-feedback button').length,
      bottomEvidenceHidden:[...doc.querySelectorAll('.sc-grid>.sc-card .sc-evidence')].every(node=>getComputedStyle(node).display==='none'),
      stateBlocksClear:[...doc.querySelectorAll('.sc-grid>.sc-card .sc-card-top')].every(block=>getComputedStyle(block).backgroundImage==='none'&&getComputedStyle(block).backgroundColor==='rgba(0, 0, 0, 0)'),
      imageGradient:[...doc.querySelectorAll('.sc-grid>.sc-card')].every(card=>getComputedStyle(card.querySelector('.sc-scene'),'::before').backgroundImage.includes('linear-gradient')&&getComputedStyle(card,'::before').display==='none'),
      goalTitleInside:[...doc.querySelectorAll('.sc-grid>.sc-card')].every(card=>{
        const title=card.querySelector(':scope>.sc-label').getBoundingClientRect();
        const bounds=card.getBoundingClientRect();
        return title.left>=bounds.left&&title.top>=bounds.top&&title.right<=bounds.right&&title.bottom<bounds.top+39;
      }),
      stateBlockAligned:[...doc.querySelectorAll('.sc-grid>.sc-card')].every(card=>{
        const title=card.querySelector(':scope>.sc-label').getBoundingClientRect();
        const state=card.querySelector('.sc-card-top').getBoundingClientRect();
        return Math.abs(title.left-state.left)<=1&&state.top-title.bottom>=4&&state.top-title.bottom<=10;
      }),
      feedbackBottomRight:[...doc.querySelectorAll('.sc-grid>.sc-card')].every(card=>{
        const feedback=card.querySelector('.sc-actions .sc-feedback').getBoundingClientRect();
        const bounds=card.getBoundingClientRect();
        return Math.abs(feedback.right-(bounds.right-12))<=1&&Math.abs(feedback.bottom-(bounds.bottom-12))<=1;
      }),
      feedbackBackgroundless:[...doc.querySelectorAll('.sc-grid>.sc-card .sc-feedback button')].every(button=>getComputedStyle(button).backgroundColor==='rgba(0, 0, 0, 0)'),
      normalActive:doc.querySelector('[data-sc-state="normal"]').getAttribute('aria-pressed')==='true'&&!doc.querySelector('[data-sc-state="highlights"]'),
    };
    const firstCard=doc.querySelector('.sc-grid>.sc-card');
    const lastCard=doc.querySelector('.sc-grid>.sc-card:last-child');
    const dialog=doc.querySelector('.sc-detail-dialog');
    const storyButtons=[...doc.querySelectorAll('.sc-story-list .sc-story')];
    const storySummary={belowCards:doc.querySelector('.sc-stories').getBoundingClientRect().top>lastCard.getBoundingClientRect().bottom,heading:doc.querySelector('#sc-stories-heading').textContent.trim(),count:storyButtons.length,titles:storyButtons.map(button=>button.querySelector('strong').textContent),ratings:storyButtons.map(button=>button.querySelector('.sc-story-score').textContent),images:storyButtons.every(button=>!!button.querySelector('img').getAttribute('src'))};
    const storyRatingColors={five:getComputedStyle(storyButtons[0].querySelector('.sc-story-score')).backgroundColor,four:getComputedStyle(storyButtons[2].querySelector('.sc-story-score')).backgroundColor};
    const storyList=doc.querySelector('.sc-story-list');
    const firstStory=storyButtons[0];
    const firstStoryThumb=firstStory.querySelector('.sc-story-thumb').getBoundingClientRect();
    const firstStoryCopy=firstStory.querySelector('.sc-story-text');
    const firstStoryTime=firstStory.querySelector('.sc-story-time');
    const firstStoryFeedback=firstStory.closest('li').querySelectorAll('.sc-story-feedback button');
    firstStoryFeedback[0].click();
    const storyTimeline={oneSurface:getComputedStyle(storyList).backgroundColor==='rgb(255, 255, 255)'&&[...storyButtons].every(button=>getComputedStyle(button).backgroundColor==='rgba(0, 0, 0, 0)'),line:getComputedStyle(storyList.firstElementChild,'::after').width==='1px'&&getComputedStyle(storyList.lastElementChild,'::after').display==='none',dots:[...storyList.children].every(item=>getComputedStyle(item,'::before').width==='6px'&&getComputedStyle(item,'::before').boxShadow==='none'),timestamps:[...storyButtons].every(button=>!!button.querySelector('time.sc-story-time')),timeAboveTitle:firstStoryTime.getBoundingClientRect().bottom<=firstStoryCopy.getBoundingClientRect().top&&getComputedStyle(firstStoryTime).fontWeight==='500',cameraRatio:Math.abs(firstStoryThumb.width/firstStoryThumb.height-16/9)<.02,twoLineTitle:getComputedStyle(firstStoryCopy).webkitLineClamp==='2'&&firstStoryCopy.getBoundingClientRect().height<=32,noDividers:[...storyList.children].every(item=>getComputedStyle(item).borderBottomWidth==='0px'),compactRows:[...storyList.children].every(item=>item.getBoundingClientRect().height<100),feedbackButtons:storyList.querySelectorAll('.sc-story-feedback button').length,feedbackSelected:firstStoryFeedback[0].getAttribute('aria-pressed')==='true'&&firstStoryFeedback[1].getAttribute('aria-pressed')==='false',feedbackKeepsDetailClosed:!dialog.open};
    storyButtons[2].click();
    const storyDetail={mode:dialog.dataset.mode,title:dialog.querySelector('.sc-detail-title').textContent,state:dialog.querySelector('.sc-detail-state strong').textContent,age:dialog.querySelector('.sc-detail-state span').textContent,checked:dialog.querySelector('.sc-detail-checked').textContent,selected:dialog.querySelector('.sc-video-thumb[aria-pressed="true"]').dataset.videoIndex,image:dialog.querySelector('.sc-detail-preview-card .sc-photo').getAttribute('src'),caption:dialog.querySelector('.sc-detail-preview-caption p').textContent,rating:dialog.querySelector('.sc-detail-preview-score').textContent};
    dialog.close();
    const highlightCoverage=[];
    for(const scene of ['birds','pets','wildlife']){
      const card=doc.querySelector('.sc-grid>.sc-card[data-scene="'+scene+'"]');
      const current=card.querySelector('.sc-highlight-now');
      const hero=card.querySelector('.sc-photo').getAttribute('src');
      const currentSrc=current.querySelector('img').getAttribute('src');
      const currentBounds=current.getBoundingClientRect();
      const cardBounds=card.getBoundingClientRect();
      const layout={oneHero:card.querySelectorAll('.sc-scene .sc-photo').length===1,noHistoryTiles:!card.querySelector('.sc-highlight-history'),nowTopRight:currentBounds.top<cardBounds.top+cardBounds.height/2&&currentBounds.right<=cardBounds.right,noBottomLabel:!card.querySelector('.sc-highlight-latest')};
      card.querySelector('.sc-scene').click();
      const highlightDetail={mode:dialog.dataset.mode,state:dialog.querySelector('.sc-detail-state strong').textContent,videoItems:dialog.querySelectorAll('.sc-video-item').length,moreHidden:dialog.querySelector('.sc-video-more').hidden,heroImage:dialog.querySelector('.sc-detail-preview-card .sc-photo').getAttribute('src'),memoryItems:dialog.querySelectorAll('.sc-evidence-memory li').length};
      dialog.querySelector('.sc-video-thumb[data-video-index="1"]').click();
      const olderObservation={selected:dialog.querySelector('.sc-video-thumb[aria-pressed="true"]').dataset.videoIndex,image:dialog.querySelector('.sc-detail-preview-card .sc-photo').getAttribute('src')};
      dialog.close();
      current.click();
      const currentDetail={mode:dialog.dataset.mode,image:dialog.querySelector('.sc-detail-preview-card .sc-photo').getAttribute('src'),state:dialog.querySelector('.sc-detail-state strong').textContent};
      dialog.close();
      highlightCoverage.push({scene,cardMode:card.dataset.cardMode,hero,currentSrc,currentLabel:current.querySelector('.sc-highlight-now-state').textContent,title:card.querySelector('.sc-state').textContent,age:card.querySelector('.sc-sub').textContent,layout,highlightDetail,olderObservation,currentDetail});
    }
    firstCard.querySelector('.sc-evidence-refresh').click();
    const refreshed={time:firstCard.querySelector('.sc-evidence-time').textContent,dialogOpen:dialog.open};
    doc.querySelector('[data-sc-state="alert"]').click();
    const alertStates=[...doc.querySelectorAll('.sc-grid .sc-state')].map(node=>node.textContent);
    const alertBlocksClear=[...doc.querySelectorAll('.sc-grid>.sc-card .sc-card-top')].every(block=>getComputedStyle(block).backgroundImage==='none'&&getComputedStyle(block).backgroundColor==='rgba(0, 0, 0, 0)');
    const alertBlockAligned=[...doc.querySelectorAll('.sc-grid>.sc-card')].every(card=>{
      const title=card.querySelector(':scope>.sc-label').getBoundingClientRect();
      const state=card.querySelector('.sc-card-top').getBoundingClientRect();
      return Math.abs(title.left-state.left)<=1&&state.top-title.bottom>=4&&state.top-title.bottom<=10;
    });
    const alertOrder=[...doc.querySelectorAll('.sc-grid>.sc-card')].map(card=>card.dataset.scene);
    storyButtons[2].click();
    const alertStoryTreatment={mode:dialog.dataset.mode,stateBackgroundClear:getComputedStyle(dialog.querySelector('.sc-detail-state')).backgroundImage==='none'&&getComputedStyle(dialog.querySelector('.sc-detail-state')).backgroundColor==='rgba(0, 0, 0, 0)'};
    dialog.close();
    const cardSource=firstCard.querySelector('.sc-photo').getAttribute('src');
    firstCard.querySelector('.sc-scene').click();
    const videoStrip=dialog.querySelector('.sc-video-strip');
    const firstThumb=videoStrip.querySelector('.sc-video-thumb').getBoundingClientRect();
    const firstScore=videoStrip.querySelector('.sc-video-score').getBoundingClientRect();
    const sheet={
      open:dialog.open,
      modal:dialog.matches(':modal'),
      title:dialog.querySelector('.sc-detail-title').textContent,
      state:dialog.querySelector('.sc-detail-state strong').textContent,
      image:dialog.querySelector('.sc-detail-preview-card .sc-photo').getAttribute('src'),
      sameImage:dialog.querySelector('.sc-detail-preview-card .sc-photo').getAttribute('src')===cardSource,
      largerPreview:dialog.querySelector('.sc-detail-preview-card').getBoundingClientRect().width>=firstCard.getBoundingClientRect().width,
      cameraItems:dialog.querySelectorAll('.sc-evidence-camera-item').length,
      videoItems:dialog.querySelectorAll('.sc-evidence-video li').length,
      videoTitle:dialog.querySelector('.sc-detail-sections .sc-evidence-section-header > span:nth-child(2)').textContent.trim(),
      videoScrolls:videoStrip.scrollWidth>videoStrip.clientWidth,
      ratings:[...videoStrip.querySelectorAll('.sc-video-score')].map(node=>node.textContent),
      highlighted:videoStrip.querySelectorAll('.sc-video-item.is-featured').length,
      scoreTopRight:firstScore.right<=firstThumb.right&&firstScore.top>=firstThumb.top&&firstScore.left>firstThumb.left+firstThumb.width/2,
      previewRatingHidden:getComputedStyle(dialog.querySelector('.sc-detail-preview-score')).display==='none',
      compactThumb:firstThumb.width<=100&&firstThumb.height<=70,
      imageOnly:[...videoStrip.querySelectorAll('.sc-video-copy')].every(node=>getComputedStyle(node).display==='none'),
      thumbsMatchImage:[...videoStrip.querySelectorAll('img')].every(image=>image.getAttribute('src')===cardSource),
      memoryItems:dialog.querySelectorAll('.sc-evidence-memory li').length,
      checked:dialog.querySelector('.sc-detail-checked').textContent,
      evidenceRightOfState:(()=>{const state=dialog.querySelector('.sc-detail-state').getBoundingClientRect();const evidence=dialog.querySelector('.sc-detail-evidence-head').getBoundingClientRect();return evidence.left>=state.right-1&&evidence.top<state.bottom})(),
      cardHeightUnchanged:Math.round(firstCard.getBoundingClientRect().height)===Math.round(initialCardBounds.height),
      cardTopUnchanged:Math.round(firstCard.getBoundingClientRect().top)===Math.round(initialCardBounds.top),
      scrollUnchanged:Math.round(win.scrollY)===Math.round(initialScrollY),
      bodyLocked:doc.body.classList.contains('sc-detail-open'),
      detectionBox:!!dialog.querySelector('.sc-detection-box'),
      stateBackgroundClear:getComputedStyle(dialog.querySelector('.sc-detail-state')).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(firstCard.querySelector('.sc-card-top')).backgroundColor==='rgba(0, 0, 0, 0)',
      durationColorMatchesCard:getComputedStyle(dialog.querySelector('.sc-detail-state span')).color===getComputedStyle(firstCard.querySelector('.sc-sub')).color,
    };
    videoStrip.querySelectorAll('.sc-video-thumb')[1].click();
    const selectedVideo={
      caption:dialog.querySelector('.sc-detail-preview-caption').textContent.includes('12 secs ago')&&videoStrip.querySelectorAll('.sc-video-thumb')[1].getAttribute('aria-label').endsWith(dialog.querySelector('.sc-detail-preview-caption p').textContent),
      visible:!dialog.querySelector('.sc-detail-preview-caption').hidden,
      selected:videoStrip.querySelectorAll('.sc-video-thumb[aria-pressed="true"]').length===1&&videoStrip.querySelectorAll('.sc-video-thumb')[1].getAttribute('aria-pressed')==='true',
      highlightedOutline:(()=>{const style=getComputedStyle(videoStrip.querySelector('.sc-video-thumb[aria-pressed="true"]'));return style.borderColor==='rgb(255, 255, 255)'&&style.boxShadow!=='none'})(),
      previewRating:(()=>{const score=dialog.querySelector('.sc-detail-preview-score');const preview=dialog.querySelector('.sc-detail-preview-card').getBoundingClientRect();const bounds=score.getBoundingClientRect();return {text:score.textContent,visible:getComputedStyle(score).display!=='none',topRight:bounds.top>=preview.top&&bounds.right<=preview.right&&bounds.left>preview.left+preview.width/2,featured:score.classList.contains('is-featured'),label:score.getAttribute('aria-label')}})(),
      fiveRatingYellow:getComputedStyle(dialog.querySelector('.sc-detail-preview-score')).backgroundColor==='rgb(246, 196, 83)'&&getComputedStyle(videoStrip.querySelector('.sc-video-thumb[aria-pressed="true"] .sc-video-score')).backgroundColor==='rgb(246, 196, 83)',
      feedback:dialog.querySelectorAll('.sc-detail-preview-feedback button').length===2,
      previewFilled:getComputedStyle(dialog.querySelector('.sc-detail-preview-card .sc-photo')).objectFit==='cover',
      atTop:dialog.scrollTop===0,
    };
    videoStrip.querySelectorAll('.sc-video-thumb')[8].click();
    const lastVideo={
      selected:videoStrip.querySelectorAll('.sc-video-thumb')[8].getAttribute('aria-pressed')==='true',
      caption:videoStrip.querySelectorAll('.sc-video-thumb')[8].getAttribute('aria-label').endsWith(dialog.querySelector('.sc-detail-preview-caption p').textContent),
      time:dialog.querySelector('.sc-detail-preview-caption time').textContent,
      previewRating:dialog.querySelector('.sc-detail-preview-score').textContent,
      ratingNotFeatured:!dialog.querySelector('.sc-detail-preview-score').classList.contains('is-featured'),
    };
    const more=dialog.querySelector('.sc-video-more');
    const timeSort=dialog.querySelector('[data-video-sort="newest"]');
    const ratingSort=dialog.querySelector('[data-video-sort="rating-high"]');
    more.click();
    const expanded={
      items:videoStrip.querySelectorAll('.sc-video-item').length,
      vertical:getComputedStyle(videoStrip).display==='grid',
      sortVisible:!dialog.querySelector('.sc-video-sort').hidden,
      sortLeftOfMore:ratingSort.getBoundingClientRect().right<=more.getBoundingClientRect().left,
      timeActive:timeSort.getAttribute('aria-pressed')==='true',
      expanded:more.getAttribute('aria-expanded'),
      firstIndex:videoStrip.querySelector('.sc-video-thumb').dataset.videoIndex,
      selectedStillVisible:videoStrip.querySelector('.sc-video-thumb[data-video-index="8"]').getAttribute('aria-pressed')==='true',
    };
    const expandedHighlight=videoStrip.querySelector('.sc-video-thumb[data-video-index="1"]');
    expandedHighlight.click();
    const expandedHighlightStyle=getComputedStyle(expandedHighlight.querySelector('img'));
    const expandedHighlightOutline=expandedHighlightStyle.borderColor==='rgb(255, 255, 255)'&&expandedHighlightStyle.outlineStyle==='solid'&&expandedHighlightStyle.outlineWidth==='2px';
    ratingSort.click();
    const ratingOrder=[...videoStrip.querySelectorAll('.sc-video-thumb')].slice(0,6).map(button=>button.dataset.videoIndex);
    const ratingActive=ratingSort.getAttribute('aria-pressed')==='true'&&timeSort.getAttribute('aria-pressed')==='false';
    timeSort.click();
    const timeOrder=[...videoStrip.querySelectorAll('.sc-video-thumb')].slice(0,6).map(button=>button.dataset.videoIndex);
    const timeActive=timeSort.getAttribute('aria-pressed')==='true'&&ratingSort.getAttribute('aria-pressed')==='false';
    more.click();
    const collapsed={items:videoStrip.querySelectorAll('.sc-video-item').length,horizontal:getComputedStyle(videoStrip).display==='flex',sortHidden:dialog.querySelector('.sc-video-sort').hidden,expanded:more.getAttribute('aria-expanded')};
    videoStrip.scrollLeft=200;
    dialog.querySelector('.sc-detail-close').click();
    const closed={open:dialog.open,bodyLocked:doc.body.classList.contains('sc-detail-open')};
    firstCard.querySelector('.sc-evidence-trigger').click();
    const previewOpens=dialog.open;
    dialog.close();
    const secondCard=doc.querySelectorAll('.sc-grid>.sc-card')[1];
    secondCard.click();
    const cardBodyOpens=dialog.open&&dialog.querySelector('.sc-detail-title').textContent==='Garage monitor';
    const newCardScrollLeft=dialog.querySelector('.sc-video-strip').scrollLeft;
    dialog.close();
    doc.querySelector('[data-sc-state="normal"]').click();
    firstCard.click();
    const normalTreatment={
      stateBackgroundClear:getComputedStyle(dialog.querySelector('.sc-detail-state')).backgroundImage==='none'&&getComputedStyle(firstCard.querySelector('.sc-card-top')).backgroundImage==='none',
      durationBackgroundMatchesCard:getComputedStyle(dialog.querySelector('.sc-detail-state span')).backgroundColor===getComputedStyle(firstCard.querySelector('.sc-sub')).backgroundColor,
    };
    dialog.querySelector('.sc-detail-close').click();
    doc.querySelector('[data-sc-theme="dark"]').click();
    const dark={
      section:doc.querySelector('#smartCards').classList.contains('dark'),
      lightPage:doc.body.classList.contains('sc-light-page'),
      storiesOneSurface:getComputedStyle(storyList).backgroundColor==='rgb(28, 42, 60)'&&getComputedStyle(firstStory).backgroundColor==='rgba(0, 0, 0, 0)',
    };
    const evidenceCoverage=[];
    for(const mode of ['normal','alert']){
      doc.querySelector('[data-sc-state="'+mode+'"]').click();
      for(const card of doc.querySelectorAll('.sc-grid>.sc-card[data-scene]')){
        card.querySelector('.sc-evidence-trigger').click();
        const compactItems=dialog.querySelectorAll('.sc-video-item').length;
        dialog.querySelector('.sc-video-more').click();
        evidenceCoverage.push({mode,scene:card.dataset.scene,state:dialog.querySelector('.sc-detail-state strong').textContent,duration:dialog.querySelector('.sc-detail-state span').textContent,image:dialog.querySelector('.sc-detail-preview-card .sc-photo').getAttribute('src'),focusBox:!!dialog.querySelector('.sc-detection-box'),cameraItems:dialog.querySelectorAll('.sc-evidence-camera-item').length,memoryItems:dialog.querySelectorAll('.sc-evidence-memory li').length,compactItems,fullItems:dialog.querySelectorAll('.sc-video-item').length,featured:dialog.querySelectorAll('.sc-video-item.is-featured').length});
        dialog.close();
      }
    }
    doc.querySelector('[data-sc-state="normal"]').click();
    const storyBeforeFlip={heading:doc.querySelector('#sc-stories-heading').textContent,count:doc.querySelectorAll('.sc-story-list .sc-story').length,html:storyList.innerHTML};
    doc.querySelector('[data-sc-view="flip"]').click();
    const flipStart={active:doc.querySelector('[data-sc-view="flip"]').getAttribute('aria-pressed')==='true',listInactive:doc.querySelector('[data-sc-view="list"]').getAttribute('aria-pressed')==='false',current:doc.querySelector('.sc-grid>.sc-card.is-current')?.dataset.scene,currentCount:doc.querySelectorAll('.sc-grid>.sc-card.is-current').length,inertCount:doc.querySelectorAll('.sc-grid>.sc-card[inert]').length,noNavigation:!doc.querySelector('.sc-flip-nav'),portrait:(()=>{const card=doc.querySelector('.sc-grid>.sc-card.is-current');return card.offsetHeight>card.offsetWidth})(),transitionActive:win.matchMedia('(prefers-reduced-motion: reduce)').matches||doc.querySelector('.sc-grid>.sc-card.is-current').getAnimations().length>0,announced:doc.querySelector('.sc-flip-status').textContent.includes('Home security')};
    const flipGrid=doc.querySelector('.sc-grid');
    const currentCard=flipGrid.querySelector('.sc-card.is-current');
    currentCard.dispatchEvent(new win.PointerEvent('pointerdown',{bubbles:true,pointerId:17,button:0,clientX:300,clientY:200}));
    flipGrid.dispatchEvent(new win.PointerEvent('pointermove',{bubbles:true,pointerId:17,button:0,clientX:320,clientY:340}));
    const dragged=flipGrid.classList.contains('is-dragging')&&currentCard.style.transform.includes('translate(20px, 140px)');
    flipGrid.dispatchEvent(new win.PointerEvent('pointerup',{bubbles:true,pointerId:17,button:0,clientX:320,clientY:340}));
    currentCard.click();
    const flipNext={current:doc.querySelector('.sc-grid>.sc-card.is-current')?.dataset.scene,dragged,exitFollowsDrag:Number.parseFloat(currentCard.style.getPropertyValue('--sc-exit-y'))>140,clickSuppressed:!dialog.open,announced:doc.querySelector('.sc-flip-status').textContent.includes('Garage monitor')};
    doc.querySelector('[data-sc-view="list"]').click();
    doc.querySelector('[data-sc-view="flip"]').click();
    const rightCard=flipGrid.querySelector('.sc-card.is-current');
    rightCard.dispatchEvent(new win.PointerEvent('pointerdown',{bubbles:true,pointerId:18,button:0,clientX:100,clientY:220}));
    flipGrid.dispatchEvent(new win.PointerEvent('pointermove',{bubbles:true,pointerId:18,button:0,clientX:260,clientY:220}));
    const rightDragged=rightCard.style.transform.includes('translate(160px, 0px)');
    flipGrid.dispatchEvent(new win.PointerEvent('pointerup',{bubbles:true,pointerId:18,button:0,clientX:260,clientY:220}));
    const flipRight={current:flipGrid.querySelector('.sc-card.is-current')?.dataset.scene,dragged:rightDragged};
    doc.querySelector('[data-sc-view="list"]').click();
    const listRestored={active:doc.querySelector('[data-sc-view="list"]').getAttribute('aria-pressed')==='true',inertCount:doc.querySelectorAll('.sc-grid>.sc-card[inert]').length,allVisible:[...doc.querySelectorAll('.sc-grid>.sc-card')].every(card=>getComputedStyle(card).visibility==='visible'),landscapeCards:[...doc.querySelectorAll('.sc-grid>.sc-card')].every(card=>Math.abs(card.offsetWidth/card.offsetHeight-40/27)<.02),transitionActive:win.matchMedia('(prefers-reduced-motion: reduce)').matches||doc.querySelector('.sc-grid>.sc-card[data-scene="garage"]').getAnimations().length>0,noDragging:!flipGrid.classList.contains('is-dragging')};
    const storyAfterFlip={heading:doc.querySelector('#sc-stories-heading').textContent,count:doc.querySelectorAll('.sc-story-list .sc-story').length,html:storyList.innerHTML};
    frame.style.width='320px';
    const narrowControlsAligned=controlsAligned();
    finish({initial,storySummary,storyRatingColors,storyTimeline,storyDetail,alertStoryTreatment,highlightCoverage,refreshed,alertStates,alertBlocksClear,alertBlockAligned,alertOrder,sheet,selectedVideo,lastVideo,expanded,expandedHighlightOutline,ratingOrder,ratingActive,timeOrder,timeActive,collapsed,closed,previewOpens,cardBodyOpens,newCardScrollLeft,normalTreatment,dark,evidenceCoverage,flipStart,flipNext,flipRight,listRestored,narrowControlsAligned,storiesUnchanged:JSON.stringify(storyBeforeFlip)===JSON.stringify(storyAfterFlip)});
  }catch(error){
    if(attempts<20)setTimeout(inspect,150);
    else finish({error:String(error)});
  }
};
setTimeout(inspect,150);
</script></body></html>`;

function contentType(pathname) {
  return ({'.html':'text/html; charset=utf-8','.webp':'image/webp','.png':'image/png','.md':'text/markdown; charset=utf-8'})[extname(pathname)] || 'application/octet-stream';
}

function runChrome(url, userDataDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(chromePath, [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${userDataDir}`,
      '--virtual-time-budget=5000',
      '--dump-dom',
      url,
    ]);
    let stdout='';
    let stderr='';
    let settled=false;
    let captured=false;
    let killTimer;
    const timer=setTimeout(()=>{
      if(settled)return;
      settled=true;
      child.kill('SIGTERM');
      reject(new Error(`Chrome DOM capture timed out: ${stderr.slice(-800)}`));
    },12000);
    child.stdout.on('data',chunk=>{
      stdout+=chunk;
      if(!captured&&stdout.includes('<title>RESULT:')&&stdout.includes('</html>')){
        captured=true;
        clearTimeout(timer);
        child.kill('SIGTERM');
        killTimer=setTimeout(()=>child.kill('SIGKILL'),1000);
      }
    });
    child.stderr.on('data',chunk=>{stderr+=chunk});
    child.on('error',error=>{if(!settled){settled=true;clearTimeout(timer);reject(error)}});
    child.on('close',code=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      clearTimeout(killTimer);
      captured||code===0?resolve(stdout):reject(new Error(`Chrome exited ${code}: ${stderr.slice(-800)}`));
    });
  });
}

test('standalone Pages route works as a mobile Smart Cards app', {timeout:20000}, async t => {
  if(!chromePath){t.skip('Chrome not installed');return}
  const server=createServer((request,response)=>{
    if(request.url==='/__test__/harness.html'){
      response.writeHead(200,{'content-type':'text/html; charset=utf-8'});
      response.end(harness);
      return;
    }
    const requestPath=new URL(request.url,'http://localhost').pathname;
    const relative=requestPath==='/'?'index.html':requestPath.slice(1);
    const filePath=normalize(join(projectRoot,relative));
    if(!filePath.startsWith(projectRoot)||!existsSync(filePath)){
      response.writeHead(404);response.end('Not found');return;
    }
    response.writeHead(200,{'content-type':contentType(filePath)});
    response.end(readFileSync(filePath));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const userDataDir=mkdtempSync(join(tmpdir(),'wyze-smart-cards-'));
  try{
    const {port}=server.address();
    const dom=await runChrome(`http://127.0.0.1:${port}/__test__/harness.html`,userDataDir);
    const encoded=dom.match(/<title>RESULT:([^<]+)<\/title>/)?.[1];
    assert.ok(encoded,'browser harness did not return results');
    const result=JSON.parse(Buffer.from(encoded,'base64').toString('utf8'));
    assert.equal(result.error,undefined);
    assert.deepEqual(result.initial,{path:'/index.html',search:'?view=smart-cards',title:'WYZE Smart Cards',standalone:true,light:true,cards:8,hiddenChrome:true,brokenImages:[],cardWidth:366,sceneHeight:247,landscapeCards:true,normalOrder:['security','garage','front','ev','bins','pets','wildlife','birds'],controlsOneLineCentered:true,cardHeading:{text:'Smart cards',aboveCards:true,sameStyle:true},refreshButtons:8,checkedTimeInsideTrigger:false,goalFeedbackButtons:16,bottomEvidenceHidden:true,stateBlocksClear:true,imageGradient:true,goalTitleInside:true,stateBlockAligned:true,feedbackBottomRight:true,feedbackBackgroundless:true,normalActive:true});
    assert.deepEqual(result.storySummary,{belowCards:true,heading:'6 key moments in last 12 hours',count:6,titles:['Cardinal at the feeder','Playtime on the rug','Blue jay visit','Water break','Raccoon in the yard','Goldfinch visit'],ratings:['5','5','4','4','5','4'],images:true});
    assert.deepEqual(result.storyRatingColors,{five:'rgb(246, 196, 83)',four:'rgb(113, 237, 190)'});
    assert.deepEqual(result.storyTimeline,{oneSurface:true,line:true,dots:true,timestamps:true,timeAboveTitle:true,cameraRatio:true,twoLineTitle:true,noDividers:true,compactRows:true,feedbackButtons:12,feedbackSelected:true,feedbackKeepsDetailClosed:true});
    assert.deepEqual(result.storyDetail,{mode:'highlights',title:'Bird watcher',state:'BLUE JAY',age:'2 hours ago',checked:'2 hours ago',selected:'1',image:'assets/smart-bird-bluejay.webp?v=1',caption:'A blue jay stopped at the feeder earlier today.',rating:'4'});
    assert.deepEqual(result.alertStoryTreatment,{mode:'highlights',stateBackgroundClear:true});
    assert.deepEqual(result.highlightCoverage,[
      {scene:'birds',cardMode:'highlights',hero:'assets/smart-bird-cardinal.webp?v=1',currentSrc:'assets/smart-bird-feeder-clear.webp?v=1',currentLabel:'NO BIRDS',title:'CARDINAL',age:'7 mins ago',layout:{oneHero:true,noHistoryTiles:true,nowTopRight:true,noBottomLabel:true},highlightDetail:{mode:'highlights',state:'CARDINAL',videoItems:3,moreHidden:true,heroImage:'assets/smart-bird-cardinal.webp?v=1',memoryItems:2},olderObservation:{selected:'1',image:'assets/smart-bird-bluejay.webp?v=1'},currentDetail:{mode:'normal',image:'assets/smart-bird-feeder-clear.webp?v=1',state:'NO BIRDS'}},
      {scene:'pets',cardMode:'highlights',hero:'assets/smart-pet-playing.webp?v=1',currentSrc:'assets/smart-pet-resting.webp?v=1',currentLabel:'RESTING',title:'DOG PLAYING',age:'46 mins ago',layout:{oneHero:true,noHistoryTiles:true,nowTopRight:true,noBottomLabel:true},highlightDetail:{mode:'highlights',state:'DOG PLAYING',videoItems:3,moreHidden:true,heroImage:'assets/smart-pet-playing.webp?v=1',memoryItems:2},olderObservation:{selected:'1',image:'assets/smart-pet-drinking.webp?v=1'},currentDetail:{mode:'normal',image:'assets/smart-pet-resting.webp?v=1',state:'RESTING'}},
      {scene:'wildlife',cardMode:'highlights',hero:'assets/smart-wildlife-raccoon.webp?v=1',currentSrc:'assets/smart-wildlife-clear.webp?v=1',currentLabel:'NO WILDLIFE',title:'RACCOON',age:'3 hours ago',layout:{oneHero:true,noHistoryTiles:true,nowTopRight:true,noBottomLabel:true},highlightDetail:{mode:'highlights',state:'RACCOON',videoItems:3,moreHidden:true,heroImage:'assets/smart-wildlife-raccoon.webp?v=1',memoryItems:2},olderObservation:{selected:'1',image:'assets/smart-wildlife-deer.webp?v=1'},currentDetail:{mode:'normal',image:'assets/smart-wildlife-clear.webp?v=1',state:'NO WILDLIFE'}},
    ]);
    assert.deepEqual(result.refreshed,{time:'just now',dialogOpen:false});
    assert.deepEqual(result.alertStates,['PERSON','OPEN','AT DOOR','Package left','RACCOON','NEEDS CHARGING','NOT OUT','CARDINAL']);
    assert.equal(result.alertBlocksClear,true);
    assert.equal(result.alertBlockAligned,true);
    assert.deepEqual(result.alertOrder,['security','garage','pets','front','wildlife','ev','bins','birds']);
    assert.deepEqual(result.sheet,{open:true,modal:true,title:'Home security',state:'PERSON',image:'assets/smart-security-motion.webp?v=1',sameImage:true,largerPreview:true,cameraItems:4,videoItems:9,videoTitle:'Video Evidences',videoScrolls:true,ratings:['5','5','3','3','2','2','2','1','1'],highlighted:2,scoreTopRight:true,previewRatingHidden:true,compactThumb:true,imageOnly:true,thumbsMatchImage:true,memoryItems:2,checked:'6 secs ago',evidenceRightOfState:true,cardHeightUnchanged:true,cardTopUnchanged:true,scrollUnchanged:true,bodyLocked:true,detectionBox:true,stateBackgroundClear:true,durationColorMatchesCard:true});
    assert.deepEqual(result.selectedVideo,{caption:true,visible:true,selected:true,highlightedOutline:true,previewRating:{text:'5',visible:true,topRight:true,featured:true,label:'Evidence rating 5'},fiveRatingYellow:true,feedback:true,previewFilled:true,atTop:true});
    assert.deepEqual(result.lastVideo,{selected:true,caption:true,time:'54 secs ago',previewRating:'1',ratingNotFeatured:true});
    assert.deepEqual(result.expanded,{items:20,vertical:true,sortVisible:true,sortLeftOfMore:true,timeActive:true,expanded:'true',firstIndex:'0',selectedStillVisible:true});
    assert.equal(result.expandedHighlightOutline,true);
    assert.deepEqual(result.ratingOrder,['0','1','2','3','9','10']);
    assert.equal(result.ratingActive,true);
    assert.deepEqual(result.timeOrder,['0','1','2','3','4','5']);
    assert.equal(result.timeActive,true);
    assert.deepEqual(result.collapsed,{items:9,horizontal:true,sortHidden:true,expanded:'false'});
    assert.deepEqual(result.closed,{open:false,bodyLocked:false});
    assert.equal(result.previewOpens,true);
    assert.equal(result.cardBodyOpens,true);
    assert.equal(result.newCardScrollLeft,0);
    assert.deepEqual(result.normalTreatment,{stateBackgroundClear:true,durationBackgroundMatchesCard:true});
    assert.deepEqual(result.dark,{section:true,lightPage:false,storiesOneSurface:true});
    assert.equal(result.evidenceCoverage.length,16);
    assert.ok(result.evidenceCoverage.every(item=>{
      const isHighlightNormal=item.mode==='normal'&&['birds','pets','wildlife'].includes(item.scene);
      return item.compactItems===(isHighlightNormal?3:9)&&item.fullItems===(isHighlightNormal?3:20)&&item.featured>=2&&item.featured<=3&&item.focusBox&&item.cameraItems>=1&&item.memoryItems===2;
    }));
    assert.deepEqual(result.evidenceCoverage.filter(item=>['pets','wildlife'].includes(item.scene)).map(({mode,scene,state,duration,image})=>({mode,scene,state,duration,image})),[
      {mode:'normal',scene:'pets',state:'DOG PLAYING',duration:'46 mins ago',image:'assets/smart-pet-playing.webp?v=1'},
      {mode:'normal',scene:'wildlife',state:'RACCOON',duration:'3 hours ago',image:'assets/smart-wildlife-raccoon.webp?v=1'},
      {mode:'alert',scene:'pets',state:'AT DOOR',duration:'for 8 mins',image:'assets/smart-pet-at-door.webp?v=1'},
      {mode:'alert',scene:'wildlife',state:'RACCOON',duration:'for 4 mins',image:'assets/smart-wildlife-raccoon.webp?v=1'},
    ]);
    assert.deepEqual(result.flipStart,{active:true,listInactive:true,current:'security',currentCount:1,inertCount:7,noNavigation:true,portrait:true,transitionActive:true,announced:true});
    assert.deepEqual(result.flipNext,{current:'garage',dragged:true,exitFollowsDrag:true,clickSuppressed:true,announced:true});
    assert.deepEqual(result.flipRight,{current:'garage',dragged:true});
    assert.deepEqual(result.listRestored,{active:true,inertCount:0,allVisible:true,landscapeCards:true,transitionActive:true,noDragging:true});
    assert.equal(result.narrowControlsAligned,true);
    assert.equal(result.storiesUnchanged,true);
  }finally{
    await new Promise(resolve=>server.close(resolve));
    rmSync(userDataDir,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
});
