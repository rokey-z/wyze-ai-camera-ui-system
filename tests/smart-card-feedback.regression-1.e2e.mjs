// Regression: ISSUE-001 — detail evidence thumbs did not acknowledge a vote.
// Found by /qa on 2026-09-21
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-09-21.md
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const chromePath = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean).find(existsSync);

const harness = `<!doctype html><title>RUNNING</title><iframe id="app" src="/smart-cards.html"></iframe><script>
const finish=result=>document.title='RESULT:'+btoa(JSON.stringify(result));
let attempts=0;
const inspect=()=>{
  try{
    const doc=document.querySelector('#app').contentDocument;
    const card=doc.querySelector('.sc-grid>.sc-card[data-scene="security"]');
    if(!card?.dataset.cardMode)throw Error('waiting for smart cards');
    card.querySelector('.sc-scene').click();
    const dialog=doc.querySelector('.sc-detail-dialog');
    const recommendation=dialog.querySelector('.sc-recommendation-feedback .sc-evidence-item-feedback');
    recommendation.querySelector('button').click();
    const recommendationUp=[...recommendation.querySelectorAll('button')].map(button=>button.getAttribute('aria-pressed'));
    const memory=dialog.querySelector('.sc-evidence-memory li:first-child .sc-evidence-item-feedback');
    memory.querySelector('button').click();
    const memoryUp=[...memory.querySelectorAll('button')].map(button=>button.getAttribute('aria-pressed'));
    dialog.close();
    card.querySelector('.sc-scene').click();
    const recommendationRestored=[...dialog.querySelectorAll('.sc-recommendation-feedback .sc-evidence-item-feedback button')].map(button=>button.getAttribute('aria-pressed'));
    const memoryRestored=[...dialog.querySelectorAll('.sc-evidence-memory li:first-child .sc-evidence-item-feedback button')].map(button=>button.getAttribute('aria-pressed'));

    dialog.querySelector('.sc-video-thumb[data-video-index="0"]').click();
    dialog.querySelector('.sc-detail-preview-feedback button').click();
    const videoUp=[...dialog.querySelectorAll('.sc-detail-preview-feedback button')].map(button=>button.getAttribute('aria-pressed'));
    dialog.querySelector('.sc-video-thumb[data-video-index="1"]').click();
    dialog.querySelector('.sc-video-thumb[data-video-index="0"]').click();
    const videoRestored=[...dialog.querySelectorAll('.sc-detail-preview-feedback button')].map(button=>button.getAttribute('aria-pressed'));
    finish({recommendationUp,recommendationRestored,memoryUp,memoryRestored,videoUp,videoRestored});
  }catch(error){if(++attempts<20)setTimeout(inspect,150);else finish({error:String(error)})}
};
setTimeout(inspect,150);
</script>`;

function runChrome(url, userDataDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(chromePath, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      `--user-data-dir=${userDataDir}`, '--virtual-time-budget=5000', '--dump-dom', url,
    ]);
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      reject(new Error(`Chrome DOM capture timed out: ${stderr.slice(-800)}`));
    }, 12000);
    child.stdout.on('data', chunk => {
      stdout += chunk;
      if (stdout.includes('<title>RESULT:') && stdout.includes('</html>')) child.kill('SIGTERM');
    });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', code => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      code === 0 || stdout.includes('<title>RESULT:') ? resolve(stdout) : reject(new Error(stderr.slice(-800)));
    });
  });
}

test('detail recommendation and evidence feedback toggles and survives rerender', { timeout: 20000 }, async t => {
  if (!chromePath) { t.skip('Chrome not installed'); return; }
  const server = createServer((request, response) => {
    if (request.url === '/__test__/harness.html') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(harness);
      return;
    }
    const relative = new URL(request.url, 'http://localhost').pathname.slice(1);
    const filePath = normalize(join(projectRoot, relative));
    if (!filePath.startsWith(projectRoot) || !existsSync(filePath)) {
      response.writeHead(404); response.end('Not found'); return;
    }
    response.writeHead(200, { 'content-type': extname(filePath) === '.html' ? 'text/html; charset=utf-8' : 'image/webp' });
    response.end(readFileSync(filePath));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const userDataDir = mkdtempSync(join(tmpdir(), 'wyze-feedback-'));
  try {
    const dom = await runChrome(`http://127.0.0.1:${server.address().port}/__test__/harness.html`, userDataDir);
    const encoded = dom.match(/<title>RESULT:([^<]+)<\/title>/)?.[1];
    assert.ok(encoded, 'browser harness did not return results');
    const result = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    assert.equal(result.error, undefined);
    assert.deepEqual(result.recommendationUp, ['true', 'false']);
    assert.deepEqual(result.recommendationRestored, ['true', 'false']);
    assert.deepEqual(result.memoryUp, ['true', 'false']);
    assert.deepEqual(result.memoryRestored, ['true', 'false']);
    assert.deepEqual(result.videoUp, ['true', 'false']);
    assert.deepEqual(result.videoRestored, ['true', 'false']);
  } finally {
    await new Promise(resolve => server.close(resolve));
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
