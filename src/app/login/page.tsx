'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Flame, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirigir a inicio si ya está autenticado
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      }
    }
    checkUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (!email || !password) {
      setErrorMsg('Por favor completa todos los campos.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        
        // Supabase Auth envía un correo de confirmación de forma predeterminada
        // pero podemos iniciar sesión directamente o indicarle al usuario que revise su bandeja.
        if (data.user && data.session === null) {
          setErrorMsg('¡Registro exitoso! Por favor verifica tu correo electrónico para confirmar tu cuenta (o intenta iniciar sesión si la confirmación de correo está desactivada).');
        } else {
          router.push('/');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        router.push('/');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Ocurrió un error en el proceso de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-zinc-950 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="flex justify-center items-center gap-2">
          <Flame className="h-8 w-8 text-red-500 fill-red-500 animate-pulse" />
          <span className="text-3xl font-extrabold tracking-tight text-zinc-50 font-sans">wonsfo</span>
          <span className="rounded-md bg-red-950/40 px-1.5 py-0.5 text-xs font-semibold text-red-400 border border-red-900/50">NSFW</span>
        </div>
        <h2 className="mt-8 text-center text-xl font-medium tracking-tight text-zinc-400">
          {isSignUp ? 'Crea una cuenta en Wonsfo' : 'Inicia sesión para continuar'}
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {errorMsg && (
          <div className="mb-6 rounded-md bg-red-950/20 border border-red-900/50 p-4 text-sm text-red-400 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
              Correo electrónico
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-0 text-sm transition-colors"
                placeholder="ejemplo@correo.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
              Contraseña
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-0 text-sm transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-950 shadow-xs hover:bg-zinc-200 focus-visible:outline-hidden disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {loading ? 'Procesando...' : isSignUp ? 'Registrarse' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-500">
          {isSignUp ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
            }}
            className="font-medium text-zinc-300 hover:text-zinc-50 hover:underline transition-all"
          >
            {isSignUp ? 'Inicia sesión aquí' : 'Regístrate gratis aquí'}
          </button>
        </p>
      </div>
    </div>
  );
}
