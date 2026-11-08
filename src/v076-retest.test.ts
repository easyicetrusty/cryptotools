import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';import ts from 'typescript';
import {sealSplitProblem} from './seal-check.js';import {preset} from './bench-presets.js';import {defaults} from './backtest.js';import {ControlError} from './ai-controls.js';
// Load the shipped browser modules (not copies). bench-form imports the shared seal rule from dist.
const load=(file:string,req:(m:string)=>any)=>{const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,exports:any={};runInNewContext(code,{exports,require:req,FormData:class{constructor(public form:any){}forEach(fn:any){for(const [k,v] of Object.entries(this.form.values))fn(v,k)}},Date,Number,Object});return exports;};
const benchForm=load('web/bench-form.ts',()=>({sealSplitProblem}));
const session=load('web/session.ts',()=>({useEffect:()=>{}}));
const day=(s:string)=>Date.parse(s);
test('seal split: inside Start..End is accepted, empty is accepted, outside names the field, both dates and the reason',()=>{
 assert.equal(sealSplitProblem(day('2026-11-03'),day('2026-11-08'),day('2026-11-05')),null);
 assert.equal(sealSplitProblem(day('2026-11-03'),day('2026-11-08'),null),null);
 const m=sealSplitProblem(day('2026-11-03'),day('2026-11-08'),day('2026-10-25'))!;
 assert.match(m,/split/);assert.match(m,/2026-10-25/);assert.match(m,/2026-11-03 to 2026-11-08/);assert.match(m,/inside Start\.\.End/);
 for(const s of ['2026-11-03','2026-11-08','2026-12-01'])assert.ok(sealSplitProblem(day('2026-11-03'),day('2026-11-08'),day(s)),s);
 assert.match(sealSplitProblem(day('2026-11-03'),day('2026-11-08'),NaN)!,/not a valid date/);
});
test('bench-preset names the field and reason for a split outside the test period (the tester case), and still accepts a split inside it',()=>{
 const input=(split:string)=>({schemaVersion:1,bench:{...defaults,exchange:'kraken',symbol:'BTC/USDT',timeframe:'1d',start:'2026-11-03',end:'2026-11-08',feeMode:'override'},seal:{split}});
 assert.equal(preset(input('2026-11-05')).seal.split,day('2026-11-05'));
 assert.throws(()=>preset(input('2026-10-25')),(e:any)=>e instanceof ControlError&&e.code==='invalid_preset'&&/Sealed window begins \(split\) is 2026-10-25, outside the test period 2026-11-03 to 2026-11-08/.test(e.message));
 assert.throws(()=>preset(input('garbage')),(e:any)=>e instanceof ControlError&&/not a valid date/.test(e.message));
});
test('test form: split problem is flagged from form values before export; empty split and a valid one are not',()=>{
 const base={start:'2026-11-03',end:'2026-11-08'};
 assert.match(benchForm.formSplitProblem({...base,split:'2026-10-25'}),/split/);
 assert.equal(benchForm.formSplitProblem({...base,split:'2026-11-05'}),'');
 assert.equal(benchForm.formSplitProblem({...base,split:''}),'');
});
test('opened run: applyValues restores only named controls and snapshot keeps the unsaved values separate from the run',()=>{
 const controls:Record<string,{value:string}>={feeBps:{value:'80'},split:{value:'2026-10-25'}};
 const form:any={values:{feeBps:'10',split:'2026-11-05',capital:'12345'},elements:{namedItem:(n:string)=>controls[n]??null}};
 const saved=benchForm.snapshotForm(form);assert.deepEqual({...saved},{feeBps:'10',split:'2026-11-05',capital:'12345'});
 benchForm.applyValues(form,{split:saved.split});assert.equal(controls.split.value,'2026-11-05');assert.equal(controls.feeBps.value,'80','run settings are not overwritten when only split is carried over');
 benchForm.applyValues(form,{...saved,missing:'x'});assert.equal(controls.feeBps.value,'10','back restores the previous unsaved value');
});
test('sign-in is never shown before the session check has returned; expired session still shows sign-in',()=>{
 assert.equal(session.authView(null,false,false),'loading');
 assert.equal(session.authView({setup:false},false,false),'loading','auth state known but session check pending: hold the screen');
 assert.equal(session.authView({setup:false},true,true),'workspace');
 assert.equal(session.authView({setup:false},true,false),'sign-in','check returned 401: sign-in');
});
