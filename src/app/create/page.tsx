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
  Dice5, 
  ShieldAlert, 
  UserCheck, 
  Flame, 
  Check, 
  Eye, 
  Compass
} from 'lucide-react';

const POPULAR_NAMES = [
  'Elena', 'Valeria', 'Sofía', 'Camila', 'Isabella', 
  'Victoria', 'Natalia', 'Carolina', 'Lucía', 'Gabriela',
  'Martina', 'Daniela', 'Valentina', 'Andrea', 'Olivia'
];

const AGES = [
  { value: '18', label: 'Joven (18 años)' },
  { value: '22', label: 'Universitaria (22 años)' },
  { value: '28', label: 'Madura Joven (28 años)' },
  { value: '38', label: 'Madura / MILF (38 años)' },
  { value: '45', label: 'Experimentada (45 años)' }
];

const BUILDS = ['Delgada', 'Atlética', 'Reloj de arena', 'Curvy'];
const EYE_COLORS = ['Azules', 'Verdes', 'Avellana', 'Oscuros'];
const HAIR_STYLES = ['Rubio largo', 'Castaño ondulado', 'Pelirrojo corto', 'Negro lacio', 'Cabello de fantasía'];
const SKIN_TONES = ['Clara', 'Bronceada', 'Trigueña', 'Oscura'];

const PERSONALITIES = [
  { value: 'Seductora', label: 'Seductora y Coqueta', desc: 'Le fascina jugar con fuego, insinuarse y mantener el control de la seducción.' },
  { value: 'Sumisa', label: 'Sumisa y Dulce', desc: 'Atenta, cariñosa y complaciente. Busca agradarte y dejarse llevar por tus decisiones.' },
  { value: 'Fría', label: 'Fría y Dominante', desc: 'Exigente, distante y autoritaria. Valora la obediencia y requiere esfuerzo para doblegarse.' },
  { value: 'Rebelde', label: 'Rebelde y Salvaje', desc: 'Independiente, impulsiva y sin filtros. Directa en lo que quiere y muy intensa.' }
];

const DIALECTS = [
  { value: 'Neutro', label: 'Neutro', desc: 'Español estándar de chat' },
  { value: 'Argentina', label: 'Argentina', desc: 'Voseo rioplatense (che, vos tenés)' },
  { value: 'España', label: 'España', desc: 'Vosotros y modismos ibéricos (tío, vale)' },
  { value: 'México', label: 'México', desc: 'Tuteo e inflexiones locales (güey, qué onda)' },
  { value: 'Colombia', label: 'Colombia', desc: 'Ustedeo cariñoso (usted quiere, mi amor)' }
];

const CLIMAX_SPEEDS = [
  { value: 'Slow', label: 'Lento (Slow Burn - Recomendado)', desc: 'Requiere seducción real, resistencia narrativa y juego previo prolongado.' },
  { value: 'Standard', label: 'Estándar', desc: 'Conversación balanceada hacia la intimidad a ritmo natural.' }
];

