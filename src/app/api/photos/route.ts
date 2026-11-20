import {env} from '../../../runtime';
import {MAX_PHOTO_BYTES,photoType} from '../../../lib/photos';
export const dynamic='force-dynamic';
export async function photoUser(req:Request){
 const id=req.headers.get('oai-authenticated-user-id'),email=(req.headers.get('oai-authenticated-user-email')||'').toLowerCase();
 if(!id||!email)return null;
 const row:any=await env.DB!.prepare('SELECT data FROM shop WHERE id=1').first();
 if(!row)return null;
 return JSON.parse(row.data).users.find((u:any)=>u.active&&(u.id===id||(!u.id&&u.email===email)))||null;
}
export async function POST(req:Request){
 try{
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origen no permitido'},{status:403});
 const u=await photoUser(req);if(!u||!['admin','inventario'].includes(u.role))return Response.json({error:'No tienes permiso para subir fotos'},{status:403});
 if(Number(req.headers.get('content-length')||0)>MAX_PHOTO_BYTES+65536)return Response.json({error:'La foto supera los 5 MB'},{status:413});
 const form=await req.formData();const file=form.get('photo');if(!file||typeof file==='string'||file.size>MAX_PHOTO_BYTES)return Response.json({error:'Selecciona una foto de hasta 5 MB'},{status:400});
 const bytes=new Uint8Array(await file.arrayBuffer());const type=photoType(bytes);const id=crypto.randomUUID();
 await env.BUCKET!.put('products/'+id,bytes,{httpMetadata:{contentType:type}});
 return Response.json({url:'/api/photos/'+id},{headers:{'Cache-Control':'no-store'}});
 }catch(e:any){return Response.json({error:e.message||'No se pudo subir la foto'},{status:400})}
}
