import type {TokenData} from './types';
export interface BlockchainAdapter{readToken(address:string,createdAt:number,now:number):Promise<TokenData>}
type Pair={chainId?:string;pairAddress?:string;baseToken?:{address?:string};marketCap?:number;liquidity?:{usd?:number};volume?:{h24?:number};txns?:{h24?:{buys?:number;sells?:number}};priceUsd?:string;priceChange?:{h24?:number}};
const value=(n:unknown):number|null=>typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null;
export function parseTokenPairs(raw:unknown,address:string,ageMs:number,now:number):TokenData{
 const pairs=(Array.isArray(raw)?raw:[]).filter((p:Pair)=>p?.chainId==='solana'&&p.baseToken?.address===address) as Pair[];
 const pair=pairs.sort((a,b)=>(value(b.liquidity?.usd)??0)-(value(a.liquidity?.usd)??0))[0];
 const buys=value(pair?.txns?.h24?.buys),sells=value(pair?.txns?.h24?.sells);
 return {marketCap:value(pair?.marketCap),liquidity:value(pair?.liquidity?.usd),holders:null,totalVolume:value(pair?.volume?.h24),buys,sells,transactions:buys===null||sells===null?null:buys+sells,ageMs,activity:null,priceUsd:value(Number(pair?.priceUsd)),priceChange24h:typeof pair?.priceChange?.h24==='number'&&Number.isFinite(pair.priceChange.h24)?pair.priceChange.h24:null,pairAddress:pair?.pairAddress??null,marketStatus:pair?'live':'unlisted',updatedAt:now};
}
const cache=new Map<string,{expires:number;data:TokenData}>();
const pending=new Map<string,Promise<TokenData>>();
export class DexScreenerAdapter implements BlockchainAdapter{
 async readToken(address:string,createdAt:number,now:number):Promise<TokenData>{
  const saved=cache.get(address);if(saved&&saved.expires>Date.now())return {...saved.data,ageMs:Math.max(0,now-createdAt)};
  let task=pending.get(address);
  if(!task){task=(async()=>{try{
   const r=await fetch(`https://api.dexscreener.com/token-pairs/v1/solana/${encodeURIComponent(address)}`,{cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!r.ok)throw new Error('Market provider unavailable');
   const raw:unknown=await r.json();if(!Array.isArray(raw))throw new Error('Invalid market response');
   const data=parseTokenPairs(raw,address,Math.max(0,now-createdAt),Date.now());if(cache.size>=64)cache.delete(cache.keys().next().value!);cache.set(address,{expires:Date.now()+30000,data});return data;
  }catch{return {...parseTokenPairs([],address,Math.max(0,now-createdAt),Date.now()),marketStatus:'unavailable' as const}}
  finally{pending.delete(address)}})();pending.set(address,task)}
  const data=await task;return {...data,ageMs:Math.max(0,now-createdAt)};
 }
}

