import React from 'react';
import {provenanceLabel,syntheticLabel} from '../src/provenance.js';
export function ProvenanceBadge({data}:any){const label=provenanceLabel(data);return <p className={'provenance '+(label===syntheticLabel?'synthetic':'public')} role="note">{label}</p>}
export function ModelProvenance({response}:any){return <>{response?.provenance===null?<p className="muted">Model response; no market-data tool results.</p>:<ProvenanceBadge data={response?.provenance}/>}<p className="muted">Model text is unverified. Tool provenance describes inputs, not the accuracy of the reply.</p></>}
export function workerResponse(text:string){try{return JSON.parse(text)}catch{return undefined}}
