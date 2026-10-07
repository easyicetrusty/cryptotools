import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';import {dirname} from 'node:path';import Fastify from 'fastify';
export const version='0.7.2';export const host=process.env.HOST??'0.0.0.0';export const port=Number(process.env.PORT??8080);
export function database(path:string){mkdirSync(dirname(path),{recursive:true});const db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000');return db;}
export function service(){return Fastify({logger:false,bodyLimit:16384,ajv:{customOptions:{removeAdditional:false}}});}
export const screens=['trends','sources','staking','bench','portfolio','assistant','workers','settings','news','onboarding','login'];
export const feedbackSchema={type:'object',additionalProperties:false,required:['comment','version','screen'],properties:{comment:{type:'string',minLength:1,maxLength:2000},version:{type:'string',enum:[version]},screen:{type:'string',enum:screens}}};
export type Feedback={comment:string;version:string;screen:string};
export function safeComment(comment:string){return !/(?:-----BEGIN|sk-[A-Za-z0-9_-]{10,}|(?:api[_ -]?key|secret|password|balance)\s*[:=])/i.test(comment);}
