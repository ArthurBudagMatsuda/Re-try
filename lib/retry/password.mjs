import {randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export async function hashPassword(password){
 const salt=randomBytes(16).toString('hex');
 const key=await scrypt(password,salt,64);
 return `scrypt:${salt}:${key.toString('hex')}`;
}
export function validPasswordHash(value){return /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(value??'')}
export async function verifyPassword(password,encoded){
 if(!validPasswordHash(encoded))return false;
 const [,salt,hex]=encoded.split(':');
 const key=await scrypt(password,salt,64);
 return timingSafeEqual(key,Buffer.from(hex,'hex'));
}
