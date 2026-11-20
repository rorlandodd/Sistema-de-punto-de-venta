# Verificación de Punto Local Servidor 3.10.1

Fecha: 19-11-2026. Base de aplicación: Punto Local 3.10, commit 9a7cbaafa018395679c390738086045ae996d9c7.

## Ejecutado y aprobado

Entorno Linux, Node 24.22.3, SQLite incorporado. Compilación de cliente, servidor e instalador completada.

- Instalador real en terminal interactiva: solicita usuario, clave oculta y confirmación; crea administrador local con clave derivada.
- Instalación comercial vacía: sin productos ni ventas, un administrador.
- Inicio de sesión, rechazo de clave incorrecta, cookie HttpOnly, cambio de clave e invalidación de sesiones.
- Rechazo de cabeceras de identidad externas sin sesión y de peticiones de escritura desde otro origen.
- Creación de producto, apertura de caja, venta de dos unidades, vuelto y descuento de stock.
- Repetición del mismo identificador: devuelve el resultado sin duplicar venta ni descuento.
- Ajuste de stock con motivo.
- Informe PDF generado con firma de formato PDF.
- Subida y recuperación de fotografía PNG y documento PDF.
- Respaldo ZIP válido con datos y fotografía referenciada.
- Creación de perfil de vendedor y credenciales; ocultación de costos, rechazo de acceso administrativo y respaldo.
- Desactivar usuario bloquea una sesión ya iniciada.
- Rutas ajenas a los recursos públicos no exponen el esquema de la base.
- Reinicio del proceso: conserva venta y stock.

Las pruebas automatizadas están en `tests/`. Con Python 3 y Node 24 ejecuta `python3 tests/run.py` (Windows: `python tests/run.py`). Crean una base temporal con credenciales exclusivamente de prueba y la eliminan al terminar; no usan `data/`.

## No verificado físicamente en esta entrega

Windows, macOS, Docker, DNS/HTTPS real del usuario, lector USB, impresora térmica, funcionamiento visual completo en navegadores y todas las combinaciones de módulos heredados. Los ejemplos de despliegue deben comprobarse en el servidor destino. No se ejecutaron pruebas de carga ni auditoría de seguridad externa.

Esta adaptación mantiene el motor comercial y los controles de la versión original. La autenticación local y el almacenamiento de archivos/SQLite reemplazan las dependencias del alojamiento anterior. Los datos se distribuyen vacíos. La preparación SII no constituye una integración tributaria operativa.
