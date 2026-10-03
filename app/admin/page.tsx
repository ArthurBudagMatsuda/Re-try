'use client';
import {useState} from 'react';
import {Input} from '@/components/ui/input';
import {Header,Footer,api} from '../retry-shared';
export default function AdminLogin(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function login(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');try{await api('auth/login',{email,password});window.location.assign('/')}catch(e){setError((e as Error).message);setBusy(false)}}
 return <div className="wrap"><Header/><main className="admin-login panel"><p className="eyebrow">RE:TRY / ADMINISTRATOR</p><h1>Sign in.</h1><p className="description">Every attempt needs someone who keeps going.</p><form onSubmit={login}><label className="field"><span>EMAIL</span><Input type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field"><span>PASSWORD</span><Input type="password" autoComplete="current-password" required maxLength={512} value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="notice" role="alert">{error}</p>}<button type="submit" className="view" disabled={busy}>{busy?'SIGNING IN...':'SIGN IN →'}</button></form></main><Footer/></div>
}
