// Camera health card: state-driven issues, fix actions, and the run-check flow.
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

const harness = `<!doctype html><title>RUNNING</title><iframe id="app" src="/smart-cards.html" style="width:390px;height:844px;border:0"></iframe><script>
const finish=result=>{const bytes=new TextEncoder().encode(JSON.stringify(result));document.title='RESULT:'+btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join(''))};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let attempts=0;
const snapshot=card=>({
  health:card.dataset.health,
  title:card.querySelector('.sc-health-title').textContent,
  checked:card.querySelector('.sc-health-checked').textContent,
  strip:[...card.querySelectorAll('.sc-health-strip>i')].map(segment=>segment.dataset.level),
  stats:[...card.querySelectorAll('.sc-health-stats dd')].map(value=>value.textContent),
  issues:[...card.querySelectorAll('.sc-health-issue')].map(issue=>issue.dataset.camera)
});
const inspect=async()=>{
  try{
    const doc=document.querySelector('#app').contentDocument;
    const card=doc?.querySelector('.sc-health-card');
    if(!card?.querySelector('.sc-health-strip>i')||!doc.querySelector('.sc-grid>.sc-card[data-card-mode]'))throw Error('waiting for camera health');
    const result={mixed:snapshot(card),placedBeforeStories:!!doc.querySelector('.sc-card-feed+.sc-health+.sc-stories')};
    doc.querySelector('[data-sc-state="normal"]').click();
    result.normal=snapshot(card);
    doc.querySelector('[data-sc-state="alert"]').click();
    result.alert=snapshot(card);
    const more=card.querySelector('.sc-health-more');
    more.click();
    result.expanded={aria:more.getAttribute('aria-expanded'),hidden:card.querySelector('.sc-health-list').hidden,rows:card.querySelectorAll('.sc-health-row').length,offline:card.querySelector('.sc-health-row[data-level="down"] .sc-health-name strong')?.textContent};
    card.querySelector('.sc-health-issue[data-camera="Backyard Feeder Cam"] .sc-health-fix').click();
    result.reminder={done:card.querySelector('.sc-health-issue[data-camera="Backyard Feeder Cam"] .sc-health-fix.is-done')?.textContent,stillListed:!!card.querySelector('.sc-health-issue[data-camera="Backyard Feeder Cam"]')};
    card.querySelector('.sc-health-issue[data-camera="Side Gate Cam"] .sc-health-fix').click();
    const busy=card.querySelector('.sc-health-issue[data-camera="Side Gate Cam"] .sc-health-fix');
    result.busy={disabled:busy.disabled,text:busy.textContent};
    await wait(1800);
    result.reconnected=snapshot(card);
    card.querySelector('.sc-health-run').click();
    result.checking={className:card.classList.contains('is-checking'),disabled:card.querySelector('.sc-health-run').disabled};
    await wait(1800);
    result.checkedAfterRun=snapshot(card);
    result.status=card.querySelector('.sc-health-status').textContent;
    doc.querySelector('[data-sc-state="alert"]').click();
    result.reset=snapshot(card);
    finish(result);
  }catch(error){if(++attempts<30)setTimeout(inspect,150);else finish({error:String(error)})}
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

test('camera health card follows the preview state and resolves issues', { timeout: 20000 }, async t => {
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
  const userDataDir = mkdtempSync(join(tmpdir(), 'wyze-health-'));
  try {
    const dom = await runChrome(`http://127.0.0.1:${server.address().port}/__test__/harness.html`, userDataDir);
    const encoded = dom.match(/<title>RESULT:([^<]+)<\/title>/)?.[1];
    assert.ok(encoded, 'browser harness did not return results');
    const result = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    assert.equal(result.error, undefined);
    assert.equal(result.placedBeforeStories, true);

    assert.equal(result.mixed.health, 'warn');
    assert.equal(result.mixed.title, '2 cameras need attention');
    assert.deepEqual(result.mixed.issues, ['Garage Cam', 'Backyard Feeder Cam']);

    assert.equal(result.normal.health, 'ok');
    assert.equal(result.normal.title, 'All 8 cameras healthy');
    assert.deepEqual(result.normal.strip, Array(8).fill('ok'));
    assert.deepEqual(result.normal.stats, ['8/8', '8/8', 'Good']);
    assert.deepEqual(result.normal.issues, []);

    assert.equal(result.alert.health, 'down');
    assert.equal(result.alert.title, '3 cameras need attention');
    assert.equal(result.alert.issues[0], 'Side Gate Cam', 'offline cameras lead the issue list');
    assert.deepEqual(result.alert.stats, ['7/8', '7/8', '1 low']);
    assert.equal(result.alert.strip.filter(level => level === 'down').length, 1);

    assert.deepEqual(result.expanded, { aria: 'true', hidden: false, rows: 8, offline: 'Side Gate Cam' });
    assert.equal(result.reminder.done, 'Reminder set for 7 PM');
    assert.equal(result.reminder.stillListed, true, 'a reminder does not hide a low battery');
    assert.deepEqual(result.busy, { disabled: true, text: 'Reconnecting…' });

    assert.equal(result.reconnected.health, 'warn');
    assert.equal(result.reconnected.title, '2 cameras need attention');
    assert.deepEqual(result.reconnected.stats, ['8/8', '8/8', '1 low']);
    assert.deepEqual(result.reconnected.issues, ['Driveway Cam', 'Backyard Feeder Cam']);

    assert.deepEqual(result.checking, { className: true, disabled: true });
    assert.equal(result.checkedAfterRun.checked, 'Checked just now');
    assert.equal(result.status, 'Check complete. 2 cameras need attention.');

    assert.equal(result.reset.title, '3 cameras need attention', 'switching state restores that state’s issues');
    assert.equal(result.reset.checked, 'Checked 1 min ago');
  } finally {
    await new Promise(resolve => server.close(resolve));
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
