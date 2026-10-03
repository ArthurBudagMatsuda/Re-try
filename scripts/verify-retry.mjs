import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const origin='http://127.0.0.1:5173';
const headers={'Origin':origin,'Content-Type':'application/json'};
async function get(path,cookie=''){const r=await fetch(origin+'/api/'+path,{headers:{Cookie:cookie}});return {r,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
async function post(path,body,cookie=''){const r=await fetch(origin+'/api/'+path,{method:'POST',headers:{...headers,Cookie:cookie},body:JSON.stringify(body)});return {r,data:await r.json()}}
function sql(query){const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',query],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
sql('DELETE FROM votes; DELETE FROM voting_rounds; DELETE FROM sessions; DELETE FROM attempts; DELETE FROM rate_limits;');
const first=await get('state');assert.equal(first.r.status,200);assert.equal(first.data.attempt.status,'RUNNING');
const unauth=await post('vote',{choice:'retry'});assert.equal(unauth.r.status,400);
const s=await get('session');const cookie=s.cookie;assert.ok(cookie);assert.equal((await post('session',{mode:'demo'},cookie)).r.status,200);
assert.equal((await post('vote',{choice:'retry',attemptId:999},cookie)).r.status,400);
const voted=await post('vote',{choice:'retry'},cookie);assert.equal(voted.r.status,200);assert.equal(voted.data.myVote,'retry');assert.equal(voted.data.round.retry_votes,1);
await new Promise(r=>setTimeout(r,1600));assert.equal((await post('vote',{choice:'keep'},cookie)).r.status,400);
const rejectedOrigin=await fetch(origin+'/api/vote',{method:'POST',headers:{...headers,Origin:'https://attacker.invalid',Cookie:cookie},body:JSON.stringify({choice:'retry'})});assert.ok([400,403].includes(rejectedOrigin.status));
const w=await get('session');const keys=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);const pub=new Uint8Array(await crypto.subtle.exportKey('raw',keys.publicKey));
function encode58(bytes){const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';let n=BigInt('0x'+Buffer.from(bytes).toString('hex')),s='';while(n){s=alphabet[Number(n%58n)]+s;n/=58n}for(const b of bytes){if(b!==0)break;s='1'+s}return s}
const wallet=encode58(pub);assert.equal((await post('session',{mode:'wallet',wallet,signature:Array(64).fill(0)},w.cookie)).r.status,400);
const signature=Array.from(new Uint8Array(await crypto.subtle.sign('Ed25519',keys.privateKey,new TextEncoder().encode(w.data.challenge))));assert.equal((await post('session',{mode:'wallet',wallet,signature},w.cookie)).r.status,200);
assert.equal((await post('vote',{choice:'keep'},w.cookie)).r.status,200);
const w2=await get('session');const sig2=Array.from(new Uint8Array(await crypto.subtle.sign('Ed25519',keys.privateKey,new TextEncoder().encode(w2.data.challenge))));assert.equal((await post('session',{mode:'wallet',wallet,signature:sig2},w2.cookie)).r.status,200);assert.equal((await post('vote',{choice:'retry'},w2.cookie)).r.status,400);
const previous=(await get('state',cookie)).data.round;const n=Date.now();sql(`UPDATE attempts SET created_at=${n-3600005} WHERE status='RUNNING'`);sql(`UPDATE voting_rounds SET ends_at=${n-5} WHERE id='${previous.id}'`);
const next=(await get('state',cookie)).data;assert.equal(next.round.round_number,3);assert.equal(next.round.retry_votes,0);assert.equal(next.round.keep_votes,0);assert.equal(next.myVote,null);const archived=next.roundHistory.find(r=>r.id===previous.id);assert.equal(archived.retry_votes,1);assert.equal(archived.keep_votes,1);assert.ok(next.round.ends_at-next.serverTime>1700000);
sql(`UPDATE attempts SET created_at=${Date.now()-3*3600000} WHERE status='RUNNING'`);const failed=(await get('state',cookie)).data;assert.equal(failed.attempt.status,'FAILED');assert.equal(failed.round.status,'CLOSED');await new Promise(r=>setTimeout(r,6500));const retry=(await get('state',cookie)).data;assert.equal(retry.attempt.attempt_number,failed.attempt.attempt_number+1);assert.equal(retry.attempt.status,'RUNNING');assert.equal(retry.round.round_number,1);assert.notEqual(retry.attempt.token_address,failed.attempt.token_address);
console.log('PASS: server validation, origin checks, vote uniqueness, signed wallet verification, archived rounds, vote reset, automatic failure and next attempt.');

