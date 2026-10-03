import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {validPasswordHash} from './password.mjs';
export const ADMIN_COOKIE='retry_admin';
export const SESSION_SECONDS=8*60*60;
export function adminSettings(){
 const email=process.env.RETRY_ADMIN_EMAIL?.trim().toLowerCase(),passwordHash=process.env.RETRY_ADMIN_PASSWORD_HASH,secret=process.env.AUTH_SECRET;
 if(!email||!validPasswordHash(passwordHash)||!secret||secret.length<32)return null;
 return {email,passwordHash:passwordHash!,secret};
}
function signature(payload:string,secret:string){return createHmac('sha256',secret).update(payload).digest()}
function configurationFingerprint(settings:NonNullable<ReturnType<typeof adminSettings>>){return createHash('sha256').update(`${settings.email}:${settings.passwordHash}`).digest('hex')}
export function createAdminSession(){
 const settings=adminSettings();if(!settings)throw new Error('Administrator login unavailable');
 const payload=Buffer.from(JSON.stringify({email:settings.email,expiresAt:Date.now()+SESSION_SECONDS*1000,config:configurationFingerprint(settings)})).toString('base64url');
 return `${payload}.${signature(payload,settings.secret).toString('base64url')}`;
}
export function isAdmin(request:Request){
 const settings=adminSettings();if(!settings)return false;
 const token=request.headers.get('cookie')?.split(';').map(item=>item.trim()).find(item=>item.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length+1);
 if(!token||token.length>2048)return false;
 try{
  const parts=token.split('.');if(parts.length!==2)return false;
  const [payload,mac]=parts,received=Buffer.from(mac,'base64url'),expected=signature(payload,settings.secret);
  if(received.length!==expected.length||!timingSafeEqual(received,expected))return false;
  const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
  return data.email===settings.email&&data.config===configurationFingerprint(settings)&&Number.isFinite(data.expiresAt)&&data.expiresAt>Date.now()&&data.expiresAt<=Date.now()+SESSION_SECONDS*1000;
 }catch{return false}
}
export function requireSameOrigin(request:Request){
 // Next.js normalizes local IPs in request.url; use the actual HTTP Host.
 const url=new URL(request.url),host=request.headers.get('host')??url.host;
 const expected=new URL(`${url.protocol}//${host}`).origin;
 if(request.headers.get('origin')!==expected)throw new Error('Origin rejected');
}
export function requireAdmin(request:Request){if(!isAdmin(request))throw new Error('Administrator access required');requireSameOrigin(request)}
export function sessionCookie(value:string,maxAge=SESSION_SECONDS){return `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV==='production'?'; Secure':''}`}
export function errorResponse(e:unknown){
 const message=e instanceof Error?e.message:'Service unavailable';
 const status=message==='Administrator access required'||message==='Origin rejected'?403:message.includes('unavailable')?503:400;
 console.error('RE:TRY',message);
 return Response.json({error:status===503?'Service unavailable. Please try again later.':message},{status,headers:{'Cache-Control':'no-store'}});
}
