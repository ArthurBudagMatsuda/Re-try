import {requireSameOrigin,sessionCookie,errorResponse} from '@/lib/retry/admin';
export const runtime='nodejs';
export async function POST(request:Request){try{requireSameOrigin(request);return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':sessionCookie('',0)}})}catch(e){return errorResponse(e)}}
