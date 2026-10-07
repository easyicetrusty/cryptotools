import type {DatabaseSync} from 'node:sqlite';
import {safeComment} from './common.js';
import {ControlError} from './ai-controls.js';import {digest} from './security.js';
type Crypt={decrypt:(s:string)=>string,containsSecret:(s:string)=>boolean};
export class SecretGuard {
 constructor(private db:DatabaseSync,private crypt:Crypt){}
 contains(text:string){
  if(this.crypt.containsSecret(text))return true;
  const includes=(v:unknown):boolean=>typeof v==='string'&&v.length>0&&text.includes(v);
  // Plaintext exists only in this synchronous comparison, never in a cache or log.
  for(const table of ['providers','data_sources','notification_channels']){
   const column=table==='notification_channels'?'cipher':'key_cipher';
   if(!this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))continue;
   for(const row of this.db.prepare(`SELECT ${column} AS cipher FROM ${table} WHERE ${column} IS NOT NULL`).all() as any[]){
    const clear=this.crypt.decrypt(row.cipher);
    if(table==='providers'){if(includes(clear))return true;}
    else {const c=JSON.parse(clear);const fields=table==='data_sources'?['key','secret','passphrase']:['token','password'];if(fields.some(k=>includes(c[k])))return true;}
   }
  }
  if(this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='settings'").get()){
   for(const row of this.db.prepare("SELECT v FROM settings WHERE k IN ('totp','totp_pending')").all() as any[])if(includes(this.crypt.decrypt(row.v)))return true;
   const password=this.db.prepare("SELECT v FROM settings WHERE k='password'").get() as any;if(password&&includes(password.v))return true;
  }
  if(this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='sessions'").get()){
   for(const row of this.db.prepare('SELECT token FROM sessions').all() as any[])if(includes(row.token))return true;
   for(const token of text.match(/\b[a-f0-9]{64}\b/gi)??[])if(this.db.prepare('SELECT 1 FROM sessions WHERE token=?').get(digest(token.toLowerCase())))return true;
  }
  return false;
 }
 assert(text:string){if(!safeComment(text)||this.contains(text))throw new ControlError('Remove sensitive information. Nothing was sent.','sensitive_text');}
 assertValue(value:unknown,depth=0):void{if(depth>30)throw new ControlError('Outbound text is too deeply nested. Nothing was sent.','sensitive_text');if(typeof value==='string'){this.assert(value);try{const parsed=JSON.parse(value);if(parsed!==value)this.assertValue(parsed,depth+1);}catch(error){if(error instanceof ControlError)throw error;}}else if(value&&typeof value==='object'){for(const [key,item] of Object.entries(value)){this.assert(key);this.assertValue(item,depth+1);}}}
}
