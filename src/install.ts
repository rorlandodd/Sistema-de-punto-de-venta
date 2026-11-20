import {db,dataDir} from './runtime';
import {initial} from './lib/engine';
import {hashPassword} from './password';
import {createInterface} from 'node:readline/promises';
import {randomUUID} from 'node:crypto';
const input=createInterface({input:process.stdin,output:process.stdout});
async function secret(label:string):Promise<string>{if(!process.stdin.isTTY)throw Error('Ejecuta el instalador en una terminal interactiva');process.stdout.write(label);process.stdin.setRawMode(true);process.stdin.resume();return new Promise((resolve,reject)=>{let v='';const read=(chunk:Buffer)=>{for(const c of chunk.toString()){if(c==='\r'||c==='\n'){done();resolve(v);return}if(c==='\u0003'){done();reject(Error('Cancelado'));return}if(c==='\u007f'||c==='\b')v=v.slice(0,-1);else if(c>=' ')v+=c}};function done(){process.stdin.off('data',read);process.stdin.setRawMode(false);process.stdout.write('\n');process.stdin.pause()}process.stdin.on('data',read)})}
(async()=>{try{
 const exists=db.prepare('SELECT id FROM shop WHERE id=1').get();
 const reset=process.argv.includes('--reset-password');
 if(exists&&!reset)throw Error('Ya está instalado. No se han cambiado los datos. Para recuperar una clave: node dist/install.cjs --reset-password');
 if(!exists&&reset)throw Error('Instala primero el sistema');
 console.log('Punto Local · Instalación independiente\nBase de datos: '+dataDir+'\nLa clave se escribe oculta. No se incluye una contraseña fija en el paquete.');
 const username=(await input.question('Usuario administrador [rene]: ')||'rene').trim().toLowerCase();
 if(!/^[a-z0-9._-]{3,40}$/.test(username))throw Error('Usuario inválido');
 input.close();
 const pass=await secret('Clave (mínimo 12 caracteres; usa la clave que elegiste): ');
 if(pass!==await secret('Repite la clave: '))throw Error('Las claves no coinciden');
 const password=await hashPassword(pass);
 if(reset){const user:any=db.prepare('SELECT * FROM credentials WHERE username=?').get(username);if(!user)throw Error('Usuario inexistente');db.prepare('UPDATE credentials SET password=? WHERE user_id=?').run(password,user.user_id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.user_id)}
 else{const uid=randomUUID(),email=username+'@local.invalid',s=initial(uid,email);s.users[0].name=username;db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO shop VALUES(1,0,?)').run(JSON.stringify(s));db.prepare('INSERT INTO credentials VALUES(?,?,?,?)').run(uid,email,username,password);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}
 console.log('Listo. Administrador configurado. Ejecuta node dist/server.cjs');
}catch(e:any){console.error(e.message);process.exitCode=1}finally{input.close();db.close()}

})();
