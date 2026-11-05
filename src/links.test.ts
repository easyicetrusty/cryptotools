import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';import {join} from 'node:path';
// Issue #1: external links such as "Provider terms" must open in a new tab so the app page stays where it was.
test('every external link in the web app opens in a new tab with rel="noopener noreferrer"',()=>{
 const anchors=readdirSync('web').filter(f=>f.endsWith('.tsx')).flatMap(f=>[...readFileSync(join('web',f),'utf8').matchAll(/<a\s[^>]*>/g)].map(m=>({file:f,tag:m[0]})));
 const external=anchors.filter(a=>!/href=(["'{])\/api\//.test(a.tag)&&!/href=\{'\/api\//.test(a.tag)&&!/href="#/.test(a.tag));
 assert.ok(external.length>=7,'found '+external.length+' external anchors');
 assert.ok(external.some(a=>a.file==='DataSources.tsx'&&/href=\{s\.terms\}/.test(a.tag)),'Provider terms link present');
 for(const a of external){assert.match(a.tag,/target="_blank"/,a.file+': '+a.tag);assert.match(a.tag,/rel="noopener noreferrer"/,a.file+': '+a.tag);}
});
