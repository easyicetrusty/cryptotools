import type {DatabaseSync} from 'node:sqlite';import {randomBytes} from 'node:crypto';import {digest} from './security.js';
export const idleTimeoutMs=30*60000,absoluteLifetimeMs=8*3600000;
export class Sessions {
 constructor(private db:DatabaseSync,private clock=Date.now){
  db.exec('CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,expires INTEGER)');
  const columns=db.prepare('PRAGMA table_info(sessions)').all() as any[];
  if(!columns.some(c=>c.name==='created')){db.exec('DELETE FROM sessions; ALTER TABLE sessions ADD COLUMN created INTEGER; ALTER TABLE sessions ADD COLUMN last_seen INTEGER');}
 }
 issue(){const now=this.clock(),token=randomBytes(32).toString('hex');this.db.prepare('DELETE FROM sessions WHERE expires<=? OR last_seen<=?').run(now,now-idleTimeoutMs);this.db.prepare('INSERT INTO sessions(token,expires,created,last_seen) VALUES(?,?,?,?)').run(digest(token),now+absoluteLifetimeMs,now,now);return token;}
 valid(token:string){const now=this.clock(),hash=digest(token),row=this.db.prepare('SELECT * FROM sessions WHERE token=?').get(hash) as any;if(!row||!Number.isFinite(row.created)||!Number.isFinite(row.last_seen)||now>=row.expires||now-row.created>=absoluteLifetimeMs||now-row.last_seen>=idleTimeoutMs){this.db.prepare('DELETE FROM sessions WHERE token=?').run(hash);return false;}this.db.prepare('UPDATE sessions SET last_seen=? WHERE token=?').run(now,hash);return true;}
 revoke(token:string){this.db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));}
 revokeAll(){this.db.exec('DELETE FROM sessions');}
}
