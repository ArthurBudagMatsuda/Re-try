import {ATTEMPT_CONFIG as C} from './config';
import type {TokenData} from './decision';
export interface BlockchainAdapter{readToken(address:string,createdAt:number,now:number):Promise<TokenData>;createToken(attemptNumber:number):Promise<string>}
export class MockSolanaAdapter implements BlockchainAdapter{
 async createToken(n:number){return `SIMULATED_RETRY_MINT_${String(n).padStart(3,'0')}_NO_ONCHAIN_TOKEN`}
 async readToken(address:string,createdAt:number,now:number):Promise<TokenData>{
  const ageMs=Math.max(0,now-createdAt),age=ageMs/60000;
  const factor=Math.max(.012,1-Math.max(0,ageMs-C.mockDecayStartsMs)/C.mockDecayDurationMs);
  const wave=1+Math.sin(age*.7)*.035+Math.sin(age*.17)*.06;
  const buys=Math.round(372*factor),sells=Math.round(241*factor);
  return {marketCap:Math.round((87000+Math.min(age,50)*1110)*wave*factor),liquidity:Math.round(28400*factor),holders:Math.round(842*factor),volume:Math.round(67920*factor),buys,sells,transactions:buys+sells,ageMs};
 }
}
