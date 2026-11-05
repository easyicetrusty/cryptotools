import test from 'node:test';import assert from 'node:assert/strict';import {spawn,type ChildProcess} from 'node:child_process';import {readFileSync,mkdtempSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {DatabaseSync} from 'node:sqlite';
// Issue #1 follow-up: every user-data route must answer 401 without a valid session, including percent-encoded
// or otherwise disguised paths (GET /%61pi/portfolio returned holdings before 0.7.5).
const routes=[...readFileSync('src/server.ts','utf8').matchAll(/app\.(get|post|delete)(?:<[^>]*>)?\('([^']+)'/g)].map(m=>({method:m[1].toUpperCase(),path:m[2].replace(':id','1').replace(':channel','telegram'),pattern:m[2]}));
const publicPaths=new Set(['/health','/api/auth/state','/api/auth/setup','/api/auth/login']),guarded=routes.filter(r=>!publicPaths.has(r.pattern));
const disguise=(p:string)=>[p,'/%61pi/'+p.slice(5),'/api/%'+p.charCodeAt(5).toString(16)+p.slice(6),'//'+p.slice(1),p+'/',p.replace('/api/','/./api/'),p+'?x=1'];
async function server(data:string){const port=String(19000+Math.floor(Math.random()*900)),child=spawn(process.execPath,['dist/server.js'],{env:{...process.env,DATA_FILE:data,MASTER_SECRET:'auth-routes-test-master-synthetic-0123456789',PORT:port,HOST:'127.0.0.1',FEEDBACK_URL:'http://127.0.0.1:9/feedback'},stdio:'ignore'}),base='http://127.0.0.1:'+port;
 for(let i=0;i<150;i++){try{if((await fetch(base+'/health')).ok)return {child,base};}catch{}await new Promise(r=>setTimeout(r,100));}child.kill();throw Error('server did not start');}
const stop=(c:ChildProcess)=>new Promise(r=>{if(c.exitCode!==null)return r(null);c.once('exit',r);c.kill('SIGTERM');});
const call=(base:string,method:string,path:string,cookie?:string)=>fetch(base+path,{method,redirect:'manual',headers:{...(cookie?{cookie}:{}),...(method==='GET'?{}:{'content-type':'application/json'})},body:method==='POST'?'{}':undefined});
test('every user-data route returns 401 without a session, also for encoded and normalised paths; sessions persist across restart until idle expiry',async()=>{
 assert.ok(routes.length>=50,'route extraction found '+routes.length);for(const p of ['/api/backtests','/api/backtests/:id','/api/sources','/api/portfolio','/api/portfolio.csv','/api/settings','/api/providers','/api/notifications'])assert.ok(guarded.some(r=>r.pattern===p),p);
 const dir=mkdtempSync(join(tmpdir(),'auth-routes-')),data=join(dir,'app.sqlite');let s=await server(data);
 try{const ok=await fetch(s.base+'/api/auth/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:'auth routes synthetic password'})});assert.equal(ok.status,200);const cookie=ok.headers.get('set-cookie')!.split(';')[0];
  let checked=0;for(const r of guarded)for(const [i,p] of disguise(r.path).entries()){const res=await call(s.base,r.method,p);checked++;assert.ok(res.status>=400&&res.status<500,`${r.method} ${p} answered ${res.status} without a session`);if(i<3)assert.equal(res.status,401,`${r.method} ${p}`);}
  assert.equal(checked,guarded.length*7);
  for(const r of guarded)assert.equal((await call(s.base,r.method,r.path,'session='+'0'.repeat(64))).status,401,`forged token ${r.method} ${r.path}`);
  assert.equal((await call(s.base,'GET','/api/backtests',cookie)).status,200);
  await stop(s.child);s=await server(data);assert.equal((await call(s.base,'GET','/api/backtests',cookie)).status,200,'a valid session survives a restart');
  await stop(s.child);const db=new DatabaseSync(data);db.prepare('UPDATE sessions SET last_seen=?').run(Date.now()-31*60000);db.close();s=await server(data);
  for(const p of ['/api/sources','/api/backtests'])assert.equal((await call(s.base,'GET',p,cookie)).status,401,'idle session refused '+p);
 }finally{await stop(s.child);rmSync(dir,{recursive:true,force:true});}
});
