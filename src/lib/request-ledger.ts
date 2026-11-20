// The state change and replay record are committed in the same D1 batch transaction.
export async function ensureLedger(db:any){await db.prepare('CREATE TABLE IF NOT EXISTS pos_requests (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, payload_hash TEXT NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL)').run()}
export async function requestHash(body:any){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body)));return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function lookupRequest(db:any,id:string){return db.prepare('SELECT user_id,payload_hash,result FROM pos_requests WHERE id=?').bind(id).first()}
export async function commitRequest(db:any,s:any,revision:number,id:string,user:string,hash:string,result:any){s.lastOperation=id;const out=await db.batch([
 db.prepare('UPDATE shop SET data=?,revision=revision+1 WHERE id=1 AND revision=?').bind(JSON.stringify(s),revision),
 db.prepare("INSERT OR IGNORE INTO pos_requests (id,user_id,payload_hash,result,created_at) SELECT ?,?,?,?,? FROM shop WHERE id=1 AND revision=? AND json_extract(data,'$.lastOperation')=?").bind(id,user,hash,JSON.stringify(result),new Date().toISOString(),revision+1,id)
 ]);return !!out[0].meta.changes}
export function scopeResult(value:any,role:string){if(role!=='ventas')return value;const clean=(v:any):any=>Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!['cost','previousCost'].includes(k)).map(([k,val])=>[k,clean(val)])):v;return clean(value)}
