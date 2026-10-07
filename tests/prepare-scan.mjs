// FAKE TEST CREDENTIALS ONLY: synthetic notlive API-key canary and fixture passwords. Never valid provider credentials.
import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('test-scan-home/.config/typesafe',{recursive:true});writeFileSync('test-scan-home/.config/typesafe/api-key',['sk','step3','synthetic','notlive','0123456789'].join('-')+'\n',{mode:0o600});console.log('Created synthetic-key fixture source for the vetted exact-byte scanner. Value withheld.');
