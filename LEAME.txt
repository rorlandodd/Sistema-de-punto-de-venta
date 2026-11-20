# Punto Local · Servidor independiente 3.10.1

Guía de instalación — 19 de noviembre de 2026

Este paquete contiene el sistema completo para ejecutarlo en tu servidor: código fuente, aplicación ya compilada, base SQLite vacía, instalador de administrador y ejemplos de despliegue. Se basa en Punto Local 3.10. No requiere ChatGPT, Cloudflare, MySQL ni una cuenta externa para ingresar. No contiene los productos, clientes, ventas, fotografías ni usuarios del sitio anterior.

**Comienza aquí:** para usarlo en tu computador, instala Node.js 24 y sigue el apartado de Windows o macOS/Linux. Para publicarlo en tu dominio, usa un servidor con Node.js 24 o Docker; un dominio por sí solo no aloja el sistema. Un hosting que solo admita PHP/MySQL o páginas estáticas no sirve para este paquete.

## 1. Qué encontrarás

- `dist/`: aplicación lista para ejecutar, con sus dependencias incluidas.
- `src/`: código fuente de interfaz, reglas del negocio, API, acceso e instalador.
- `database/schema.sql`: estructura completa de la base de datos.
- `database/base-vacia.sqlite`: base vacía con las tablas, sin ningún registro.
- `INSTALAR.cmd`, `INICIAR.cmd`: accesos para Windows.
- `instalar.sh`, `iniciar.sh`: accesos para macOS/Linux.
- `config.example.json`: ejemplo de dirección y puerto.
- `Dockerfile`, `compose.yaml`: alternativa con Docker.
- `deploy/`: ejemplos para dominio HTTPS y servicio Linux.
- `VERIFICACION.md`: alcance de las pruebas y limitaciones.
- `TERCEROS.txt`: licencias de las dependencias distribuidas.

La carpeta `data/` se crea al instalar. Contiene `punto-local.sqlite` y, cuando subas archivos, `files/`. **Esta carpeta es tu información real: no la borres ni la reemplaces al actualizar.** El instalador crea las tablas automáticamente a partir del esquema; no necesitas importar manualmente `base-vacia.sqlite`.

## 2. Administrador inicial

El instalador pregunta:

1. **Usuario administrador [rene]:** presiona Enter para usar `rene`.
2. **Clave:** escribe la contraseña que indicaste en la conversación. Se aceptan sus caracteres especiales; ingrésala directamente en la terminal, no como un comando.
3. **Repite la clave:** vuelve a escribirla.

La clave no se muestra mientras escribes; esto es normal. Mínimo 12 caracteres. Se guarda una derivación con sal aleatoria mediante scrypt, nunca la clave en texto plano. No hay una clave universal incorporada en el ZIP. El administrador inicial tiene permiso completo; el resto de la base queda sin datos del negocio. Su correo inicial interno es `rene@local.invalid`: no envía correos. Puedes completar nombre, RUT, teléfono y fotografía en Ajustes → Usuarios.

El instalador no sobrescribe una instalación existente. No debes volver a instalar cada vez que abras el sistema.

## 3. Windows 10/11 o Windows Server

1. Descarga **Node.js versión 24** desde https://nodejs.org/en/download e instala el archivo para Windows. Mantén la opción de agregar Node al PATH.
2. Extrae el ZIP completo, por ejemplo en `C:\PuntoLocal`. No ejecutes archivos dentro del ZIP.
3. Abre la carpeta que contiene `LEAME.md` y `dist`.
4. Haz doble clic en `INSTALAR.cmd` y completa las preguntas del administrador.
5. Haz doble clic en `INICIAR.cmd`. Mantén abierta esa ventana.
6. Abre Chrome, Edge o Firefox en **http://localhost:3000**.
7. Ingresa con `rene` y la clave que escribiste al instalar.
8. Para detenerlo, presiona Ctrl+C en la ventana del servidor. Los datos permanecen guardados.

Si Windows no encuentra `node`, cierra y abre la terminal después de instalarlo. Comprueba `node --version`: debe empezar con `v24.`.

