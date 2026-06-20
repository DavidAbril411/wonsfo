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

### C. Proxy Nginx (Host)
*   Creamos el archivo `/srv/nginx/conf.d/wonsfo.conf` para dirigir el tráfico de los dominios `wonsfo.com` y `www.wonsfo.com` hacia el puerto `3000` de la aplicación.
*   **Siguiente paso (SSL):** Una vez que los DNS de `wonsfo.com` apunten a la IP pública del servidor VPS (`146.181.52.67`), puedes obtener y habilitar los certificados HTTPS de Let's Encrypt ejecutando en la consola de la VPS:
    ```bash
    sudo certbot --nginx -d wonsfo.com -d www.wonsfo.com
    ```

