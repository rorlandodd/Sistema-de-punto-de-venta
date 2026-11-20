import {loyaltyHistory} from '../../../lib/loyalty-history';
import {cashConfig} from '../../../lib/cash-controls';
import {loyaltyConfig} from '../../../lib/loyalty';
import {fiscalSettings} from '../../../lib/fiscal';
import {ensureLedger,requestHash,lookupRequest,commitRequest,scopeResult} from '../../../lib/request-ledger';
import {normalizeCatalogs} from '../../../lib/purchases';
import {env} from '../../../runtime';
import {initial,mutate,businessSettings} from '../../../lib/engine';
import {quoteConfig} from '../../../lib/quotes';
import {posConfig} from '../../../lib/pos-config';
export const dynamic='force-dynamic';
const json=(v:any,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
async function run(req:Request,write=false){try{
 const uid=req.headers.get('oai-authenticated-user-id'),email=(req.headers.get('oai-authenticated-user-email')||'').toLowerCase();if(!uid||!email)return json({error:'Inicia sesión para acceder al local'},401);
 const db=env.DB!;await ensureLedger(db);
 await db.prepare('INSERT OR IGNORE INTO shop (id,revision,data) VALUES (1,0,?)').bind(JSON.stringify(initial(uid,email))).run();
 if(write&&Number(req.headers.get('content-length')||0)>262144)return json({error:'La operación supera el tamaño permitido'},413);
 const raw=write?await req.text():'';if(raw.length>262144)return json({error:'La operación supera el tamaño permitido'},413);const b:any=write?JSON.parse(raw):null;if(write&&(!b||typeof b!=='object'||Array.isArray(b)))return json({error:'Operación inválida'},400);const hash=write?await requestHash(b):'';
 if(write&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Origen no permitido'},403);
 for(let attempt=0;attempt<5;attempt++){
 const row:any=await db.prepare('SELECT revision,data FROM shop WHERE id=1').first();const s=JSON.parse(row.data);normalizeCatalogs(s);const u=s.users.find((x:any)=>x.id===uid||(!x.id&&x.email===email));if(!u||!u.active)return json({error:'Tu cuenta no tiene acceso. Pide al administrador que registre tu correo.'},403);
 if(!write){const params=new URL(req.url).searchParams;if(params.has('pointsRut')){if(!['admin','ventas'].includes(u.role))return json({error:'No tienes permiso para consultar puntos'},403);return json(loyaltyHistory(s,u.role,params));}const operation=new URL(req.url).searchParams.get('operation');if(operation){const record=await lookupRequest(db,operation);if(record&&record.user_id!==uid)return json({error:'Operación ajena'},403);return json(record?{found:true,result:scopeResult(JSON.parse(record.result),u.role)}:{found:false});}return json({loyaltyConfig:loyaltyConfig(s),loyaltyAccounts:u.role==='inventario'?{}:(s.loyaltyAccounts||{}),loyaltyMovements:u.role==='admin'?(s.loyaltyMovements||[]).slice(0,100):[],fiscal:u.role==='admin'?fiscalSettings(s):undefined,revision:row.revision,me:{...u,id:uid},returns:u.role==='inventario'?[]:scopeResult(s.returns||[],u.role),holds:u.role==='inventario'?[]:(s.holds||[]).filter((h:any)=>!h.closed),suppliers:u.role==='ventas'||u.role==='inventario'&&!posConfig(s).inventoryPurchases?[]:(s.suppliers||[]),purchases:u.role==='ventas'||u.role==='inventario'&&!posConfig(s).inventoryPurchases?[]:(s.purchases||[]),quoteConfig:quoteConfig(s),customers:u.role==='inventario'?[]:(s.customers||[]),quotes:u.role==='inventario'?[]:(s.quotes||[]),cashControls:cashConfig(s),cashCounts:u.role==='inventario'?[]:(s.cashCounts||[]),config:posConfig(s),cashMovements:u.role==='inventario'?[]:(s.cashMovements||[]),audit:u.role==='admin'?(s.audit||[]).slice(0,150):[],settings:businessSettings(s),catalogs:s.catalogs||[],units:s.units||['Unidad','Paquete','Litro','ml','cc','kg','g'],products:s.products.filter((p:any)=>!p.deletedAt).map((p:any)=>u.role==='ventas'?{...p,cost:undefined}:p),shifts:u.role==='inventario'?[]:s.shifts,sales:u.role==='inventario'?[]:s.sales.map((x:any)=>u.role==='ventas'?{...x,cost:undefined,items:x.items.map((i:any)=>({...i,cost:undefined}))}:x),users:u.role==='admin'?s.users.filter((x:any)=>!x.deletedAt):[],movements:u.role==='ventas'?[]:s.movements});}
 if(typeof b.requestId!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(b.requestId))return json({error:'Falta identificador de operación'},400);
 const record=await lookupRequest(db,b.requestId);if(record){if(record.user_id!==uid)return json({error:'Operación no disponible'},403);if(record.payload_hash!==hash)return json({error:'Esta solicitud ya fue utilizada con otros datos'},409);return json(scopeResult(JSON.parse(record.result),u.role));}
 if(['sale','close','cashMovement','voidSale','returnSale','cashCount','reverseCashMovement'].includes(b.action)&&!b.shiftId)return json({error:'Actualiza la página para comprobar la caja activa'},400);
 if(b.action==='close'&&!b.expectedSnapshot)return json({error:'Actualiza el arqueo antes de cerrar'},400);
 const previous=(s.operations||[]).find((x:any)=>x.id===b.requestId);if(previous){if(previous.user&&previous.user!==uid)return json({error:'Operación no disponible'},403);if(previous.payload&&previous.payload!==JSON.stringify(b))return json({error:'Actualiza antes de intentar una operación diferente'},409);return json(scopeResult(previous.result,u.role));}
 if(['purchase','purchaseAttachments'].includes(b.action)){for(const a of b.attachments||[]){if(typeof a?.url!=='string'||!/^\/api\/documents\/[0-9a-f-]{36}$/.test(a.url)||!await env.BUCKET!.head('documents/'+a.url.split('/').pop()))return json({error:'Adjunto no encontrado. Vuelve a subir el archivo.'},400);}}
 if(!u.id)u.id=uid;const result:any=mutate(s,u,b);s.audit??=[];s.audit.unshift({id:crypto.randomUUID(),date:new Date().toISOString(),user:u.name,action:b.action,target:b.id||b.email||b.code||result.number||'',note:String(b.note||'').slice(0,160)});
 if(await commitRequest(db,s,row.revision,b.requestId,uid,hash,result))return json(scopeResult(result,u.role));
 }return json({error:'Otra operación está actualizando la caja. Intenta nuevamente.'},409);
 }catch(e:any){return json({error:e.message||'No se pudo guardar'},400)}}
export const GET=(r:Request)=>run(r);export const POST=(r:Request)=>run(r,true);
