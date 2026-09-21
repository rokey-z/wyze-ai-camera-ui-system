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
    const initial={
      path:win.location.pathname,
      search:win.location.search,
      title:doc.title,
      standalone:doc.body.classList.contains('sc-standalone'),
      light:doc.body.classList.contains('sc-light-page'),
      cards:doc.querySelectorAll('.sc-grid>.sc-card').length,
      hiddenChrome:hiddenSelectors.every(selector=>getComputedStyle(doc.querySelector(selector)).display==='none'),
      brokenImages:images.filter(image=>!image.complete||image.naturalWidth===0).map(image=>image.getAttribute('src')),
      cardWidth:Math.round(doc.querySelector('.sc-grid>.sc-card').getBoundingClientRect().width),
      sceneHeight:Math.round(doc.querySelector('.sc-grid>.sc-card .sc-scene').getBoundingClientRect().height),
      refreshButtons:doc.querySelectorAll('.sc-evidence-refresh').length,
      checkedTimeInsideTrigger:!!doc.querySelector('.sc-evidence-trigger .sc-evidence-time'),
      goalFeedbackButtons:doc.querySelectorAll('.sc-actions .sc-feedback button').length,
      goalFeedbackAligned:[...doc.querySelectorAll('.sc-grid>.sc-card')].every(card=>{
        const feedback=card.querySelector('.sc-actions .sc-feedback').getBoundingClientRect();
        const bounds=card.getBoundingClientRect();
        return Math.abs(feedback.right-bounds.right)<=1&&feedback.top<bounds.top;
      }),
    };
    const firstCard=doc.querySelector('.sc-grid>.sc-card');
    const dialog=doc.querySelector('.sc-detail-dialog');
    firstCard.querySelector('.sc-evidence-refresh').click();
    const refreshed={time:firstCard.querySelector('.sc-evidence-time').textContent,dialogOpen:dialog.open};
    doc.querySelector('[data-sc-state="alert"]').click();
    const alertStates=[...doc.querySelectorAll('.sc-grid .sc-state')].map(node=>node.textContent);
    const cardSource=firstCard.querySelector('.sc-photo').getAttribute('src');
    firstCard.querySelector('.sc-scene').click();
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
      memoryItems:dialog.querySelectorAll('.sc-evidence-memory li').length,
      checked:dialog.querySelector('.sc-detail-checked').textContent,
      cardHeightUnchanged:Math.round(firstCard.getBoundingClientRect().height)===Math.round(initialCardBounds.height),
      cardTopUnchanged:Math.round(firstCard.getBoundingClientRect().top)===Math.round(initialCardBounds.top),
      scrollUnchanged:Math.round(win.scrollY)===Math.round(initialScrollY),
      bodyLocked:doc.body.classList.contains('sc-detail-open'),
      detectionBox:!!dialog.querySelector('.sc-detection-box'),
    };
    dialog.querySelector('.sc-detail-close').click();
    const closed={open:dialog.open,bodyLocked:doc.body.classList.contains('sc-detail-open')};
    firstCard.querySelector('.sc-evidence-trigger').click();
    const previewOpens=dialog.open;
    dialog.close();
    const secondCard=doc.querySelectorAll('.sc-grid>.sc-card')[1];
    secondCard.click();
    const cardBodyOpens=dialog.open&&dialog.querySelector('.sc-detail-title').textContent==='Garage monitor';
    dialog.close();
    doc.querySelector('[data-sc-theme="dark"]').click();
    const dark={
      section:doc.querySelector('#smartCards').classList.contains('dark'),
      lightPage:doc.body.classList.contains('sc-light-page'),
    };
    finish({initial,refreshed,alertStates,sheet,closed,previewOpens,cardBodyOpens,dark});
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
    assert.deepEqual(result.initial,{path:'/index.html',search:'?view=smart-cards',title:'WYZE Smart Cards',standalone:true,light:true,cards:6,hiddenChrome:true,brokenImages:[],cardWidth:366,sceneHeight:247,refreshButtons:6,checkedTimeInsideTrigger:false,goalFeedbackButtons:12,goalFeedbackAligned:true});
    assert.deepEqual(result.refreshed,{time:'just now',dialogOpen:false});
    assert.deepEqual(result.alertStates,['PERSON','OPEN','NEEDS CHARGING','Package left','NOT OUT','CARDINAL']);
    assert.deepEqual(result.sheet,{open:true,modal:true,title:'Home security',state:'PERSON',image:'assets/smart-security-motion.webp?v=1',sameImage:true,largerPreview:true,cameraItems:4,videoItems:3,memoryItems:2,checked:'6 secs ago',cardHeightUnchanged:true,cardTopUnchanged:true,scrollUnchanged:true,bodyLocked:true,detectionBox:true});
    assert.deepEqual(result.closed,{open:false,bodyLocked:false});
    assert.equal(result.previewOpens,true);
    assert.equal(result.cardBodyOpens,true);
    assert.deepEqual(result.dark,{section:true,lightPage:false});
  }finally{
    await new Promise(resolve=>server.close(resolve));
    rmSync(userDataDir,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
});
