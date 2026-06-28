'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, Sparkles, Check, X, ShieldAlert, LogOut, Coins } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [tokens, setTokens] = useState(0);
  const [unlimitedTokens, setUnlimitedTokens] = useState(false);
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);
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
        setDisplayName(profile.display_name || '');
        setGender(profile.gender || '');
        setIsPremium(!!profile.is_premium);
        setTokens(profile.tokens || 0);
        setUnlimitedTokens(!!profile.unlimited_tokens);
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
          display_name: displayName,
          gender,
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

  const handleBuyTokens = async (packId: string) => {
    setBuyingPackId(packId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ packId })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirigir a Stripe
      } else {
        alert(data.error || 'Error al procesar el pago con Stripe.');
      }
    } catch (err: any) {
      console.error('Stripe redirect error:', err);
      alert('Error inesperado al conectar con Stripe.');
    } finally {
      setBuyingPackId(null);
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
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-zinc-100 placeholder:text-zinc-550 focus:border-pink-500 focus:outline-none focus:ring-0 text-base transition-colors"
                placeholder="Nombre de usuario"
              />
            </div>
          </div>

          <div>
            <label htmlFor="displayName" className="block text-xs text-zinc-400 font-medium">Nombre Real (con el que te llamarán los personajes)</label>
            <div className="mt-2">
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-zinc-100 placeholder:text-zinc-550 focus:border-pink-500 focus:outline-none focus:ring-0 text-base transition-colors"
                placeholder="Tu nombre (ej: Lucas, Sofía)"
              />
            </div>
          </div>

          <div>
            <label htmlFor="gender" className="block text-xs text-zinc-400 font-medium">Género (para adaptar pronombres en los diálogos)</label>
            <div className="mt-2">
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-zinc-100 focus:border-pink-500 focus:outline-none focus:ring-0 text-base transition-colors"
              >
                <option value="">No especificado / Neutro</option>
                <option value="Hombre">Hombre (pronombres masculinos)</option>
                <option value="Mujer">Mujer (pronombres femeninos)</option>
                <option value="Trans">Trans (pronombres neutros/femeninos)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tienda de Tokens */}
        <div className="rounded-xl border border-zinc-900 bg-zinc-900/20 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-pink-400" />
              Tienda de Tokens 🪙
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-zinc-900 text-pink-400 border border-zinc-850">
              {unlimitedTokens ? 'TOKENS ILIMITADOS (ADMIN)' : `${tokens} DISPONIBLES`}
            </span>
          </div>

          {/* Información del Costo de Tokens */}
          <div className="rounded-xl bg-zinc-950 border border-zinc-900 p-4 text-xs text-zinc-400">
            <p className="font-semibold text-zinc-350 mb-2">Costos del Sistema:</p>
            <ul className="space-y-1.5 list-disc list-inside">
              <li><span className="text-zinc-200">Crear un Agente Personalizado</span>: 5 Tokens</li>
              <li><span className="text-zinc-200">Generar una Escena de Imagen (📸)</span>: 2 Tokens</li>
              <li><span className="text-zinc-200">Desbloquear el Clímax de un Chat</span>: 5 Tokens</li>
              <li><span className="text-zinc-200">Enviar mensajes de conversación</span>: <span className="text-emerald-400 font-semibold">¡Totalmente Gratis!</span></li>
            </ul>
          </div>

          {/* Listado de Paquetes de Stripe */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pack 10 */}
            <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-4 flex flex-col justify-between hover:border-zinc-800 transition-colors">
              <div>
                <h4 className="text-sm font-bold text-zinc-200">Pack Bronce</h4>
                <p className="text-2xl font-extrabold text-pink-400 mt-1.5">10 <span className="text-xs font-normal text-zinc-400">Tokens</span></p>
                <p className="text-[10px] text-zinc-500 mt-0.5">$0.13 por token</p>
              </div>
              <button
                type="button"
                disabled={buyingPackId !== null || unlimitedTokens}
                onClick={() => handleBuyTokens('pack_10')}
                className="mt-4 w-full rounded-lg bg-zinc-900 hover:bg-zinc-850 py-2 text-xs font-bold text-zinc-300 border border-zinc-800 transition-colors disabled:opacity-50"
              >
                {buyingPackId === 'pack_10' ? 'Cargando...' : 'Comprar por $1.30 USD'}
              </button>
            </div>

            {/* Pack 20 */}
            <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-4 flex flex-col justify-between hover:border-zinc-800 transition-colors">
              <div>
                <h4 className="text-sm font-bold text-zinc-200">Pack Plata</h4>
                <p className="text-2xl font-extrabold text-pink-400 mt-1.5">20 <span className="text-xs font-normal text-zinc-400">Tokens</span></p>
                <p className="text-[10px] text-zinc-500 mt-0.5">$0.10 por token</p>
              </div>
              <button
                type="button"
                disabled={buyingPackId !== null || unlimitedTokens}
                onClick={() => handleBuyTokens('pack_20')}
                className="mt-4 w-full rounded-lg bg-zinc-900 hover:bg-zinc-850 py-2 text-xs font-bold text-zinc-300 border border-zinc-800 transition-colors disabled:opacity-50"
              >
                {buyingPackId === 'pack_20' ? 'Cargando...' : 'Comprar por $2.00 USD'}
              </button>
            </div>

            {/* Pack 60 */}
            <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-4 flex flex-col justify-between relative hover:border-pink-500/30 transition-colors">
              <span className="absolute -top-2.5 right-3 rounded-md bg-pink-500 px-1.5 py-0.5 text-[8px] font-bold text-zinc-50 tracking-wider">MÁS POPULAR</span>
              <div>
                <h4 className="text-sm font-bold text-zinc-200">Pack Oro</h4>
                <p className="text-2xl font-extrabold text-pink-400 mt-1.5">60 <span className="text-xs font-normal text-zinc-400">Tokens</span></p>
                <p className="text-[10px] text-zinc-500 mt-0.5">$0.08 por token</p>
              </div>
              <button
                type="button"
                disabled={buyingPackId !== null || unlimitedTokens}
                onClick={() => handleBuyTokens('pack_60')}
                className="mt-4 w-full rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 py-2 text-xs font-bold text-zinc-50 transition-opacity disabled:opacity-50"
              >
                {buyingPackId === 'pack_60' ? 'Cargando...' : 'Comprar por $4.80 USD'}
              </button>
            </div>

            {/* Pack 150 */}
            <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-4 flex flex-col justify-between hover:border-zinc-800 transition-colors">
              <div>
                <h4 className="text-sm font-bold text-zinc-200">Pack Platino</h4>
                <p className="text-2xl font-extrabold text-pink-400 mt-1.5">150 <span className="text-xs font-normal text-zinc-400">Tokens</span></p>
                <p className="text-[10px] text-zinc-500 mt-0.5">$0.06 por token</p>
              </div>
              <button
                type="button"
                disabled={buyingPackId !== null || unlimitedTokens}
                onClick={() => handleBuyTokens('pack_150')}
                className="mt-4 w-full rounded-lg bg-zinc-900 hover:bg-zinc-850 py-2 text-xs font-bold text-zinc-300 border border-zinc-800 transition-colors disabled:opacity-50"
              >
                {buyingPackId === 'pack_150' ? 'Cargando...' : 'Comprar por $9.00 USD'}
              </button>
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
