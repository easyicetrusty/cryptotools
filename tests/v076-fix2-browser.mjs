// Fix-round-2 regressions: real app/server/SQLite, synthetic external market transport.
// Only Trends' volume snapshot is stubbed in the browser to expose a deterministic SOL selection.
// Run after npm run build: OUTPUT=dir node tests/v076-fix2-browser.mjs
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const output=process.env.OUTPUT??mkdtempSync(join(tmpdir(),'v076-fix2-out-'));
mkdirSync(output,{recursive:true});
const dir=mkdtempSync(join(tmpdir(),'v076-fix2-')),port=String(19900+Math.floor(Math.random()*90)),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['--import','./tests/session-fixtures.mjs','--input-type=module','-e',"await import('./dist/server.js');process.send('ready')"],{env:{...process.env,DATA_FILE:join(dir,'app.sqlite'),PORT:port,HOST:'127.0.0.1',FEEDBACK_URL:'http://127.0.0.1:9/feedback'},stdio:['ignore','pipe','pipe','ipc']});
let stderr='';server.stderr.on('data',d=>stderr+=d);
let browser;
const results=[],failures=[];
const probe=async(name,fn)=>{try{const details=await fn();const r={name,status:'PASS',capturedAt:new Date().toISOString(),...details};results.push(r);console.log(JSON.stringify(r));}catch(e){const r={name,status:'FAIL',capturedAt:new Date().toISOString(),error:e.stack};results.push(r);failures.push(name);console.error(JSON.stringify(r));}};
try{
 await Promise.race([once(server,'message'),once(server,'exit').then(()=>{throw Error('Server failed: '+stderr)})]);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage(),pageErrors=[];
 page.on('pageerror',e=>pageErrors.push(e.message));
 await context.route(url=>!url.href.startsWith(base),route=>route.fulfill({status:200,contentType:'text/html',body:'<title>external stub</title>'}));
 const api=async(path,body)=>{const r=body===undefined?await page.request.get(base+'/api/'+path):await page.request.post(base+'/api/'+path,{data:body});assert.equal(r.status(),200,path+' '+await r.text());return r.json();};
 await api('auth/setup',{password:'Synthetic fix round two password'});
 await api('settings',{onboarded:true,survey:true});await api('sources/kraken',{enabled:true,accepted:true});await api('sources/okx',{enabled:true,accepted:true});
 const bench={exchange:'kraken',symbol:'ETH/USDT',timeframe:'4h',start:'2026-09-01',end:'2026-09-20',strategy:'hold',capital:10000,feeMode:'override',feeBps:80};
 const ordinary=await api('backtest',{...bench,split:'2026-11-05'});assert.equal(ordinary.runId,1);
 const form=page.locator('form:has(input[name=symbol])');
 const snapshot=()=>form.evaluate(f=>Object.fromEntries(new FormData(f)));
 await page.goto(base);await form.waitFor();
 await probe('Trends selection yields to opened run; Back restores complete unsaved Trends form',async()=>{
  await page.route(base+'/api/trends',route=>route.fulfill({status:200,json:{asOf:new Date().toISOString(),stablecoinData:[],combined:[],sources:[{exchange:'okx',source:'Synthetic fixture',sourceUrl:'https://example.com',status:'synthetic fixture',fetchedAt:new Date().toISOString(),ageSeconds:0,rows:[{exchange:'okx',symbol:'SOL/USDT',volumeUsd:1000,observedAt:null}]}]}}));
  await page.getByRole('button',{name:'Trends',exact:true}).click();
  await page.locator('.trend-volume-table').getByRole('button',{name:'Test in bench · past behaviour',exact:true}).click();
  await form.waitFor();assert.equal(await form.locator('[name=exchange]').inputValue(),'okx');assert.equal(await form.locator('[name=symbol]').inputValue(),'SOL/USDT');assert.equal(await form.locator('[name=timeframe]').inputValue(),'1d');
  await form.locator('[name=capital]').fill('12345');await form.locator('[name=feeBps]').fill('10');
  await form.locator('[name=start]').fill('2026-11-03');await form.locator('[name=end]').fill('2026-11-08');await form.locator('[name=split]').fill('2026-11-05');
  const before=await snapshot();
  await page.getByRole('button',{name:'Open run #1',exact:true}).click();await page.locator('#opened-run-note').waitFor();
  const opened=await snapshot(),note=await page.locator('#opened-run-note').innerText();
  console.log('OBSERVED opened after Trends',JSON.stringify({before,opened,note}));
  assert.equal(opened.symbol,'ETH/USDT');assert.equal(opened.timeframe,'4h');assert.equal(opened.exchange,'kraken');assert.equal(opened.capital,'10000');assert.equal(opened.feeBps,'80');assert.equal(opened.start,'2026-09-01');assert.equal(opened.end,'2026-09-20');assert.equal(opened.split,'2026-11-05');
  assert.match(note,/ordinary backtest/);assert.equal(await page.getByRole('note').filter({hasText:'Opened from Trends:'}).count(),0);
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.locator('#opened-run-note').scrollIntoViewIfNeeded();await page.screenshot({path:join(output,`fix2-opened-run-${width}.png`)});}
  await page.getByRole('button',{name:'Back to my previous form values',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#opened-run-note'));
  const back=await snapshot();assert.deepEqual(back,before);await page.getByRole('note').filter({hasText:'Opened from Trends: SOL/USDT'}).waitFor();
  return {before,opened,back,note};
 });
 // Reset through normal navigation so either prior probe's outcome can be inspected independently.
 await page.reload();await form.waitFor();
 await probe('API-validated preset import recomputes split error and aria-invalid',async()=>{
  await form.locator('[name=start]').fill('2026-11-03');await form.locator('[name=end]').fill('2026-11-08');await form.locator('[name=split]').fill('2026-10-25');
  await page.locator('#split-problem').waitFor();assert.equal(await form.locator('[name=split]').getAttribute('aria-invalid'),'true');const before=await page.locator('#split-problem').innerText();
  const valid=await api('bench-preset',{schemaVersion:1,bench:{...bench,start:'2026-11-03',end:'2026-11-08'},seal:{split:'2026-11-05'}});
  await page.getByLabel('Import preset JSON',{exact:true}).setInputFiles({name:'valid-preset.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(valid))});
  await page.locator('.bench-presets [role=status]').filter({hasText:'Validated and loaded.'}).waitFor();
  const split=await form.locator('[name=split]').inputValue(),remaining=await page.locator('#split-problem').count(),invalid=await form.locator('[name=split]').getAttribute('aria-invalid');
  console.log('OBSERVED imported split',JSON.stringify({before,split,remaining,invalid}));
  assert.equal(split,'2026-11-05');assert.equal(remaining,0);assert.equal(invalid,null);
  const [download,response]=await Promise.all([page.waitForEvent('download'),page.waitForResponse(r=>r.url().endsWith('/api/bench-preset')),page.getByRole('button',{name:'Export configuration JSON',exact:true}).click()]);
  assert.equal(response.status(),200);assert.equal(download.suggestedFilename(),'strategy-test-preset.json');
  await page.locator('.bench-presets [role=status]').filter({hasText:'Preset exported.'}).waitFor();
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await form.locator('[name=split]').scrollIntoViewIfNeeded();await page.screenshot({path:join(output,`fix2-import-valid-${width}.png`)});}
  return {before,split,remaining,invalid,exportStatus:response.status()};
 });
 await probe('Ordinary backtest discards split; experiment persists and restores protocol split',async()=>{
  const ordinarySaved=await api('backtests/1');assert.equal(ordinarySaved.manifest.evaluationProtocol,undefined);
  const split=Date.parse('2026-09-10'),experiment=await api('holdouts',{...bench,split:'2026-09-10'}),tuning=await api('backtests/'+experiment.tuningRunId);
  assert.equal(tuning.manifest.evaluationProtocol.split,split);
  await page.reload();await form.waitFor();await form.locator('[name=split]').fill('2026-11-05');
  await page.getByRole('button',{name:'Open run #'+experiment.tuningRunId,exact:true}).click();await page.locator('#opened-run-note').waitFor();
  const opened=await snapshot(),note=await page.locator('#opened-run-note').innerText();assert.equal(opened.split,'2026-09-10');assert.match(note,/saved experiment metadata/);
  await page.getByRole('button',{name:'Back to my previous form values',exact:true}).click();assert.equal(await form.locator('[name=split]').inputValue(),'2026-11-05');
  return {ordinaryRunId:ordinarySaved.runId,ordinarySubmittedSplit:'2026-11-05',ordinaryProtocol:'absent',experimentId:experiment.id,tuningRunId:tuning.runId,protocol:tuning.manifest.evaluationProtocol,opened,note};
 });
 assert.deepEqual(pageErrors,[],'page errors');
 writeFileSync(join(output,'v076-fix2-results.json'),JSON.stringify({capturedAt:new Date().toISOString(),results,failures,pageErrors},null,2));
 assert.deepEqual(failures,[],'fix-round-2 regressions');
 console.log('RESULT PASS 3 fix-round-2 browser regressions');
}finally{if(browser)await browser.close();server.kill();}
