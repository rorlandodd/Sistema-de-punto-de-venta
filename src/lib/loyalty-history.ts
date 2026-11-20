import {normalizeRut} from './loyalty.ts';
import {validRut} from './fiscal.ts';
export function loyaltyHistory(s:any,role:string,params:URLSearchParams){
 if(!['admin','ventas'].includes(role))throw Error('No tienes permiso para consultar puntos');
 const rut=normalizeRut(params.get('pointsRut'));if(!validRut(rut))throw Error('RUT inválido');
 const from=params.get('from')||'',to=params.get('to')||'',kind=params.get('kind')||'';
 if([from,to].some(v=>v&&!/^\d{4}-\d{2}-\d{2}$/.test(v))||(from&&to&&from>to))throw Error('Intervalo de fechas inválido');
 if(kind&&!['Compra','Devolución','Anulación'].includes(kind))throw Error('Tipo de movimiento inválido');
 const all=(s.loyaltyMovements||[]).filter((m:any)=>normalizeRut(m.rut)===rut);
 const day=(d:string)=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(d));return ['year','month','day'].map(t=>parts.find(p=>p.type===t)?.value).join('-')};
 const filtered=all.filter((m:any)=>(!kind||m.kind===kind)&&(!from||day(m.date)>=from)&&(!to||day(m.date)<=to)).sort((a:any,b:any)=>b.date.localeCompare(a.date));
 const pages=Math.max(1,Math.ceil(filtered.length/15)),page=Math.min(pages,Math.max(1,Math.floor(Number(params.get('page'))||1)));
 const sales=new Map((s.sales||[]).map((x:any)=>[x.id,x]));
 const items=filtered.slice((page-1)*15,page*15).map((m:any)=>{const sale:any=sales.get(m.saleId),refund=(s.returns||[]).find((r:any)=>r.saleId===m.saleId&&r.number===m.reference);const details=m.kind==='Compra'&&sale?.loyalty?{earned:sale.loyalty.earned,redeemed:sale.loyalty.redeemed}:m.kind==='Anulación'&&sale?.loyalty?{restored:sale.loyalty.redeemed,removed:sale.loyalty.earned}:refund?.loyalty?{restored:refund.loyalty.restored,removed:refund.loyalty.removed}:null;return {id:m.id,date:m.date,kind:m.kind,delta:m.delta,balance:m.balance,before:m.balance-m.delta,user:m.user,reference:m.reference,saleId:m.saleId,saleNumber:sale?.number||'',details}});
 return {rut,balance:s.loyaltyAccounts?.[rut]?.balance||0,total:filtered.length,allTotal:all.length,page,pages,items,increases:filtered.reduce((n:number,m:any)=>n+Math.max(0,m.delta),0),decreases:filtered.reduce((n:number,m:any)=>n+Math.max(0,-m.delta),0)};
}
