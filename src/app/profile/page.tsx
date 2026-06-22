'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, Sparkles, Check, X, ShieldAlert, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Cargar datos del perfil
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUsername(profile.username || '');
        setIsPremium(!!profile.is_premium);
      }
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          is_premium: isPremium,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Perfil actualizado con éxito.' });
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setMessage({ type: 'error', text: err.message || 'Error al guardar los datos del perfil.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
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
      <div className="border-b border-zinc-900 pb-6 mb-8">
        <h1 className="text-2xl font-bold text-zinc-50 flex items-center gap-2">
          <User className="h-6 w-6 text-zinc-400" />
          Mi Cuenta
        </h1>
        <p className="mt-1.5 text-xs text-zinc-400">Administra tu perfil e interactúa con el simulador de suscripción.</p>
      </div>

      {message && (
        <div className={`mb-6 rounded-xl p-4 text-sm border ${
          message.type === 'success' 
            ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' 
            : 'bg-red-950/20 border-red-900/50 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Info básica */}
        <div className="rounded-xl border border-zinc-900 bg-zinc-900/20 p-6 space-y-6">
          <h3 className="text-sm font-semibold text-zinc-200 border-b border-zinc-900 pb-3">Información Personal</h3>
          
          <div>
            <label className="block text-xs text-zinc-400 font-medium">Email registrado</label>
            <div className="mt-2 text-sm text-zinc-300 font-mono select-all bg-zinc-900 border border-zinc-900 rounded-xl px-3.5 py-2.5">
              {user?.email}
            </div>
          </div>

          <div>
            <label htmlFor="username" className="block text-xs text-zinc-400 font-medium">Nombre de usuario</label>
            <div className="mt-2">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-pink-500 focus:outline-none focus:ring-0 text-base transition-colors"
                placeholder="Nombre de usuario"
              />
            </div>
          </div>
        </div>

        {/* Simulación Premium */}
        <div className="rounded-xl border border-zinc-900 bg-zinc-900/20 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-zinc-400" />
              Suscripción Premium
            </h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isPremium 
                ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-zinc-50 shadow-[0_0_10px_rgba(236,72,153,0.2)]' 
                : 'bg-zinc-900 text-zinc-500 border border-zinc-850'
            }`}>
              {isPremium ? 'ACTIVA' : 'INACTIVA'}
            </span>
          </div>

          {/* Advertencia del simulador */}
          <div className="rounded-xl bg-zinc-950 border border-zinc-900 p-4 text-xs text-zinc-400 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-zinc-500" />
            <div>
              <p className="font-semibold text-zinc-300">Simulador de Facturación Activado</p>
              <p className="mt-0.5 leading-relaxed">Puedes alternar tu estado Premium libremente para probar los límites y las características de cobro del clímax y configuración de dialecto del MVP sin requerir pagos reales.</p>
            </div>
          </div>

          {/* Toggle de Simulación */}
          <div className="flex items-center justify-between bg-zinc-900/30 border border-zinc-900 rounded-xl p-4">
            <div>
              <p className="text-sm font-medium text-zinc-200">Simular Cuenta Premium</p>
              <p className="text-xs text-zinc-500 mt-0.5">Habilita acentos por país, ritmo de clímax y modelos premium (gpt-oss-120b, Euryale 70B, Cydonia 24B).</p>
            </div>
            
            <button
              type="button"
              onClick={() => setIsPremium(!isPremium)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isPremium ? 'bg-pink-500' : 'bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-950 shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isPremium ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Características Premium */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-400">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-pink-400 shrink-0" />
              <span>Acentos y dialectos locales ilimitados (Argentina, España, México, Colombia).</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-pink-400 shrink-0" />
              <span>Ajustar velocidad del Clímax Narrativo (Rápido, Estándar, Lento).</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-pink-400 shrink-0" />
              <span>Acceso a modelos de alta inteligencia de OpenRouter sin cortes.</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-pink-400 shrink-0" />
              <span>Inferencia de texto descriptivo y libre de censura con Euryale 70B.</span>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-between items-center pt-4 border-t border-zinc-900">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-900 px-3.5 py-2.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-zinc-900/50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2.5 text-xs font-bold text-zinc-50 hover:opacity-90 transition-all disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
