import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {parseEnv} from 'node:util';
import {hashPassword} from '../lib/retry/password.mjs';
if(!process.stdin.isTTY)throw new Error('Run admin:setup in an interactive terminal.');
let muted=false;
const output=new Writable({write(chunk,encoding,callback){if(!muted)process.stdout.write(chunk);callback()}});
const rl=createInterface({input:process.stdin,output,terminal:true});
try{
 const email=(await rl.question('Administrator email: ')).trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email.');
 process.stdout.write('Administrator password (at least 12 characters; input hidden): ');muted=true;
 const password=await rl.question('');muted=false;process.stdout.write('\n');
 if(password.length<12||password.length>512)throw new Error('Use a password with 12–512 characters.');
 process.stdout.write('Confirm password (input hidden): ');muted=true;
 const confirmation=await rl.question('');muted=false;process.stdout.write('\n');
 if(password!==confirmation)throw new Error('Passwords do not match.');
 let source;try{source=await readFile('.env','utf8')}catch{source=await readFile('.env.example','utf8')}
 const values=parseEnv(source);
 const updates={RETRY_ADMIN_EMAIL:email,RETRY_ADMIN_PASSWORD_HASH:await hashPassword(password),AUTH_SECRET:values.AUTH_SECRET?.length>=32?values.AUTH_SECRET:randomBytes(32).toString('hex')};
 for(const [key,value] of Object.entries(updates)){
  const line=`${key}=${JSON.stringify(value)}`,regex=new RegExp(`^${key}=.*$`,'m');
  source=regex.test(source)?source.replace(regex,()=>line):source+'\n'+line+'\n';
 }
 await writeFile('.env',source,{mode:0o600});
 console.log('Administrator configured in .env. Keep this file private; copy its server variables into Vercel settings.');
}finally{muted=false;rl.close()}
