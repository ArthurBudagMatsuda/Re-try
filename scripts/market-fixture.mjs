// Test-only preload; never imported by application code or Vercel.
const original=globalThis.fetch;
globalThis.fetch=async(input,options)=>{
 const url=String(input?.url??input);
 if(!url.startsWith('https://api.dexscreener.com/token-pairs/v1/solana/'))return original(input,options);
 const address=decodeURIComponent(url.split('/').at(-1));
 return Response.json([{chainId:'solana',pairAddress:'fixture-pair',baseToken:{address},marketCap:123456,liquidity:{usd:45000},priceUsd:'0.000123456',priceChange:{h24:12.5},volume:{h24:34567},txns:{h24:{buys:230,sells:170}}}]);
};
