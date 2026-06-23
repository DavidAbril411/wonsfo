'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Sparkle, 
  MapPin, 
  Gauge, 
  ShieldAlert, 
  Flame, 
  Check, 
  Eye, 
  Compass,
  User,
  Heart,
  Smile,
  MessageSquare
} from 'lucide-react';

const AGES = [
  { value: '18', label: 'Joven (18 años)' },
  { value: '22', label: 'Universitaria (22 años)' },
  { value: '28', label: 'Madura Joven (28 años)' },
  { value: '38', label: 'Madura / MILF (38 años)' },
  { value: '45', label: 'Experimentada (45 años)' }
];

const BUILDS_FEMALE = ['Delgada', 'Atlética', 'Reloj de arena', 'Curvy'];
const BUILDS_MALE = ['Delgada', 'Atlética', 'Musculosa', 'Rellenita'];
const EYE_COLORS = ['Azules', 'Verdes', 'Avellana', 'Oscuros'];

const HAIR_STYLES = [
  'Rubio', 
  'Castaño ondulado', 
  'Pelirrojo', 
  'Negro lacio', 
  'Cabello rosa', 
  'Cabello plateado', 
  'Cabello azul'
];

const SKIN_TONES = ['Clara', 'Bronceada', 'Trigueña', 'Oscura'];

const HAIR_LENGTHS = ['Corto', 'Mediano', 'Largo', 'Muy largo'];
const BREAST_SIZES = ['Sin senos (Plano)', 'Pequeños', 'Medianos', 'Grandes', 'Muy grandes'];
const WAIST_BUTT_SHAPES = ['Estándar', 'Cintura fina y culo estándar', 'Cintura fina y culo grande', 'Reloj de arena pronunciado', 'Caderas anchas'];
const MUSCLE_AMOUNTS = ['Normal / Sin entrenar', 'Definido / Atlético', 'Musculoso / Culturista', 'Fuerte / Voluminoso'];
const BEARD_STYLES = ['Afeitado / Sin barba', 'Barba de 3 días', 'Barba tupida', 'Perilla / Candado'];

const ETHNICITIES = [
  { value: 'Caucásica', label: 'Caucásica / Blanca' },
  { value: 'Latina', label: 'Latina' },
  { value: 'Asiática', label: 'Asiática' },
  { value: 'Africana', label: 'Africana' },
  { value: 'Árabe', label: 'Árabe' },
  { value: 'Mixta', label: 'Etnia Mixta' }
];

const RELATIONSHIPS = [
  { value: 'Ninguna', label: 'Desconocido / Ninguna' },
  { value: 'Novia/o', label: 'Novia / Novio' },
  { value: 'Madrastra/Padrastro', label: 'Madrastra / Padrastro' },
  { value: 'Jefa/Jefe', label: 'Jefa / Jefe' },
  { value: 'Amiga/o', label: 'Mejor Amiga / Amigo' },
  { value: 'Vecina/o', label: 'Vecina / Vecino' }
];

const PERSONALITIES = [
  { value: 'Seductora', label: 'Seductora / Coqueta', desc: 'Le fascina jugar con fuego, insinuarse y mantener el control de la seducción.' },
  { value: 'Sumisa', label: 'Sumisa / Dulce', desc: 'Atenta, cariñosa y complaciente. Busca agradarte y dejarse llevar.' },
  { value: 'Fría', label: 'Fría / Dominante', desc: 'Exigente, distante y autoritaria. Valora la obediencia y requiere esfuerzo.' },
  { value: 'Rebelde', label: 'Rebelde / Salvaje', desc: 'Independiente, impulsiva y sin filtros. Directa en lo que quiere.' }
];

const DIALECTS = [
  { value: 'Neutro', label: 'Neutro', desc: 'Español estándar de chat' },
  { value: 'Argentina', label: 'Argentina', desc: 'Voseo rioplatense (che, vos tenés)' },
  { value: 'España', label: 'España', desc: 'Vosotros y modismos ibéricos (tío, vale)' },
  { value: 'México', label: 'México', desc: 'Tuteo e inflexiones locales (güey, qué onda)' },
  { value: 'Colombia', label: 'Colombia', desc: 'Ustedeo cariñoso (usted quiere)' }
];

