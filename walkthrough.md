# Walkthrough - Implementación de cappy-nsfw

¡El MVP del chat interactivo NSFW está completamente implementado y validado! Hemos construido la aplicación siguiendo una arquitectura minimalista estilo Vercel/Linear y un flujo de desarrollo robusto basado en TypeScript.

---

## 1. Catálogo de Archivos Creados

A continuación se listan los componentes clave que hemos desarrollado en la ruta de tu proyecto:

### Configuración y Base de Datos
*   **[supabase_schema.sql](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/supabase_schema.sql):** Esquema de tablas de Supabase (`profiles`, `characters`, `chats`, `chat_messages`) habilitando pgvector y la función de búsqueda de similitud semántica.

### Backend y Lógica de Negocio (TypeScript)
*   **[src/lib/supabase.ts](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/src/lib/supabase.ts):** Inicialización de clientes Supabase (público y administrador/bypass RLS).
*   **[src/lib/climax-engine.ts](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/src/lib/climax-engine.ts):** Algoritmo de puntuación híbrida de intimidad (Keywords + Similitud del coseno contra vectores ancla).
*   **[src/lib/dialect-engine.ts](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/src/lib/dialect-engine.ts):** Reemplazos léxicos con expresiones regulares en español para localismos (Argentina, España, México, Colombia) y reescritura sutil con Dolphin 24B.

### Rutas de API (Next.js Routes)
*   **[src/app/api/chat/stream/route.ts](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/src/app/api/chat/stream/route.ts):** Orquestador de streaming SSE con OpenRouter. Realiza comprobaciones de seguridad de Supabase Auth, acumula la puntuación del clímax, intercepta con un Paywall Cliffhanger (si es Free) y aplica el motor de dialecto local en caliente.
*   **[src/app/api/media/upload/route.ts](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/src/app/api/media/upload/route.ts):** Endpoint de carga de avatares a **Cloudinary** con un fallback automático a imágenes mockup en desarrollo local si las credenciales no están presentes.

### Frontend (Páginas e Interfaces)
*   **[src/components/Header.tsx](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/src/components/Header.tsx):** Barra de navegación con logo, enlaces de navegación, control de sesión de Supabase Auth y indicador visual del estado Premium (FREE vs PREMIUM).
*   **[src/app/layout.tsx](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/src/app/layout.tsx):** Layout con fuentes de sistema Geist, fondo negro y el Header global.
*   **[src/app/globals.css](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/src/app/globals.css):** Hoja de estilos con variables de color monocromáticas e importación de Tailwind v4.
*   **[src/app/login/page.tsx](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/src/app/login/page.tsx):** Pantalla de acceso y registro integrado con Supabase Auth.
*   **[src/app/page.tsx](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/src/app/page.tsx):** Dashboard principal que lista agentes y crea automáticamente los personajes iniciales por defecto (Elena, Valeria y Sofía) en la base de datos si está vacía.
*   **[src/app/profile/page.tsx](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/src/app/profile/page.tsx):** Configuración de perfil y **Toggle de Simulación Premium** que actualiza el flag `is_premium` para pruebas de desarrollo.
*   **[src/app/create/page.tsx](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/src/app/create/page.tsx):** Formulario para crear un nuevo agente con parámetros de dialecto, velocidad de clímax y carga de avatares en Cloudinary.
*   **[src/app/chat/\[id\]/page.tsx](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/src/app/chat/%5Bid%5D/page.tsx):** Pantalla de chat interactiva con lector de streams en tiempo real, selector de modelos premium (gpt-oss-120b, Euryale, Cydonia) y renderizado de acciones de roleplay en cursiva (`*acción*`).

---

## 2. Pruebas y Validación Realizadas

1.  **Pruebas Unitarias de Motores:** 
    *   Ejecutamos el script **[test_engines.ts](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/test_engines.ts)** el cual verificó con éxito los límites de puntuación del clímax semántico y la reescritura de voseo argentino y localismos españoles.
2.  **Prueba de Compilación de Producción:**
    *   Ejecutamos exitosamente `npm run build` en el directorio del proyecto, asegurándonos de que no existen errores de sintaxis, dependencias faltantes ni fallos de tipado de TypeScript.

---