Alternativa desde PowerShell, estando en la carpeta del sistema:

```powershell
node dist/install.cjs
node dist/server.cjs
```

Para inicio automático local, puedes crear una tarea en el Programador de tareas de Windows: programa `node.exe` con su ruta completa; argumentos `dist/server.cjs`; “Iniciar en” la carpeta completa del sistema. Configúrala con tu cuenta de servicio, reinicio ante fallos y disco local permanente. Comprueba que arranque después de reiniciar el equipo. No lo ejecutes simultáneamente con `INICIAR.cmd` en el mismo puerto.

## 4. macOS

1. Instala Node.js 24 para macOS desde https://nodejs.org/en/download, eligiendo Apple Silicon o Intel según tu equipo.
2. Descomprime el ZIP en una carpeta de tu usuario, por ejemplo `Documentos/PuntoLocal`.
3. Abre Terminal y escribe `cd `; arrastra la carpeta que contiene `LEAME.md` a la terminal y presiona Enter.
4. Ejecuta:

```sh
node --version
node dist/install.cjs
node dist/server.cjs
```

5. Abre **http://localhost:3000** e inicia sesión.
6. Mantén Terminal abierta. Ctrl+C detiene el servidor. Evita la suspensión del equipo mientras otras cajas o teléfonos lo usen.

También puedes usar `sh instalar.sh` y después `sh iniciar.sh` desde esa carpeta. El sistema no es una aplicación nativa `.app`: se ejecuta en Node y se usa desde el navegador.

## 5. Linux — instalación manual

1. Instala Node.js 24 mediante el método oficial apropiado para tu distribución: https://nodejs.org/en/download. Verifica `node --version`. Algunos repositorios de la distribución incluyen versiones antiguas.
2. Descomprime el ZIP en tu carpeta de trabajo.
3. Abre una terminal en la carpeta que contiene `LEAME.md`.
4. Ejecuta `node dist/install.cjs` y completa usuario y clave.
5. Ejecuta `node dist/server.cjs`.
6. Abre **http://localhost:3000**. En un VPS sin escritorio continúa con el apartado de dominio; `localhost` en tu computador no apunta al VPS.

No necesitas `npm install` para ejecutar la versión compilada que se entrega.

### Mantenerlo encendido con systemd

Ejemplo para un servidor Linux con systemd y Node instalado para todo el sistema:

1. Crea una cuenta de servicio y copia el sistema:

```sh
sudo useradd --system --home /opt/punto-local --shell /usr/sbin/nologin puntolocal
sudo mkdir -p /opt/punto-local
sudo cp -a . /opt/punto-local/
sudo chown -R puntolocal:puntolocal /opt/punto-local
cd /opt/punto-local
sudo -u puntolocal /usr/bin/node dist/install.cjs
```

Ejecuta estos comandos desde la carpeta extraída. Si ya instalaste allí, omite el instalador; conserva `data/`. Si tu distribución no tiene `/usr/sbin/nologin`, usa la ruta equivalente.

2. Comprueba `command -v node`. Cambia `ExecStart` en `deploy/punto-local.service` si Node no está en `/usr/bin/node`. Evita rutas dentro del home de otro usuario para un servicio.
3. Configura `config.json` según el apartado de dominio.
4. Instala y activa el servicio:

```sh
sudo cp deploy/punto-local.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now punto-local
sudo systemctl status punto-local
```

Para ver errores: `sudo journalctl -u punto-local -n 60`. Para reiniciar después de cambiar configuración: `sudo systemctl restart punto-local`. Para detener: `sudo systemctl stop punto-local`.

## 6. Docker — Windows, macOS o Linux

Instala Docker Desktop en Windows/macOS o Docker Engine con Compose en Linux siguiendo https://docs.docker.com/get-started/get-docker/. Abre Docker y espera a que esté listo.

En una terminal situada en la carpeta del sistema:

```sh
docker compose build
docker compose run --rm pos node dist/install.cjs
docker compose up -d
docker compose logs --tail=50 pos
```

