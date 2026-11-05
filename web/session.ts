// Expired sessions never fail silently: any API 401 raises 'session-expired' so the app can ask for sign-in over the
// current page. Screen and non-secret form fields are kept in this tab so a reload plus sign-in returns to them.
const returnKey='cryptotools-return',secret=/pass|key|secret|token|code/i;
export function guardFetch(){
 const original=window.fetch.bind(window);
 window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{const response=await original(input,init),url=typeof input==='string'?input:input instanceof URL?input.href:input.url,path=new URL(url,location.href).pathname;
  if(response.status===401&&path.startsWith('/api/')&&!path.startsWith('/api/auth/'))window.dispatchEvent(new Event('session-expired'));return response;};
}
type Field=[string,string|boolean];type Saved={screen:string,forms:{shape:string,fields:Field[]}[]};
const fieldsOf=(form:HTMLFormElement)=>[...form.elements].filter((e:any)=>e.name&&!['password','file','submit','button'].includes(e.type)&&!secret.test(e.name)) as any[];
const shapeOf=(form:HTMLFormElement)=>fieldsOf(form).map(e=>e.name).join(',');
export function saveReturn(screen:string){
 const forms=[...document.querySelectorAll<HTMLFormElement>('main form')].map(f=>({shape:shapeOf(f),fields:fieldsOf(f).map(e=>[e.name,e.type==='checkbox'||e.type==='radio'?e.checked:e.value] as Field)})).filter(f=>f.fields.length);
 try{sessionStorage.setItem(returnKey,JSON.stringify({screen,forms}));}catch{}
}
export function takeReturn():Saved|null{try{const raw=sessionStorage.getItem(returnKey);sessionStorage.removeItem(returnKey);return raw?JSON.parse(raw):null;}catch{return null;}}
export function dropReturn(){try{sessionStorage.removeItem(returnKey);}catch{}}
export function restoreForms(saved:Saved['forms']){
 const used=new Set<number>();let restored=0;
 for(const form of document.querySelectorAll<HTMLFormElement>('main form')){const shape=shapeOf(form),i=saved.findIndex((s,j)=>!used.has(j)&&s.shape===shape);if(i<0)continue;used.add(i);
  for(const [name,value] of saved[i].fields){const el=form.elements.namedItem(name) as any;if(!el||el instanceof RadioNodeList)continue;if(typeof value==='boolean')el.checked=value;else el.value=value;restored++;}}
 return restored;
}
// CSV links are plain downloads; check the session first so a logged-out click opens sign-in instead of saving an error file.
export async function guardedDownload(e:{preventDefault():void,currentTarget:HTMLAnchorElement}){
 e.preventDefault();const href=e.currentTarget.href;const r=await fetch('/api/settings');if(!r.ok)return;const a=document.createElement('a');a.href=href;a.download='';document.body.append(a);a.click();a.remove();
}
