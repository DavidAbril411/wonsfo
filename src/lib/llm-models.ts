// Catálogo central de modelos de OpenRouter y llamada con fallback nativo.
// OpenRouter recorre el array `models` en orden y usa el primero que responda,
// así que un modelo retirado o con rate limit no rompe el chat.

export const CHAT_MODELS = {
  // Venice Uncensored (Dolphin Mistral 24B) versión paga: la variante :free fue retirada.
  FREE: 'cognitivecomputations/dolphin-mistral-24b-venice-edition',
  FREE_BACKUP: 'mistralai/mistral-small-3.2-24b-instruct',
  // GLM 5.3: el mejor en pruebas de rol en español rioplatense (2026-10-08), ~$0.001/mensaje
  GLM: 'z-ai/glm-5.3',
  CYDONIA: 'thedrummer/cydonia-24b-v4.1',
  SKYFALL: 'thedrummer/skyfall-36b-v2',
  EURYALE: 'sao10k/l3.3-euryale-70b'
} as const;

export const PREMIUM_CHAT_MODELS: string[] = [CHAT_MODELS.GLM, CHAT_MODELS.CYDONIA, CHAT_MODELS.SKYFALL, CHAT_MODELS.EURYALE];

// Modelos retirados o censurados que pueden seguir guardados en chats viejos.
const LEGACY_MODEL_MAP: Record<string, string> = {
  'openai/gpt-oss-120b': CHAT_MODELS.SKYFALL,
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free': CHAT_MODELS.FREE
};

export function resolvePremiumModel(requested?: string | null): string {
  const mapped = requested ? LEGACY_MODEL_MAP[requested] || requested : CHAT_MODELS.GLM;
  return PREMIUM_CHAT_MODELS.includes(mapped) ? mapped : CHAT_MODELS.GLM;
}

// Cadena de fallback (máximo 3 modelos, sin duplicados).
export function buildModelChain(primary: string, isPremium: boolean): string[] {
  const backups = isPremium
    ? [CHAT_MODELS.GLM, CHAT_MODELS.CYDONIA, CHAT_MODELS.FREE]
    : [CHAT_MODELS.FREE, CHAT_MODELS.FREE_BACKUP];
  return [primary, ...backups].filter((m, i, arr) => arr.indexOf(m) === i).slice(0, 3);
}

type ChatMessage = { role: string; content: string };

export async function openRouterChat(options: {
  models: string[];
  messages: ChatMessage[];
  title: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}): Promise<Response> {
  // GLM 5.3 exige razonamiento; algunos proveedores lo dejan "pensar" hasta agotar max_tokens y devuelven
  // texto vacío (5x el costo). "minimal" lo evita; los modelos que no razonan ignoran el parámetro.
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response('La API key de OpenRouter no está configurada en el servidor.', { status: 500 });
  }

  try {
    return await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://wonsfo.com',
        'X-Title': options.title
      },
      body: JSON.stringify({
        models: options.models,
        messages: options.messages,
        stream: options.stream ?? false,
        temperature: options.temperature ?? 0.85,
        reasoning: { effort: 'minimal' },
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {})
      })
    });
  } catch (e: any) {
    // Error de red/DNS: devolver una respuesta fallida en lugar de lanzar
    return new Response(e?.message || 'Network/Fetch error', { status: 502 });
  }
}
