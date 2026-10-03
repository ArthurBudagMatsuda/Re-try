// All values apply to the mock MVP only; calibrate against actual observations before live use.
export const ATTEMPT_CONFIG={
 roundDurationMs:30*60*1000,pollMs:5000,transitionMs:6000,
 minAgeMs:90*60*1000,minVolume:1500,minLiquidity:3000,minTransactions:20,
 minHolders:100,maxSellShare:.8,requiredWeakSignals:3,
 communityRetryShare:.65,communityMinimumVotes:10,communityWeakSignals:2,
 mockDecayStartsMs:90*60*1000,mockDecayDurationMs:30*60*1000,
 sessionLifetimeMs:24*60*60*1000,challengeLifetimeMs:5*60*1000,
 actionCooldownMs:1500,simulationCooldownMs:60*1000,ipRequestsPerMinute:90,
};
