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

// Diccionarios de traducción de atributos para el Prompt de Imagen en Inglés
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
  'Seductora': 'seductive smirk, playful heavy-lidded gaze',
  'Sumisa': 'gentle warm smile, sweet soft gaze',
  'Fría': 'cold expression, serious confident look',
  'Rebelde': 'wild rebellious smirk, confident fierce expression'
};

const TRANSLATE_GENDER: Record<string, string> = {
  'Mujer': 'woman',
  'Hombre': 'man',
  'Trans': 'transgender woman'
};

export async function POST(request: NextRequest) {
  try {
    const { 
      name, 
      age, 
      build, 
      eyes, 
      hair, 
      skin, 
      personality, 
      dialect, 
      climaxSpeed,
      gender,
      artStyle,
      ethnicity,
      relationship,
      contextDetails,
      startLocation,
      greetingChoice,
      manualGreeting,
      hairLength,
      breastSize,
      waistButt,
      muscleAmount,
      beardStyle
    } = await request.json();

    if (!name || !age || !build || !eyes || !hair || !skin || !personality || !dialect || !gender || !artStyle || !ethnicity || !relationship) {
      return NextResponse.json({ error: 'Faltan atributos obligatorios para la creación del personaje.' }, { status: 400 });
    }

    // 1. Validar autenticación
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado. Cabecera de autorización faltante.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 });
    }

    // 2. Verificar estado Premium
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();

    const isPremium = profileError ? false : !!profile?.is_premium;

    if (!isPremium) {
      return NextResponse.json({ error: 'Esta característica requiere una cuenta Premium.' }, { status: 403 });
    }

    // 3. Generar la descripción y saludo del personaje usando OpenRouter
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return NextResponse.json({ error: 'Falta la API Key de OpenRouter en el servidor.' }, { status: 500 });
    }

    const shouldGenerateGreeting = greetingChoice === 'generate';

    const promptTextGen = 
      `Eres un redactor creativo experto en juegos de rol interactivos para adultos. \n` +
      `Genera una ficha técnica para un personaje en español con las siguientes características:\n` +
      `- Nombre: ${name}\n` +
      `- Género: ${gender}\n` +
      `- Edad: ${age} años\n` +
      `- Contextura: ${build}\n` +
      `- Ojos: ${eyes}\n` +
      `- Cabello: ${hair} (${hairLength || 'Largo'})\n` +
      `- Piel: ${skin}\n` +
      `- Etnia: ${ethnicity}\n` +
      (gender !== 'Hombre' ? `- Senos: ${breastSize || 'Medianos'}\n- Silueta: ${waistButt || 'Estándar'}\n` : '') +
      (gender === 'Hombre' ? `- Musculatura: ${muscleAmount || 'Normal'}\n- Barba: ${beardStyle || 'Sin barba'}\n` : '') +
      `- Personalidad dominante: ${personality}\n` +
      `- Relación con el usuario: ${relationship}\n` +
      `- Escenario y Profesión (Contexto): ${contextDetails || 'Ninguno especificado.'}\n` +
      `- Lugar de inicio: ${startLocation || 'Me da igual (Generado por IA)'}\n` +
      `- Dialecto: ${dialect}\n\n` +
      `Instrucciones de Escenario y Lugar de Inicio:\n` +
      `* Si el "Lugar de inicio" es "Me da igual (Generado por IA)" o está en blanco, genera de manera creativa un lugar/escenario de inicio lógico que encaje perfectamente con la relación y la profesión del personaje (por ejemplo: una biblioteca, un café, una oficina, un gimnasio, una parada de autobús, etc.). Evita comenzar siempre en una casa a menos que sea 100% indispensable por el tipo de relación (ej. madrastra).\n` +
      `* Si el "Lugar de inicio" especifica un sitio concreto, úsalo obligatoriamente como el lugar de inicio.\n\n` +
      `Debes retornar ÚNICAMENTE un objeto JSON con las siguientes propiedades:\n` +
      `1. "description": Una descripción de su personalidad y trasfondo de 2 a 3 frases en español, escrita de manera inmersiva.\n` +
      `2. "greeting": ${shouldGenerateGreeting ? 'Un mensaje inicial o saludo en primera persona en español, altamente inmersivo y acorde a su dialecto, que comience EXACTAMENTE en el lugar de inicio y describa el entorno de forma breve usando acciones entre asteriscos (ej. *estoy sentada en la esquina de la biblioteca antigua, pasando las páginas de un libro gigante de historia* "Hola...").' : 'Retorna un string vacío ""'}\n` +
      `3. "clothing_and_setting_en": Una frase descriptiva muy corta en inglés (3 a 5 palabras) sobre la indumentaria y el escenario basada en el contexto y el lugar de inicio (ejemplo: "wearing nurse uniform in a hospital clinic").\n\n` +
      `Responde estrictamente en formato JSON válido, sin bloques de código markdown, sin texto adicional y sin envoltorios. Ejemplo: { "description": "...", "greeting": "...", "clothing_and_setting_en": "..." }`;

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterApiKey}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: promptTextGen }],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      })
    });

    if (!openRouterResponse.ok) {
      throw new Error('Error al conectar con OpenRouter para la redacción del personaje.');
    }

    const textGenData = await openRouterResponse.json();
    const assistantOutput = textGenData.choices?.[0]?.message?.content?.trim() || '';
    
    let generatedDescription = '';
    let generatedGreeting = '';
    let clothingAndSettingEn = '';

    try {
      const parsedJson = JSON.parse(assistantOutput);
      generatedDescription = parsedJson.description || '';
      generatedGreeting = shouldGenerateGreeting ? (parsedJson.greeting || '') : manualGreeting;
      clothingAndSettingEn = parsedJson.clothing_and_setting_en || '';
    } catch (e) {
      console.warn("Fallo al parsear JSON de OpenRouter, usando fallback:", assistantOutput);
      generatedDescription = `${name} es un/a ${gender} de ${age} años con una personalidad ${personality}.`;
      generatedGreeting = shouldGenerateGreeting ? `Hola. ¿Cómo estás? Pasa, no te quedes ahí...` : manualGreeting;
      clothingAndSettingEn = 'casual clothing in a dark room';
    }

    // 4. Generar la imagen con IA mediante Pollinations
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

    let imagePrompt = '';
    if (artStyle === 'Anime') {
      // Prompt optimizado para estilo anime
      imagePrompt = `sensual anime style illustration, 2d digital art, beautiful ${age} years old ${englishEthnicity} ${englishGender} standing, named ${name}, ${englishBuild}, ${physicalDetailsEn}, ${englishEyes}, ${englishHairLength} ${englishHair}, ${englishSkin}, ${englishPersonality}, ${clothingAndSettingEn}, vibrant colors, clean lines, high quality anime artwork, masterpiece, key visual, black background`;
    } else {
      // Prompt optimizado para fotografía real fotorrealista (rodillas hacia arriba)
      imagePrompt = `sensual raw photography, knee-up full body shot of a beautiful ${age} years old ${englishEthnicity} ${englishGender} standing, named ${name}, ${englishBuild}, ${physicalDetailsEn}, ${englishEyes}, ${englishHairLength} ${englishHair}, ${englishSkin}, ${englishPersonality}, ${clothingAndSettingEn}, highly detailed, photorealistic, 8k resolution, raw format, masterpiece, studio lighting, black backdrop`;
    }

    let imageBuffer: Buffer = Buffer.alloc(0);
    const siliconflowApiKey = process.env.SILICONFLOW_API_KEY;
    const atlasCloudApiKey = process.env.ATLAS_CLOUD_API_KEY;
    const airforceApiKey = process.env.AIRFORCE_API_KEY;
    let success = false;

    if (siliconflowApiKey) {
      try {
        const sfModel = artStyle === 'Anime'
          ? (process.env.SILICONFLOW_ANIME_MODEL || 'black-forest-labs/FLUX.1-schnell')
          : (process.env.SILICONFLOW_REAL_MODEL || 'black-forest-labs/FLUX.1-schnell');

        console.log(`Llamando a SiliconFlow con modelo: ${sfModel}`);
        const sfResponse = await fetch('https://api.siliconflow.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${siliconflowApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: sfModel,
            prompt: imagePrompt,
            image_size: '1024x1024'
          })
        });

        if (!sfResponse.ok) {
          const errText = await sfResponse.text();
          throw new Error(`SiliconFlow API error (${sfResponse.status}): ${errText}`);
        }

        const resultJson = await sfResponse.json();
        const imageUrl = resultJson.data?.[0]?.url;
        if (!imageUrl) {
          throw new Error(`SiliconFlow response did not contain image URL: ${JSON.stringify(resultJson)}`);
        }

        const fetchImage = await fetch(imageUrl);
        if (!fetchImage.ok) {
          throw new Error(`Failed to fetch image from SiliconFlow: ${fetchImage.statusText}`);
        }

        const imageArrayBuffer = await fetchImage.arrayBuffer();
        imageBuffer = Buffer.from(imageArrayBuffer);
        success = true;
        console.log("Generación exitosa con SiliconFlow!");
      } catch (e: any) {
        console.error("Error en SiliconFlow, realizando fallback...", e);
      }
    }

    if (!success && atlasCloudApiKey) {
      try {
        const atlasModel = artStyle === 'Anime'
          ? (process.env.ATLAS_CLOUD_ANIME_MODEL || 'black-forest-labs/flux-schnell')
          : (process.env.ATLAS_CLOUD_REAL_MODEL || 'black-forest-labs/flux-dev');

        console.log(`Llamando a Atlas Cloud con modelo: ${atlasModel}`);
        const atlasResponse = await fetch('https://api.atlascloud.ai/api/v1/model/generateImage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${atlasCloudApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: atlasModel,
            prompt: imagePrompt,
            width: 1024,
            height: 1024,
            enable_sync_mode: true,
            enable_base64_output: true
          })
        });

        if (!atlasResponse.ok) {
          const errText = await atlasResponse.text();
          throw new Error(`Atlas Cloud API error (${atlasResponse.status}): ${errText}`);
        }

        const resultJson = await atlasResponse.json();
        const base64Str = resultJson.outputs?.[0];
        if (!base64Str) {
          throw new Error(`Atlas Cloud response did not contain outputs: ${JSON.stringify(resultJson)}`);
        }

        imageBuffer = Buffer.from(base64Str, 'base64');
        success = true;
        console.log("Generación exitosa con Atlas Cloud!");
      } catch (e: any) {
        console.error("Error en Atlas Cloud, realizando fallback...", e);
      }
    }

    if (!success && airforceApiKey) {
      try {
        const airforceModel = artStyle === 'Anime'
          ? (process.env.AIRFORCE_ANIME_MODEL || 'flux-2-klein-4b')
          : (process.env.AIRFORCE_REAL_MODEL || 'flux-2-dev');

        console.log(`Llamando a Api.Airforce con modelo: ${airforceModel}`);
        const airforceResponse = await fetch('https://api.airforce/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${airforceApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: airforceModel,
            prompt: imagePrompt,
            n: 1,
            size: '1024x1024'
          })
        });

        if (!airforceResponse.ok) {
          const errText = await airforceResponse.text();
          throw new Error(`Api.Airforce error (${airforceResponse.status}): ${errText}`);
        }

        const resultJson = await airforceResponse.json();
        const imageUrl = resultJson.data?.[0]?.url;
        if (!imageUrl) {
          throw new Error(`Api.Airforce response did not contain image URL: ${JSON.stringify(resultJson)}`);
        }

        const fetchImage = await fetch(imageUrl);
        if (!fetchImage.ok) {
          throw new Error(`Failed to fetch image from Api.Airforce: ${fetchImage.statusText}`);
        }

        const imageArrayBuffer = await fetchImage.arrayBuffer();
        imageBuffer = Buffer.from(imageArrayBuffer);
        success = true;
        console.log("Generación exitosa con Api.Airforce!");
      } catch (e: any) {
        console.error("Error en Api.Airforce, realizando fallback...", e);
      }
    }

    if (!success) {
      const pollinationsApiKey = process.env.POLLINATIONS_API_KEY;
      let activeModel = 'klein';
      let pollinationsUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(imagePrompt)}?width=1024&height=1024&nologo=true&safe=false&model=${activeModel}&seed=${Math.floor(Math.random() * 100000)}`;

      const pollinationsHeaders: HeadersInit = {};
      if (pollinationsApiKey) {
        pollinationsHeaders['Authorization'] = `Bearer ${pollinationsApiKey}`;
      }

      console.log("Llamando a Pollinations con URL:", pollinationsUrl);
      let imageResponse = await fetch(pollinationsUrl, {
        headers: pollinationsHeaders
      });

      if (!imageResponse.ok || imageResponse.status === 402 || imageResponse.status === 422 || imageResponse.status === 400) {
        console.warn(`Fallo en el modelo principal (${activeModel}) con estado ${imageResponse.status}. Realizando fallback al modelo económico...`);
        activeModel = 'flux';
        pollinationsUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(imagePrompt)}?width=1024&height=1024&nologo=true&safe=false&model=${activeModel}&seed=${Math.floor(Math.random() * 100000)}`;
        console.log("Llamando a Pollinations (Fallback) con URL:", pollinationsUrl);
        imageResponse = await fetch(pollinationsUrl, {
          headers: pollinationsHeaders
        });
      }

      if (!imageResponse.ok) {
        throw new Error(`Error de Pollinations AI: ${imageResponse.statusText}`);
      }

      const imageArrayBuffer = await imageResponse.arrayBuffer();
      imageBuffer = Buffer.from(imageArrayBuffer);
    }

    // 5. Subir la imagen generada a Cloudinary
    let finalAvatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop';
    
    if (isCloudinaryConfigured) {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'wonsfo_avatars',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            transformation: [{ width: 1024, height: 1024, crop: 'limit', quality: 'auto' }]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(imageBuffer);
      }) as any;

      finalAvatarUrl = uploadResult.secure_url;
    } else {
      console.warn("Cloudinary no configurado. Usando imagen local codificada temporalmente.");
      const base64Image = imageBuffer.toString('base64');
      finalAvatarUrl = `data:image/jpeg;base64,${base64Image}`;
    }

    const metadata = {
      gender,
      artStyle,
      age,
      build,
      eyes,
      hair,
      hairLength,
      skin,
      ethnicity,
      breastSize,
      waistButt,
      muscleAmount,
      beardStyle,
      personality,
      startLocation
    };
    const metadataString = `\n\n<!-- METADATA: ${JSON.stringify(metadata)} -->`;

    // 6. Registrar en Supabase
    const { data: newCharacter, error: insertError } = await supabaseAdmin
      .from('characters')
      .insert({
        user_id: user.id,
        name,
        personality_description: generatedDescription + metadataString,
        initial_greeting: generatedGreeting,
        avatar_url: finalAvatarUrl,
        default_language: 'es',
        default_country: dialect,
        climax_speed: climaxSpeed
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      characterId: newCharacter.id,
      character: newCharacter
    });

  } catch (error: any) {
    console.error('Error generating character:', error);
    return NextResponse.json({ error: `Error en la generación del personaje: ${error.message}` }, { status: 500 });
  }
}
