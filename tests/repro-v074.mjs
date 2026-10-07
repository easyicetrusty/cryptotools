import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {createServer as httpServer} from 'node:http';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {createServer} from 'node:net';
const root=process.cwd(),dir=mkdtempSync(join(process.env.REPRO_ROOT??tmpdir(),'v074-repro-')),port=18084,feedbackPort=18085;
const master='CTREVIEW-MASTER-synthetic-notlive-'.repeat(2),password='CTREVIEW-LOGIN-synthetic-notlive';
const base='http://127.0.0.1:'+port,children=[];let cookie='',failures=0;
const start=(file,p,data,extra={})=>{const c=spawn(process.execPath,['dist/'+file],{cwd:root,env:{...process.env,PORT:String(p),HOST:'127.0.0.1',DATA_FILE:join(dir,data),MASTER_SECRET:master,FEEDBACK_URL:'http://127.0.0.1:'+feedbackPort+'/feedback',...extra},stdio:['ignore','ignore','ignore']});children.push(c);return c;};
function check(name,ok,details){console.log(JSON.stringify({check:name,result:ok?'PASS':'FAIL',details}));if(!ok)failures++;}
async function api(path,body,method='POST',auth=cookie){const r=await fetch(base+'/api/'+path,{method:body===undefined?'GET':method,headers:{'content-type':'application/json',cookie:auth},...(body===undefined?{}:{body:JSON.stringify(body)})});const b=await r.json();return {status:r.status,body:b,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
try{
start('feedback.js',feedbackPort,'feedback.sqlite');start('server.js',port,'app.sqlite');
for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
cookie=(await api('auth/setup',{password})).cookie;
const version=(await (await fetch(base+'/health')).json()).version;
const telegram='6012345678:CTREVIEW-TGTOKEN-synthetic-01234567890123456789',smtp='CTREVIEW-SMTPPASS-synthetic-notlive';
await api('notifications/telegram',{enabled:false,events:[],credentials:{token:telegram,chatId:'12345'}});
await api('notifications/email',{enabled:true,events:[],credentials:{host:'127.0.0.1',port:587,secure:false,user:'fixture',password:smtp,from:'fixture@example.org',to:'fixture@example.org'}});
const keys={gemini:'AIzaCTREVIEW-synthetic-012345678901234567890',mistral:'CTREVIEW-MISTRAL-synthetic-notlive',anthropic:'sk-ant-CTREVIEW-synthetic-notlive',openai:'CTREVIEW-OPENAI-synthetic-notlive',deepseek:'CTREVIEW-DEEPSEEK-synthetic-notlive',openrouter:'CTREVIEW-OPENROUTER-synthetic-notlive',zen:'CTREVIEW-ZEN-synthetic-notlive',ollama:'CTREVIEW-OLLAMA-synthetic-notlive'};
for(const [provider,key] of Object.entries(keys)){const saved=await api('providers',{provider,model:'fixture',key,baseUrl:provider==='ollama'?'https://example.com/v1':''});check('stored fixture '+provider,saved.status===200,{status:saved.status});}
const source='CTREVIEW-SRCKEY-synthetic-notlive',secret='CTREVIEW-SRCSECRET-synthetic-notlive',passphrase='CTREVIEW-PASSPHRASE-synthetic-notlive';
await api('sources/okx-earn',{enabled:false,accepted:true,credentials:{key:source,secret,passphrase}});
await api('sources/defillama-pro',{enabled:false,accepted:true,credentials:{key:'CTREVIEW-LLAMA-synthetic-notlive'}});
const pending=await api('auth/totp/start',{});
if(process.env.CANARY_HOME){mkdirSync(join(process.env.CANARY_HOME,'.hermes'),{recursive:true});const values={...keys,telegram,smtp,source,secret,passphrase,llama:'CTREVIEW-LLAMA-synthetic-notlive',master,totp:pending.body.secret,password};writeFileSync(join(process.env.CANARY_HOME,'.hermes/.env'),Object.entries(values).map(([label,value])=>'CANARY_'+label.toUpperCase()+'_SECRET='+value).join('\n')+'\n',{mode:0o600});}
for(const [label,value] of Object.entries({...keys,telegram,smtp,source,secret,passphrase,llama:'CTREVIEW-LLAMA-synthetic-notlive',master,totp:pending.body.secret,jwt:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmaXh0dXJlIn0.syntheticSignature012345',pem:'-----BEGIN PRIVATE KEY----- fixture -----END PRIVATE KEY-----'})){
const r=await api('feedback',{comment:'Diagnostic text '+value,version,screen:'settings'});check('feedback blocks '+label,r.status===400&&/sensitive/i.test(r.body.error??''),{status:r.status,error:r.body.error??null});}
const clean=await api('feedback',{comment:'The settings form is easy to find.',version,screen:'settings'});check('clean feedback accepted',clean.status===201,{status:clean.status});
let requests=0;const mock=httpServer((req,res)=>{requests++;req.resume();res.end(JSON.stringify({choices:[{message:{role:'assistant',content:'Observed facts only.'}}]}));});await new Promise(r=>mock.listen(0,'127.0.0.1',r));
try{const url='http://127.0.0.1:'+mock.address().port+'/v1';const configured=await api('providers',{provider:'ollama',model:'fixture',key:keys.ollama,baseUrl:url,allowLocalOllama:true});check('explicit loopback Ollama fixture saved',configured.status===200,{status:configured.status});await api('providers/ollama/approve',{confirm:true,model:'fixture',baseUrl:url});
const blocked=await api('chat',{provider:'ollama',model:'fixture',prompt:'Diagnostic '+smtp});check('AI secret prompt refused before network',blocked.status===400&&requests===0&&/Nothing was sent/.test(blocked.body.error??''),{status:blocked.status,requests,error:blocked.body.error});const job=await api('jobs',{goal:'Diagnostic '+smtp,workers:['research','backtest','risk','reviewer'].map(role=>({role,provider:role==='reviewer'?'openai':'ollama',model:'fixture'}))});check('worker secret goal refused before network',job.status===400&&requests===0&&/Nothing was sent/.test(job.body.error??''),{status:job.status,requests,error:job.body.error});const clean=await api('chat',{provider:'ollama',model:'fixture',prompt:'Read observed facts only.'});check('clean AI request reaches pinned loopback fixture',clean.status===200&&requests===1,{status:clean.status,requests});}finally{await new Promise(r=>mock.close(r));}
let connects=0;const listener=createServer(socket=>{connects++;socket.end('220 fixture\r\n');});await new Promise((r,j)=>{listener.once('error',j);listener.listen(587,'127.0.0.1',r)});
const smtpResult=await api('notifications/email/test',{});await new Promise(r=>setTimeout(r,100));check('SMTP default prevents internal connection',connects===0,{connections:connects,result:smtpResult.body});
const toggle=await api('notifications/email',{enabled:true,events:[],allowPrivate:true});check('SMTP explicit override can be saved',toggle.status===200,{status:toggle.status});const prior=connects;await api('notifications/email/test',{});await new Promise(r=>setTimeout(r,100));check('SMTP explicit override permits the local listener',connects===prior+1,{newConnections:connects-prior});listener.close();
const local=await api('providers',{provider:'openai',model:'fixture',key:'',baseUrl:'http://127.0.0.1:9999/v1'});check('custom AI loopback denied',local.status===400,{status:local.status,error:local.body.error??null});
const old=cookie;await api('auth/logout',{});check('logout invalidates bearer', (await api('settings',undefined,'GET',old)).status===401,{status:(await api('settings',undefined,'GET',old)).status});
console.log(JSON.stringify({failures,capturedAt:new Date().toISOString(),dataDirectory:process.env.KEEP_REPRO==='1'?dir:'removed'}));
}finally{for(const c of children)c.kill('SIGTERM');await Promise.all(children.map(c=>new Promise(r=>c.exitCode!==null?r():c.once('exit',r))));if(process.env.KEEP_REPRO!=='1')rmSync(dir,{recursive:true,force:true});}
process.exitCode=failures?1:0;
