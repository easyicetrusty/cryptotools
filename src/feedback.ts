import {database,service,host,port,version,feedbackSchema,safeComment,type Feedback} from './common.js';
const app=service();
const db=database(process.env.DATA_FILE ?? '/data/feedback.sqlite');
db.exec('CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY, comment TEXT NOT NULL, version TEXT NOT NULL, screen TEXT NOT NULL, created_at TEXT NOT NULL)');
app.get('/health',async()=>({ok:true,role:'feedback',version}));
app.post<{Body:Feedback}>('/feedback',{schema:{body:feedbackSchema}},async(req,reply)=>{const {comment,version,screen}=req.body;if(!safeComment(comment))return reply.code(400).send({error:'Remove sensitive information before sending.'});const result=db.prepare('INSERT INTO feedback(comment,version,screen,created_at) VALUES(?,?,?,?)').run(comment,version,screen,new Date().toISOString());return reply.code(201).send({id:Number(result.lastInsertRowid),saved:true});});
await app.listen({host,port});
for(const signal of ['SIGTERM','SIGINT'] as const)process.on(signal,async()=>{await app.close();db.close();process.exit(0)});
