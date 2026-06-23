// Lógica híbrida para conversión de dialectos locales (Premium)

// Dicionarios de reemplazo directo para localismos básicos (Regex)
const DIALECT_REPLACEMENTS: { [country: string]: Array<{ pattern: RegExp; replacement: string }> } = {
  'Argentina': [
    { pattern: /(^|[^a-zA-ZáéíóúÁÉÍÓÚñÑ])tú([^a-zA-ZáéíóúÁÉÍÓÚñÑ]|$)/gi, replacement: '$1vos$2' },
    { pattern: /(^|[^a-zA-ZáéíóúÁÉÍÓÚñÑ])ti([^a-zA-ZáéíóúÁÉÍÓÚñÑ]|$)/gi, replacement: '$1vos$2' }, // ej. "para ti" -> "para vos"
    { pattern: /\beres\b/gi, replacement: 'sos' },
    { pattern: /\btienes\b/gi, replacement: 'tenés' },
    { pattern: /\bquieres\b/gi, replacement: 'querés' },
    { pattern: /\bpiensas\b/gi, replacement: 'pensás' },
    { pattern: /\bpuedes\b/gi, replacement: 'podés' },
    { pattern: /\bhablas\b/gi, replacement: 'hablás' },
    { pattern: /\bdices\b/gi, replacement: 'decís' },
    { pattern: /\bvenes\b/gi, replacement: 'venís' },
    { pattern: /\bhaces\b/gi, replacement: 'hacés' },
    { pattern: /\bsabes\b/gi, replacement: 'sabés' },
    { pattern: /\btraes\b/gi, replacement: 'traés' },
    { pattern: /\bpones\b/gi, replacement: 'ponés' },
    { pattern: /\bdeseas\b/gi, replacement: 'querés' },
    { pattern: /\bentiendes\b/gi, replacement: 'entendés' },
    { pattern: /\bsientes\b/gi, replacement: 'sentís' },
    { pattern: /\bbebida\b/gi, replacement: 'trago' },
    { pattern: /\bbebidas\b/gi, replacement: 'tragos' },
    { pattern: /\bchaqueta\b/gi, replacement: 'campera' },
    { pattern: /\bmelocotón\b/gi, replacement: 'durazno' },
    { pattern: /\bcomputadora\b/gi, replacement: 'compu' }
  ],
  'España': [
    { pattern: /\bustedes\b/gi, replacement: 'vosotros' },
    { pattern: /\btienen\b/gi, replacement: 'tenéis' },
    { pattern: /\bquieren\b/gi, replacement: 'queréis' },
    { pattern: /\bpueden\b/gi, replacement: 'podéis' },
    { pattern: /\bhacen\b/gi, replacement: 'hacéis' },
    { pattern: /\bhablan\b/gi, replacement: 'habláis' },
    { pattern: /\bsaben\b/gi, replacement: 'sabéis' },
    { pattern: /\bentienden\b/gi, replacement: 'entendéis' },
    { pattern: /\bsienten\b/gi, replacement: 'sentís' },
    { pattern: /\bcomputadora\b/gi, replacement: 'ordenador' },
    { pattern: /\bcelular\b/gi, replacement: 'móvil' },
    { pattern: /\baparcar\b/gi, replacement: 'aparcar' }
  ],
  'México': [
    { pattern: /\bcomputadora\b/gi, replacement: 'computadora' },
    { pattern: /\bcelular\b/gi, replacement: 'celular' },
    { pattern: /\bchaqueta\b/gi, replacement: 'chamarra' },
    { pattern: /\bbocadillo\b/gi, replacement: 'torta' },
    { pattern: /\bmelocotón\b/gi, replacement: 'durazno' },
    { pattern: /\bfontanero\b/gi, replacement: 'plomero' },
    { pattern: /\bbañador\b/gi, replacement: 'traje de baño' }
  ],
  'Colombia': [
    { pattern: /(^|[^a-zA-ZáéíóúÁÉÍÓÚñÑ])tú([^a-zA-ZáéíóúÁÉÍÓÚñÑ]|$)/gi, replacement: '$1usted$2' }, // Común en muchas zonas de Colombia (ustedeo cariñoso)
    { pattern: /\beres\b/gi, replacement: 'es' },
    { pattern: /\btienes\b/gi, replacement: 'tiene' },
    { pattern: /\bquieres\b/gi, replacement: 'quiere' },
    { pattern: /\bcelular\b/gi, replacement: 'celular' },
    { pattern: /\bcomputadora\b/gi, replacement: 'computador' }
  ]
};

