import {TokenManager} from '@/lib/retry/attempts';
import {isAdmin,errorResponse} from '@/lib/retry/admin';
export async function GET(request:Request){try{return Response.json({...await new TokenManager().snapshot(),isAdmin:isAdmin(request)},{headers:{'Cache-Control':'no-store'}})}catch(e){return errorResponse(e)}}
