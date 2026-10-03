import assert from 'node:assert/strict';
import {randomBytes,createHmac} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {createClient} from '@libsql/client';
import {hashPassword} from '../lib/retry/password.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// All mutations use a disposable local database and generated test credentials.
mkdirSync('.sites-runtime',{recursive:true});
const password=randomBytes(24).toString('hex'),email='qa@example.test';
const url=`file:.sites-runtime/qa-${randomBytes(8).toString('hex')}.db`;
const env={...process.env,NODE_OPTIONS:`--import=${pathToFileURL(resolve('scripts/market-fixture.mjs')).href}`,DATABASE_URL:url,DATABASE_AUTH_TOKEN:'',RETRY_ADMIN_EMAIL:email,RETRY_ADMIN_PASSWORD_HASH:await hashPassword(password),AUTH_SECRET:randomBytes(32).toString('hex'),NODE_ENV:'production',VERCEL:'0',NEXT_TELEMETRY_DISABLED:'1'};
for(let i=0;i<2;i++)assert.equal(spawnSync(process.execPath,['scripts/migrate-db.mjs'],{env,encoding:'utf8',windowsHide:true}).status,0,'Migrations must succeed and be idempotent.');
const listener=createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
const origin=`http://127.0.0.1:${port}`,logs=[];
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env,stdio:['ignore','pipe','pipe'],windowsHide:true});
server.stdout.on('data',value=>logs.push(value.toString()));server.stderr.on('data',value=>logs.push(value.toString()));
const sql=createClient({url});
async function get(path,cookie='',extra={}){const r=await fetch(`${origin}/api/${path}`,{headers:{Cookie:cookie,...extra}});return {status:r.status,data:await r.json(),headers:r.headers}}
async function post(path,body,cookie='',requestOrigin=origin,extra={}){const r=await fetch(`${origin}/api/${path}`,{method:'POST',headers:{'Content-Type':'application/json',Origin:requestOrigin,Cookie:cookie,...extra},body:JSON.stringify(body)});return {status:r.status,data:await r.json(),headers:r.headers}}
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(origin)).ok){ready=true;break}}catch{}if(server.exitCode!==null)break;await new Promise(resolve=>setTimeout(resolve,500))}assert.ok(ready,logs.join('').slice(-5000));
 for(const page of ['/','/cemetery','/admin'])assert.equal((await fetch(origin+page)).status,200);
 const publicState=await get('state');assert.equal(publicState.status,200);assert.equal(publicState.data.isAdmin,false);assert.equal(publicState.data.attempt.status,'ACTIVE');
 const forged={'oai-authenticated-user-id':'forged','oai-authenticated-user-email':email};assert.equal((await get('state','',forged)).data.isAdmin,false);
 assert.equal((await post('admin',{action:'mark-dead',attemptId:publicState.data.attempt.id,reason:'Forged'},'',origin,forged)).status,403);
 assert.equal((await post('auth/login',{email,password},'','https://foreign.example')).status,403);
 assert.equal((await post('auth/login',{email,password:'incorrect'})).status,401);
 const login=await post('auth/login',{email,password});assert.equal(login.status,200);
 const setCookie=login.headers.get('set-cookie');for(const flag of ['HttpOnly','SameSite=Strict','Secure'])assert.ok(setCookie.includes(flag));
 const cookie=setCookie.split(';')[0];assert.equal((await get('state',cookie)).data.isAdmin,true);
 assert.equal((await get('state',cookie.replace('retry_admin=e','retry_admin=A'))).data.isAdmin,false);
 const payload=JSON.parse(Buffer.from(cookie.split('=')[1].split('.')[0],'base64url').toString());payload.expiresAt=Date.now()-1000;
 const expired=Buffer.from(JSON.stringify(payload)).toString('base64url'),mac=createHmac('sha256',env.AUTH_SECRET).update(expired).digest('base64url');assert.equal((await get('state',`retry_admin=${expired}.${mac}`)).data.isAdmin,false);
 assert.equal((await post('admin',{action:'register-next'},cookie,'https://foreign.example')).status,403);
 const current=publicState.data.attempt;
 assert.equal((await post('admin',{action:'register-next'},cookie)).status,400);
 assert.equal((await post('admin',{action:'mark-dead',attemptId:current.id,reason:''},cookie)).status,400);
 const closes=await Promise.all(['A','B'].map(reason=>post('admin',{action:'mark-dead',attemptId:current.id,reason:`QA closure ${reason}`},cookie)));assert.equal(closes.filter(r=>r.status===200).length,1);
 const after=(await get('state',cookie)).data;assert.equal(after.attempt,null);assert.equal(after.deadCount,publicState.data.deadCount+1);
 const buried=after.previous.find(a=>a.id===current.id);assert.equal(buried.token_address,current.token_address);assert.ok(buried.ended_at&&buried.lifespan);assert.equal(typeof buried.final_market_cap,'number');
 assert.equal((await post('admin',{action:'mark-dead',attemptId:current.id,reason:'Overwrite'},cookie)).status,400);assert.deepEqual((await get('state',cookie)).data.previous.find(a=>a.id===current.id),buried);
 assert.equal((await get('cemetery')).data.total,after.deadCount);
 assert.equal((await post('admin',{action:'register-next',tokenAddress:'invalid'},cookie)).status,400);
 assert.equal((await post('admin',{action:'register-next'},cookie)).status,400);
 const registrations=await Promise.all([post('admin',{action:'register-next',tokenAddress:'So11111111111111111111111111111111111111112'},cookie),post('admin',{action:'register-next',tokenAddress:'So11111111111111111111111111111111111111112'},cookie)]);assert.equal(registrations.filter(r=>r.status===200).length,1);
 const next=(await get('state',cookie)).data.attempt;assert.equal(next.attempt_number,current.attempt_number+1);
 await sql.execute({sql:'UPDATE attempts SET created_at=? WHERE id=?',args:[Date.now()-3*3600000,next.id]});assert.equal((await get('state',cookie)).data.attempt.status,'ACTIVE');
 const logout=await post('auth/logout',{},cookie);assert.equal(logout.status,200);assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'));assert.equal((await get('state')).data.isAdmin,false);
 for(let i=0;i<10;i++)assert.equal((await post('auth/login',{email,password:'wrong'})).status,401);
 const blocked=await post('auth/login',{email,password});assert.equal(blocked.status,429);assert.ok(Number(blocked.headers.get('retry-after'))>0);
 await sql.execute("UPDATE admin_login_limits SET expires_at=0");assert.equal((await post('auth/login',{email,password})).status,200);
 console.log('PASS: Next.js production routes, idempotent migrations, login, forged/expired sessions, CSRF, shared login limits, immutable snapshots, concurrent closure/registration and manual-only lifecycle.');
}finally{sql.close();server.kill();await Promise.race([once(server,'exit'),new Promise(resolve=>setTimeout(resolve,3000))])}
