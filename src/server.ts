import ccxt from 'ccxt';
import staticPlugin from '@fastify/static';
import {resolve} from 'node:path';
import {database,service,host,port,version,feedbackSchema,safeComment,type Feedback} from './common.js';
const app=service();
const db=database(process.env.DATA_FILE ?? '/data/app.sqlite');
db.exec('CREATE TABLE IF NOT EXISTS ticker_cache (exchange TEXT PRIMARY KEY, payload TEXT NOT NULL, captured_at TEXT NOT NULL)');
const feedbackURL=new URL(process.env.FEEDBACK_URL ?? 'http://feedback:8081/feedback');
if(!['http:','https:'].includes(feedbackURL.protocol)||feedbackURL.username||feedbackURL.password)throw new Error('Invalid feedback URL');
const selected=(process.env.EXCHANGES ?? 'kraken,okx').split(',');
const exchanges=selected.map(id=>{if(!['kraken','okx'].includes(id))throw new Error('Only audited public spot adapters allowed'); const Constructor=ccxt[id as 'kraken'|'okx'];const ex=new Constructor({enableRateLimit:true,timeout:15000,options:{defaultType:'spot',fetchMarkets:{types:['spot']}}});
// Fail closed before network I/O. Only public market/ticker paths used by these adapters.
const original=ex.fetch.bind(ex); ex.fetch=async(url:string,method='GET',headers?:any,body?:any)=>{const u=new URL(url);const allowed=(u.hostname==='api.kraken.com'&&u.pathname.startsWith('/0/public/'))||(u.hostname==='www.okx.com'&&/^\/api\/v5\/(public|market)\//.test(u.pathname));if(!allowed||method!=='GET'||body)throw new Error('Public data boundary violation');console.log(JSON.stringify({publicRequest:method,url}));return original(url,method,headers,body)}; return ex;});
let inFlight:Promise<unknown>|undefined;
async function tickers(){return Promise.all(exchanges.map(async ex=>{try {const t=await ex.fetchTicker('BTC/USDT');if(!Number.isFinite(t.last)||Number(t.last)<=0)throw new Error('Invalid ticker');const row={exchange:ex.id,symbol:t.symbol,last:t.last,bid:t.bid,ask:t.ask,exchangeTimestamp:t.timestamp,capturedAt:new Date().toISOString()};db.prepare('INSERT OR REPLACE INTO ticker_cache VALUES(?,?,?)').run(ex.id,JSON.stringify(row),row.capturedAt);return {...row,status:'live'};}catch{return {exchange:ex.id,symbol:'BTC/USDT',status:'unavailable',error:'Public exchange request failed; retry later.'};}}));}
app.get('/health',async()=>({ok:true,role:'app',version,node:process.version,mode:'public-data-only'}));
app.get('/api/tickers',async()=>{if(!inFlight)inFlight=tickers().finally(()=>{inFlight=undefined});return {version,tickers:await inFlight};});
app.post<{Body:Feedback}>('/api/feedback',{schema:{body:feedbackSchema}},async(req,reply)=>{if(!safeComment(req.body.comment))return reply.code(400).send({error:'Remove sensitive information.'});try{const response=await fetch(feedbackURL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(req.body),signal:AbortSignal.timeout(5000)});if(!response.ok)return reply.code(502).send({error:'Feedback service rejected the request'});return reply.code(201).send(await response.json());}catch{return reply.code(503).send({error:'Feedback is unavailable. Please retry.'});}});
await app.register(staticPlugin,{root:resolve('public')});
await app.listen({host,port});
for(const signal of ['SIGTERM','SIGINT'] as const)process.on(signal,async()=>{await app.close();db.close();process.exit(0)});
