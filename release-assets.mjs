import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {createHash} from 'node:crypto';import {join} from 'node:path';
const version=JSON.parse(readFileSync('package.json','utf8')).version,digest=process.argv[2],out=process.argv[3]??'release-assets';
if(!/^\d+\.\d+\.\d+(-beta\.\d+)?$/.test(version)||!/^sha256:[a-f0-9]{64}$/.test(digest??''))throw Error('Version and multi-arch registry digest required');
mkdirSync(out,{recursive:true});
const image='ghcr.io/easyicetrusty/cryptotools@'+digest;
for(const name of ['install.sh','install.ps1']){const text=readFileSync(name,'utf8').replaceAll('@RELEASE_VERSION@','v'+version).replaceAll('@IMAGE_DIGEST@',digest.slice(7));writeFileSync(join(out,name),text,{mode:name.endsWith('.sh')?0o755:0o644});}
writeFileSync(join(out,'compose.yaml'),readFileSync('compose.yaml','utf8').replaceAll('ghcr.io/easyicetrusty/cryptotools:latest',image));
writeFileSync(join(out,'image-reference.txt'),image+'\n');
writeFileSync(join(out,'SHA256SUMS'),['install.sh','install.ps1','compose.yaml','image-reference.txt'].map(name=>createHash('sha256').update(readFileSync(join(out,name))).digest('hex')+'  '+name).join('\n')+'\n');
console.log('Generated digest-pinned release assets for v'+version+' at '+out);
