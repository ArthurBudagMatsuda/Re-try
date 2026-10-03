import {database} from './db';
import {DexScreenerAdapter,type BlockchainAdapter} from './adapter';
import {ATTEMPT_CONFIG as C,INITIAL_ATTEMPT} from './config';
import type {Attempt} from './types';
export function hasStorage(){return !!process.env.DATABASE_URL?.trim()}
export class TokenManager{
 constructor(public adapter:BlockchainAdapter=new DexScreenerAdapter()){}
 async initialize(){
  if(!hasStorage())return;
  // Initialize only an empty archive. Closing attempt #001 must never recreate it.
  const a=INITIAL_ATTEMPT;
  await database().prepare("INSERT OR IGNORE INTO attempts (id,attempt_number,token_name,token_symbol,token_address,logo_url,status,created_at,peak_market_cap,peak_holders,volume) SELECT ?,?,?,?,?,?,'ACTIVE',?,0,0,0 WHERE NOT EXISTS (SELECT 1 FROM attempts)").bind(a.id,a.attempt_number,a.token_name,a.token_symbol,a.token_address,a.logo_url,a.created_at).run();
 }
 async getCurrentAttempt(){return hasStorage()?database().prepare("SELECT * FROM attempts WHERE status='ACTIVE' ORDER BY attempt_number DESC LIMIT 1").first<Attempt>():{...INITIAL_ATTEMPT}}
 async getTokenData(a:Attempt,now=Date.now()){return this.adapter.readToken(a.token_address,a.created_at,a.ended_at??now)}
 async markAttemptAsDead(attemptId:number,reason:string){
  if(!hasStorage())throw new Error('Persistent storage unavailable');
  const a=await database().prepare("SELECT * FROM attempts WHERE id=? AND status='ACTIVE'").bind(attemptId).first<Attempt>();if(!a)throw new Error('This attempt is no longer active. Refresh the panel.');
  const now=Date.now(),data=await this.getTokenData(a,now);
  if(data.marketStatus!=='live'||data.marketCap===null||data.totalVolume===null||data.buys===null||data.sells===null||data.transactions===null)throw new Error('Market snapshot unavailable. Try again before closing this attempt.');
  const result=await database().prepare("UPDATE attempts SET status='DEAD',ended_at=?,lifespan=?,failure_reason=?,final_market_cap=?,final_holders=NULL,peak_market_cap=MAX(peak_market_cap,?),volume=MAX(volume,?),buys=?,sells=?,transactions=? WHERE id=? AND status='ACTIVE'").bind(now,now-a.created_at,reason,data.marketCap,data.marketCap,data.totalVolume,data.buys,data.sells,data.transactions,a.id).run();
  if(!result.meta.changes)throw new Error('This attempt was already closed.');return a.id;
 }
 async createNextAttempt(input:{tokenAddress?:string;tokenName?:string;tokenSymbol?:string}={}){
  if(!hasStorage())throw new Error('Persistent storage unavailable');
  const db=database();if(await this.getCurrentAttempt())throw new Error('Close the current attempt before registering another.');
  const address=input.tokenAddress?.trim();if(!address||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address))throw new Error('Enter a valid Solana mint address.');
  const row=await db.prepare('SELECT COALESCE(MAX(attempt_number),0)+1 AS number FROM attempts').first<{number:number}>();const n=row!.number;
  try{const result=await db.prepare("INSERT INTO attempts (id,attempt_number,token_name,token_symbol,token_address,status,created_at,peak_market_cap,peak_holders,volume) SELECT ?,?,?,?,?,'ACTIVE',?,0,0,0 WHERE NOT EXISTS (SELECT 1 FROM attempts WHERE status='ACTIVE')").bind(n,n,input.tokenName?.trim()||'RE:TRY',input.tokenSymbol?.trim().replace(/^\$/,'')||'RETRY',address,Date.now()).run();if(!result.meta.changes)throw new Error('Concurrent registration')}catch{throw new Error('The mint already exists or another attempt was registered. Refresh the panel.')}
  const created=await this.getCurrentAttempt();if(created?.attempt_number!==n||created.token_address!==address)throw new Error('Another attempt was registered. Refresh the panel.');return created;
 }
 async snapshot(){
  await this.initialize();const now=Date.now();let attempt=await this.getCurrentAttempt(),metrics=null;
  if(attempt){metrics=await this.getTokenData(attempt,now);if(hasStorage()&&metrics.marketStatus==='live'){
   await database().prepare("UPDATE attempts SET peak_market_cap=MAX(peak_market_cap,?),volume=MAX(volume,?),buys=?,sells=?,transactions=? WHERE id=? AND status='ACTIVE'").bind(metrics.marketCap??0,metrics.totalVolume??0,metrics.buys??attempt.buys,metrics.sells??attempt.sells,metrics.transactions??attempt.transactions,attempt.id).run();attempt=await this.getCurrentAttempt();if(!attempt)metrics=null;
  }}
  const archive=await this.cemetery(5);
  return {attempt,metrics,previous:archive.items,deadCount:archive.total,serverTime:now,pollMs:C.pollMs,mode:'live' as const,storage:hasStorage()?'configured' as const:'unconfigured' as const};
 }
 async cemetery(limit=40,offset=0){
  await this.initialize();if(!hasStorage())return {items:[] as Attempt[],total:0,current:{...INITIAL_ATTEMPT},offset,hasMore:false};
  const items=(await database().prepare("SELECT * FROM attempts WHERE status='DEAD' ORDER BY attempt_number DESC LIMIT ? OFFSET ?").bind(limit,offset).all<Attempt>()).results;
  const count=await database().prepare("SELECT COUNT(*) AS count FROM attempts WHERE status='DEAD'").first<{count:number}>();return {items,total:count!.count,current:await this.getCurrentAttempt(),offset,hasMore:offset+items.length<count!.count};
 }
}
