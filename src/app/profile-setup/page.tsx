'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Flame, AlertCircle } from 'lucide-react';

export default function ProfileSetupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Cargar perfil para ver si ya tiene los datos
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, gender')
        .eq('id', session.user.id)
        .single();

      if (profile && profile.display_name && profile.gender) {
        // Ya configurado, ir a inicio
        router.push('/');
      } else {
        setLoading(false);
      }
    }
    checkUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaving(true);

    if (!displayName.trim() || !gender) {
      setErrorMsg('Por favor completa todos los campos.');
      setSaving(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesión no encontrada');

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          gender,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (error) throw error;

      router.push('/');
    } catch (err: any) {
      console.error('Error in profile setup:', err);
      setErrorMsg(err.message || 'Error al guardar los datos del perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-50"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-zinc-950 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm flex flex-col items-center">
        {/* Brand Logo & Name */}
        <div className="flex flex-col items-center gap-3">
          <img 
            src="/logo_symbol.jpg" 
            alt="wonsfo logo" 
            className="h-16 w-16 rounded-2xl border border-pink-500/20 shadow-xl shadow-pink-500/5" 
          />
          <div className="flex items-center gap-2">
            <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-pink-500 via-purple-500 to-violet-500 bg-clip-text text-transparent">wonsfo</span>
            <span className="rounded-md bg-pink-950/40 px-1.5 py-0.5 text-xs font-bold text-pink-400 border border-pink-900/40">NSFW</span>
          </div>
        </div>

        <h2 className="mt-6 text-center text-xl font-bold tracking-tight text-zinc-100">
          Completa tu perfil
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400 leading-relaxed">
          Necesitamos conocer tu nombre y tu género para que los personajes de IA puedan dirigirse a ti de forma coherente en los diálogos del chat.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
        {errorMsg && (
          <div className="mb-6 rounded-xl bg-red-950/20 border border-red-900/50 p-4 text-sm text-red-400 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="displayName" className="block text-xs font-bold uppercase tracking-wider text-zinc-450">
              Nombre Real (como te llamarán en la historia)
            </label>
            <div className="mt-2">
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-zinc-150 placeholder:text-zinc-550 focus:border-pink-500 focus:outline-none focus:ring-0 text-base transition-colors"
                placeholder="ej: Lucas, Sofía"
              />
            </div>
          </div>

          <div>
            <label htmlFor="gender" className="block text-xs font-bold uppercase tracking-wider text-zinc-450">
              Género (para pronombres y concordancia)
            </label>
            <div className="mt-2">
              <select
                id="gender"
                name="gender"
                required
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-zinc-150 focus:border-pink-500 focus:outline-none focus:ring-0 text-base transition-colors"
              >
                <option value="">Selecciona tu género</option>
                <option value="Hombre">Hombre (pronombres masculinos)</option>
                <option value="Mujer">Mujer (pronombres femeninos)</option>
                <option value="Trans">Trans (pronombres neutros/femeninos)</option>
              </select>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={saving}
              className="flex w-full justify-center rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-3 py-2.5 text-sm font-bold text-zinc-50 shadow-md hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
            >
              {saving ? 'Guardando...' : 'Comenzar a Jugar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
