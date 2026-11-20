const text=(v:any)=>String(v||'').trim().slice(0,160);
const integer=(v:any,min=0)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<min||n>1000000000)throw Error('Cantidad o valor inválido');return n};
export function catalogOf(p:any){return text(p.catalog)||text(p.type)}
export function normalizeCatalogs(s:any){
 for(const p of s.products){const c=catalogOf(p);if(p.type&&p.type!==c&&!p.previousType)p.previousType=p.type;p.catalog=c;p.type=c;}
 s.catalogs=[...new Set([...(s.catalogs||[]),...s.products.filter((p:any)=>!p.deletedAt).map(catalogOf)].filter(Boolean))];
}
export function supplierSave(s:any,b:any){
 s.suppliers??=[];let p=b.id?s.suppliers.find((x:any)=>x.id===b.id):null;if(b.id&&!p)throw Error('Proveedor no encontrado');
 const name=text(b.name),rut=text(b.rut).replace(/[.\s-]/g,'').toUpperCase();if(!name||!rut)throw Error('Nombre y RUT del proveedor son obligatorios');if(!/^\d{6,8}[\dK]$/.test(rut))throw Error('Revisa el formato del RUT');
 if(s.suppliers.some((x:any)=>x.id!==b.id&&x.rut===rut))throw Error('Ya existe un proveedor con ese RUT');
 const email=text(b.email);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Revisa el correo');
 if(!p){p={id:crypto.randomUUID(),createdAt:new Date().toISOString()};s.suppliers.push(p)}
 Object.assign(p,{name,rut,email,phone:text(b.phone),contact:text(b.contact),address:text(b.address),activity:text(b.activity),note:text(b.note),active:b.active!==false,updatedAt:new Date().toISOString()});
 for(const product of s.products)if(product.supplierId===p.id)product.supplier=p.name;
 return {...p};
}
export function purchaseSave(s:any,u:any,b:any){
 const supplier=(s.suppliers||[]).find((x:any)=>x.id===b.supplierId&&x.active);if(!supplier)throw Error('Selecciona un proveedor activo');
 const documentType=text(b.documentType),documentNumber=text(b.documentNumber);if(!['Factura','Boleta','Otro'].includes(documentType)||!documentNumber)throw Error('Indica el tipo y número de documento');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!Number.isFinite(Date.parse(b.date))||new Date(b.date).toISOString().slice(0,10)!==b.date)throw Error('Fecha inválida');
 if((s.purchases||[]).some((x:any)=>x.supplier.id===supplier.id&&x.documentType===documentType&&x.documentNumber.toLowerCase()===documentNumber.toLowerCase()))throw Error('Esta compra ya está registrada para ese proveedor y documento');
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>200)throw Error('Agrega entre 1 y 200 productos');
 const seen=new Set();const lines=b.items.map((i:any)=>{if(seen.has(i.id))throw Error('Hay productos repetidos');seen.add(i.id);const p=s.products.find((x:any)=>x.id===i.id&&!x.deletedAt);if(!p)throw Error('Producto eliminado o no disponible');const qty=integer(i.qty,1),cost=integer(i.cost);integer(p.stock+qty);return {id:p.id,code:p.code,type:p.type,brand:p.brand||p.name,detail:p.detail||'',qty,cost,total:qty*cost}});
 const total=lines.reduce((a:number,i:any)=>a+i.total,0);integer(total);if(total!==integer(b.expectedTotal))throw Error('Revisa el total de la compra');
 if(!['paid','pending'].includes(b.paymentStatus))throw Error('Selecciona el estado de pago');if(!['cash','card','transfer','other'].includes(b.method))throw Error('Selecciona un medio de pago');
 const attachments=b.attachments||[];if(!Array.isArray(attachments)||attachments.length>5||attachments.some((a:any)=>!/^\/api\/documents\/[0-9a-f-]{36}$/.test(a.url)||!text(a.name)))throw Error('Adjuntos no válidos');
 const dueDate=text(b.dueDate);if(dueDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)||!Number.isFinite(Date.parse(dueDate))||new Date(dueDate).toISOString().slice(0,10)!==dueDate||dueDate<b.date))throw Error('El vencimiento debe ser una fecha válida desde la fecha de compra');
 const id=crypto.randomUUID(),now=new Date().toISOString();s.purchaseSequence=(s.purchaseSequence||0)+1;
 const purchase={id,number:'COMP-'+String(s.purchaseSequence).padStart(6,'0'),date:b.date,createdAt:now,user:u.name,supplier:{...supplier},documentType,documentNumber,items:lines,total,paymentStatus:b.paymentStatus,dueDate,method:b.method,note:text(b.note),attachments:attachments.map((a:any)=>({url:a.url,name:text(a.name)}))};
 for(const i of lines){const p=s.products.find((x:any)=>x.id===i.id);const before=p.stock;p.cost=Math.round((p.stock*p.cost+i.qty*i.cost)/(p.stock+i.qty));p.stock+=i.qty;p.supplierId=supplier.id;p.supplier=supplier.name;p.updatedAt=now;s.movements.unshift({id:crypto.randomUUID(),date:now,user:u.name,product:p.name,productId:p.id,before,after:p.stock,qty:i.qty,cost:i.cost,kind:'Compra',reference:documentType+' '+documentNumber,note:supplier.name,purchaseId:id});}
 s.purchases??=[];s.purchases.unshift(purchase);return purchase;
}
export function documentType(bytes:Uint8Array){
 if(bytes.length<12||bytes.length>10*1024*1024)throw Error('El archivo debe tener hasta 10 MB');
 const starts=(a:number[])=>a.every((v,i)=>bytes[i]===v);
 if(starts([37,80,68,70,45]))return 'application/pdf';
 if(starts([137,80,78,71,13,10,26,10]))return 'image/png';
 if(starts([255,216,255]))return 'image/jpeg';
 if(starts([82,73,70,70])&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
 throw Error('Adjunta PDF, JPG, PNG o WebP');
}
