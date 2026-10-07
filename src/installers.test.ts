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
