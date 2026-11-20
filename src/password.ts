import {scrypt,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
export async function hashPassword(value:string){if(typeof value!=='string'||value.length<12||value.length>256)throw Error('La clave debe tener entre 12 y 256 caracteres');const salt=randomBytes(16).toString('hex');return salt+':'+((await derive(value,salt,64)) as Buffer).toString('hex')}
export async function verify(value:string,encoded:string){try{if(typeof value!=='string'||value.length>256)return false;const [salt,hash]=encoded.split(':');const actual=await derive(value,salt,64) as Buffer;return timingSafeEqual(actual,Buffer.from(hash,'hex'))}catch{return false}}
export const digest=(v:string)=>createHash('sha256').update(v).digest('hex');
