// One rule for the sealed-window start, shared by the preset export/import route and the test form.
// The split must fall strictly inside the test period: after Start and before End (exclusive).
const day=(ms:number)=>new Date(ms).toISOString().slice(0,10);
export function sealSplitProblem(start:number,end:number,split:number|null):string|null{
 if(split===null)return null;
 if(!Number.isFinite(split))return 'Sealed window begins (split) is not a valid date. Enter a date, or clear the field to leave the window unset.';
 if(split%86400000)return 'Sealed window begins (split) must be a whole UTC day.';
 if(!Number.isFinite(start)||!Number.isFinite(end))return null;
 if(split<=start||split>=end)return 'Sealed window begins (split) is '+day(split)+', outside the test period '+day(start)+' to '+day(end)+'. The split must be inside Start..End: after Start and before End.';
 return null;
}
