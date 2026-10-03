import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(readFileSync('lib/retry/adapter.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {parseTokenPairs,DexScreenerAdapter}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const mint='11111111111111111111111111111111';
const pair={chainId:'solana',baseToken:{address:mint},marketCap:100,liquidity:{usd:20},volume:{h24:30},txns:{h24:{buys:2,sells:3}}};
const data=parseTokenPairs([{...pair,baseToken:{address:'other'},quoteToken:{address:mint},liquidity:{usd:9999}},pair,{...pair,liquidity:{usd:10},marketCap:999}],mint,12,34);
assert.equal(data.marketCap,100);assert.equal(data.transactions,5);assert.equal(data.holders,null);assert.equal(data.priceUsd,null);assert.equal(data.priceChange24h,null);
assert.equal(parseTokenPairs([],mint,0,0).marketStatus,'unlisted');assert.equal(parseTokenPairs([{...pair,marketCap:NaN,volume:{},txns:{}}],mint,0,0).totalVolume,null);
const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('offline')};
try{const offline=await new DexScreenerAdapter().readToken(mint,0,100);assert.equal(offline.marketStatus,'unavailable');assert.equal(offline.marketCap,null)}finally{globalThis.fetch=original}
console.log('PASS: exact mint matching, main-pair selection, missing metrics, 24h totals and provider outage without fabricated values.');