export default function CreateAgentPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Paso del asistente (1 a 5)
  const [step, setStep] = useState(1);

  // Estados de carga de generación
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

  // Atributos seleccionados
  const [name, setName] = useState('');
  const [age, setAge] = useState('22');
  const [build, setBuild] = useState('Atlética');
  const [eyes, setEyes] = useState('Verdes');
  const [hair, setHair] = useState('Castaño ondulado');
  const [skin, setSkin] = useState('Clara');
  const [personality, setPersonality] = useState('Seductora');
  const [dialect, setDialect] = useState('Neutro');
  const [climaxSpeed, setClimaxSpeed] = useState('Slow');

  // Nombres mostrados en el Paso 1
  const [shuffledNames, setShuffledNames] = useState<string[]>([]);

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
      
      const premiumStatus = !!profile?.is_premium;
      setIsPremium(premiumStatus);

      // Barajar nombres populares para mostrar 6 iniciales
      shuffleNameList();

      setLoading(false);
    }
    checkAuth();
  }, [router]);

  const shuffleNameList = () => {
    const shuffled = [...POPULAR_NAMES].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 6);
    setShuffledNames(selected);
    setName(selected[0]);
  };

  const handleGenerateCharacter = async () => {
    if (!user || !isPremium) return;
    setGenerating(true);
    setGenerationStep('Modelando la psicología de la IA...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // 1. Iniciar petición de generación de texto e imagen con IA
      setGenerationStep('Pintando retrato fotorrealista con IA...');
      const response = await fetch('/api/character/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name,
          age,
          build,
          eyes,
          hair,
          skin,
          personality,
          dialect,
          climaxSpeed
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar el personaje en el servidor.');
      }

      setGenerationStep('Subiendo avatar a la nube...');
      const result = await response.json();

      setGenerationStep('Guardando agente en Supabase...');
      // Redirigir al chat-redirect para iniciar la conversación
      router.push(`/chat-redirect?characterId=${result.characterId}`);

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Ocurrió un error en el proceso de generación con IA.');
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

  // 1. PANTALLA DE BLOQUEO PARA USUARIOS GRATUITOS
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

  // 2. INTERFAZ DE GENERACIÓN (PANTALLA DE CARGA CON IA)
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
            Esto puede tardar unos 10-15 segundos. Estamos modelando la personalidad con OpenRouter y pintando el retrato fotorrealista a través de Pollinations.ai.
          </p>
        </div>
      </div>
    );
  }

  // 3. WIZARD INTERACTIVO PASO A PASO
  return (
    <div className="bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full font-sans pb-24 md:pb-8 flex flex-col justify-center min-h-[calc(100vh-80px)]">
      {/* Header del Wizard */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : router.push('/')}
          className="flex items-center gap-1 text-xs font-bold text-zinc-450 hover:text-zinc-200 transition-colors uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
          Atrás
        </button>
        <span className="text-xs text-zinc-500 font-bold tracking-widest uppercase">
          Paso {step} de 5
        </span>
      </div>

      {/* Indicador de Barra de Progreso */}
      <div className="w-full bg-zinc-900 h-1.5 rounded-full mb-8 overflow-hidden">
        <div 
          className="bg-neon-brand h-full transition-all duration-300 shadow-[0_0_8px_rgba(236,72,153,0.5)]" 
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-xs">
        
        {/* PASO 1: SELECCIÓN DE NOMBRE */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-zinc-50 tracking-tight flex items-center gap-2">
                <Dice5 className="h-5 w-5 text-pink-400" />
                Elige el Nombre
              </h2>
              <p className="text-xs text-zinc-400">Selecciona el nombre de tu acompañante o genera opciones aleatorias.</p>
            </div>

            {/* Grid de opciones de nombres */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {shuffledNames.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setName(n)}
                  className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    name === n 
                      ? 'border-pink-500 bg-pink-950/15 text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.1)]' 
                      : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Botón para rebarajar */}
            <button
              type="button"
              onClick={shuffleNameList}
              className="w-full flex items-center justify-center gap-2 border border-zinc-850 bg-zinc-900/10 hover:bg-zinc-900/30 rounded-xl py-2.5 text-xs font-bold text-zinc-300 transition-colors cursor-pointer"
            >
              <Dice5 className="h-4 w-4 text-zinc-400" />
              Barajar Nombres Nuevos
            </button>
          </div>
        )}

        {/* PASO 2: RASCACELOS FÍSICOS (EDAD, COMPLEXIÓN, OJOS, PELO, PIEL) */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-zinc-50 tracking-tight flex items-center gap-2">
                <Eye className="h-5 w-5 text-pink-400" />
                Rasgos Físicos
              </h2>
              <p className="text-xs text-zinc-400">Define los atributos estéticos para el retrato de la IA.</p>
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

            {/* Contextura */}
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Contextura / Cuerpo</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BUILDS.map((b) => (
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
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Estilo y Color de Cabello</span>
              <div className="flex flex-wrap gap-2">
                {HAIR_STYLES.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHair(h)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
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

            {/* Ojos y Piel (Fila de 2 Columnas) */}
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
          </div>
        )}

        {/* PASO 3: PERSONALIDAD */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-zinc-50 tracking-tight flex items-center gap-2">
                <Flame className="h-5 w-5 text-pink-400" />
                Personalidad Dominante
              </h2>
              <p className="text-xs text-zinc-400">Determina su comportamiento y la forma en que reaccionará en el chat.</p>
            </div>

            <div className="space-y-3">
              {PERSONALITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPersonality(p.value)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-start ${
                    personality === p.value 
                      ? 'border-pink-500 bg-pink-950/10 shadow-[0_0_12px_rgba(236,72,153,0.06)]' 
                      : 'border-zinc-850 bg-zinc-900/20 text-zinc-400 hover:border-zinc-800'
                  }`}
                >
                  <div className="space-y-1 pr-4">
                    <span className={`text-sm font-bold block ${personality === p.value ? 'text-pink-400' : 'text-zinc-200'}`}>
                      {p.label}
                    </span>
                    <span className="text-xs text-zinc-500 leading-relaxed block">{p.desc}</span>
                  </div>
                  {personality === p.value && (
                    <div className="rounded-full bg-pink-500 p-1 shrink-0 mt-0.5 shadow-[0_0_6px_rgba(236,72,153,0.3)]">
                      <Check className="h-3 w-3 text-zinc-50" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASO 4: DIALECTO Y RITMO */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-zinc-50 tracking-tight flex items-center gap-2">
                <Compass className="h-5 w-5 text-pink-400" />
                Parámetros de Roleplay
              </h2>
              <p className="text-xs text-zinc-400">Configura su acento regional y el ritmo de la tensión del chat.</p>
            </div>

            {/* Dialecto */}
            <div className="space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                Acento y Dialecto Regional
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DIALECTS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDialect(d.value)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      dialect === d.value 
                        ? 'border-pink-500 bg-pink-950/15 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.08)]' 
                        : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span className="block text-xs font-bold">{d.label}</span>
                    <span className="block text-[10px] text-zinc-500 mt-0.5">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ritmo de Clímax */}
            <div className="space-y-3 pt-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-450 flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5 text-zinc-500" />
                Velocidad de Clímax (Progreso de Historia)
              </span>
              <div className="space-y-2">
                {CLIMAX_SPEEDS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setClimaxSpeed(s.value)}
                    className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex justify-between items-center ${
                      climaxSpeed === s.value 
                        ? 'border-pink-500 bg-pink-950/15 text-pink-400' 
                        : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <span className="block text-xs font-bold">{s.label}</span>
                      <span className="block text-[10px] text-zinc-500 mt-0.5">{s.desc}</span>
                    </div>
                    {climaxSpeed === s.value && (
                      <div className="rounded-full bg-pink-500 p-0.5 shrink-0">
                        <Check className="h-3 w-3 text-zinc-50" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PASO 5: RESUMEN Y GENERACIÓN */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-zinc-50 tracking-tight flex items-center gap-2">
                <Sparkle className="h-5 w-5 text-pink-400" />
                Ficha del Agente
              </h2>
              <p className="text-xs text-zinc-400">Revisa la configuración final antes de pintar el avatar con IA.</p>
            </div>

            {/* Panel de Resumen de Tags */}
            <div className="rounded-2xl border border-zinc-850 bg-zinc-900/20 p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <span className="text-sm font-black text-zinc-50">{name}</span>
                <span className="text-xs text-zinc-500">{age} años</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-300">
                  Cuerpo: <span className="font-semibold text-zinc-200 ml-1">{build}</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-300">
                  Ojos: <span className="font-semibold text-zinc-200 ml-1">{eyes}</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-300">
                  Cabello: <span className="font-semibold text-zinc-200 ml-1">{hair}</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-300">
                  Piel: <span className="font-semibold text-zinc-200 ml-1">{skin}</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-300">
                  Personalidad: <span className="font-semibold text-zinc-200 ml-1">{personality}</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-zinc-900 border border-zinc-850 px-3 py-1 text-xs text-zinc-300">
                  Dialecto: <span className="font-semibold text-zinc-200 ml-1">{dialect}</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-pink-950/15 border border-pink-900/30 px-3 py-1 text-xs text-pink-450 font-bold">
                  Clímax: <span className="ml-1">{climaxSpeed === 'Slow' ? 'Lento (Slow Burn)' : 'Estándar'}</span>
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950 border border-zinc-900/80 p-4 text-[11px] text-zinc-500 leading-relaxed">
              💡 **Detalle Técnico:** Al confirmar, desactivaremos el filtro de seguridad de la API de Pollinations (`safe=false`) e inyectaremos descriptores fotorrealistas de alta calidad para crear un avatar estético y sugerente de {name}.
            </div>
          </div>
        )}

        {/* Botones de Navegación del Formulario */}
        <div className="flex justify-between items-center pt-5 border-t border-zinc-900">
          <button
            type="button"
            onClick={() => step > 1 ? setStep(step - 1) : router.push('/')}
            className="rounded-xl border border-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-450 hover:text-zinc-200 hover:bg-zinc-900/50 transition-colors cursor-pointer"
          >
            {step === 1 ? 'Cancelar' : 'Anterior'}
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
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
