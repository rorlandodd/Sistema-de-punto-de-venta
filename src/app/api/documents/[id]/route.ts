import {env} from '../../../../runtime';
import {posConfig} from '../../../../lib/pos-config';
import {photoUser} from '../../photos/route';
export const dynamic='force-dynamic';
export async function GET(req:Request,context:{params:Promise<{id:string}>}){
 const u=await photoUser(req);if(!u||!['admin','inventario'].includes(u.role))return new Response('Sin acceso',{status:403});
 if(u.role==='inventario'){const row:any=await env.DB!.prepare('SELECT data FROM shop WHERE id=1').first();if(!posConfig(JSON.parse(row.data)).inventoryPurchases)return new Response('Sin acceso',{status:403});}
 const {id}=await context.params;if(!/^[0-9a-f-]{36}$/.test(id))return new Response('No encontrado',{status:404});
 const f=await env.BUCKET!.get('documents/'+id);if(!f)return new Response('No encontrado',{status:404});
 const type=f.httpMetadata?.contentType||'application/octet-stream';const ext=type==='application/pdf'?'pdf':type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
 return new Response(f.body,{headers:{'Content-Type':type,'Content-Disposition':`attachment; filename="comprobante-${id}.${ext}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox"}});
}
