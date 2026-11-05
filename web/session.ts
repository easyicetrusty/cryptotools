import {useEffect} from 'react';
// Expired sessions never fail silently: any API 401 raises 'session-expired' so the app can ask for sign-in over the
// current page. Screen and non-secret form fields are kept in this tab so a reload plus sign-in returns to them.
const returnKey='cryptotools-return',secret=/pass|key|secret|token|code/i,restoredEvent='session-restored';
export function guardFetch(){
 const original=window.fetch.bind(window);
 window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{const response=await original(input,init),url=typeof input==='string'?input:input instanceof URL?input.href:input.url,path=new URL(url,location.href).pathname;
  if(response.status===401&&path.startsWith('/api/')&&!path.startsWith('/api/auth/'))window.dispatchEvent(new Event('session-expired'));return response;};
}
// After sign-in from the dialog every mounted screen reloads its own data; entered values stay because nothing remounts.
export const sessionRestored=()=>window.dispatchEvent(new Event(restoredEvent));
export function useSessionRestored(reload:()=>void){useEffect(()=>{window.addEventListener(restoredEvent,reload);return ()=>window.removeEventListener(restoredEvent,reload)});}
// A message left by the expired session is cleared on restore; any other message stays.
export const clearExpired=(message:string)=>/Login required/.test(message)?'':message;
type Field=[string,string|boolean];type Saved={screen:string,forms:{shape:string,fields:Field[]}[]};
// Controls are keyed by name, else aria-label, else position, so React-controlled controls without a name are kept too.
// Named secret fields and every password or file input are never saved.
const fieldsOf=(form:HTMLFormElement)=>[...form.elements].map((e:any,i)=>[e.name||e.getAttribute('aria-label')||'#'+i,e] as [string,any]).filter(([k,e])=>['INPUT','SELECT','TEXTAREA'].includes(e.tagName)&&!['password','file','submit','button','reset','hidden','image'].includes(e.type)&&!(e.name&&secret.test(e.name)));
const shapeOf=(form:HTMLFormElement)=>fieldsOf(form).map(([k])=>k).join(',');
export function saveReturn(screen:string){
 const forms=[...document.querySelectorAll<HTMLFormElement>('main form')].map(f=>({shape:shapeOf(f),fields:fieldsOf(f).map(([k,e])=>[k,e.type==='checkbox'||e.type==='radio'?e.checked:e.value] as Field)})).filter(f=>f.fields.length);
 try{sessionStorage.setItem(returnKey,JSON.stringify({screen,forms}));}catch{}
}
export function takeReturn():Saved|null{try{const raw=sessionStorage.getItem(returnKey);sessionStorage.removeItem(returnKey);return raw?JSON.parse(raw):null;}catch{return null;}}
export function dropReturn(){try{sessionStorage.removeItem(returnKey);}catch{}}
// Set values through the native setter and fire input/change, so React state follows (a plain .value= is undone on the next render).
function setControl(el:any,value:string|boolean){
 if(typeof value==='boolean'){if(el.checked!==value&&!el.disabled)el.click();return;}
 if(el.value===value)return;const proto=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
 Object.getOwnPropertyDescriptor(proto,'value')!.set!.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
}
// Returns how many saved values differed from the page and were set. Run it again after React re-renders: a handler such
// as "provider changed, so reset the model" can overwrite a value restored in the same pass.
export function restoreForms(saved:Saved['forms']){
 const used=new Set<number>();let changed=0;
 for(const form of document.querySelectorAll<HTMLFormElement>('main form')){const shape=shapeOf(form),i=saved.findIndex((s,j)=>!used.has(j)&&s.shape===shape);if(i<0)continue;used.add(i);
  const controls=new Map(fieldsOf(form));for(const [key,value] of saved[i].fields){const el=controls.get(key);if(!el)continue;const before=typeof value==='boolean'?el.checked:el.value;setControl(el,value);if(before!==value)changed++;}}
 return changed;
}
export const formsMatch=(saved:Saved['forms'])=>[...document.querySelectorAll<HTMLFormElement>('main form')].some(f=>saved.some(s=>s.shape===shapeOf(f)));
// CSV links are plain downloads; check the session first so a logged-out click opens sign-in instead of saving an error file.
export async function guardedDownload(e:{preventDefault():void,currentTarget:HTMLAnchorElement}){
 e.preventDefault();const href=e.currentTarget.href;const r=await fetch('/api/settings');if(!r.ok)return;const a=document.createElement('a');a.href=href;a.download='';document.body.append(a);a.click();a.remove();
}