En el paso del instalador, escribe `rene` y tu clave. Abre **http://localhost:3000**. Para detener: `docker compose stop`. Para iniciar nuevamente: `docker compose up -d`.

Los datos quedan en el volumen persistente `pos_data` de Compose. **No uses `docker compose down -v`: elimina ese volumen.** No cambies el nombre o ubicación del proyecto sin identificar antes el volumen existente. El puerto publicado solo escucha en el computador/servidor local; para un dominio usa Caddy en el host. Para modificar APP_URL, crea `.env` junto a compose.yaml con una sola línea, por ejemplo:

```text
APP_URL=https://ventas.tudominio.cl
```

Después ejecuta `docker compose up -d --force-recreate`. No pongas contraseñas en `.env`: las crea el instalador. La construcción de la imagen requiere internet para obtener Node. La ejecución habitual requiere conexión entre tus dispositivos y el servidor.

## 7. Publicar en tu propio dominio con HTTPS

Necesitas: dominio/subdominio, servidor/VPS con acceso administrativo, Node24 o Docker, y puertos públicos 80 y 443. La guía usa `ventas.tudominio.cl` como ejemplo: reemplázalo siempre por el tuyo.

1. En la administración DNS del dominio, crea un registro **A** `ventas` apuntando a la IP pública de tu servidor. Solo configura AAAA si tu servidor dispone de IPv6 correctamente habilitado.
2. Instala y prueba el sistema en el servidor, siguiendo Linux o Docker.
3. Para instalación directa, copia `config.example.json` a `config.json` y escribe:

```json
{
  "host": "127.0.0.1",
  "port": 3000,
  "appUrl": "https://ventas.tudominio.cl"
}
```

Con Docker usa el `.env` del apartado anterior. `appUrl` debe coincidir exactamente con la dirección que usarás en el navegador. Sin rutas adicionales: el sistema se instala en la raíz del subdominio, no en `/pos`.

4. Instala Caddy desde https://caddyserver.com/docs/install para tu distribución. En Linux con servicio, edita `/etc/caddy/Caddyfile`:

```text
ventas.tudominio.cl {
    reverse_proxy 127.0.0.1:3000
}
```

5. Permite TCP 80 y 443 en el firewall y en el panel de tu proveedor. No publiques el puerto 3000. Si el servidor está en tu local, necesitarás redirección de puertos y una IP accesible; CGNAT puede impedirlo. Un VPS simplifica este caso.
6. Reinicia Punto Local para cargar `config.json`. Valida y recarga Caddy:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

7. Abre **https://ventas.tudominio.cl**. Comprueba el candado del navegador. Caddy obtiene y renueva el certificado si el DNS y los puertos son correctos.
8. Prueba el inicio de sesión, una foto, una venta de prueba y la descarga de un informe antes de usarlo con ventas reales.

Si tienes otro proxy (Nginx, Apache, IIS), debe reenviar todas las rutas al puerto 3000 y ofrecer HTTPS. No sirvas públicamente la carpeta del proyecto ni `data/`. Tu proveedor deberá ayudarte con su configuración concreta. El paquete no configura automáticamente DNS, firewall, certificados ni tu servicio de hosting.

## 8. Acceso desde teléfonos y otros computadores

La interfaz se adapta al escritorio y al móvil. Con un dominio HTTPS, abre la misma dirección en cada dispositivo. Puedes añadirla a la pantalla de inicio del teléfono desde el navegador; no necesita instalar una app móvil.

Para una prueba en red privada, copia `config.example.json` como `config.json`: usa `host: "0.0.0.0"` y `appUrl: "http://192.168.1.50:3000"`, sustituyendo la IP por la del servidor. Reinicia y abre esa misma dirección desde todos los dispositivos. Autoriza el puerto 3000 solamente para tu red privada. No uses esta modalidad HTTP en internet; para uso habitual con datos de clientes configura HTTPS. Si cambia la IP, actualiza appUrl o reserva una IP en el router.

## 9. Primer uso y nuevos usuarios

