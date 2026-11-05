import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
test('release assets pin both installers and compose to registry digest; shell install/update verify and retain pin',()=>{
 const dir=mkdtempSync(join(tmpdir(),'v074-install-')),assets=join(dir,'assets'),bin=join(dir,'bin'),installed=join(dir,'installed'),log=join(dir,'docker.log'),digest='sha256:'+'a'.repeat(64),image='ghcr.io/easyicetrusty/cryptotools@'+digest;
 try{const g=spawnSync(process.execPath,['release-assets.mjs',digest,assets],{encoding:'utf8'});assert.equal(g.status,0,g.stderr);mkdirSync(bin);writeFileSync(join(assets,'releases.json'),'[\n {"tag_name": "v0.7.4", "draft": false}\n]\n');
 writeFileSync(join(bin,'docker'),'#!/bin/sh\nprintf "%s image=%s\\n" "$*" "$CRYPTOTOOLS_IMAGE" >> "$DOCKER_LOG"\n',{mode:0o755});
 writeFileSync(join(bin,'curl'),'#!/bin/sh\nurl=""; out=""\nwhile [ "$#" -gt 0 ]; do case "$1" in -o) out=$2; shift 2;; https:*) url=$1; shift;; *) shift;; esac; done\ncase "$url" in *releases\\?*) name=releases.json;; *) name=${url##*/};; esac\ncp "$FIXTURE_ASSETS/$name" "$out"\n',{mode:0o755});
 const env:NodeJS.ProcessEnv={...process.env,PATH:bin+':'+process.env.PATH,FIXTURE_ASSETS:assets,DOCKER_LOG:log,CRYPTOTOOLS_DIR:installed,OPEN_BROWSER:'0'};delete env.CRYPTOTOOLS_IMAGE;
 for(const name of ['install.sh','install.ps1','compose.yaml']){const text=readFileSync(join(assets,name),'utf8');assert.ok(text.includes(image),name);assert.ok(!text.includes('@IMAGE_DIGEST@'));assert.ok(!text.includes('ghcr.io/easyicetrusty/cryptotools:latest'));}
 for(const args of [[],['update']]){const r=spawnSync('sh',[join(assets,'install.sh'),...args],{env,encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.equal(readFileSync(join(installed,'.env'),'utf8'),'CRYPTOTOOLS_IMAGE='+image+'\n');}
 assert.ok(readFileSync(log,'utf8').includes('up -d --pull never'));assert.ok(!readFileSync(log,'utf8').includes(':latest'));
 const template=spawnSync('sh',['install.sh'],{env,encoding:'utf8'});assert.notEqual(template.status,0);assert.match(template.stderr,/source template/);
 const mutable=spawnSync('sh',[join(assets,'install.sh')],{env:{...env,CRYPTOTOOLS_IMAGE:'ghcr.io/easyicetrusty/cryptotools:latest'},encoding:'utf8'});assert.notEqual(mutable.status,0);assert.match(mutable.stderr,/digest pin/);
 writeFileSync(join(assets,'compose.yaml'),'tampered');const bad=spawnSync('sh',[join(assets,'install.sh')],{env,encoding:'utf8'});assert.notEqual(bad.status,0);assert.match(bad.stderr,/Checksum failed/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('installers stop first with a plain message when the Docker engine is unreachable, and continue when it is up',()=>{
 const dir=mkdtempSync(join(tmpdir(),'engine-check-')),assets=join(dir,'assets'),bin=join(dir,'bin'),log=join(dir,'docker.log'),installed=join(dir,'installed'),digest='sha256:'+'b'.repeat(64);
 try{const g=spawnSync(process.execPath,['release-assets.mjs',digest,assets],{encoding:'utf8'});assert.equal(g.status,0,g.stderr);mkdirSync(bin);
 // Engine down: the CLI exists but "docker info" fails, as with a stopped Docker Desktop.
 writeFileSync(join(bin,'docker'),'#!/bin/sh\nprintf "%s\\n" "$*" >> "$DOCKER_LOG"\n[ "$1" = info ] && [ "$ENGINE" = down ] && { echo "Cannot connect to the Docker daemon" >&2; exit 1; }\nexit 0\n',{mode:0o755});
 writeFileSync(join(bin,'curl'),'#!/bin/sh\necho "curl must not run" >&2; exit 9\n',{mode:0o755});
 const env:NodeJS.ProcessEnv={...process.env,PATH:bin+':'+process.env.PATH,DOCKER_LOG:log,CRYPTOTOOLS_DIR:installed,OPEN_BROWSER:'0',ENGINE:'down'};delete env.CRYPTOTOOLS_IMAGE;
 const plain=/engine is not reachable[\s\S]*Start Docker Desktop[\s\S]*engine is running[\s\S]*run this installer again/;
 for(const args of [[],['update']]){writeFileSync(log,'');const r=spawnSync('sh',[join(assets,'install.sh'),...args],{env,encoding:'utf8'});assert.equal(r.status,1,r.stderr);assert.match(r.stderr,plain);assert.doesNotMatch(r.stderr,/curl must not run/);assert.deepEqual(readFileSync(log,'utf8').trim().split('\n'),['info'],'engine check runs before any other docker call');assert.throws(()=>readFileSync(join(installed,'.env')),'nothing installed');}
 // Engine up: the check passes and the installer moves on to the next step (here the stubbed download fails on purpose).
 writeFileSync(log,'');const up=spawnSync('sh',[join(assets,'install.sh')],{env:{...env,ENGINE:'up'},encoding:'utf8'});assert.notEqual(up.status,0);assert.match(up.stderr,/curl must not run/);assert.doesNotMatch(up.stderr,/engine is not reachable/);assert.deepEqual(readFileSync(log,'utf8').trim().split('\n'),['info','compose version']);
 // PowerShell, run as a real process with -File, when pwsh is available (cowork sets PWSH; the image build has none).
 const pwsh=process.env.PWSH??(spawnSync('sh',['-c','command -v pwsh'],{encoding:'utf8'}).stdout.trim()||'');
 if(pwsh){writeFileSync(log,'');const p=spawnSync(pwsh,['-NoProfile','-NonInteractive','-File',join(assets,'install.ps1'),'-NoBrowser'],{env,encoding:'utf8'});assert.equal(p.status,1,p.stdout+p.stderr);const shown=(p.stdout+p.stderr).replace(/\x1b\[[0-9;]*m/g,'');assert.match(shown,/^Docker is installed but its engine is not reachable\.\nStart Docker Desktop and wait until it says the engine is running[^\n]*\nThen run this installer again\./m);assert.deepEqual(readFileSync(log,'utf8').trim().split('\n'),['info']);
  writeFileSync(log,'');const pu=spawnSync(pwsh,['-NoProfile','-NonInteractive','-File',join(assets,'install.ps1'),'-NoBrowser'],{env:{...env,ENGINE:'up',HTTPS_PROXY:'http://127.0.0.1:9',https_proxy:'http://127.0.0.1:9'},encoding:'utf8',timeout:60000});assert.notEqual(pu.status,0);assert.doesNotMatch(pu.stdout+pu.stderr,/engine is not reachable/);assert.deepEqual(readFileSync(log,'utf8').trim().split('\n'),['info','compose version']);console.log('PowerShell engine check exercised with '+pwsh);}
 else console.log('pwsh not found: PowerShell engine check skipped here; run with PWSH=/path/to/pwsh');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
