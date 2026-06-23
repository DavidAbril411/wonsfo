# Walkthrough - Asistente de Creación Premium con Imagen IA (Pollinations) y Pacing Lento (Fase 3)

¡Hemos completado y desplegado con éxito todas las especificaciones para el Asistente de Creación de Personajes Premium y las mejoras en la lógica de generación del chat! La nueva funcionalidad se encuentra activa y funcional en producción en [wonsfo.com](https://wonsfo.com).

---

## 1. Cambios Realizados y Nueva Funcionalidad

### A. Asistente de Creación Premium de 6 Pasos (`src/app/create/page.tsx`)
Reescribimos la página del wizard `/create` estructurándola en 6 pasos interactivos protegidos por verificación Premium (los usuarios gratuitos verán un banner interactivo que los invita a activar Premium en su perfil):
*   **Paso 0 (Inicial):** Selección interactiva de **Género** (Mujer, Hombre, Trans) y **Estilo Visual** (Real fotorrealista, Anime ilustración).
*   **Paso 1 (Identidad):** Entrada de texto libre para el **Nombre** del personaje y selección de **Relación** (Novia/o, Madrastra/Padrastro, Jefa/Jefe, Amiga/o, Vecina/o, Ninguna).
*   **Paso 2 (Rasgos Físicos):** Selección de Edad, Complexión (adaptada al género seleccionado), color de ojos, color de cabello (incluyendo Rosa, Plateado y Azul), Tono de Piel y **Etnia** (Caucásica, Latina, Asiática, Africana, Árabe, Mixta).
*   **Paso 3 (Personalidad y Contexto):** Selector de comportamiento dominante (Seductora, Sumisa, Fría, Rebelde) y un **campo de texto libre para el Contexto o Profesión** (ej: "Es enfermera y nos conocemos de noche en su consultorio").
*   **Paso 4 (Acento y Saludo):** Selector de acento regional (Neutro, Argentina, España, México, Colombia) y opción de elegir tipo de saludo: **Autogenerado con IA** o **Escribir mi propio mensaje** (que despliega una caja de texto libre para escribir el mensaje inicial).
*   **Paso 5 (Resumen y Generación):** Ficha técnica con el resumen completo de los rasgos seleccionados y botón de generación integrado con animaciones neón de carga.

### B. API de Generación de Personaje con Traducción de Contexto (`src/app/api/character/generate/route.ts`)
Ampliamos el endpoint `/api/character/generate` para soportar las nuevas variables del wizard:
1.  **Traducción del Contexto a Inglés via LLM:** La API realiza una llamada a OpenRouter (`google/gemini-2.5-flash`) en la cual, además de redactar la biografía e historia inmersiva del personaje, traduce el contexto escrito por el usuario en español a una frase corta de 3-5 palabras en inglés (bajo la propiedad `clothing_and_setting_en`), definiendo la ropa y escenario adecuados.
2.  **Prompt de Imagen Dinámico de Cuerpo Completo:**
    *   Si el estilo es **Anime**: Genera prompts con directivas de diseño de ilustración 2D como `sensual anime style illustration, 2d digital art, high quality anime artwork, masterpiece...` y usa el modelo de Pollinations `flux`.
    *   Si el estilo es **Real**: Diseña una fotografía fotorrealista en formato medio/cuerpo completo `knee-up full body shot of a beautiful [age] years old woman standing...` y utiliza el modelo `flux-realism`.
    *   Adaptación de género: Mapea correctamente si es `man`, `woman` o `transgender woman` (o `transgender man`).
    *   Forzado de directivas explícitas: Inyecta el parámetro `safe=false` a la API de Pollinations.ai para evitar filtros en avatares sugestivos.
3.  **Saludo Manual:** Si el usuario seleccionó escribir su propio saludo, la API omite la redacción del saludo de la IA y registra directamente en Supabase el texto ingresado por el usuario.

---

## 2. Reemplazo del Modelo Censurado GPT-OSS por Skyfall 36B V2 (Fase 5.3)

* **Diagnóstico del Rechazo de Seguridad:**
  * El modelo `openai/gpt-oss-120b` (anteriormente ofrecido como opción Premium "Inteligencia") presentaba directrices de seguridad muy restrictivas heredadas de la alineación de OpenAI, lo cual resultaba en respuestas de rechazo ("Lo siento, pero no puedo ayudar con eso") al entrar en temáticas eróticas o íntimas explícitas.
* **Soluciones y Reemplazos:**
  1. **Remoción de la Interfaz:** Reemplazamos la opción de `openai/gpt-oss-120b` por `thedrummer/skyfall-36b-v2` (Skyfall 36B V2 - "Creativo") en la vista del chat (`src/app/chat/[id]/page.tsx`).
  2. **Migración Transparente:** Agregamos una verificación automática al cargar el chat que detecta si el modelo seleccionado anteriormente era `openai/gpt-oss-120b`, actualizándolo inmediatamente en el localStorage y en la base de datos Supabase a `thedrummer/skyfall-36b-v2` para no interrumpir las conversaciones activas.
  3. **Mapeo en Backend:** Actualizamos el backend de streaming (`src/app/api/chat/stream/route.ts`) para redirigir cualquier llamada que solicite `openai/gpt-oss-120b` directamente a `thedrummer/skyfall-36b-v2`.
  4. **Modificación de Textos de Perfil:** Ajustamos las descripciones de la cuenta Premium en `/profile` para reflejar el nuevo catálogo de modelos.

---

## 3. Lógica de Ritmo Dinámico y Mitigación del Enojo Persistente (Fase 5.4)

* **Diagnóstico de Bloqueo de Pacing (Enojo Perpetuo):**
  * La directiva de "Persistencia del Enojo" exigía de forma absoluta que la IA permanezca distante e indignada tras un avance prematuro, pero no definía un mecanismo de superación o perdón. Esto provocaba que, incluso después de disculparse y avanzar muchos mensajes, la IA continuara fría y defensiva.
* **Soluciones Narrativas y Mecánicas:**
  1. **Instrucción de Perdón y Receptividad:** Actualizamos las reglas del prompt en `route.ts` para indicarle a la IA de manera explícita que, si el usuario se disculpa y continúa insistiendo educadamente durante más de 3 o 4 mensajes, debe empezar a ablandar su postura de forma progresiva, volviéndose más receptiva y facilitando la reconciliación.
  2. **Directivas Dinámicas por Etapa:** Inyectamos dinámicamente en el prompt del sistema la etapa actual de la conversación según la cantidad de mensajes (`messageCount`):
     * **Etapa Inicial (< 10 mensajes):** Límites firmes, resistencia a insinuaciones precipitadas.
     * **Etapa Intermedia (10 a 20 mensajes):** Complicidad moderada y coqueteo sutil si hay respeto.
     * **Etapa Avanzada (>= 20 mensajes):** Confianza plena construida; alta receptividad, actitud coqueta y atrevida para facilitar la intimidad física.
  3. **Escalamiento de Puntuación de Clímax (`climax-engine.ts`):** Rediseñamos el motor de puntuación para que se adapte al estado de la relación:
     * **Fase Temprana (< 10):** Penalización estricta del 90% en palabras/acciones físicas (multiplicador 0.1x) para evitar avances inmediatos.
     * **Fase Intermedia (< 20):** Penalización moderada del 50% (multiplicador 0.5x).
     * **Fase Avanzada (>= 20):** Impulso e incremento del 50% (multiplicador 1.5x) para palabras físicas y 30% (1.3x) para términos íntimos tradicionales, facilitando que el usuario alcance el clímax narrativo rápidamente una vez establecida la confianza.

---

## 4. Personalización del Usuario: Nombre y Género en los Chats (Fase 5.5)

* **Nuevos Campos en el Perfil y Registro:**
  * Modificamos la tabla de `public.profiles` en la base de datos Supabase para agregar las columnas `display_name` (Nombre Real) y `gender` (Género).
  * **Pantalla de Registro (`src/app/login/page.tsx`):** Añadimos controles dinámicos para que, al activar la pestaña de "Registrarse", el usuario pueda ingresar su nombre real y su género (Hombre, Mujer, Trans) desde el formulario inicial.
  * **Pantalla de Perfil (`src/app/profile/page.tsx`):** Agregamos los inputs correspondientes para que los usuarios puedan consultar y editar su nombre real y género en cualquier momento de forma segura.
  * **Trigger de Creación (`supabase_schema.sql`):** Modificamos la función del trigger PostgreSQL `handle_new_user()` para extraer e insertar el `display_name` y `gender` desde la metadata cruda de registro de Supabase Auth (`new.raw_user_meta_data`).
* **Integración y Personalización del Chat:**
  * Actualizamos el endpoint `/api/chat/stream/route.ts` para recuperar el nombre real y género del usuario.
  * **Instrucciones en Prompt:** Inyectamos una sección de metadatos del usuario al prompt principal de OpenRouter:
    * Se le ordena estrictamente dirigirse al usuario por su nombre real (`display_name`) en los momentos adecuados de los diálogos.
    * Se le indica el género del usuario (`gender`) mapeando de forma explícita las reglas gramaticales y adjetivos según corresponda (adjetivos masculinos para Hombre, femeninos para Mujer, etc.) para adaptar pronombres y diálogos de forma impecable.

---

## 5. Mejora de Calidad Visual de Escenas: Migración a Modelos FLUX (Fase 5.6)

* **Diagnóstico de Deformidad Visual:**
  * El modelo anterior de escenas (`seedream5`) tendía a deformar los rostros y manos de los personajes al procesar las transformaciones de imagen de referencia (`image-to-image`) en planos intermedios o con luz difusa.
* **Soluciones y Mejoras de Renderizado:**
  1. **Actualización de Modelos:** Reemplazamos `seedream5` en el endpoint de escenas (`/api/character/generate-scene/route.ts`) por los modelos de vanguardia de Pollinations AI: **`flux`** (para personajes en estilo Anime/Ilustración) y **`flux-realism`** (para personajes en estilo Real/Fotorrealista). Estos modelos son reconocidos por su altísima fidelidad anatómica, calidad de texturas de piel y realismo en rostros.
  2. **Inyección de Imagen de Referencia en Prompt:** Para conservar la coherencia física del personaje (rostro, rasgos, ropa y cabello) sin depender exclusivamente del parámetro de imagen, añadimos la instrucción `Character face reference: [avatar_url]` al inicio de los prompts de texto de Pollinations, reforzando la similitud visual con el avatar de perfil.

---

## 6. Tolerancia a Fallos e Inferencia Ininterrumpida: Cascada de Fallback de Modelos (Fase 5.7)

* **Diagnóstico del Error Upstream 429:**
  * Al intentar editar o regenerar, OpenRouter reportaba un error `429 Rate Limited` en el modelo principal (`sao10k/l3.3-euryale-70b`) de su proveedor aguas arriba (NextBit). Dado que la API Route anterior no realizaba ningún manejo de errores, esto colapsaba la petición y resultaba en un error `502 Bad Gateway` en el frontend, bloqueando la conversación.
* **Manejo de Errores y Fallback en Cascada:**
  * Implementamos un sistema de reintentos automático y transparente en `/api/chat/stream/route.ts`:
    1. **Primer Intento (Modelo Principal):** Lanza la petición al modelo elegido por el usuario (ej: `sao10k/l3.3-euryale-70b`).
    2. **Segundo Intento (Primer Fallback):** Si OpenRouter retorna un error (como código 429, 503 o 400), interceptamos la respuesta, emitimos una advertencia en el servidor y re-lanzamos la petición inmediatamente a **`thedrummer/cydonia-24b-v4.1`** (o a `thedrummer/skyfall-36b-v2` si el original era Cydonia).
    3. **Tercer Intento (Último Recurso):** Si el primer fallback también falla, el sistema realiza un último reintento utilizando el modelo gratuito y de alta tolerancia **`cognitivecomputations/dolphin-mistral-24b-venice-edition:free`**, asegurando que el flujo de streaming al usuario nunca se interrumpa.

---

## 4. Personalización del Usuario: Nombre y Género en los Chats (Fase 5.5)

* **Nuevos Campos en el Perfil y Registro:**
  * Modificamos la tabla de `public.profiles` en la base de datos Supabase para agregar las columnas `display_name` (Nombre Real) y `gender` (Género).
  * **Pantalla de Registro (`src/app/login/page.tsx`):** Añadimos controles dinámicos para que, al activar la pestaña de "Registrarse", el usuario pueda ingresar su nombre real y su género (Hombre, Mujer, Trans) desde el formulario inicial.
  * **Pantalla de Perfil (`src/app/profile/page.tsx`):** Agregamos los inputs correspondientes para que los usuarios puedan consultar y editar su nombre real y género en cualquier momento de forma segura.
  * **Trigger de Creación (`supabase_schema.sql`):** Modificamos la función del trigger PostgreSQL `handle_new_user()` para extraer e insertar el `display_name` y `gender` desde la metadata cruda de registro de Supabase Auth (`new.raw_user_meta_data`).
* **Integración y Personalización del Chat:**
  * Actualizamos el endpoint `/api/chat/stream/route.ts` para recuperar el nombre real y género del usuario.
  * **Instrucciones en Prompt:** Inyectamos una sección de metadatos del usuario al prompt principal de OpenRouter:
    * Se le ordena estrictamente dirigirse al usuario por su nombre real (`display_name`) en los momentos adecuados de los diálogos.
    * Se le indica el género del usuario (`gender`) mapeando de forma explícita las reglas gramaticales y adjetivos según corresponda (adjetivos masculinos para Hombre, femeninos para Mujer, etc.) para adaptar pronombres y diálogos de forma impecable.

---

## 3. Verificación y Resultados de Compilación

1.  **Compilación TypeScript y Next.js (Local):**
    Ejecutamos `npm run build` confirmando que Next.js compile todas las páginas estáticas y dinámicas y exporte el compilado standalone sin fallos de tipos o de Turbopack.
2.  **Sincronización:**
    Subimos los cambios a la rama `main` de GitHub y los sincronizamos a la VPS de Oracle (`oracle-cappy`) mediante `rsync` omitiendo directorios locales temporales y dependencias.
3.  **Docker Rebuild (VPS):**
    Ejecutamos la reconstrucción y el reinicio de la imagen Docker en la VPS mediante `docker compose up -d --build`, recreando exitosamente el contenedor `wonsfo-web` con la nueva versión del asistente y la API de generación en caliente.

El proyecto ya está sirviendo y procesando las peticiones correctamente en **`https://wonsfo.com`**.
