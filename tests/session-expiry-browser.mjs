// Issue #1: in-place session recovery only. No reload snapshots or timing-based restoration.
// Authentication, actions and seeded page data use the real server. Only external transports are synthetic.
// npm run build && OUTPUT=dir node tests/session-expiry-browser.mjs
import {chromium} from 'playwright-core';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {DatabaseSync} from 'node:sqlite';
const output=process.env.OUTPUT??mkdtempSync(join(tmpdir(),'session-expiry-out-'));mkdirSync(output,{recursive:true});
const dir=mkdtempSync(join(tmpdir(),'session-expiry-')),data=join(dir,'app.sqlite'),port=String(19900+Math.floor(Math.random()*90)),base='http://127.0.0.1:'+port,password='Synthetic session expiry password 075';
const server=spawn(process.execPath,['--import','./tests/session-fixtures.mjs','--input-type=module','-e',"await import('./dist/server.js');process.send('ready')"],{env:{...process.env,DATA_FILE:data,PORT:port,HOST:'127.0.0.1',FEEDBACK_URL:'http://127.0.0.1:9/feedback'},stdio:['ignore','pipe','pipe','ipc']});
let serverErrors='';server.stderr.on('data',d=>serverErrors+=d);await Promise.race([once(server,'message'),once(server,'exit').then(()=>{throw Error('Server failed: '+serverErrors)})]);
const sql=fn=>{const db=new DatabaseSync(data);try{return fn(db)}finally{db.close()}};
const expire=()=>sql(db=>db.prepare('UPDATE sessions SET last_seen=?').run(Date.now()-31*60000));
const results=[],check=(name,details={})=>{results.push({check:name,...details,capturedAt:new Date().toISOString()});console.log('PASS',name,JSON.stringify(details));};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
let failurePage,failureResponses;
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 await context.route(url=>!url.href.startsWith(base),route=>route.fulfill({status:200,contentType:'text/html',body:'<title>external stub</title>'}));
 await context.addInitScript(()=>{const original=window.fetch.bind(window);window.pendingApi=0;window.fetch=async(...args)=>{window.pendingApi++;try{return await original(...args)}finally{window.pendingApi--}}});
 const page=await context.newPage(),errors=[],responses=[];failurePage=page;failureResponses=responses;page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>responses.push({path:new URL(r.url()).pathname,method:r.request().method(),status:r.status()}));
 const api=async(path,body)=>{const r=body===undefined?await page.request.get(base+'/api/'+path):await page.request.post(base+'/api/'+path,{data:body});assert.equal(r.status(),200,path+' '+await r.text());return r.json();};
 await api('auth/setup',{password});await api('settings',{onboarded:true,survey:true});await api('sources/kraken',{enabled:true,accepted:true});await api('portfolio',{symbol:'BTC/USDT',quantity:0.1,cost:80000});
 for(const provider of ['openai','anthropic','deepseek','mistral']){await api('providers',{provider,model:provider==='mistral'?'seeded-saved-model':'fixture-model',key:'synthetic-notlive',baseUrl:''});await api('providers/'+provider+'/controls',{dailyCap:provider==='mistral'?123456:0,rpm:9,noPortfolio:true});}
 const seed={exchange:'kraken',symbol:'ETH/USDT',timeframe:'1d',start:'2026-10-01',end:'2026-10-10',strategy:'hold',capital:10000,feeMode:'override',feeBps:10};const seededRun=await api('backtest',seed);
 sql(db=>{const stamp=new Date().toISOString();
  db.prepare('INSERT INTO ai_debits(provider,day,at,tokens,estimate) VALUES(?,?,?,?,?)').run('mistral',stamp.slice(0,10),Date.now(),321,0);
  db.prepare('INSERT INTO jobs(id,goal,status,result,created) VALUES(?,?,?,?,?)').run(41,'Seeded API job history 41','interrupted','',stamp);
  db.prepare('INSERT INTO workers(job,role,provider,model,status,result) VALUES(?,?,?,?,?,?)').run(41,'research','mistral','seeded-saved-model','interrupted','');
  db.prepare('UPDATE data_sources SET last_status=? WHERE id=?').run('Seeded API source status','okx');
  db.prepare('INSERT INTO notification_channels VALUES(?,?,?,?,?)').run('telegram',0,'[]',null,'Seeded Telegram status');
  const row={exchange:'kraken',symbol:'ETH/USDT',base:'ETH',quote:'USDT',asset:'ETH',volumeUsd:1234567,approximate:true,observedAt:stamp,fetchedAt:stamp,history:[]};
  db.prepare('INSERT OR REPLACE INTO trend_cache VALUES(?,?,?)').run('kraken:volumes',JSON.stringify({status:'available',rows:[row],excludedQuote:0,excludedData:0,marketCount:1}),stamp);
 });
 await page.goto(base);await page.getByRole('heading',{name:'Define a test',exact:true}).waitFor();
 const dialog=page.getByRole('dialog',{name:'Sign in again'});let navigations=0;page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++});
 const probes={
  'Trends':()=>/^Snapshot captured /.test(document.querySelector('section[aria-label="Trends information"] p[role=status]')?.textContent??'')&&[...document.querySelectorAll('.trend-volume-table tbody tr')].some(r=>r.textContent.includes('ETH/USDT')&&r.textContent.includes('1,234,567')),
  'Test bench':()=>[...document.querySelectorAll('.saved-run-list button')].some(b=>/^Open run #\d+/.test(b.textContent)),
  'Portfolio':()=>[...document.querySelectorAll('.portfolio-table tbody tr')].some(r=>r.textContent.includes('BTC/USDT'))&&/Add a paper holding to begin|quote · observed values/.test(document.querySelector('.portfolio-history')?.textContent??''),
  'Staking':()=>/\d+ shown · \d+ matched of \d+ options/.test(document.querySelector('section[aria-label="Staking information"]')?.textContent??''),
  'Assistant':()=>document.querySelector('[data-budget-provider="mistral"]')?.textContent.includes('321 / 123,456 budgeted tokens')===true,
  'Workers':()=>[...document.querySelectorAll('article.job')].some(j=>j.querySelector('h3')?.textContent==='Job #41'&&j.textContent.includes('Seeded API job history 41')&&j.textContent.includes('seeded-saved-model')),
  'Data sources':()=>document.querySelector('[data-source="okx"]')?.textContent.includes('Seeded API source status')===true,
  'Settings':()=>document.querySelector('.notification-settings')?.textContent.includes('Seeded Telegram status')===true&&document.querySelector('.ai-controls')?.textContent.includes('mistral · seeded-saved-model')===true,
  'What’s new':()=>/0\.7\.5/.test(document.querySelector('pre.changelog')?.textContent??'')};
 const noLoginRequired=()=>![...document.querySelectorAll('main [role=alert],main [role=status],main .error')].some(n=>/Login required/i.test(n.textContent));
 const loaded=async name=>{await page.waitForFunction(fn=>(0,eval)(fn)(),probes[name].toString());await page.waitForFunction(noLoginRequired);await page.waitForFunction(()=>window.pendingApi===0);};
 const signIn=async()=>{await dialog.getByLabel('Password').fill(password);await dialog.getByRole('button',{name:'Sign in and continue'}).click();await dialog.waitFor({state:'detached'});};
 const nav=async name=>{await page.getByRole('button',{name,exact:true}).click();await loaded(name)};
 // Every data-loading screen meets a real 401 with content absent, then fetches real seeded content in place.
 const screens=[];
 for(const name of Object.keys(probes)){
  console.log('SCREEN',name);
  await nav(name==='What’s new'?'Settings':'What’s new');assert.equal(await dialog.count(),0,'no dialog before '+name);expire();await page.getByRole('button',{name,exact:true}).click();await dialog.waitFor();
  const before=await page.evaluate(fn=>(0,eval)(fn)(),probes[name].toString());if(name!=='What’s new')assert.equal(before,false,name+' requires API data before sign-in');
  await signIn();await loaded(name);assert.equal(await page.locator('nav button[aria-current=page]').innerText(),name);
  screens.push({screen:name,contentBeforeSignIn:before,contentAfterSignIn:true});
 }
 check('All nine screens recover in place with actual API-backed content, not a static shell',{screens});
 // Settings: stable React chatId + checkbox + budget draft survive a slow post-login data refresh.
 await nav('Settings');await page.locator('input[name=chatId]').fill('987654321');await page.getByLabel('Enable telegram notifications',{exact:true}).check();await page.getByLabel('mistral daily token cap',{exact:true}).fill('98765');
 let delayEnabled=true;const delayed=[];
 await page.route(base+'/api/notifications',async route=>{const response=await route.fetch();if(delayEnabled&&response.status()===200){const start=Date.now();await new Promise(r=>setTimeout(r,1200));delayed.push({path:'/api/notifications',delayMs:Date.now()-start});}await route.fulfill({response});});
 expire();sql(db=>db.prepare('UPDATE notification_channels SET status=? WHERE channel=?').run('Seeded Telegram content after sign-in','telegram'));
 const settingsStart=responses.length;await page.getByRole('button',{name:'Check for app update',exact:true}).click();await dialog.waitFor();
 // Invalid login must not replay anything or lose the draft.
 await dialog.getByLabel('Password').fill('Wrong synthetic password');await dialog.getByRole('button',{name:'Sign in and continue'}).click();await dialog.getByRole('alert').filter({hasText:'Invalid login'}).waitFor();
 assert.equal(responses.slice(settingsStart).filter(r=>r.path==='/api/update/check').length,1);
 await signIn();await page.waitForFunction(()=>window.pendingApi===0);assert.deepEqual(responses.slice(settingsStart).filter(r=>r.path==='/api/update/check').map(r=>r.status),[401,200],'the originally blocked Settings action resumes once');await page.getByText('Checked public release metadata: current 0.7.5',{exact:true}).waitFor();await page.getByText(/Seeded Telegram content after sign-in/).waitFor();
 assert.equal(await page.locator('input[name=chatId]').inputValue(),'987654321');assert.equal(await page.getByLabel('Enable telegram notifications',{exact:true}).isChecked(),true);assert.equal(await page.getByLabel('mistral daily token cap',{exact:true}).inputValue(),'98765');
 assert.ok(delayed.some(x=>x.delayMs>=1200));assert.deepEqual(responses.slice(settingsStart).filter(r=>r.path==='/api/update/check').map(r=>r.status),[401,200]);delayEnabled=false;
 await page.locator('.notification-settings').screenshot({path:join(output,'settings-in-place-1440.png')});
 check('Settings: chatId, checkbox and budget draft unchanged after invalid/valid dialog login, one blocked-action replay and delayed notifications data load',{chatId:'987654321',enabled:true,dailyCap:'98765',delayed,actionStatuses:[401,200]});
 // Test bench: keep the SAME form node and all values when the resumed action sets a new result.
 await nav('Test bench');const form=page.locator('form:has(input[name=symbol])'),values={symbol:'ETH/USDT',capital:'12345',fast:'7',slow:'31',start:'2026-10-01',end:'2026-10-10',split:'2026-10-05'};
 for(const [k,v] of Object.entries(values))await form.locator(`input[name=${k}]`).fill(v);await form.locator('select[name=strategy]').selectOption('rsi');await form.locator('select[name=timeframe]').selectOption('1d');
 await form.evaluate(f=>window.originalBenchForm=f);const runBefore=(await api('backtests')).runs.length,start=responses.length;
 expire();await form.getByRole('button',{name:'Run backtest',exact:true}).click();await dialog.waitFor();await page.screenshot({path:join(output,'expired-run-backtest-1440.png')});await page.setViewportSize({width:390,height:900});await page.screenshot({path:join(output,'expired-run-backtest-390.png')});await page.setViewportSize({width:1440,height:1000});
 await signIn();await page.waitForFunction(()=>document.querySelector('.metrics')!==null&&document.querySelector('main form button.primary')?.textContent==='Run backtest');
 await page.waitForFunction(n=>document.querySelectorAll('.saved-run-list button').length>=n,runBefore+1);
 for(const [k,v] of Object.entries(values))assert.equal(await form.locator(`input[name=${k}]`).inputValue(),v,k);assert.equal(await form.locator('select[name=strategy]').inputValue(),'rsi');assert.equal(await form.evaluate(f=>f===window.originalBenchForm),true);
 assert.deepEqual(responses.slice(start).filter(r=>r.path==='/api/backtest').map(r=>r.status),[401,200]);assert.ok(responses.slice(start).some(r=>r.path==='/api/backtests'&&r.status===200));assert.equal((await api('backtests')).runs.length,runBefore+1);assert.ok(await page.getByRole('button',{name:'Open run #'+seededRun.runId,exact:true}).count());
 check('Test bench: typed values and form identity unchanged, blocked Run backtest resumes exactly once and saved runs load',{...values,strategy:'rsi',actionStatuses:[401,200],savedRuns:runBefore+1});
 // Data sources blocked save resumes with real server side effects; source cards are re-fetched.
 await nav('Data sources');const card=page.locator('[data-source="okx"]');await card.locator('form input[type=checkbox]').first().check();expire();await card.getByRole('button',{name:'Save source',exact:true}).click();await dialog.waitFor();await signIn();await card.getByText('Saved. Credentials are hidden.',{exact:true}).waitFor();assert.equal((await api('sources')).sources.find(s=>s.id==='okx').accepted,true);
 check('Data sources: blocked Save source resumes and persists acceptance');
 // Portfolio download: nothing is downloaded before login; the original click continues afterwards.
 await nav('Portfolio');const holding=page.locator('form:has(input[name=quantity])');await holding.locator('input[name=symbol]').fill('SOL/USDT');await holding.locator('input[name=quantity]').fill('2.5');let downloads=0;page.on('download',()=>downloads++);expire();await page.getByRole('link',{name:'Export CSV',exact:true}).click();await dialog.waitFor();assert.equal(downloads,0);const downloading=page.waitForEvent('download');await signIn();await downloading;assert.equal(downloads,1);
 expire();await holding.getByRole('button',{name:'Add holding',exact:true}).click();await dialog.waitFor();await signIn();await page.getByText('Paper holding saved',{exact:true}).waitFor();assert.equal(await holding.locator('input[name=symbol]').inputValue(),'SOL/USDT');assert.equal(await holding.locator('input[name=quantity]').inputValue(),'2.5');
 check('Portfolio: blocked CSV downloads only after sign-in; blocked add-holding resumes with form values kept');
 // Provider terms popup remains covered, with no page navigation.
 await nav('Data sources');const terms=page.getByRole('link',{name:'Provider terms'}).first();assert.equal(await terms.getAttribute('target'),'_blank');assert.equal(await terms.getAttribute('rel'),'noopener noreferrer');const [popup]=await Promise.all([context.waitForEvent('page'),terms.click()]);await popup.waitForLoadState();assert.notEqual(popup,page);await popup.close();
 check('Provider terms opens a new tab with noopener noreferrer and leaves the app on Data sources',{href:await terms.getAttribute('href')});
 // Workers: providers/models/goal stay in React state; a resumed POST creates exactly one job.
 await nav('Workers');await api('providers/mistral/controls',{dailyCap:0,rpm:9,noPortfolio:true});
 const job={goal:'Synthetic goal kept across sign-in',research:['deepseek','deepseek-chat'],reviewer:['mistral','mistral-small-latest']};await page.locator('textarea[name=goal]').fill(job.goal);
 for(const role of ['research','reviewer']){await page.getByLabel(role+' provider').selectOption(job[role][0]);await page.getByLabel(role+' model').fill(job[role][1]);}
 const jobsBefore=(await api('jobs')).jobs.length,jobStart=responses.length;expire();
 // Submit immediately, even if the existing worker-history poll also discovers expiry.
 await page.evaluate(()=>document.querySelector('form:has(textarea[name=goal])').requestSubmit());await dialog.waitFor();await signIn();
 await page.waitForFunction(goal=>[...document.querySelectorAll('article.job')].some(j=>j.querySelector('p')?.textContent===goal),job.goal);
 const actual=await page.evaluate(()=>({goal:document.querySelector('textarea[name=goal]').value,research:[document.querySelector('[aria-label="research provider"]').value,document.querySelector('[aria-label="research model"]').value],reviewer:[document.querySelector('[aria-label="reviewer provider"]').value,document.querySelector('[aria-label="reviewer model"]').value]}));assert.deepEqual(actual,job);
 assert.deepEqual(responses.slice(jobStart).filter(r=>r.path==='/api/jobs'&&r.method==='POST').map(r=>r.status),[401,200]);const jobs=(await api('jobs')).jobs;assert.equal(jobs.length,jobsBefore+1);assert.equal(jobs.filter(j=>j.goal===job.goal).length,1);assert.ok(await page.getByText('Seeded API job history 41',{exact:true}).count());
 await page.locator('form:has(textarea[name=goal])').screenshot({path:join(output,'workers-in-place-1440.png')});
 check('Workers: React goal/provider/model values unchanged, blocked Start job resumes exactly once and seeded history loads',{...job,actionStatuses:[401,200],jobCount:jobs.length});
 assert.equal(navigations,0,'no recovery may reload or navigate the app');assert.deepEqual(errors,[],'page errors');assert.equal(await page.evaluate(()=>sessionStorage.getItem('cryptotools-return')),null);
 check('No browser reload, no form snapshot in sessionStorage, no page errors',{navigations,errors});
 writeFileSync(join(output,'results.json'),JSON.stringify({transport:'synthetic external transports; real auth/actions/page API data',results},null,1));console.log('RESULT PASS',results.length,'checks; output',output);
}catch(error){if(failurePage){await failurePage.screenshot({path:join(output,'failure.png'),fullPage:true});writeFileSync(join(output,'failure.json'),JSON.stringify({error:String(error),responses:failureResponses,body:await failurePage.locator('body').innerText()},null,1));}throw error;}finally{await browser.close();server.kill('SIGTERM');await once(server,'exit');rmSync(dir,{recursive:true,force:true});}