## 3. Instrucciones de Configuración Local

Para correr el proyecto en tu máquina, sigue estos pasos:

### Paso 1: Configurar Variables de Entorno
Crea un archivo `.env.local` en la raíz de tu proyecto (`/Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/.env.local`) y añade las credenciales:

```text
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima-publica
SUPABASE_SERVICE_ROLE_KEY=tu-clave-de-servicio-privada
OPENROUTER_API_KEY=tu-clave-de-openrouter

# Opcional (Si deseas habilitar subida real en Cloudinary)
CLOUDINARY_CLOUD_NAME=tu-cloudinary-name
CLOUDINARY_API_KEY=tu-cloudinary-key
CLOUDINARY_API_SECRET=tu-cloudinary-secret
```

### Paso 2: Crear el Esquema de Base de Datos
1.  Ingresa a tu consola de Supabase.
2.  Abre el editor SQL (SQL Editor).
3.  Copia todo el contenido de **[supabase_schema.sql](file:///Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw/supabase_schema.sql)**, pégalo en el editor y presiona **Run**. Esto creará las tablas, políticas de RLS, triggers de creación de perfiles y la función de búsqueda RAG.

### Paso 3: Iniciar el Servidor de Desarrollo
Abre tu terminal, navega al directorio del proyecto y arranca la aplicación:

```bash
cd /Users/davidabrilperrig/.gemini/antigravity/scratch/cappy-nsfw
npm run dev
```

La aplicación estará lista en **[http://localhost:3000](http://localhost:3000)**.

---

## 4. Despliegue en VPS de Oracle Cloud (`oracle-cappy`)

Hemos completado el despliegue del ecosistema completo de **wonsfo** en tu servidor VPS de Oracle Cloud utilizando contenedores Docker para garantizar la estabilidad y aislamiento del software.

### A. Infraestructura de Supabase Local (Docker)
Para evitar el uso de planes en la nube de Supabase, levantamos una instancia de Supabase self-hosted en `/srv/supabase-self-hosted/docker`:
*   **Ajuste de Puertos:** Modificamos la configuración para mapear `POSTGRES_PORT` a `5435` en lugar del puerto por defecto `5432` (para evitar conflictos con el contenedor existente `repo-db-1`).
*   **Estado:** Todos los servicios de Supabase (Database, Auth, Kong, Rest, Realtime, Storage) están levantados y saludables.
*   **Migraciones:** Aplicamos el esquema relacional y de embeddings de **`supabase_schema.sql`** directamente dentro del contenedor `supabase-db` de forma automática.

### B. Contenedorización y Ejecución de Next.js (wonsfo-web)
*   **Dockerfile de Producción:** Creamos un build multi-stage optimizado utilizando `node:20-alpine` para compilar Next.js con salida `standalone` (lo que reduce drásticamente el tamaño de la imagen resultante).
*   **Docker Compose:** Definimos `/srv/wonsfo/docker-compose.yml` para levantar la aplicación en el puerto `3000` de forma persistente (`restart: always`), mapeando el archivo `.env.local` con las credenciales de base de datos local, OpenRouter y Cloudinary.
*   **Estado:** El contenedor `wonsfo-web` se encuentra activo y respondiendo exitosamente (retorna HTTP 200).

### C. Proxy Nginx & Let's Encrypt (Host)
*   Creamos el archivo `/srv/nginx/conf.d/wonsfo.conf` para dirigir el tráfico de los dominios `wonsfo.com` y `www.wonsfo.com` hacia el puerto `3000` de la aplicación.
*   **Certificado SSL Activo:** Como los DNS ya propagaron a la IP del VPS, ejecutamos con éxito Certbot para obtener y habilitar los certificados HTTPS de Let's Encrypt, forzando la redirección de todo el tráfico HTTP a HTTPS de forma automática.
*   **Estado HTTPS:** Activo y respondiendo de forma segura en **`https://wonsfo.com`** y **`https://www.wonsfo.com`**.

---

## 5. Verificación de Email e Integración de Código de Confirmación (OTP)

Para evitar registros masivos de cuentas ficticias, implementamos y validamos la verificación de correo electrónico:

### A. Proveedor SMTP (Resend)
*   Se configuró el dominio `wonsfo.com` en Resend añadiendo los registros DNS TXT (SPF/DKIM).
*   Se actualizaron las credenciales SMTP en el `.env` de Supabase en la VPS (`GOTRUE_SMTP_HOST=smtp.resend.com`, `GOTRUE_MAILER_AUTOCONFIRM=false`, etc.) y se recreó el contenedor `supabase-auth`.

### B. Enrutamiento en Nginx (Solución al Error 404 del Enlace)
*   **Problema:** GoTrue genera enlaces con la estructura `/auth/v1/verify?token=...`. Al no existir esta ruta en Next.js, Nginx redirigía el tráfico al frontend, arrojando un 404.
*   **Solución:** Modificamos `/srv/nginx/conf.d/wonsfo.conf` en la VPS para interceptar las rutas `/auth/` y mandarlas directamente al Gateway de Supabase (puerto 8000):
    ```nginx
    location ~ ^/auth/(.*)$ {
        include /srv/nginx/snippets/proxy-common.conf;
        proxy_pass http://127.0.0.1:8000/auth/$1$is_args$args;
    }
    ```
*   **Resultado:** Los clics en los enlaces de verificación del email se validan correctamente por Supabase y redirigen automáticamente de vuelta al usuario autenticado.

### C. Entrada Directa del Código de Confirmación (OTP) en el Frontend
*   **Mejora:** Modificamos `src/app/login/page.tsx` para agregar una pantalla dedicada a ingresar el **código de 6 dígitos** (OTP) recibido en el email.
*   **Flujo:**
    1.  Al registrarse, el usuario es guiado automáticamente a la pantalla de verificación OTP.
    2.  Si el usuario ya se había registrado pero no completó la verificación, puede hacer clic en *"Ingresa tu código de 6 dígitos aquí"* desde la pantalla de login.
    3.  El usuario puede volver a solicitar el reenvío del código haciendo clic en *"Reenviar código"*.
    4.  Una vez ingresado el código correcto, el sistema autentica la cuenta mediante `supabase.auth.verifyOtp` y redirige al dashboard.

---

## 6. Implementación de Estrategia SEO Profesional

Para maximizar el tráfico orgánico, habilitamos la indexación inteligente de personajes sin requerir inicio de sesión:

### A. Base de Datos RLS
*   Modificamos la política RLS en la VPS para la tabla `characters` permitiendo consultas `SELECT` públicas (`USING (true)`). Esto posibilita que el Sitemap y los robots de búsqueda recopilen los datos de personajes de forma directa.

### B. Robots.txt (`src/app/robots.ts`)
*   Se configuraron las reglas de rastreo permitiendo indexar la Home (`/`), la pantalla de login (`/login`) y las fichas técnicas (`/char/*`), bloqueando caminos privados de aplicación (`/chat/*`, `/profile`, `/create`, `/api/*`).

### C. Sitemap XML Dinámico (`src/app/sitemap.ts`)
*   Implementamos un generador de sitemaps dinámicos que lee todos los personajes creados en Supabase cada hora y publica sus enlaces `/char/[id]` con prioridad de rastreo `0.8` de forma automática.

### D. Ficha Técnica del Personaje para Indexación (`src/app/char/[id]/page.tsx`)
*   Creamos una landing page por personaje renderizada en el servidor (SSR).
*   **Metadatos dinámicos:** Títulos y descripciones SEO personalizados basados en el personaje e imágenes del avatar para OpenGraph/Twitter Cards.
*   **Datos estructurados:** Inyección de esquemas JSON-LD (`SoftwareApplication` / `GameApplication`) para que buscadores muestren resultados enriquecidos de la IA.
*   **Experiencia:** Los no autenticados ven la información y un CTA de *"Iniciar Chat de Rol Gratis"*. Al hacer click, la página intermedia `/chat-redirect` los guía a iniciar sesión e inicia la conversación automáticamente al loguearse.

### E. Modificaciones de Home y Flujo de Autenticación
*   La Home (`/`) ahora lista públicamente los personajes disponibles sin redirigir a `/login`.
*   La página `/login` ahora detecta redirecciones de intención (con el parámetro `characterId`) para guiar al usuario logueado o verificado directamente al chat deseado, optimizando la tasa de conversión de registro.




