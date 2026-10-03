import {createSession,session,cookie,enforceOrigin,rateLimit,verifyWallet,errorResponse} from '@/lib/retry/auth';
import {database} from '@/lib/retry/db';
export async function GET(request:Request){try{await rateLimit(request);const s=await createSession(request);return Response.json({challenge:s.challenge,identity:s.wallet_address},{headers:{'Set-Cookie':cookie(request,s.id),'Cache-Control':'no-store'}})}catch(e){return errorResponse(e)}}
export async function POST(request:Request){try{enforceOrigin(request);await rateLimit(request);const s=await session(request);if(!s)throw new Error('Session expired. Reload and reconnect.');if(s.wallet_address)return Response.json({identity:s.wallet_address});const body=await request.json() as Record<string,any>;if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Invalid request');let identity:string;
 if(body.mode==='demo'){identity=`DEMO_${request.headers.get('oai-authenticated-user-id')??s.id}`}
 else if(body.mode==='wallet'&&typeof body.wallet==='string'&&body.wallet.length<=44&&Array.isArray(body.signature)){await verifyWallet(s,body.wallet,body.signature);identity=body.wallet}
 else throw new Error('Invalid connection request');await database().prepare('UPDATE sessions SET wallet_address=? WHERE id=? AND wallet_address IS NULL').bind(identity,s.id).run();return Response.json({identity},{headers:{'Cache-Control':'no-store'}})}catch(e){return errorResponse(e)}}

