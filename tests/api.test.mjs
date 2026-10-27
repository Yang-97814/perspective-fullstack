import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const sql = new DatabaseSync(':memory:');
sql.exec(readFileSync('drizzle/0000_yielding_may_parker.sql','utf8').replaceAll('--> statement-breakpoint',''));
const DB={prepare(query){return {values:[],bind(...args){this.values=args;return this},async first(){return sql.prepare(query).get(...this.values)||null},async all(){return {results:sql.prepare(query).all(...this.values)}},async run(){const result=sql.prepare(query).run(...this.values);return {meta:{changes:Number(result.changes)}}}}}};
let user=null;
const context=vm.createContext({Response,Request,URL,crypto,console});
const mods=new Map();
async function module(path){if(mods.has(path))return mods.get(path);let m;
 if(path==='cloudflare:workers')m=new vm.SyntheticModule(['env'],function(){this.setExport('env',{DB})},{context});
 else if(path==='@/app/chatgpt-auth')m=new vm.SyntheticModule(['getChatGPTUser'],function(){this.setExport('getChatGPTUser',async()=>user)},{context});
 else {const file=path.startsWith('@/')?path.slice(2)+'.ts':path;const output=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;m=new vm.SourceTextModule(output,{context,identifier:path})}
 mods.set(path,m);await m.link(module);await m.evaluate();return m;
}
const api=(await module('app/api/messages/route.ts')).namespace;
const request=(method,body,origin='https://example.com',id='')=>new Request('https://example.com/api/messages'+id,{method,headers:{origin,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
test('anonymous read succeeds but writes require identity',async()=>{assert.equal((await api.GET()).status,200);assert.equal((await api.POST(request('POST',{name:'a',body:'b'}))).status,401)});
test('write validation and same-origin checks',async()=>{user={userId:'user-one'};assert.equal((await api.POST(request('POST',{name:'a',body:'b'},'https://evil.example'))).status,403);assert.equal((await api.POST(request('POST',{name:'',body:'b'}))).status,400)});
test('save, retrieve, ownership, delete and rate limit use actual SQLite',async()=>{user={userId:'user-one'};const created=await api.POST(request('POST',{name:'江涛',body:'我的第一条后端留言'}));assert.equal(created.status,201);const {message}=await created.json();const listed=await (await api.GET()).json();assert.equal(listed.messages[0].body,'我的第一条后端留言');assert.equal(listed.messages[0].canDelete,true);
 user={userId:'user-two'};assert.equal((await api.DELETE(request('DELETE',undefined,'https://example.com','?id='+message.id))).status,404);assert.equal((await (await api.GET()).json()).messages[0].canDelete,false);
 user={userId:'user-one'};assert.equal((await api.DELETE(request('DELETE',undefined,'https://example.com','?id='+message.id))).status,200);
 for(let i=0;i<3;i++)assert.equal((await api.POST(request('POST',{name:'test',body:'message '+i}))).status,201);assert.equal((await api.POST(request('POST',{name:'test',body:'too many'}))).status,429);
 assert.equal((await (await api.GET()).json()).messages.length,3);
});
test('status checks the database and returns the configured release',async()=>{const status=(await module('app/api/status/route.ts')).namespace;const response=await status.GET();assert.equal(response.status,200);const data=await response.json();assert.equal(data.database,'connected');assert.equal(data.version,'backend-v1');assert(!Number.isNaN(Date.parse(data.serverTime)))});
