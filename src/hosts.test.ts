import test from 'node:test';import assert from 'node:assert/strict';import {spawn,type ChildProcess} from 'node:child_process';import {mkdtempSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {request} from 'node:http';import {connect} from 'node:net';
import {allowedHosts,hostAllowed,hostName} from './hosts.js';
// DNS rebinding: a page on another site whose name resolves to 127.0.0.1 sends its own name as Host. The app must refuse
// it before any route, including /api/auth/*, while loopback names and APP_ALLOWED_HOSTS entries keep working.
test('hostName and hostAllowed accept loopback names and listed hosts only',()=>{
 const base=allowedHosts(''),listed=allowedHosts(' Box.LAN , example.test:9999,');
 for(const h of ['127.0.0.1','127.0.0.1:8080','localhost','LOCALHOST:8080','localhost.','[::1]','[::1]:8080'])assert.ok(hostAllowed(h,base),h);
 for(const h of [undefined,'','evil.example','evil.example:8080','localhost.evil.example','127.0.0.1.nip.io','127.0.0.2','0.0.0.0:8080','[::2]:8080','user@localhost','localhost/x','box.lan:8080'])assert.ok(!hostAllowed(h,base),String(h));
 assert.ok(hostAllowed('box.lan:8080',listed));assert.ok(hostAllowed('BOX.lan',listed));assert.ok(hostAllowed('example.test:9999',listed));assert.ok(!hostAllowed('example.test:1',listed));assert.ok(!hostAllowed('example.test',listed));
 assert.equal(hostName('[::1]:8080'),'[::1]');assert.equal(hostName('a:b:c'),null);
});
async function server(data:string,extra:Record<string,string>={}){const port=19000+Math.floor(Math.random()*900),child=spawn(process.execPath,['dist/server.js'],{env:{...process.env,DATA_FILE:data,MASTER_SECRET:'hosts-test-master-synthetic-0123456789abc',PORT:String(port),HOST:'127.0.0.1',FEEDBACK_URL:'http://127.0.0.1:9/feedback',APP_ALLOWED_HOSTS:'',...extra},stdio:'ignore'});
 for(let i=0;i<150;i++){try{if((await fetch(`http://127.0.0.1:${port}/health`)).ok)return {child,port};}catch{}await new Promise(r=>setTimeout(r,100));}child.kill();throw Error('server did not start');}
const stop=(c:ChildProcess)=>new Promise(r=>{if(c.exitCode!==null)return r(null);c.once('exit',r);c.kill('SIGTERM');});
// node:http lets the test set any Host header, as a rebinding browser would.
const call=(port:number,host:string,method:string,path:string,headers:Record<string,string>={},body?:string)=>new Promise<{status:number,body:string}>((ok,fail)=>{const r=request({host:'127.0.0.1',port,method,path,headers:{host,...headers}},res=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>ok({status:res.statusCode!,body:b}))});r.on('error',fail);r.end(body);});
const noHost=(port:number)=>new Promise<string>((ok,fail)=>{const s=connect(port,'127.0.0.1',()=>s.write('GET /api/auth/state HTTP/1.0\r\n\r\n'));let b='';s.on('data',c=>b+=c);s.on('end',()=>ok(b.split('\r\n')[0]));s.on('error',fail);});
test('the server answers 421 to a foreign Host on every path, keeps loopback and APP_ALLOWED_HOSTS working, and keeps the Origin check',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'hosts-')),data=join(dir,'app.sqlite');let s=await server(data);
 try{const json={'content-type':'application/json'},password=JSON.stringify({password:'hosts synthetic password 0123'});
  const setup=await call(s.port,'127.0.0.1:'+s.port,'POST','/api/auth/setup',json,password);assert.equal(setup.status,200,setup.body);
  const login=await call(s.port,'localhost:'+s.port,'POST','/api/auth/login',json,password);assert.equal(login.status,200,login.body);
  for(const host of ['127.0.0.1:'+s.port,'localhost:'+s.port,'[::1]:'+s.port])assert.equal((await call(s.port,host,'GET','/api/auth/state')).status,200,host);
  const foreign=['evil.example:'+s.port,'localhost.evil.example:'+s.port,'127.0.0.1.nip.io:'+s.port,'box.lan:'+s.port];
  for(const host of foreign)for(const [method,path,body] of [['GET','/api/auth/state'],['POST','/api/auth/login',password],['GET','/api/settings'],['GET','/api/portfolio'],['GET','/%61pi/portfolio'],['GET','/'],['GET','/health']] as [string,string,string?][]){
   const r=await call(s.port,host,method,path,body?json:{},body);assert.equal(r.status,421,`${host} ${method} ${path} -> ${r.status} ${r.body}`);assert.match(r.body,/Host not allowed/);}
  assert.match(await noHost(s.port),/ 4(00|21) /,'a request without Host is refused');
  // The Origin check still applies to allowed hosts.
  const cross=await call(s.port,'127.0.0.1:'+s.port,'POST','/api/auth/login',{...json,origin:'http://evil.example'},password);assert.equal(cross.status,403,cross.body);
  await stop(s.child);s=await server(data,{APP_ALLOWED_HOSTS:'box.lan, other.test:9999'});
  assert.equal((await call(s.port,'box.lan:'+s.port,'GET','/api/auth/state')).status,200,'listed host');assert.equal((await call(s.port,'other.test:9999','GET','/api/auth/state')).status,200,'listed host:port');
  assert.equal((await call(s.port,'other.test:'+s.port,'GET','/api/auth/state')).status,421,'listed host on another port');assert.equal((await call(s.port,'evil.example:'+s.port,'GET','/api/auth/state')).status,421,'unlisted host');
  assert.equal((await call(s.port,'127.0.0.1:'+s.port,'GET','/api/auth/state')).status,200,'loopback stays allowed');
 }finally{await stop(s.child);rmSync(dir,{recursive:true,force:true});}
});
