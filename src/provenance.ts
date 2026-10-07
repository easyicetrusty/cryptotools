export type Provenance={source:'public'|'authenticated'|'synthetic',exchange?:string,fetchedAt?:string};
export const syntheticLabel='SYNTHETIC TEST DATA, not market prices';
export function provenanceLabel(p?:Partial<Provenance>):string {
  if(!['public','authenticated'].includes(p?.source??'')||!p?.exchange||!p.fetchedAt||!Number.isFinite(Date.parse(p.fetchedAt)))return syntheticLabel;
  return `${p.source==='authenticated'?'User-authorized API data':'Public market data'} · ${p.exchange} · fetched ${p.fetchedAt}`;
}
export function combineProvenance(items:Partial<Provenance>[]):Provenance {
  if(!items.length||items.some(p=>provenanceLabel(p)===syntheticLabel))return {source:'synthetic'};
  return {source:items.some(p=>p.source==='authenticated')?'authenticated':'public',exchange:[...new Set(items.map(p=>p.exchange!))].join(' + '),fetchedAt:items.map(p=>p.fetchedAt!).sort()[0]};
}
export function toolProvenance(result:any):Provenance[] {
  if(result?.metric&&Array.isArray(result?.sources))return result.sources.filter((s:any)=>s.fetchedAt).map((s:any)=>({source:'public',exchange:s.exchange,fetchedAt:s.fetchedAt}));
  if(Array.isArray(result?.options))return result.options.map((o:any)=>({source:o.dataAccess==='authenticated'?'authenticated':'public',exchange:o.source,fetchedAt:o.fetchedAt}));
  if(result?.coverage)return [result.coverage];
  if(result?.source)return [result];
  if(Array.isArray(result?.holdings))return result.holdings.filter((h:any)=>h.status==='live').map((h:any)=>({source:h.source,exchange:h.exchange,fetchedAt:h.capturedAt}));
  return [{source:'synthetic'}];
}
