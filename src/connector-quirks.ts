import data from './connector-quirks.json' with {type:'json'};
export function connectorQuirks(id:string){const q=(data.connectors as Record<string,any>)[id];if(!q)throw Error('Unknown connector quirks');return {schemaVersion:data.schemaVersion,ccxtPackage:data.ccxtPackage,ccxtReportedVersion:data.ccxtReportedVersion,...q};}
export function candlePage(id:string,timeframe:string){const q=connectorQuirks(id);if(!q.benchTimeframes.includes(timeframe))throw Error('Timeframe unsupported by this connector');return q.pageLimit;}
