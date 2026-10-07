import ccxt from 'ccxt';
import type {DatabaseSync} from 'node:sqlite';
import {publicExchange} from './market.js';
export const catalog=[
 ...['kraken','okx','bybit','binance','coinbase'].map(id=>({id,name:({kraken:'Kraken',okx:'OKX',bybit:'Bybit',binance:'Binance',coinbase:'Coinbase Exchange'} as any)[id],provides:'Spot prices, closed-candle history and public trend metrics where supported',key:false,exchange:id,terms:({kraken:'https://www.kraken.com/legal',okx:'https://www.okx.com/help/okx-api-agreement',bybit:'https://www.bybit.com/en/help-center/article/Bybit-Terms-and-Conditions',binance:'https://www.binance.com/en/terms',coinbase:'https://www.coinbase.com/legal/user_agreement/united_states'} as any)[id],docs:({kraken:'https://docs.kraken.com/api/',okx:'https://www.okx.com/docs-v5/en/',bybit:'https://bybit-exchange.github.io/docs/v5/market/tickers',binance:'https://developers.binance.com/docs/binance-spot-api-docs/rest-api',coinbase:'https://docs.cdp.coinbase.com/exchange/introduction/welcome'} as any)[id]})),
 {id:'defillama',name:'DefiLlama free',provides:'Yield pools, APY and TVL',key:false,terms:'https://defillama.com/terms',docs:'https://api-docs.defillama.com/'},
 {id:'defillama-pro',name:'DefiLlama Pro',provides:'Yield pools, APY and TVL via your subscription',key:true,terms:'https://defillama.com/terms',docs:'https://api-docs.defillama.com/'},
 {id:'lido',name:'Lido',provides:'stETH 7-day SMA APR (not APY)',key:false,terms:'https://lido.fi/terms-of-use',docs:'https://docs.lido.fi/integrations/api/'},
 {id:'bybit-earn',name:'Bybit earn listings',provides:'Public fixed-term product listings',key:false,terms:'https://www.bybit.com/en/help-center/article/Bybit-Terms-and-Conditions',docs:'https://bybit-exchange.github.io/docs/v5/earn/fixed-term/product'},
 ...['kraken','binance','okx'].map(exchange=>({id:exchange+'-earn',exchange,name:exchange[0].toUpperCase()+exchange.slice(1)+' earn listings',provides:'Read-only authenticated product listings; not yet tested with a real key',key:true,terms:({kraken:'https://www.kraken.com/legal',binance:'https://www.binance.com/en/terms',okx:'https://www.okx.com/help/okx-api-agreement'} as any)[exchange],docs:({kraken:'https://docs.kraken.com/api-reference/earn/list-earn-strategies',binance:'https://developers.binance.com/docs/simple_earn/flexible-locked/earn',okx:'https://www.okx.com/docs-v5/en/#financial-product-staking-get-offers'} as any)[exchange]}))
];
export type Credentials={key:string,secret?:string,passphrase?:string};
type Crypt={encrypt:(s:string)=>string,decrypt:(s:string)=>string};
export type SourceAccess={enabled:(id:string)=>boolean,require:(id:string)=>void,fetchData:(id:string)=>Promise<any>,list:()=>any[]};
export function checkPermissions(id:string,raw:any){
 if(id==='binance-earn'){
  const flags=['enableReading','enableWithdrawals','enableSpotAndMarginTrading','enableMargin','enableFutures','enableVanillaOptions','enableInternalTransfer','permitsUniversalTransfer','enablePortfolioMarginTrading'];
  if(flags.slice(0,8).some(k=>typeof raw?.[k]!=='boolean')||raw.enableReading!==true||flags.slice(1).some(k=>raw[k]!==undefined&&raw[k]!==false)||Object.keys(raw).some(k=>/^(enable|permit)/.test(k)&&k!=='enableReading'&&raw[k]!==false))throw Error('Key permissions refused');
  return 'Read-only permissions checked with Binance API restrictions endpoint.';
 }
 if(id==='okx-earn'){
  if(raw?.code!=='0'||!Array.isArray(raw.data)||raw.data.length!==1||typeof raw.data[0].perm!=='string')throw Error('Permissions unverified');
  const perms=raw.data[0].perm.split(',').map((s:string)=>s.trim());if(perms.length!==1||perms[0]!=='read_only')throw Error('Key permissions refused');
  return 'Read-only permission checked with OKX account config.';
 }
 if(id==='kraken-earn'){
 const perms=raw?.result?.permissions,allowed=['query-funds','query-open-trades','query-closed-trades','query-ledger','query-ledgers','query-trades-history'];
 if(!Array.isArray(raw?.error)||raw.error.length||!Array.isArray(perms)||perms.some((p:any)=>!allowed.includes(p)))throw Error('Key permissions refused or unverified');
 return 'Read-only permissions checked with Kraken GetApiKeyInfo.';
 }
 throw Error('Permissions cannot be checked by this connector; use a read-only key.');
}
export function privateReader(id:string,c:Credentials,guard:()=>void=()=>{}){
 const exchange=id.replace('-earn',''),C=(ccxt as any)[exchange],ex=new C({apiKey:c.key,secret:c.secret,password:c.passphrase,enableRateLimit:true,timeout:10000});
 const original=ex.fetch.bind(ex);
 const rules:Record<string,[string,string[]]>={
 'binance-earn':['api.binance.com',['/sapi/v1/account/apiRestrictions','/sapi/v1/simple-earn/flexible/list']],
 'okx-earn':['www.okx.com',['/api/v5/account/config','/api/v5/finance/staking-defi/offers']],
 'kraken-earn':['api.kraken.com',['/0/private/Earn/Strategies','/0/private/GetApiKeyInfo']]
 };
 ex.fetch=async(url:string,method='GET',headers?:any,body?:any)=>{guard();const u=new URL(url),[host,paths]=rules[id];if(u.hostname!==host||!paths.includes(u.pathname)||method!==(id==='kraken-earn'?'POST':'GET'))throw Error('Read-only endpoint boundary');return original(url,method,headers,body);};return ex;
}
export class DataSources implements SourceAccess {
 constructor(private db:DatabaseSync,private crypt:Crypt,readonly sandbox=process.env.CRYPTOTOOLS_SANDBOX==='1',private fetcher:typeof fetch=fetch,private reader=privateReader,private marketReader=publicExchange){
 const exists=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='data_sources'").get();
 db.exec('CREATE TABLE IF NOT EXISTS data_sources(id TEXT PRIMARY KEY,enabled INTEGER NOT NULL DEFAULT 0,accepted_at TEXT,key_cipher TEXT,last_status TEXT,last_fetch TEXT); CREATE TABLE IF NOT EXISTS source_meta(k TEXT PRIMARY KEY,v TEXT)');
 if(!exists){const old=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get();const installed=old&&db.prepare("SELECT v FROM settings WHERE k='password'").get();db.prepare('INSERT OR REPLACE INTO source_meta VALUES(?,?)').run('migration_notice',installed?'1':'0');}
 for(const c of catalog)db.prepare('INSERT OR IGNORE INTO data_sources(id,last_status) VALUES(?,?)').run(c.id,'Never fetched');
 if(sandbox)db.exec("UPDATE data_sources SET enabled=0 WHERE key_cipher IS NOT NULL");
 }
 definition(id:string){const d=catalog.find(x=>x.id===id);if(!d)throw Error('Unknown source');return d;}
 row(id:string){this.definition(id);return this.db.prepare('SELECT * FROM data_sources WHERE id=?').get(id) as any;}
 enabled(id:string){const d=this.definition(id),r=this.row(id);return !!r.enabled&&!!r.accepted_at&&!(this.sandbox&&d.key);}
 require(id:string){if(!this.enabled(id))throw Error('Source disabled. Choose and accept it in Data sources.');}
 list(){return catalog.map(d=>{const r=this.row(d.id);return {...d,enabled:this.enabled(d.id),accepted:!!r.accepted_at,acceptedAt:r.accepted_at,configured:!!r.key_cipher,lastStatus:r.last_status,lastFetch:r.last_fetch,sandboxBlocked:this.sandbox&&d.key,permissionWarning:null};});}
 notice(){return (this.db.prepare("SELECT v FROM source_meta WHERE k='migration_notice'").get() as any)?.v==='1';}
 containsSecret(text:string){for(const d of catalog){const r=this.row(d.id);if(r.key_cipher){const c=this.credentials(d.id);if(Object.values(c).some(v=>typeof v==='string'&&v.length>0&&text.includes(v)))return true;}}return false;}
 dismiss(){this.db.prepare("UPDATE source_meta SET v='0' WHERE k='migration_notice'").run();}
 credentials(id:string):Credentials {const r=this.row(id);if(!r.key_cipher)throw Error('Key required');return JSON.parse(this.crypt.decrypt(r.key_cipher));}
 async update(id:string,b:any){
 const d=this.definition(id);if(!b||typeof b!=='object'||Object.keys(b).some(k=>!['enabled','accepted','credentials'].includes(k))||typeof b.enabled!=='boolean'||typeof b.accepted!=='boolean')throw Error('Invalid source settings');
 if(b.enabled&&!b.accepted)throw Error('Accept terms before enabling');
 if(this.sandbox&&d.key&&(b.enabled||b.credentials))throw Error('Install locally to use your own keys');
 let cipher=this.row(id).key_cipher;
 if(b.credentials!==undefined){const c=b.credentials;if(!d.key||!c||typeof c.key!=='string'||!c.key||c.key.length>4096||Object.keys(c).some(k=>!['key','secret','passphrase'].includes(k))||['secret','passphrase'].some(k=>c[k]!==undefined&&(typeof c[k]!=='string'||c[k].length>4096)))throw Error('Invalid credentials');if((d as any).exchange&&!c.secret)throw Error('Secret required');if(id==='okx-earn'&&!c.passphrase)throw Error('Passphrase required');cipher=this.crypt.encrypt(JSON.stringify(c));}
 // A revoked acceptance also disables the source; saving any new key invalidates prior tests.
 this.db.prepare('UPDATE data_sources SET enabled=0,accepted_at=?,key_cipher=? WHERE id=?').run(b.accepted?(this.row(id).accepted_at??new Date().toISOString()):null,cipher,id);
 if(b.enabled){if(d.key&&!cipher)throw Error('Key required');if((d as any).exchange&&d.key){try{await this.verify(id,true);}catch{this.status(id,'Connection or key permission check failed; source disabled.');throw Error('Read-only key check failed; source disabled');}}this.db.prepare('UPDATE data_sources SET enabled=1 WHERE id=?').run(id);}
 return {saved:true};
 }
 status(id:string,text:string,fetched=false){this.db.prepare('UPDATE data_sources SET last_status=?,last_fetch=CASE WHEN ? THEN ? ELSE last_fetch END WHERE id=?').run(text,fetched?1:0,new Date().toISOString(),id);}
 deleteKey(id:string){this.definition(id);this.db.prepare('UPDATE data_sources SET key_cipher=NULL,enabled=0,last_status=? WHERE id=?').run('Key deleted; source disabled',id);this.clearCache(id);}
 clearCache(id:string){for(const table of ['staking_cache','staking_attempts'])if(this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table))this.db.prepare(`DELETE FROM ${table} WHERE source=?`).run(id);}
 async verify(id:string,enabling=false){const guard=()=>{if(enabling){if(!this.row(id).accepted_at||(this.sandbox&&this.definition(id).key))throw Error('Terms or sandbox refused');}else this.require(id);};guard();const ex=this.reader(id,this.credentials(id),guard);if(id==='binance-earn')return checkPermissions(id,await ex.sapiGetAccountApiRestrictions());if(id==='okx-earn')return checkPermissions(id,await ex.privateGetAccountConfig());return checkPermissions(id,await ex.privatePostGetApiKeyInfo());}
 async test(id:string){this.require(id);try{const raw=await this.fetchData(id);return {ok:true,status:this.row(id).last_status};}catch{this.status(id,'Connection or key permission check failed; source disabled.');this.db.prepare('UPDATE data_sources SET enabled=0 WHERE id=?').run(id);return {ok:false,status:'Connection or key permission check failed; source disabled.'};}}
 async fetchData(id:string){
 this.require(id);const d=this.definition(id);
 try{
 let raw:any;
 if((d as any).exchange&&d.key){const warning=await this.verify(id);this.require(id);const ex=this.reader(id,this.credentials(id),()=>this.require(id));raw=id==='kraken-earn'?await ex.privatePostEarnStrategies():id==='binance-earn'?await ex.sapiGetSimpleEarnFlexibleList({current:1,size:100}):await ex.privateGetFinanceStakingDefiOffers();this.status(id,'Fetched product listings. '+warning,true);return raw;}
 if((d as any).exchange){const ex=this.marketReader(id,()=>this.require(id));raw=await ex.fetchTicker(id==='coinbase'?'BTC/USD':'BTC/USDT');}
 else {const urls:Record<string,string>={defillama:'https://yields.llama.fi/pools',lido:'https://eth-api.lido.fi/v1/protocol/steth/apr/sma','bybit-earn':'https://api.bybit.com/v5/earn/fixed-term/product'};const url=id==='defillama-pro'?'https://pro-api.llama.fi/'+encodeURIComponent(this.credentials(id).key)+'/yields/pools':urls[id];const r=await this.fetcher(url,{signal:AbortSignal.timeout(10000),redirect:'error',headers:{accept:'application/json'}});if(!r.ok)throw Error('Source unavailable');raw=await r.json();}
 this.require(id);this.status(id,'Fetch succeeded; timestamped response, not a live rate.',true);return raw;
 }catch{this.status(id,'Source fetch failed. Check access, terms and provider availability.');throw Error('Source fetch failed');}
 }
}
