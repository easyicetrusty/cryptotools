"""Cowork-only QuantStats oracle; expected JSON is committed, CI needs only Node."""
import argparse,json,math,datetime,importlib.metadata as metadata
import pandas as pd
import quantstats as qs
p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('output');args=p.parse_args()
fixtures=json.load(open(args.input));captured=datetime.datetime.now(datetime.timezone.utc).isoformat()
def clean(x):
 if x is None:return None
 if isinstance(x,dict):return {k:clean(v) for k,v in x.items()}
 if isinstance(x,list):return [clean(v) for v in x]
 if isinstance(x,(str,int)):return x
 return float(x) if math.isfinite(float(x)) else None
for f in fixtures:
 ledger=f['ledger'];values=pd.Series([v['value'] for v in ledger],index=pd.to_datetime([v['time'] for v in ledger],unit='ms',utc=True));returns=values.pct_change();returns.iloc[0]=values.iloc[0]/f['capital']-1
 f['expected']={}
 for rf in [0,.04]:
  metrics={'totalReturn':qs.stats.comp(returns),'cagr':qs.stats.cagr(returns,periods=365),'volatility':qs.stats.volatility(returns,periods=365),'sharpe':qs.stats.sharpe(returns,rf=rf,periods=365),'sortino':qs.stats.sortino(returns,rf=rf,periods=365),'calmar':qs.stats.calmar(returns,periods=365),'maxDrawdown':qs.stats.max_drawdown(returns),'bestDay':qs.stats.best(returns),'worstDay':qs.stats.worst(returns),'bestMonth':qs.stats.best(returns,aggregate='month',compounded=True),'worstMonth':qs.stats.worst(returns,aggregate='month',compounded=True),'dailyWinRate':qs.stats.win_rate(returns),'monthlyWinRate':qs.stats.win_rate(returns,aggregate='month'),'skew':qs.stats.skew(returns),'kurtosis':qs.stats.kurtosis(returns)}
  windows=[]
  for n in [30,90]:
   points=[]
   for i in range(n-1,len(returns)):
    a=returns.iloc[i+1-n:i+1];points.append({'time':int(a.index[-1].timestamp()*1000),'sharpe':qs.stats.sharpe(a,rf=rf,periods=365),'volatility':qs.stats.volatility(a,periods=365)})
   windows.append({'window':n,'points':points})
  f['expected'][str(rf)]={'metrics':clean(metrics),'rolling':clean(windows)}
 dd=qs.stats.to_drawdown_series(returns)
 f['quantstatsDifferentDefinitions']=clean({'parametricVaR95':qs.stats.value_at_risk(returns),'parametricCVaR95':qs.stats.conditional_value_at_risk(returns),'returnBasedRoundedExposure':qs.stats.exposure(returns),'psrUsingExcessSampleKurtosis':qs.stats.probabilistic_sharpe_ratio(returns,periods=365),'drawdownDetails':qs.stats.drawdown_details(dd).to_dict(orient='records')})
 print('ORACLE',f['name'],len(returns),'observations;',len(f['expected']['0']['metrics']),'aligned metrics; 30/90 rolling, RF 0/4%')
output={'capturedAt':captured,'oracle':{'quantstats':qs.__version__,'pandas':pd.__version__,'annualisation':365,'tolerance':'abs <= 1e-8 + abs(expected)*1e-8; PSR CDF hand fixture abs <= 1e-7','environment':{x:metadata.version(x) for x in ['quantstats','pandas','numpy','scipy','ipython']}},'differentDefinitions':{'var':'Historical empirical linear quantile/tail mean vs QuantStats normal parametric VaR/tail threshold','exposure':'Position-held bar fraction vs QuantStats rounded nonzero-return fraction','psr':'Raw population skew/Pearson kurtosis and daily excess SR benchmark 0 vs pinned QuantStats excess sample kurtosis convention','drawdownDuration':'Peak to recovery (or final date, null recovery) vs QuantStats first underwater day to last underwater day inclusive'},'fixtures':fixtures}
with open(args.output,'w') as out:json.dump(output,out,indent=2,allow_nan=False)
print('CAPTURED',captured,'QuantStats',qs.__version__)
