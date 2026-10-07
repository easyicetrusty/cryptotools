import {DatabaseSync} from 'node:sqlite';import {Market} from '../dist/market.js';import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('evidence-fix1',{recursive:true});mkdirSync('fix1-real-data',{recursive:true});const db=new DatabaseSync('fix1-real-data/app.sqlite'),market=new Market(db);
const end=Math.floor(Date.now()/86400000)*86400000,start=end-365*86400000;
const data=await market.ohlcv('kraken','BTC/USDT','1d',start,end);assert.equal(data.coverage.source,'public');assert.equal(data.coverage.partial,false);assert.equal(data.bars.length,365);
market.exchange('kraken').fetchOHLCV=async()=>{throw Error('Network disabled to prove provenance survives cache reuse')};assert.deepEqual(await market.ohlcv('kraken','BTC/USDT','1d',start,end),data);
writeFileSync('evidence-fix1/public-candles.json',JSON.stringify({capturedAt:new Date().toISOString(),...data},null,2));console.log('PASS fresh real public Kraken BTC/USDT daily history and network-disabled cache reuse',data.bars.length,JSON.stringify(data.coverage));db.close();
