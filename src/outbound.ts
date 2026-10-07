import {lookup} from 'node:dns/promises';
import {BlockList,isIP} from 'node:net';
import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {ControlError} from './ai-controls.js';
const blocked=new BlockList();
for(const [ip,bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['192.0.0.0',24],['192.0.2.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]] as const)blocked.addSubnet(ip,bits,'ipv4');
const global6=new BlockList();global6.addSubnet('2000::',3,'ipv6');
for(const [ip,bits] of [['2001::',32],['2001:db8::',32],['2002::',16]] as const)blocked.addSubnet(ip,bits,'ipv6');
const loopback=new BlockList();loopback.addSubnet('127.0.0.0',8,'ipv4');loopback.addAddress('::1','ipv6');
export function isLoopback(ip:string){const family=isIP(ip);return !!family&&loopback.check(ip,family===4?'ipv4':'ipv6');}
export function publicAddress(ip:string){const family=isIP(ip);if(family===4)return !blocked.check(ip,'ipv4');if(family!==6)return false;return global6.check(ip,'ipv6')&&!blocked.check(ip,'ipv6');}
export type AddressPolicy={allowPrivate?:boolean,allowLoopback?:boolean};
export type Resolver=(host:string)=>Promise<{address:string,family:number}[]>;
export async function resolveOutbound(host:string,policy:AddressPolicy={},resolver:Resolver=h=>lookup(h,{all:true,verbatim:true})){
 const bare=host.replace(/^\[|\]$/g,'');const addresses=isIP(bare)?[{address:bare,family:isIP(bare)}]:await resolver(bare);
 if(!addresses.length||addresses.some(a=>!isIP(a.address)||!(publicAddress(a.address)||policy.allowPrivate||policy.allowLoopback&&isLoopback(a.address))))throw new ControlError('Outbound address refused. Local/private servers require the explicit permitted setting.','outbound_refused');
 return addresses[0];
}
export function aiPolicy(provider:string,allowLocalOllama=false,sandbox=process.env.CRYPTOTOOLS_SANDBOX==='1'):AddressPolicy{
 if(allowLocalOllama&&(provider!=='ollama'||sandbox))throw new ControlError('Local Ollama access is unavailable for this provider or in sandbox mode.','outbound_refused');
 return {allowLoopback:provider==='ollama'&&allowLocalOllama&&!sandbox};
}
// Every request resolves again, checks ALL answers and connects to the chosen literal IP.
// DNS cannot be consulted again between the policy check and the socket connect.
export async function requestJSON(url:string,headers:Record<string,string>,body:any,policy:AddressPolicy={}){
 const u=new URL(url);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw new ControlError('Invalid provider endpoint.','outbound_refused');
 const address=await resolveOutbound(u.hostname,policy);
 if(u.protocol==='http:'&&!(policy.allowLoopback&&isLoopback(address.address)))throw new ControlError('HTTPS required except explicitly enabled loopback Ollama.','outbound_refused');
 const raw=JSON.stringify(body);
 return new Promise<{ok:boolean,status:number,json:()=>Promise<any>}>((resolve,reject)=>{
 const req=(u.protocol==='https:'?httpsRequest:httpRequest)({hostname:address.address,family:address.family,port:u.port||undefined,path:u.pathname,method:'POST',servername:u.hostname.replace(/^\[|\]$/g,''),headers:{...headers,host:u.host,'content-length':Buffer.byteLength(raw)},rejectUnauthorized:true},res=>{
 let size=0;const chunks:Buffer[]=[];
 res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>4*1024*1024){res.destroy();reject(Error('Provider response too large'));}else chunks.push(chunk);});
 res.on('error',reject);res.on('end',()=>resolve({ok:!!res.statusCode&&res.statusCode>=200&&res.statusCode<300,status:res.statusCode??0,json:async()=>JSON.parse(Buffer.concat(chunks).toString())}));
 });req.setTimeout(120000,()=>req.destroy(Error('Provider timeout')));req.on('error',reject);req.end(raw);
 });
}
