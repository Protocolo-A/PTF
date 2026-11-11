# Portafolio Junior Frontend — Control total

Portafolio personal editable, panel de administración privado, descarga de CV PDF, formularios de contacto, chat con visitantes, notificaciones en el panel y registro aproximado de dispositivos.

## Requisitos

- Node.js 22 o posterior.
- PostgreSQL 16 o compatible, con una base de datos existente llamada `cv`.
- La aplicación en modo desarrollo se ejecuta en Windows con Node.js y se conecta directamente al servicio PostgreSQL instalado en el equipo, normalmente `127.0.0.1:5432`. Docker no es obligatorio para este modo. Si tu PostgreSQL está dentro de Docker Compose, sigue la sección específica de volúmenes antes de iniciarlo.

## 1. Configura `.env.local`

En la carpeta donde está `package.json`, copia `.env.local.example` a `.env.local`. Edita `.env.local` y completa tu URL real: 

```env
DATABASE_URL=postgresql://postgres:TU_CLAVE_POSTGRES@127.0.0.1:5432/cv
ADMIN_PASSWORD=TU_CLAVE_ADMIN_LARGA_Y_UNICA
ADMIN_SESSION_SECRET=UN_SECRETO_ALEATORIO_LARGO_DE_AL_MENOS_48_CARACTERES
ADMIN_SECURE_COOKIE=false
DEVFOLIO_STORAGE=postgres
```

- Conserva el usuario y la contraseña reales del servidor que ya contiene tu base `cv`.
- No uses una contraseña nueva de PostgreSQL si el volumen ya fue creado.
- El administrador define su contraseña editando `ADMIN_PASSWORD` en `.env.local`. Si falta o es un valor de ejemplo débil, el asistente genera una contraseña aleatoria fuerte y la guarda allí. Sin `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET`, `/admin` queda bloqueado (modo seguro por defecto).
- `.env.local` contiene credenciales privadas: no lo compartas ni lo subas a Git.

Si ya tienes una `DATABASE_URL` válida en `.env`, el asistente la copiará a `.env.local` para que Next.js use una única configuración. Si la URL apunta a otra base que no sea `cv`, el asistente se detiene sin tocar esa base.

## 2. Instala y prepara el esquema

Desde PowerShell, en la carpeta del proyecto: 

```powershell
npm install
npm run db:setup
```

`db:setup` solo se conecta a la base `cv` que indicaste. Verifica las tablas principales y añade de forma idempotente las tablas del chat, noticias y visitas, además de columnas de identificación aproximada del dispositivo y ubicación consentida. Elimina del `.env.local` cualquier variable exclusiva del Compose local para evitar mezclar puertos o claves. No borra registros, no reinicia volúmenes y no crea otra base.

Si el servidor PostgreSQL no está iniciado, el asistente lo indicará. No intenta arrancar Docker ni sustituye automáticamente tu base por otra.

### Si tu PostgreSQL ya está en Docker Compose (lee esto antes de iniciar)

El proyecto conserva **los dos nombres Compose que ya existían** para no mezclar volúmenes:

- `compose.local.yaml` usa el proyecto `devfolio-local` y el volumen `devfolio-local_postgres-data`. Este es el stack local usado por el asistente de instalaciones anteriores. Lee `DEVFOLIO_LOCAL_DB_NAME`, `DEVFOLIO_LOCAL_DB_USER`, `DEVFOLIO_LOCAL_DB_PASSWORD` y `DEVFOLIO_LOCAL_DB_PORT` de `.env.local`.
- `compose.yaml` usa el proyecto `devfolio` y el volumen `devfolio_postgres-data`. Es el stack Docker completo original y utiliza `.env.docker`.

Si Docker funciona, primero inspecciona qué volúmenes existen; no ejecutes `up` a ciegas:

```powershell
docker volume ls
```

Si tu base `cv` está en `devfolio-local_postgres-data`, inicia solamente ese servicio con el archivo local:

```powershell
docker compose --env-file .env.local -f compose.local.yaml up -d db
```

Si tu base `cv` está en `devfolio_postgres-data`, prepara/valida `.env.docker` y utiliza el compose completo original:

