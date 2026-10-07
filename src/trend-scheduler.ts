// Bounded globally, serialized per exchange; ccxt additionally throttles endpoint costs.
export class HistoryScheduler {
 private active=0;private busy=new Set<string>();private last=new Map<string,number>();
 private queue:{id:string,rate:number,job:()=>Promise<any>,resolve:(v:any)=>void,reject:(e:any)=>void}[]=[];
 constructor(private limit=2,private clock=Date.now,private sleep=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms))){}
 run<T>(id:string,rate:number,job:()=>Promise<T>):Promise<T>{return new Promise((resolve,reject)=>{this.queue.push({id,rate:Math.max(0,Number(rate)||0),job,resolve,reject});this.pump()})}
 private pump(){while(this.active<this.limit){const index=this.queue.findIndex(q=>!this.busy.has(q.id));if(index<0)return;const q=this.queue.splice(index,1)[0];this.active++;this.busy.add(q.id);(async()=>{const wait=Math.max(0,(this.last.get(q.id)??-Infinity)+q.rate-this.clock());if(wait)await this.sleep(wait);this.last.set(q.id,this.clock());return q.job()})().then(q.resolve,q.reject).finally(()=>{this.active--;this.busy.delete(q.id);this.pump()});}}
}
