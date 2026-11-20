const text=(v:any)=>String(v||'').trim().slice(0,160);
const fail=(message:string):never=>{throw new Error(message)};
export const quoteConfig=(s:any)=>({prefix:s.quoteConfig?.prefix||'COT',terms:s.quoteConfig?.terms||'Precios sujetos a disponibilidad. Esta cotización no reserva existencias.',days:s.quoteConfig?.days??15});
export function saveCustomer(s:any,b:any){
 s.customers??=[];const rut=text(b.rut).replace(/[.\s-]/g,'').toUpperCase();if(!/^[0-9]{6,8}[0-9K]$/.test(rut)||!text(b.name)||!text(b.address))fail('Completa nombre o razón social, RUT y dirección');
 if(b.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(b.email)))fail('El correo del cliente no es válido');
 let c=b.id?s.customers.find((x:any)=>x.id===b.id):null;if(b.id&&!c)fail('Cliente no encontrado');if(s.customers.some((x:any)=>x.rut===rut&&x.id!==b.id))fail('Este RUT ya está guardado. Selecciona el cliente existente.');
 if(!c){c={id:crypto.randomUUID(),createdAt:new Date().toISOString()};s.customers.push(c)}Object.assign(c,{type:b.type==='company'?'company':'person',name:text(b.name),rut,address:text(b.address),businessActivity:text(b.businessActivity),email:text(b.email),phone:text(b.phone),updatedAt:new Date().toISOString()});return c;
}
export function resolveCustomer(s:any,b:any){const c=b.newCustomer?saveCustomer(s,b.newCustomer):(s.customers||[]).find((x:any)=>x.id===b.customerId);if(!c)fail('Selecciona o agrega la persona o empresa para la cotización');return {...c};}
export function createQuote(s:any,customer:any,lines:any[],business:any,user:string){
 const config=quoteConfig(s);s.quotes??=[];let barcode='';do{s.quoteSequence=(s.quoteSequence||0)+1;barcode='91'+String(s.quoteSequence).padStart(10,'0')}while(s.products.some((p:any)=>p.code===barcode)||s.quotes.some((i:any)=>i.barcode===barcode));
 const date=new Date().toISOString(),due=config.days?new Date(Date.now()+config.days*86400000).toISOString():null;
 const quote={id:crypto.randomUUID(),number:config.prefix+'-'+String(s.quoteSequence).padStart(6,'0'),barcode,date,due,user,customer:{...customer},business:{...business},terms:config.terms,items:lines.map(({cost,...i}:any)=>({...i})),total:lines.reduce((a:number,i:any)=>a+i.qty*i.price,0),status:'pending',saleId:null};s.quotes.unshift(quote);return quote;
}
// Code 39: 9 alternating bars/spaces per symbol, wide:narrow ratio 3:1.
const digitPatterns:Record<string,string>={'0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw','5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn','*':'nwnnwnwnn'};
export function barcodeBars(value:string){if(!/^\d{12}$/.test(value))throw Error('Código inválido');let x=12;const bars:{x:number,width:number}[]=[];for(const char of '*'+value+'*'){const pattern=digitPatterns[char];for(let i=0;i<9;i++){const w=pattern[i]==='w'?3:1;if(i%2===0)bars.push({x,width:w});x+=w}x+=1}return {bars,width:x+12};}
