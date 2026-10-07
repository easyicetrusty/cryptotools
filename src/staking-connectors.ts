import {normalizeLido,type Option} from './staking.js';
const numeric=(v:any)=>(typeof v==='number'||(typeof v==='string'&&v.trim()!==''))&&Number.isFinite(Number(v))?Number(v):null;
const base=(id:string,asset:string,venue:string,sourceUrl:string,docsUrl:string,time:string):Option=>({dataAccess:['kraken-earn','binance-earn','okx-earn','defillama-pro'].some(prefix=>id.startsWith(prefix+':'))?'authenticated':'keyless',id,asset,venue,chain:'unknown',type:'exchange earn',apy:null,apr:null,rateType:'variable; other conditions unknown',baseApy:null,rewardApy:null,lockDays:null,lockUp:null,custody:'exchange holds coins',risks:[],riskSource:docsUrl,minimum:null,tvlUsd:null,source:venue+' API',sourceUrl,docsUrl,fetchedAt:time,sourceTimestamp:null,availability:'unknown',promo:null});
export function sourcePoolType(category:unknown){const known:Record<string,string>={'staking':'on-chain staking','liquid staking':'liquid staking','lending':'lending pool'};return typeof category==='string'?(known[category.toLowerCase().trim()]??'yield pool (classification unknown)'):'yield pool (classification unknown)';}
export const earnSources=['defillama','defillama-pro','lido','bybit-earn','kraken-earn','binance-earn','okx-earn'];
export function normalizeConnector(id:string,raw:any,time:string):Option[]{
 if(id==='lido')return normalizeLido(raw,time);
 if(id==='defillama'||id==='defillama-pro'){
 if(raw?.status!=='success'||!Array.isArray(raw.data))throw Error('Invalid yield pools');
 return raw.data.filter((p:any)=>typeof p.pool==='string'&&typeof p.symbol==='string'&&typeof p.project==='string').map((p:any)=>({...base(id+':'+p.pool,p.symbol,p.project,'https://yields.llama.fi/pools','https://api-docs.defillama.com/',time),chain:typeof p.chain==='string'?p.chain:'unknown',type:sourcePoolType(p.category),custody:'unknown',promo:typeof p.promo==='boolean'?p.promo:null,apy:numeric(p.apy),baseApy:numeric(p.apyBase),rewardApy:numeric(p.apyReward),tvlUsd:numeric(p.tvlUsd),source:id==='defillama-pro'?'DefiLlama Pro API':'DefiLlama free API',rateType:'variable APY; methodology in source docs'}));
 }
 if(id==='bybit-earn'){
 if(raw?.retCode!==0||!Array.isArray(raw?.result?.list))throw Error('Invalid Bybit products');
 return raw.result.list.filter((p:any)=>typeof p.coin==='string'&&p.status==='Available').map((p:any)=>{const o=base(id+':'+p.productId,p.coin,'Bybit','https://api.bybit.com/v5/earn/fixed-term/product','https://bybit-exchange.github.io/docs/v5/earn/fixed-term/product',time);const rewards=p.interestCoinApyList,rate=Array.isArray(rewards)&&rewards.length===1&&rewards[0].coin===p.coin&&/^\d+(?:\.\d+)?%$/.test(rewards[0].apy)?numeric(rewards[0].apy.slice(0,-1)):null;const days=/^\d+(?:\.\d+)?d$/.test(p.duration)?numeric(p.duration.slice(0,-1)):null;return {...o,apy:rate,rateType:p.tieredApyList?.length?'tiered APY (displayed rate unknown)':'product APY; terms may change',lockDays:days,lockUp:typeof p.duration==='string'?p.duration:null,minimum:numeric(p.minStakeAmount),sourceTimestamp:numeric(raw.time)!==null?new Date(Number(raw.time)).toISOString():null,...(p.tieredApyList?.length?{apy:null}:{})};});
 }
 if(id==='binance-earn'){
 if(!Array.isArray(raw?.rows))throw Error('Invalid Binance products');
 return raw.rows.filter((p:any)=>typeof p.asset==='string').map((p:any)=>{const r=numeric(p.latestAnnualPercentageRate);return {...base(id+':'+p.productId,p.asset,'Binance','https://api.binance.com/sapi/v1/simple-earn/flexible/list','https://developers.binance.com/docs/simple_earn/flexible-locked/earn',time),apr:r===null?null:r*100,rateType:'variable latest APR; excludes bonus tiers',minimum:numeric(p.minPurchaseAmount)};});
 }
 if(id==='kraken-earn'){
 if(!Array.isArray(raw?.result?.items)||raw.error?.length)throw Error('Invalid Kraken strategies');
 return raw.result.items.filter((p:any)=>typeof p.asset==='string').map((p:any)=>({...base(id+':'+p.id,p.asset,'Kraken','https://api.kraken.com/0/private/Earn/Strategies','https://docs.kraken.com/api-reference/earn/list-earn-strategies',time),rateType:numeric(p.apr_estimate?.low)!==null&&numeric(p.apr_estimate?.high)!==null?`APR estimate range ${numeric(p.apr_estimate.low)}% to ${numeric(p.apr_estimate.high)}%; single rate unknown`:'APR range; single comparable rate unknown',minimum:numeric(p.user_min_allocation),lockUp:typeof p.lock_type?.type==='string'?p.lock_type.type:null}));
 }
 if(id==='okx-earn'){
 if(raw?.code!=='0'||!Array.isArray(raw.data))throw Error('Invalid OKX offers');
 return raw.data.map((p:any)=>({...base(id+':'+p.productId,Array.isArray(p.investData)?p.investData.map((x:any)=>x.ccy).join(' / '):'unknown','OKX','https://www.okx.com/api/v5/finance/staking-defi/offers','https://www.okx.com/docs-v5/en/#financial-product-staking-get-offers',time),apy:null,apr:null,rateType:numeric(p.apy)!==null?`Estimated annualization ${Number(p.apy)*100}%; APR/APY basis unverified`:'provider estimated rate; APR/APY basis unverified',minimum:p.investData?.length===1?numeric(p.investData[0].minAmt):null}));
 }
 throw Error('Unknown staking connector');
}
