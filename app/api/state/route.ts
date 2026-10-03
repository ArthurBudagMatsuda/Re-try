import {TokenManager} from '@/lib/retry/service';
import {session,rateLimit,errorResponse} from '@/lib/retry/auth';
export async function GET(request:Request){try{await rateLimit(request);const s=await session(request);return Response.json({...await new TokenManager().snapshot(s?.wallet_address??null),identity:s?.wallet_address??null},{headers:{'Cache-Control':'no-store'}})}catch(e){return errorResponse(e)}}
