// Salvaguardas de edad para los prompts de imagen.
// Las imágenes (y en especial las explícitas) nunca deben poder representar a menores
// ni personas de aspecto infantil, sin importar lo que escriba el usuario o el LLM.

// Edad mínima aparente que se envía al modelo de imagen. Los números bajos ("18 years old")
// junto a palabras como "young" empujan a los modelos hacia rasgos aniñados.
const MIN_RENDERED_AGE = 25;

export function adultAgeDescriptor(age: string | number): string {
  const parsed = parseInt(String(age), 10);
  const rendered = Number.isFinite(parsed) ? Math.max(MIN_RENDERED_AGE, parsed) : MIN_RENDERED_AGE;
  return `${rendered} years old adult`;
}

// Refuerzo que se agrega a todo prompt de imagen.
export const ADULT_PROMPT_GUARD = 'clearly adult, mature adult face and body proportions';

// Términos (inglés y español) que indican minoría de edad o contexto escolar infantil.
const MINOR_PATTERNS: RegExp[] = [
  /\b(child|children|kid|kids|toddler|infant|baby ?face)\b/i,
  /\b(teen|teens|teenage|teenager|preteen|pre-teen|adolescent|underage|under-age|minor|minors)\b/i,
  /\b(loli|lolita|shota|jailbait)\b/i,
  /\b(schoolgirl|schoolboy|school ?uniform|middle ?school|elementary ?school|high ?school (student|girl|boy))\b/i,
  /\b(little|young) (girl|boy)\b/i,
  /\b(niña|niñas|niño|niños|nena|nenas|nene|menor|menores|adolescente|adolescentes|colegiala|colegialas|colegial|escolar|uniforme escolar|primaria|secundaria|quinceañera|chiquilla)\b/i,
  /\b([1-9]|1[0-7]) ?(years? old|yo|y\/o|años)\b/i,
  /\bde ([1-9]|1[0-7]) años\b/i
];

export function containsMinorReference(...texts: (string | null | undefined)[]): boolean {
  return texts.some((t) => !!t && MINOR_PATTERNS.some((re) => re.test(t)));
}

export const MINOR_BLOCK_MESSAGE =
  'Contenido bloqueado: los personajes y escenas deben ser exclusivamente de personas adultas. Edita el texto y vuelve a intentarlo.';
