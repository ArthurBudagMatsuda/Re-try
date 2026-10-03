'use client';
import {useCallback,useEffect,useState} from 'react';
import {Copy,Check} from 'lucide-react';
import {Toaster,toast} from 'sonner';
import type {Attempt,Snapshot} from '@/lib/retry/types';
import {api,Header,Footer,Metric,AttemptDetails,money,num,number,clock,duration} from './retry-shared';
import AdminControls from './retry-admin';
import Lore from './retry-lore';
import MintNotice from './mint-notice';
export default function Dashboard(){
 const [state,setState]=useState<Snapshot|null>(null),[now,setNow]=useState(()=>Date.now()),[offset,setOffset]=useState(0),[error,setError]=useState(''),[details,setDetails]=useState<Attempt|null>(null),[copied,setCopied]=useState(false);
 const refresh=useCallback(async()=>{try{const data=await api<Snapshot>('state');setState(data);setOffset(data.serverTime-Date.now());setError('');return data}catch(e){setError((e as Error).message);return null}},[]);
 useEffect(()=>{void Promise.resolve().then(refresh);const poll=setInterval(()=>void refresh(),30000),timer=setInterval(()=>setNow(Date.now()),1000);return()=>{clearInterval(poll);clearInterval(timer)}},[refresh]);
 const copy=async()=>{if(!state?.attempt)return;try{await navigator.clipboard.writeText(state.attempt.token_address);setCopied(true);setTimeout(()=>setCopied(false),2000)}catch{toast.error('Clipboard unavailable. Select and copy the mint text.')}};
 const time=now+offset,a=state?.attempt,m=state?.metrics;
 return <div className="wrap"><Toaster theme="dark" position="bottom-right"/><Header error={!!error||m?.marketStatus==='unavailable'}/><section className="intro"><div><p className="eyebrow">ONE EXPERIMENT. INFINITE ATTEMPTS.</p><h1>Every attempt can fail.<br/>The project <span>continues.</span></h1></div><div className="intro-note">Every failure becomes history.<br/>The next attempt begins.</div></section>
 {error&&<div className="notice" role="alert">{error} {state?'Showing the last received statistics.':''} <button className="view" onClick={()=>void refresh()}>RECONNECT</button></div>}
 {!state?<div className="panel loading">CONNECTING TO RE:TRY...</div>:<>
 <section className="panel" aria-label="Current attempt"><div className="panel-top"><span>CURRENT ATTEMPT</span><span>{a?'SOLANA':'AWAITING NEXT ATTEMPT'}</span></div>{a&&m?<>
 <div className="attempt-grid"><div className="identity"><span className="status mono"><span className="dot"/>ACTIVE</span><div className="attempt-number mono"><small>#</small>{number(a.attempt_number)}</div><div className="token-line mono"><img src={a.logo_url} alt="RE:TRY attempt"/><span>${a.token_symbol}</span></div><div className="mint mono"><span className="mint-label">MINT ADDRESS<MintNotice/></span><span className="mint-value" title={a.token_address}>{a.token_address}</span><button className="icon-button" onClick={()=>void copy()} aria-label="Copy mint address">{copied?<Check size={14}/>:<Copy size={14}/>}</button></div></div>
 <div className="data-side"><div className="metrics"><Metric label="MARKET CAP" value={money(m.marketCap)}/><Metric label="LIQUIDITY" value={money(m.liquidity)}/><Metric label="PRICE / USD" value={m.priceUsd===null?'—':'$'+m.priceUsd.toLocaleString('en-US',{maximumSignificantDigits:6})}/></div>
 <div className="market-summary mono"><div className="chart-header"><span>DEX SCREENER / MAIN PAIR</span><span>24H</span></div><div className="market-change">{m.priceChange24h===null?'—':`${m.priceChange24h>0?'+':''}${m.priceChange24h.toLocaleString('en-US',{maximumFractionDigits:2})}%`}</div><span className="description">PRICE CHANGE / 24H</span><div className="market-links"><a className="text-link" href={m.pairAddress?'https://dexscreener.com/solana/'+encodeURIComponent(m.pairAddress):'https://dexscreener.com/solana/'+encodeURIComponent(a.token_address)} target="_blank" rel="noopener noreferrer">VIEW LIVE CHART →</a><a className="text-link" href={'https://solscan.io/token/'+encodeURIComponent(a.token_address)} target="_blank" rel="noopener noreferrer">SOLSCAN →</a></div></div></div></div>
 {m.marketStatus!=='live'&&<p className="notice" role="status">{m.marketStatus==='unlisted'?'No indexed trading pair is available for this mint yet.':'Market data is temporarily unavailable. The mint remains active.'} Missing values are shown as —.</p>}
 <div className="activity-grid"><Metric label="VOLUME / 24H" value={money(m.totalVolume)}/><Metric label="BUYS / 24H" value={num(m.buys)}/><Metric label="SELLS / 24H" value={num(m.sells)}/><Metric label="TRANSACTIONS / 24H" value={num(m.transactions)}/></div>
 <div className="activity-strip mono"><span>DEX SCREENER · UPDATES EVERY 30S</span><span className="age">TRACKED {clock(time-a.created_at)}</span></div>
 </>:<div className="empty-panel"><span className="empty-mark mono">#___</span><h2>The last attempt left a trace.</h2><p className="description">There is no active attempt.<br/>The next one begins when the administrator registers it.</p><a className="text-link mono" href="/cemetery">ENTER THE CEMETERY</a></div>}</section>
 <AdminControls state={state} refresh={refresh}/>
 <section className="previous"><div className="section-header"><h2>Previous attempts</h2><a className="text-link mono" href="/cemetery">ENTER THE CEMETERY</a></div>{state.previous.length?<div className="previous-grid">{state.previous.slice(0,3).map(a=><button className="previous-card" key={a.id} onClick={()=>setDetails(a)} aria-label={`View RE:TRY ${number(a.attempt_number)}`}><img src={a.logo_url} alt=""/><div><strong>#{number(a.attempt_number)}</strong><small>{duration(a.lifespan??0)}</small></div><span className="dead-label">DEAD</span></button>)}</div>:<p className="description">No attempts have been buried yet.</p>}</section>
 </>}
 <Lore/><AttemptDetails attempt={details} onClose={()=>setDetails(null)}/><Footer/></div>
}
