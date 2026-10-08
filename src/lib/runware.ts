// Generación de imágenes con Runware (proveedor principal).
// Modelos elegidos tras pruebas del 2026-10-08; todos con licencia "Rent" (uso en servicios de generación):
//   - Realista sin desnudez (avatares y escenas con ropa): FLUX.2 Klein 9B, con el avatar como referencia de cara.
//   - Realista explícito: CyberRealistic Pony v11 + IP-Adapter Plus-Face con el avatar (misma cara, edad y cuerpo).
//     Respaldo: CyberIllustrious v3 (Runware no acepta IP-Adapter en arquitectura Illustrious).
//   - Anime (todo): Hassaku XL (Illustrious) v2.1fix.

import { adultAgeDescriptor, ADULT_PROMPT_GUARD } from './image-safety';

export const RUNWARE_MODELS = {
  REAL_SFW: 'runware:400@2',
  REAL_NSFW: 'civitai:443821@1838857',
  REAL_NSFW_FALLBACK: 'civitai:1125067@1471829',
  ANIME: 'civitai:140272@1617798'
} as const;

export type CharacterLook = {
  name: string;
  gender: string; // 'Mujer' | 'Hombre' | 'Trans'
  age: string | number;
  ethnicity: string;
  build: string;
  physicalDetails: string;
  eyes: string;
  hair: string; // incluye el largo, en inglés
  skin: string;
};

type RunwareTask = {
  model: string;
  positivePrompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps: number;
  CFGScale?: number;
  referenceImages?: string[];
  ipAdapters?: { model: string; guideImages: string[]; weight: number }[];
};

// IP-Adapter SDXL Plus-Face: transfiere la cara del avatar a modelos SDXL/Illustrious/Pony
const FACE_ADAPTER = 'runware:55@3';
function faceAdapter(avatarUrl: string | null | undefined, weight: number) {
  return avatarUrl ? { ipAdapters: [{ model: FACE_ADAPTER, guideImages: [avatarUrl], weight }] } : {};
}

// Orden importa: CLIP solo considera ~75 tokens, así que lo crítico (menores, desnudez) va primero.
// "young"/"mature" no se usan en realista: envejecen a los personajes (35-45 años) sin mejorar la protección.
const MINOR_NEGATIVE = 'child, children, teen, loli, shota, childlike, baby face';
const QUALITY_NEGATIVE =
  'watermark, logo, username, signature, text, lowres, worst quality, low quality, bad anatomy, bad hands, extra fingers, extra limbs, missing limbs, deformed, mutated';
const SFW_NEGATIVE = 'nsfw, nude, naked, topless, nipples, pussy, penis, open clothes';

function subjectTags(look: CharacterLook, anime: boolean): string {
  // En anime sí se refuerza la adultez: el estilo tiende a rasgos aniñados
  if (look.gender === 'Hombre') return anime ? '1boy, solo, adult man, mature male' : '1man, solo, adult man';
  const who = look.gender === 'Trans' ? 'adult transgender woman' : 'adult woman';
  return anime ? `1girl, solo, ${who}, mature female` : `1woman, solo, ${who}`;
}

// Rasgos que identifican al personaje (van al principio: CLIP de SDXL ignora lo que pasa de ~75 tokens)
function identityTags(look: CharacterLook): string {
  return [look.hair, look.eyes, look.skin].join(', ');
}

function bodyTags(look: CharacterLook): string {
  return [adultAgeDescriptor(look.age), look.ethnicity, look.build, look.physicalDetails].join(', ');
}

function lookTags(look: CharacterLook): string {
  return `${bodyTags(look)}, ${identityTags(look)}`;
}

function negativeFor(look: CharacterLook, extra: string, explicit: boolean): string {
  const female = look.gender !== 'Hombre' ? ', petite, flat chest' : '';
  return `${explicit ? '' : `${SFW_NEGATIVE}, `}${MINOR_NEGATIVE}${female}, ${extra}, ${QUALITY_NEGATIVE}`;
}

// La escena se ve desde los ojos del usuario: sin esto los modelos inventan una segunda persona (ej. otra mujer para un beso)
// "hetero"/"male pov" no se usan: en modelos entrenados con tags de booru disparan actos sexuales que la escena no describe
function povTags(viewerGender?: string): { tags: string; negative: string; text: string } {
  if (viewerGender === 'Hombre') {
    return { tags: 'pov', negative: '2girls, multiple girls, yuri, ', text: 'Photo taken from the first-person point of view of the man she is with; at most his hands are visible, never his face.' };
  }
  if (viewerGender === 'Mujer') {
    return { tags: 'pov, female pov', negative: '', text: 'Photo taken from the first-person point of view of the woman she is with; at most her hands are visible, never her face.' };
  }
  return { tags: 'pov', negative: '', text: 'Photo taken from the first-person point of view of the person she is with; at most their hands are visible.' };
}

