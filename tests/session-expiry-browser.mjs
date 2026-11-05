// Issue #1 browser regression: an expired session never fails silently. Every screen and action that meets a 401 offers
// sign-in over the current page, returns the user there with form values kept, and "Provider terms" opens a new tab.
// Usage (after npm run build): node tests/session-expiry-browser.mjs   [OUTPUT=dir for screenshots and results.json]
import {chromium} from 'playwright-core';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {DatabaseSync} from 'node:sqlite';
const output=process.env.OUTPUT??mkdtempSync(join(tmpdir(),'session-expiry-out-'));mkdirSync(output,{recursive:true});
const dir=mkdtempSync(join(tmpdir(),'session-expiry-')),data=join(dir,'app.sqlite'),port=String(19900+Math.floor(Math.random()*90)),base='http://127.0.0.1:'+port,password='Synthetic session expiry password 075';
const server=spawn(process.execPath,['dist/server.js'],{env:{...process.env,DATA_FILE:data,MASTER_SECRET:'session-expiry-browser-master-synthetic-0123',PORT:port,HOST:'127.0.0.1',FEEDBACK_URL:'http://127.0.0.1:9/feedback'},stdio:'ignore'});
for(let i=0;;i++){try{if((await fetch(base+'/health')).ok)break;}catch{}if(i>150)throw Error('server did not start');await new Promise(r=>setTimeout(r,100));}
const expire=()=>{const db=new DatabaseSync(data);db.prepare('UPDATE sessions SET last_seen=?').run(Date.now()-31*60000);db.close();};
const results=[],check=(name,details={})=>{results.push({check:name,...details,capturedAt:new Date().toISOString()});console.log('PASS',name,JSON.stringify(details));};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 // No traffic leaves the machine: external pages (provider terms) are answered locally.
 await context.route(url=>!url.href.startsWith(base),route=>route.fulfill({status:200,contentType:'text/html',body:'<title>external stub</title>'}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByRole('heading',{name:'Start with a password.'}).waitFor();
 assert.equal((await page.request.post(base+'/api/auth/setup',{data:{password}})).status(),200);
 assert.equal((await page.request.post(base+'/api/settings',{data:{onboarded:true}})).status(),200);
 assert.equal((await page.request.post(base+'/api/sources/kraken',{data:{enabled:true,accepted:true}})).status(),200);
 await page.reload();const form=page.locator('form:has(input[name=symbol])');await form.waitFor();
 const dialog=page.getByRole('dialog',{name:'Sign in again'});
 const values={symbol:'ETH/USDT',capital:'12345',fast:'7',slow:'31'};
 const fill=async()=>{for(const [k,v] of Object.entries(values))await form.locator(`input[name=${k}]`).fill(v);await form.locator('select[name=strategy]').selectOption('rsi');};
 const assertKept=async label=>{for(const [k,v] of Object.entries(values))assert.equal(await form.locator(`input[name=${k}]`).inputValue(),v,label+' '+k);assert.equal(await form.locator('select[name=strategy]').inputValue(),'rsi',label+' strategy');};
 const signInDialog=async()=>{await dialog.getByLabel('Password').fill(password);await dialog.getByRole('button',{name:'Sign in and continue'}).click();await dialog.waitFor({state:'detached'});};

 // 1. The tester's case: form open, session expired, "Run backtest" clicked.
 await fill();expire();await form.getByRole('button',{name:'Run backtest'}).click();
 await dialog.waitFor({timeout:5000});await page.screenshot({path:join(output,'expired-run-backtest-1440.png')});
 await page.setViewportSize({width:390,height:900});await page.screenshot({path:join(output,'expired-run-backtest-390.png')});await page.setViewportSize({width:1440,height:1000});
 await assertKept('behind dialog');check('Run backtest with expired session opens the sign-in dialog over the form',{screenshot:'expired-run-backtest-1440.png'});
 await signInDialog();await assertKept('after sign-in');assert.equal(await page.locator('nav button[aria-current=page]').innerText(),'Test bench');
 assert.equal((await page.request.get(base+'/api/settings')).status(),200);await page.getByText('Signed in again. Your form is as you left it.').first().waitFor();
 check('Sign-in from the dialog returns to the same screen with all form values kept and a working session');

 // 2. Reload while expired: login page, then back to the same screen with the form values restored.
 await fill();expire();await page.reload();await page.getByRole('heading',{name:'Welcome back.'}).waitFor();
 await page.getByLabel('Password').fill(password);await page.getByRole('button',{name:'Log in'}).click();await form.waitFor();
 await page.waitForFunction(()=>document.querySelector('input[name=symbol]')?.value==='ETH/USDT',null,{timeout:5000});await assertKept('after reload and sign-in');
 check('Reload with an expired session, then sign-in, returns to Test bench with form values restored');

 // 3. Every screen meets a 401 on open and offers sign-in, never a silent failure.
 const screens=['Trends','Test bench','Portfolio','Staking','Assistant','Workers','Data sources','Settings','What’s new'];
 for(const name of screens){const home=name==='What’s new'?'Settings':'What’s new';await page.getByRole('button',{name:home,exact:true}).click();await page.waitForLoadState('networkidle');await page.waitForTimeout(300);assert.equal(await dialog.count(),0,'no dialog before expiry');expire();await page.getByRole('button',{name,exact:true}).click();await dialog.waitFor({timeout:5000});
  assert.equal(await page.locator('nav button[aria-current=page]').innerText(),name);await signInDialog();assert.equal(await page.locator('nav button[aria-current=page]').innerText(),name);}
 check('Each screen opened with an expired session shows the sign-in dialog and stays on that screen after sign-in',{screens});

 // 4. Portfolio action and CSV export while expired: dialog, no error file downloaded, the add-holding form keeps its values.
 await page.getByRole('button',{name:'Portfolio',exact:true}).click();const holding=page.locator('form:has(input[name=quantity])');await holding.waitFor();
 await holding.locator('input[name=symbol]').fill('SOL/USDT');await holding.locator('input[name=quantity]').fill('2.5');
 let downloads=0;page.on('download',()=>downloads++);await page.waitForLoadState('networkidle');await page.waitForTimeout(300);assert.equal(await dialog.count(),0,'no dialog before expiry');expire();await page.getByRole('link',{name:'Export CSV'}).click();await dialog.waitFor({timeout:5000});
 await page.waitForTimeout(500);assert.equal(downloads,0);await signInDialog();
 expire();await holding.locator('button[type=submit],button:not([type])').first().click();await dialog.waitFor({timeout:5000});await signInDialog();
 assert.equal(await holding.locator('input[name=symbol]').inputValue(),'SOL/USDT');assert.equal(await holding.locator('input[name=quantity]').inputValue(),'2.5');
 check('Portfolio CSV export and add-holding with an expired session open sign-in, download nothing and keep form values');

 // 5. Provider terms opens a new tab; the app tab stays on Data sources.
 await page.getByRole('button',{name:'Data sources',exact:true}).click();const terms=page.getByRole('link',{name:'Provider terms'}).first();await terms.waitFor();
 assert.equal(await terms.getAttribute('target'),'_blank');assert.equal(await terms.getAttribute('rel'),'noopener noreferrer');
 const before=page.url();const [popup]=await Promise.all([context.waitForEvent('page'),terms.click()]);await popup.waitForLoadState();
 assert.notEqual(popup,page);assert.equal(page.url(),before);assert.equal(await page.locator('nav button[aria-current=page]').innerText(),'Data sources');
 check('Provider terms opens in a new tab with rel="noopener noreferrer"; the app tab stays on Data sources',{href:await terms.getAttribute('href'),popup:popup.url()});
 assert.deepEqual(errors,[],'page errors');
 writeFileSync(join(output,'results.json'),JSON.stringify({base:'local',results},null,1));console.log('RESULT PASS',results.length,'checks; output',output);
}finally{await browser.close();server.kill('SIGTERM');rmSync(dir,{recursive:true,force:true});}
