import {env} from '../../../../runtime';
import {photoUser} from '../route';
export const dynamic='force-dynamic';
export async function GET(req:Request,context:{params:Promise<{id:string}>}){
 if(!await photoUser(req))return new Response('Sin acceso',{status:403});
 const {id}=await context.params;if(!/^[0-9a-f-]{36}$/.test(id))return new Response('No encontrado',{status:404});
 const file=await env.BUCKET!.get('products/'+id);if(!file)return new Response('No encontrado',{status:404});
 return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});
}
