// Issue #1 browser regression: an expired session never fails silently. Every screen and action that meets a 401 offers
// sign-in over the current page, returns the user there with form values kept, every screen shows its loaded content
// after sign-in without being reopened, and "Provider terms" opens a new tab.
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
 assert.equal((await page.request.post(base+'/api/settings',{data:{survey:true}})).status(),200);
 assert.equal((await page.request.post(base+'/api/portfolio',{data:{symbol:'BTC/USDT',quantity:0.1,cost:80000}})).status(),200);
 await page.reload();const form=page.locator('form:has(input[name=symbol])');await form.waitFor();
 const dialog=page.getByRole('dialog',{name:'Sign in again'});
 const values={symbol:'ETH/USDT',capital:'12345',fast:'7',slow:'31'};
 const fill=async()=>{for(const [k,v] of Object.entries(values))await form.locator(`input[name=${k}]`).fill(v);await form.locator('select[name=strategy]').selectOption('rsi');};
 const assertKept=async label=>{for(const [k,v] of Object.entries(values))assert.equal(await form.locator(`input[name=${k}]`).inputValue(),v,label+' '+k);assert.equal(await form.locator('select[name=strategy]').inputValue(),'rsi',label+' strategy');};
 // Loaded content per screen, read from the DOM. Each needs data the screen fetches when it opens.
 const probes={
  'Trends':()=>/Reading enabled public sources|Snapshot captured/.test(document.querySelector('section[aria-label="Trends information"] p[role=status]')?.textContent??'')||!!document.querySelector('.trend-results'),
  'Test bench':()=>!!document.querySelector('main form input[name=symbol]')&&[...document.querySelectorAll('.saved-run-list button')].some(b=>/^Open run #\d+/.test(b.textContent)),
  'Portfolio':()=>[...document.querySelectorAll('.portfolio-table tbody tr')].some(r=>r.textContent.includes('BTC/USDT'))&&/Add a paper holding to begin|quote · observed values/.test(document.querySelector('.portfolio-history')?.textContent??''),
  'Staking':()=>/\d+ shown · \d+ matched of \d+ options/.test(document.querySelector('section[aria-label="Staking information"]')?.textContent??''),
  'Assistant':()=>!!document.querySelector('main textarea[name=prompt]')&&!!document.querySelector('.usage-meters'),
  'Workers':()=>!!document.querySelector('main textarea[name=goal]')&&document.querySelectorAll('.worker-grid select').length===4,
  'Data sources':()=>document.querySelectorAll('main .source-card').length>=5,
  'Settings':()=>document.querySelectorAll('.channel-form').length===2&&!!document.querySelector('.ai-controls'),
  'What’s new':()=>/0\.7\.5/.test(document.querySelector('pre.changelog')?.textContent??'')};
 // Screens whose content is fetched by components mounted on open (What’s new keeps its text in app state).
 const loadsOnOpen=['Trends','Test bench','Portfolio','Staking','Data sources','Settings'];
 // Failed loads show their message in alert, status or error elements; none may still say Login required.
 const noLoginRequired=()=>![...document.querySelectorAll('main [role=alert],main [role=status],main .error')].some(n=>/Login required/i.test(n.textContent));
 // Polls the open page; never navigates, so a failed load cannot be hidden by a remount.
 const loaded=async(name,timeout=20000)=>{await page.waitForFunction(([fn])=>(0,eval)(fn)(),[probes[name].toString()],{timeout});await page.waitForFunction(noLoginRequired,null,{timeout:5000});};
 const probe=name=>page.evaluate(([fn])=>(0,eval)(fn)(),[probes[name].toString()]);
 const signInDialog=async()=>{await dialog.getByLabel('Password').fill(password);await dialog.getByRole('button',{name:'Sign in and continue'}).click();await dialog.waitFor({state:'detached'});};

 // 1. The tester's case: form open, session expired, "Run backtest" clicked.
 await fill();expire();await form.getByRole('button',{name:'Run backtest'}).click();
 await dialog.waitFor({timeout:5000});await page.screenshot({path:join(output,'expired-run-backtest-1440.png')});
 await page.setViewportSize({width:390,height:900});await page.screenshot({path:join(output,'expired-run-backtest-390.png')});await page.setViewportSize({width:1440,height:1000});
 await assertKept('behind dialog');check('Run backtest with expired session opens the sign-in dialog over the form',{screenshot:'expired-run-backtest-1440.png'});
 await signInDialog();await assertKept('after sign-in');assert.equal(await page.locator('nav button[aria-current=page]').innerText(),'Test bench');
 assert.equal((await page.request.get(base+'/api/settings')).status(),200);await page.getByText('Signed in again. Your form is as you left it.').first().waitFor();
 await form.getByRole('button',{name:'Run backtest'}).click();await loaded('Test bench',90000);await assertKept('after running');
 check('Sign-in from the dialog returns to the same screen with all form values kept and a working session; Run backtest clicked again produces a saved run');

 // 2. Reload while expired: login page, then back to the same screen with the form values restored.
 await fill();expire();await page.reload();await page.getByRole('heading',{name:'Welcome back.'}).waitFor();
 await page.getByLabel('Password').fill(password);await page.getByRole('button',{name:'Log in'}).click();await form.waitFor();
 await page.waitForFunction(()=>document.querySelector('input[name=symbol]')?.value==='ETH/USDT',null,{timeout:5000});await assertKept('after reload and sign-in');
 check('Reload with an expired session, then sign-in, returns to Test bench with form values restored');

 // 3. Every screen meets a 401 on open and offers sign-in, never a silent failure.
 const contentAfter=[],screens=['Trends','Test bench','Portfolio','Staking','Assistant','Workers','Data sources','Settings','What’s new'];
 for(const name of screens){const home=name==='What’s new'?'Settings':'What’s new';await page.getByRole('button',{name:home,exact:true}).click();await page.waitForLoadState('networkidle');await page.waitForTimeout(300);assert.equal(await dialog.count(),0,'no dialog before expiry');expire();await page.getByRole('button',{name,exact:true}).click();await dialog.waitFor({timeout:5000});
  assert.equal(await page.locator('nav button[aria-current=page]').innerText(),name);await page.waitForTimeout(500);const before=await probe(name);if(loadsOnOpen.includes(name))assert.equal(before,false,name+' content must be missing while the session is expired');
  await signInDialog();assert.equal(await page.locator('nav button[aria-current=page]').innerText(),name);await loaded(name);assert.equal(await page.locator('nav button[aria-current=page]').innerText(),name);
  contentAfter.push({screen:name,contentBeforeSignIn:before,contentAfterSignIn:true});}
 check('Each screen opened with an expired session shows the sign-in dialog, stays on that screen and shows its loaded content after sign-in without being reopened',{screens:contentAfter});

 // 3b. Data sources with an unsaved change: Save source while expired, sign in, the cards are back and the change is kept.
 await page.getByRole('button',{name:'Data sources',exact:true}).click();await loaded('Data sources');
 const pick=await page.evaluate(()=>[...document.querySelectorAll('.source-card')].find(c=>{const box=c.querySelector('form input[type=checkbox]');return box&&!box.checked&&!box.disabled})?.dataset.source);assert.ok(pick,'a card with terms not yet accepted');
 const card=page.locator(`[data-source="${pick}"]`),accept=card.locator('form input[type=checkbox]').first();await accept.check();
 await page.waitForLoadState('networkidle');assert.equal(await dialog.count(),0,'no dialog before expiry');expire();await card.getByRole('button',{name:'Save source'}).click();await dialog.waitFor({timeout:5000});
 await signInDialog();await loaded('Data sources');assert.equal(await accept.isChecked(),true,'unsaved acceptance kept');assert.equal(await page.locator('main .source-card').count()>=5,true);
 await card.scrollIntoViewIfNeeded();await page.screenshot({path:join(output,'datasources-after-signin-1440.png')});await page.setViewportSize({width:390,height:900});await card.scrollIntoViewIfNeeded();await page.screenshot({path:join(output,'datasources-after-signin-390.png')});await page.setViewportSize({width:1440,height:1000});
 check('Data sources: Save source with an expired session, then sign-in, shows the source cards again with the unsaved change kept',{card:pick,cards:await page.locator('main .source-card').count(),screenshots:['datasources-after-signin-1440.png','datasources-after-signin-390.png']});

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
 // 6. Workers form: unnamed React-controlled provider and model selects survive the dialog and a reload.
 await page.getByRole('button',{name:'Workers',exact:true}).click();await loaded('Workers');
 const job={goal:'Synthetic goal kept across sign-in',research:['deepseek','deepseek-chat'],reviewer:['mistral','mistral-small-latest']};
 const workerValues=()=>page.evaluate(()=>({goal:document.querySelector('textarea[name=goal]').value,research:[document.querySelector('[aria-label="research provider"]').value,document.querySelector('[aria-label="research model"]').value],reviewer:[document.querySelector('[aria-label="reviewer provider"]').value,document.querySelector('[aria-label="reviewer model"]').value]}));
 const fillJob=async()=>{await page.locator('textarea[name=goal]').fill(job.goal);for(const role of ['research','reviewer']){await page.getByLabel(role+' provider').selectOption(job[role][0]);await page.getByLabel(role+' model').fill(job[role][1]);}assert.deepEqual(await workerValues(),job);};
 await fillJob();await page.waitForLoadState('networkidle');assert.equal(await dialog.count(),0,'no dialog before expiry');expire();// the 1.5 s job poll may raise the dialog first; then the click cannot land, which is the expected outcome too
 await page.getByRole('button',{name:'Start job'}).click({timeout:1500}).catch(()=>{});await dialog.waitFor({timeout:5000});
 await signInDialog();await loaded('Workers');assert.deepEqual(await workerValues(),job,'after dialog sign-in');
 expire();await page.reload();await page.getByRole('heading',{name:'Welcome back.'}).waitFor();await page.getByLabel('Password').fill(password);await page.getByRole('button',{name:'Log in'}).click();
 await page.waitForFunction(v=>document.querySelector('[aria-label="reviewer model"]')?.value===v,job.reviewer[1],{timeout:5000});await page.waitForTimeout(300);
 assert.equal(await page.locator('nav button[aria-current=page]').innerText(),'Workers');assert.deepEqual(await workerValues(),job,'after reload and sign-in');await loaded('Workers');
 await page.screenshot({path:join(output,'workers-restored-1440.png')});
 check('Workers form: goal and the unnamed provider and model controls are kept after dialog sign-in and restored after a reload',{...job,screenshot:'workers-restored-1440.png'});

 // 7. Assistant form: provider select and unnamed model input restored after a reload.
 await page.getByRole('button',{name:'Assistant',exact:true}).click();await loaded('Assistant');
 const chat={provider:'mistral',model:'mistral-large-latest',prompt:'Synthetic prompt kept across sign-in'};
 const chatValues=()=>page.evaluate(()=>({provider:document.querySelector('[aria-label="Chat provider"]').value,model:document.querySelector('[aria-label="Chat model"]').value,prompt:document.querySelector('textarea[name=prompt]').value}));
 await page.getByLabel('Chat provider').selectOption(chat.provider);await page.getByLabel('Chat model').fill(chat.model);await page.locator('textarea[name=prompt]').fill(chat.prompt);assert.deepEqual(await chatValues(),chat);
 await page.waitForLoadState('networkidle');expire();await page.reload();await page.getByRole('heading',{name:'Welcome back.'}).waitFor();await page.getByLabel('Password').fill(password);await page.getByRole('button',{name:'Log in'}).click();
 await page.waitForFunction(v=>document.querySelector('[aria-label="Chat model"]')?.value===v,chat.model,{timeout:5000});await page.waitForTimeout(300);assert.deepEqual(await chatValues(),chat,'after reload and sign-in');
 check('Assistant form: provider, unnamed model and prompt restored after a reload and sign-in',chat);
 assert.deepEqual(errors,[],'page errors');
 writeFileSync(join(output,'results.json'),JSON.stringify({base:'local',results},null,1));console.log('RESULT PASS',results.length,'checks; output',output);
}finally{await browser.close();server.kill('SIGTERM');rmSync(dir,{recursive:true,force:true});}
