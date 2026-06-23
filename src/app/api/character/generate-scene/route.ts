import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

// Diccionarios de traducción
const TRANSLATE_BUILD: Record<string, string> = {
  'Delgada': 'slender slim build',
  'Atlética': 'athletic toned build',
  'Reloj de arena': 'voluptuous hourglass shape',
  'Curvy': 'curvy build',
  'Musculosa': 'muscular fit build',
  'Rellenita': 'chubby soft build'
};

const TRANSLATE_EYES: Record<string, string> = {
  'Azules': 'piercing blue eyes',
  'Verdes': 'green eyes',
  'Avellana': 'hazel eyes',
  'Oscuros': 'dark brown eyes'
};

const TRANSLATE_HAIR: Record<string, string> = {
  'Rubio': 'straight blonde hair',
  'Castaño ondulado': 'wavy brunette hair',
  'Pelirrojo': 'red hair',
  'Negro lacio': 'silky straight black hair',
  'Cabello rosa': 'vibrant pink fantasy hair',
  'Cabello plateado': 'shiny silver fantasy hair',
  'Cabello azul': 'neon blue fantasy hair'
};

const TRANSLATE_HAIR_LENGTH: Record<string, string> = {
  'Corto': 'short',
  'Mediano': 'shoulder-length',
  'Largo': 'long',
  'Muy largo': 'very long'
};

const TRANSLATE_BREAST_SIZE: Record<string, string> = {
  'Sin senos (Plano)': 'flat chest',
  'Pequeños': 'small breasts',
  'Medianos': 'medium breasts',
  'Grandes': 'large breasts',
  'Muy grandes': 'very large breasts'
};

const TRANSLATE_WAIST_BUTT: Record<string, string> = {
  'Estándar': 'balanced hips',
  'Cintura fina y culo estándar': 'slim waist and standard hips',
  'Cintura fina y culo grande': 'slim waist and wide voluptuous hips',
  'Reloj de arena pronunciado': 'pronounced voluptuous hourglass body shape',
  'Caderas anchas': 'wide hips'
};

const TRANSLATE_MUSCLE_AMOUNT: Record<string, string> = {
  'Normal / Sin entrenar': 'average physique',
  'Definido / Atlético': 'defined athletic body',
  'Musculoso / Culturista': 'muscular body builder physique',
  'Fuerte / Voluminoso': 'strong thick powerlifter build'
};

const TRANSLATE_BEARD_STYLE: Record<string, string> = {
  'Afeitado / Sin barba': 'clean-shaven',
  'Barba de 3 días': 'stubble beard',
  'Barba tupida': 'thick full beard',
  'Perilla / Candado': 'goatee beard'
};

const TRANSLATE_SKIN: Record<string, string> = {
  'Clara': 'pale fair skin',
  'Bronceada': 'tanned sun-kissed skin',
  'Trigueña': 'warm olive skin tone',
  'Oscura': 'dark skin tone'
};

const TRANSLATE_ETHNICITY: Record<string, string> = {
  'Caucásica': 'caucasian white',
  'Latina': 'latina',
  'Asiática': 'asian',
  'Africana': 'african black',
  'Árabe': 'middle-eastern arabic',
  'Mixta': 'mixed ethnicity'
};

const TRANSLATE_PERSONALITY: Record<string, string> = {
  'Seductora': 'seductive smirk',
  'Sumisa': 'gentle warm smile',
  'Fría': 'serious confident look',
  'Rebelde': 'wild rebellious smirk'
};

const TRANSLATE_GENDER: Record<string, string> = {
  'Mujer': 'woman',
  'Hombre': 'man',
  'Trans': 'transgender woman'
};

