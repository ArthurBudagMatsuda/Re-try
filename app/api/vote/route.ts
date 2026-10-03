import {database} from '@/lib/retry/db';
import {TokenManager} from '@/lib/retry/service';
import {session,enforceOrigin,rateLimit,errorResponse} from '@/lib/retry/auth';
import {ATTEMPT_CONFIG as C} from '@/lib/retry/config';
export async function POST(request:Request){try{enforceOrigin(request);await rateLimit(request);if(Number(request.headers.get('content-length')??0)>1024)throw new Error('Invalid vote');const s=await session(request);if(!s?.wallet_address)throw new Error('Connect a voting identity first');const body=await request.json() as Record<string,any>;if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Invalid request');if(Object.keys(body).some(k=>k!=='choice')||!['retry','keep'].includes(body.choice))throw new Error('Invalid vote');
 const manager=new TokenManager(),state=await manager.snapshot(s.wallet_address),now=Date.now();if(state.attempt.status!=='RUNNING'||!state.round||state.round.ends_at<=now)throw new Error('This round has closed. Refresh to vote in the next round.');const db=database();
 const gate=await db.prepare('UPDATE sessions SET last_action_at=? WHERE id=? AND last_action_at<=? RETURNING id').bind(now,s.id,now-C.actionCooldownMs).first();if(!gate)throw new Error('Too many actions. Please wait.');
 const result=await db.batch([
  db.prepare("INSERT OR IGNORE INTO votes (id,voting_round_id,wallet_address,choice,created_at) SELECT ?,id,?,?,? FROM voting_rounds WHERE id=? AND status='OPEN' AND ends_at>? AND attempt_id=(SELECT id FROM attempts WHERE status='RUNNING' ORDER BY id DESC LIMIT 1)").bind(crypto.randomUUID(),s.wallet_address,body.choice,now,state.round.id,now),
  db.prepare("UPDATE voting_rounds SET retry_votes=(SELECT COUNT(*) FROM votes WHERE voting_round_id=? AND choice='retry'),keep_votes=(SELECT COUNT(*) FROM votes WHERE voting_round_id=? AND choice='keep') WHERE id=?").bind(state.round.id,state.round.id,state.round.id),
 ]);if(!result[0].meta.changes)throw new Error('Already voted in this round, or the round has just closed.');return Response.json({ok:true,...await manager.snapshot(s.wallet_address)},{headers:{'Cache-Control':'no-store'}})}catch(e){return errorResponse(e)}}

