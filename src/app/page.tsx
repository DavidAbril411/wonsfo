'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Plus, Users, ShieldAlert, Sparkles, MapPin, Gauge } from 'lucide-react';

// Agentes preconfigurados por defecto si la base de datos está vacía
const DEFAULT_AGENTS = [
  {
    name: 'Elena (La Madrastra)',
    personality_description: 'Elena, tu madrastra de 38 años. Es atractiva, seductora y le fascina jugar con fuego. Recientemente quedó sola en casa y busca llamar tu atención con comentarios insinuantes y dobles sentidos.',
    initial_greeting: 'Hola, cariño. Pensé que no volverías temprano hoy... la casa está tan grande y silenciosa. ¿Por qué no te sientas conmigo en el sofá y me haces compañía?',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    default_language: 'es',
    default_country: 'Neutro',
    climax_speed: 'Standard'
  },
  {
    name: 'Valeria (La Jefa)',
    personality_description: 'Valeria, tu jefa en la oficina, de 32 años. En el trabajo es fría, dominante y extremadamente exigente. Sin embargo, en secreto se siente atraída por ti y busca excusas fuera del horario de oficina para probar tu obediencia.',
    initial_greeting: 'Pasa y cierra la puerta con llave, por favor. Necesito que revisemos unos informes... y no quiero que nadie nos interrumpa a estas horas.',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    default_language: 'es',
    default_country: 'España',
    climax_speed: 'Fast'
  },
  {
    name: 'Sofía (Amiga de la Infancia)',
    personality_description: 'Sofía, tu mejor amiga de toda la vida, ahora de 23 años. Siempre hubo una tensión no resuelta entre ustedes. Hoy te ha invitado a su habitación con la excusa de estudiar, pero sus intenciones son mucho más íntimas.',
    initial_greeting: '¡Ey! Qué bueno que viniste. Pasa, siéntate en la cama si quieres. Estaba pensando que... bueno, tal vez estudiar no sea lo único que podamos hacer hoy.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    default_language: 'es',
    default_country: 'Argentina',
    climax_speed: 'Slow'
  }
];

