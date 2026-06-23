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
* **Manejo de Errores y Fallback en Cascada con Resiliencia Completa:**
  * Implementamos un sistema de reintentos automático y transparente en `/api/chat/stream/route.ts`:
    1. **Primer Intento (Modelo Principal):** Lanza la petición al modelo elegido por el usuario (ej: `sao10k/l3.3-euryale-70b`).
    2. **Segundo Intento (Primer Fallback):** Si OpenRouter retorna un error (como código 429, 503 o 400), o si ocurre una excepción de red/DNS en el servidor, interceptamos el error y re-lanzamos la petición inmediatamente a **`thedrummer/cydonia-24b-v4.1`** (o a `thedrummer/skyfall-36b-v2` si el original era Cydonia).
    3. **Tercer Intento (Último Recurso):** Si el primer fallback también falla, el sistema realiza un último reintento utilizando el modelo gratuito y de alta tolerancia **`cognitivecomputations/dolphin-mistral-24b-venice-edition:free`**, asegurando que el flujo de streaming al usuario nunca se interrumpa.
  * **Exclusiones de Red:** Cada llamada de fetch en la cascada de fallbacks fue envuelta en bloques `try-catch` para capturar timeouts y excepciones de conexión, evitando excepciones fatales de servidor.
* **Sincronización Robusta en el Cliente y Prevención de Desincronización de UI:**
  * En la vista de chat (`src/app/chat/[id]/page.tsx`), consolidamos las consultas duplicadas para recargar el historial de mensajes de la base de datos en una función centralizada `syncMessagesFromDB()`.
  * Invocamos `syncMessagesFromDB()` en los bloques `catch` de `handleSendMessage`, `saveEditedMessage`, y `handleRegenerate` tras alertar del fallo de conexión. De esta forma, si el streaming de la IA falla, la interfaz carga el estado real de PostgreSQL, evitando que los mensajes queden colgados con IDs temporales o que la interfaz se desincronice.

---

## 7. Mejoras de Imágenes de Escena Explícitas y Corrección de Anatomía (Fase 5.8)

* **Diagnóstico de Censura de Ropa y Deformidades:**
  * **Censura de ropa:** Cuando los personajes declaraban estar sin ropa/desnudos en el juego de rol, las imágenes generadas seguían mostrando ropa. Esto se debía a dos factores:
    1. El modelo de descripción de escenas (`google/gemini-2.5-flash`) es altamente filtrado y censuraba o evitaba escribir términos de desnudez explícitos en el prompt traducido.
    2. El parámetro `&image=...` de Pollinations activaba la generación por imagen de referencia (img2img). Dado que el avatar original del personaje siempre tiene ropa, el rediseño mantenía la presencia de vestimenta.
  * **Deformidades corporales (4 brazos):** img2img forzaba la silueta y postura vertical del avatar en poses dinámicas (como acostada en cama o sentada), haciendo que la IA deformara los brazos y piernas del personaje para tratar de cumplir ambas condiciones a la vez.
* **Soluciones Técnicas Aplicadas:**
  1. **Modelo Unfiltered para Escenas:** Migramos el modelo de traducción/resumen en `/api/character/generate-scene/route.ts` al modelo libre **`cognitivecomputations/dolphin-mistral-24b-venice-edition:free`** de OpenRouter. Esto garantiza que no haya filtros al procesar textos de rol eróticos o íntimos explícitos.
  2. **Compatibilidad en Texto Plano:** Modificamos la respuesta de la traducción a texto plano libre (sin forzar modo JSON en la API) para evitar bloqueos y simplificar el análisis del contenido generado.
  3. **Instrucciones Literales de Desnudez:** El prompt instruye específicamente que si la escena describe desnudez o relaciones sexuales, se describa en inglés como `completely naked`, `fully nude`, `bare skin`, etc.
  4. **Keywords de Calidad NSFW:** Si el texto describe desnudez, inyectamos palabras clave de control de alta definición (`explicit nsfw, uncensored, detailed skin, highly detailed nipples, anatomically correct body`) para guiar a la IA en el renderizado anatómico explícito.
  5. **Desactivación de img2img para Escenas:** Eliminamos el parámetro `&image=...` de la URL de Pollinations. Esto elimina la restricción de pose y vestimenta heredada del retrato del avatar, permitiendo generar anatomías limpias y correctas (eliminando el bug de los 4 brazos) desde cero.
  6. **Integración Inteligente de Modelos sin Censura y Fallback Automático Completo:**
     * **Censura en Modelos Pro:** Descubrimos que modelos como `wan-image-pro` y `grok-imagine-pro` integran filtros de seguridad muy estrictos y rechazan prompts con nudismo o erótica explícita devolviendo errores `422 Unprocessable Entity` o `400 Bad Request` en la API de Pollinations.
     * **Modelo Premium Seleccionado (FLUX.2 Klein 4B):** Configuramos **`klein`** (FLUX.2 Klein 4B, $0.01/imagen) para ambos estilos (Anime y Real). Klein es un modelo generalista excelente basado en FLUX.2, libre de censura, que produce un fotorrealismo de altísima calidad y excelentes ilustraciones sin bloquear los prompts explícitos de rol.
     * **Mecanismo de Fallback Ampliado (Resiliencia Total):** Ampliamos la captura de errores del backend para interceptar no solo la falta de saldo (`402`), sino también bloqueos de moderación/reincorporaciones (`422`, `400`) o cualquier fallo HTTP. En estos casos, realiza un **fallback silencioso en caliente** a **`flux`** (Flux Schnell), el cual es gratuito, rápido e inmune a filtros de contenido, asegurando que el chat del usuario nunca se rompa.

---

## 8. Verificación y Resultados de Compilación

1.  **Compilación TypeScript y Next.js (Local):**
    Ejecutamos `npm run build` confirmando que Next.js compile todas las páginas estáticas y dinámicas y exporte el compilado standalone sin fallos de tipos o de Turbopack.
2.  **Sincronización:**
    Subimos los cambios a la rama `main` de GitHub y los sincronizamos a la VPS de Oracle (`oracle-cappy`) mediante `rsync` omitiendo directorios locales temporales y dependencias.
3.  **Docker Rebuild (VPS):**
    Ejecutamos la reconstrucción y el reinicio de la imagen Docker en la VPS mediante `docker compose up -d --build`, recreando exitosamente el contenedor `wonsfo-web` con la nueva versión del asistente y la API de generación en caliente.

El proyecto ya está sirviendo y procesando las peticiones correctamente en **`https://wonsfo.com`**.
