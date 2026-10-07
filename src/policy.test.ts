import test from 'node:test';
import assert from 'node:assert/strict';
import {safeComment,service,feedbackSchema} from './common.js';
test('Feedback rejects account fields rather than silently forwarding them',async()=>{const app=service();app.post('/f',{schema:{body:feedbackSchema}},async req=>req.body);for(const field of ['apiKey','balance','trades','chat','screenshot']){const res=await app.inject({method:'POST',url:'/f',payload:{comment:'Layout feedback',version:'0.1.0',screen:'market',[field]:'DO_NOT_FORWARD'}});assert.equal(res.statusCode,400);}await app.close();});
test('Known secret-shaped and balance-shaped comments rejected',()=>{assert.equal(safeComment('api_key=not-a-real-key'),false);assert.equal(safeComment('balance: 42'),false);assert.equal(safeComment('The mobile chart is hard to read'),true);});
