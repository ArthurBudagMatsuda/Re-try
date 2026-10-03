import {TokenManager,hasStorage} from '@/lib/retry/attempts';
import {isAdmin,errorResponse} from '@/lib/retry/admin';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return Response.json({...await new TokenManager().snapshot(),isAdmin:hasStorage()&&isAdmin(request)},{headers:{'Cache-Control':'no-store'}})}catch(e){return errorResponse(e)}}
