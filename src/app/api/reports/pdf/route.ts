import {salesEvents} from '../../../../lib/accounting';
import {env} from '../../../../runtime';
import {photoUser} from '../../photos/route';
import {reportPdf} from '../../../../lib/report-pdf';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const u=await photoUser(req);if(!u||u.role!=='admin')return new Response('No tienes permiso para descargar informes',{status:403});
 const params=new URL(req.url).searchParams,from=params.get('from')||'',to=params.get('to')||'';
 const valid=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!valid(from)||!valid(to)||from>to)return new Response('Selecciona un intervalo de fechas válido',{status:400});
 const row:any=await env.DB!.prepare('SELECT data FROM shop WHERE id=1').first();
 const sales=salesEvents(JSON.parse(row.data)).filter((s:any)=>{const d=new Date(s.date).toLocaleDateString('en-CA',{timeZone:'America/Santiago'});return !s.voidedAt&&d>=from&&d<=to});
 const bytes=await reportPdf(sales,from,to);
 return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="informe-${from}-${to}.pdf"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
