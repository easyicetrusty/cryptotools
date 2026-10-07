import type {DatabaseSync} from 'node:sqlite';

export const lidoURL='https://eth-api.lido.fi/v1/protocol/steth/apr/sma';
export const cacheMs=15*60*1000, sourceStaleMs=36*60*60*1000;
export const stakingNotice='Information only, not financial advice. Rates change; check the venue. EU/France availability is unknown unless stated by a source. Unknown is not zero. APR and APY are different measures.';
export type Option={id:string,asset:string,venue:string,chain:string,type:string,apy:number|null,apr:number|null,rateType:string,baseApy:number|null,rewardApy:number|null,lockDays:number|null,lockUp:string|null,custody:string,risks:string[],riskSource:string,minimum:number|null,tvlUsd:number|null,source:string,sourceUrl:string,docsUrl:string,fetchedAt:string,sourceTimestamp:string|null,availability:string,promo:boolean|null};
export const sortKeys=['asset','venue','type','apy','apr','rateType','lockDays','custody','risks','minimum','tvlUsd','source','fetchedAt','sourceTimestamp'] as const;
export type SortKey=typeof sortKeys[number];
export type Filters={asset?:string,type?:string,custody?:string,maxLockDays?:number,minTvlUsd?:number,hidePromo?:boolean,sort?:SortKey,direction?:'asc'|'desc'};
export const types=['exchange earn','on-chain staking','liquid staking','lending pool'];
export const custodies=['exchange holds coins','user on-chain','unknown'];
export const filtersSchema={type:'object',additionalProperties:false,properties:{asset:{type:'string',maxLength:32},type:{type:'string',enum:types},custody:{type:'string',enum:custodies},maxLockDays:{type:'number',minimum:0,maximum:36500},minTvlUsd:{type:'number',minimum:0,maximum:1e15},hidePromo:{type:'boolean'},sort:{type:'string',enum:sortKeys},direction:{type:'string',enum:['asc','desc']}}};
export function validateFilters(input:unknown):Filters {
 if(input===undefined)return {};
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid filters');
 const f=input as any;
 if(Object.keys(f).some(k=>!Object.keys(filtersSchema.properties).includes(k)))throw Error('Unknown filter');
 if(f.asset!==undefined&&(typeof f.asset!=='string'||f.asset.length>32))throw Error('Invalid asset');
 for(const [k,values] of [['type',types],['custody',custodies],['sort',sortKeys],['direction',['asc','desc']]] as const)if(f[k]!==undefined&&!(values as readonly string[]).includes(f[k]))throw Error('Invalid '+k);
 for(const [k,max] of [['maxLockDays',36500],['minTvlUsd',1e15]] as const)if(f[k]!==undefined&&(typeof f[k]!=='number'||!Number.isFinite(f[k])||f[k]<0||f[k]>max))throw Error('Invalid '+k);
 if(f.hidePromo!==undefined&&typeof f.hidePromo!=='boolean')throw Error('Invalid promo filter');
 return f;
}
const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;
export function normalizeLido(raw:any,fetchedAt:string):Option[] {
 if(!Number.isFinite(Date.parse(fetchedAt))||raw?.meta?.symbol!=='stETH'||raw.meta.chainId!==1||raw.meta.address?.toLowerCase()!=='0xae7ab96520de3a18e5e111b5eaab095312d7fe84'||number(raw?.data?.smaApr)===null||!Array.isArray(raw.data.aprs))throw Error('Invalid Lido response');
 const times=raw.data.aprs.map((p:any)=>number(p.timeUnix)).filter((t:any)=>t!==null&&t>0&&t*1000<=Date.parse(fetchedAt)+86400000);
 const sourceTimestamp=times.length?new Date(Math.max(...times)*1000).toISOString():null;
 return [{id:'lido:ethereum:steth',asset:'ETH / stETH',venue:'Lido',chain:'Ethereum',type:'liquid staking',apy:null,apr:raw.data.smaApr,rateType:'variable (7-day SMA APR)',baseApy:null,rewardApy:null,lockDays:null,lockUp:null,custody:'user on-chain',risks:['slashing','smart contract','depeg'],riskSource:'https://docs.lido.fi/prd/',minimum:null,tvlUsd:null,source:'Lido public API',sourceUrl:lidoURL,docsUrl:'https://docs.lido.fi/integrations/api/',fetchedAt,sourceTimestamp,availability:'unknown',promo:null}];
}
export function ageSeconds(timestamp:string|null,now:number):number|null {
 if(timestamp===null||!Number.isFinite(Date.parse(timestamp)))return null;
 return Math.max(0,Math.floor((now-Date.parse(timestamp))/1000));
}
export function selectOptions(options:Option[],input:unknown,now=Date.now()) {
 const f=validateFilters(input),key=f.sort??'asset',direction=f.direction??'asc';
 const result=options.filter(o=>(!f.asset||o.asset.toLowerCase().includes(f.asset.toLowerCase()))&&(!f.type||o.type===f.type)&&(!f.custody||o.custody===f.custody)&&(f.maxLockDays===undefined||(o.lockDays!==null&&o.lockDays<=f.maxLockDays))&&(f.minTvlUsd===undefined||(o.tvlUsd!==null&&o.tvlUsd>=f.minTvlUsd))&&(!f.hidePromo||o.promo===false));
 result.sort((a,b)=>{const x=Array.isArray(a[key])?(a[key] as string[]).join(', '):a[key],y=Array.isArray(b[key])?(b[key] as string[]).join(', '):b[key];if(x===null&&y!==null)return 1;if(y===null&&x!==null)return -1;const c=x===null&&y===null?0:typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),'en');return (direction==='asc'?c:-c)||a.id.localeCompare(b.id,'en');});
 return result.map(o=>{const fetchedAgeSeconds=ageSeconds(o.fetchedAt,now),sourceAgeSeconds=ageSeconds(o.sourceTimestamp,now);return {...o,fetchedAgeSeconds,sourceAgeSeconds,freshness:fetchedAgeSeconds===null||fetchedAgeSeconds*1000>=cacheMs?'stale cached snapshot':'cached snapshot',sourceFreshness:sourceAgeSeconds===null?'unknown':sourceAgeSeconds*1000>=sourceStaleMs?'stale source observation':'source observation'};});
}
export const sourceCoverage=[
 {source:'Lido',status:'implemented',detail:'One liquid-staking option. Public read-only integration API; APR, not APY. API quota unspecified in checked docs; app refresh limited to once per 15 minutes.'},
 {source:'DefiLlama',status:'permission required',detail:'Public pools API works, but current terms restrict commercial use and republishing. Excluded pending written permission.'},
 {source:'Bybit',status:'reuse permission unverified',detail:'Fixed-term products are public (50 requests/second/IP documented); reuse terms unresolved. Excluded, not key-required.'},
 {source:'OKX',status:'needs read-only key, later',detail:'Earn product endpoints authenticated; public borrow rates are not earn APY. API reuse restrictions also require permission.'},
 {source:'Kraken',status:'needs read-only key, later',detail:'Earn strategies endpoint is private; no exchange keys in this beta.'},
 {source:'Binance',status:'needs read-only key, later',detail:'Simple Earn product listing is private; no exchange keys in this beta.'}
];
export class Staking {
 private inflight:Promise<void>|undefined;
 constructor(private db:DatabaseSync,private fetcher:typeof fetch=fetch,private clock=Date.now){db.exec('CREATE TABLE IF NOT EXISTS staking_cache(source TEXT PRIMARY KEY,payload TEXT NOT NULL,fetched_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS staking_attempts(source TEXT PRIMARY KEY,retry_at INTEGER NOT NULL,error INTEGER NOT NULL)');}
 private async refresh(){
 const now=this.clock(),row=this.db.prepare('SELECT * FROM staking_cache WHERE source=?').get('lido') as any,attempt=this.db.prepare('SELECT * FROM staking_attempts WHERE source=?').get('lido') as any;
 if((row&&ageSeconds(row.fetched_at,now)!==null&&now-Date.parse(row.fetched_at)<cacheMs)||(attempt&&attempt.retry_at>now))return;
 // Persist before fetching: restarts and failures cannot cause a hot polling loop.
 this.db.prepare('INSERT OR REPLACE INTO staking_attempts VALUES(?,?,?)').run('lido',now+cacheMs,0);
 try{const r=await this.fetcher(lidoURL,{signal:AbortSignal.timeout(10000),headers:{accept:'application/json'}});if(!r.ok)throw Error('Source unavailable');const raw=await r.json(),fetchedAt=new Date(this.clock()).toISOString();normalizeLido(raw,fetchedAt);this.db.prepare('INSERT OR REPLACE INTO staking_cache VALUES(?,?,?)').run('lido',JSON.stringify(raw),fetchedAt);this.db.prepare('UPDATE staking_attempts SET error=0 WHERE source=?').run('lido');}
 catch{this.db.prepare('UPDATE staking_attempts SET error=1 WHERE source=?').run('lido');}
 }
 async getOptions(input:unknown={}){
 const filters=validateFilters(input);
 if(!this.inflight)this.inflight=this.refresh().finally(()=>{this.inflight=undefined;});await this.inflight;
 const now=this.clock(),row=this.db.prepare('SELECT * FROM staking_cache WHERE source=?').get('lido') as any,attempt=this.db.prepare('SELECT * FROM staking_attempts WHERE source=?').get('lido') as any;
 let rows:Option[]=[];try{if(row)rows=normalizeLido(JSON.parse(row.payload),row.fetched_at);}catch{/* Corrupt cache must never become plausible data. */}
 return {options:selectOptions(rows,filters,now),total:rows.length,sort:{column:filters.sort??'asset',direction:filters.direction??'asc'},asOf:new Date(now).toISOString(),sourceStatus:attempt?.error?'Source fetch failed; cached data may be stale.':rows.length?'Timestamped snapshot; never a live rate.':'Data unavailable; retry after cache cooldown.',coverage:sourceCoverage,notice:stakingNotice};
 }
}
