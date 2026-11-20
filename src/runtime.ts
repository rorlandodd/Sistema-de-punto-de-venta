import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
export const root=process.cwd();
export const dataDir=path.resolve(process.env.DATA_DIR||path.join(root,'data'));
fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
export const db=new DatabaseSync(path.join(dataDir,'punto-local.sqlite'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
db.exec(fs.readFileSync(path.join(root,'database/schema.sql'),'utf8'));
try{fs.chmodSync(path.join(dataDir,'punto-local.sqlite'),0o600)}catch{}
class Statement{sql:string;args:any[]=[];constructor(sql:string){this.sql=sql}bind(...args:any[]){this.args=args;return this}first(){return db.prepare(this.sql).get(...this.args)||null}run(){const r=db.prepare(this.sql).run(...this.args);return {meta:{changes:Number(r.changes)}}}}
function filePath(key:string){if(!/^(products|documents)\/[0-9a-f-]{36}$/.test(key))throw Error('Archivo inválido');return path.join(dataDir,'files',key)}
export const env={DB:{prepare:(sql:string)=>new Statement(sql),batch:(stmts:Statement[])=>{db.exec('BEGIN IMMEDIATE');try{const r=stmts.map(s=>s.run());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}},BUCKET:{
 put:async(key:string,bytes:Uint8Array,opt:any)=>{const p=filePath(key);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,bytes,{mode:0o600});fs.writeFileSync(p+'.json',JSON.stringify(opt.httpMetadata),{mode:0o600})},
 get:async(key:string)=>{const p=filePath(key);if(!fs.existsSync(p))return null;return {body:new Uint8Array(fs.readFileSync(p)),httpMetadata:JSON.parse(fs.readFileSync(p+'.json','utf8'))}},
 head:async(key:string)=>fs.existsSync(filePath(key))?{}:null
}};
