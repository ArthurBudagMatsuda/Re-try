import {database} from './db';
import {MockSolanaAdapter,type BlockchainAdapter} from './adapter';
import {ATTEMPT_CONFIG as C} from './config';
import {shouldCreateNextAttempt} from './decision';
export type Attempt={id:number;attempt_number:number;token_address:string;status:string;created_at:number;ended_at:number|null;failure_reason:string|null;peak_market_cap:number;peak_holders:number;volume:number};
export type Round={id:string;attempt_id:number;round_number:number;started_at:number;ends_at:number;retry_votes:number;keep_votes:number;status:string};
export class TokenManager{
 constructor(public adapter:BlockchainAdapter=new MockSolanaAdapter()){}
 async seed(now:number){if(!(this.adapter instanceof MockSolanaAdapter))return;const db=database();const started=now-47*60000;
  await db.batch([
   db.prepare("INSERT OR IGNORE INTO attempts VALUES (1,1,?,'FAILED',?,?,?,168200,614,45230)").bind(await this.adapter.createToken(1),started-114*60000,started-72*60000,'Liquidity and volume declined.'),
   db.prepare("INSERT OR IGNORE INTO attempts VALUES (2,2,?,'FAILED',?,?,?,224800,1108,98620)").bind(await this.adapter.createToken(2),started-72*60000,started,'Transaction activity remained below configured conditions.'),
   db.prepare("INSERT OR IGNORE INTO attempts VALUES (3,3,?,'RUNNING',?,NULL,NULL,142850,842,67920)").bind(await this.adapter.createToken(3),started),
  ]);
 }
 async getCurrentAttempt(){return await database().prepare('SELECT * FROM attempts ORDER BY attempt_number DESC LIMIT 1').first<Attempt>()}
 async getTokenData(a:Attempt,now:number){return this.adapter.readToken(a.token_address,a.created_at,a.ended_at??now)}
 async markAttemptAsFailed(a:Attempt,reason:string,now:number){await database().batch([
  database().prepare("UPDATE attempts SET status='FAILED',ended_at=?,failure_reason=? WHERE id=? AND status='RUNNING'").bind(now,reason,a.id),
  database().prepare("UPDATE voting_rounds SET status='CLOSED',ends_at=MIN(ends_at,?) WHERE attempt_id=? AND status='OPEN'").bind(now,a.id),
 ])}
 async createNextAttempt(a:Attempt,now:number){const n=a.attempt_number+1;await database().prepare("INSERT OR IGNORE INTO attempts SELECT ?,?,?,'RUNNING',?,NULL,NULL,87000,842,67920 FROM attempts WHERE id=? AND status='FAILED' AND ended_at<=?").bind(n,n,await this.adapter.createToken(n),now,a.id,now-C.transitionMs).run()}
 async syncRounds(a:Attempt,now:number){const db=database();const current=Math.floor((now-a.created_at)/C.roundDurationMs)+1;const statements=[];
  for(let n=1;n<=Math.min(current,100);n++){const start=a.created_at+(n-1)*C.roundDurationMs,end=start+C.roundDurationMs;statements.push(db.prepare("INSERT OR IGNORE INTO voting_rounds (id,attempt_id,round_number,started_at,ends_at,retry_votes,keep_votes,status) VALUES (?,?,?,?,?,0,0,?)").bind(`${a.id}:${n}`,a.id,n,start,end,end<=now?'CLOSED':'OPEN'))}
  statements.push(db.prepare("UPDATE voting_rounds SET status='CLOSED' WHERE ends_at<=? AND status='OPEN'").bind(now));await db.batch(statements);
  return await db.prepare('SELECT * FROM voting_rounds WHERE attempt_id=? ORDER BY round_number DESC LIMIT 1').bind(a.id).first<Round>();
 }
 async snapshot(wallet:string|null=null){const now=Date.now(),db=database();await this.seed(now);let a=(await this.getCurrentAttempt())!;
  if(a.status==='FAILED'&&now-(a.ended_at??now)>=C.transitionMs){await this.createNextAttempt(a,now);a=(await this.getCurrentAttempt())!}
  let round=await this.syncRounds(a,a.ended_at??now);const metrics=await this.getTokenData(a,now);
  if(a.status==='RUNNING'){await db.prepare('UPDATE attempts SET peak_market_cap=MAX(peak_market_cap,?),peak_holders=MAX(peak_holders,?),volume=MAX(volume,?) WHERE id=?').bind(metrics.marketCap,metrics.holders,metrics.volume,a.id).run();
   const decision=shouldCreateNextAttempt(metrics,{retryVotes:round?.retry_votes??0,keepVotes:round?.keep_votes??0},round?.round_number??1,{enabled:true,providerHealthy:true});
   if(decision.shouldRetry){await this.markAttemptAsFailed(a,decision.reason!,now);a=(await this.getCurrentAttempt())!;round=await db.prepare('SELECT * FROM voting_rounds WHERE id=?').bind(round!.id).first<Round>()}
  }
  const history=(await db.prepare('SELECT * FROM attempts ORDER BY attempt_number DESC LIMIT 50').all<Attempt>()).results;
  const roundHistory=(await db.prepare("SELECT * FROM voting_rounds WHERE status='CLOSED' ORDER BY started_at DESC LIMIT 50").all<Round>()).results;
  const myVote=wallet&&round?await db.prepare('SELECT choice FROM votes WHERE voting_round_id=? AND wallet_address=?').bind(round.id,wallet).first<{choice:string}>():null;
  const chart=await Promise.all(Array.from({length:50},async(_,i)=>{const sampledAt=Math.max(a.created_at,(a.ended_at??now)-(49-i)*60000);const point=await this.adapter.readToken(a.token_address,a.created_at,sampledAt);return [i*12,105-point.marketCap/180000*90]}));
  return {attempt:a,metrics,chart,round,history,roundHistory,myVote:myVote?.choice??null,serverTime:now,pollMs:C.pollMs,roundDurationMs:C.roundDurationMs,mode:'simulation'};
 }
}
