import uuid,io,zipfile,json,urllib.request,urllib.error,http.cookiejar
class Response:
 def __init__(self,r):
  self.status_code=r.code;self.content=r.read();self.text=self.content.decode('utf8',errors='replace');self.headers=r.headers
 def json(self):return json.loads(self.content)
class Session:
 def __init__(self):self.headers={};self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def get(self,url,**kw):return self.request(url,'GET',**kw)
 def post(self,url,**kw):return self.request(url,'POST',**kw)
 def request(self,url,method,headers=None,json=None,files=None):
  h={**self.headers,**(headers or {})};data=None
  if json is not None:data=__import__('json').dumps(json).encode();h['Content-Type']='application/json'
  if files:
   boundary='----posTestBoundary';data=b''
   for k,(name,content,mime) in files.items():data+=('--'+boundary+'\r\nContent-Disposition: form-data; name="'+k+'"; filename="'+name+'"\r\nContent-Type: '+mime+'\r\n\r\n').encode()+content+b'\r\n'
   data+=('--'+boundary+'--\r\n').encode();h['Content-Type']='multipart/form-data; boundary='+boundary
  try:r=self.opener.open(urllib.request.Request(url,data=data,headers=h,method=method))
  except urllib.error.HTTPError as e:r=e
  return Response(r)
class requests:
 Session=Session
 @staticmethod
 def get(url,**kw):return Session().get(url,**kw)

base=__import__('os').environ.get('TEST_URL','http://localhost:3087');s=requests.Session();s.headers['Origin']=base
assert requests.get(base+'/api/pos',headers={'oai-authenticated-user-id':'fake','oai-authenticated-user-email':'rene@local.invalid'}).status_code==401
assert s.post(base+'/api/auth/login',json={'username':'rene','password':'wrong'}).status_code==401
r=s.post(base+'/api/auth/login',json={'username':'rene','password':'TestingLocal2026!'});assert r.status_code==200,r.text
assert 'HttpOnly' in r.headers['Set-Cookie']
assert s.get(base+'/').status_code==200
assert s.get(base+'/app.js').status_code==200
state=s.get(base+'/api/pos').json();assert state['products']==[] and state['sales']==[] and len(state['users'])==1
assert s.post(base+'/api/pos',headers={'Origin':'http://evil.invalid'},json={}).status_code==403

def op(action,**b):
 payload={'action':action,'requestId':str(uuid.uuid4()),**b};r=s.post(base+'/api/pos',json=payload);assert r.status_code==200,r.text;return r.json(),payload
op('product',code='780000000001',brand='Prueba',catalog='Bebida',detail='500 ml',price=2000,cost=1000,entry=10,minimum=2)
op('open',amount=5000)
d=s.get(base+'/api/pos').json();p=d['products'][0];shift=d['shifts'][0]
result,payload=op('sale',items=[{'id':p['id'],'qty':2}],shiftId=shift['id'],expectedTotal=4000,method='cash',paid=5000)
assert result['change']==1000,result
assert s.post(base+'/api/pos',json=payload).json()==result
state=s.get(base+'/api/pos').json();assert state['products'][0]['stock']==8 and len(state['sales'])==1
op('stock',id=p['id'],direction='out',qty=1,note='Prueba ajuste')
assert s.get(base+'/api/pos').json()['products'][0]['stock']==7
pdf=s.get(base+'/api/reports/pdf?from=2026-01-01&to=2026-12-31');assert pdf.status_code==200 and pdf.content.startswith(b'%PDF')
# Real PNG from a standard one-pixel data URI.
import base64
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8R8AAAAASUVORK5CYII=')
r=s.post(base+'/api/photos',files={'photo':('pixel.png',png,'image/png')});assert r.status_code==200,r.text
photo=r.json()['url'];assert s.get(base+photo).content==png
op('settings',name='Prueba local',logo=photo)
r=s.post(base+'/api/documents',files={'document':('test.pdf',pdf.content,'application/pdf')});assert r.status_code==200,r.text
assert s.get(base+r.json()['url']).content==pdf.content
backup=s.get(base+'/api/backup');assert backup.status_code==200,backup.text
z=zipfile.ZipFile(io.BytesIO(backup.content));assert 'datos.json' in z.namelist() and any(x.endswith('.png') for x in z.namelist())
op('user',email='vendedor@example.invalid',name='Vendedor prueba',role='ventas',rut='12345678-5',phone='123456789')
r=s.post(base+'/api/auth/access',json={'email':'vendedor@example.invalid','username':'vendedor','password':'TemporaryTest2026!'});assert r.status_code==200,r.text
v=requests.Session();v.headers['Origin']=base
assert v.post(base+'/api/auth/login',json={'username':'vendedor','password':'TemporaryTest2026!'}).status_code==200
assert v.get(base+'/api/auth/access').status_code==403
assert v.get(base+'/api/backup').status_code==403
vs=v.get(base+'/api/pos').json();assert 'cost' not in vs['products'][0]
assert v.post(base+'/api/pos',json={'action':'product','requestId':str(uuid.uuid4()),'brand':'bad','code':'bad'}).status_code==400
op('user',email='vendedor@example.invalid',name='Vendedor prueba',role='ventas',rut='12345678-5',phone='123456789',active=False)
assert v.get(base+'/api/pos').status_code==401
assert s.get(base+'/../database/schema.sql').status_code==404
r=s.post(base+'/api/auth/password',json={'current':'TestingLocal2026!','password':'TestingChanged2026!'});assert r.status_code==200,r.text
assert s.get(base+'/api/pos').status_code==401
assert s.post(base+'/api/auth/login',json={'username':'rene','password':'TestingChanged2026!'}).status_code==200
print('PASS: empty install, login, session, spoofing/CSRF protection, product, opening, sale/change, idempotency, stock, PDF, photo, document, ZIP, roles, disabled account, password change')