```powershell
node scripts/setup-docker.mjs
docker compose --env-file .env.docker -f compose.yaml up -d db
```

En ambos casos, la contraseña y el usuario deben coincidir con los que inicializaron ese volumen. Si no sabes cuál contiene la base real, detente y comparte únicamente los nombres de `docker volume ls`; no inicies un volumen nuevo. No ejecutes `docker compose down -v`, no uses “Clean / Purge data” ni restablezcas Docker a valores de fábrica.

Si Docker Desktop/WSL no arranca, restaura primero ese motor; `npm run db:setup` no inicia Docker, solo verifica la conexión a la base `cv` y añade el esquema compatible.

## 3. Inicia el portafolio

```powershell
npm run dev
```

Abre: 

- CV público: http://localhost:3000
- Panel de administración: http://localhost:3000/admin
- Vista previa: http://localhost:3000/preview

Deja abierta la terminal mientras trabajas. Para iniciar con comprobación previa de DB: `npm run dev:postgres`.

## Funciones del panel

- Perfil: nombre, especialidad, descripción, ubicación, correo, teléfono, redes y disponibilidad.
- Imágenes: subir, sustituir, quitar y descargar foto de perfil, portada, fondos y recursos. Admite JPG, PNG, WebP y GIF animado de hasta 5 MB; los GIF se sirven con su MIME original para conservar la animación. Las imágenes se guardan en `media_assets`.
- CV: gestionar experiencia, proyectos, habilidades, formación, certificaciones e idiomas.
- Diseño: nueve colores editables con selector y HEX, cinco paletas prediseñadas, diseño clásico/minimalista/editorial, fondos sólidos, degradados o imagen, y animaciones suaves/flotantes/degradado. Respeta `prefers-reduced-motion` del navegador.
- Publicación: vista previa, guardado central y descarga PDF en `/api/cv`. La descarga también está disponible desde la barra del administrador. La portada del PDF permite elegir color HEX e imagen estática JPG/PNG; incluye la foto de perfil si está en JPG/PNG. El PDF es estático: las animaciones GIF se muestran en la web, pero no conservan movimiento dentro de un PDF.
- Mensajes: bandeja de formularios con estado leído/no leído y actualización automática.
- Chat: conversaciones persistentes, respuestas desde el administrador, estados abierta/cerrada, indicadores de mensajes no leídos y actualización periódica cada pocos segundos. El scroll se mantiene dentro del panel y solo se ajusta al recibir un mensaje nuevo cuando la persona ya estaba al final; no usa `scrollIntoView` durante el refresco periódico. El administrador puede eliminar una conversación individual (incluido su historial) después de confirmar la acción; no afecta las demás conversaciones.
- Notificaciones: el administrador puede activar avisos de escritorio y sonido desde el panel. El visitante también puede activar avisos de sonido y notificaciones para las respuestas del administrador desde el botón de campana del chat. El navegador exige una acción/permisos del usuario; los avisos funcionan mientras la página siga abierta. No se incluyen Web Push para navegador cerrado ni correo/SMS.
- Dispositivos y visitas: lista de sesiones recientes, tipo de equipo (PC, móvil o tablet), sistema operativo, navegador, modelo cuando el navegador lo facilita y ruta visitada. El administrador puede limpiar el registro de visitas sin borrar conversaciones. La ubicación por GPS solo se registra tras consentimiento explícito y se redondea a una zona aproximada. En producción se muestran ciudad/región si el proxy de alojamiento aporta cabeceras geográficas de confianza; alternativamente, se puede configurar `IPINFO_TOKEN` en el entorno del servidor para una geolocalización IP aproximada. La IP se usa solo para resolver la ubicación y no se almacena.

- Noticias: el administrador crea borradores y publica artículos con títulos, párrafos, citas, imágenes, GIF, galerías y vídeos incrustados de YouTube/Vimeo. Los tres artículos publicados más recientes aparecen también en una sección de la portada principal; el resto se consulta en `/noticias` y en cada página de artículo.

## Notificaciones de administrador

