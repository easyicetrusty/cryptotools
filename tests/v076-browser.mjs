// 0.7.6 candidate, tester XtReL retest items: (1) opened run is labelled and unsaved edits come back, (2) sealed split flagged and named on export,
// (3) no sign-in flash on refresh with a valid session. Real server and real browser; only external transports are synthetic.
// npm run build && OUTPUT=dir node tests/v076-browser.mjs        (EXPECT_FLASH=1 documents the pre-fix behaviour on an old build)
import {chromium} from 'playwright-core';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {DatabaseSync} from 'node:sqlite';
const output=process.env.OUTPUT??mkdtempSync(join(tmpdir(),'v076-out-'));mkdirSync(output,{recursive:true});
const dir=mkdtempSync(join(tmpdir(),'v076-')),data=join(dir,'app.sqlite'),port=String(19800+Math.floor(Math.random()*90)),base='http://127.0.0.1:'+port,password='Synthetic v076 retest password';
const server=spawn(process.execPath,['--import','./tests/session-fixtures.mjs','--input-type=module','-e',"await import('./dist/server.js');process.send('ready')"],{env:{...process.env,DATA_FILE:data,PORT:port,HOST:'127.0.0.1',FEEDBACK_URL:'http://127.0.0.1:9/feedback'},stdio:['ignore','pipe','pipe','ipc']});
let serverErrors='';server.stderr.on('data',d=>serverErrors+=d);await Promise.race([once(server,'message'),once(server,'exit').then(()=>{throw Error('Server failed: '+serverErrors)})]);
const sql=fn=>{const db=new DatabaseSync(data);try{return fn(db)}finally{db.close()}};
const results=[],check=(name,details={})=>{results.push({check:name,...details,capturedAt:new Date().toISOString()});console.log('PASS',name,JSON.stringify(details));};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const iso=ms=>new Date(ms).toISOString().slice(0,10),today=Date.parse(iso(Date.now()));
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 await context.route(url=>!url.href.startsWith(base),route=>route.fulfill({status:200,contentType:'text/html',body:'<title>external stub</title>'}));
 await context.addInitScript(()=>{window.__signInSeen=[];const look=()=>{if(/Welcome back\./.test(document.body?.innerText??''))window.__signInSeen.push(Date.now())};new MutationObserver(look).observe(document,{childList:true,subtree:true,characterData:true});});
 const page=await context.newPage(),errors=[],responses=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>responses.push({path:new URL(r.url()).pathname,method:r.request().method(),status:r.status()}));
 const api=async(path,body)=>{const r=body===undefined?await page.request.get(base+'/api/'+path):await page.request.post(base+'/api/'+path,{data:body});assert.equal(r.status(),200,path+' '+await r.text());return r.json();};
 await api('auth/setup',{password});await api('settings',{onboarded:true,survey:true});await api('sources/kraken',{enabled:true,accepted:true});
 const seed={exchange:'kraken',symbol:'ETH/USDT',timeframe:'1d',start:'2026-10-01',end:'2026-10-10',strategy:'hold',capital:10000,feeMode:'override'};
 const run1=await api('backtest',{...seed,feeBps:80});const run2=await api('backtest',{...seed,feeBps:25,capital:7000});
 assert.equal(run1.runId,1);assert.equal(run2.runId,2);
 const form=page.locator('form:has(input[name=symbol])');
 // ---- Item 3: refresh with a valid session must not flash the sign-in form while the session check is still running.
 let delay=true;await page.route(base+'/api/backtests/latest',async route=>{if(delay)await new Promise(r=>setTimeout(r,1500));await route.continue()});
 await page.goto(base);await page.getByRole('heading',{name:'Define a test',exact:true}).waitFor();
 const flashes=await page.evaluate(()=>window.__signInSeen.length);
 if(process.env.EXPECT_FLASH){assert.ok(flashes>0,'pre-fix build is expected to flash the sign-in form');check('PRE-FIX build flashes the sign-in form on refresh with a valid session',{signInRenders:flashes});process.exit(0)}
 assert.equal(flashes,0,'sign-in form rendered during a refresh with a valid session');
 check('Refresh with a valid session: sign-in form never rendered while the session check was held 1.5 s',{signInRenders:flashes});
 delay=false;
 // ---- Item 1: opening a saved run.
 await form.locator('input[name=capital]').fill('12345');await form.locator('input[name=feeBps]').fill('10');await form.locator('input[name=split]').fill(iso(today-2*86400000));await form.locator('input[name=start]').fill(iso(today-5*86400000));await form.locator('input[name=end]').fill(iso(today));
 const before={capital:await form.locator('input[name=capital]').inputValue(),feeBps:await form.locator('input[name=feeBps]').inputValue(),split:await form.locator('input[name=split]').inputValue()};
 assert.deepEqual(before,{capital:'12345',feeBps:'10',split:iso(today-2*86400000)});
 assert.equal(await page.locator('#opened-run-note').count(),0,'no note before a run is opened');
 await page.getByRole('button',{name:'Open run #1',exact:true}).click();await page.locator('#opened-run-note').waitFor();
 const note=await page.locator('#opened-run-note').innerText();assert.match(note,/Showing the settings of Run #1\./);
 const opened={capital:await form.locator('input[name=capital]').inputValue(),feeBps:await form.locator('input[name=feeBps]').inputValue(),split:await form.locator('input[name=split]').inputValue(),start:await form.locator('input[name=start]').inputValue()};
 assert.deepEqual(opened,{capital:'10000',feeBps:'80',split:before.split,start:'2026-10-01'});
 assert.ok(await page.locator('#opened-run-note').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}),'banner is scrolled into view after Open run'); await page.screenshot({path:join(output,'opened-run-1440.png')});
 check('Open run #1: form shows that run\'s own settings (fee 80, capital 10000), banner says so, sealed split keeps the user value',{before,opened,note});
 await page.getByRole('button',{name:'Back to my previous form values',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#opened-run-note'));
 const back={capital:await form.locator('input[name=capital]').inputValue(),feeBps:await form.locator('input[name=feeBps]').inputValue(),split:await form.locator('input[name=split]').inputValue(),start:await form.locator('input[name=start]').inputValue(),end:await form.locator('input[name=end]').inputValue()};
 assert.deepEqual(back,{capital:'12345',feeBps:'10',split:before.split,start:iso(today-5*86400000),end:iso(today)});
 check('Back to previous values restores every unsaved edit and removes the banner',{back});
 // Opening two runs in a row still returns to the original unsaved values.
 await page.getByRole('button',{name:'Open run #1',exact:true}).click();await page.locator('#opened-run-note').waitFor();await page.getByRole('button',{name:'Open run #2',exact:true}).click();await page.waitForFunction(()=>/Run #2\./.test(document.querySelector('#opened-run-note')?.textContent??''));
 assert.equal(await form.locator('input[name=feeBps]').inputValue(),'25');await page.getByRole('button',{name:'Back to my previous form values',exact:true}).click();
 assert.equal(await form.locator('input[name=feeBps]').inputValue(),'10');assert.equal(await form.locator('input[name=capital]').inputValue(),'12345');
 check('Opening run #1 then run #2, then Back, returns to the original unsaved values',{});
 // ---- Item 2: seal split flagged in the form and named on export.
 const flag=page.locator('#split-problem');await form.locator('input[name=split]').fill(iso(today-14*86400000));await flag.waitFor();
 const flagText=await flag.innerText();assert.match(flagText,/split/);assert.match(flagText,new RegExp(iso(today-14*86400000)));
 await page.screenshot({path:join(output,'split-flag-1440.png')});
 const [bad]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/bench-preset')),page.getByRole('button',{name:'Export configuration JSON',exact:true}).click()]);
 const badBody=await bad.json();assert.equal(bad.status(),400);assert.match(badBody.error,/Sealed window begins \(split\)/);assert.doesNotMatch(badBody.error,/Request failed/);
 await page.locator('.bench-presets [role=status]').filter({hasText:'Sealed window begins (split)'}).waitFor();const shown=await page.locator('.bench-presets [role=status]').innerText();
 check('Split outside the period: flagged in the form before export, and export returns and shows a specific message',{flag:flagText,status:bad.status(),apiError:badBody.error,shown});
 await form.locator('input[name=split]').fill(iso(today-2*86400000));await page.waitForFunction(()=>!document.querySelector('#split-problem'));
 const [good]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/bench-preset')),page.getByRole('button',{name:'Export configuration JSON',exact:true}).click()]);assert.equal(good.status(),200);await page.locator('.bench-presets [role=status]').filter({hasText:'Preset exported.'}).waitFor();
 await form.locator('input[name=split]').fill('');await page.waitForTimeout(100);assert.equal(await page.locator('#split-problem').count(),0);
 check('Split inside the period: flag disappears and export succeeds; an empty split is not flagged',{status:good.status()});
 // ---- Item 3, second half: an expired session still shows sign-in after a refresh.
 sql(db=>db.prepare('UPDATE sessions SET last_seen=?').run(Date.now()-31*60000));
 await page.reload();await page.getByRole('heading',{name:'Welcome back.'}).waitFor();assert.equal(await page.getByRole('heading',{name:'Define a test'}).count(),0);
 check('Expired session after refresh still shows the sign-in form',{});
 assert.deepEqual(errors,[],'page errors');
 writeFileSync(join(output,'v076-browser-results.json'),JSON.stringify(results,null,2));
}finally{await browser.close();server.kill()}
