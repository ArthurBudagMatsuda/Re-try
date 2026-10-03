import {ATTEMPT_CONFIG as C} from './config';
export type TokenData={marketCap:number;liquidity:number;holders:number;volume:number;buys:number;sells:number;transactions:number;ageMs:number};
export function shouldCreateNextAttempt(data:TokenData,communityVote:{retryVotes:number;keepVotes:number},votingRound:number,systemConditions:{enabled:boolean;providerHealthy:boolean},extraIndicators:Record<string,number>={}){
 const weak=[data.volume<C.minVolume,data.liquidity<C.minLiquidity,data.transactions<C.minTransactions,data.holders<C.minHolders,data.sells/Math.max(1,data.buys+data.sells)>C.maxSellShare].filter(Boolean).length;
 const total=communityVote.retryVotes+communityVote.keepVotes;
 const community=total>=C.communityMinimumVotes && communityVote.retryVotes/total>=C.communityRetryShare;
 const shouldRetry=systemConditions.enabled&&systemConditions.providerHealthy&&data.ageMs>=C.minAgeMs&&(weak>=C.requiredWeakSignals||(community&&weak>=C.communityWeakSignals));
 return {shouldRetry,weakSignals:weak,votingRound,extraIndicators,reason:shouldRetry?'Sustained loss of liquidity, volume and transaction activity.':null};
}