// Escena del chat: elige modelo según estilo y desnudez, y arma el prompt en el formato que espera cada modelo.
export function buildSceneTasks(opts: {
  look: CharacterLook;
  artStyle: string;
  sceneDescription: string;
  explicit: boolean;
  avatarUrl?: string | null;
  viewerGender?: string;
}): RunwareTask[] {
  const { look, artStyle, sceneDescription, explicit, avatarUrl } = opts;
  const pov = povTags(opts.viewerGender);
  // La imagen no debe ir más allá de lo que pasa en el rol: si la escena no describe sexo, se excluye explícitamente
  const describesSex = /\bsex\b|intercourse|penetrat|penis|cock|fellatio|blowjob|oral|riding|straddl|cum\b|semen|thrust/i.test(sceneDescription);
  if (!describesSex) pov.negative += 'penis, sex, fellatio, paizuri, ';

  if (artStyle === 'Anime') {
    return [{
      model: RUNWARE_MODELS.ANIME,
      // Lo más importante primero: CLIP de SDXL prioriza el inicio del prompt
      positivePrompt: `masterpiece, best quality, amazing quality, anime, ${subjectTags(look, true)}, ${pov.tags}, ${identityTags(look)}, ${explicit ? 'nsfw, nude, uncensored' : 'sfw, fully clothed'}, ${sceneDescription}, ${bodyTags(look)}`,
      negativePrompt: pov.negative + negativeFor(look, 'young, photorealistic, 3d', explicit),
      width: 832, height: 1216, steps: 28, CFGScale: 5.5
    }];
  }

  if (explicit) {
    const positivePrompt = `photorealistic, raw photo, ${subjectTags(look, false)}, ${pov.tags}, ${identityTags(look)}, nude, ${sceneDescription}, ${bodyTags(look)}, detailed skin texture`;
    const negativePrompt = pov.negative + negativeFor(look, 'anime, cartoon, illustration, drawing, 3d render', true);
    return [
      {
        model: RUNWARE_MODELS.REAL_NSFW,
        positivePrompt: `score_9, score_8_up, score_7_up, ${positivePrompt}`,
        negativePrompt: `score_6, score_5, score_4, ${negativePrompt}`,
        width: 832, height: 1216, steps: 26, CFGScale: 5,
        ...faceAdapter(avatarUrl, 0.8)
      },
      { model: RUNWARE_MODELS.REAL_NSFW_FALLBACK, positivePrompt, negativePrompt, width: 832, height: 1216, steps: 26, CFGScale: 5 }
    ];
  }

  // Realista con ropa: Klein entiende lenguaje natural y usa el avatar para mantener la misma cara
  const reference = avatarUrl ? 'The same person as in the reference image. ' : '';
  return [{
    model: RUNWARE_MODELS.REAL_SFW,
    positivePrompt: `${reference}${sceneDescription}. Only one person in the photo: ${look.name}. ${pov.text} ${lookTags(look)}. Realistic photograph, natural lighting, detailed skin, ${ADULT_PROMPT_GUARD}.`,
    width: 896, height: 1152, steps: 4,
    ...(avatarUrl ? { referenceImages: [avatarUrl] } : {})
  }, {
    // Respaldo si Klein falla o tarda: Pony con la cara del avatar y desnudez prohibida
    model: RUNWARE_MODELS.REAL_NSFW,
    positivePrompt: `score_9, score_8_up, score_7_up, photorealistic, raw photo, ${subjectTags(look, false)}, ${pov.tags}, ${identityTags(look)}, sfw, fully clothed, ${sceneDescription}, ${bodyTags(look)}`,
    negativePrompt: `score_6, score_5, score_4, ${pov.negative}${negativeFor(look, 'anime, cartoon, illustration, drawing, 3d render', false)}`,
    width: 832, height: 1216, steps: 26, CFGScale: 5,
    ...faceAdapter(avatarUrl, 0.8)
  }];
}

// Avatar del personaje (siempre vestido)
export function buildAvatarTasks(opts: { look: CharacterLook; artStyle: string; outfitAndSetting: string; personality: string }): RunwareTask[] {
  const { look, artStyle, outfitAndSetting, personality } = opts;
  if (artStyle === 'Anime') {
    return [{
      model: RUNWARE_MODELS.ANIME,
      positivePrompt: `masterpiece, best quality, amazing quality, anime, ${subjectTags(look, true)}, ${identityTags(look)}, sfw, fully clothed, ${outfitAndSetting}, standing, cowboy shot, looking at viewer, ${personality}, ${bodyTags(look)}`,
      negativePrompt: negativeFor(look, 'young, photorealistic, 3d', false),
      width: 832, height: 1216, steps: 28, CFGScale: 5.5
    }];
  }
  return [{
    model: RUNWARE_MODELS.REAL_SFW,
    positivePrompt: `Knee-up portrait photograph of ${look.name}, a ${lookTags(look)}, standing, ${personality}, ${outfitAndSetting}. Realistic photograph, natural lighting, detailed skin, ${ADULT_PROMPT_GUARD}.`,
    width: 896, height: 1152, steps: 4
  }];
}

// Ejecuta las tareas en orden hasta que una funcione. Devuelve null si Runware no está configurado o todas fallan.
export async function generateWithRunware(tasks: RunwareTask[]): Promise<{ buffer: Buffer; model: string } | null> {
  const apiKey = process.env.RUNWARE_API_KEY;
  if (!apiKey) return null;

  for (const task of tasks) {
    const { referenceImages, ...params } = task;
    const body = [{
      taskType: 'imageInference',
      taskUUID: crypto.randomUUID(),
      ...params,
      ...(referenceImages ? { inputs: { referenceImages } } : {}),
      numberResults: 1,
      outputType: 'base64Data',
      outputFormat: 'JPG',
      includeCost: true
    }];

    try {
      const started = Date.now();
      const response = await fetch('https://api.runware.ai/v1', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45_000) // nginx corta a los 60s
      });
      const json = await response.json();
      const result = json?.data?.[0];
      if (!response.ok || json?.errors?.length || !result?.imageBase64Data) {
        throw new Error(`Runware ${response.status}: ${JSON.stringify(json?.errors || json).slice(0, 300)}`);
      }
      console.log(`Runware OK con ${task.model} en ${Date.now() - started}ms (costo $${result.cost})`);
      return { buffer: Buffer.from(result.imageBase64Data, 'base64'), model: task.model };
    } catch (e: any) {
      console.error(`Runware falló con ${task.model}:`, e?.message || e);
    }
  }
  return null;
}
