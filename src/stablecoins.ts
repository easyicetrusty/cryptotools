// Conservative code-level classification, not verified token identity or a peg guarantee.
// Sources: issuer documentation, reviewed 2026-10-07. Unknown codes are unclassified.
export const stablecoinData = [
 {codes:['USDT'],source:'https://tether.to/en/tokens/'},
 {codes:['USDC','EURC'],source:'https://www.circle.com/stablecoins'},
 {codes:['DAI','USDS'],source:'https://docs.sky.money/'},
 {codes:['FDUSD'],source:'https://firstdigitallabs.com/'},
 {codes:['TUSD'],source:'https://trueusd.com/'},
 {codes:['USDP','PYUSD','USDG','BUSD'],source:'https://www.paxos.com/'},
 {codes:['USDE'],source:'https://docs.ethena.fi/'}
];
const codes=new Set(stablecoinData.flatMap(row=>row.codes));
export const isStablecoin=(code:string)=>codes.has(code);
export type StableFilters={excludeStablePairs?:boolean,excludeStableBase?:boolean};
export function filterStableRows(rows:any[],f:StableFilters){let excludedStable=0;const filtered=rows.filter(row=>{const exclude=(f.excludeStablePairs!==false&&isStablecoin(row.asset)&&isStablecoin(row.quote))||(f.excludeStableBase===true&&isStablecoin(row.asset));if(exclude)excludedStable++;return !exclude});return {rows:filtered,excludedStable};}
