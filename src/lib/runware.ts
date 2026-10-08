// Generación de imágenes con Runware (proveedor principal).
// Modelos elegidos tras pruebas del 2026-10-08; todos con licencia "Rent" (uso en servicios de generación):
//   - Realista sin desnudez (avatares y escenas con ropa): FLUX.2 Klein 9B, con el avatar como referencia de cara.
//   - Realista explícito: CyberRealistic CyberIllustrious v3 (respeta el escenario del rol).
//     Respaldo rápido: CyberRealistic Pony v11.
//   - Anime (todo): Hassaku XL (Illustrious) v2.1fix.

import { adultAgeDescriptor, ADULT_PROMPT_GUARD } from './image-safety';

export const RUNWARE_MODELS = {
  REAL_SFW: 'runware:400@2',
  REAL_NSFW: 'civitai:1125067@1471829',
  REAL_NSFW_FAST: 'civitai:443821@1838857',
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
};

// Orden importa: CLIP solo considera ~75 tokens, así que lo crítico (menores, desnudez) va primero
const MINOR_NEGATIVE = 'child, children, teen, loli, shota, young, childlike, baby face';
const QUALITY_NEGATIVE =
  'lowres, worst quality, low quality, bad anatomy, bad hands, extra fingers, extra limbs, missing limbs, deformed, mutated, watermark, signature, text';
const SFW_NEGATIVE = 'nsfw, nude, naked, topless, nipples, pussy, penis, open clothes';

function subjectTags(look: CharacterLook, anime: boolean): string {
  if (look.gender === 'Hombre') return `${anime ? '1boy' : '1man'}, solo, adult man, mature male`;
  const who = look.gender === 'Trans' ? 'adult transgender woman' : 'adult woman';
  return `${anime ? '1girl' : '1woman'}, solo, ${who}, mature female`;
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

// Escena del chat: elige modelo según estilo y desnudez, y arma el prompt en el formato que espera cada modelo.
export function buildSceneTasks(opts: {
  look: CharacterLook;
  artStyle: string;
  sceneDescription: string;
  explicit: boolean;
  avatarUrl?: string | null;
}): RunwareTask[] {
  const { look, artStyle, sceneDescription, explicit, avatarUrl } = opts;

  if (artStyle === 'Anime') {
    return [{
      model: RUNWARE_MODELS.ANIME,
      // Lo más importante primero: CLIP de SDXL prioriza el inicio del prompt
      positivePrompt: `masterpiece, best quality, amazing quality, anime, ${subjectTags(look, true)}, ${identityTags(look)}, ${explicit ? 'nsfw, nude, uncensored' : 'sfw, fully clothed'}, ${sceneDescription}, ${bodyTags(look)}`,
      negativePrompt: negativeFor(look, 'photorealistic, 3d', explicit),
      width: 832, height: 1216, steps: 28, CFGScale: 5.5
    }];
  }

  if (explicit) {
    const positivePrompt = `masterpiece, best quality, photorealistic, realistic, raw photo, ${subjectTags(look, false)}, ${identityTags(look)}, nsfw, nude, uncensored, ${sceneDescription}, ${bodyTags(look)}, detailed skin texture`;
    const negativePrompt = negativeFor(look, 'anime, cartoon, illustration, drawing, 3d render', true);
    return [
      { model: RUNWARE_MODELS.REAL_NSFW, positivePrompt, negativePrompt, width: 832, height: 1216, steps: 26, CFGScale: 5 },
      {
        model: RUNWARE_MODELS.REAL_NSFW_FAST,
        positivePrompt: `score_9, score_8_up, score_7_up, ${positivePrompt}`,
        negativePrompt: `score_6, score_5, score_4, ${negativePrompt}`,
        width: 832, height: 1216, steps: 26, CFGScale: 5
      }
    ];
  }

  // Realista con ropa: Klein entiende lenguaje natural y usa el avatar para mantener la misma cara
  const reference = avatarUrl ? 'The same person as in the reference image. ' : '';
  return [{
    model: RUNWARE_MODELS.REAL_SFW,
    positivePrompt: `${reference}${sceneDescription}. ${lookTags(look)}. Realistic photograph, natural lighting, detailed skin, ${ADULT_PROMPT_GUARD}.`,
    width: 896, height: 1152, steps: 4,
    ...(avatarUrl ? { referenceImages: [avatarUrl] } : {})
  }];
}

// Avatar del personaje (siempre vestido)
export function buildAvatarTasks(opts: { look: CharacterLook; artStyle: string; outfitAndSetting: string; personality: string }): RunwareTask[] {
  const { look, artStyle, outfitAndSetting, personality } = opts;
  if (artStyle === 'Anime') {
    return [{
      model: RUNWARE_MODELS.ANIME,
      positivePrompt: `masterpiece, best quality, amazing quality, anime, ${subjectTags(look, true)}, ${identityTags(look)}, sfw, fully clothed, ${outfitAndSetting}, standing, cowboy shot, looking at viewer, ${personality}, ${bodyTags(look)}`,
      negativePrompt: negativeFor(look, 'photorealistic, 3d', false),
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
