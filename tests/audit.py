import json,re,subprocess,urllib.parse
from pathlib import Path
root=Path(__file__).resolve().parents[1]
logs=subprocess.check_output(['sudo','-n','docker','logs','cryptotools-app-1'],stderr=subprocess.STDOUT,text=True)
requests=[]
for line in logs.splitlines():
 try: row=json.loads(line)
 except json.JSONDecodeError:continue
 if 'publicRequest' not in row:continue
 u=urllib.parse.urlparse(row['url'])
 allowed=(u.hostname=='api.kraken.com' and u.path.startswith('/0/public/')) or (u.hostname=='www.okx.com' and re.match(r'^/api/v5/(public|market)/',u.path))
 assert allowed and row['publicRequest']=='GET',row
 requests.append(row)
assert requests, 'Expected directly captured public requests'
print('PASS exchange traffic guard audit',json.dumps(requests))
for f in ['src/server.ts','src/feedback.ts']:
 s=(root/f).read_text()
 routes=re.findall(r"app\.(?:get|post)(?:<[^\n]*?>)?\('([^']+)'",s)
 env=sorted(set(re.findall(r'process\.env\.([A-Z_]+)',s)))
 print('SOURCE_API_ROUTES',f,json.dumps(routes),'ENV_NAMES',json.dumps(env))
 assert not re.search(r'createOrder|cancelOrder|fetchBalance|fetchOrders|apiKey\s*:',s)
print('PASS direct named-source check: order/private/key adapter configuration absent')
result=json.loads((root/'evidence/render-results.json').read_text());assert len(result)==24
for row in result:
 assert (root/'evidence/mockups'/row['file']).stat().st_size>0
 assert row['width'] in (390,1440) and row['errors']==[] and row['externalRequests']==[]
print('PASS 24 nonempty screenshot files with matching render metadata')
for f in ['Dockerfile','compose.yaml','install.sh','install.ps1','package.json']:
 print('DELIVERABLE',f,'bytes', (root/f).stat().st_size)