const CLIMAX_SPEEDS = [
  { value: 'Slow', label: 'Lento (Slow Burn - Recomendado)', desc: 'Requiere seducción real y juego previo prolongado.' },
  { value: 'Standard', label: 'Estándar', desc: 'Conversación balanceada hacia la intimidad a ritmo natural.' }
];

export default function CreateAgentPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Paso del asistente (0 a 5)
  const [step, setStep] = useState(0);

  // Estados de carga de generación
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

  // Atributos seleccionados
  const [gender, setGender] = useState<'Mujer' | 'Hombre' | 'Trans'>('Mujer');
  const [artStyle, setArtStyle] = useState<'Real' | 'Anime'>('Real');
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Ninguna');
  const [age, setAge] = useState('22');
  const [build, setBuild] = useState('Atlética');
  const [eyes, setEyes] = useState('Verdes');
  const [hair, setHair] = useState('Castaño ondulado');
  const [ethnicity, setEthnicity] = useState('Latina');
  const [skin, setSkin] = useState('Clara');
  const [personality, setPersonality] = useState('Seductora');
  const [contextDetails, setContextDetails] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [dialect, setDialect] = useState('Neutro');
  const [climaxSpeed, setClimaxSpeed] = useState('Slow');
  
  const [hairLength, setHairLength] = useState('Largo');
  const [breastSize, setBreastSize] = useState('Medianos');
  const [waistButt, setWaistButt] = useState('Estándar');
  const [muscleAmount, setMuscleAmount] = useState('Normal / Sin entrenar');
  const [beardStyle, setBeardStyle] = useState('Afeitado / Sin barba');
  
  // Saludo manual o automático
  const [greetingChoice, setGreetingChoice] = useState<'generate' | 'manual'>('generate');
  const [manualGreeting, setManualGreeting] = useState('');

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Cargar perfil premium
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', session.user.id)
        .single();
      
      setIsPremium(!!profile?.is_premium);
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  // Asegurar que la complexión seleccionada sea compatible si se cambia el género
  useEffect(() => {
    if (gender === 'Hombre') {
      if (!BUILDS_MALE.includes(build)) {
        setBuild('Atlética');
      }
    } else {
      if (!BUILDS_FEMALE.includes(build)) {
        setBuild('Atlética');
      }
    }
  }, [gender]);

  const handleGenerateCharacter = async () => {
    if (!user || !isPremium) return;
    if (!name.trim()) {
      alert("Por favor escribe el nombre de tu personaje.");
      setStep(1);
      return;
    }
    if (greetingChoice === 'manual' && !manualGreeting.trim()) {
      alert("Por favor escribe el saludo del personaje.");
      setStep(4);
      return;
    }

    setGenerating(true);
    setGenerationStep('Modelando la psicología de la IA...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      setGenerationStep('Pintando retrato con IA (Pollinations)...');
      const response = await fetch('/api/character/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: name.trim(),
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
          contextDetails: contextDetails.trim(),
          startLocation: startLocation.trim(),
          greetingChoice,
          manualGreeting: manualGreeting.trim(),
          hairLength,
          breastSize,
          waistButt,
          muscleAmount,
          beardStyle
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar el personaje.');
      }

      setGenerationStep('Subiendo avatar a Cloudinary...');
      const result = await response.json();

      setGenerationStep('Guardando personaje...');
      router.push(`/chat-redirect?characterId=${result.characterId}`);

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Ocurrió un error en la generación con IA.');
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-50"></div>
      </div>
    );
  }

  // 1. PANTALLA DE BLOQUEO PARA GRATUITOS
  if (!isPremium) {
    return (
      <div className="bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full font-sans pb-24 md:pb-8 flex flex-col justify-center min-h-[calc(100vh-100px)]">
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-8 text-center space-y-6 shadow-xl backdrop-blur-xs">
          <div className="flex justify-center">
            <div className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 p-4 shadow-[0_0_20px_rgba(236,72,153,0.3)]">
              <Sparkles className="h-8 w-8 text-zinc-50 fill-zinc-50" />
            </div>
          </div>

          <h2 className="text-2xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-violet-500 bg-clip-text text-transparent">
            Diseña tu Acompañante con IA
          </h2>
          
          <p className="text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
            El asistente interactivo de creación es una función exclusiva para usuarios **Premium**. Permite configurar rasgos físicos, personalidad, dialecto regional y generar avatares fotorrealistas únicos con IA.
          </p>

          <div className="rounded-xl bg-zinc-950 border border-zinc-900/60 p-4 text-xs text-zinc-500 max-w-sm mx-auto flex items-start gap-2.5 text-left">
            <ShieldAlert className="h-4.5 w-4.5 text-pink-500 shrink-0" />
            <div>
              <p className="font-semibold text-zinc-400">Simulador de Pago Libre</p>
              <p className="mt-0.5">Puedes activar el estado Premium sin costo en la sección Perfil para probar todas las funciones.</p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="rounded-xl border border-zinc-800 px-5 py-3 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Volver a Agentes
            </button>
            <button
              onClick={() => router.push('/profile')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-neon-brand text-zinc-50 px-5 py-3 text-xs font-bold shadow-[0_0_15px_rgba(236,72,153,0.25)] hover:opacity-90 transition-all cursor-pointer"
            >
              Activar Premium en mi Perfil
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. PANTALLA DE CARGA DURANTE LA GENERACIÓN
  if (generating) {
    return (
      <div className="bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8 max-w-md mx-auto w-full font-sans flex flex-col justify-center min-h-[calc(100vh-100px)]">
        <div className="rounded-2xl border border-pink-900/20 bg-zinc-900/10 p-8 text-center space-y-6 shadow-[0_0_30px_rgba(236,72,153,0.05)]">
          <div className="relative flex justify-center py-4">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-850 border-t-pink-500"></div>
            <Sparkle className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-purple-400 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-black text-zinc-50 tracking-tight">Creando Agente con IA</h3>
            <p className="text-xs text-pink-400 font-bold tracking-widest uppercase animate-pulse">{generationStep}</p>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed">
            Esto puede tomar unos 10-15 segundos. OpenRouter redacta el diálogo inicial y la personalidad y Pollinations.ai dibuja la imagen de perfil sin filtros (`safe=false`).
          </p>
        </div>
      </div>
    );
  }

  const buildsToRender = gender === 'Hombre' ? BUILDS_MALE : BUILDS_FEMALE;

  return (
    <div className="bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full font-sans pb-24 md:pb-8 flex flex-col justify-center min-h-[calc(100vh-80px)]">
      {/* Header del Wizard */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => step > 0 ? setStep(step - 1) : router.push('/')}
          className="flex items-center gap-1 text-xs font-bold text-zinc-450 hover:text-zinc-200 transition-colors uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
          Atrás
        </button>
        <span className="text-xs text-zinc-500 font-bold tracking-widest uppercase">
          Paso {step + 1} de 6
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-zinc-900 h-1.5 rounded-full mb-8 overflow-hidden">
        <div 
          className="bg-neon-brand h-full transition-all duration-300 shadow-[0_0_8px_rgba(236,72,153,0.5)]" 
          style={{ width: `${((step + 1) / 6) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-xs">
        
        {/* PASO 0: GÉNERO Y ESTILO ARTÍSTICO */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-zinc-50 tracking-tight flex items-center gap-2">
                <User className="h-5 w-5 text-pink-400" />
                Estilo y Género del Agente
              </h2>
              <p className="text-xs text-zinc-400">Decide el formato y base física del personaje de IA.</p>
            </div>

            {/* Selector de Género */}
            <div className="space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Género de la IA</span>
              <div className="grid grid-cols-3 gap-3">
                {['Mujer', 'Hombre', 'Trans'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g as any)}
                    className={`px-4 py-4 rounded-xl border text-sm font-bold transition-all duration-200 cursor-pointer text-center ${
                      gender === g 
                        ? 'border-pink-500 bg-pink-950/15 text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.1)]' 
                        : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de Estilo Artístico */}
            <div className="space-y-3 pt-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Estilo de Avatar</span>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'Real', label: 'Fotorrealista (Real)', desc: 'Fotografía fotorrealista de retrato en estudio' },
                  { value: 'Anime', label: 'Anime (Ilustración)', desc: 'Diseño anime estilo ilustración digital 2D' }
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setArtStyle(s.value as any)}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                      artStyle === s.value 
                        ? 'border-pink-500 bg-pink-950/15 text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.1)]' 
                        : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span className="block text-sm font-bold">{s.label}</span>
                    <span className="block text-[10px] text-zinc-500 mt-1">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PASO 1: NOMBRE Y RELACIÓN */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-zinc-50 tracking-tight flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-400" />
                Nombre y Relación
              </h2>
              <p className="text-xs text-zinc-400">Define el nombre de tu acompañante y qué rol tiene en tu vida.</p>
            </div>

            {/* Entrada del Nombre */}
            <div className="space-y-2">
              <label htmlFor="char-name" className="block text-xs font-bold uppercase tracking-wider text-zinc-450">
                Nombre del Acompañante
              </label>
              <input
                id="char-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={gender === 'Hombre' ? 'Ej. Mateo, Carlos...' : 'Ej. Elena, Sofía...'}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-zinc-150 placeholder:text-zinc-600 focus:border-pink-500/50 focus:outline-hidden focus:ring-1 focus:ring-pink-500/20 text-base transition-all"
              />
            </div>

            {/* Selector de Relación */}
            <div className="space-y-2 pt-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Relación Contigo</span>
              <div className="grid grid-cols-2 gap-2.5">
                {RELATIONSHIPS.map((r) => {
                  let displayLabel = r.label;
                  // Ajustar etiquetas según el género
                  if (gender === 'Hombre') {
                    displayLabel = r.label.split(' / ').pop() || r.label;
                  } else if (gender === 'Mujer' || gender === 'Trans') {
                    displayLabel = r.label.split(' / ')[0] || r.label;
                  }
                  
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRelationship(r.value)}
                      className={`p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        relationship === r.value 
                          ? 'border-pink-500 bg-pink-950/15 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.08)]' 
                          : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {displayLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PASO 2: RASGOS FÍSICOS (EDAD, COMPLEXIÓN, OJOS, PELO, ETNIA, PIEL) */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-zinc-50 tracking-tight flex items-center gap-2">
                <Eye className="h-5 w-5 text-pink-400" />
                Rasgos Físicos
              </h2>
              <p className="text-xs text-zinc-400">Determina los aspectos estéticos detallados del avatar.</p>
            </div>

            {/* Edad */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Edad</span>
              <div className="flex flex-wrap gap-2">
                {AGES.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAge(a.value)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      age === a.value 
                        ? 'border-pink-500 bg-pink-950/15 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.08)]' 
                        : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Etnia */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Etnia</span>
              <div className="grid grid-cols-3 gap-2">
                {ETHNICITIES.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEthnicity(e.value)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                      ethnicity === e.value 
                        ? 'border-pink-500 bg-pink-950/15 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.08)]' 
                        : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contextura */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Contextura / Complexión</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {buildsToRender.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBuild(b)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                      build === b 
                        ? 'border-pink-500 bg-pink-950/15 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.08)]' 
                        : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Cabello */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Color y Estilo de Cabello</span>
              <div className="flex flex-wrap gap-2">
                {HAIR_STYLES.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHair(h)}
                    className={`px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                      hair === h 
                        ? 'border-pink-500 bg-pink-950/15 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.08)]' 
                        : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Ojos y Piel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Color de Ojos</span>
                <div className="grid grid-cols-2 gap-2">
                  {EYE_COLORS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEyes(e)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        eyes === e 
                          ? 'border-pink-500 bg-pink-950/15 text-pink-400' 
                          : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Tono de Piel</span>
                <div className="grid grid-cols-2 gap-2">
                  {SKIN_TONES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSkin(s)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        skin === s 
                          ? 'border-pink-500 bg-pink-950/15 text-pink-400' 
                          : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Largo de Cabello */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Largo de Cabello</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {HAIR_LENGTHS.map((hl) => (
                  <button
                    key={hl}
                    type="button"
                    onClick={() => setHairLength(hl)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                      hairLength === hl 
                        ? 'border-pink-500 bg-pink-950/15 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.08)]' 
                        : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {hl}
                  </button>
                ))}
              </div>
            </div>

            {/* Opciones condicionales por género */}
            {(gender === 'Mujer' || gender === 'Trans') && (
              <>
                {/* Tamaño de Senos */}
                <div className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Tamaño de Senos</span>
                  <div className="flex flex-wrap gap-2">
                    {BREAST_SIZES.map((bs) => (
                      <button
                        key={bs}
                        type="button"
                        onClick={() => setBreastSize(bs)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          breastSize === bs 
                            ? 'border-pink-500 bg-pink-950/15 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.08)]' 
                            : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {bs}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cintura / Culo */}
                <div className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Silueta / Cintura y Caderas</span>
                  <div className="flex flex-wrap gap-2">
                    {WAIST_BUTT_SHAPES.map((wb) => (
                      <button
                        key={wb}
                        type="button"
                        onClick={() => setWaistButt(wb)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          waistButt === wb 
                            ? 'border-pink-500 bg-pink-950/15 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.08)]' 
                            : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {wb}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {gender === 'Hombre' && (
              <>
                {/* Nivel de Musculatura */}
                <div className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Nivel de Musculatura</span>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLE_AMOUNTS.map((ma) => (
                      <button
                        key={ma}
                        type="button"
                        onClick={() => setMuscleAmount(ma)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          muscleAmount === ma 
                            ? 'border-pink-500 bg-pink-950/15 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.08)]' 
                            : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {ma}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estilo de Barba */}
                <div className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Vello Facial / Barba</span>
                  <div className="flex flex-wrap gap-2">
                    {BEARD_STYLES.map((bs) => (
                      <button
                        key={bs}
                        type="button"
                        onClick={() => setBeardStyle(bs)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          beardStyle === bs 
                            ? 'border-pink-500 bg-pink-950/15 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.08)]' 
                            : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {bs}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* PASO 3: PERSONALIDAD Y CONTEXTO LIBRE */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-zinc-50 tracking-tight flex items-center gap-2">
                <Smile className="h-5 w-5 text-pink-400" />
                Personalidad y Contexto
              </h2>
              <p className="text-xs text-zinc-400">Decide cómo se comporta e introduce detalles sobre su profesión o qué está haciendo.</p>
            </div>

            {/* Personalidades */}
            <div className="space-y-2.5">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Comportamiento</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERSONALITIES.map((p) => {
                  let label = p.label;
                  if (gender === 'Hombre') {
                    label = p.label.split(' / ').pop() || p.label;
                  } else {
                    label = p.label.split(' / ')[0] || p.label;
                  }

                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPersonality(p.value)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex justify-between items-start ${
                        personality === p.value 
                          ? 'border-pink-500 bg-pink-950/10 shadow-[0_0_10px_rgba(236,72,153,0.05)]' 
                          : 'border-zinc-850 bg-zinc-900/20 text-zinc-400 hover:border-zinc-800'
                      }`}
                    >
                      <div>
                        <span className={`text-xs font-bold block ${personality === p.value ? 'text-pink-400' : 'text-zinc-200'}`}>
                          {label}
                        </span>
                        <span className="text-[10px] text-zinc-500 mt-1 leading-normal block">{p.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detalles de Contexto / Profesión (Texto Libre) */}
            <div className="space-y-2 pt-2">
              <label htmlFor="context-desc" className="block text-xs font-bold uppercase tracking-wider text-zinc-450">
                Profesión, entorno o escena de inicio (Texto libre)
              </label>
              <textarea
                id="context-desc"
                rows={3}
                value={contextDetails}
                onChange={(e) => setContextDetails(e.target.value)}
                placeholder={gender === 'Hombre' ? 'Ej: Es un detective privado investigando un caso en tu casa de noche...' : 'Ej: Es una joven secretaria trabajando tarde en la oficina contigo...'}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-zinc-100 placeholder:text-zinc-650 focus:border-pink-500/50 focus:outline-hidden focus:ring-1 focus:ring-pink-500/20 text-base transition-all resize-none leading-relaxed"
              />
              <p className="text-[10px] text-zinc-500 leading-normal">
                Esta descripción se traducirá para vestir al avatar con IA y contextualizar la historia inicial.
              </p>
            </div>

            {/* Lugar de inicio de la historia */}
            <div className="space-y-2 pt-4">
              <div className="flex justify-between items-center">
                <label htmlFor="start-location" className="block text-xs font-bold uppercase tracking-wider text-zinc-450">
                  Lugar donde comienza la historia
                </label>
                <button
                  type="button"
                  onClick={() => setStartLocation('Me da igual (Generado por IA)')}
                  className="px-2 py-1 text-[10px] bg-zinc-900 border border-zinc-850 text-pink-400 font-bold rounded-lg hover:border-pink-500/30 transition-all cursor-pointer"
                >
                  🎲 Me da igual
                </button>
              </div>
              <input
                type="text"
                id="start-location"
                value={startLocation}
                onChange={(e) => setStartLocation(e.target.value)}
                placeholder="Ej: En un café lluvioso, una biblioteca antigua, un gimnasio..."
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-zinc-100 placeholder:text-zinc-650 focus:border-pink-500/50 focus:outline-hidden focus:ring-1 focus:ring-pink-500/20 text-base transition-all"
              />
              <p className="text-[10px] text-zinc-500 leading-normal">
                Define el escenario exacto de la primera escena de rol. Si dejas en blanco o usas "Me da igual", la IA elegirá un lugar creativo.
              </p>
            </div>
          </div>
        )}

        {/* PASO 4: ACENTO Y MENSAJE INICIAL */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-zinc-50 tracking-tight flex items-center gap-2">
                <Compass className="h-5 w-5 text-pink-400" />
                Parámetros de Chat y Saludo
              </h2>
              <p className="text-xs text-zinc-400">Elige el dialecto y define cómo quieres que empiece la conversación.</p>
            </div>

            {/* Dialectos */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                Acento Regional
              </span>
              <div className="grid grid-cols-3 gap-2">
                {DIALECTS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDialect(d.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      dialect === d.value 
                        ? 'border-pink-500 bg-pink-950/15 text-pink-400' 
                        : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span className="block text-xs font-bold">{d.label}</span>
                    <span className="block text-[9px] text-zinc-500 mt-0.5 leading-none">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selección de Saludo */}
            <div className="space-y-3 pt-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Primer mensaje (Saludo)</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGreetingChoice('generate')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                    greetingChoice === 'generate' 
                      ? 'border-pink-500 bg-pink-950/15 text-pink-400' 
                      : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Autogenerar con IA
                </button>
                <button
                  type="button"
                  onClick={() => setGreetingChoice('manual')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold ${
                    greetingChoice === 'manual' 
                      ? 'border-pink-500 bg-pink-950/15 text-pink-400' 
                      : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Escribir saludo yo mismo
                </button>
              </div>
            </div>

            {/* Entrada del Saludo Manual */}
            {greetingChoice === 'manual' && (
              <div className="space-y-2 pt-1">
                <label htmlFor="manual-greet" className="block text-xs font-bold uppercase tracking-wider text-zinc-450">
                  Escribe el primer mensaje del personaje
                </label>
                <textarea
                  id="manual-greet"
                  rows={3}
                  value={manualGreeting}
                  onChange={(e) => setManualGreeting(e.target.value)}
                  placeholder="Ej: *Entro a la oficina frotándome los hombros con cansancio y cierro la puerta* ¿Sigues aquí trabajando, che? Pensé que era el único..."
                  className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-zinc-100 placeholder:text-zinc-650 focus:border-pink-500/50 focus:outline-hidden focus:ring-1 focus:ring-pink-500/20 text-base transition-all resize-none leading-relaxed"
                />
                <p className="text-[10px] text-zinc-500">
                  Usa asteriscos `*acciones*` para denotar acciones físicas o de escenario, y comillas para diálogos.
                </p>
              </div>
            )}
          </div>
        )}

        {/* PASO 5: RESUMEN Y CONFIRMACIÓN */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-zinc-50 tracking-tight flex items-center gap-2">
                <Sparkle className="h-5 w-5 text-pink-400" />
                Resumen de la Ficha
              </h2>
              <p className="text-xs text-zinc-400">Revisa la configuración final de tu nuevo acompañante.</p>
            </div>

            <div className="rounded-2xl border border-zinc-850 bg-zinc-900/20 p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <div>
                  <span className="text-sm font-black text-zinc-50 block">{name || 'Sin nombre'}</span>
                  <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">{gender} • Estilo {artStyle}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-300 font-bold block">{age} años</span>
                  <span className="text-[10px] text-pink-400 font-bold block mt-0.5 uppercase tracking-wide">Relación: {relationship}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-350">
                  Cuerpo: <span className="font-semibold text-zinc-200 ml-1">{build}</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-350">
                  Ojos: <span className="font-semibold text-zinc-200 ml-1">{eyes}</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-350">
                  Cabello: <span className="font-semibold text-zinc-200 ml-1">{hair} ({hairLength})</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-350">
                  Piel: <span className="font-semibold text-zinc-200 ml-1">{skin}</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-350">
                  Etnia: <span className="font-semibold text-zinc-200 ml-1">{ethnicity}</span>
                </span>
                {(gender === 'Mujer' || gender === 'Trans') && (
                  <>
                    <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-350">
                      Senos: <span className="font-semibold text-zinc-200 ml-1">{breastSize}</span>
                    </span>
                    <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-350">
                      Cintura/Hips: <span className="font-semibold text-zinc-200 ml-1">{waistButt}</span>
                    </span>
                  </>
                )}
                {gender === 'Hombre' && (
                  <>
                    <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-350">
                      Músculos: <span className="font-semibold text-zinc-200 ml-1">{muscleAmount}</span>
                    </span>
                    <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-350">
                      Barba: <span className="font-semibold text-zinc-200 ml-1">{beardStyle}</span>
                    </span>
                  </>
                )}
                <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-350">
                  Acento: <span className="font-semibold text-zinc-200 ml-1">{dialect}</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-350">
                  Personalidad: <span className="font-semibold text-zinc-200 ml-1">{personality}</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-pink-950/15 border border-pink-900/30 px-3 py-1 text-xs text-pink-400 font-bold">
                  Clímax: <span className="ml-1">{climaxSpeed === 'Slow' ? 'Lento (Slow Burn)' : 'Estándar'}</span>
                </span>
              </div>

              {contextDetails && (
                <div className="pt-2 border-t border-zinc-900 text-xs text-zinc-400 leading-relaxed">
                  <span className="font-bold text-zinc-350 block mb-1">Contexto inicial:</span>
                  "{contextDetails}"
                </div>
              )}

              {startLocation && (
                <div className="pt-2 border-t border-zinc-900 text-xs text-zinc-400 leading-relaxed">
                  <span className="font-bold text-zinc-350 block mb-1">Lugar de inicio:</span>
                  "{startLocation}"
                </div>
              )}
            </div>

            <div className="rounded-xl bg-zinc-950 border border-zinc-900/80 p-4 text-[10px] text-zinc-500 leading-normal flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-pink-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-zinc-400">Instrucciones de Generación de Imagen:</p>
                <p className="mt-0.5">La API llamará a Pollinations con `safe=false` y el modelo `{artStyle === 'Anime' ? 'flux' : 'flux-realism'}` para pintar tu avatar personalizado sin censuras.</p>
              </div>
            </div>
          </div>
        )}

        {/* Botones de Navegación del Formulario */}
        <div className="flex justify-between items-center pt-5 border-t border-zinc-900">
          <button
            type="button"
            onClick={() => step > 0 ? setStep(step - 1) : router.push('/')}
            className="rounded-xl border border-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-450 hover:text-zinc-200 hover:bg-zinc-900/50 transition-colors cursor-pointer"
          >
            Atrás
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !name.trim()) {
                  alert("Por favor escribe el nombre del personaje.");
                  return;
                }
                setStep(step + 1);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-neon-brand text-zinc-50 px-4.5 py-2.5 text-xs font-bold shadow-[0_0_10px_rgba(236,72,153,0.2)] hover:opacity-95 transition-all cursor-pointer"
            >
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerateCharacter}
              className="inline-flex items-center gap-1.5 rounded-xl bg-neon-brand text-zinc-50 px-5 py-3 text-xs font-bold shadow-[0_0_15px_rgba(236,72,153,0.35)] hover:shadow-[0_0_25px_rgba(236,72,153,0.45)] transition-all animate-pulse hover:animate-none cursor-pointer"
            >
              <Sparkles className="h-4 w-4 fill-zinc-50" />
              Generar Agente con IA
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
