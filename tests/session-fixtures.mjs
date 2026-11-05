// Browser-test-only synthetic market transport. Normal server routes and authentication stay intact.
// No real market, AI, notification or update-provider request leaves this disposable server.
import {Market,intervals} from '../dist/market.js';
import {readFileSync} from 'node:fs';import {snapshot} from '../dist/market-rules.js';
const recorded=JSON.parse(readFileSync(new URL('./fixtures/market-rules-recorded-20261007.json',import.meta.url),'utf8'));
Market.prototype.rules=async function(exchange,symbol){const rec=recorded.find(r=>r.exchange===exchange);return snapshot(rec.adapter,{...rec.market,symbol},exchange,rec.capturedAt);};
Market.prototype.ohlcv=async function(exchange,symbol,timeframe,start,end){const step=intervals[timeframe],n=Math.floor((end-start)/step);const bars=Array.from({length:n},(_,i)=>[start+i*step,100+i,102+i,99+i,101+i,1000]);return {bars,coverage:{requestedStart:start,requestedEnd:end,actualStart:start,actualEnd:end,partial:false,source:'synthetic',exchange,cached:true,fetchedAt:null}};};
Market.prototype.ticker=async function(exchange,symbol){return {exchange,symbol,last:100,capturedAt:new Date().toISOString(),source:'synthetic',fetchedAt:null,status:'synthetic fixture'};};
globalThis.fetch=async url=>{if(String(url).startsWith('https://api.github.com/repos/easyicetrusty/cryptotools/releases?'))return Response.json([]);throw Error('Session fixture refuses external HTTP');};
