import {env} from '../../../runtime';
import {photoUser} from '../photos/route';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const user=await photoUser(req);if(user?.role!=='admin')return Response.json({error:'Solo administradores pueden exportar datos'},{status:403});
 const row:any=await env.DB!.prepare('SELECT data,revision FROM shop WHERE id=1').first();const {operations,...data}=JSON.parse(row.data);
 return new Response(JSON.stringify({format:'punto-local-data-v1',exportedAt:new Date().toISOString(),revision:row.revision,notice:'Incluye registros y enlaces a fotografías y documentos. Para incluir archivos, usa el respaldo completo ZIP. Recuperación asistida.',data},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="punto-local-datos.json"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
