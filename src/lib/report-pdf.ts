import {lineTotal,paymentsOf} from './accounting.ts';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
export async function reportPdf(sales:any[],from:string,to:string){
 const doc=await PDFDocument.create();const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(.14,.20,.27),muted=rgb(.37,.44,.49),green=rgb(.04,.48,.41),pale=rgb(.92,.96,.94);
 const clean=(v:any)=>Array.from(String(v??'')).map(c=>{try{font.encodeText(c);return c}catch{return '?'}}).join('');
 const money=(n:number)=>'$ '+new Intl.NumberFormat('es-CL',{maximumFractionDigits:0}).format(n||0);
 const dates=(d:string)=>new Date(d).toLocaleString('es-CL',{timeZone:'America/Santiago',dateStyle:'short',timeStyle:'short'});
 const widths=[82,90,110,145,35,70,70,80,88];const labels=['Código','Tipo','Marca','Características','Cant.','P. unitario','C. unitario','Total','Ganancia'];
 let page:any,y=0;
 const draw=(text:any,x:number,baseline:number,size=9,strong=false,color=ink)=>page.drawText(clean(text),{x,y:baseline,size,font:strong?bold:font,color});
 const wrap=(v:any,w:number,size=9)=>{const chars=Array.from(clean(v||'No registrado'));const lines:string[]=[];let line='';for(const c of chars){if(c==='\n'||font.widthOfTextAtSize(line+c,size)>w){lines.push(line);line=c==='\n'?'':c}else line+=c}if(line)lines.push(line);return lines.length?lines:[''];};
 function newPage(){page=doc.addPage([842,595]);y=550;draw('PUNTO LOCAL',36,y,11,true,green);draw('INFORME DE VENTAS',530,y,14,true);y-=25;draw(`Período: ${from} al ${to} | CLP | Hora de Chile`,36,y,10);y-=26;}
 function ensure(h:number){if(y-h<48)newPage();}
 function tableHead(){page.drawRectangle({x:36,y:y-23,width:770,height:23,color:pale});let x=36;labels.forEach((l,i)=>{draw(l,x+5,y-15,8,true);x+=widths[i]});y-=23;}
 newPage();
 const total=sales.reduce((a,s)=>a+s.total,0),cost=sales.reduce((a,s)=>a+(s.cost||0),0);
 page.drawRectangle({x:36,y:y-61,width:770,height:61,color:pale});
 [['VENTAS NETAS',money(total)],['COSTOS',money(cost)],['GANANCIA BRUTA',money(total-cost)],['OPERACIONES',sales.length]].forEach(([label,value],i)=>{draw(label,50+i*191,y-19,8,true,muted);draw(value,50+i*191,y-42,17,true,green)});y-=81;
 draw('Ventas menos descuentos y devoluciones del período. Ganancia bruta antes de gastos e impuestos.',36,y,9,false,muted);y-=26;
 if(!sales.length){draw('No hay ventas registradas en el período seleccionado.',36,y,12);}
 for(const sale of sales){
 ensure(145);draw(`${sale.isReturn?'DEVOLUCIÓN':'VENTA'} ${sale.number||sale.id}`,36,y,10,true);y-=17;
 const meta=`${dates(sale.date)} | ${sale.method==='cash'?'Efectivo':sale.method==='transfer'?'Transferencia':sale.method==='mixed'?'Pago combinado':'Tarjeta'} | Vendedor: ${sale.user}`;
 for(const l of wrap(meta,760)){draw(l,36,y,9,false,muted);y-=12;}y-=8;tableHead();
 for(const item of sale.items){
 const cells=[item.code,item.type,item.brand||item.name,item.detail,item.qty,money(item.price),money(item.cost),money(lineTotal(item)),money(lineTotal(item)-item.qty*item.cost)];
 const lines=cells.map((v,i)=>wrap(v,widths[i]-10,8.5));const h=Math.max(...lines.map(l=>l.length))*11+14;
 if(y-h<55){newPage();draw(`Venta ${sale.id} (continuación)`,36,y,9,true);y-=18;tableHead()}
 let x=36;lines.forEach((ls,i)=>{ls.forEach((l,j)=>draw(l,x+5,y-14-j*11,8.5));x+=widths[i]});y-=h;page.drawLine({start:{x:36,y},end:{x:806,y},thickness:.4,color:rgb(.83,.88,.88)});
 }
 ensure(50);y-=18;draw(`Total: ${money(sale.total)}    Costo: ${money(sale.cost)}    Ganancia: ${money(sale.total-(sale.cost||0))}`,36,y,10,true);
 y-=16;draw(sale.isReturn?`Devolución de ${sale.saleNumber||sale.saleId}`:sale.method==='mixed'?'Pago combinado registrado':sale.method==='cash'?`Recibido: ${money(sale.paid)} | Vuelto: ${money(sale.change)}`:sale.method==='transfer'?'Transferencia: pago confirmado':'Tarjeta: pago confirmado',36,y,9,false,muted);y-=28;
 }
 const pages=doc.getPages();pages.forEach((p,i)=>{p.drawText(`Punto Local | ${i+1} / ${pages.length}`,{x:36,y:22,size:8,font,color:muted})});
 doc.setTitle(`Informe de ventas ${from} al ${to}`);doc.setAuthor('Punto Local');return doc.save();
}