export async function POST(request: NextRequest) {
  try {
    const { chatId } = await request.json();

    if (!chatId) {
      return NextResponse.json({ error: 'Falta el parámetro chatId.' }, { status: 400 });
    }

    // 1. Validar autenticación
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
    }

    // 2. Obtener detalles del chat y personaje
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('*, character:characters(*)')
      .eq('id', chatId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat no encontrado.' }, { status: 404 });
    }

    const character = chat.character;

    // 3. Obtener el último mensaje de la conversación
    const { data: lastMessages, error: msgError } = await supabaseAdmin
      .from('chat_messages')
      .select('sender, text')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (msgError || !lastMessages || lastMessages.length === 0) {
      return NextResponse.json({ error: 'No hay mensajes en este chat para generar una escena.' }, { status: 400 });
    }

    // Encontrar el último mensaje del asistente e información del usuario
    const lastAssistantText = lastMessages.find(m => m.sender === 'assistant')?.text || '';
    const lastUserText = lastMessages.find(m => m.sender === 'user')?.text || '';

    // 4. Intentar extraer metadatos del personaje
    const metadataMatch = character.personality_description.match(/<!-- METADATA: (\{.*?\}) -->/);
    if (!metadataMatch) {
      return NextResponse.json({ error: 'Este personaje no tiene metadatos estructurados para generar escenas.' }, { status: 400 });
    }

    let charMeta: any = {};
    try {
      charMeta = JSON.parse(metadataMatch[1]);
    } catch (e) {
      console.error("Failed to parse metadata", e);
      return NextResponse.json({ error: 'Error al procesar los metadatos del personaje.' }, { status: 400 });
    }

    // Valores por defecto si no existen metadatos
    const gender = charMeta.gender || 'Mujer';
    const artStyle = charMeta.artStyle || 'Real';
    const age = charMeta.age || '22';
    const build = charMeta.build || 'Atlética';
    const eyes = charMeta.eyes || 'Verdes';
    const hair = charMeta.hair || 'Castaño ondulado';
    const hairLength = charMeta.hairLength || 'Largo';
    const skin = charMeta.skin || 'Clara';
    const ethnicity = charMeta.ethnicity || 'Latina';
    const breastSize = charMeta.breastSize || 'Medianos';
    const waistButt = charMeta.waistButt || 'Estándar';
    const muscleAmount = charMeta.muscleAmount || 'Normal / Sin entrenar';
    const beardStyle = charMeta.beardStyle || 'Afeitado / Sin barba';
    const personality = charMeta.personality || 'Seductora';

    // 5. Usar OpenRouter para traducir y resumir la escena de manera segura y descriptiva
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return NextResponse.json({ error: 'Falta la API Key de OpenRouter.' }, { status: 500 });
    }

    const openRouterPrompt = 
      `Dada la última interacción en un juego de rol interactivo en español:\n` +
      `Mensaje del usuario: "${lastUserText}"\n` +
      `Mensaje del personaje (${character.name}): "${lastAssistantText}"\n\n` +
      `Genera una descripción física muy corta en inglés (3 a 7 palabras) sobre lo que está haciendo el personaje de IA (${character.name}), su vestimenta y pose en esta escena.\n` +
      `REGLAS ESTRICTAS DE SEGURIDAD:\n` +
      `- No describas desnudez explícita, genitales o actos sexuales explícitos.\n` +
      `- Si la escena es íntima o física, descríbela usando términos artísticos o románticos (ejemplo: "clothed, sitting close on couch", "romantic embrace", "steamy look, clothed", "cuddling in bed with sheets").\n` +
      `- Asegúrate de que los personajes estén descritos como vestidos (clothed, wearing clothes).\n\n` +
      `Debes retornar ÚNICAMENTE un objeto JSON válido con la propiedad "scene_description_en" (ejemplo: { "scene_description_en": "clothed, hugging passionately on a dark sofa" }). Sin texto adicional ni formato de código markdown.`;

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterApiKey}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: openRouterPrompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    let sceneDescriptionEn = 'clothed, posing in a room';
    if (openRouterResponse.ok) {
      try {
        const textData = await openRouterResponse.json();
        const jsonContent = JSON.parse(textData.choices?.[0]?.message?.content?.trim() || '{}');
        sceneDescriptionEn = jsonContent.scene_description_en || 'clothed, posing in a room';
      } catch (e) {
        console.warn("Fallo al traducir escena:", e);
      }
    }

    // 6. Traducir atributos físicos individuales
    const englishBuild = TRANSLATE_BUILD[build] || 'fit build';
    const englishEyes = TRANSLATE_EYES[eyes] || 'beautiful eyes';
    const englishHair = TRANSLATE_HAIR[hair] || 'beautiful hair';
    const englishSkin = TRANSLATE_SKIN[skin] || 'smooth skin';
    const englishEthnicity = TRANSLATE_ETHNICITY[ethnicity] || 'mixed race';
    const englishPersonality = TRANSLATE_PERSONALITY[personality] || 'attractive look';
    const englishGender = TRANSLATE_GENDER[gender] || 'person';
    const englishHairLength = TRANSLATE_HAIR_LENGTH[hairLength] || 'long';

    let physicalDetailsEn = '';
    if (gender === 'Hombre') {
      const muscle = TRANSLATE_MUSCLE_AMOUNT[muscleAmount] || 'average physique';
      const beard = TRANSLATE_BEARD_STYLE[beardStyle] || 'clean-shaven';
      physicalDetailsEn = `${muscle}, ${beard}`;
    } else {
      const breasts = TRANSLATE_BREAST_SIZE[breastSize] || 'medium breasts';
      const waist = TRANSLATE_WAIST_BUTT[waistButt] || 'balanced body shape';
      physicalDetailsEn = `${breasts}, ${waist}`;
    }

    // 7. Construir prompt de la escena
    let imagePrompt = '';
    if (artStyle === 'Anime') {
      imagePrompt = `sensual anime style illustration, 2d digital art, beautiful ${age} years old ${englishEthnicity} ${englishGender}, named ${character.name}, ${englishBuild}, ${physicalDetailsEn}, ${englishEyes}, ${englishHairLength} ${englishHair}, ${englishSkin}, ${englishPersonality}, ${sceneDescriptionEn}, vibrant colors, clean lines, high quality anime artwork, masterpiece, black background`;
    } else {
      imagePrompt = `sensual raw photography, knee-up shot of a beautiful ${age} years old ${englishEthnicity} ${englishGender}, named ${character.name}, ${englishBuild}, ${physicalDetailsEn}, ${englishEyes}, ${englishHairLength} ${englishHair}, ${englishSkin}, ${englishPersonality}, ${sceneDescriptionEn}, highly detailed, photorealistic, 8k resolution, raw format, masterpiece, studio lighting, black backdrop`;
    }

    const pollinationsApiKey = process.env.POLLINATIONS_API_KEY;
    // Usar seedream5 (Seeddream 5.0 Lite) que acepta imágenes de entrada (mejor relación calidad/precio)
    const activeModel = 'seedream5';
    let pollinationsUrl = `https://image.pollinations.ai/p/${encodeURIComponent(imagePrompt)}?width=1024&height=1024&nologo=true&safe=false&model=${activeModel}&seed=${Math.floor(Math.random() * 100000)}`;

    if (character.avatar_url) {
      pollinationsUrl += `&image=${encodeURIComponent(character.avatar_url)}`;
    }

    const pollinationsHeaders: HeadersInit = {};
    if (pollinationsApiKey) {
      pollinationsHeaders['Authorization'] = `Bearer ${pollinationsApiKey}`;
    }

    console.log("Llamando a Pollinations para Escena con URL:", pollinationsUrl);
    const imageResponse = await fetch(pollinationsUrl, {
      headers: pollinationsHeaders
    });

    if (!imageResponse.ok) {
      throw new Error(`Error de Pollinations AI: ${imageResponse.statusText}`);
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);

    // 8. Subir la imagen generada a Cloudinary
    let finalImageUrl = '';
    if (isCloudinaryConfigured) {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'wonsfo_scenes',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            transformation: [{ width: 1024, height: 1024, crop: 'limit', quality: 'auto' }]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(imageBuffer);
      }) as any;

      finalImageUrl = uploadResult.secure_url;
    } else {
      const base64Image = imageBuffer.toString('base64');
      finalImageUrl = `data:image/jpeg;base64,${base64Image}`;
    }

    // 9. Registrar el mensaje en la base de datos como una imagen markdown
    const { data: insertedMsg, error: insertError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        sender: 'assistant',
        text: `![Escena](${finalImageUrl})`,
        intimacy_score: 0.0
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: insertedMsg
    });

  } catch (error: any) {
    console.error('Error generating scene:', error);
    return NextResponse.json({ error: `Error en la generación de escena: ${error.message}` }, { status: 500 });
  }
}
