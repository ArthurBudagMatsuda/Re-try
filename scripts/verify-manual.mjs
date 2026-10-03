import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const origin='http://127.0.0.1:5173';
async function get(path,cookie=''){const r=await fetch(origin+'/api/'+path,{headers:{Cookie:cookie}});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={error:text}}return {status:r.status,data}}
async function action(body,cookie='',requestOrigin=origin){const r=await fetch(origin+'/api/admin',{method:'POST',headers:{Cookie:cookie,Origin:requestOrigin,'Content-Type':'application/json'},body:JSON.stringify(body)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={error:text}}return {status:r.status,data}}
function sql(query){const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',query],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout}
const login=await fetch(origin+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});assert.equal(login.status,302);const cookie=login.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
let state=await get('state',cookie);assert.equal(state.status,200);assert.equal(state.data.isAdmin,true);
assert.equal((await action({action:'register-next'})).status,403);
assert.ok([400,403].includes((await action({action:'register-next'},cookie,'https://attacker.invalid')).status));
if(!state.data.attempt){assert.equal((await action({action:'register-next'},cookie)).status,200);state=await get('state',cookie)}
const current=state.data.attempt;assert.equal(current.status,'ACTIVE');
assert.equal((await action({action:'register-next'},cookie)).status,400);
assert.equal((await action({action:'mark-dead',attemptId:current.id,reason:''},cookie)).status,400);
const oldCount=state.data.deadCount;
assert.equal((await action({action:'mark-dead',attemptId:current.id,reason:'Manual verification: final snapshot test.'},cookie)).status,200);
const deadState=(await get('state',cookie)).data;assert.equal(deadState.attempt,null);assert.equal(deadState.deadCount,oldCount+1);
const buried=deadState.previous.find(a=>a.id===current.id);assert.equal(buried.status,'DEAD');assert.equal(buried.token_address,current.token_address);assert.ok(buried.ended_at&&buried.lifespan);assert.equal(typeof buried.final_market_cap,'number');assert.equal(typeof buried.final_holders,'number');assert.ok(buried.transactions>=buried.buys+buried.sells);
assert.equal((await action({action:'mark-dead',attemptId:current.id,reason:'Overwrite attempt'},cookie)).status,400);
assert.deepEqual((await get('state',cookie)).data.previous.find(a=>a.id===current.id),buried);
const cemetery=(await get('cemetery',cookie)).data;assert.equal(cemetery.total,oldCount+1);assert.ok(cemetery.items.some(a=>a.id===current.id));assert.equal(cemetery.current,null);
await new Promise(r=>setTimeout(r,6500));assert.equal((await get('state',cookie)).data.attempt,null);
assert.equal((await action({action:'register-next',tokenAddress:'invalid-mint'},cookie)).status,400);
assert.equal((await action({action:'register-next'},cookie)).status,200);
const next=(await get('state',cookie)).data.attempt;assert.equal(next.attempt_number,current.attempt_number+1);assert.notEqual(next.token_address,current.token_address);
// Weak activity never changes status or registers a replacement.
sql(`UPDATE attempts SET created_at=${Date.now()-3*3600000} WHERE id=${next.id}`);
const weak=(await get('state',cookie)).data;assert.equal(weak.attempt.id,next.id);assert.equal(weak.attempt.status,'ACTIVE');assert.ok(weak.metrics.activity<10);
const tables=sql("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'");assert.ok(tables.includes('attempts'));
const page=await fetch(origin+'/cemetery');assert.equal(page.status,200);assert.ok((await page.text()).includes('The Cemetery'));
const [one,two]=await Promise.all([action({action:'mark-dead',attemptId:next.id,reason:'Concurrent close A'},cookie),action({action:'mark-dead',attemptId:next.id,reason:'Concurrent close B'},cookie)]);assert.equal([one,two].filter(r=>r.status===200).length,1);
assert.equal((await action({action:'register-next',tokenAddress:current.token_address},cookie)).status,400);
assert.equal((await action({action:'register-next'},cookie)).status,200);
console.log('PASS: administrator authorization, final snapshots, immutable mints, manual-only lifecycle, concurrent closure, Cemetery count, preserved history and weak-activity monitoring.');

