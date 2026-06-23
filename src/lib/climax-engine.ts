// Lógica de puntuación semántica y keywords para el Clímax Narrativo

// Palabras clave de alta intimidad física/emocional en español y sus pesos
const INTIMACY_KEYWORDS: { [key: string]: number } = {
  'besar': 8,
  'beso': 6,
  'boca': 4,
  'labio': 4,
  'cama': 5,
  'desnuda': 10,
  'desnudo': 10,
  'desnudarse': 12,
  'tocar': 7,
  'toca': 6,
  'caricia': 6,
  'acariciar': 8,
  'gemir': 12,
  'gemido': 10,
  'excitado': 12,
  'excitada': 12,
  'hacer el amor': 15,
  'placer': 8,
  'cuerpo': 5,
  'piel': 5,
  'pasión': 6,
  'deseo': 6,
  'abrazo': 3,
  'abrazar': 4,
  'sensual': 8,
  'íntimo': 7,
  'íntima': 7,
  'ropa': 5,
  'quitar': 4,
  'calor': 3,
  'sudor': 5,
  'respiración': 4,
  'susurro': 4
};

// Vectores ancla de clímax (simplificados para el MVP)
// En producción, estos vectores corresponderían a la representación semántica de frases de clímax
// de 1536 dimensiones (por ejemplo, creados usando text-embedding-3-small).
// Para este archivo, guardamos un vector promedio simplificado de ejemplo.
const CLIMAX_ANCHOR_VECTOR: number[] = new Array(1536).fill(0).map((_, i) => Math.sin(i / 10) * 0.025);

/**
 * Calcula la similitud del coseno entre dos vectores.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Evalúa el nivel de intimidad de un mensaje de forma híbrida (palabras clave + semántica).
 * @param text Mensaje a evaluar.
 * @param embedding Embedding vectorial del mensaje (opcional).
 * @param messageCount Cantidad de mensajes previos en el chat (opcional).
 * @returns Score de intimidad calculado para el mensaje (0 - 100).
 */
export function evaluateMessageIntimacy(text: string, embedding?: number[], messageCount = 99): number {
  const normalizedText = removeAccents(text.toLowerCase());
  let keywordScore = 0;

  // 1. Puntuación basada en Keywords
  for (const [kw, score] of Object.entries(INTIMACY_KEYWORDS)) {
    const normalizedKw = removeAccents(kw.toLowerCase());
    // Usar regex para buscar límites de palabra
    const regex = new RegExp(`\\b${normalizedKw}[a-z]*\\b`, 'i');
    if (regex.test(normalizedText)) {
      const highPhysicalKws = ['desnud', 'gemir', 'gemid', 'excitad', 'hacer el amor', 'tocar', 'toca', 'acariciar', 'beso', 'besar', 'sexo', 'coger', 'placer'];
      const isHighPhysical = highPhysicalKws.some(pk => normalizedKw.includes(pk) || pk.includes(normalizedKw));
      if (isHighPhysical) {
        if (messageCount < 10) {
          // Penalizar fuertemente al principio (10%) para forzar slow burn
          keywordScore += score * 0.1;
        } else if (messageCount < 20) {
          // Penalización moderada (50%)
          keywordScore += score * 0.5;
        } else {
          // Facilitar el avance avanzado (150%)
          keywordScore += score * 1.5;
        }
      } else {
        // Para otras palabras íntimas no físicas
        if (messageCount >= 20) {
          keywordScore += score * 1.3;
        } else {
          keywordScore += score;
        }
      }
    }
  }

  // 2. Puntuación basada en similitud semántica (si se provee el embedding)
  let semanticScore = 0;
  if (embedding && embedding.length === CLIMAX_ANCHOR_VECTOR.length) {
    const similarity = cosineSimilarity(embedding, CLIMAX_ANCHOR_VECTOR);
    // Escalar la similitud del coseno (-1 a 1) a un score positivo
    let tempSemantic = Math.max(0, similarity) * 50;
    if (messageCount < 10) {
      tempSemantic *= 0.1;
    } else if (messageCount < 20) {
      tempSemantic *= 0.5;
    } else {
      tempSemantic *= 1.5;
    }
    semanticScore = tempSemantic;
  }

  // Combinación híbrida ponderada
  const finalScore = keywordScore + semanticScore;
  return Math.min(100, Math.max(0, finalScore));
}

/**
 * Aplica el multiplicador de velocidad del clímax al score acumulado.
 * @param currentAccumulatedScore Score total acumulado en el chat.
 * @param climaxSpeed Parámetro de velocidad de clímax ('Fast' | 'Standard' | 'Slow').
 * @returns El multiplicador de incremento.
 */
export function getClimaxMultiplier(climaxSpeed: string): number {
  switch (climaxSpeed) {
    case 'Fast':
      return 1.8;
    case 'Slow':
      return 0.5;
    case 'Standard':
    default:
      return 1.0;
  }
}

/**
 * Determina si se debe disparar el paywall del clímax.
 * @param accumulatedScore El score de tensión acumulado en el chat.
 * @param threshold El límite para el clímax (default: 80).
 * @returns true si se alcanzó el clímax y se debe bloquear la respuesta.
 */
export function shouldTriggerPaywall(accumulatedScore: number, threshold = 80): boolean {
  return accumulatedScore >= threshold;
}