En cada nueva carga del panel pulsa **Activar avisos**. Ese gesto habilita el sonido de esta sesión y solicita permiso para notificaciones de escritorio si el navegador lo admite. Mientras el panel siga abierto en una pestaña del navegador (también en segundo plano, sujeto a la limitación de temporizadores del navegador), se consultan nuevos mensajes y chats y se muestran avisos gráficos, sonido y contadores.

Limitaciones del navegador: las notificaciones de escritorio requieren permiso y el panel abierto; este paquete no incluye todavía notificaciones push de servidor cuando el navegador está cerrado ni correo/SMS. Para eso habría que configurar un proveedor push o de correo con claves propias.

## Identificación del dispositivo y privacidad

El administrador ve etiquetas aproximadas como `PC Windows · Microsoft Edge`, `iPhone · Safari` o `Teléfono Android · Chrome`. Se infieren desde User-Agent y Client Hints. Algunos navegadores pueden facilitar un modelo; otros solo permiten identificar el tipo y sistema. Un sitio web no puede obtener la dirección MAC, número de serie ni el nombre privado del equipo y este proyecto no intenta eludir esas protecciones.

La ubicación puede venir de encabezados de un proxy de confianza (ciudad/región), de la geolocalización del navegador si el visitante acepta compartirla o de IPinfo si configuras `IPINFO_TOKEN` en el servidor. Para IPinfo, el hosting/proxy debe proporcionar una cabecera de IP de cliente fiable (`cf-connecting-ip`, `x-real-ip` o equivalente); configura el proxy para sobrescribir cabeceras entrantes y no confiar en valores arbitrarios enviados por el visitante. Las coordenadas se redondean aproximadamente a 1 km antes de enviarse. La IP se utiliza transitoriamente para resolver ciudad/región y no se almacena en la base. En HTTP de una IP LAN, el navegador normalmente bloquea la geolocalización; usa `localhost` o HTTPS para habilitar el consentimiento.

## Base de datos y compatibilidad

La aplicación usa tu base existente `cv`:

- `resumes`: documento JSONB del CV y su configuración visual.
- `media_assets`: imágenes subidas.
- `contact_messages`: mensajes del formulario.
- `chat_conversations` y `chat_messages`: conversaciones y mensajes.
- `site_visits`: visitas con dispositivo/navegador y ubicación aproximados.
- `news_articles`: noticias, bloques de contenido, imágenes, galerías y vídeos.

`npm run db:setup` usa `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` e índices idempotentes. No ejecuta `DROP`, `TRUNCATE` ni cambia la contraseña del usuario PostgreSQL. Antes de operar en una base con datos importantes, mantén un respaldo reciente. Ejemplo (ajusta host y usuario):

```powershell
pg_dump -h 127.0.0.1 -p 5432 -U postgres -d cv -Fc -f cv-backup.dump
```

## Seguridad antes de publicar

- Cambia las credenciales que hayan sido compartidas en chats o capturas.
- Usa un `ADMIN_PASSWORD` único de 16 caracteres o más y un `ADMIN_SESSION_SECRET` aleatorio de 48 caracteres o más.
- En producción, sirve el sitio detrás de HTTPS y configura `ADMIN_SECURE_COOKIE=true`.
- No expongas el puerto PostgreSQL a Internet; el Compose incluido lo vincula a loopback (`127.0.0.1`).
- Añade `.env.local`, `.env.docker`, el token `IPINFO_TOKEN` y los respaldos al control de acceso privado; nunca los publiques.

## Comprobaciones

```powershell
npm run typecheck
npm run lint
npm run build
```

La prueba de integración con la base real requiere que PostgreSQL esté activo y que `.env.local` contenga la URL y contraseña correctas.

## Verificación rápida del paquete

Después de instalar dependencias, puedes ejecutar una comprobación estática sin conectarte a PostgreSQL:

```powershell
npm run test:config
npm run typecheck
npm run lint
```

La compilación de producción se comprueba con `npm run build`. Para comprobar la integración real de la base de datos y el recorrido completo del chat/formularios, PostgreSQL debe estar iniciado y `.env.local` debe apuntar al servidor correcto.
