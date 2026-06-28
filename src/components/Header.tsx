'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Flame, User, LogOut, Sparkles, MessageSquarePlus, Coins } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [tokens, setTokens] = useState(0);
  const [unlimitedTokens, setUnlimitedTokens] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener usuario actual
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        // Obtener estado premium y tokens
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium, tokens, unlimited_tokens')
          .eq('id', session.user.id)
          .single();
          
        setIsPremium(!!profile?.is_premium);
        setTokens(profile?.tokens || 0);
        setUnlimitedTokens(!!profile?.unlimited_tokens);
      } else {
        setUser(null);
        setIsPremium(false);
        setTokens(0);
        setUnlimitedTokens(false);
      }
      setLoading(false);
    }
    
    getSession();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Recargar perfil
        supabase
          .from('profiles')
          .select('is_premium, tokens, unlimited_tokens')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setIsPremium(!!data?.is_premium);
            setTokens(data?.tokens || 0);
            setUnlimitedTokens(!!data?.unlimited_tokens);
          });
      } else {
        setUser(null);
        setIsPremium(false);
        setTokens(0);
        setUnlimitedTokens(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (pathname === '/login') return null;

  // Ocultar bottom navigation en login y en páginas de chat activo
  const showMobileNav = user && !pathname.startsWith('/chat/');

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <img 
              src="/logo_symbol.jpg" 
              alt="wonsfo logo" 
              className="h-8 w-8 rounded-lg object-cover border border-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.1)]" 
            />
            <span className="font-sans text-lg font-black tracking-tight text-neon-brand">wonsfo</span>
            <span className="rounded-md bg-pink-950/40 px-1.5 py-0.5 text-[9px] font-semibold text-pink-400 border border-pink-900/40">NSFW</span>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/" 
              className={`text-sm font-medium transition-colors hover:text-zinc-50 ${pathname === '/' ? 'text-zinc-50' : 'text-zinc-400'}`}
            >
              Agentes
            </Link>
            <Link 
              href="/create" 
              className={`text-sm font-medium transition-colors hover:text-zinc-50 flex items-center gap-1.5 ${pathname === '/create' ? 'text-zinc-50' : 'text-zinc-400'}`}
            >
              <MessageSquarePlus className="h-4 w-4" />
              Crear Agente
            </Link>
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            {!loading && user ? (
              <>
                {/* Token Balance Badge */}
                <Link 
                  href="/profile" 
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wider border bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-pink-300 border-pink-500/30 hover:border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.05)] transition-all hover:opacity-90"
                >
                  <Coins className="h-3.5 w-3.5 text-pink-400" />
                  <span>{unlimitedTokens ? 'ILIMITADOS' : `${tokens} TOKENS`}</span>
                </Link>

                {/* Profile Link - Desktop only */}
                <Link 
                  href="/profile" 
                  className={`hidden md:inline-flex rounded-md p-1.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 transition-colors ${pathname === '/profile' ? 'text-zinc-50 bg-zinc-900' : ''}`}
                  title="Mi Perfil"
                >
                  <User className="h-4 w-4" />
                </Link>

                {/* Logout Button */}
                <button 
                  onClick={handleLogout}
                  className="rounded-md p-1.5 text-zinc-400 hover:text-pink-500 hover:bg-zinc-900 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              !loading && (
                <Link 
                  href="/login" 
                  className="rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 px-3.5 py-1.5 text-xs font-bold text-zinc-50 shadow-md hover:opacity-95 transition-all"
                >
                  Iniciar Sesión
                </Link>
              )
            )}
          </div>
        </div>
      </header>

      {/* Bottom Nav Bar for Mobile */}
      {showMobileNav && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-900/80 bg-zinc-950/90 backdrop-blur-md pb-safe shadow-[0_-8px_20px_rgba(236,72,153,0.03)]">
          <div className="flex h-16 items-center justify-around px-4">
            <Link 
              href="/" 
              className={`flex flex-col items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase transition-all duration-200 ${
                pathname === '/' ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.3)]' : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              <Flame className={`h-5 w-5 ${pathname === '/' ? 'text-pink-400' : 'text-zinc-500'}`} />
              <span>Agentes</span>
            </Link>
            <Link 
              href="/create" 
              className={`flex flex-col items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase transition-all duration-200 ${
                pathname === '/create' ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.3)]' : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              <MessageSquarePlus className={`h-5 w-5 ${pathname === '/create' ? 'text-pink-400' : 'text-zinc-500'}`} />
              <span>Crear</span>
            </Link>
            <Link 
              href="/profile" 
              className={`flex flex-col items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase transition-all duration-200 ${
                pathname === '/profile' ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.3)]' : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              <User className={`h-5 w-5 ${pathname === '/profile' ? 'text-pink-400' : 'text-zinc-500'}`} />
              <span>Perfil</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
