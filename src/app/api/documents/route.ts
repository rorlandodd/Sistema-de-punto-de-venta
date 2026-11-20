import {env} from '../../../runtime';
import {photoUser} from '../photos/route';
import {posConfig} from '../../../lib/pos-config';
import {documentType} from '../../../lib/purchases';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origen no permitido'},{status:403});
 const u=await photoUser(req);if(!u||!['admin','inventario'].includes(u.role))return Response.json({error:'Sin permiso'},{status:403});
 if(u.role==='inventario'){const row:any=await env.DB!.prepare('SELECT data FROM shop WHERE id=1').first();if(!posConfig(JSON.parse(row.data)).inventoryPurchases)return Response.json({error:'Compras desactivadas para este perfil'},{status:403});}
 if(Number(req.headers.get('content-length')||0)>10*1024*1024+65536)return Response.json({error:'Máximo 10 MB'},{status:413});
 const form=await req.formData(),file=form.get('document');if(!file||typeof file==='string'||file.size>10*1024*1024)throw Error('Selecciona un archivo de hasta 10 MB');
 const bytes=new Uint8Array(await file.arrayBuffer()),type=documentType(bytes),id=crypto.randomUUID();
 await env.BUCKET!.put('documents/'+id,bytes,{httpMetadata:{contentType:type}});
 return Response.json({url:'/api/documents/'+id,name:file.name.slice(0,160)},{headers:{'Cache-Control':'no-store'}});
 }catch(e:any){return Response.json({error:e.message||'No se pudo subir el archivo'},{status:400})}}
