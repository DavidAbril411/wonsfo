'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Flame, AlertCircle, CheckCircle2 } from 'lucide-react';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const characterId = searchParams.get('characterId');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('');
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
        const target = characterId ? `/chat-redirect?characterId=${characterId}` : '/';
        router.push(target);
      }
    }
    checkUser();
  }, [router, characterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!email || !password || (isSignUp && (!displayName || !gender))) {
      setErrorMsg('Por favor completa todos los campos.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              gender: gender
            }
          }
        });
        if (error) throw error;
        
        if (data.user && data.session === null) {
          setSuccessMsg('¡Registro exitoso! Te enviamos un código de confirmación. Ingrésalo a continuación para activar tu cuenta.');
          setIsConfirmingOtp(true);
        } else {
          const target = characterId ? `/chat-redirect?characterId=${characterId}` : '/';
          router.push(target);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        const target = characterId ? `/chat-redirect?characterId=${characterId}` : '/';
        router.push(target);
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
      const target = characterId ? `/chat-redirect?characterId=${characterId}` : '/';
      setTimeout(() => {
        router.push(target);
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

        <h2 className="mt-6 text-center text-sm font-semibold tracking-wider text-zinc-450 uppercase">
          {isConfirmingOtp 
            ? 'Confirma tu cuenta de Wonsfo' 
            : isSignUp 
              ? 'Crea una cuenta en Wonsfo' 
              : 'Inicia sesión para continuar'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
        {errorMsg && (
          <div className="mb-6 rounded-xl bg-red-950/20 border border-red-900/50 p-4 text-sm text-red-400 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 rounded-xl bg-emerald-950/20 border border-emerald-900/50 p-4 text-sm text-emerald-400 flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {isConfirmingOtp ? (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label htmlFor="verify-email" className="block text-xs font-bold uppercase tracking-wider text-zinc-450">
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
                  className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-zinc-150 placeholder:text-zinc-550 focus:border-pink-500 focus:outline-none focus:ring-0 text-base transition-colors"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="otp" className="block text-xs font-bold uppercase tracking-wider text-zinc-450">
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
                  className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-center text-2xl tracking-widest font-mono text-zinc-100 placeholder:text-zinc-700 focus:border-pink-500 focus:outline-none focus:ring-0 transition-colors"
                  placeholder="000000"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-3 py-2.5 text-sm font-bold text-zinc-50 shadow-md hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
              >
                {loading ? 'Verificando...' : 'Verificar Código'}
              </button>
            </div>

            <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row text-xs pt-4 border-t border-zinc-900">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="font-bold text-pink-500 hover:text-pink-400 transition-colors disabled:opacity-50"
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
                className="font-semibold text-zinc-400 hover:text-zinc-300 transition-colors"
              >
                Volver a Iniciar Sesión
              </button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignUp && (
                <>
                  <div>
                    <label htmlFor="displayName" className="block text-xs font-bold uppercase tracking-wider text-zinc-450">
                      Nombre Real (como te llamarán los personajes)
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
                      Género (para adaptar pronombres en el chat)
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
                </>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-zinc-450">
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
                    className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-zinc-150 placeholder:text-zinc-550 focus:border-pink-500 focus:outline-none focus:ring-0 text-base transition-colors"
                    placeholder="ejemplo@correo.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-zinc-450">
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
                    className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-3.5 py-2.5 text-zinc-150 placeholder:text-zinc-550 focus:border-pink-500 focus:outline-none focus:ring-0 text-base transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-3 py-2.5 text-sm font-bold text-zinc-50 shadow-md hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
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
                  className="font-bold text-pink-500 hover:text-pink-400 hover:underline transition-colors"
                >
                  {isSignUp ? 'Inicia sesión aquí' : 'Regístrate gratis aquí'}
                </button>
              </p>

              <p className="text-xs text-zinc-550">
                ¿Ya te registraste pero no pudiste verificar?{' '}
                <button
                  onClick={() => {
                    setIsConfirmingOtp(true);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="font-bold text-pink-500 hover:text-pink-400 hover:underline transition-colors"
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-1 items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-50"></div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

