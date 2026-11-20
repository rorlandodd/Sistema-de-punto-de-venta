export const moneyInt=(v:any,min=0,max=1000000000)=>{if(v===null||v===''||typeof v==='boolean'||!Number.isSafeInteger(Number(v))||Number(v)<min||Number(v)>max)throw Error('Ingresa un número entero válido');return Number(v)};
export const lineTotal=(i:any)=>i.total??i.qty*i.price;
export const paymentsOf=(sale:any)=>sale.payments||[{method:sale.method,amount:sale.total,reference:sale.reference||''}];
export function discountedLines(lines:any[],discount:number){const gross=lines.reduce((a,i)=>a+i.price*i.qty,0);moneyInt(gross,1);moneyInt(discount,0,gross);let assigned=0,subtotal=0;return lines.map(i=>{subtotal+=i.price*i.qty;const next=Math.round(discount*subtotal/gross),d=next-assigned;assigned=next;return {...i,discount:d,total:i.qty*i.price-d}})}
export function collectPayments(b:any,total:number,config:any){
 const rows=b.payments||[{method:b.method,amount:total,reference:b.reference}];
 if(!Array.isArray(rows)||rows.length<1||rows.length>3)throw Error('Selecciona entre uno y tres medios de pago');
 const used=new Set();const payments=rows.map((p:any)=>{if(!config.payments.includes(p.method)||used.has(p.method))throw Error('Medio de pago no habilitado o repetido');used.add(p.method);const reference=String(p.reference||'').trim().slice(0,160);if((p.method==='card'&&config.requireCardReference||p.method==='transfer'&&config.requireTransferReference)&&!reference)throw Error('Ingresa la referencia del pago');return {method:p.method,amount:moneyInt(p.amount,1),reference}});
 if(payments.reduce((a,p)=>a+p.amount,0)!==total)throw Error('La suma de los pagos debe coincidir con el total');
 const cash=payments.find(p=>p.method==='cash')?.amount||0;const paid=cash?moneyInt(b.paid):0;if(paid<cash)throw Error('El efectivo no cubre el monto asignado');return {payments,method:payments.length>1?'mixed':payments[0].method,paid:cash?paid:total,change:cash?paid-cash:0};
}
export function returnedQty(s:any,saleId:string,productId:string){return (s.returns||[]).filter((r:any)=>r.saleId===saleId).reduce((a:number,r:any)=>a+r.items.filter((i:any)=>i.id===productId).reduce((n:number,i:any)=>n+i.qty,0),0)}
export function refundValue(saleItem:any,previous:number,qty:number){return Math.round(lineTotal(saleItem)*(previous+qty)/saleItem.qty)-Math.round(lineTotal(saleItem)*previous/saleItem.qty)}
export function salesEvents(s:any){return [...(s.sales||[]).filter((x:any)=>!x.voidedAt),...(s.returns||[]).map((r:any)=>({...r,id:r.id,number:r.number,date:r.date,isReturn:true,total:-r.total,cost:-r.cost,items:r.items.map((i:any)=>({...i,qty:-i.qty,total:-i.total,cost:r.restock?i.cost:0})),method:r.method}))].sort((a,b)=>b.date.localeCompare(a.date))}
export function returnSale(s:any,u:any,b:any,shift:any,config:any){
 if(!shift)throw Error('Abre la caja para registrar una devolución');const sale=s.sales.find((x:any)=>x.id===b.id&&!x.voidedAt);if(!sale)throw Error('Venta no disponible');
 if(!String(b.note||'').trim()||b.confirmed!==true)throw Error('Confirma e indica el motivo de devolución');
 if(config.returnDays>0&&Date.now()-new Date(sale.date).getTime()>config.returnDays*86400000)throw Error('La venta supera el plazo de devolución configurado');
 if(!['cash','card','transfer'].includes(b.method))throw Error('Medio de devolución inválido');
 if(!Array.isArray(b.items)||!b.items.length)throw Error('Selecciona unidades a devolver');const seen=new Set();
 const items=b.items.map((i:any)=>{if(seen.has(i.id))throw Error('Producto repetido');seen.add(i.id);const original=sale.items.find((x:any)=>x.id===i.id);if(!original)throw Error('Producto ajeno a esta venta');const qty=moneyInt(i.qty,1),previous=returnedQty(s,sale.id,i.id);if(previous+qty>original.qty)throw Error('La devolución supera las unidades disponibles');const p=s.products.find((x:any)=>x.id===i.id&&!x.deletedAt);if(b.restock===true&&!p)throw Error('No se puede reponer un producto eliminado');if(b.restock===true)moneyInt(p.stock+qty);return {...original,qty,total:refundValue(original,previous,qty)}});
 const total=items.reduce((a:number,i:any)=>a+i.total,0);if(total!==moneyInt(b.expectedTotal))throw Error('La devolución cambió. Actualiza y revisa el monto');
 if(b.method==='cash'&&total>expectedCashLocal(shift))throw Error('No hay efectivo suficiente en la caja');
 const date=new Date().toISOString(),id=crypto.randomUUID();const r={id,number:'DEV-'+String((s.returns||[]).length+1).padStart(6,'0'),saleId:sale.id,saleNumber:sale.number||sale.id,date,user:u.name,shift:shift.id,items,total,cost:b.restock===true?items.reduce((a:number,i:any)=>a+i.qty*i.cost,0):0,restock:b.restock===true,method:b.method,note:String(b.note).trim().slice(0,160),business:sale.business};
 if(r.restock)for(const i of items){const p=s.products.find((x:any)=>x.id===i.id),before=p.stock;p.cost=Math.round((p.stock*p.cost+i.qty*i.cost)/(p.stock+i.qty));p.stock+=i.qty;s.movements.unshift({id:crypto.randomUUID(),date,user:u.name,product:p.name,productId:p.id,qty:i.qty,cost:i.cost,before,after:p.stock,kind:'Devolución de venta',reference:r.number,note:r.note,sale:sale.id})}
 shift[b.method+'Refund']=(shift[b.method+'Refund']||0)+total;s.returns??=[];s.returns.unshift(r);return r;
}
const expectedCashLocal=(s:any)=>(s.opening||0)+(s.cash||0)+(s.cashIn||0)-(s.cashOut||0)-(s.cashRefund||0);
export function cashSnapshot(s:any){return [s.id,s.cash||0,s.card||0,s.transfer||0,s.cashIn||0,s.cashOut||0,s.cashRefund||0,s.cardRefund||0,s.transferRefund||0].join(':')}