1. Ingresa como `rene`.
2. Completa **Ajustes → Empresa**: nombre del local, representante, RUT, dirección, teléfono y logo.
3. Revisa reglas de venta, medios de pago, caja, puntos, apariencia y comprobantes.
4. Crea productos y registra sus existencias en Inventario.
5. Abre una jornada en Caja y después realiza ventas.
6. Para un trabajador, crea su perfil en **Ajustes → Usuarios** con nombre, correo, RUT, teléfono, rol y estado.
7. En **Accesos de usuarios** (parte superior), selecciona ese perfil y asigna nombre de usuario y contraseña. Cada persona ingresa con su propio usuario.
8. Al desactivar/eliminar un perfil se bloquea también su sesión. Al restablecer su clave se cierran sus sesiones. Cada persona puede cambiar su clave en **Mi contraseña**.

El rol administrador tiene acceso completo; ventas e inventario conservan sus límites y las opciones que configure el administrador. Una sesión dura hasta 12 horas. Tras 10 intentos de acceso en 15 minutos se aplica un bloqueo temporal; detrás de un proxy la limitación por dirección puede compartirse entre trabajadores.

Los lectores USB deben funcionar como teclado y terminar con Enter. Los comprobantes se imprimen desde el navegador: selecciona impresora, papel de 58/80 mm según configuración y desactiva los encabezados/pies del navegador. Verifica el resultado con tu modelo de impresora.

## 10. Respaldo completo y restauración

**Haz una copia diaria de la carpeta `data/` y guarda otra copia fuera del servidor.** Contiene base, accesos y archivos, por lo que debe protegerse como información privada.

### Instalación directa

1. Detén Punto Local (Ctrl+C o `sudo systemctl stop punto-local`).
2. Copia **toda** `data/` a una carpeta con fecha; incluye cualquier archivo `-wal` o `-shm` si existe. Guarda también `config.json` y este ZIP de instalación.
3. Reinicia el servidor.
4. Para restaurar, detén el sistema, conserva una copia de la carpeta actual y reemplaza `data/` por la copia elegida. Respeta propietario/permisos.
5. Inicia sin ejecutar nuevamente el instalador. Verifica último comprobante, stock, caja, adjuntos y usuarios.

No copies solo el SQLite mientras el servidor está escribiendo: podrías dejar transacciones o fotografías fuera. No uses una carpeta sincronizada de OneDrive/Dropbox ni un disco de red como base activa.

### Docker

Con el contenedor creado por `docker compose up -d`, detén el servicio y copia su carpeta de datos (funciona aunque esté detenido):

```sh
docker compose stop
docker compose cp pos:/app/data ./respaldo-data
docker compose up -d
```

Usa un nombre de destino nuevo en cada respaldo, por ejemplo `respaldo-data-2026-11-19`. Copia esa carpeta fuera del servidor. No la mezcles con una copia anterior.

Para recuperar en un proyecto nuevo con volumen vacío:

```sh
docker compose create
docker compose cp ./respaldo-data/. pos:/app/data/
docker compose run --rm --user root pos chown -R node:node /app/data
docker compose up -d
```

El directorio `respaldo-data` debe contener directamente `punto-local.sqlite` y `files/` si hay adjuntos. Hazlo sobre un volumen nuevo y vacío. Si restauras un sistema existente, conserva primero el volumen anterior; no mezcles dos bases ni adjuntos de distintos respaldos. No vuelvas a ejecutar el instalador sobre la base restaurada.

El ZIP de respaldo descargable desde Ajustes contiene los datos comerciales y adjuntos referenciados, **pero no contiene las credenciales locales ni las sesiones**. Para recuperar por completo esta instalación usa la copia de `data/`. No hay importación automática desde la interfaz ni migración automática de las ventas del alojamiento anterior.

## 11. Recuperar la contraseña

Solo alguien con acceso a la terminal del servidor puede hacerlo. Detén el servicio y, desde la carpeta del sistema y con el mismo usuario del servicio, ejecuta:

```sh
node dist/install.cjs --reset-password
```

