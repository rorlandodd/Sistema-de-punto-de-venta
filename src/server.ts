import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {db,root} from './runtime';
import {hashPassword,verify,digest} from './password';
import * as pos from './app/api/pos/route';
import * as photos from './app/api/photos/route';
import * as photo from './app/api/photos/[id]/route';
import * as documents from './app/api/documents/route';
import * as document from './app/api/documents/[id]/route';
import * as pdf from './app/api/reports/pdf/route';
import * as backup from './app/api/backup/route';
import * as exported from './app/api/export/route';
const config=fs.existsSync('config.json')?JSON.parse(fs.readFileSync('config.json','utf8')):{};
const port=Number(process.env.PORT||config.port||3000),host=process.env.HOST||config.host||'127.0.0.1';
const origin=new URL(process.env.APP_URL||config.appUrl||'http://localhost:'+port).origin;
const secure=origin.startsWith('https:');
if(!db.prepare('SELECT id FROM shop WHERE id=1').get()){console.error('Ejecuta primero node dist/install.cjs');process.exit(1)}
const limits=new Map<string,{count:number,until:number}>();
function limited(key:string){const now=Date.now(),r=limits.get(key);if(r&&r.until>now){r.count++;return r.count>10}limits.set(key,{count:1,until:now+15*60*1000});return false}
setInterval(()=>{for(const [k,v]of limits)if(v.until<Date.now())limits.delete(k);db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now())},60000).unref();
function cookie(value:string,age=43200){return 'pos_session='+value+'; HttpOnly; SameSite=Strict; Path=/; Max-Age='+age+(secure?'; Secure':'')}
function session(req:http.IncomingMessage){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('pos_session='))?.slice(12);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;const row:any=db.prepare('SELECT c.* FROM sessions s JOIN credentials c ON c.user_id=s.user_id WHERE s.token=? AND s.expires>?').get(digest(token),Date.now());if(!row)return null;const state=JSON.parse((db.prepare('SELECT data FROM shop WHERE id=1').get() as any).data);const user=state.users.find((u:any)=>u.active&&!u.deletedAt&&(u.id===row.user_id||(!u.id&&u.email===row.email)));return user?{...row,role:user.role,name:user.name}:null}
const json=(v:any,status=200,headers:any={})=>Response.json(v,{status,headers:{'Cache-Control':'no-store',...headers}});
async function body(req:http.IncomingMessage){const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>11*1024*1024)throw Error('Archivo demasiado grande');chunks.push(chunk)}return Buffer.concat(chunks)}
async function handle(req:http.IncomingMessage){
 const url=new URL(req.url||'/',origin),p=url.pathname,method=req.method||'GET';
 if(!['GET','HEAD','POST'].includes(method))return json({error:'Método no permitido'},405);
 if(method==='POST'&&req.headers.origin!==origin)return json({error:'Origen no permitido. Revisa appUrl en config.json.'},403);
 const user=session(req);
 if(p==='/logout'&&method==='GET')return new Response('<!doctype html><html lang="es"><meta charset="utf-8"><title>Cerrar sesión</title><body><form method="post" action="/api/auth/logout"><button>Cerrar sesión</button></form><a href="/">Volver</a></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
 if(p==='/api/auth/logout'&&method==='POST'){const t=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('pos_session='))?.slice(12);if(t)db.prepare('DELETE FROM sessions WHERE token=?').run(digest(t));return new Response(null,{status:303,headers:{Location:'/', 'Set-Cookie':cookie('',0)}})}
 if(p==='/api/auth/login'&&method==='POST'){
  const b=JSON.parse((await body(req)).toString());const username=String(b.username||'').trim().toLowerCase();
  if(limited('ip:'+req.socket.remoteAddress)||limited('u:'+username))return json({error:'Demasiados intentos. Espera 15 minutos.'},429);
  const row:any=db.prepare('SELECT * FROM credentials WHERE username=?').get(username);
  const valid=await verify(b.password,row?.password||'00000000000000000000000000000000:'+('0'.repeat(128)));
  if(!valid||!row)return json({error:'Usuario o clave incorrectos'},401);
  const state=JSON.parse((db.prepare('SELECT data FROM shop WHERE id=1').get() as any).data);
  if(!state.users.some((u:any)=>u.active&&!u.deletedAt&&(u.id===row.user_id||(!u.id&&u.email===row.email))))return json({error:'Cuenta desactivada'},403);
  const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),row.user_id,Date.now()+12*3600000);
  limits.delete('u:'+username);return json({ok:true},200,{'Set-Cookie':cookie(token)});
 }
 if(p.startsWith('/api/')&&!user)return json({error:'Inicia sesión para continuar'},401);
 if(p==='/api/auth/me'&&method==='GET')return json({name:user!.name,username:user!.username,role:user!.role});
 if(p==='/api/auth/password'&&method==='POST'){
  const b=JSON.parse((await body(req)).toString());if(limited('password:'+user!.user_id))return json({error:'Espera 15 minutos'},429);
  if(!await verify(b.current,user!.password))return json({error:'Clave actual incorrecta'},400);
  const encoded=await hashPassword(b.password);db.prepare('UPDATE credentials SET password=? WHERE user_id=?').run(encoded,user!.user_id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(user!.user_id);return json({ok:true});
 }
 if(p==='/api/auth/access'){
  if(user!.role!=='admin')return json({error:'Solo administrador'},403);
  if(method==='GET'){const s=JSON.parse((db.prepare('SELECT data FROM shop WHERE id=1').get() as any).data);const creds=db.prepare('SELECT email,username FROM credentials').all();return json({users:s.users.filter((u:any)=>!u.deletedAt).map((u:any)=>({email:u.email,name:u.name,active:u.active,role:u.role,username:(creds.find((c:any)=>c.email===u.email) as any)?.username||''}))})}
  if(method==='POST'){
   const b=JSON.parse((await body(req)).toString()),username=String(b.username||'').trim().toLowerCase();
   if(!/^[a-z0-9._-]{3,40}$/.test(username))return json({error:'Usuario: 3–40 letras, números, punto, guion o guion bajo'},400);
   const password=await hashPassword(b.password);
   db.exec('BEGIN IMMEDIATE');try{
    const row:any=db.prepare('SELECT data FROM shop WHERE id=1').get(),s=JSON.parse(row.data),u=s.users.find((x:any)=>x.email===b.email&&!x.deletedAt);
    if(!u)throw Error('Crea primero el perfil en Ajustes → Usuarios');u.id ||=randomUUID();
    db.prepare('INSERT INTO credentials VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET username=excluded.username,password=excluded.password').run(u.id,u.email,username,password);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);
    s.audit??=[];s.audit.unshift({id:randomUUID(),date:new Date().toISOString(),user:user!.name,action:'Acceso actualizado',target:u.email});
    db.prepare('UPDATE shop SET data=?,revision=revision+1 WHERE id=1').run(JSON.stringify(s));db.exec('COMMIT');return json({ok:true});
   }catch(e){db.exec('ROLLBACK');throw e}
  }
 }
 if(p.startsWith('/api/')){
  let route:any=({'/api/pos':pos,'/api/photos':photos,'/api/documents':documents,'/api/reports/pdf':pdf,'/api/backup':backup,'/api/export':exported} as any)[p];
  const match=p.match(/^\/api\/(photos|documents)\/([0-9a-f-]{36})$/);if(match)route=match[1]==='photos'?photo:document;
  if(!route?.[method])return json({error:'Ruta no encontrada'},404);
  const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v&&!k.toLowerCase().startsWith('oai-')&&!['host','content-length','transfer-encoding'].includes(k))headers.set(k,Array.isArray(v)?v.join(','):v);
  headers.set('oai-authenticated-user-id',user!.user_id);headers.set('oai-authenticated-user-email',user!.email);
  const bytes=method==='POST'?await body(req):undefined;
  return await route[method](new Request(url,{method,headers,body:bytes}),{params:Promise.resolve({id:match?.[2]})});
 }
 const assets:any={'/':'index.html','/login':'index.html','/app.js':'app.js','/app.css':'app.css','/favicon.svg':'favicon.svg'};
 const file=assets[p];if(!file)return new Response('No encontrado',{status:404});
 return new Response(fs.readFileSync(path.join(root,'dist/public',file)),{headers:{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
}
const server=http.createServer(async(req,res)=>{try{const r=await handle(req);res.statusCode=r.status;r.headers.forEach((v,k)=>res.setHeader(k,v));res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');if(secure)res.setHeader('Strict-Transport-Security','max-age=31536000');if(req.method==='HEAD'){res.end();return}if(r.body){for await(const chunk of r.body as any){if(!res.write(chunk))await new Promise(resolve=>res.once('drain',resolve))}}res.end()}catch(e:any){if(!res.headersSent){res.writeHead(400,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:e.message?.includes('UNIQUE')?'Nombre de usuario ya utilizado':'No se pudo completar la operación. Revisa los datos.'}))}else res.destroy()}});
server.requestTimeout=30000;server.headersTimeout=15000;
server.listen(port,host,()=>console.log('Punto Local listo en '+origin));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0)}));
