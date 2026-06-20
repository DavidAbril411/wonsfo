# Walkthrough - Implementación de wonsfo.com

¡El MVP del chat interactivo NSFW está completamente implementado, migrado y validado! Hemos construido la aplicación bajo la marca **wonsfo** siguiendo una arquitectura minimalista estilo Vercel/Linear y un flujo de desarrollo robusto basado en TypeScript.

---

## 1. Catálogo de Archivos Creados en `dev/wonsfo`

A continuación se listan los componentes clave que hemos desarrollado en la ruta de tu proyecto:

### Configuración y Base de Datos
*   **[supabase_schema.sql](file:///Users/davidabrilperrig/dev/wonsfo/supabase_schema.sql):** Esquema de tablas de base de datos (`profiles`, `characters`, `chats`, `chat_messages`) habilitando pgvector y la función de búsqueda de similitud semántica.

### Backend y Lógica de Negocio (TypeScript)
*   **[src/lib/supabase.ts](file:///Users/davidabrilperrig/dev/wonsfo/src/lib/supabase.ts):** Inicialización de clientes Supabase (público y administrador/bypass RLS).
*   **[src/lib/climax-engine.ts](file:///Users/davidabrilperrig/dev/wonsfo/src/lib/climax-engine.ts):** Algoritmo de puntuación híbrida de intimidad (Keywords + Similitud del coseno contra vectores ancla).
*   **[src/lib/dialect-engine.ts](file:///Users/davidabrilperrig/dev/wonsfo/src/lib/dialect-engine.ts):** Reemplazos léxicos con expresiones regulares en español para localismos (Argentina, España, México, Colombia) y reescritura sutil con Dolphin 24B.

### Rutas de API (Next.js Routes)
*   **[src/app/api/chat/stream/route.ts](file:///Users/davidabrilperrig/dev/wonsfo/src/app/api/chat/stream/route.ts):** Orquestador de streaming SSE con OpenRouter. Realiza comprobaciones de seguridad de Supabase Auth, acumula la puntuación del clímax, intercepta con un Paywall Cliffhanger (si es Free) y aplica el motor de dialecto local en caliente.
*   **[src/app/api/media/upload/route.ts](file:///Users/davidabrilperrig/dev/wonsfo/src/app/api/media/upload/route.ts):** Endpoint de carga de avatares a **Cloudinary** con un fallback automático a imágenes mockup en desarrollo local si las credenciales no están presentes.

### Frontend (Páginas e Interfaces)
*   **[src/components/Header.tsx](file:///Users/davidabrilperrig/dev/wonsfo/src/components/Header.tsx):** Barra de navegación con logo, enlaces de navegación, control de sesión de Supabase Auth y indicador visual del estado Premium (FREE vs PREMIUM).
*   **[src/app/layout.tsx](file:///Users/davidabrilperrig/dev/wonsfo/src/app/layout.tsx):** Layout con fuentes de sistema Geist, fondo negro y el Header global.
*   **[src/app/globals.css](file:///Users/davidabrilperrig/dev/wonsfo/src/app/globals.css):** Hoja de estilos con variables de color monocromáticas e importación de Tailwind v4.
*   **[src/app/login/page.tsx](file:///Users/davidabrilperrig/dev/wonsfo/src/app/login/page.tsx):** Pantalla de acceso y registro integrado con Supabase Auth o equivalente.
*   **[src/app/page.tsx](file:///Users/davidabrilperrig/dev/wonsfo/src/app/page.tsx):** Dashboard principal que lista agentes y crea automáticamente los personajes iniciales por defecto (Elena, Valeria y Sofía) en la base de datos si está vacía.
*   **[src/app/profile/page.tsx](file:///Users/davidabrilperrig/dev/wonsfo/src/app/profile/page.tsx):** Configuración de perfil y **Toggle de Simulación Premium** que actualiza el flag `is_premium` para pruebas de desarrollo.
*   **[src/app/create/page.tsx](file:///Users/davidabrilperrig/dev/wonsfo/src/app/create/page.tsx):** Formulario para crear un nuevo agente con parámetros de dialecto, velocidad de clímax y carga de avatares en Cloudinary.
*   **[src/app/chat/\[id\]/page.tsx](file:///Users/davidabrilperrig/dev/wonsfo/src/app/chat/%5Bid%5D/page.tsx):** Pantalla de chat interactiva con lector de streams en tiempo real, selector de modelos premium (gpt-oss-120b, Euryale, Cydonia) y renderizado de acciones de roleplay en cursiva (`*acción*`).

### CI/CD e Integración Continua
*   **[.github/workflows/nextjs_build.yml](file:///Users/davidabrilperrig/dev/wonsfo/.github/workflows/nextjs_build.yml):** Automatización de pruebas unitarias (`test_engines.ts`), análisis de TypeScript y Next.js build en GitHub Actions en cada push.

---

## 2. Pruebas y Validación Realizadas

1.  **Pruebas Unitarias de Motores:** 
    *   Ejecutamos el script **[test_engines.ts](file:///Users/davidabrilperrig/dev/wonsfo/test_engines.ts)** el cual verificó con éxito los límites de puntuación del clímax semántico y la reescritura de voseo argentino y localismos españoles.
2.  **Prueba de Compilación de Producción:**
    *   Ejecutamos exitosamente `npm run build` en el directorio del proyecto, asegurándonos de que no existen errores de sintaxis, dependencias faltantes ni fallos de tipado de TypeScript.

---

## 3. Guía de Base de Datos Local vs Supabase

Puedes optar por una de las siguientes dos configuraciones para tu base de datos:

### Opción A: Supabase Autohospedado en Docker (Recomendado)
Dado que tu servidor VPS de Oracle (`oracle-cappy`) cuenta con **24 GB de RAM** y más de **150 GB de espacio SSD libre**, puedes hospedar tu propia instancia de Supabase de manera local y gratuita.
1.  Sigue la guía oficial de Supabase Self-Hosting clonando su docker-compose:
    ```bash
    git clone --depth 1 https://github.com/supabase/supabase.git
    cd supabase/docker
    cp .env.example .env
    # Genera tus claves JWT y contraseñas seguras en .env
    docker-compose up -d
    ```
2.  Esto levantará el Auth, base de datos Postgres con pgvector, Storage local y APIs. No tendrás que modificar una sola línea de tu código Next.js, solo apuntar las URLs a tu servidor local (`http://146.181.52.67:8000`).

### Opción B: Contenedor PostgreSQL + pgvector Independiente
Si deseas una base de datos más minimalista y ligera en el VPS:
1.  Levanta un contenedor Postgres con pgvector incorporado:
    ```bash
    docker run -d \
      --name wonsfo-db \
      -e POSTGRES_PASSWORD=tu_clave_segura \
      -e POSTGRES_DB=wonsfo \
      -p 5432:5432 \
      pgvector/pgvector:pg16
    ```
2.  Ejecuta el archivo **[supabase_schema.sql](file:///Users/davidabrilperrig/dev/wonsfo/supabase_schema.sql)** conectándote a ese puerto para crear las tablas.
3.  *Nota de autenticación:* Para utilizar Supabase Auth, aún puedes usar una cuenta en Supabase Cloud gratuita como gestor de usuarios exclusivamente, mientras tu Next.js apunta al PostgreSQL local de tu servidor para el almacenamiento pesado de mensajes y embeddings vectoriales.