Escribe el nombre de usuario existente y una nueva clave. No borra ventas ni stock y cierra sus sesiones. Reinicia el servidor. Con Docker: `docker compose stop`, luego `docker compose run --rm pos node dist/install.cjs --reset-password`, y finalmente `docker compose up -d`.

## 12. Actualizar o modificar el código

Respalda primero. Conserva `data/`, `config.json` o `.env`. Nunca reemplaces la base real por `base-vacia.sqlite`. Detén el proceso, reemplaza archivos de aplicación por una actualización compatible y reinicia. Sigue las migraciones que indique cada versión futura; no se garantiza que cualquier versión antigua pueda abrir bases nuevas.

Para cambiar el código, instala las dependencias de desarrollo y recompila:

```sh
npm install
npm run build
npm start
```

La ejecución normal usa `dist/`: editar `src/` sin reconstruir no cambia la aplicación. Las dependencias directas están fijadas en `package.json`; los bundles ya entregados no requieren descargar dependencias. Node 24 incluye SQLite; no instales extensiones PHP/MySQL para este sistema.

## 13. Problemas frecuentes

- **“Ejecuta primero … install”**: instala desde la carpeta correcta, con el mismo DATA_DIR/usuario del servicio.
- **“Ya está instalado”**: usa INICIAR; el instalador evita borrar tu información.
- **“Origen no permitido”**: appUrl debe coincidir con protocolo, dominio y puerto del navegador. Reinicia tras editarlo.
- **“Usuario o clave incorrectos”**: usa el usuario local, no el correo de ChatGPT. Si olvidaste la clave, usa recuperación.
- **Puerto ocupado**: detén la otra instancia o cambia puerto y appUrl juntos; adapta también el proxy.
- **No abre desde otro dispositivo**: `localhost` siempre significa ese dispositivo. Usa el dominio o la IP de red configurada.
- **El dominio no funciona**: revisa DNS, firewall, Caddy y el proceso Node. El dominio no sustituye al servidor.
- **No guarda datos/fotos**: revisa espacio en disco y permiso de escritura en `data/` para la cuenta del servicio.
- **Doble clic en HTML no funciona**: debe iniciarse el servidor; la aplicación necesita la API y la base.

## 14. Alcance y límites importantes

Incluye las funciones de Punto Local 3.10: ventas, caja, inventario, compras/proveedores, clientes/puntos, cotizaciones, reportes, roles, apariencia y respaldos. Solo una caja/jornada abierta por local; no incluye múltiples sucursales. SQLite guarda el estado comercial en JSON con control de revisión y registro de operaciones, conservando el diseño de la aplicación original. No es una base relacional analítica ni un servicio diseñado para muchas sucursales o miles de usuarios concurrentes; para ese uso se requiere otro proyecto de arquitectura y pruebas de carga.

**Los comprobantes son internos. No hay emisión fiscal conectada al SII, facturas tributarias ni notas de crédito electrónicas certificadas.** La pantalla tributaria solo registra preparación/configuración. Las tarjetas, transferencias y reembolsos se procesan por fuera, en el banco o terminal, y se registran aquí.

No hay ventas offline sincronizadas: el dispositivo debe comunicarse con tu servidor para confirmar operaciones. Las fuentes visuales pueden usar Google Fonts; si no hay internet se usan las fuentes alternativas. La aplicación no incluye envío de correos, actualizaciones automáticas, recuperación de clave por correo ni soporte técnico contratado.

Comprobado en Linux con Node 24.22.3: instalación interactiva y operaciones principales de API. No se ha ejecutado este paquete en equipos físicos Windows/macOS, Docker, impresora/lector USB ni en tu dominio. Consulta VERIFICACION.md y realiza una prueba completa en tu equipo antes de abrir una jornada real.

Documentación oficial consultada para las opciones de instalación:
- Node y SQLite: https://nodejs.org/api/sqlite.html
- Docker Compose: https://docs.docker.com/compose/gettingstarted/
- Caddy y HTTPS: https://caddyserver.com/docs/automatic-https
