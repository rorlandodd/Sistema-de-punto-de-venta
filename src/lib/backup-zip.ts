// Streaming ZIP (stored entries, data descriptors); bounded memory per R2 chunk.
const encoder=new TextEncoder();
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
function crcUpdate(crc:number,b:Uint8Array){for(const v of b)crc=crcTable[(crc^v)&255]^(crc>>>8);return crc>>>0}
function header(size:number,values:[number,number,number][]){const b=new Uint8Array(size),v=new DataView(b.buffer);for(const [offset,value,width]of values)width===2?v.setUint16(offset,value,true):v.setUint32(offset,value,true);return b}
export async function* zipEntries(entries:AsyncIterable<{name:string,body:ReadableStream<Uint8Array>|Uint8Array}>){let offset=0;const directory:Uint8Array[]=[];let count=0;
 for await(const file of entries){const name=encoder.encode(file.name),start=offset;const local=header(30,[[0,0x04034b50,4],[4,20,2],[6,0x808,2],[26,name.length,2]]);yield local;yield name;offset+=local.length+name.length;let crc=0xffffffff,size=0;
 const send=async function*(body:typeof file.body){if(body instanceof Uint8Array){yield body;return}const reader=body.getReader();try{while(true){const r=await reader.read();if(r.done)break;yield r.value}}finally{reader.releaseLock()}};
 for await(const chunk of send(file.body)){size+=chunk.length;offset+=chunk.length;if(size>0xffffffff||offset>0xffffffff)throw Error('Respaldo demasiado grande');crc=crcUpdate(crc,chunk);yield chunk}
 crc=(crc^0xffffffff)>>>0;const descriptor=header(16,[[0,0x08074b50,4],[4,crc,4],[8,size,4],[12,size,4]]);yield descriptor;offset+=16;
 const central=header(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x808,2],[16,crc,4],[20,size,4],[24,size,4],[28,name.length,2],[42,start,4]]);directory.push(central,name);count++;if(count>65535)throw Error('Demasiados archivos');
 }
 const start=offset;for(const chunk of directory){yield chunk;offset+=chunk.length}yield header(22,[[0,0x06054b50,4],[8,count,2],[10,count,2],[12,offset-start,4],[16,start,4]]);
}
export function referencedFiles(data:any){const urls=new Set<string>();function walk(v:any){if(typeof v==='string'&&/^\/api\/(photos|documents)\/[0-9a-f-]{36}$/.test(v))urls.add(v);else if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')Object.values(v).forEach(walk)}walk(data);return [...urls]}
