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
    if(!doc?.querySelector('.sc-card')||!win.location.search.includes('view=smart-cards'))throw new Error('waiting');
    const images=[...doc.images];
    const hiddenSelectors=['.wrap>header','.tabs','.wrap>footer'];
    const initialCardBounds=doc.querySelector('.sc-card').getBoundingClientRect();
    const initialSceneBounds=doc.querySelector('.sc-card .sc-scene').getBoundingClientRect();
    const initialStateBounds=doc.querySelector('.sc-card .sc-card-top').getBoundingClientRect();
    const initial={
      path:win.location.pathname,
      search:win.location.search,
      title:doc.title,
      standalone:doc.body.classList.contains('sc-standalone'),
      light:doc.body.classList.contains('sc-light-page'),
      cards:doc.querySelectorAll('.sc-card').length,
      hiddenChrome:hiddenSelectors.every(selector=>getComputedStyle(doc.querySelector(selector)).display==='none'),
      brokenImages:images.filter(image=>!image.complete||image.naturalWidth===0).map(image=>image.getAttribute('src')),
      cardWidth:Math.round(doc.querySelector('.sc-card').getBoundingClientRect().width),
      sceneHeight:Math.round(doc.querySelector('.sc-card .sc-scene').getBoundingClientRect().height),
      goalFeedbackButtons:doc.querySelectorAll('.sc-actions .sc-feedback button').length,
      goalFeedbackAligned:[...doc.querySelectorAll('.sc-card')].every(card=>{
        const feedback=card.querySelector('.sc-actions .sc-feedback').getBoundingClientRect();
        const bounds=card.getBoundingClientRect();
        return Math.abs(feedback.right-bounds.right)<=1&&feedback.top<bounds.top;
      }),
    };
    doc.querySelector('[data-sc-state="alert"]').click();
    const alertStates=[...doc.querySelectorAll('.sc-state')].map(node=>node.textContent);
    const evidenceButton=doc.querySelector('.sc-evidence-trigger');
    evidenceButton.click();
    doc.getAnimations().forEach(animation=>animation.finish());
    const expandedCard=evidenceButton.closest('.sc-card');
    const expandedCardBounds=expandedCard.getBoundingClientRect();
    const expandedSceneBounds=expandedCard.querySelector('.sc-scene').getBoundingClientRect();
    const expandedStateBounds=expandedCard.querySelector('.sc-card-top').getBoundingClientRect();
    const expandedEvidenceBounds=expandedCard.querySelector('.sc-evidence').getBoundingClientRect();
    const expanded={
      card:expandedCard.classList.contains('is-expanded'),
      aria:evidenceButton.getAttribute('aria-expanded'),
      details:getComputedStyle(expandedCard.querySelector('.sc-evidence-details')).display,
      icons:expandedCard.querySelectorAll('.sc-evidence-title-icon svg').length,
      feedbackButtons:expandedCard.querySelectorAll('.sc-evidence-item-feedback button').length,
      videoItems:expandedCard.querySelectorAll('.sc-evidence-video li').length,
      memoryItems:expandedCard.querySelectorAll('.sc-evidence-memory li').length,
      cardFeedback:getComputedStyle(expandedCard.querySelector('.sc-actions .sc-feedback')).display,
      cardFeedbackVisibility:getComputedStyle(expandedCard.querySelector('.sc-actions .sc-feedback')).visibility,
      heading:expandedCard.querySelector('.sc-evidence-heading').textContent,
      preview:getComputedStyle(expandedCard.querySelector('.sc-evidence-preview')).display,
      cardHeight:Math.round(expandedCard.getBoundingClientRect().height),
      sceneHeight:Math.round(expandedCard.querySelector('.sc-scene').getBoundingClientRect().height),
      stateOffset:Math.round(expandedCard.querySelector('.sc-card-top').getBoundingClientRect().top-expandedCard.getBoundingClientRect().top),
      stateLeftOffset:Math.round(expandedStateBounds.left-expandedCardBounds.left),
      stateShift:[Math.round((expandedStateBounds.left-expandedCardBounds.left)-(initialStateBounds.left-initialCardBounds.left)),Math.round((expandedStateBounds.top-expandedCardBounds.top)-(initialStateBounds.top-initialCardBounds.top))],
      sceneShift:[Math.round((expandedSceneBounds.left-expandedCardBounds.left)-(initialSceneBounds.left-initialCardBounds.left)),Math.round((expandedSceneBounds.top-expandedCardBounds.top)-(initialSceneBounds.top-initialCardBounds.top)),Math.round(expandedSceneBounds.width-initialSceneBounds.width),Math.round(expandedSceneBounds.height-initialSceneBounds.height)],
      evidenceOverlap:Math.round(expandedSceneBounds.bottom-expandedEvidenceBounds.top),
      evidenceOverlapRatio:Number(((expandedSceneBounds.bottom-expandedEvidenceBounds.top)/expandedSceneBounds.height).toFixed(2)),
      evidenceWidth:Math.round(expandedEvidenceBounds.width),
      cardWidth:Math.round(expandedCardBounds.width),
      goalVisibility:getComputedStyle(expandedCard.querySelector(':scope>.sc-label')).visibility,
      hasVideo:expandedCard.querySelector('.sc-evidence-video').textContent.length>20,
      hasMemory:expandedCard.querySelector('.sc-evidence-memory').textContent.length>20,
    };
    const videoDisclosure=expandedCard.querySelector('.sc-evidence-section-trigger');
    videoDisclosure.click();
    doc.getAnimations().forEach(animation=>animation.finish());
    expanded.videoDisclosure={
      aria:videoDisclosure.getAttribute('aria-expanded'),
      collapsed:videoDisclosure.closest('.sc-evidence-item').classList.contains('is-collapsed'),
      listHeight:Math.round(videoDisclosure.closest('.sc-evidence-item').querySelector('.sc-evidence-list-wrap').getBoundingClientRect().height),
      inert:videoDisclosure.closest('.sc-evidence-item').querySelector('.sc-evidence-list-wrap').hasAttribute('inert'),
      cardHeight:Math.round(expandedCard.getBoundingClientRect().height),
    };
    evidenceButton.click();
    const collapsed={
      card:doc.querySelector('.sc-card').classList.contains('is-expanded'),
      aria:evidenceButton.getAttribute('aria-expanded'),
    };
    doc.querySelector('[data-sc-theme="dark"]').click();
    const dark={
      section:doc.querySelector('#smartCards').classList.contains('dark'),
      lightPage:doc.body.classList.contains('sc-light-page'),
    };
    finish({initial,alertStates,expanded,collapsed,dark});
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
    assert.deepEqual(result.initial,{path:'/index.html',search:'?view=smart-cards',title:'WYZE Smart Cards',standalone:true,light:true,cards:5,hiddenChrome:true,brokenImages:[],cardWidth:366,sceneHeight:247,goalFeedbackButtons:10,goalFeedbackAligned:true});
    assert.deepEqual(result.alertStates,['PERSON','OPEN','Package left','NOT OUT','CARDINAL']);
    assert.deepEqual(result.expanded,{card:true,aria:'true',details:'grid',icons:2,feedbackButtons:10,videoItems:3,memoryItems:2,cardFeedback:'flex',cardFeedbackVisibility:'hidden',heading:'Supporting Evidence',preview:'none',cardHeight:518,sceneHeight:247,stateOffset:0,stateLeftOffset:0,stateShift:[0,0],sceneShift:[0,0,0,0],evidenceOverlap:82,evidenceOverlapRatio:.33,evidenceWidth:366,cardWidth:366,goalVisibility:'hidden',hasVideo:true,hasMemory:true,videoDisclosure:{aria:'false',collapsed:true,listHeight:0,inert:true,cardHeight:382}});
    assert.deepEqual(result.collapsed,{card:false,aria:'false'});
    assert.deepEqual(result.dark,{section:true,lightPage:false});
  }finally{
    await new Promise(resolve=>server.close(resolve));
    rmSync(userDataDir,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
});
