import {database} from './db';
import {MockSolanaAdapter,simulatedAddress,type BlockchainAdapter} from './adapter';
import {ATTEMPT_CONFIG as C} from './config';
import type {Attempt} from './types';
export class TokenManager{
 constructor(public adapter:BlockchainAdapter=new MockSolanaAdapter()){}
 async initialize(){const db=database();
  // Upgrade legacy attempt statuses and complete final snapshots once, preserving original mints and dates.
  const legacy=(await db.prepare("SELECT * FROM attempts WHERE status NOT IN ('ACTIVE','DEAD')").all<Attempt>()).results;
  for(const a of legacy){if(a.status as string==='RUNNING'){await db.prepare("UPDATE attempts SET status='ACTIVE' WHERE id=? AND status='RUNNING'").bind(a.id).run()}else{const end=a.ended_at??Date.now(),data=await this.adapter.readToken(a.token_address,a.created_at,end);await db.prepare("UPDATE attempts SET status='DEAD',ended_at=?,lifespan=?,final_market_cap=?,final_holders=?,volume=MAX(volume,?),buys=?,sells=?,transactions=? WHERE id=? AND status NOT IN ('ACTIVE','DEAD')").bind(end,end-a.created_at,data.marketCap,data.holders,data.totalVolume,data.buys,data.sells,data.transactions,a.id).run()}}
  if(!(this.adapter instanceof MockSolanaAdapter))return;
  const present=await db.prepare('SELECT id FROM attempts LIMIT 1').first();if(present)return;
  const now=Date.now(),start=now-47*60000;
  for(const item of [{id:1,start:start-114*60000,end:start-72*60000,peak:168200,holders:614},{id:2,start:start-72*60000,end:start,peak:224800,holders:1108},{id:3,start,end:null,peak:142850,holders:842}]){
   const data=await this.adapter.readToken(simulatedAddress(item.id),item.start,item.end??now);
   await db.prepare('INSERT OR IGNORE INTO attempts (id,attempt_number,token_address,status,created_at,ended_at,failure_reason,peak_market_cap,peak_holders,volume,lifespan,final_market_cap,final_holders,buys,sells,transactions) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(item.id,item.id,simulatedAddress(item.id),item.end?'DEAD':'ACTIVE',item.start,item.end,item.end?'Archived simulated attempt.':null,item.peak,item.holders,data.totalVolume,item.end?item.end-item.start:null,item.end?data.marketCap:null,item.end?data.holders:null,data.buys,data.sells,data.transactions).run();
  }
 }
 async getCurrentAttempt(){return database().prepare("SELECT * FROM attempts WHERE status='ACTIVE' ORDER BY attempt_number DESC LIMIT 1").first<Attempt>()}
 async getTokenData(a:Attempt,now=Date.now()){return this.adapter.readToken(a.token_address,a.created_at,a.ended_at??now)}
 async markAttemptAsDead(attemptId:number,reason:string){const a=await database().prepare("SELECT * FROM attempts WHERE id=? AND status='ACTIVE'").bind(attemptId).first<Attempt>();if(!a)throw new Error('This attempt is no longer active. Refresh the panel.');const now=Date.now(),data=await this.getTokenData(a,now);
  const result=await database().prepare("UPDATE attempts SET status='DEAD',ended_at=?,lifespan=?,failure_reason=?,final_market_cap=?,final_holders=?,peak_market_cap=MAX(peak_market_cap,?),peak_holders=MAX(peak_holders,?),volume=MAX(volume,?),buys=?,sells=?,transactions=? WHERE id=? AND status='ACTIVE'").bind(now,now-a.created_at,reason,data.marketCap,data.holders,data.marketCap,data.holders,data.totalVolume,data.buys,data.sells,data.transactions,a.id).run();if(!result.meta.changes)throw new Error('This attempt was already closed.');return a.id;
 }
 async createNextAttempt(input:{tokenAddress?:string;tokenName?:string;tokenSymbol?:string}={}){const db=database();if(await this.getCurrentAttempt())throw new Error('Close the current attempt before registering another.');const row=await db.prepare('SELECT COALESCE(MAX(attempt_number),0)+1 AS number FROM attempts').first<{number:number}>();const n=row!.number;
  // Register metadata only. Token issuance belongs to a future separately authorized integration.
  const address=input.tokenAddress?.trim()||simulatedAddress(n);if(input.tokenAddress&&!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address))throw new Error('Enter a valid Solana mint address or leave it blank for a mock token.');
  try{await db.prepare("INSERT INTO attempts (id,attempt_number,token_name,token_symbol,token_address,status,created_at,peak_market_cap,peak_holders,volume) SELECT ?,?,?,?,?, 'ACTIVE',?,87000,842,0 WHERE NOT EXISTS (SELECT 1 FROM attempts WHERE status='ACTIVE')").bind(n,n,input.tokenName?.trim()||'RE:TRY',input.tokenSymbol?.trim().replace(/^\$/,'')||'RETRY',address,Date.now()).run()}catch{throw new Error('The mint already exists or another attempt was registered. Refresh the panel.')}
  const created=await this.getCurrentAttempt();if(created?.attempt_number!==n||created.token_address!==address)throw new Error('Another attempt was registered. Refresh the panel.');return created;
 }
 async snapshot(){await this.initialize();const now=Date.now(),db=database();let attempt=await this.getCurrentAttempt(),metrics=null,chart:number[][]=[];
  if(attempt){metrics=await this.getTokenData(attempt,now);await db.prepare("UPDATE attempts SET peak_market_cap=MAX(peak_market_cap,?),peak_holders=MAX(peak_holders,?),volume=MAX(volume,?),buys=?,sells=?,transactions=? WHERE id=? AND status='ACTIVE'").bind(metrics.marketCap,metrics.holders,metrics.totalVolume,metrics.buys,metrics.sells,metrics.transactions,attempt.id).run();attempt=await this.getCurrentAttempt();if(attempt){const a=attempt;chart=await Promise.all(Array.from({length:C.chartSampleCount},async(_,i)=>{const data=await this.getTokenData(a,Math.max(a.created_at,now-(C.chartSampleCount-1-i)*60000));return [i*12,105-data.marketCap/C.chartScale*90]}))}else metrics=null}
  const previous=(await db.prepare("SELECT * FROM attempts WHERE status='DEAD' ORDER BY attempt_number DESC LIMIT 5").all<Attempt>()).results;const count=await db.prepare("SELECT COUNT(*) AS count FROM attempts WHERE status='DEAD'").first<{count:number}>();return {attempt,metrics,chart,previous,deadCount:count?.count??0,serverTime:now,pollMs:C.pollMs,mode:'simulation'};
 }
 async cemetery(limit=40,offset=0){await this.initialize();const items=(await database().prepare("SELECT * FROM attempts WHERE status='DEAD' ORDER BY attempt_number DESC LIMIT ? OFFSET ?").bind(limit,offset).all<Attempt>()).results;const count=await database().prepare("SELECT COUNT(*) AS count FROM attempts WHERE status='DEAD'").first<{count:number}>();return {items,total:count!.count,current:await this.getCurrentAttempt(),offset,hasMore:offset+items.length<count!.count};}
}
