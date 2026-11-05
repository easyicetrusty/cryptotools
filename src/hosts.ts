// DNS rebinding defence: a page on another site whose name resolves to 127.0.0.1 still sends that name as Host,
// so only loopback names and hosts the owner lists in APP_ALLOWED_HOSTS (comma list) reach the app.
const loopback=['127.0.0.1','localhost','[::1]'];
const clean=(h:string)=>h.trim().toLowerCase().replace(/\.$/,'');
export function allowedHosts(list=process.env.APP_ALLOWED_HOSTS??''){return new Set([...loopback,...list.split(',').map(clean).filter(Boolean)]);}
// Host header without its port; null when absent or malformed.
export function hostName(header:string|undefined){if(!header)return null;const m=/^(\[[0-9a-f:.]+\]|[^:[\]\s/@]+)(?::\d{1,5})?$/.exec(header.trim().toLowerCase());return m?clean(m[1]):null;}
// An APP_ALLOWED_HOSTS entry matches the name alone or name:port exactly.
export function hostAllowed(header:string|undefined,allowed:Set<string>){const name=hostName(header);return name!==null&&(allowed.has(name)||allowed.has(clean(header!)));}
