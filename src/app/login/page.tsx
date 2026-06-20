'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Flame, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isConfirmingOtp, setIsConfirmingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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
    setSuccessMsg('');
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
        
        if (data.user && data.session === null) {
          setSuccessMsg('¡Registro exitoso! Te enviamos un código de confirmación. Ingrésalo a continuación para activar tu cuenta.');
          setIsConfirmingOtp(true);
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!email) {
      setErrorMsg('Por favor ingresa tu correo electrónico.');
      setLoading(false);
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      setErrorMsg('Por favor ingresa el código de 6 dígitos.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup'
      });
      if (error) throw error;
      
      setSuccessMsg('¡Cuenta confirmada con éxito! Redirigiendo...');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setErrorMsg(err.message || 'Código inválido o expirado. Por favor verifica e intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!email) {
      setErrorMsg('Por favor ingresa tu correo electrónico para reenviar el código.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      setSuccessMsg('Código de confirmación reenviado con éxito.');
    } catch (err: any) {
      console.error('Resend error:', err);
      setErrorMsg(err.message || 'No se pudo reenviar el código. Intenta de nuevo más tarde.');
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
          {isConfirmingOtp 
            ? 'Confirma tu cuenta de Wonsfo' 
            : isSignUp 
              ? 'Crea una cuenta en Wonsfo' 
              : 'Inicia sesión para continuar'}
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {errorMsg && (
          <div className="mb-6 rounded-md bg-red-950/20 border border-red-900/50 p-4 text-sm text-red-400 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 rounded-md bg-emerald-950/20 border border-emerald-900/50 p-4 text-sm text-emerald-400 flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {isConfirmingOtp ? (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label htmlFor="verify-email" className="block text-sm font-medium text-zinc-300">
                Correo electrónico
              </label>
              <div className="mt-2">
                <input
                  id="verify-email"
                  name="verify-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-0 text-sm transition-colors"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-zinc-300">
                Código de Verificación (6 dígitos)
              </label>
              <div className="mt-2">
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="block w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-center text-xl tracking-widest font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-0 transition-colors"
                  placeholder="000000"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-950 shadow-xs hover:bg-zinc-200 focus-visible:outline-hidden disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                {loading ? 'Verificando...' : 'Verificar Código'}
              </button>
            </div>

            <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row text-sm pt-2 border-t border-zinc-900">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="font-medium text-zinc-400 hover:text-zinc-50 transition-all disabled:opacity-50"
              >
                Reenviar código
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingOtp(false);
                  setSuccessMsg('');
                  setErrorMsg('');
                }}
                className="font-medium text-zinc-400 hover:text-zinc-50 transition-all"
              >
                Volver a Iniciar Sesión
              </button>
            </div>
          </form>
        ) : (
          <>
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

            <div className="mt-8 text-center text-sm text-zinc-500 space-y-4">
              <p>
                {isSignUp ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}{' '}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="font-medium text-zinc-300 hover:text-zinc-50 hover:underline transition-all"
                >
                  {isSignUp ? 'Inicia sesión aquí' : 'Regístrate gratis aquí'}
                </button>
              </p>

              <p>
                ¿Ya te registraste pero no pudiste verificar?{' '}
                <button
                  onClick={() => {
                    setIsConfirmingOtp(true);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="font-medium text-zinc-300 hover:text-zinc-50 hover:underline transition-all"
                >
                  Ingresa tu código de 6 dígitos aquí
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
