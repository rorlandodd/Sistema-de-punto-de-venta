import {env} from '../../../runtime';
import {photoUser} from '../photos/route';
import {zipEntries,referencedFiles} from '../../../lib/backup-zip';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const u=await photoUser(req);if(u?.role!=='admin')return new Response('Solo administradores',{status:403});
 const row:any=await env.DB!.prepare('SELECT data,revision FROM shop WHERE id=1').first();const {operations,...data}=JSON.parse(row.data);const exportedAt=new Date().toISOString();
 async function* entries(){const enc=new TextEncoder();yield {name:'datos.json',body:enc.encode(JSON.stringify({format:'punto-local-backup-v3',revision:row.revision,exportedAt,data},null,2))};const files:any[]=[],missing:string[]=[];
 for(const url of referencedFiles(data)){const id=url.split('/').pop(),folder=url.includes('/photos/')?'products':'documents';const file=await env.BUCKET!.get(folder+'/'+id);if(!file){missing.push(url);continue}const mime=file.httpMetadata?.contentType||'',ext=({'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg','image/webp':'webp'} as any)[mime]||'bin';const path='archivos/'+folder+'/'+id+'.'+ext;files.push({url,path,mime});yield {name:path,body:file.body}}
 yield {name:'manifiesto.json',body:enc.encode(JSON.stringify({exportedAt,files,missing,notice:'Respaldo para resguardo y recuperación asistida. No ejecutar ni importar automáticamente. Si missing contiene archivos, el respaldo está incompleto.'},null,2))};
 }
 const iterator=zipEntries(entries());return new Response(new ReadableStream({async pull(controller){try{const r=await iterator.next();r.done?controller.close():controller.enqueue(r.value)}catch(e){controller.error(e)}},async cancel(){await iterator.return(undefined)}}),{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="punto-local-respaldo.zip"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
