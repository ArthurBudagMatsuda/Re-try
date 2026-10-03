import type {Metadata} from 'next';
import Cemetery from './cemetery-client';
export const metadata:Metadata={title:'The Cemetery — RE:TRY',description:'Every attempt eventually leaves a trace. The archive of fallen RE:TRY attempts.'};
export default function Page(){return <Cemetery/>}
