import {TokenManager} from '@/lib/retry/attempts';
import {errorResponse} from '@/lib/retry/admin';
export async function GET(request:Request){try{const p=new URL(request.url).searchParams;const offset=Number(p.get('offset')??0);if(!Number.isInteger(offset)||offset<0)throw new Error('Invalid offset');return Response.json(await new TokenManager().cemetery(40,offset),{headers:{'Cache-Control':'no-store'}})}catch(e){return errorResponse(e)}}