/**
 * Aplica reemplazos léxicos directos mediante expresiones regulares según el país.
 */
export function applyLocalLexicon(text: string, country: string): string {
  const replacements = DIALECT_REPLACEMENTS[country];
  if (!replacements) return text;

  let result = text;
  for (const item of replacements) {
    result = result.replace(item.pattern, item.replacement);
  }
  return result;
}

/**
 * Usa un LLM secundario y de bajo costo para pulir y reescribir sutilmente la oración
 * al acento local de manera natural y sin forzar la jerga.
 */
export async function rewriteWithLocalDialectLLM(
  text: string,
  country: string,
  openrouterApiKey?: string
): Promise<string> {
  const apiKey = openrouterApiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // Si no hay API key de respaldo, aplicar solo el diccionario regex local
    return applyLocalLexicon(text, country);
  }

  // Si el país es Neutro, devolver intacto
  if (!country || country === 'Neutro') {
    return text;
  }

  try {
    // Usamos el modelo gratuito/barato Dolphin Mistral 24B o Mistral 7B para la reescritura sutil
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://wonsfo.com',
        'X-Title': 'Wonsfo NSFW Dialect Rewriter'
      },
      body: JSON.stringify({
        model: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
        messages: [
          {
            role: 'system',
            content: `Eres un experto lingüístico en español. Tu tarea es reescribir la frase dada al dialecto de ${country} de manera muy sutil y natural.
Reglas estrictas:
- Cambia pronombres y conjugaciones al dialecto local (ej. si es Argentina usa voseo: 'tú quieres' -> 'vos querés', 'tienes' -> 'tenés').
- NO exageres la jerga. No uses palabras vulgares ni clichés forzados. El cambio debe ser sutil y fluir naturalmente dentro del juego de rol.
- Conserva el tono emocional y el sentido exacto del mensaje original.
- Responde únicamente con el mensaje reescrito y nada más, sin explicaciones ni rodeos.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter dialect rewrite failed with status ${response.status}`);
    }

    const data = await response.json();
    const rewritten = data.choices?.[0]?.message?.content?.trim();
    return rewritten || applyLocalLexicon(text, country);
  } catch (error) {
    console.error('Error rewriting dialect with LLM, falling back to regex:', error);
    return applyLocalLexicon(text, country);
  }
}

/**
 * Orquestador de la forma de hablar.
 * Si el usuario es Premium y tiene configurado un país, procesa el texto.
 */
export async function processSpeechDialect(
  text: string,
  country: string,
  isPremium: boolean,
  openrouterApiKey?: string
): Promise<string> {
  if (!isPremium || !country || country === 'Neutro') {
    return text;
  }

  // Para evitar alucinaciones de traducción (ej: traducir 'compañía' como 'empresa')
  // y evitar romper la estructura de asteriscos y comillas, aplicamos únicamente
  // el diccionario léxico regex determinista.
  return applyLocalLexicon(text, country);
}

/**
 * Sanitiza y normaliza el formato de un mensaje de juego de rol.
 * Divide el texto alternando entre diálogos (entre comillas) y acciones (entre asteriscos).
 * Si hay etiquetas de asterisco desbalanceadas o mal colocadas por el LLM, las reconstruye de manera consistente.
 */
export function sanitizeRoleplayFormatting(text: string): string {
  if (!text) return '';

  // 1. Normalizar comillas curvas a rectas
  let cleaned = text.replace(/[“”]/g, '"');

  // 2. Dividir por asteriscos para separar diálogos de acciones
  const parts = cleaned.split('*');
  
  // Si no hay asteriscos, retornar el texto con comillas básicas si no las tiene
  if (parts.length === 1) {
    let trimmed = cleaned.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed;
    }
    return trimmed;
  }

  const formattedParts = parts.map((part, index) => {
    const isAction = index % 2 !== 0; // Índices impares son acciones (*acción*)
    let trimmed = part.trim();
    if (!trimmed) return '';

    if (isAction) {
      // Limpiar comillas internas y asteriscos del texto de la acción
      let actionText = trimmed.replace(/["“”]/g, '').trim();
      if (!actionText) return '';
      return `*${actionText}*`;
    } else {
      // Limpiar asteriscos del texto del diálogo y asegurar envoltura de comillas
      let speechText = trimmed.replace(/["“”]/g, '').trim();
      if (!speechText) return '';
      return `"${speechText}"`;
    }
  });

  // Filtrar partes vacías y unirlas con un espacio
  return formattedParts.filter(p => p !== '').join(' ');
}

