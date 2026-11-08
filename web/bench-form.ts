import {sealSplitProblem} from '../src/seal-check.js';
// Plain helpers for the uncontrolled test form. Opening a saved run re-mounts the form with that run's settings;
// these keep the user's unsaved values so they can come back.
type Controls={elements:{namedItem(name:string):{value:string}|null},};
export const snapshotForm=(form:HTMLFormElement):Record<string,string>=>{const out:Record<string,string>={};new FormData(form).forEach((v,k)=>{if(typeof v==='string')out[k]=v});return out;};
export function applyValues(form:Controls,values:Record<string,string>){for(const [name,value] of Object.entries(values)){const control=form.elements.namedItem(name);if(control)control.value=value;}}
const ms=(v:string|undefined)=>v?Date.parse(v):NaN;
// Message for the sealed-window field, or '' when it is empty or inside Start..End. Empty split is allowed.
export const formSplitProblem=(values:Record<string,string>)=>{const split=values.split;if(!split)return '';return sealSplitProblem(ms(values.start),ms(values.end),Date.parse(split))??'';};
