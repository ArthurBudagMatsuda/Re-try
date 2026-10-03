import {adminSettings,createAdminSession,requireSameOrigin,sessionCookie,errorResponse} from '@/lib/retry/admin';
import {verifyPassword} from '@/lib/retry/password.mjs';
import {database} from '@/lib/retry/db';
export const runtime='nodejs';
export async function POST(request:Request){try{
 requireSameOrigin(request);
 const settings=adminSettings();if(!settings)throw new Error('Administrator login unavailable');
 const raw=await request.text();if(raw.length>2048)throw new Error('Request is too large');
 let body;try{body=JSON.parse(raw)}catch{throw new Error('Invalid login')}
 if(typeof body?.email!=='string'||typeof body?.password!=='string'||body.email.length>254||body.password.length>512)throw new Error('Invalid login');
 const now=Date.now(),windowMs=15*60*1000;
 const limit=await database().prepare(`INSERT INTO admin_login_limits (key,count,expires_at) VALUES ('admin-login',1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<=? THEN ? ELSE expires_at END RETURNING count,expires_at`).bind(now+windowMs,now,now,now+windowMs).first<{count:number;expires_at:number}>();
 if(limit!.count>10)return Response.json({error:'Too many login attempts. Please try again later.'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':String(Math.max(1,Math.ceil((limit!.expires_at-now)/1000)))}});
 const passwordValid=await verifyPassword(body.password,settings.passwordHash);
 if(body.email.trim().toLowerCase()!==settings.email||!passwordValid)return Response.json({error:'Invalid email or password.'},{status:401,headers:{'Cache-Control':'no-store'}});
 await database().prepare("DELETE FROM admin_login_limits WHERE key='admin-login'").run();
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':sessionCookie(createAdminSession())}});
 }catch(e){return errorResponse(e)}}
