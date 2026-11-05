import {useEffect} from 'react';
const restoredEvent='session-restored';
// Only an already-open workspace intercepts expiry. Initial login still receives the normal 401.
// Keep the original caller pending, then retry its request ONCE after successful in-place sign-in.
// No reload, DOM restoration, storage snapshot, animation frame or retry loop.
export function guardFetch(){
 const original=window.fetch.bind(window);
 window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
  const request=new Request(input instanceof Request?input:new URL(input,location.href),init);
  const retry=request.clone(),response=await original(request);
  if(response.status!==401||new URL(request.url).origin!==location.origin||!new URL(request.url).pathname.startsWith('/api/')||['/api/auth/state','/api/auth/setup','/api/auth/login'].includes(new URL(request.url).pathname))return response;
  const expired=new Event('session-expired',{cancelable:true});
  window.dispatchEvent(expired);
  if(!expired.defaultPrevented)return response;
  await new Promise<void>((resolve,reject)=>{
   const cleanup=()=>{window.removeEventListener(restoredEvent,restore);request.signal.removeEventListener('abort',abort)};
   const restore=()=>{cleanup();resolve()};
   const abort=()=>{cleanup();reject(request.signal.reason)};
   window.addEventListener(restoredEvent,restore,{once:true});request.signal.addEventListener('abort',abort,{once:true});
   if(request.signal.aborted)abort();
  });
  return original(retry);
 };
}
// Each mounted screen re-fetches its own data. Stable component identities retain local React form state.
export const sessionRestored=()=>window.dispatchEvent(new Event(restoredEvent));
export function useSessionRestored(reload:()=>void){useEffect(()=>{window.addEventListener(restoredEvent,reload);return ()=>window.removeEventListener(restoredEvent,reload)});}
export const clearExpired=(message:string)=>/Login required/.test(message)?'':message;
export async function guardedDownload(e:{preventDefault():void,currentTarget:HTMLAnchorElement}){
 e.preventDefault();const href=e.currentTarget.href;const r=await fetch('/api/settings');if(!r.ok)return;const a=document.createElement('a');a.href=href;a.download='';document.body.append(a);a.click();a.remove();
}
