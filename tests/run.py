"""Prueba aislada; Python 3 y Node 24. No modifica data/."""
import os,pathlib,tempfile,subprocess,socket,time,urllib.request
root=pathlib.Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory(prefix='punto-local-test-') as tmp:
 with socket.socket() as sock:
  sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 url='http://localhost:'+str(port)
 env={**os.environ,'DATA_DIR':tmp,'PORT':str(port),'HOST':'127.0.0.1','APP_URL':url,'TEST_URL':url}
 seed="""
 const {DatabaseSync}=require('node:sqlite'),fs=require('fs'),c=require('crypto');
 const db=new DatabaseSync(process.env.DATA_DIR+'/punto-local.sqlite');db.exec(fs.readFileSync('database/schema.sql','utf8'));
 const id=c.randomUUID(),salt=c.randomBytes(16).toString('hex'),hash=salt+':'+c.scryptSync('TestingLocal2026!',salt,64).toString('hex');
 db.prepare('INSERT INTO shop VALUES(1,0,?)').run(JSON.stringify({users:[{id,email:'rene@local.invalid',name:'rene',role:'admin',active:true}],products:[],sales:[],shifts:[],movements:[],operations:[]}));
 db.prepare('INSERT INTO credentials VALUES(?,?,?,?)').run(id,'rene@local.invalid','rene',hash);db.close();
 """
 subprocess.run(['node','-e',seed],cwd=root,env=env,check=True)
 def start():
  p=subprocess.Popen(['node','dist/server.cjs'],cwd=root,env=env)
  for _ in range(60):
   try:urllib.request.urlopen(url,timeout=1);return p
   except Exception:time.sleep(.1)
  p.terminate();raise RuntimeError('No inició el servidor')
 p=start()
 try:subprocess.run([os.sys.executable,str(root/'tests/integration.py')],env=env,check=True)
 finally:p.terminate();p.wait(timeout=10)
 p=start()
 try:
  check="""
  (async()=>{const r=await fetch(process.env.APP_URL+'/api/auth/login',{method:'POST',headers:{Origin:process.env.APP_URL,'Content-Type':'application/json'},body:JSON.stringify({username:'rene',password:'TestingChanged2026!'})});if(!r.ok)throw Error('Login tras reinicio');const d=await(await fetch(process.env.APP_URL+'/api/pos',{headers:{Cookie:r.headers.get('set-cookie').split(';')[0]}})).json();if(d.sales.length!==1||d.products[0].stock!==7)throw Error('Persistencia');console.log('PASS: persistencia tras reinicio');})().catch(e=>{console.error(e);process.exit(1)})
  """
  subprocess.run(['node','-e',check],cwd=root,env=env,check=True)
 finally:p.terminate();p.wait(timeout=10)
