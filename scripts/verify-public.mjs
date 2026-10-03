import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const listener=createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(r=>listener.close(r));
const origin=`http://127.0.0.1:${port}`,logs=[];
const env={...process.env,NODE_OPTIONS:`--import=${pathToFileURL(resolve('scripts/market-fixture.mjs')).href}`,DATABASE_URL:'',DATABASE_AUTH_TOKEN:'',RETRY_ADMIN_EMAIL:'',RETRY_ADMIN_PASSWORD_HASH:'',AUTH_SECRET:'',NODE_ENV:'production',VERCEL:'1',NEXT_TELEMETRY_DISABLED:'1'};
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env,stdio:['ignore','pipe','pipe'],windowsHide:true});
server.stdout.on('data',d=>logs.push(d.toString()));server.stderr.on('data',d=>logs.push(d.toString()));
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(origin)).ok){ready=true;break}}catch{}if(server.exitCode!==null)break;await new Promise(r=>setTimeout(r,500))}assert.ok(ready,logs.join('').slice(-3000));
 for(const page of ['/','/cemetery','/admin'])assert.equal((await fetch(origin+page)).status,200);
 const r=await fetch(origin+'/api/state');assert.equal(r.status,200);const s=await r.json();assert.equal(s.storage,'unconfigured');assert.equal(s.mode,'live');assert.equal(s.isAdmin,false);assert.equal(s.attempt,null);assert.equal(s.metrics,null);assert.equal(s.deadCount,0);assert.deepEqual(s.previous,[]);
 const cemetery=await (await fetch(origin+'/api/cemetery')).json();assert.equal(cemetery.total,0);assert.deepEqual(cemetery.items,[]);assert.equal(cemetery.current,null);
 const mutation=await fetch(origin+'/api/admin',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'mark-dead',attemptId:1,reason:'Unauthenticated'})});assert.equal(mutation.status,403);
 console.log('PASS: Vercel without database variables serves no mint or fabricated attempt, an empty Cemetery, and protected administration.');
}finally{server.kill();await Promise.race([once(server,'exit'),new Promise(r=>setTimeout(r,3000))])}
