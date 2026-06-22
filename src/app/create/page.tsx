'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Plus, MapPin, Gauge, Image as ImageIcon, Camera, AlertCircle, ArrowLeft } from 'lucide-react';

export default function CreateAgentPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Campos del formulario
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [greeting, setGreeting] = useState('');
  const [dialect, setDialect] = useState('Neutro');
  const [climaxSpeed, setClimaxSpeed] = useState('Standard');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Error al subir el archivo al servidor.');
      }

      const data = await response.json();
      setAvatarUrl(data.url);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('No se pudo subir la imagen. Intenta ingresar una URL directa de imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setErrorMsg('');

    if (!name || !personality || !greeting) {
      setErrorMsg('Por favor, completa los campos requeridos (Nombre, Personalidad y Saludo).');
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('characters')
        .insert({
          user_id: user.id,
          name,
          personality_description: personality,
          initial_greeting: greeting,
          avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop',
          default_language: 'es',
          default_country: dialect,
          climax_speed: climaxSpeed
        });

      if (error) throw error;
      router.push('/');
    } catch (err: any) {
      console.error('Error creating character:', err);
      setErrorMsg(err.message || 'Error al guardar el personaje en la base de datos.');
    } finally {
      setSaving(false);
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
    <div className="bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full font-sans pb-24 md:pb-8">
      <div className="flex items-center gap-2 mb-6 text-zinc-450 hover:text-zinc-200 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <button onClick={() => router.push('/')} className="text-xs font-bold uppercase tracking-wider">
          Volver a Agentes
        </button>
      </div>

      <div className="border-b border-zinc-900 pb-6 mb-8">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent w-fit flex items-center gap-2">
          Crear Nuevo Agente
        </h1>
        <p className="mt-1.5 text-xs text-zinc-400">Define su identidad, historia y parámetros de conversación.</p>
      </div>

      {errorMsg && (
        <div className="mb-6 rounded-xl bg-red-950/20 border border-red-900/50 p-4 text-sm text-red-400 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identidad del Agente */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-6 space-y-6">
          <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-900 pb-3">Identidad Básica</h3>

          {/* Nombre */}
          <div>
            <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-zinc-450">
              Nombre del Agente <span className="text-pink-500">*</span>
            </label>
            <div className="mt-2">
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-zinc-100 placeholder:text-zinc-550 focus:border-pink-500 focus:outline-none focus:ring-0 text-base transition-colors"
                placeholder="Elena (La Madrastra)"
              />
            </div>
          </div>

          {/* Avatar Upload */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-450">Avatar de Perfil</label>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative h-16 w-16 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-zinc-650" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-zinc-950/80 flex items-center justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border border-zinc-700 border-t-zinc-100"></div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer rounded-xl border border-zinc-850 bg-zinc-900/50 hover:bg-zinc-800 px-3 py-2 text-xs text-zinc-300 font-bold transition-colors">
                    <Camera className="h-3.5 w-3.5" />
                    Subir Imagen
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-zinc-500">Se guardará en Cloudinary. Se recomiendan fotos realistas.</p>
              </div>
            </div>

            <div className="mt-4">
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-zinc-100 placeholder:text-zinc-550 focus:border-pink-500 focus:outline-none focus:ring-0 text-base transition-colors font-mono"
                placeholder="O ingresa una URL de imagen externa..."
              />
            </div>
          </div>
        </div>

        {/* Psicología del Agente */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-6 space-y-6">
          <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-900 pb-3">Psicología y Diálogos</h3>

          {/* Personalidad */}
          <div>
            <label htmlFor="personality" className="block text-xs font-bold uppercase tracking-wider text-zinc-450">
              Descripción de Personalidad y Contexto <span className="text-pink-500">*</span>
            </label>
            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
              Describe quién es, su relación con el usuario, cómo se comporta, sus secretos o fetiches. Cuanto más detallado, más inmersiva la conversación.
            </p>
            <div className="mt-2.5">
              <textarea
                id="personality"
                rows={4}
                required
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-zinc-100 placeholder:text-zinc-550 focus:border-pink-500 focus:outline-none focus:ring-0 text-base transition-colors resize-none leading-relaxed"
                placeholder="Elena tiene 38 años y es tu madrastra..."
              />
            </div>
          </div>

          {/* Saludo Inicial */}
          <div>
            <label htmlFor="greeting" className="block text-xs font-bold uppercase tracking-wider text-zinc-450">
              Mensaje Inicial / Saludo <span className="text-pink-500">*</span>
            </label>
            <p className="text-[10px] text-zinc-500 mt-1">El primer mensaje con el que el agente iniciará la conversación.</p>
            <div className="mt-2.5">
              <textarea
                id="greeting"
                rows={2}
                required
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-zinc-100 placeholder:text-zinc-550 focus:border-pink-500 focus:outline-none focus:ring-0 text-base transition-colors resize-none leading-relaxed"
                placeholder="Hola, cariño. Pensé que no volverías hoy..."
              />
            </div>
          </div>
        </div>

        {/* Configuración Avanzada */}
        <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-6 space-y-6">
          <div className="flex items-center gap-1.5 border-b border-zinc-900 pb-3">
            <h3 className="text-sm font-semibold text-zinc-200">Parámetros de Conversación</h3>
            {!isPremium && (
              <span className="rounded-md bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[9px] text-zinc-500 font-semibold tracking-wide">
                PREMIUM REQUERIDO
              </span>
            )}
          </div>

          {/* Dialecto / Localismo */}
          <div>
            <label htmlFor="dialect" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-zinc-450">
              <MapPin className="h-3.5 w-3.5 text-zinc-500" />
              Dialecto y Acento
            </label>
            <select
              id="dialect"
              value={dialect}
              onChange={(e) => setDialect(e.target.value)}
              disabled={!isPremium}
              className="mt-2 block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-zinc-100 focus:border-pink-500 focus:outline-none focus:ring-0 text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="Neutro">Neutro (Español estándar de chat)</option>
              <option value="Argentina">Argentina (Voseo rioplatense)</option>
              <option value="España">España (Vosotros y modismos)</option>
              <option value="México">México (Tuteo e inflexiones locales)</option>
              <option value="Colombia">Colombia (Ustedeo cariñoso)</option>
            </select>
            {!isPremium && (
              <p className="text-[10px] text-zinc-650 mt-1">El acento por país se activa al ser usuario Premium. En modo Free hablará en Neutro.</p>
            )}
          </div>

          {/* Velocidad de Clímax */}
          <div>
            <label htmlFor="climax" className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-zinc-450">
              <Gauge className="h-3.5 w-3.5 text-zinc-500" />
              Velocidad de Clímax
            </label>
            <select
              id="climax"
              value={climaxSpeed}
              onChange={(e) => setClimaxSpeed(e.target.value)}
              disabled={!isPremium}
              className="mt-2 block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-zinc-100 focus:border-pink-500 focus:outline-none focus:ring-0 text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="Fast">Rápido (Clímax explícito a los 5-10 mensajes)</option>
              <option value="Standard">Estándar (Conversación balanceada, 15-20 mensajes)</option>
              <option value="Slow">Lento (Juego previo largo, 30+ mensajes)</option>
            </select>
            {!isPremium && (
              <p className="text-[10px] text-zinc-650 mt-1">El control de velocidad y ritmo del clímax requiere suscripción Premium.</p>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-xl border border-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-450 hover:text-zinc-200 hover:bg-zinc-900/50 transition-colors"
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            disabled={saving || uploading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-neon-brand px-4 py-2.5 text-xs font-bold text-zinc-50 shadow-[0_0_10px_rgba(236,72,153,0.25)] hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Crear Agente'}
          </button>
        </div>
      </form>
    </div>
  );
}