export default function Dashboard() {
  const router = useRouter();
  const [agents, setAgents] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    async function checkAuthAndFetch() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUser(session.user);
        // Cargar perfil e investigar si está completo
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium, display_name, gender')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setIsPremium(!!profile.is_premium);
          if (!profile.display_name || !profile.gender) {
            router.push('/profile-setup');
            return;
          }

          // Verificar si hay chats de invitados para migrar
          let guestChatKey = '';
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i) || '';
            if (key.startsWith('guest_chat_')) {
              guestChatKey = key;
              break;
            }
          }

          if (guestChatKey) {
            const charId = guestChatKey.replace('guest_chat_', '');
            const stored = localStorage.getItem(guestChatKey);
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                const response = await fetch('/api/chat/migrate-guest', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                  },
                  body: JSON.stringify({ characterId: charId, messages: parsed })
                });

                const data = await response.json();
                if (response.ok && data.success) {
                  localStorage.removeItem(guestChatKey);
                  router.push(`/chat/${data.chatId}`);
                  return;
                }
              } catch (e) {
                console.error('Failed to migrate guest chat:', e);
              }
            }
          }
        }
      }

      try {
        // Cargar personajes de la base de datos de manera pública
        let { data: dbCharacters, error } = await supabase
          .from('characters')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setAgents(dbCharacters || []);
      } catch (err) {
        console.error('Error loading characters:', err);
        setDbError(true);
        setAgents([]);
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndFetch();
  }, [router]);

  const handleStartChat = async (characterId: string) => {
    if (!user) {
      // Redirigir a la landing page pública del personaje para los no registrados
      router.push(`/char/${characterId}`);
      return;
    }

    if (dbError || characterId.startsWith('static-')) {
      alert('Modo offline/Error: No es posible crear chats en Supabase en este momento.');
      return;
    }

    try {
      // 1. Verificar si ya existe un chat activo con este personaje
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('user_id', user.id)
        .eq('character_id', characterId)
        .limit(1)
        .single();

      if (existingChat) {
        router.push(`/chat/${existingChat.id}`);
        return;
      }

      // 2. Si no existe, crear un nuevo chat
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          character_id: characterId
        })
        .select()
        .single();

      if (error) throw error;
      router.push(`/chat/${newChat.id}`);

    } catch (err) {
      console.error('Error starting chat:', err);
      alert('Error al iniciar la conversación.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-50"></div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
      {/* Mensaje de aviso de base de datos */}
      {dbError && (
        <div className="mb-8 rounded-xl bg-amber-950/15 border border-amber-900/40 p-4 text-sm text-amber-400 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold">Conexión a Base de Datos No Detectada</p>
            <p className="mt-1">La aplicación está corriendo en modo demostración. Ejecuta el archivo <code className="bg-amber-950 px-1 rounded">supabase_schema.sql</code> en tu consola de Supabase y configura las credenciales en tu archivo local.</p>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-pink-500 via-purple-500 to-violet-500 bg-clip-text text-transparent">
            Compañeros Virtuales
          </h1>
          <p className="mt-2 text-sm text-zinc-400">Selecciona un agente para iniciar un juego de rol narrativo. Configura su acento o ritmo desde el perfil.</p>
        </div>
        <button
          onClick={() => router.push(user ? '/create' : '/login')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-neon-brand px-4 py-2.5 text-xs font-bold text-zinc-50 shadow-[0_0_10px_rgba(236,72,153,0.2)] hover:opacity-90 transition-all duration-200 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nuevo Agente
        </button>
      </div>

      {/* Grid de Agentes */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex flex-col justify-between rounded-2xl border border-zinc-900 bg-zinc-900/20 p-6 hover:border-pink-500/20 hover:shadow-[0_0_20px_rgba(236,72,153,0.05)] transition-all duration-300"
          >
            <div>
              {/* Avatar & Detalles */}
              <div className="flex items-center gap-4">
                <img
                  src={agent.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop'}
                  alt={agent.name}
                  className="h-16 w-16 rounded-xl object-cover border border-zinc-800/80"
                />
                <div>
                  <h3 className="text-base font-bold text-zinc-50 leading-tight">{agent.name}</h3>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {/* Dialect Indicator */}
                    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-350">
                      <MapPin className="h-3 w-3 text-zinc-500" />
                      {agent.default_country}
                    </span>
                    {/* Speed Indicator */}
                    <span className="inline-flex items-center gap-1 rounded-md bg-pink-950/15 border border-pink-900/30 px-2 py-0.5 text-[10px] text-pink-400 font-semibold">
                      <Gauge className="h-3 w-3 text-pink-500" />
                      Clímax: {agent.climax_speed || 'Standard'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <p className="mt-6 text-sm text-zinc-400 leading-relaxed line-clamp-3">
                {agent.personality_description}
              </p>
            </div>

            {/* Acción */}
            <div className="mt-6 pt-4 border-t border-zinc-900">
              <button
                onClick={() => handleStartChat(agent.id)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 py-2.5 text-xs font-bold text-zinc-200 hover:text-zinc-50 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200"
              >
                <MessageSquare className="h-4 w-4" />
                Chatear
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {agents.length === 0 && (
        <div className="mt-12 text-center border border-dashed border-zinc-800 rounded-2xl py-16 px-4">
          <Users className="mx-auto h-10 w-10 text-zinc-700" />
          <h3 className="mt-4 text-sm font-semibold text-zinc-200">No hay agentes</h3>
          <p className="mt-1 text-xs text-zinc-500">Comienza creando tu propio personaje personalizado.</p>
          <button
            onClick={() => router.push(user ? '/create' : '/login')}
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2 text-xs font-bold text-zinc-50 shadow-md hover:opacity-90 transition-all"
          >
            Crear tu primer Agente
          </button>
        </div>
      )}
    </div>
  );
}
