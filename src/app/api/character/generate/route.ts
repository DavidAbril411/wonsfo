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
  'Delgada': 'slender slim body',
  'Atlética': 'athletic toned body',
  'Reloj de arena': 'voluptuous hourglass body',
  'Curvy': 'curvy plump body'
};

const TRANSLATE_EYES: Record<string, string> = {
  'Azules': 'piercing blue eyes',
  'Verdes': 'green eyes',
  'Avellana': 'hazel eyes',
  'Oscuros': 'dark brown eyes'
};

const TRANSLATE_HAIR: Record<string, string> = {
  'Rubio largo': 'long straight blonde hair',
  'Castaño ondulado': 'wavy shoulder-length brunette hair',
  'Pelirrojo corto': 'short cropped red hair',
  'Negro lacio': 'long silky straight black hair',
  'Cabello de fantasía': 'vibrant pink and purple fantasy hair'
};

const TRANSLATE_SKIN: Record<string, string> = {
  'Clara': 'pale fair alabaster skin',
  'Bronceada': 'tanned sun-kissed skin',
  'Trigueña': 'warm olive skin tone',
  'Oscura': 'dark black skin tone'
};

const TRANSLATE_PERSONALITY: Record<string, string> = {
  'Seductora': 'seductive smirk, playful heavy-lidded gaze, coquette expression',
  'Sumisa': 'gentle warm smile, sweet submissive expression, shy soft gaze',
  'Fría': 'cold dominant expression, serious bossy gaze, strict confident look',
  'Rebelde': 'wild rebellious smirk, disheveled look, confident fierce expression'
};

export async function POST(request: NextRequest) {
  try {
    const { name, age, build, eyes, hair, skin, personality, dialect, climaxSpeed } = await request.json();

    if (!name || !age || !build || !eyes || !hair || !skin || !personality || !dialect) {
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

    const promptTextGen = 
      `Eres un redactor creativo experto en juegos de rol interactivos para adultos. \n` +
      `Genera una ficha técnica para un personaje en español con las siguientes características:\n` +
      `- Nombre: ${name}\n` +
      `- Edad: ${age} años\n` +
      `- Contextura: ${build}\n` +
      `- Ojos: ${eyes}\n` +
      `- Cabello: ${hair}\n` +
      `- Piel: ${skin}\n` +
      `- Personalidad dominante: ${personality}\n` +
      `- Dialecto: ${dialect}\n\n` +
      `Debes retornar ÚNICAMENTE un objeto JSON con dos propiedades:\n` +
      `1. "description": Una descripción de su personalidad y trasfondo de 2 a 3 frases en español, escrita de manera inmersiva e incitante.\n` +
      `2. "greeting": Un mensaje inicial o saludo en primera persona en español, altamente sugestivo, inmersivo, y acorde a su dialecto, que incluya acciones entre asteriscos (ej. *te miro de arriba a abajo y sonrío*).\n\n` +
      `Responde estrictamente en formato JSON válido, sin bloques de código markdown, sin texto adicional y sin envoltorios. Ejemplo: { "description": "...", "greeting": "..." }`;

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

    try {
      const parsedJson = JSON.parse(assistantOutput);
      generatedDescription = parsedJson.description || '';
      generatedGreeting = parsedJson.greeting || '';
    } catch (e) {
      console.warn("Fallo al parsear JSON de OpenRouter, usando fallback estático:", assistantOutput);
      generatedDescription = `${name} es una mujer de ${age} años con una personalidad ${personality}. Su cabello es ${hair} y tiene ojos ${eyes}.`;
      generatedGreeting = `Hola. Qué bueno verte por aquí... ¿te sientas a mi lado?`;
    }

    // 4. Generar la imagen con IA mediante Pollinations
    const englishBuild = TRANSLATE_BUILD[build] || 'beautiful body';
    const englishEyes = TRANSLATE_EYES[eyes] || 'beautiful eyes';
    const englishHair = TRANSLATE_HAIR[hair] || 'beautiful hair';
    const englishSkin = TRANSLATE_SKIN[skin] || 'smooth skin';
    const englishPersonality = TRANSLATE_PERSONALITY[personality] || 'attractive look';

    // Prompt de imagen estructurado y seductor (plano de rodillas hacia arriba)
    const imagePrompt = `sensual raw photography, knee-up full body shot of a beautiful ${age} years old woman standing, named ${name}, ${englishBuild}, ${englishEyes}, ${englishHair}, ${englishSkin}, ${englishPersonality}, highly detailed, photorealistic, 8k resolution, raw format, masterpiece, studio lighting, black backdrop`;

    const pollinationsApiKey = process.env.POLLINATIONS_API_KEY;
    const pollinationsUrl = `https://image.pollinations.ai/p/${encodeURIComponent(imagePrompt)}?width=512&height=512&nologo=true&safe=false&model=flux-realism&seed=${Math.floor(Math.random() * 100000)}`;

    const pollinationsHeaders: HeadersInit = {};
    if (pollinationsApiKey) {
      pollinationsHeaders['Authorization'] = `Bearer ${pollinationsApiKey}`;
    }

    console.log("Llamando a Pollinations con URL:", pollinationsUrl);
    const imageResponse = await fetch(pollinationsUrl, {
      headers: pollinationsHeaders
    });

    if (!imageResponse.ok) {
      throw new Error(`Error de Pollinations AI: ${imageResponse.statusText}`);
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);

    // 5. Subir la imagen generada a Cloudinary
    let finalAvatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop';
    
    if (isCloudinaryConfigured) {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'wonsfo_avatars',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            transformation: [{ width: 400, height: 400, crop: 'limit' }]
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
      // En desarrollo sin Cloudinary, podemos convertir la imagen a base64 para visualizarla de inmediato
      const base64Image = imageBuffer.toString('base64');
      finalAvatarUrl = `data:image/jpeg;base64,${base64Image}`;
    }

    // 6. Registrar en Supabase
    const { data: newCharacter, error: insertError } = await supabaseAdmin
      .from('characters')
      .insert({
        user_id: user.id,
        name,
        personality_description: generatedDescription,
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
